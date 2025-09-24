import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { db } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import { useNavigation, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';

interface CollectionEntry {
  id: string;
  date: string;
  totalAmount: number;
  cashAmount: number;
  entryCollections: number;
  exitCollections: number;
  passCollections: number;
  rechargeCollections: number;
  upiAmount?: number;
}

export default function EmployeeRevenueDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { selectedBikeStand, managerId, employee } = route.params as any;
  
  console.log('EmployeeRevenueDetailsScreen - selectedBikeStand:', selectedBikeStand);
  console.log('EmployeeRevenueDetailsScreen - employee:', employee);
  
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDbDate, setSelectedDbDate] = useState<string | null>(null);
  const [years, setYears] = useState<string[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [dates, setDates] = useState<Array<{displayDate: string; dbDate: string}>>([]);
  const [collectionEntries, setCollectionEntries] = useState<CollectionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [handoverStatus, setHandoverStatus] = useState<string | null>(null);
  const [pendingHandovers, setPendingHandovers] = useState<Set<string>>(new Set());
  const [pendingMonths, setPendingMonths] = useState<Set<string>>(new Set());
  const [pendingYears, setPendingYears] = useState<Set<string>>(new Set());

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
    if (selectedDate && selectedDbDate) {
      loadCollectionEntries(selectedDate);
    }
  }, [selectedDate, selectedDbDate]);

  const loadYears = async () => {
    try {
      // Use employee.userId as the primary identifier for database path
      const employeeId = employee.userId || employee.id || employee.employeeId;
      const path = `${selectedBikeStand.name}/EmployeeCollections/${employeeId}`;
      console.log('Loading years from path:', path);
      console.log('Employee ID being used:', employeeId);
      const collectionsRef = ref(db, path);
      
      onValue(collectionsRef, (snapshot) => {
        const data = snapshot.val();
        console.log('Years data received:', data);
        if (data) {
          const yearList = Object.keys(data).map(date => {
            console.log('Processing date:', date);
            const dateObj = dayjs(date, 'YYYY-MM-DD');
            const year = dateObj.format('YYYY');
            console.log('Extracted year:', year);
            return year;
          });
          const uniqueYears = [...new Set(yearList)].sort((a, b) => b.localeCompare(a));
          console.log('Unique years:', uniqueYears);
          setYears(uniqueYears);
          
          // Check handover status for all dates
          checkAllHandoverStatus(data);
        } else {
          console.log('No years data found');
          setYears([]);
        }
        setLoading(false);
      });
    } catch (error) {
      console.log('Error loading years:', error);
      setLoading(false);
    }
  };

  const loadMonths = async (year: string) => {
    try {
      const employeeId = employee.userId || employee.id || employee.employeeId;
      const path = `${selectedBikeStand.name}/EmployeeCollections/${employeeId}`;
      const collectionsRef = ref(db, path);
      
      onValue(collectionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const monthList = Object.keys(data)
            .filter(date => dayjs(date, 'YYYY-MM-DD').format('YYYY') === year)
            .map(date => {
              const dateObj = dayjs(date, 'YYYY-MM-DD');
              return dateObj.format('MMM YYYY');
            });
          const uniqueMonths = [...new Set(monthList)].sort((a, b) => {
            const dateA = dayjs(a, 'MMM YYYY');
            const dateB = dayjs(b, 'MMM YYYY');
            return dateB.diff(dateA);
          });
          setMonths(uniqueMonths);
        } else {
          setMonths([]);
        }
      });
    } catch (error) {
      console.log('Error loading months:', error);
    }
  };

  const loadDates = async (year: string, month: string) => {
    try {
      const employeeId = employee.userId || employee.id || employee.employeeId;
      const path = `${selectedBikeStand.name}/EmployeeCollections/${employeeId}`;
      const collectionsRef = ref(db, path);
      
      onValue(collectionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const monthYear = dayjs(month, 'MMM YYYY');
          const dateList = Object.keys(data)
            .filter(date => {
              const dateObj = dayjs(date, 'YYYY-MM-DD');
              return dateObj.format('YYYY') === year && 
                     dateObj.format('MMM YYYY') === month;
            })
            .map(date => {
              console.log('Processing date from DB:', date);
              const dateObj = dayjs(date, 'YYYY-MM-DD');
              const formattedDate = dateObj.format('DD MMM, YYYY');
              console.log('Formatted date for UI:', formattedDate);
              // Return both the formatted date for display and the original date for database lookup
              return {
                displayDate: formattedDate,
                dbDate: date
              };
            })
            .sort((a, b) => {
              const dateA = dayjs(a.dbDate, 'YYYY-MM-DD');
              const dateB = dayjs(b.dbDate, 'YYYY-MM-DD');
              return dateB.diff(dateA);
            });
          console.log('Final dates list:', dateList);
          setDates(dateList);
        } else {
          console.log('No dates found for month:', month);
          setDates([]);
        }
      });
    } catch (error) {
      console.log('Error loading dates:', error);
    }
  };

    const loadCollectionEntries = async (date: string) => {
    try {
      // Use the stored dbDate directly instead of trying to convert
      const dbDate = selectedDbDate || date;
      console.log('Using dbDate:', dbDate);
      const employeeId = employee.userId || employee.id || employee.employeeId;
      const path = `${selectedBikeStand.name}/EmployeeCollections/${employeeId}/${dbDate}`;
      console.log('Loading collection entries from path:', path);
      const entryRef = ref(db, path);
      
      onValue(entryRef, (snapshot) => {
        const data = snapshot.val();
        console.log('Collection data received:', data);
                 if (data) {
           const entry: CollectionEntry = {
             id: dbDate,
             date: dbDate,
             totalAmount: data.totalAmount || 0,
             cashAmount: data.cashAmount || 0,
             entryCollections: data.entryCollections || 0,
             exitCollections: data.exitCollections || 0,
             passCollections: data.passCollections || 0,
             rechargeCollections: data.rechargeCollections || 0,
             upiAmount: data.upiAmount || 0,
           };
           console.log('Processed entry:', entry);
           setCollectionEntries([entry]);
         } else {
           console.log('No collection data found');
           setCollectionEntries([]);
         }
      });
    } catch (error) {
      console.log('Error loading collection entries:', error);
    }
  };

  const handleYearPress = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth(null);
    setSelectedDate(null);
    setCollectionEntries([]);
  };

  const handleMonthPress = (month: string) => {
    setSelectedMonth(month);
    setSelectedDate(null);
    setCollectionEntries([]);
  };

  const handleDatePress = (displayDate: string, dbDate: string) => {
    setSelectedDate(displayDate);
    setSelectedDbDate(dbDate);
    checkHandoverStatus(dbDate);
  };

  const checkAllHandoverStatus = (data: any) => {
    const pendingDates = new Set<string>();
    const pendingMonthSet = new Set<string>();
    const pendingYearSet = new Set<string>();
    
    Object.keys(data).forEach(date => {
      const dateData = data[date];
      const totalAmount = dateData.totalAmount || 0;
      const lastHandOverAmount = dateData.LastHandOverAmount || 0;
      const handoverDone = dateData.handover === 'done';
      
      // Check if handover is pending
      if (totalAmount > lastHandOverAmount && !handoverDone) {
        pendingDates.add(date);
        
        // Add to pending months and years
        const dateObj = dayjs(date, 'YYYY-MM-DD');
        const monthKey = dateObj.format('MMM YYYY');
        const yearKey = dateObj.format('YYYY');
        
        pendingMonthSet.add(monthKey);
        pendingYearSet.add(yearKey);
      }
    });
    
    setPendingHandovers(pendingDates);
    setPendingMonths(pendingMonthSet);
    setPendingYears(pendingYearSet);
  };

  const checkHandoverStatus = async (dbDate: string) => {
    try {
      const employeeId = employee.userId || employee.id || employee.employeeId;
      const handoverPath = `${selectedBikeStand.name}/EmployeeCollections/${employeeId}/${dbDate}`;
      const handoverRef = ref(db, handoverPath);
      
      onValue(handoverRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.handover === 'done') {
          if (data.handoverDate) {
            // Use the stored handover date if available
            const dateObj = dayjs(data.handoverDate, 'YYYY-MM-DD HH:mm:ss');
            const formattedDate = dateObj.format('DD, MMM YYYY HH:mm');
            const amountText = data.LastHandOverAmount ? ` (₹${data.LastHandOverAmount.toLocaleString()})` : '';
            setHandoverStatus(`Handover done on ${formattedDate}${amountText}`);
          } else {
            // Fallback to collection date if handoverDate is not available
            const dateObj = dayjs(dbDate, 'YYYY-MM-DD');
            const formattedDate = dateObj.format('DD, MMM YYYY');
            setHandoverStatus(`Handover done on ${formattedDate}`);
          }
        } else {
          setHandoverStatus(null);
        }
      });
    } catch (error) {
      console.log('Error checking handover status:', error);
      setHandoverStatus(null);
    }
  };

  const handleCashHandover = () => {
    if (!selectedDbDate) {
      Alert.alert('Error', 'No date selected for handover');
      return;
    }

    Alert.alert(
      'Cash Handover',
      'Are you sure you want to mark this collection as handed over?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            try {
              const employeeId = employee.userId || employee.id || employee.employeeId;
              const handoverPath = `${selectedBikeStand.name}/EmployeeCollections/${employeeId}/${selectedDbDate}`;
              const handoverRef = ref(db, handoverPath);
              
              const currentDateTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
              const lastHandOverAmount = collectionEntries.length > 0 ? collectionEntries[0].totalAmount : 0;
              await update(handoverRef, { 
                handover: 'done',
                handoverDate: currentDateTime,
                LastHandOverAmount: lastHandOverAmount
              });
              
              // Update the handover status immediately using the stored date
              const dateObj = dayjs(currentDateTime, 'YYYY-MM-DD HH:mm:ss');
              const formattedDate = dateObj.format('DD, MMM YYYY HH:mm');
              const amountText = ` (₹${lastHandOverAmount.toLocaleString()})`;
              setHandoverStatus(`Handover done on ${formattedDate}${amountText}`);
              
              Alert.alert('Success', 'Cash handover marked as completed successfully!');
            } catch (error) {
              console.log('Error marking handover:', error);
              Alert.alert('Error', 'Failed to mark handover. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderYearCard = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={[
        styles.card, 
        selectedYear === item && styles.selectedCard,
        pendingYears.has(item) && styles.pendingCard
      ]} 
      onPress={() => handleYearPress(item)}
    >
      <Text style={[styles.cardText, selectedYear === item && styles.selectedCardText]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderMonthCard = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={[
        styles.monthCard, 
        selectedMonth === item && styles.selectedCard,
        pendingMonths.has(item) && styles.pendingCard
      ]} 
      onPress={() => handleMonthPress(item)}
    >
      <Text style={[styles.cardText, selectedMonth === item && styles.selectedCardText]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderDateCard = ({ item }: { item: {displayDate: string; dbDate: string} }) => (
    <TouchableOpacity 
      style={[
        styles.dateCard, 
        selectedDate === item.displayDate && styles.selectedCard,
        pendingHandovers.has(item.dbDate) && styles.pendingCard
      ]} 
      onPress={() => handleDatePress(item.displayDate, item.dbDate)}
    >
      <Text style={[styles.cardText, selectedDate === item.displayDate && styles.selectedCardText]}>
        {item.displayDate}
      </Text>
    </TouchableOpacity>
  );

  const renderCollectionEntry = ({ item }: { item: CollectionEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{dayjs(item.date).format('DD MMM, YYYY')}</Text>
        <Text style={styles.entryAmount}>₹{item.totalAmount.toLocaleString()}</Text>
      </View>
      
      <View style={styles.entryDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Cash Amount:</Text>
          <Text style={styles.detailValue}>₹{item.cashAmount.toLocaleString()}</Text>
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
        {item.upiAmount && item.upiAmount > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>UPI Amount:</Text>
            <Text style={styles.detailValue}>₹{item.upiAmount.toLocaleString()}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{employee.name || `Employee ${employee.id}`}</Text>
        <Text style={styles.subtitle}>{selectedBikeStand.name}</Text>
        
        {(selectedYear || selectedMonth || selectedDate) && (
          <View style={styles.breadcrumbContainer}>
            <TouchableOpacity
              style={styles.breadcrumbItem}
              onPress={() => {
                setSelectedYear(null);
                setSelectedMonth(null);
                setSelectedDate(null);
                setSelectedDbDate(null);
                setCollectionEntries([]);
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
                    setSelectedMonth(null);
                    setSelectedDate(null);
                    setSelectedDbDate(null);
                    setCollectionEntries([]);
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
                    setSelectedDate(null);
                    setSelectedDbDate(null);
                    setCollectionEntries([]);
                  }}
                >
                  <Text style={styles.breadcrumbText}>{selectedMonth}</Text>
                </TouchableOpacity>
              </>
            )}
            
            {selectedDate && (
              <>
                <Text style={styles.breadcrumbSeparator}>›</Text>
                <Text style={styles.breadcrumbText}>{selectedDate}</Text>
              </>
            )}
          </View>
        )}
        
        {(selectedYear || selectedMonth || selectedDate) && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (selectedDate) {
                setSelectedDate(null);
                setSelectedDbDate(null);
                setCollectionEntries([]);
              } else if (selectedMonth) {
                setSelectedMonth(null);
                setSelectedDate(null);
                setSelectedDbDate(null);
                setCollectionEntries([]);
              } else if (selectedYear) {
                setSelectedYear(null);
                setSelectedMonth(null);
                setSelectedDate(null);
                setSelectedDbDate(null);
                setCollectionEntries([]);
              }
            }}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!selectedYear && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Year</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardList}
            >
              {years.map((item) => (
                <View key={item}>
                  {renderYearCard({ item })}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {selectedYear && !selectedMonth && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Month</Text>
            <View style={styles.cardGrid}>
              {months.map((item) => (
                <View key={item}>
                  {renderMonthCard({ item })}
                </View>
              ))}
            </View>
          </View>
        )}

        {selectedYear && selectedMonth && !selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <View style={styles.cardGrid}>
              {dates.map((item) => (
                <View key={item.dbDate}>
                  {renderDateCard({ item })}
                </View>
              ))}
            </View>
          </View>
        )}

        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Collection Report</Text>
            {handoverStatus && (
              <View style={styles.handoverStatusContainer}>
                <Text style={styles.handoverStatusText}>{handoverStatus}</Text>
              </View>
            )}
            <View style={styles.entryList}>
              {collectionEntries.map((item) => (
                <View key={item.id}>
                  {renderCollectionEntry({ item })}
                </View>
              ))}
            </View>
            <View style={styles.handoverContainer}>
              <TouchableOpacity 
                style={[
                  styles.handoverButton,
                  handoverStatus && styles.handoverButtonDisabled
                ]}
                onPress={handoverStatus ? undefined : handleCashHandover}
                disabled={!!handoverStatus}
              >
                <Text style={[
                  styles.handoverButtonText,
                  handoverStatus && styles.handoverButtonTextDisabled
                ]}>
                  {handoverStatus ? 'Handover Completed' : 'Cash Handover'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cardList: {
    paddingHorizontal: 20,
  },
  cardGrid: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginRight: 16,
    marginBottom: 16,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    backgroundColor: '#4CAF50',
  },
  pendingCard: {
    borderBottomWidth: 8,
    borderBottomColor: '#ef4444',
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  selectedCardText: {
    color: '#fff',
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  dateCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 6,
    marginBottom: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  monthCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 6,
    marginBottom: 12,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  entryList: {
    paddingHorizontal: 20,
  },
  entryCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  entryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  entryDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  notesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
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
    color: '#64748b',
    fontWeight: '500',
  },
  breadcrumbSeparator: {
    fontSize: 12,
    color: '#64748b',
    marginHorizontal: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 12,
  },
  handoverButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  handoverButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  handoverContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  handoverStatusContainer: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  handoverStatusText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    textAlign: 'center',
  },
  handoverButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  handoverButtonTextDisabled: {
    color: '#f3f4f6',
  },


}); 