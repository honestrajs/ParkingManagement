import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import dayjs from 'dayjs';

export default function CurrentParkingScreen({ navigation, route }: any) {
  const { selectedBikeStand } = route.params;
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'Parked' | 'Exited'>('all');

  useEffect(() => {
    const path = `${selectedBikeStand.id}/BikeEntries`;
    const entriesRef = ref(db, path);
    const unsubscribe = onValue(entriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const flatEntries: any[] = [];
        const traverse = (node: any, pathArr: string[] = []) => {
          if (!node) return;
          if (node.bikeNumber || node.time) {
            flatEntries.push({ id: pathArr.join('/'), ...node });
          } else {
            Object.keys(node).forEach(key => traverse(node[key], [...pathArr, key]));
          }
        };
        traverse(data);
        setEntries(flatEntries.sort((a, b) => (dayjs(b.time).valueOf() - dayjs(a.time).valueOf())));
      } else {
        setEntries([]);
      }
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [selectedBikeStand]);

  const filtered = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(e => e.status === filter);
  }, [entries, filter]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.tokenPill}><Text style={styles.tokenPillText}>{item.id.split('/').pop()}</Text></View>
        <View style={[styles.statusBadge, item.status === 'Parked' ? styles.parkedBadge : styles.exitedBadge]}>
          <Text style={[styles.statusBadgeText, item.status === 'Parked' ? styles.parkedBadgeText : styles.exitedBadgeText]}>
            {item.status}
          </Text>
        </View>
      </View>
      <View style={styles.cardBodyRow}>
        <Text style={styles.bikeNumber}>Bike: {item.bikeNumber || '-'}</Text>
        <Text style={styles.timeText}>{dayjs(item.time).format('DD MMM, hh:mm A')}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Current Parking</Text>
        <Text style={styles.subtitle}>Bike Stand: {selectedBikeStand.name}</Text>
        <View style={styles.chipsRow}>
          {(['all','Parked','Exited'] as const).map(ch => (
            <TouchableOpacity key={ch} style={[styles.chip, filter === ch && styles.chipActive]} onPress={() => setFilter(ch)}>
              <Text style={[styles.chipText, filter === ch && styles.chipTextActive]}>
                {ch === 'all' ? 'All' : ch}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {loading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.empty}>No entries found.</Text>}
        />
      )}
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
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999 },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  listContainer: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tokenPill: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  tokenPillText: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  statusBadgeText: { fontWeight: '700', fontSize: 10 },
  parkedBadge: { backgroundColor: '#dcfce7' },
  exitedBadge: { backgroundColor: '#fef3c7' },
  parkedBadgeText: { color: '#166534', fontWeight: '700', fontSize: 10 },
  exitedBadgeText: { color: '#92400e', fontWeight: '700', fontSize: 10 },
  cardBodyRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bikeNumber: { color: '#0f172a', fontWeight: '700' },
  timeText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  loading: { padding: 16, color: '#64748b' },
  empty: { padding: 16, color: '#64748b' },
});
