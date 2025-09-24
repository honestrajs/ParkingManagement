import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  RevenueDetails: { type: string; selectedBikeStand?: any };
  RevenueTrends: { selectedBikeStand: any };
  EmployeeList: { selectedBikeStand: any; managerId: string };
  EmployeeRevenueDetails: { selectedBikeStand: any; managerId: string; employee: any };
  Charges: { selectedBikeStand: any };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'RevenueDetails'>;

interface CashEntry {
  id: string;
  bikeStandId: string;
  bikeStandName: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  type: 'daily' | 'monthly_pass' | 'prepaid_pass' | 'handover';
  date: string;
  status: 'pending' | 'completed';
  notes?: string;
}



export default function CashScreen({ route }: any) {
  const navigation = useNavigation<NavigationProp>();
  const { selectedBikeStand, managerId } = route.params;

  console.log('CashScreen - selectedBikeStand:', selectedBikeStand);
  console.log('CashScreen - managerId:', managerId);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [bikeStands, setBikeStands] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [revenueStats, setRevenueStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    thisWeekRevenue: 0,
    thisMonthRevenue: 0,
  });

  useEffect(() => {
    loadCashEntries();
    loadBikeStands();
    loadEmployees();
  }, []);

  useEffect(() => {
    calculateRevenueStats();
  }, [cashEntries]);

  const loadCashEntries = async () => {
    try {
      console.log('Loading cash entries for bike stand:', selectedBikeStand.name);

      // Fetch from the correct path based on database structure
      const cashEntriesPath = `${selectedBikeStand.name}/EmployeeCollections`;
      console.log('Fetching from path:', cashEntriesPath);

      const cashEntriesRef = ref(db, cashEntriesPath);

      onValue(cashEntriesRef, (snapshot) => {
        const data = snapshot.val();
        console.log('Cash entries data received:', data ? Object.keys(data).length : 'null');

        if (data) {
          // Process the employee collections data
          const entries: CashEntry[] = [];

          Object.keys(data).forEach(employeeId => {
            const employeeData = data[employeeId];
            Object.keys(employeeData).forEach(date => {
              const dateData = employeeData[date];
              if (dateData && dateData.totalAmount) {
                entries.push({
                  id: `${employeeId}_${date}`,
                  bikeStandId: selectedBikeStand.id,
                  bikeStandName: selectedBikeStand.name,
                  employeeId: employeeId,
                  employeeName: employeeId, // Using employeeId as name for now
                  amount: dateData.totalAmount || 0,
                  type: 'daily',
                  date: date,
                  status: 'completed',
                  notes: `Daily collection for ${employeeId} on ${date}`
                });
              }
            });
          });

          console.log('Processed cash entries:', entries.length);
          setCashEntries(entries);
        } else {
          console.log('No cash entries found');
          setCashEntries([]);
        }
        setLoading(false);
      }, (error) => {
        console.log('Error loading cash entries:', error);
        Alert.alert('Error', 'Failed to load cash entries');
        setLoading(false);
      });
    } catch (error) {
      console.log('Error setting up cash entries listener:', error);
      Alert.alert('Error', 'Failed to load cash entries');
      setLoading(false);
    }
  };

  const loadBikeStands = async () => {
    try {
      const bikeStandsRef = ref(db, 'BikeStands');
      onValue(bikeStandsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const stands = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));
          setBikeStands(stands);
        }
      });
    } catch (error) {
      console.log('Error loading bike stands:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const employeesRef = ref(db, `${selectedBikeStand.name}/EmployeeCollections`);
      onValue(employeesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const employeeList = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));
          setEmployees(employeeList);
        }
      });
    } catch (error) {
      console.log('Error loading employees:', error);
    }
  };

  const calculateRevenueStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const todayRevenue = cashEntries
      .filter(entry => new Date(entry.date) >= today)
      .reduce((sum, entry) => sum + entry.amount, 0);

    const thisWeekRevenue = cashEntries
      .filter(entry => new Date(entry.date) >= weekAgo)
      .reduce((sum, entry) => sum + entry.amount, 0);

    const thisMonthRevenue = cashEntries
      .filter(entry => new Date(entry.date) >= monthAgo)
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalRevenue = cashEntries.reduce((sum, entry) => sum + entry.amount, 0);

    setRevenueStats({
      totalRevenue,
      todayRevenue,
      thisWeekRevenue,
      thisMonthRevenue,
    });
  };



  const getTotalAmount = (entries: CashEntry[]) => {
    return entries.reduce((total, entry) => total + entry.amount, 0);
  };

  const handleRevenueCardPress = (type: string) => {
    if (type === 'employee') {
      // Navigate to employee list for revenue by employee
      navigation.navigate('EmployeeList', { 
        selectedBikeStand, 
        managerId 
      });
    } else if (type === 'trends') {
      // Navigate to new revenue trends screen
      navigation.navigate('RevenueTrends', { selectedBikeStand });
    }
    else if (type === 'Charges') {
      navigation.navigate('Charges',{selectedBikeStand});
    }
    else {
      // Navigate to detailed revenue view for other types
      navigation.navigate('RevenueDetails', { type, selectedBikeStand });
    }
  };

  const renderRevenueCard = (title: string, amount: number, icon: string, type: string) => (
    <TouchableOpacity style={styles.revenueCard} onPress={() => handleRevenueCardPress(type)}>
      <View style={styles.revenueCardHeader}>
        <Text style={styles.revenueCardIcon}>{icon}</Text>
        <Text style={styles.revenueCardTitle}>{title}</Text>
      </View>
      <View style={styles.revenueCardArrow}>
        <Text style={styles.arrowText}>→</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCashEntry = ({ item }: { item: CashEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.amount}>₹{item.amount}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? '#4CAF50' : '#FF9800' }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.entryType}>{item.type.replace('_', ' ').toUpperCase()}</Text>
      <Text style={styles.employeeName}>{item.employeeName}</Text>
      <Text style={styles.bikeStandName}>{item.bikeStandName}</Text>
      <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
      {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
    </View>
  );

  const totalAmount = getTotalAmount(cashEntries);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading cash entries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cash Management</Text>
      </View>

      <View style={styles.revenueCardsContainer}>
        <Text style={styles.revenueCardsTitle}>Revenue Analytics</Text>
        <View style={styles.revenueCardsVertical}>
          {renderRevenueCard('Daily/Weekly/Monthly Revenue Charts', 0, '📊', 'trends')}
          {renderRevenueCard('Revenue by Employee', 0, '👥', 'employee')}
          {renderRevenueCard('Update monthly pass charges', 0, '', 'Charges')}
        </View>
      </View>



    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },

  listContainer: {
    padding: 16,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  entryType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  bikeStandName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  notes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },

  revenueCardsContainer: {
    padding: 16,
  },
  revenueCardsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  revenueCardsVertical: {
    flexDirection: 'column',
  },
  revenueCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  revenueCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  revenueCardIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  revenueCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  revenueCardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  revenueCardArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  arrowText: {
    fontSize: 16,
    color: '#666',
  },
  totalRevenueContainer: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  totalRevenueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  totalRevenueAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});