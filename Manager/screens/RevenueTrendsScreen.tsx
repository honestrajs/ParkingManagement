import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';

interface RevenueData {
  year: number;
  month: number;
  date: string;
  totalAmount: number;
  cashAmount: number;
  upiAmount: number;
  entryCollections: number;
  exitCollections: number;
  passCollections: number;
  rechargeCollections: number;
}

interface RevenueTrendsScreenProps {
  navigation: any;
  route: any;
}

export default function RevenueTrendsScreen({ navigation, route }: RevenueTrendsScreenProps) {
  const { selectedBikeStand } = route.params;
  const [navigationMode, setNavigationMode] = useState<'years' | 'months' | 'dates' | 'details'>('years');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [months, setMonths] = useState<number[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadMonths(selectedYear);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedYear && selectedMonth) {
      loadDates(selectedYear, selectedMonth);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (selectedDate) {
      loadRevenueDetails();
    }
  }, [selectedDate]);

  const loadYears = async () => {
    try {
      const collectionsRef = ref(db, `${selectedBikeStand.name}/EmployeeCollections`);
      onValue(collectionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setRawData(data); // Store the raw data for calculations
          const yearSet = new Set<number>();
          
          // Iterate through all employees and their dates
          Object.keys(data).forEach(employeeId => {
            const employeeDates = data[employeeId];
            Object.keys(employeeDates).forEach(dateStr => {
              const year = dayjs(dateStr, 'YYYY-MM-DD').year();
              yearSet.add(year);
            });
          });
          
          const yearList = Array.from(yearSet).sort((a, b) => b - a); // Sort descending
          setYears(yearList);
        } else {
          setRawData(null);
          setYears([]);
        }
        setLoading(false);
      });
    } catch (error) {
      console.log('Error loading years:', error);
      setLoading(false);
    }
  };

  const loadMonths = async (year: number) => {
    try {
      const collectionsRef = ref(db, `${selectedBikeStand.name}/EmployeeCollections`);
      onValue(collectionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const monthSet = new Set<number>();
          
          Object.keys(data).forEach(employeeId => {
            const employeeDates = data[employeeId];
            Object.keys(employeeDates).forEach(dateStr => {
              const dateObj = dayjs(dateStr, 'YYYY-MM-DD');
              if (dateObj.year() === year) {
                monthSet.add(dateObj.month() + 1); // dayjs months are 0-indexed
              }
            });
          });
          
          const monthList = Array.from(monthSet).sort((a, b) => a - b); // Sort ascending
          setMonths(monthList);
        } else {
          setMonths([]);
        }
      });
    } catch (error) {
      console.log('Error loading months:', error);
    }
  };

  const loadDates = async (year: number, month: number) => {
    try {
      const collectionsRef = ref(db, `${selectedBikeStand.name}/EmployeeCollections`);
      onValue(collectionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const dateSet = new Set<string>();
          
          Object.keys(data).forEach(employeeId => {
            const employeeDates = data[employeeId];
            Object.keys(employeeDates).forEach(dateStr => {
              const dateObj = dayjs(dateStr, 'YYYY-MM-DD');
              if (dateObj.year() === year && dateObj.month() === month - 1) {
                dateSet.add(dateStr);
              }
            });
          });
          
          const dateList = Array.from(dateSet).sort((a, b) => a.localeCompare(b)); // Sort ascending
          setDates(dateList);
        } else {
          setDates([]);
        }
      });
    } catch (error) {
      console.log('Error loading dates:', error);
    }
  };

  const loadRevenueDetails = async () => {
    try {
      const collectionsRef = ref(db, `${selectedBikeStand.name}/EmployeeCollections`);
      onValue(collectionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data && selectedDate) {
          // Aggregate data from all employees for the selected date
          let aggregatedData: RevenueData = {
            year: dayjs(selectedDate, 'YYYY-MM-DD').year(),
            month: dayjs(selectedDate, 'YYYY-MM-DD').month() + 1,
            date: selectedDate,
            totalAmount: 0,
            cashAmount: 0,
            upiAmount: 0,
            entryCollections: 0,
            exitCollections: 0,
            passCollections: 0,
            rechargeCollections: 0,
          };
          
          Object.keys(data).forEach(employeeId => {
            const employeeDates = data[employeeId];
            if (employeeDates[selectedDate]) {
              const dateData = employeeDates[selectedDate];
              // Sum up all values from all employees for this date
              aggregatedData.totalAmount += dateData.totalAmount || 0;
              aggregatedData.cashAmount += dateData.cashAmount || 0;
              aggregatedData.upiAmount += dateData.upiAmount || 0;
              aggregatedData.entryCollections += dateData.entryCollections || 0;
              aggregatedData.exitCollections += dateData.exitCollections || 0;
              aggregatedData.passCollections += dateData.passCollections || 0;
              aggregatedData.rechargeCollections += dateData.rechargeCollections || 0;
            }
          });
          
          setRevenueData([aggregatedData]);
        } else {
          setRevenueData([]);
        }
      });
    } catch (error) {
      console.log('Error loading revenue details:', error);
    }
  };

  const calculateYearRevenue = (year: number): number => {
    let totalRevenue = 0;
    
    if (rawData) {
      Object.keys(rawData).forEach(employeeId => {
        const employeeDates = rawData[employeeId];
        Object.keys(employeeDates).forEach(dateStr => {
          const dateObj = dayjs(dateStr, 'YYYY-MM-DD');
          if (dateObj.year() === year) {
            const dateData = employeeDates[dateStr];
            if (dateData && dateData.totalAmount) {
              totalRevenue += dateData.totalAmount;
            }
          }
        });
      });
    }
    
    return totalRevenue;
  };

  const calculateMonthRevenue = (year: number, month: number): number => {
    let totalRevenue = 0;
    
    if (rawData) {
      Object.keys(rawData).forEach(employeeId => {
        const employeeDates = rawData[employeeId];
        Object.keys(employeeDates).forEach(dateStr => {
          const dateObj = dayjs(dateStr, 'YYYY-MM-DD');
          if (dateObj.year() === year && dateObj.month() === month - 1) {
            const dateData = employeeDates[dateStr];
            if (dateData && dateData.totalAmount) {
              totalRevenue += dateData.totalAmount;
            }
          }
        });
      });
    }
    
    return totalRevenue;
  };

  const calculateDateRevenue = (date: string): number => {
    let totalRevenue = 0;
    
    if (rawData) {
      Object.keys(rawData).forEach(employeeId => {
        const employeeDates = rawData[employeeId];
        if (employeeDates[date]) {
          const dateData = employeeDates[date];
          if (dateData && dateData.totalAmount) {
            totalRevenue += dateData.totalAmount;
          }
        }
      });
    }
    
    return totalRevenue;
  };

  const renderYearCard = ({ item }: { item: number }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => {
        setSelectedYear(item);
        setNavigationMode('months');
      }}
    >
      <Text style={styles.cardTitle}>{item}</Text>
      <Text style={styles.cardAmount}>₹{calculateYearRevenue(item).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  const renderMonthCard = ({ item }: { item: number }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => {
        setSelectedMonth(item);
        setNavigationMode('dates');
      }}
    >
      <Text style={styles.cardTitle}>{dayjs().month(item - 1).format('MMMM')}</Text>
      <Text style={styles.cardAmount}>₹{calculateMonthRevenue(selectedYear!, item).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  const renderDateCard = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={styles.smallCard}
      onPress={() => {
        setSelectedDate(item);
        setNavigationMode('details');
      }}
    >
      <Text style={styles.smallCardTitle}>{dayjs(item, 'YYYY-MM-DD').format('DD')}</Text>
      <Text style={styles.smallCardAmount}>₹{calculateDateRevenue(item).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  const renderRevenueDetail = ({ item }: { item: RevenueData }) => (
    <View style={styles.detailCard}>
      <Text style={styles.detailDate}>{dayjs(item.date).format('DD MMM, YYYY')}</Text>
      <Text style={styles.detailAmount}>₹{item.totalAmount.toLocaleString()}</Text>
      
      <View style={styles.detailBreakdown}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Cash Amount:</Text>
          <Text style={styles.detailValue}>₹{item.cashAmount.toLocaleString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>UPI Amount:</Text>
          <Text style={styles.detailValue}>₹{item.upiAmount.toLocaleString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Entry Collections:</Text>
          <Text style={styles.detailValue}>{item.entryCollections}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Exit Collections:</Text>
          <Text style={styles.detailValue}>{item.exitCollections}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Pass Collections:</Text>
          <Text style={styles.detailValue}>{item.passCollections}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Recharge Collections:</Text>
          <Text style={styles.detailValue}>{item.rechargeCollections}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading revenue data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Revenue Trends</Text>
        <Text style={styles.subtitle}>{selectedBikeStand.name}</Text>
        
        {/* Breadcrumb Navigation */}
        {navigationMode !== 'years' && (
          <View style={styles.breadcrumbContainer}>
            <TouchableOpacity 
              style={styles.breadcrumbItem}
              onPress={() => {
                setNavigationMode('years');
                setSelectedYear(null);
                setSelectedMonth(null);
                setSelectedDate(null);
              }}
            >
              <Text style={styles.breadcrumbText}>Years</Text>
            </TouchableOpacity>
            
            {selectedYear && (
              <>
                <Text style={styles.breadcrumbSeparator}>›</Text>
                <TouchableOpacity 
                  style={styles.breadcrumbItem}
                  onPress={() => {
                    setNavigationMode('months');
                    setSelectedMonth(null);
                    setSelectedDate(null);
                  }}
                >
                  <Text style={styles.breadcrumbText}>{selectedYear}</Text>
                </TouchableOpacity>
              </>
            )}
            
            {selectedMonth && (
              <>
                <Text style={styles.breadcrumbSeparator}>›</Text>
                <TouchableOpacity 
                  style={styles.breadcrumbItem}
                  onPress={() => {
                    setNavigationMode('dates');
                    setSelectedDate(null);
                  }}
                >
                  <Text style={styles.breadcrumbText}>{dayjs().month(selectedMonth - 1).format('MMMM')}</Text>
                </TouchableOpacity>
              </>
            )}
            
            {selectedDate && (
              <>
                <Text style={styles.breadcrumbSeparator}>›</Text>
                <Text style={styles.breadcrumbText}>{dayjs(selectedDate, 'YYYY-MM-DD').format('DD MMM, YYYY')}</Text>
              </>
            )}
          </View>
        )}
        
        {navigationMode !== 'years' && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (navigationMode === 'details') {
                setNavigationMode('dates');
                setSelectedDate(null);
              } else if (navigationMode === 'dates') {
                setNavigationMode('months');
                setSelectedMonth(null);
              } else if (navigationMode === 'months') {
                setNavigationMode('years');
                setSelectedYear(null);
              }
            }}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>

      {navigationMode === 'years' && (
        <FlatList
          data={years}
          renderItem={renderYearCard}
          keyExtractor={(item) => item.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>No Revenue Data</Text>
              <Text style={styles.emptySubtitle}>No revenue data found for this bike stand.</Text>
            </View>
          }
        />
      )}

      {navigationMode === 'months' && selectedYear && (
        <FlatList
          data={months}
          renderItem={renderMonthCard}
          keyExtractor={(item) => item.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          numColumns={2}
        />
      )}

      {navigationMode === 'dates' && selectedYear && selectedMonth && (
        <FlatList
          data={dates}
          renderItem={renderDateCard}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.dateListContainer}
          showsVerticalScrollIndicator={false}
          numColumns={3}
        />
      )}

      {navigationMode === 'details' && (
        <FlatList
          data={revenueData}
          renderItem={renderRevenueDetail}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>No Revenue Details</Text>
              <Text style={styles.emptySubtitle}>No revenue details found for this date.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  backButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  dateListContainer: {
    padding: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  smallCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
    minWidth: 60,
  },
  smallCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  smallCardAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  breadcrumbItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  breadcrumbText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  breadcrumbSeparator: {
    fontSize: 12,
    color: '#64748b',
    marginHorizontal: 4,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  detailAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 12,
  },
  detailBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 50,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 