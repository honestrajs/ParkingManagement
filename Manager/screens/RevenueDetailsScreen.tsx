import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';
import { useRoute } from '@react-navigation/native';

interface RevenueData {
  id: string;
  name: string;
  amount: number;
  count: number;
  percentage: number;
}

export default function RevenueDetailsScreen() {
  const route = useRoute();
  const { type, selectedBikeStand } = route.params as { type: string; selectedBikeStand?: any };
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    loadRevenueData();
  }, [type]);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      let data: RevenueData[] = [];

      switch (type) {
        case 'trends':
          data = await loadTrendsData();
          break;
        case 'bikeStand':
          data = await loadBikeStandData();
          break;
        case 'employee':
          data = await loadEmployeeData();
          break;
        case 'paymentType':
          data = await loadPaymentTypeData();
          break;
      }

      const total = data.reduce((sum, item) => sum + item.amount, 0);
      setTotalAmount(total);
      setRevenueData(data);
    } catch (error) {
      console.log('Error loading revenue data:', error);
      Alert.alert('Error', 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const loadTrendsData = async (): Promise<RevenueData[]> => {
    try {
      if (!selectedBikeStand) {
        console.log('No bike stand selected for trends data');
        return [];
      }

      const bikeStandName = selectedBikeStand.name;
      const collectionsRef = ref(db, `${bikeStandName}/EmployeeCollections`);
      const snapshot = await get(collectionsRef);
      const data = snapshot.val();

      if (!data) {
        console.log('No employee collections data found');
        return [];
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      let todayTotal = 0;
      let todayCount = 0;
      let weekTotal = 0;
      let weekCount = 0;
      let monthTotal = 0;
      let monthCount = 0;
      let lastMonthTotal = 0;
      let lastMonthCount = 0;

      // Iterate through all employees
      Object.keys(data).forEach(employeeId => {
        const employeeData = data[employeeId];
        
        // Iterate through all dates for this employee
        Object.keys(employeeData).forEach(dateStr => {
          const dateData = employeeData[dateStr];
          if (dateData && dateData.totalAmount) {
            const entryDate = new Date(dateStr);
            const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());

            // Today
            if (entryDateOnly.getTime() === today.getTime()) {
              todayTotal += dateData.totalAmount || 0;
              todayCount += 1;
            }

            // This Week
            if (entryDateOnly >= weekStart && entryDateOnly <= now) {
              weekTotal += dateData.totalAmount || 0;
              weekCount += 1;
            }

            // This Month
            if (entryDateOnly >= monthStart && entryDateOnly <= now) {
              monthTotal += dateData.totalAmount || 0;
              monthCount += 1;
            }

            // Last Month
            if (entryDateOnly >= lastMonthStart && entryDateOnly < monthStart) {
              lastMonthTotal += dateData.totalAmount || 0;
              lastMonthCount += 1;
            }
          }
        });
      });

      const allTotals = [todayTotal, weekTotal, monthTotal, lastMonthTotal];
      const maxTotal = Math.max(...allTotals);

      return [
        { 
          id: '1', 
          name: 'Today', 
          amount: todayTotal, 
          count: todayCount, 
          percentage: maxTotal > 0 ? Math.round((todayTotal / maxTotal) * 100) : 0 
        },
        { 
          id: '2', 
          name: 'This Week', 
          amount: weekTotal, 
          count: weekCount, 
          percentage: maxTotal > 0 ? Math.round((weekTotal / maxTotal) * 100) : 0 
        },
        { 
          id: '3', 
          name: 'This Month', 
          amount: monthTotal, 
          count: monthCount, 
          percentage: maxTotal > 0 ? Math.round((monthTotal / maxTotal) * 100) : 0 
        },
        { 
          id: '4', 
          name: 'Last Month', 
          amount: lastMonthTotal, 
          count: lastMonthCount, 
          percentage: maxTotal > 0 ? Math.round((lastMonthTotal / maxTotal) * 100) : 0 
        },
      ];
    } catch (error) {
      console.log('Error loading trends data:', error);
      return [];
    }
  };

  const loadBikeStandData = async (): Promise<RevenueData[]> => {
    try {
      if (!selectedBikeStand) {
        console.log('No bike stand selected for bike stand data');
        return [];
      }

      // For now, return the current bike stand data
      // In the future, this could be expanded to show multiple bike stands
      const bikeStandName = selectedBikeStand.name;
      const collectionsRef = ref(db, `${bikeStandName}/EmployeeCollections`);
      const snapshot = await get(collectionsRef);
      const data = snapshot.val();

      if (data) {
        let totalRevenue = 0;
        
        // Calculate total revenue from all employees
        Object.keys(data).forEach(employeeId => {
          const employeeDates = data[employeeId];
          Object.keys(employeeDates).forEach(dateStr => {
            const dateData = employeeDates[dateStr];
            if (dateData && dateData.totalAmount) {
              totalRevenue += dateData.totalAmount;
            }
          });
        });

        return [{
          id: selectedBikeStand.id,
          name: bikeStandName,
          amount: totalRevenue,
          count: Object.keys(data).length, // Number of employees
          percentage: 100, // This is the only bike stand being shown
        }];
      }
      return [];
    } catch (error) {
      console.log('Error loading bike stand data:', error);
      return [];
    }
  };

  const loadEmployeeData = async (): Promise<RevenueData[]> => {
    try {
      if (!selectedBikeStand) {
        console.log('No bike stand selected for employee data');
        return [];
      }

      const bikeStandName = selectedBikeStand.name;
      const snapshot = await get(ref(db, `${bikeStandName}/EmployeeCollections`));
      const data = snapshot.val();
      if (data) {
        const employeeData: RevenueData[] = [];
        
        // Calculate total revenue from all employees
        let totalRevenue = 0;
        const employeeTotals: { [key: string]: number } = {};

        // Iterate through all employees and their dates
        Object.keys(data).forEach(employeeId => {
          const employeeDates = data[employeeId];
          let employeeTotal = 0;
          
          Object.keys(employeeDates).forEach(dateStr => {
            const dateData = employeeDates[dateStr];
            if (dateData && dateData.totalAmount) {
              employeeTotal += dateData.totalAmount;
            }
          });
          
          employeeTotals[employeeId] = employeeTotal;
          totalRevenue += employeeTotal;
        });

        // Create revenue data for each employee
        Object.keys(employeeTotals).forEach(employeeId => {
          const amount = employeeTotals[employeeId];
          const percentage = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
          
          employeeData.push({
            id: employeeId,
            name: `Employee ${employeeId}`,
            amount: amount,
            count: 1, // Each employee counts as 1
            percentage: percentage,
          });
        });

        return employeeData;
      }
      return [];
    } catch (error) {
      console.log('Error loading employee data:', error);
      return [];
    }
  };

  const loadPaymentTypeData = async (): Promise<RevenueData[]> => {
    // Mock data for payment types
    return [
      { id: '1', name: 'Daily Pass', amount: 12000, count: 240, percentage: 40 },
      { id: '2', name: 'Monthly Pass', amount: 18000, count: 90, percentage: 30 },
      { id: '3', name: 'Prepaid Pass', amount: 8000, count: 40, percentage: 15 },
      { id: '4', name: 'Handover', amount: 12000, count: 60, percentage: 15 },
    ];
  };

  const getScreenTitle = () => {
    switch (type) {
      case 'trends':
        return 'Revenue Trends';
      case 'bikeStand':
        return 'Revenue by Bike Stand';
      case 'employee':
        return 'Revenue by Employee';
      case 'paymentType':
        return 'Revenue by Payment Type';
      default:
        return 'Revenue Details';
    }
  };

  const renderRevenueItem = ({ item }: { item: RevenueData }) => (
    <View style={styles.revenueItem}>
      <View style={styles.revenueItemHeader}>
        <Text style={styles.revenueItemName}>{item.name}</Text>
        <Text style={styles.revenueItemAmount}>₹{item.amount.toLocaleString()}</Text>
      </View>
      {type !== 'trends' && (
        <View style={styles.revenueItemDetails}>
          <Text style={styles.revenueItemCount}>{item.count} transactions</Text>
          <Text style={styles.revenueItemPercentage}>{item.percentage}% of total</Text>
        </View>
      )}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${item.percentage}%` }]} />
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
        <Text style={styles.title}>{getScreenTitle()}</Text>
        <Text style={styles.totalAmount}>Total: ₹{totalAmount.toLocaleString()}</Text>
      </View>

      <FlatList
        data={revenueData}
        renderItem={renderRevenueItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
  },
  listContainer: {
    padding: 16,
  },
  revenueItem: {
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
  revenueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  revenueItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  revenueItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  revenueItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  revenueItemCount: {
    fontSize: 14,
    color: '#666',
  },
  revenueItemPercentage: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
}); 