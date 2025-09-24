import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  EmployeeRevenueDetails: { selectedBikeStand: any; managerId: string; employee: any };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'EmployeeRevenueDetails'>;

interface Employee {
  id: string;
  name: string;
  phoneNumber: string;
  userId: string;
  assignedBikeStands: string[];
  status: 'active' | 'inactive';
}

export default function EmployeeListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { selectedBikeStand, managerId } = route.params as any;
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const employeesRef = ref(db, 'Employees');
      onValue(employeesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const employeeList = Object.keys(data)
            .map(key => ({
              id: key,
              ...data[key]
            }))
            .filter(emp => 
              emp.managerId === managerId && 
              emp.assignedBikeStands && 
              emp.assignedBikeStands.includes(selectedBikeStand.name)
            );
          setEmployees(employeeList);
        } else {
          setEmployees([]);
        }
        setLoading(false);
      });
    } catch (error) {
      console.log('Error loading employees:', error);
      setLoading(false);
    }
  };

  const handleEmployeePress = (employee: Employee) => {
    navigation.navigate('EmployeeRevenueDetails', {
      selectedBikeStand,
      managerId,
      employee
    });
  };

  const renderEmployeeCard = ({ item }: { item: Employee }) => (
    <TouchableOpacity 
      style={styles.employeeCard} 
      onPress={() => handleEmployeePress(item)}
    >
      <View style={styles.employeeAvatar}>
        <Text style={styles.employeeInitials}>
          {item.name ? item.name.charAt(0).toUpperCase() : 'E'}
        </Text>
      </View>
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.name || `Employee ${item.id}`}</Text>
        <Text style={styles.employeeId}>ID: {item.userId}</Text>
        <Text style={styles.employeePhone}>{item.phoneNumber}</Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? '#4CAF50' : '#FF9800' }]} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading employees...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Revenue by Employee</Text>
        <Text style={styles.subtitle}>{selectedBikeStand.name}</Text>
      </View>

      {employees.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No employees found</Text>
          <Text style={styles.emptySubtext}>No employees are assigned to this bike stand</Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          renderItem={renderEmployeeCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  employeeCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  employeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  employeeInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  employeePhone: {
    fontSize: 14,
    color: '#666',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
}); 