import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

interface BikeStand {
  id: string;
  name: string;
  location: string;
  manager: string;
}

interface ListScreenProps {
  navigation: any;
  route: any;
}

export default function ListScreen({ navigation, route }: ListScreenProps) {
  const [bikeStands, setBikeStands] = useState<BikeStand[]>([]);
  const [loading, setLoading] = useState(true);
  const { managerId } = route.params;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const setupListener = async () => {
      try {
        unsubscribe = await loadBikeStands();
      } catch (error) {
        console.log('Error in setupListener:', error);
      }
    };
    
    setupListener();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [managerId]);

  const loadBikeStands = async () => {
    try {
      const bikeStandsRef = ref(db, `BikeStands`);
      
      const unsubscribe = onValue(bikeStandsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const bikeStandKeys = Object.keys(data).filter(key => data[key] === managerId);
          
          console.log('Bike stands for manager', managerId, ':', bikeStandKeys);
          
          const stands = bikeStandKeys.map(key => ({
            id: key,
            name: key,
            location: key.replace('BikeStand', ''),
            manager: data[key]
          }));
          
          setBikeStands(stands);
          
          // If only one bike stand, navigate directly to main screen
          if (stands.length === 1) {
            navigation.replace('Main', { 
              selectedBikeStand: stands[0],
              managerId: managerId 
            });
          }
        }
      }, (error) => {
        console.log('Error loading bike stands:', error);
        Alert.alert('Error', 'Failed to load bike stands');
      });
      
      return unsubscribe;
      
    } catch (error) {
      console.log('Error setting up bike stands listener:', error);
      Alert.alert('Error', 'Failed to set up bike stands listener');
    } finally {
      setLoading(false);
    }
  };

  const handleBikeStandSelect = (bikeStand: BikeStand) => {
    navigation.navigate('Main', { 
      selectedBikeStand: bikeStand,
      managerId: managerId 
    });
  };

  const renderBikeStandCard = ({ item }: { item: BikeStand }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => handleBikeStandSelect(item)}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🏍️</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.standName}>{item.name}</Text>
          <Text style={styles.location}>{item.location}</Text>
        </View>
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading bike stands...</Text>
        </View>
      </View>
    );
  }

  if (bikeStands.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏍️</Text>
          <Text style={styles.emptyTitle}>No Bike Stands Found</Text>
          <Text style={styles.emptySubtitle}>
            You don't have any bike stands assigned to your account.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Bike Stand</Text>
        <Text style={styles.subtitle}>
          Choose a bike stand to manage
        </Text>
      </View>
      <FlatList
        data={bikeStands}
        renderItem={renderBikeStandCard}
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
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  standName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#64748b',
  },
  arrowContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
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