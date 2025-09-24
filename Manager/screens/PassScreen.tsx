import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, StatusBar } from 'react-native';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import dayjs from 'dayjs';

interface PassEntry {
  id: string;
  cardId?: string;
  customerName?: string;
  holderName?: string;
  phoneNumber?: string;
  bikeNumber?: string;
  passType: 'monthly' | 'prepaid';
  amount?: number;
  startDate?: string;
  validUntil?: string;
  status?: 'active' | 'expired' | 'used';
  createdAt?: string;
}

interface PassScreenProps {
  navigation: any;
  route: any;
}

export default function PassScreen({ navigation, route }: PassScreenProps) {
  const { selectedBikeStand, managerId } = route.params;
  const [monthlyPasses, setMonthlyPasses] = useState<PassEntry[]>([]);
  const [prepaidPasses, setPrepaidPasses] = useState<PassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PassEntry[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedPassType, setSelectedPassType] = useState<'all' | 'monthly' | 'prepaid' | null>(null);

  useEffect(() => {
    loadPasses();
  }, [selectedBikeStand]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      const results = searchPasses(searchQuery);
      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  }, [searchQuery, monthlyPasses, prepaidPasses]);

  const loadPasses = async () => {
    try {
      console.log('Loading passes for bike stand:', selectedBikeStand.name);
      
      const monthlyPassesPath = `${selectedBikeStand.name}/monthlyPass`;
      const prepaidPassesPath = `${selectedBikeStand.name}/prepaidPass`;
      
      console.log('Fetching from paths:', monthlyPassesPath, prepaidPassesPath);
      
      const monthlyPassesRef = ref(db, monthlyPassesPath);
      const prepaidPassesRef = ref(db, prepaidPassesPath);
      
      let monthlyPassesLoaded = false;
      let prepaidPassesLoaded = false;
      
      const checkAndCompleteLoading = () => {
        if (monthlyPassesLoaded && prepaidPassesLoaded) {
          setLoading(false);
        }
      };
      
      // Listen to monthly passes
      const monthlyUnsubscribe = onValue(monthlyPassesRef, (snapshot) => {
        const data = snapshot.val();
        console.log('Monthly passes data:', data ? Object.keys(data).length : 'null');
        
        if (data) {
          const passes = Object.keys(data).map(key => ({
            id: key,
            ...data[key],
            passType: 'monthly' as const,
            createdAt: data[key].createdAt || new Date().toISOString(),
          }));
          console.log('Loaded monthly passes:', passes.length);
          setMonthlyPasses(passes);
        } else {
          console.log('No monthly passes found');
          setMonthlyPasses([]);
        }
        
        monthlyPassesLoaded = true;
        checkAndCompleteLoading();
      }, (error) => {
        console.log('Error loading monthly passes:', error);
        setMonthlyPasses([]);
        monthlyPassesLoaded = true;
        checkAndCompleteLoading();
      });
      
      // Listen to prepaid passes
      const prepaidUnsubscribe = onValue(prepaidPassesRef, (snapshot) => {
        const data = snapshot.val();
        console.log('Prepaid passes data:', data ? Object.keys(data).length : 'null');
        
        if (data) {
          const passes = Object.keys(data).map(key => ({
            id: key,
            ...data[key],
            passType: 'prepaid' as const,
            createdAt: data[key].createdAt || new Date().toISOString(),
          }));
          console.log('Loaded prepaid passes:', passes.length);
          setPrepaidPasses(passes);
        } else {
          console.log('No prepaid passes found');
          setPrepaidPasses([]);
        }
        
        prepaidPassesLoaded = true;
        checkAndCompleteLoading();
      }, (error) => {
        console.log('Error loading prepaid passes:', error);
        setPrepaidPasses([]);
        prepaidPassesLoaded = true;
        checkAndCompleteLoading();
      });
      
      return () => {
        monthlyUnsubscribe();
        prepaidUnsubscribe();
      };
      
    } catch (error) {
      console.log('Error setting up passes listener:', error);
      Alert.alert('Error', 'Failed to set up passes listener');
      setLoading(false);
    }
  };

  const searchPasses = (query: string): PassEntry[] => {
    const allPasses = [...monthlyPasses, ...prepaidPasses];
    const lowerQuery = query.toLowerCase();
    
    return allPasses.filter(pass => 
      (pass.cardId && pass.cardId.toLowerCase().includes(lowerQuery)) ||
      (pass.holderName && pass.holderName.toLowerCase().includes(lowerQuery)) ||
      (pass.phoneNumber && pass.phoneNumber.includes(query))
    );
  };

  const handlePassTypeSelect = (type: 'all' | 'monthly' | 'prepaid') => {
    setSelectedPassType(type);
  };

  const getFilteredPasses = () => {
    if (selectedPassType === 'monthly') {
      return monthlyPasses;
    } else if (selectedPassType === 'prepaid') {
      return prepaidPasses;
    } else {
      return [...monthlyPasses, ...prepaidPasses];
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString || dateTimeString === 'N/A') {
      return 'N/A';
    }
    
    try {
      // Try parsing as ISO string first
      let date = dayjs(dateTimeString);
      if (date.isValid()) {
        return date.format('DD MMM YYYY');
      }
      
      // Try parsing as timestamp
      date = dayjs(parseInt(dateTimeString));
      if (date.isValid()) {
        return date.format('DD MMM YYYY');
      }
      
      // Try parsing as DD/MM/YYYY
      date = dayjs(dateTimeString, 'DD/MM/YYYY');
      if (date.isValid()) {
        return date.format('DD MMM YYYY');
      }
      
      return 'Invalid Date';
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'expired':
        return { backgroundColor: '#fef2f2', color: '#dc2626' };
      case 'used':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#6b7280' };
    }
  };

  const renderPassCard = ({ item }: { item: PassEntry }) => {
    const statusColors = getStatusColor(item.status);
    
    return (
      <View style={styles.passCard}>
        <View style={styles.cardHeader}>
          <View style={styles.passInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {item.holderName ? item.holderName.charAt(0).toUpperCase() : 'P'}
              </Text>
            </View>
            <View style={styles.passDetails}>
              <Text style={styles.passName}>{item.holderName || 'N/A'}</Text>
              <Text style={styles.passId}>#{item.cardId || 'N/A'}</Text>
            </View>
          </View>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: statusColors.backgroundColor }
          ]}>
            <Text style={[styles.statusText, { color: statusColors.color }]}>
              {item.status === 'active' ? '●' : '○'}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🚲 Type</Text>
            <Text style={styles.infoValue}>
              {item.passType === 'monthly' ? 'Monthly Pass' : 'Prepaid Pass'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🏍️ Bike Number</Text>
            <Text style={styles.infoValue}>{item.bikeNumber || 'N/A'}</Text>
          </View>
          {item.passType === 'prepaid' && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>💰 Amount</Text>
              <Text style={styles.infoValue}>₹{item.amount || 0}</Text>
            </View>
          )}
          {item.passType === 'monthly' && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>📅 Valid Period</Text>
              <Text style={styles.infoValue}>
                {formatDateTime(item.startDate || '')} - {formatDateTime(item.validUntil || '')}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📱 Phone</Text>
            <Text style={styles.infoValue}>{item.phoneNumber || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <View style={[styles.actionButton, styles.statusButton]}>
            <Text style={styles.actionButtonIcon}>
              {item.status === 'active' ? '✅' : item.status === 'expired' ? '⏰' : '📋'}
            </Text>
            <Text style={styles.actionButtonText}>
              {(item.status || 'unknown').charAt(0).toUpperCase() + (item.status || 'unknown').slice(1)}
            </Text>
          </View>
          <View style={[styles.actionButton, styles.typeButton]}>
            <Text style={styles.actionButtonIcon}>
              {item.passType === 'monthly' ? '📅' : '💳'}
            </Text>
            <Text style={styles.actionButtonText}>
              {item.passType === 'monthly' ? 'Monthly' : 'Prepaid'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.loadingContent}>
          <Text style={styles.loadingIcon}>🎫</Text>
          <Text style={styles.loadingText}>Loading passes...</Text>
        </View>
      </View>
    );
  }

  const filteredPasses = getFilteredPasses();
  const displayPasses = isSearching ? searchResults : filteredPasses;
  const allPasses = [...monthlyPasses, ...prepaidPasses];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Passes</Text>
            <Text style={styles.headerSubtitle}>
              Manage monthly and prepaid passes
            </Text>
          </View>
        </View>
      </View>



      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by card ID, holder name, or phone..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Cards */}
      <View style={styles.filterCardsContainer}>
        <View style={styles.filterCardWrapper}>
          {(selectedPassType === 'all' || selectedPassType === null) && (
            <Text style={styles.filterCardCount}>{allPasses.length}</Text>
          )}
          <TouchableOpacity 
            style={[
              styles.filterCard, 
              styles.allFilterCard,
              (selectedPassType === 'all' || selectedPassType === null) && styles.filterCardActive
            ]}
            onPress={() => handlePassTypeSelect('all')}
          >
            <View style={styles.filterCardContent}>
              <Text style={[
                styles.filterCardIcon,
                (selectedPassType === 'all' || selectedPassType === null) && styles.filterCardTextActive
              ]}>🎫</Text>
              <Text style={[
                styles.filterCardText,
                (selectedPassType === 'all' || selectedPassType === null) && styles.filterCardTextActive
              ]}>All Passes</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterCardWrapper}>
          {selectedPassType === 'monthly' && (
            <Text style={styles.filterCardCount}>{monthlyPasses.length}</Text>
          )}
          <TouchableOpacity 
            style={[
              styles.filterCard, 
              styles.monthlyFilterCard,
              selectedPassType === 'monthly' && styles.filterCardActive
            ]}
            onPress={() => handlePassTypeSelect('monthly')}
          >
            <View style={styles.filterCardContent}>
              <Text style={[
                styles.filterCardIcon,
                selectedPassType === 'monthly' && styles.filterCardTextActive
              ]}>📅</Text>
              <Text style={[
                styles.filterCardText,
                selectedPassType === 'monthly' && styles.filterCardTextActive
              ]}>Monthly</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterCardWrapper}>
          {selectedPassType === 'prepaid' && (
            <Text style={styles.filterCardCount}>{prepaidPasses.length}</Text>
          )}
          <TouchableOpacity 
            style={[
              styles.filterCard, 
              styles.prepaidFilterCard,
              selectedPassType === 'prepaid' && styles.filterCardActive
            ]}
            onPress={() => handlePassTypeSelect('prepaid')}
          >
            <View style={styles.filterCardContent}>
              <Text style={[
                styles.filterCardIcon,
                selectedPassType === 'prepaid' && styles.filterCardTextActive
              ]}>💳</Text>
              <Text style={[
                styles.filterCardText,
                selectedPassType === 'prepaid' && styles.filterCardTextActive
              ]}>Prepaid</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={displayPasses}
        renderItem={renderPassCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyTitle}>
              {isSearching ? 'No Results Found' : 'No Passes Found'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isSearching 
                ? `No passes found for "${searchQuery}"`
                : 'No passes are available for this bike stand.'
              }
            </Text>
          </View>
        }
      />
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
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
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
    fontSize: 12,
    color: '#64748b',
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
    color: '#64748b',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1e293b',
    paddingVertical: 8,
  },
  clearSearchButton: {
    padding: 8,
    marginLeft: 8,
  },
  clearSearchText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  filterCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 7,
    justifyContent: 'space-between',
  },
  filterCardWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  filterCard: {
    width: '100%',
    height: 46,
    backgroundColor: '#ffffff',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  allFilterCard: {
    borderColor: '#e2e8f0',
  },
  monthlyFilterCard: {
    borderColor: '#dbeafe',
  },
  prepaidFilterCard: {
    borderColor: '#dcfce7',
  },
  filterCardActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.2,
  },
  filterCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCardIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  filterCardCount: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 3,
  },
  filterCardText: {
    fontSize: 7,
    fontWeight: '600',
    color: '#1e293b',
  },
  filterCardTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
  },
  passCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  passInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  passDetails: {
    flex: 1,
  },
  passName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  passId: {
    fontSize: 11,
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
    fontSize: 8,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 10,
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  cardActions: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statusButton: {
    backgroundColor: '#f1f5f9',
  },
  typeButton: {
    backgroundColor: '#e0f2fe',
  },
  actionButtonIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
}); 