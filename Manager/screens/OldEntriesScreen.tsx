import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Image, TextInput, ActivityIndicator } from 'react-native';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import dayjs from 'dayjs';

export default function OldEntriesScreen({ navigation, route }: any) {
  const { selectedBikeStand } = route.params;
  const [navigationMode, setNavigationMode] = useState<'years' | 'months' | 'dates' | 'entries'>('years');
  const [years, setYears] = useState<string[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal state (match ParkingScreen behavior)
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const formatDateTime = (value: any) => {
    if (value === null || value === undefined || value === '') return 'N/A';

    const toDate = (v: any): Date | null => {
      if (typeof v === 'number') {
        const ms = v < 1e12 ? v * 1000 : v; // seconds or ms
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
      }
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (/^\d+$/.test(trimmed)) {
          const num = Number(trimmed);
          return toDate(num);
        }
        // Try native Date
        const d1 = new Date(trimmed);
        if (!isNaN(d1.getTime())) return d1;
        // Try common formats with dayjs
        const formats = [
          'YYYY-MM-DDTHH:mm:ssZ',
          'YYYY-MM-DD HH:mm:ss',
          'YYYY/MM/DD HH:mm:ss',
          'DD/MM/YYYY HH:mm:ss',
          'DD/MM/YYYY HH:mm',
          'DD/MM/YYYY',
        ];
        for (const f of formats) {
          const dj = dayjs(trimmed, f, true);
          if (dj.isValid()) return dj.toDate();
        }
        const djLoose = dayjs(trimmed);
        return djLoose.isValid() ? djLoose.toDate() : null;
      }
      if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
        // Firestore Timestamp-like
        return (value as any).toDate();
      }
      return null;
    };

    const d = toDate(value);
    if (!d) return 'Invalid Date';
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  useEffect(() => {
    if (navigationMode === 'years') {
      setLoading(true);
      const refPath = `${selectedBikeStand.id}/oldEntries`;
      const yearsRef = ref(db, refPath);
      onValue(yearsRef, (snapshot) => {
        const data = snapshot.val();
        setYears(data ? Object.keys(data).sort((a,b) => Number(b) - Number(a)) : []);
        setLoading(false);
      }, () => setLoading(false));
    } else if (navigationMode === 'months' && selectedYear) {
      setLoading(true);
      const refPath = `${selectedBikeStand.id}/oldEntries/${selectedYear}`;
      const monthsRef = ref(db, refPath);
      onValue(monthsRef, (snapshot) => {
        const data = snapshot.val();
        setMonths(data ? Object.keys(data).sort((a,b) => Number(a) - Number(b)) : []);
        setLoading(false);
      }, () => setLoading(false));
    } else if (navigationMode === 'dates' && selectedYear && selectedMonth) {
      setLoading(true);
      const refPath = `${selectedBikeStand.id}/oldEntries/${selectedYear}/${selectedMonth}`;
      const datesRef = ref(db, refPath);
      onValue(datesRef, (snapshot) => {
        const data = snapshot.val();
        setDates(data ? Object.keys(data).sort((a,b) => Number(a) - Number(b)) : []);
        setLoading(false);
      }, () => setLoading(false));
    } else if (navigationMode === 'entries' && selectedYear && selectedMonth && selectedDate) {
      setLoading(true);
      const refPath = `${selectedBikeStand.id}/oldEntries/${selectedYear}/${selectedMonth}/${selectedDate}`;
      const entriesRef = ref(db, refPath);
      onValue(entriesRef, (snapshot) => {
        const data = snapshot.val();
        const flatEntries: any[] = [];
        if (data) {
          const traverse = (node: any, pathArr: string[] = []) => {
            if (!node) return;
            if (node.bikeNumber || node.time || node.EntryTime) {
              const leafKey = pathArr[pathArr.length - 1];
              const vehicleType = (node.vehicleType || '').toLowerCase();
              const normalized = {
                id: leafKey,
                token: leafKey,
                fullPath: pathArr.join('/'),
                bikeNumber: node.bikeNumber,
                time: node.time ?? node.EntryTime ?? node.createdAt ?? node.uploadedAt,
                exitTime: node.exitTime,
                status: node.status || (node.exitTime ? 'Exited' : 'Parked'),
                exitAmount: node.exitAmount,
                duration: node.duration,
                imageUrl: node.imageUrl,
                createdAt: node.createdAt,
                uploadedAt: node.uploadedAt,
                type: vehicleType === 'cycle' ? 'cycle' : 'bike',
              };
              flatEntries.push(normalized);
            } else {
              Object.keys(node).forEach(key => traverse(node[key], [...pathArr, key]));
            }
          };
          traverse(data);
        }
        setEntries(flatEntries);
        setLoading(false);
      }, () => setLoading(false));
    }
  }, [navigationMode, selectedYear, selectedMonth, selectedDate, selectedBikeStand]);

  // Search effect
  useEffect(() => {
    let timeout: any;
    const term = searchQuery.trim().toLowerCase();
    if (term.length > 0) {
      setIsSearching(true);
      timeout = setTimeout(() => {
        const results = entries.filter((e) => {
          const bike = (e.bikeNumber || '').toLowerCase();
          const id = (e.id || '').toLowerCase();
          return bike.includes(term) || id.includes(term);
        });
        setSearchResults(results);
        setIsSearching(false);
      }, 150);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
    return () => timeout && clearTimeout(timeout);
  }, [searchQuery, entries]);

  const renderBreadcrumb = () => (
    <View style={styles.breadcrumbContainer}>
      <TouchableOpacity style={styles.breadcrumbChip} onPress={() => { setNavigationMode('years'); setSelectedYear(null); setSelectedMonth(null); setSelectedDate(null); setSearchQuery(''); }}>
        <Text style={styles.breadcrumbChipText}>Years</Text>
      </TouchableOpacity>
      {selectedYear && (
        <>
          <Text style={styles.breadcrumbSeparator}>›</Text>
          <TouchableOpacity style={styles.breadcrumbChip} onPress={() => { setNavigationMode('months'); setSelectedMonth(null); setSelectedDate(null); setSearchQuery(''); }}>
            <Text style={styles.breadcrumbChipText}>{selectedYear}</Text>
          </TouchableOpacity>
        </>
      )}
      {selectedMonth && (
        <>
          <Text style={styles.breadcrumbSeparator}>›</Text>
          <TouchableOpacity style={styles.breadcrumbChip} onPress={() => { setNavigationMode('dates'); setSelectedDate(null); setSearchQuery(''); }}>
            <Text style={styles.breadcrumbChipText}>{dayjs().month(Number(selectedMonth) - 1).format('MMMM')}</Text>
          </TouchableOpacity>
        </>
      )}
      {selectedDate && (
        <>
          <Text style={styles.breadcrumbSeparator}>›</Text>
          <View style={styles.breadcrumbChip}>
            <Text style={styles.breadcrumbChipText}>{selectedDate}</Text>
          </View>
        </>
      )}
    </View>
  );

  const onPressEntry = (item: any) => {
    setSelectedEntry(item);
    setModalVisible(true);
  };

  const renderEntry = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => onPressEntry(item)}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.tokenPill}><Text style={styles.tokenPillText}>{item.id}</Text></View>
        <View style={[styles.statusBadge, item.status === 'Parked' ? styles.parkedBadge : styles.exitedBadge]}>
          <Text style={item.status === 'Parked' ? styles.parkedBadgeText : styles.exitedBadgeText}>
            {item.status}
          </Text>
        </View>
      </View>
      <View style={styles.cardBodyRow}>
        <Text style={styles.bikeNumber}>Bike: {item.bikeNumber || '-'}</Text>
        <Text style={styles.timeText}>{formatDateTime(item.time)}</Text>
      </View>
    </TouchableOpacity>
  );

  const dataToRender = searchQuery.trim() ? searchResults : entries;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Old Entries</Text>
        <Text style={styles.subtitle}>Bike Stand: {selectedBikeStand.name}</Text>
        {renderBreadcrumb()}
      </View>

      {loading ? <Text style={styles.loading}>Loading...</Text> : null}

      {navigationMode === 'years' && (
        <FlatList
          data={years}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.yearCard} onPress={() => { setSelectedYear(item); setNavigationMode('months'); }}>
              <Text style={styles.yearText}>{item}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {navigationMode === 'months' && (
        <FlatList
          data={months}
          numColumns={3}
          columnWrapperStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.monthCard} onPress={() => { setSelectedMonth(item); setNavigationMode('dates'); }}>
              <Text style={styles.monthText}>{dayjs().month(Number(item) - 1).format('MMM')}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {navigationMode === 'dates' && (
        <FlatList
          data={dates}
          numColumns={4}
          columnWrapperStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.dateCard} onPress={() => { setSelectedDate(item); setNavigationMode('entries'); }}>
              <Text style={styles.dateText}>{item}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {navigationMode === 'entries' && (
        <>
          <View style={styles.searchContainer}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by bike number or ID"
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
            />
          </View>
          {isSearching && (
            <View style={styles.searchingRow}>
              <ActivityIndicator size="small" color="#0ea5e9" />
              <Text style={styles.searchingText}>Searching...</Text>
            </View>
          )}
          <FlatList
            data={dataToRender}
            renderItem={renderEntry}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {searchQuery.trim() ? `No results for "${searchQuery}"` : 'No entries found.'}
              </Text>
            }
          />
        </>
      )}

      {/* Detail Modal (mirrors ParkingScreen) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Entry Details</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedEntry && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.bikeImageContainer}>
                  {selectedEntry.imageUrl ? (
                    <Image source={{ uri: selectedEntry.imageUrl }} style={styles.bikeImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.bikeImagePlaceholder}>
                      <Text style={styles.bikeImageText}>🏍️</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Token</Text>
                  <Text style={styles.detailValue}>{selectedEntry.token || selectedEntry.id}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bike Number</Text>
                  <Text style={styles.detailValue}>{selectedEntry.bikeNumber || '-'}</Text>
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

                {selectedEntry.duration && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{selectedEntry.duration}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>₹{selectedEntry.exitAmount || 0}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: selectedEntry.status === 'Parked' ? '#dcfce7' : '#fef3c7' }]}>
                    <Text style={[styles.statusTextLarge, { color: selectedEntry.status === 'Parked' ? '#166534' : '#92400e' }]}>
                      {selectedEntry.status === 'Parked' ? 'Parked' : 'Exited'}
                    </Text>
                  </View>
                </View>

                {selectedEntry.createdAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created At</Text>
                    <Text style={styles.detailValue}>{formatDateTime(selectedEntry.createdAt)}</Text>
                  </View>
                )}

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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#f1f5f9', marginBottom: 8 },
  backButtonText: { color: '#475569', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  breadcrumbContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  breadcrumbChip: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999 },
  breadcrumbChipText: { color: '#475569', fontWeight: '600', fontSize: 12 },
  breadcrumbSeparator: { color: '#94a3b8' },
  listContainer: { padding: 16, gap: 8 },
  yearCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  yearText: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  monthCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  monthText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  dateCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  dateText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tokenPill: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  tokenPillText: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  parkedBadge: { backgroundColor: '#dcfce7' },
  exitedBadge: { backgroundColor: '#fef3c7' },
  parkedBadgeText: { color: '#166534', fontWeight: '700', fontSize: 10 },
  exitedBadgeText: { color: '#92400e', fontWeight: '700', fontSize: 10 },
  cardBodyRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bikeNumber: { color: '#0f172a', fontWeight: '700' },
  timeText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  loading: { padding: 16, color: '#64748b' },
  empty: { padding: 16, color: '#64748b' },
  // Search styles
  searchContainer: { paddingHorizontal: 16, paddingTop: 8 },
  searchInput: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a' },
  searchingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  searchingText: { marginLeft: 8, color: '#64748b' },
  // Modal styles (mirroring ParkingScreen)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  closeButton: { padding: 8 },
  closeButtonText: { fontSize: 18, color: '#64748b' },
  modalBody: { paddingHorizontal: 16, paddingVertical: 12 },
  bikeImageContainer: { width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f1f5f9', marginBottom: 12 },
  bikeImage: { width: '100%', height: '100%' },
  bikeImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bikeImageText: { fontSize: 48 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailLabel: { color: '#64748b', fontWeight: '600' },
  detailValue: { color: '#0f172a', fontWeight: '700' },
  statusBadgeLarge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999 },
  statusTextLarge: { fontWeight: '800' },
});
