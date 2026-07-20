import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSamplesPaginated } from '../utils/api';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

export default function TrackingScreen({ navigation }: any) {
  const [samples, setSamples] = useState<any[]>([]);
  const [filteredSamples, setFilteredSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const PAGE_SIZE = 50;

  const FILTERS = ['All', 'In Development', 'In Production', 'QA Pending', 'Approved', 'Dispatched'];

  const fetchSamples = async (query = '') => {
    try {
      const res = await getSamplesPaginated(PAGE_SIZE, undefined, query);
      setSamples(res.data);
      applyFilters(query, activeFilter, res.data);
      setHasMore(res.hasMore);
    } catch (error) { console.error(error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || activeFilter !== 'All') return;
    setLoadingMore(true);
    try {
      const lastId = samples[samples.length - 1]?.id;
      const res = await getSamplesPaginated(PAGE_SIZE, lastId, searchQuery);
      const merged = [...samples, ...res.data];
      setSamples(merged); applyFilters(searchQuery, activeFilter, merged);
      setHasMore(res.hasMore);
    } catch (error) { console.error(error); }
    finally { setLoadingMore(false); }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchSamples(searchQuery);
  };

  useFocusEffect(useCallback(() => { setLoading(true); setHasMore(true); fetchSamples(searchQuery); }, []));

  useEffect(() => {
    const delay = setTimeout(() => {
      setLoading(true);
      fetchSamples(searchQuery);
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const applyFilters = (text: string, filter: string, source?: any[]) => {
    let result = source || samples;
    if (filter !== 'All') result = result.filter((item: any) => item.status === filter);
    if (text) {
      const q = text.toLowerCase();
      result = result.filter((item: any) =>
        (item.sample_name || '').toLowerCase().includes(q) ||
        (item.style_number || '').toString().toLowerCase().includes(q) ||
        (item.current_holder_name && item.current_holder_name.toLowerCase().includes(q)) ||
        (item.current_department && item.current_department.toLowerCase().includes(q))
      );
    }
    setFilteredSamples(result);
  };

  const handleSearch = (text: string) => { setSearchQuery(text); applyFilters(text, activeFilter); };
  const handleFilter = (filter: string) => { setActiveFilter(filter); applyFilters(searchQuery, filter); };

  const renderItem = ({ item, index }: any) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('Timeline', { sampleId: item.id, sampleName: item.sample_name, sampleDetails: item })}
      activeOpacity={0.6}
    >
      <Text style={styles.rowNum}>{index + 1}</Text>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{item.sample_name}</Text>
        <Text style={styles.rowSub}>{item.style_number}  •  {item.developed_for}</Text>
      </View>
      <View style={styles.rowMid}>
        <Text style={styles.rowHolder}>{item.current_holder_name || '—'}</Text>
        <Text style={styles.rowDept}>{item.current_department || '—'}</Text>
      </View>
      <View style={styles.rowRight}>
        <View style={[styles.statusDot, getStatusDotColor(item.status)]} />
        <Text style={styles.rowStatus}>{item.status}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={COLORS.border} />
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.thText, { width: 28 }]}>#</Text>
      <Text style={[styles.thText, { flex: 1.3 }]}>Sample</Text>
      <Text style={[styles.thText, { flex: 1 }]}>Holder</Text>
      <Text style={[styles.thText, { flex: 0.8 }]}>Status</Text>
      <View style={{ width: 16 }} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Live Tracking</Text>
          <Text style={styles.pageSubtitle}>{filteredSamples.length} of {samples.length} samples</Text>
        </View>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => navigation.navigate('BarcodeScanner', { samples })}
        >
          <Feather name="maximize" size={16} color={COLORS.warmWhite} />
          <Text style={styles.scanBtnText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={COLORS.placeholder} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sample, holder, department..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor={COLORS.placeholder}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Feather name="x-circle" size={16} color={COLORS.placeholder} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Chips */}
      <View style={styles.chipWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {FILTERS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.chip, activeFilter === item && styles.chipActive]}
              onPress={() => handleFilter(item)}
            >
              <Text style={[styles.chipText, activeFilter === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Table */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.copper} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredSamples}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={renderHeader}
          stickyHeaderIndices={[0]}
          contentContainerStyle={styles.tableContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.copper]} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={COLORS.copper} style={{ paddingVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="inbox" size={36} color={COLORS.border} />
              <Text style={styles.emptyText}>No samples match your filter</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function getStatusDotColor(status: string) {
  switch (status) {
    case 'In Production': return { backgroundColor: COLORS.statusProd };
    case 'QA Pending': return { backgroundColor: COLORS.statusQA };
    case 'Approved': return { backgroundColor: COLORS.statusApproved };
    case 'Dispatched': return { backgroundColor: COLORS.statusDispatched };
    default: return { backgroundColor: COLORS.statusDev };
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.cream },

  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18,
    backgroundColor: COLORS.indigo,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  pageSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.copper, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  scanBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: COLORS.warmWhite, borderRadius: 12,
    paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.dark },

  chipWrapper: { height: 50, marginBottom: 4 },
  chipRow: { paddingHorizontal: 20, paddingVertical: 10, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.warmWhite, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', height: 34,
  },
  chipActive: { backgroundColor: COLORS.denimDark, borderColor: COLORS.denimDark },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  chipTextActive: { color: '#ffffff' },

  tableContainer: { paddingBottom: 100 },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: COLORS.sand,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  thText: { fontSize: 11, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.warmWhite,
  },
  rowNum: { width: 28, fontSize: 13, fontWeight: '500', color: COLORS.muted },
  rowMain: { flex: 1.3 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  rowSub: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  rowMid: { flex: 1 },
  rowHolder: { fontSize: 13, fontWeight: '600', color: COLORS.denimDark },
  rowDept: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  rowRight: { flex: 0.8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  rowStatus: { fontSize: 11, fontWeight: '500', color: COLORS.muted },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.muted, marginTop: 10, fontSize: 14 },
});
