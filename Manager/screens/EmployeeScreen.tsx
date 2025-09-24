import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal, ScrollView, StatusBar } from 'react-native';
import { db } from '../firebase';
import { ref, onValue, push, update, remove } from 'firebase/database';

interface Employee {
  id: string;
  name: string;
  phoneNumber: string;
  userId: string;
  password: string;
  assignedBikeStands: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  managerId: string;
}

interface BikeStand {
  id: string;
  name: string;
  location: string;
}

interface EmployeeScreenProps {
  navigation: any;
  route: any;
}

export default function EmployeeScreen({ navigation, route }: EmployeeScreenProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bikeStands, setBikeStands] = useState<BikeStand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    userId: '',
    password: '',
    assignedBikeStands: [] as string[],
  });
  const [showPassword, setShowPassword] = useState(false);
  const { selectedBikeStand, managerId } = route.params || {};

  useEffect(() => {
    if (managerId) {
      loadBikeStands();
      loadEmployees();
    }
  }, [managerId]);

  const loadBikeStands = async () => {
    try {
      const bikeStandsRef = ref(db, 'BikeStands');
      const unsubscribe = onValue(bikeStandsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const bikeStandKeys = Object.keys(data).filter(key => data[key] === managerId);
          const stands = bikeStandKeys.map(key => ({
            id: key,
            name: key,
            location: key.replace('BikeStand', ''),
          }));
          setBikeStands(stands);
        } else {
          setBikeStands([]);
        }
      });
      return unsubscribe;
    } catch (error) {
      console.log('Error loading bike stands:', error);
      Alert.alert('Error', 'Failed to load bike stands');
    }
  };

  const loadEmployees = async () => {
    try {
      const employeesRef = ref(db, 'Employees');
      const unsubscribe = onValue(employeesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const allEmployees = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));
          const filteredEmployees = allEmployees.filter(employee => employee.managerId === managerId);
          setEmployees(filteredEmployees);
        } else {
          setEmployees([]);
        }
        setLoading(false);
      });
      return unsubscribe;
    } catch (error) {
      console.log('Error loading employees:', error);
      Alert.alert('Error', 'Failed to load employees');
      setLoading(false);
    }
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      phoneNumber: '',
      userId: '',
      password: '',
      assignedBikeStands: [],
    });
    setShowPassword(false);
    setModalVisible(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      phoneNumber: employee.phoneNumber,
      userId: employee.userId,
      password: employee.password,
      assignedBikeStands: employee.assignedBikeStands || [],
    });
    setShowPassword(false);
    setModalVisible(true);
  };

  const handleSaveEmployee = async () => {
    if (!formData.name.trim() || !formData.phoneNumber.trim() || !formData.userId.trim() || !formData.password.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (formData.assignedBikeStands.length === 0) {
      Alert.alert('Error', 'Please select at least one bike stand');
      return;
    }

    if (!managerId) {
      Alert.alert('Error', 'Manager ID not found. Please try logging in again.');
      return;
    }

    try {
      const employeeData = {
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        userId: formData.userId.trim(),
        password: formData.password.trim(),
        assignedBikeStands: formData.assignedBikeStands,
        status: 'active',
        createdAt: new Date().toISOString(),
        managerId: managerId,
      };

      if (editingEmployee) {
        await update(ref(db, `Employees/${editingEmployee.id}`), employeeData);
        Alert.alert('Success', 'Employee updated successfully');
      } else {
        await push(ref(db, 'Employees'), employeeData);
        Alert.alert('Success', 'Employee added successfully');
      }

      setModalVisible(false);
    } catch (error) {
      console.log('Error saving employee:', error);
      Alert.alert('Error', 'Failed to save employee');
    }
  };

  const handleDeleteEmployee = (employee: Employee) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employee.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove(ref(db, `Employees/${employee.id}`));
              Alert.alert('Success', 'Employee deleted successfully');
            } catch (error) {
              console.log('Error deleting employee:', error);
              Alert.alert('Error', 'Failed to delete employee');
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async (employee: Employee) => {
    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'inactive' ? 'deactivate' : 'activate';
    
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Employee`,
      `Are you sure you want to ${action} ${employee.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: async () => {
            try {
              await update(ref(db, `Employees/${employee.id}`), { status: newStatus });
              Alert.alert('Success', `Employee ${action}d successfully`);
            } catch (error) {
              console.log('Error updating employee status:', error);
              Alert.alert('Error', `Failed to ${action} employee`);
            }
          },
        },
      ]
    );
  };

  const toggleBikeStandSelection = (bikeStandId: string) => {
    const isSelected = formData.assignedBikeStands.includes(bikeStandId);
    if (isSelected) {
      setFormData({
        ...formData,
        assignedBikeStands: formData.assignedBikeStands.filter(id => id !== bikeStandId)
      });
    } else {
      setFormData({
        ...formData,
        assignedBikeStands: [...formData.assignedBikeStands, bikeStandId]
      });
    }
  };

  const renderEmployeeCard = ({ item }: { item: Employee }) => (
    <View style={styles.employeeCard}>
      <View style={styles.cardHeader}>
        <View style={styles.employeeInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.employeeDetails}>
            <Text style={styles.employeeName}>{item.name}</Text>
            <Text style={styles.employeeId}>@{item.userId}</Text>
          </View>
        </View>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: item.status === 'active' ? '#10b981' : '#f59e0b' }
        ]}>
          <Text style={styles.statusText}>
            {item.status === 'active' ? '●' : '○'}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📱 Phone</Text>
          <Text style={styles.infoValue}>{item.phoneNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>🏍️ Bike Stands</Text>
          <Text style={styles.infoValue}>
            {item.assignedBikeStands?.length || 0} assigned
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditEmployee(item)}
        >
          <Text style={styles.actionButtonIcon}>✏️</Text>
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.toggleButton]}
          onPress={() => handleToggleStatus(item)}
        >
          <Text style={styles.actionButtonIcon}>
            {item.status === 'active' ? '⏸️' : '▶️'}
          </Text>
          <Text style={styles.actionButtonText}>
            {item.status === 'active' ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteEmployee(item)}
        >
          <Text style={styles.actionButtonIcon}>🗑️</Text>
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.loadingContent}>
          <Text style={styles.loadingIcon}>👥</Text>
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Team Members</Text>
            <Text style={styles.headerSubtitle}>
              Manage your bike stand employees
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddEmployee}>
            <Text style={styles.addButtonIcon}>+</Text>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{employees.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {employees.filter(e => e.status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {employees.filter(e => e.status === 'inactive').length}
          </Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>
      
      {/* Employee List */}
      <FlatList
        data={employees}
        renderItem={renderEmployeeCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Team Members</Text>
            <Text style={styles.emptySubtitle}>
              Add your first employee to start managing bike stands together.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddEmployee}>
              <Text style={styles.emptyButtonText}>Add First Employee</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter employee's full name"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  value={formData.phoneNumber}
                  onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>User ID *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter unique user ID"
                  value={formData.userId}
                  onChangeText={(text) => setFormData({ ...formData, userId: text })}
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter password"
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.eyeButtonText}>
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assign Bike Stands *</Text>
                <Text style={styles.inputSubtext}>
                  Select the bike stands this employee will manage
                </Text>
                <View style={styles.bikeStandsContainer}>
                  {bikeStands.map((bikeStand) => {
                    const isSelected = formData.assignedBikeStands.includes(bikeStand.id);
                    return (
                      <TouchableOpacity
                        key={bikeStand.id}
                        style={[
                          styles.bikeStandItem,
                          isSelected && styles.bikeStandItemSelected
                        ]}
                        onPress={() => toggleBikeStandSelection(bikeStand.id)}
                      >
                        <Text style={[
                          styles.bikeStandText,
                          isSelected && styles.bikeStandTextSelected
                        ]}>
                          {bikeStand.name}
                        </Text>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveEmployee}
              >
                <Text style={styles.saveButtonText}>
                  {editingEmployee ? 'Update' : 'Add Employee'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  addButton: {
    backgroundColor: '#0ea5e9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonIcon: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0ea5e9',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  employeeId: {
    fontSize: 10,
    color: '#64748b',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 6,
    color: '#fff',
  },
  cardContent: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 10,
    color: '#1e293b',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  toggleButton: {
    backgroundColor: '#f59e0b',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 20,
    maxHeight: '90%',
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 24,
    maxHeight: 400,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  inputSubtext: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 11,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 11,
    backgroundColor: '#fff',
  },
  eyeButton: {
    padding: 16,
    marginLeft: 8,
  },
  eyeButtonText: {
    fontSize: 14,
  },
  bikeStandsContainer: {
    gap: 8,
    marginBottom: 20,
  },
  bikeStandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  bikeStandItemSelected: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  bikeStandText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  bikeStandTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  saveButton: {
    backgroundColor: '#0ea5e9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 11,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
  },
}); 