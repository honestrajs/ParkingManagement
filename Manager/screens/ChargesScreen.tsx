import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { ref, set, get } from 'firebase/database';
import { db } from '../firebase';
import { useNavigation, useRoute } from '@react-navigation/native';

interface Charges {
  mpass: number;
  normal_cycle: number;
  railway_bike: number;
  railway_cycle: number;
}

const ChargesScreen = () => {
  const [charges, setCharges] = useState<Charges>({
    mpass: 0,
    normal_cycle: 0,
    railway_bike: 0,
    railway_cycle: 0
  });
  const [loading, setLoading] = useState(true);
  const route = useRoute();
  const { selectedBikeStand } = route.params as any;
  const navigation = useNavigation();

  useEffect(() => {
    loadCharges();
  }, []);

  const loadCharges = async () => {
    try {
      const path = ref(db, `${selectedBikeStand.name}/CashMgmt`);
      const snapshot = await get(path);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setCharges({
          mpass: data.mpass || 0,
          normal_cycle: data.normal_cycle || 0,
          railway_bike: data.railway_bike || 0,
          railway_cycle: data.railway_cycle || 0
        });
      }
    } catch (error) {
      console.error('Error loading charges:', error);
      Alert.alert('Error', 'Failed to load current charges.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (type: keyof Charges, value: string) => {
    const trimmed = value.trim();
    const numValue = Number(trimmed);

    if (trimmed === '' || isNaN(numValue) || numValue < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid amount greater than or equal to 0.');
      return;
    }

    try {
      const path = ref(db, `${selectedBikeStand.name}/CashMgmt/${type}`);
      await set(path, numValue);
      
      // Update local state
      setCharges(prev => ({ ...prev, [type]: numValue }));
      
      Alert.alert('Success', `${type.replace(/([A-Z])/g, ' $1').trim()} updated successfully!`);
    } catch (error) {
      console.error('Error updating charge:', error);
      Alert.alert('Error', 'Failed to update charge.');
    }
  };

  const ChargeInput = ({ 
    type, 
    label, 
    value, 
    onChangeText, 
    onUpdate 
  }: { 
    type: keyof Charges; 
    label: string; 
    value: string; 
    onChangeText: (text: string) => void; 
    onUpdate: () => void; 
  }) => (
    <View style={styles.chargeCard}>
      <Text style={styles.chargeLabel}>{label}</Text>
      <Text style={styles.currentValue}>Current: ₹{charges[type]}</Text>
      <TextInput
        placeholder={`Enter ${label.toLowerCase()} amount`}
        keyboardType="numeric"
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
      />
      <TouchableOpacity
        onPress={onUpdate}
        style={styles.updateButton}
        activeOpacity={0.85}
      >
        <Text style={styles.updateButtonText}>Update {label}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading charges...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Update Charges</Text>
        <Text style={styles.subtitle}>Bike Stand: {selectedBikeStand.name}</Text>

        <ChargeInput
          type="mpass"
          label="Monthly Pass"
          value={charges.mpass.toString()}
          onChangeText={(text) => setCharges(prev => ({ ...prev, mpass: Number(text) || 0 }))}
          onUpdate={() => handleUpdate('mpass', charges.mpass.toString())}
        />

        <ChargeInput
          type="normal_cycle"
          label="Cycle Pass"
          value={charges.normal_cycle.toString()}
          onChangeText={(text) => setCharges(prev => ({ ...prev, normal_cycle: Number(text) || 0 }))}
          onUpdate={() => handleUpdate('normal_cycle', charges.normal_cycle.toString())}
        />

        <ChargeInput
          type="railway_bike"
          label="Railway Bike"
          value={charges.railway_bike.toString()}
          onChangeText={(text) => setCharges(prev => ({ ...prev, railway_bike: Number(text) || 0 }))}
          onUpdate={() => handleUpdate('railway_bike', charges.railway_bike.toString())}
        />

        <ChargeInput
          type="railway_cycle"
          label="Railway Cycle"
          value={charges.railway_cycle.toString()}
          onChangeText={(text) => setCharges(prev => ({ ...prev, railway_cycle: Number(text) || 0 }))}
          onUpdate={() => handleUpdate('railway_cycle', charges.railway_cycle.toString())}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  scrollContainer: { 
    padding: 24, 
    paddingBottom: 40 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#0f172a', 
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: { 
    fontSize: 16, 
    color: '#64748b', 
    marginBottom: 32,
    textAlign: 'center'
  },
  loadingText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 100
  },
  chargeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  chargeLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8
  },
  currentValue: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    fontWeight: '600'
  },
  input: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    fontSize: 16,
    borderColor: '#cbd5e1',
    borderWidth: 1,
    marginBottom: 16,
    color: '#0f172a'
  },
  updateButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white'
  }
});

export default ChargesScreen;