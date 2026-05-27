import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTimeline, getSamples } from '../utils/api';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

// Firestore timestamps can come back as {_seconds, _nanoseconds} objects
// This helper safely converts any format to a JS Date
function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  // Firestore Timestamp object: {_seconds, _nanoseconds}
  if (val._seconds !== undefined) return new Date(val._seconds * 1000);
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  return null;
}

function fmtDate(val: any): string {
  const d = parseDate(val);
  if (!d) return '';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(val: any): string {
  const d = parseDate(val);
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}


export default function TimelineScreen({ route, navigation }: any) {
  const { sampleId, sampleName } = route.params;
  const [sampleDetails, setSampleDetails] = useState<any>(route.params.sampleDetails || null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // useFocusEffect re-runs every time this screen becomes visible
  // so after a handover, coming back here instantly shows the updated data
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchAll = async () => {
        try {
          setLoading(true);
          const [historyData, allSamples] = await Promise.all([
            getTimeline(sampleId),
            getSamples()
          ]);
          if (isActive) {
            setTimeline(historyData);
            const fresh = allSamples.find((s: any) => s.id === sampleId);
            if (fresh) setSampleDetails(fresh);
          }
        } catch (error) {
          console.error(error);
        } finally {
          if (isActive) setLoading(false);
        }
      };
      fetchAll();
      return () => { isActive = false; };
    }, [sampleId])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sample Details</Text>
        <TouchableOpacity onPress={() => navigation.navigate('HandoverFromTimeline', { prefilledSampleId: sampleId })}>
          <Feather name="send" size={20} color={COLORS.copper} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.copper} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>

          {/* ── SAMPLE INFO ── */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sample Name</Text>
              <Text style={styles.infoValue}>{sampleName}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRowDouble}>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Style Number</Text>
                <Text style={styles.infoValue}>{sampleDetails?.style_number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Developed For</Text>
                <Text style={styles.infoValue}>{sampleDetails?.developed_for || '—'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, getStatusDotColor(sampleDetails?.status)]} />
                <Text style={styles.infoValue}>{sampleDetails?.status}</Text>
              </View>
            </View>
          </View>

          {/* ── CURRENT HOLDER ── */}
          <Text style={styles.sectionTitle}>Current Holder</Text>
          <View style={styles.holderCard}>
            <View style={styles.holderAvatar}>
              <Feather name="user" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.holderName}>{sampleDetails?.current_holder_name || 'Unassigned'}</Text>
              <Text style={styles.holderDept}>{sampleDetails?.current_department || 'Not yet transferred'}</Text>
            </View>
            <TouchableOpacity
              style={styles.transferBtn}
              onPress={() => navigation.navigate('HandoverFromTimeline', { prefilledSampleId: sampleId })}
            >
              <Text style={styles.transferBtnText}>Transfer</Text>
              <Feather name="arrow-right" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* ── MOVEMENT HISTORY ── */}
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Movement History</Text>
            <Text style={styles.historyCount}>{timeline.length} transfers</Text>
          </View>

          <View style={styles.timelineCard}>
            {timeline.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={28} color="#d1d5db" />
                <Text style={styles.emptyText}>No transfers recorded yet</Text>
              </View>
            ) : (
              timeline.map((item: any, index: number) => {
                const isLatest = index === 0;
                const isLast = index === timeline.length - 1;
                return (
                  <View key={item.id} style={styles.tlRow}>
                    {/* Vertical connector */}
                    <View style={styles.tlTrack}>
                      {!isLast && <View style={styles.tlLine} />}
                      <View style={[styles.tlDot, isLatest && styles.tlDotActive]} />
                    </View>

                    {/* Event content */}
                    <View style={[styles.tlEvent, isLatest && styles.tlEventActive]}>
                      <View style={styles.tlEventHeader}>
                        <Text style={styles.tlEventTitle}>
                          {item.from_employee_name
                            ? `${item.from_employee_name} → ${item.to_employee_name}`
                            : `Assigned to ${item.to_employee_name}`}
                        </Text>
                        {/* Transfer Status Badge */}
                        {item.transfer_status && (
                          <View style={[styles.tlStatusBadge, getTransferStatusBg(item.transfer_status)]}>
                            <Text style={[styles.tlStatusText, getTransferStatusFg(item.transfer_status)]}>
                              {item.transfer_status === 'Accepted' ? '✓ Verified' : item.transfer_status === 'Rejected' ? '✗ Rejected' : '⏳ Pending'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.tlDept}>{item.department}</Text>
                      {item.remarks ? (
                        <Text style={styles.tlRemark}>"{item.remarks}"</Text>
                      ) : null}
                      {item.rejection_reason ? (
                        <Text style={styles.tlRejectReason}>Reason: "{item.rejection_reason}"</Text>
                      ) : null}
                      <Text style={styles.tlDate}>
                        Sent: {fmtDate(item.handover_date)}{'  '}{fmtTime(item.handover_date)}
                      </Text>
                      {item.accepted_at && (
                        <Text style={styles.tlVerified}>
                          ✓ Accepted: {fmtDate(item.accepted_at)} {fmtTime(item.accepted_at)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}

            {/* Created step */}
            <View style={styles.tlRow}>
              <View style={styles.tlTrack}>
                <View style={styles.tlDot} />
              </View>
              <View style={styles.tlEvent}>
                <Text style={styles.tlEventTitle}>Sample Created</Text>
                <Text style={styles.tlDate}>
                  {sampleDetails?.created_at
                    ? new Date(sampleDetails.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
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

function getTransferStatusBg(status: string) {
  if (status === 'Accepted') return { backgroundColor: COLORS.verifiedBg };
  if (status === 'Rejected') return { backgroundColor: COLORS.rejectedBg };
  return { backgroundColor: COLORS.pendingBg };
}
function getTransferStatusFg(status: string) {
  if (status === 'Accepted') return { color: COLORS.verified };
  if (status === 'Rejected') return { color: COLORS.rejected };
  return { color: '#92400e' };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.cream },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18,
    backgroundColor: COLORS.indigo,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  scrollArea: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  infoCard: {
    backgroundColor: COLORS.warmWhite, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 24,
  },
  infoRow: { paddingVertical: 8 },
  infoRowDouble: { flexDirection: 'row', paddingVertical: 8 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: 4 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  holderCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.warmWhite, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 28,
  },
  holderAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.indigo,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  holderName: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  holderDept: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  transferBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.copper, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  transferBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  historyCount: { fontSize: 12, color: COLORS.muted, fontWeight: '500' },

  timelineCard: {
    backgroundColor: COLORS.warmWhite, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tlRow: { flexDirection: 'row', minHeight: 60 },
  tlTrack: { width: 20, alignItems: 'center', marginRight: 14 },
  tlLine: { position: 'absolute', top: 18, bottom: -10, width: 1.5, backgroundColor: COLORS.border },
  tlDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.border,
    borderWidth: 2, borderColor: COLORS.warmWhite, zIndex: 1, marginTop: 4,
  },
  tlDotActive: { backgroundColor: COLORS.copper, borderWidth: 2, borderColor: COLORS.sand },
  tlEvent: { flex: 1, paddingBottom: 20 },
  tlEventActive: {},
  tlEventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  tlEventTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark, flex: 1 },
  tlStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tlStatusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  tlDept: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  tlRemark: { fontSize: 12, color: COLORS.muted, fontStyle: 'italic', marginTop: 4 },
  tlRejectReason: { fontSize: 12, color: COLORS.rejected, fontStyle: 'italic', marginTop: 2 },
  tlDate: { fontSize: 11, color: COLORS.muted, marginTop: 6 },
  tlVerified: { fontSize: 11, color: COLORS.verified, fontWeight: '500', marginTop: 2 },

  emptyState: { alignItems: 'center', padding: 30 },
  emptyText: { color: COLORS.muted, marginTop: 8, fontSize: 13 },
});
