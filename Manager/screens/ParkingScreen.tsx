import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, Image, Dimensions, ScrollView, TextInput } from 'react-native';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import DateTimePicker from 'react-native-ui-datepicker';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface BikeEntry {
  id: string;
  bikeNumber: string;
  time: string;
  exitTime?: string;
  status: 'Parked' | 'Exited';
  token?: string;
  exitAmount?: number;
  duration?: number;
  imageUrl?: string;
  createdAt?: number;
  uploadedAt?: string;
  type?: 'bike' | 'cycle'; // To distinguish between bike and cycle entries
}

interface ParkingScreenProps {
  navigation: any;
  route: any;
}

export default function ParkingScreen({ navigation, route }: ParkingScreenProps) {
  const [bikeEntries, setBikeEntries] = useState<BikeEntry[]>([]);
  const [cycleEntries, setCycleEntries] = useState<BikeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<BikeEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [navigationMode, setNavigationMode] = useState<'years' | 'months' | 'dates' | 'entries'>('entries');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [filteredEntries, setFilteredEntries] = useState<BikeEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<BikeEntry[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<'bike' | 'cycle' | 'all' | null>('all');
  const { selectedBikeStand, managerId } = route.params;
  
        console.log('ParkingScreen - selectedBikeStand:', selectedBikeStand);
      console.log('ParkingScreen - managerId:', managerId);
      console.log('ParkingScreen - selectedBikeStand.name:', selectedBikeStand.name);
      console.log('ParkingScreen - selectedBikeStand.id:', selectedBikeStand.id);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const setupListener = async () => {
      try {
        unsubscribe = await loadBikeEntries();
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
  }, [selectedBikeStand]);

  useEffect(() => {
    if (navigationMode === 'entries' && selectedDate) {
      const pool = selectedVehicleType === 'bike'
        ? bikeEntries
        : selectedVehicleType === 'cycle'
          ? cycleEntries
          : [...bikeEntries, ...cycleEntries];
      setFilteredEntries(filterEntriesByDate(pool, selectedDate));
    }
  }, [selectedDate, bikeEntries, cycleEntries, navigationMode, selectedVehicleType]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      const results = searchEntries([], searchQuery); // Pass empty array since searchEntries now uses all entries
      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  }, [searchQuery, bikeEntries, cycleEntries]);

  const formatDateTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const calculateDuration = (entryTime: string, exitTime?: string) => {
    const entry = new Date(entryTime);
    const exit = exitTime ? new Date(exitTime) : new Date();
    const diffMs = exit.getTime() - entry.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  const getAvailableYears = (entries: BikeEntry[]): number[] => {
    const years = new Set<number>();
    entries.forEach(entry => {
      const year = dayjs(entry.time).year();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending
  };

  const getAvailableMonths = (entries: BikeEntry[], year: number): number[] => {
    const months = new Set<number>();
    entries.forEach(entry => {
      const entryDate = dayjs(entry.time);
      if (entryDate.year() === year) {
        months.add(entryDate.month() + 1); // dayjs months are 0-indexed
      }
    });
    return Array.from(months).sort((a, b) => a - b); // Sort ascending
  };

  const getAvailableDates = (entries: BikeEntry[], year: number, month: number): number[] => {
    const dates = new Set<number>();
    entries.forEach(entry => {
      const entryDate = dayjs(entry.time);
      if (entryDate.year() === year && entryDate.month() === month - 1) {
        dates.add(entryDate.date());
      }
    });
    return Array.from(dates).sort((a, b) => a - b); // Sort ascending
  };

  const filterEntriesByDate = (entries: BikeEntry[], date: Dayjs): BikeEntry[] => {
    return entries.filter(entry => {
      const entryDate = dayjs(entry.time);
      return entryDate.isSame(date, 'day');
    });
  };

  const searchEntries = (entries: BikeEntry[], query: string): BikeEntry[] => {
    if (!query.trim()) {
      return [];
    }
    
    const searchTerm = query.toLowerCase().trim();
    // Search in all entries (bike + cycle)
    const allEntries = [...bikeEntries, ...cycleEntries];
    return allEntries.filter(entry => {
      const bikeNumber = entry.bikeNumber?.toLowerCase() || '';
      const cardId = entry.id?.toLowerCase() || '';
      const token = entry.token?.toLowerCase() || '';
      return bikeNumber.includes(searchTerm) || cardId.includes(searchTerm) || token.includes(searchTerm);
    });
  };

  const loadBikeEntries = async () => {
    try {
      console.log('Loading entries for bike stand:', selectedBikeStand.id);
      
      // New flat structure: {cardID: entry}
      const bikeEntriesPath = `${selectedBikeStand.id}/BikeEntries`;
      console.log('Fetching from path:', bikeEntriesPath);
      
      const entriesRef = ref(db, bikeEntriesPath);
      
      let localBikeEntries: BikeEntry[] = [];
      let localCycleEntries: BikeEntry[] = [];

      const unsubscribe = onValue(entriesRef, (snapshot) => {
        const data = snapshot.val();
        localBikeEntries = [];
        localCycleEntries = [];
        if (data) {
          Object.keys(data).forEach((cardId) => {
            const node = data[cardId];
            const vehicleType = (node.vehicleType || '').toLowerCase();
            const entry: BikeEntry = {
              id: cardId,
              token: cardId,
              bikeNumber: node.bikeNumber,
              time: node.time || node.entryTime,
              exitTime: node.exitTime,
              status: node.status || (node.exitTime ? 'Exited' : 'Parked'),
              exitAmount: node.exitAmount,
              duration: node.duration || calculateDuration(node.entryTime || node.time, node.exitTime),
              imageUrl: node.imageUrl,
              createdAt: node.createdAt,
              uploadedAt: node.uploadedAt,
              type: vehicleType === 'cycle' ? 'cycle' : 'bike',
            };
            if (entry.type === 'bike') {
              localBikeEntries.push(entry);
            } else {
              localCycleEntries.push(entry);
            }
          });
        }

        // Set both arrays separately
        setBikeEntries(localBikeEntries);
        setCycleEntries(localCycleEntries);

        // Determine what to show based on selectedVehicleType
        const allEntries = [...localBikeEntries, ...localCycleEntries];
        if (selectedVehicleType) {
          const entriesToShow = selectedVehicleType === 'bike' ? localBikeEntries : selectedVehicleType === 'cycle' ? localCycleEntries : allEntries;
          setFilteredEntries(entriesToShow);
        } else {
          setFilteredEntries(allEntries);
        }

        setLoading(false);
      }, (error) => {
        console.log('Error loading entries:', error);
        setBikeEntries([]);
        setCycleEntries([]);
        setFilteredEntries([]);
        setLoading(false);
      });

      // Return unsubscribe
      return () => unsubscribe();
      
    } catch (error) {
      console.log('Error setting up entries listener:', error);
      Alert.alert('Error', 'Failed to set up entries listener');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = (entry: BikeEntry) => {
    setSelectedEntry(entry);
    setModalVisible(true);
  };

  const handleVehicleTypeSelect = (type: 'bike' | 'cycle' | 'all') => {
    setSelectedVehicleType(type);
    
    let entriesToShow: BikeEntry[] = [];
    if (type === 'bike') {
      entriesToShow = bikeEntries;
    } else if (type === 'cycle') {
      entriesToShow = cycleEntries;
    } else {
      // 'all' - show combined entries
      entriesToShow = [...bikeEntries, ...cycleEntries];
    }
    
    // Filter by selected date if we're in entries mode
    if (selectedDate) {
      setFilteredEntries(filterEntriesByDate(entriesToShow, selectedDate));
    } else {
      setFilteredEntries(entriesToShow);
    }
  };

  const renderBikeEntryCard = ({ item }: { item: BikeEntry }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => handleCardPress(item)}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.tokenContainer}>
            <Text style={styles.tokenLabel}>Token</Text>
            <Text style={styles.tokenValue}>{item.token ? item.token.split('/').pop() : ''}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'Parked' ? '#dcfce7' : '#fef3c7' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.status === 'Parked' ? '#166534' : '#92400e' }
            ]}>
              {item.status === 'Parked' ? 'Parked' : 'Exited'}
            </Text>
          </View>
        </View>
     
        <View style={styles.cardFooter}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Entry Time</Text>
            <Text style={styles.timeValue}>{formatDateTime(item.time)}</Text>
          </View>
          {item.exitTime && (
            <View style={styles.timeContainer}>
              <Text style={styles.timeLabel}>Exit Time</Text>
              <Text style={styles.timeValue}>{formatDateTime(item.exitTime)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading bike entries...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parking</Text>
        <Text style={styles.bikeStandInfo}>Bike Stand: {selectedBikeStand.id}</Text>
        {/* New Card for Old Entries */}
        <View style={styles.topCardsContainer}>
          <TouchableOpacity
            style={[styles.topCard, styles.oldTopCard]}
            onPress={() => navigation.navigate('OldEntries', { selectedBikeStand })}
          >
            <View style={styles.topCardAccentOld} />
            <View style={styles.topCardRow}>
              <Text style={styles.topCardIcon}>📁</Text>
              <Text style={styles.topCardTitle}>Old Entries</Text>
              <Text style={styles.topCardChevron}>›</Text>
            </View>
            <Text style={styles.topCardSubtitle}>Browse archives</Text>
          </TouchableOpacity>
        </View>
        
        {(selectedYear || selectedMonth || selectedDate) && (
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
                  <Text style={styles.breadcrumbText}>
                    {dayjs().month(selectedMonth - 1).format('MMMM')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            
            {selectedDate && (
              <>
                <Text style={styles.breadcrumbSeparator}>›</Text>
                <View style={styles.breadcrumbItem}>
                  <Text style={styles.breadcrumbText}>
                    {selectedDate.format('DD MMM, YYYY')}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}
      </View>
      {navigationMode === 'years' && (
        <>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by bike number or token..."
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

          {isSearching ? (
            <FlatList
              data={searchResults}
              renderItem={renderBikeEntryCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyTitle}>No Results Found</Text>
                  <Text style={styles.emptySubtitle}>
                    No entries found for "{searchQuery}"
                  </Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={getAvailableYears([...bikeEntries, ...cycleEntries])}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.yearCard}
                  onPress={() => {
                    setSelectedYear(item);
                    setNavigationMode('months');
                  }}
                >
                  <Text style={styles.yearText}>{item}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.toString()}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>📅</Text>
                  <Text style={styles.emptyTitle}>No Data Available</Text>
                  <Text style={styles.emptySubtitle}>No entries found.</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {navigationMode === 'months' && selectedYear && (
        <FlatList
          data={getAvailableMonths([...bikeEntries, ...cycleEntries], selectedYear)}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.monthCard}
              onPress={() => {
                setSelectedMonth(item);
                setNavigationMode('dates');
              }}
            >
              <Text style={styles.monthText}>
                {dayjs().month(item - 1).format('MMMM')}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          numColumns={2}
        />
      )}

      {navigationMode === 'dates' && selectedYear && selectedMonth && (
        <FlatList
          data={getAvailableDates([...bikeEntries, ...cycleEntries], selectedYear, selectedMonth)}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.dateCard}
              onPress={() => {
                setSelectedDate(dayjs().year(selectedYear).month(selectedMonth - 1).date(item));
                setNavigationMode('entries');
              }}
            >
              <Text style={styles.dateText}>{item}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          numColumns={2}
        />
      )}

      {navigationMode === 'entries' && (
        <>
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by bike number or token..."
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

          {/* Vehicle Type Filter Cards */}
          <View style={styles.filterCardsContainer}>
            <TouchableOpacity 
              style={[
                styles.filterCard, 
                styles.allFilterCard,
                (selectedVehicleType === 'all' || selectedVehicleType === null) && styles.filterCardActive
              ]}
              onPress={() => handleVehicleTypeSelect('all')}
            >
              
              <Text style={styles.filterCardText}>All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterCard, 
                styles.bikeFilterCard,
                selectedVehicleType === 'bike' && styles.filterCardActive
              ]}
              onPress={() => handleVehicleTypeSelect('bike')}
            >
              <Text style={styles.filterCardIcon}>🏍️</Text>
              <Text style={styles.filterCardText}>Bikes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterCard, 
                styles.cycleFilterCard,
                selectedVehicleType === 'cycle' && styles.filterCardActive
              ]}
              onPress={() => handleVehicleTypeSelect('cycle')}
            >
              <Text style={styles.filterCardIcon}>🚲</Text>
              <Text style={styles.filterCardText}>Cycles</Text>
            </TouchableOpacity>
          </View>

          {isSearching ? (
            <FlatList
              data={searchResults}
              renderItem={renderBikeEntryCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyTitle}>No Results Found</Text>
                  <Text style={styles.emptySubtitle}>
                    No entries found for "{searchQuery}"
                  </Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={filteredEntries}
              renderItem={renderBikeEntryCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🏍️</Text>
                  <Text style={styles.emptyTitle}>No {selectedVehicleType || 'Bike'} Entries</Text>
                  <Text style={styles.emptySubtitle}>
                    No {selectedVehicleType || 'bike'} entries found for {selectedDate?.format('DD MMM, YYYY')}.
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}



      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bike Details</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedEntry && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.bikeImageContainer}>
                  {selectedEntry.imageUrl ? (
                    <Image 
                      source={{ uri: selectedEntry.imageUrl }} 
                      style={styles.bikeImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.bikeImagePlaceholder}>
                      <Text style={styles.bikeImageText}>🏍️</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Token</Text>
                  <Text style={styles.detailValue}>{selectedEntry.token}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bike Number</Text>
                  <Text style={styles.detailValue}>{selectedEntry.bikeNumber}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Entry Time</Text>
                  <Text style={styles.detailValue}>{formatDateTime(selectedEntry.time)}</Text>
                </View>
                
                {selectedEntry.exitTime && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Exit Time</Text>
                    <Text style={styles.detailValue}>{formatDateTime(selectedEntry.exitTime)}</Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>{selectedEntry.duration}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>₹{selectedEntry.exitAmount || 0}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[
                    styles.statusBadgeLarge,
                    { backgroundColor: selectedEntry.status === 'Parked' ? '#dcfce7' : '#fef3c7' }
                  ]}>
                    <Text style={[
                      styles.statusTextLarge,
                      { color: selectedEntry.status === 'Parked' ? '#166534' : '#92400e' }
                    ]}>
                      {selectedEntry.status === 'Parked' ? 'Parked' : 'Exited'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created At</Text>
                  <Text style={styles.detailValue}>{formatDateTime(new Date(selectedEntry.createdAt || 0).toISOString())}</Text>
                </View>
                
                {selectedEntry.uploadedAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Uploaded At</Text>
                    <Text style={styles.detailValue}>{formatDateTime(selectedEntry.uploadedAt)}</Text>
                  </View>
                )}
              </ScrollView>
            )}
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
    marginBottom: 4,
  },
  bikeStandInfo: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  dateFilterButton: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  dateFilterText: {
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: '600',
  },
  dateFilterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  datePickerHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  datePickerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  dateRangeDisplay: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  dateRangeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateRangeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dateRangeValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  clearButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
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
  yearCard: {
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
  yearText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  monthCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'center',
    flex: 1,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  dateCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 60,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#64748b',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1e293b',
    paddingVertical: 12,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearSearchText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardContent: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  tokenContainer: {
    alignItems: 'center',
  },
  tokenLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 1,
  },
  tokenValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '600',
  },
  typeContainer: {
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  vehicleSelectionContainer: {
    padding: 16,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bikeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  cycleCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  vehicleCardContent: {
    alignItems: 'center',
  },
  vehicleIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  vehicleCount: {
    fontSize: 14,
    color: '#64748b',
  },
  filterCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    justifyContent: 'center',
  },
  filterCard: {
    width: 60,
    height: 60,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  allFilterCard: {
    borderColor: '#6b7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bikeFilterCard: {
    borderColor: '#3b82f6',
  },
  cycleFilterCard: {
    borderColor: '#10b981',
  },
  filterCardActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterCardIcon: {
    fontSize: 22,
    marginBottom: 0,
  },
  filterCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 2,
  },

  cardBody: {
    marginBottom: 0,
  },
  bikeNumberText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 1,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 4,
  },
  timeContainer: {
    marginBottom: 2,
  },
  timeLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 1,
  },
  timeValue: {
    fontSize: 10,
    fontWeight: '500',
    color: '#374151',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    maxHeight: Dimensions.get('window').height * 0.9,
    width: Dimensions.get('window').width - 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
    flexGrow: 1,
  },
  bikeImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bikeImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  bikeImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bikeImageText: {
    fontSize: 30,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  statusBadgeLarge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTextLarge: {
    fontSize: 10,
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
  topCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  topCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  currentTopCard: {
    // reserved for future variations
  },
  oldTopCard: {
    // reserved for future variations
  },
  topCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topCardIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  topCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  topCardChevron: {
    fontSize: 16,
    color: '#94a3b8',
  },
  topCardSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  topCardAccentCurrent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#3b82f6',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  topCardAccentOld: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#10b981',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
}); 