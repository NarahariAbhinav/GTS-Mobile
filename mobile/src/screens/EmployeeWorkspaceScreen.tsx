import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMySamples, getPendingTransfers, rejectTransfer, acceptTransfer, getSamples, getNotifications, sendExcelReportEmail, getMyTransferHistory } from '../utils/api';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

export default function EmployeeWorkspaceScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [mySamples, setMySamples] = useState<any[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [transferHistory, setTransferHistory] = useState<any[]>([]);

  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchData = async () => {
    if (!user) return;
    try {
      const [samples, transfers, notifs, history] = await Promise.all([
        getMySamples(user.id), 
        getPendingTransfers(user.id),
        getNotifications(user.id).catch(() => []),
        getMyTransferHistory(user.id).catch(() => [])
      ]);
      setMySamples(samples);
      setPendingTransfers(transfers);
      if (notifs) setNotifications(notifs);
      if (history) setTransferHistory(history);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [user?.id]));

  const handleAccept = (txn: any) => {
    navigation.navigate('VerifyScan', { transactionId: txn.id, expectedStyleNumber: txn.style_number, sampleName: txn.sample_name });
  };

  // Manual accept has been removed — barcode scan is now mandatory for all transfers

  const openRejectModal = (txnId: string) => { setRejectingId(txnId); setRejectReason(''); setRejectModalVisible(true); };
  const handleReject = async () => {
    if (!rejectingId) return;
    if (!rejectReason || !rejectReason.trim()) {
      Alert.alert('Validation Error', 'Please enter a mandatory reason for rejecting this sample.');
      return;
    }
    try {
      await rejectTransfer(rejectingId, rejectReason.trim());
      setRejectModalVisible(false);
      Alert.alert('Rejected', 'Transfer has been rejected. Sample stays with sender.');
      fetchData();
    } catch (error: any) { Alert.alert('Error', error?.response?.data?.error || 'Failed to reject'); }
  };

  const handleLogout = () => { logout(); navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })); };

  const handleDownloadExcel = async () => {
    const adminEmail = user?.email;
    if (!adminEmail) { Alert.alert('Error', 'Could not find your email address.'); return; }

    try {
      Alert.alert('Generating Excel...', 'Fetching samples for export...');
      const allSamples = await getSamples();
      
      let csvContent = "Sample Name,Style Number,Brand,Status,Current Holder,Department,Created Date\n";
      allSamples.forEach((s: any) => {
        const dateStr = s.created_at ? new Date(s.created_at).toLocaleDateString() : '';
        csvContent += `"${s.sample_name || ''}","${s.style_number || ''}","${s.developed_for || ''}","${s.status || ''}","${s.current_holder_name || ''}","${s.current_department || ''}","${dateStr}"\n`;
      });

      await sendExcelReportEmail(adminEmail, csvContent);
      Alert.alert('Success ✅', `Excel report has been sent to ${adminEmail}!`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to email report: ' + err.message);
    }
  };

  if (loading) return <View style={styles.loaderContainer}><ActivityIndicator size="large" color={COLORS.copper} /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.welcomeText}>My Workspace</Text>
              <Text style={styles.userName}>{user?.employee_name}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.navigate('Notifications')}>
                <Feather name="bell" size={18} color="rgba(255,255,255,0.7)" />
                {unreadCount > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Feather name="log-out" size={18} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.designation} • {user?.department}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Feather name="box" size={16} color={COLORS.denim} />
            <Text style={styles.statValue}>{mySamples.length}</Text>
            <Text style={styles.statLabel}>My Samples</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Feather name="inbox" size={16} color={pendingTransfers.length > 0 ? COLORS.danger : COLORS.denim} />
            <Text style={[styles.statValue, pendingTransfers.length > 0 && { color: COLORS.danger }]}>{pendingTransfers.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Email Report (Conditionally shown if enabled) */}
        {user?.email_report_enabled && (
          <View style={styles.reportsContainer}>
            <TouchableOpacity style={styles.reportBtn} onPress={handleDownloadExcel} activeOpacity={0.8}>
              <View style={styles.emailReportIcon}>
                <Feather name="download" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emailReportTitle}>Email Excel</Text>
                <Text style={styles.emailReportSub}>Send via email</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Transfers */}
        {pendingTransfers.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Acceptance</Text>
              <View style={styles.countBadge}><Text style={styles.countBadgeText}>{pendingTransfers.length}</Text></View>
            </View>
            {pendingTransfers.map((txn: any) => (
              <View key={txn.id} style={styles.pendingCard}>
                <View style={styles.pendingTop}>
                  <View style={styles.pendingIcon}><MaterialCommunityIcons name="tshirt-crew" size={18} color={COLORS.copper} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingSample}>{txn.sample_name}</Text>
                    <Text style={styles.pendingSub}>{txn.style_number} • {txn.developed_for}</Text>
                  </View>
                  <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>PENDING</Text></View>
                </View>
                <View style={styles.pendingInfo}>
                  <View style={styles.pendingInfoCol}>
                    <Text style={styles.pendingLabel}>FROM</Text>
                    <Text style={styles.pendingValue}>{txn.from_employee_name || 'System'}</Text>
                  </View>
                  <View style={styles.pendingInfoDivider} />
                  <View style={styles.pendingInfoCol}>
                    <Text style={styles.pendingLabel}>DEPARTMENT</Text>
                    <Text style={styles.pendingValue}>{txn.department}</Text>
                  </View>
                </View>
                {txn.remarks ? <Text style={styles.pendingRemarks}>"{txn.remarks}"</Text> : null}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => openRejectModal(txn.id)}>
                    <Feather name="x" size={16} color={COLORS.danger} /><Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(txn)}>
                    <Feather name="maximize" size={16} color="#fff" /><Text style={styles.acceptBtnText}>Scan & Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* My Samples */}
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>My Samples</Text></View>
        {mySamples.length === 0 ? (
          <View style={styles.emptyState}><Feather name="inbox" size={32} color={COLORS.border} /><Text style={styles.emptyText}>No samples assigned to you</Text></View>
        ) : (
          mySamples.map((item: any) => (
            <TouchableOpacity key={item.id} style={styles.sampleRow}
              onPress={() => navigation.navigate('Timeline', { sampleId: item.id, sampleName: item.sample_name, sampleDetails: item })} activeOpacity={0.6}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sampleName}>{item.sample_name}</Text>
                <Text style={styles.sampleSub}>{item.style_number} • {item.developed_for}</Text>
              </View>
              <View style={styles.sampleRight}>
                <View style={[styles.statusDot, getStatusDotColor(item.status)]} />
                <Text style={styles.sampleStatus}>{item.status}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={COLORS.border} />
            </TouchableOpacity>
          ))
        )}

        {/* Recent & Rejected Handovers */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}><Text style={styles.sectionTitle}>Recent & Rejected Handovers</Text></View>
        {transferHistory.length === 0 ? (
          <View style={styles.emptyState}><Feather name="clock" size={28} color={COLORS.border} /><Text style={styles.emptyText}>No recent handover activity found</Text></View>
        ) : (
          transferHistory.map((item: any) => {
            const isReject = item.transfer_status === 'Rejected';
            return (
              <View key={item.id} style={[styles.sampleRow, isReject && { borderColor: COLORS.dangerLight, borderWidth: 1, backgroundColor: COLORS.warmWhite }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={styles.sampleName}>{item.sample_name}</Text>
                    <View style={[styles.statusDot, { backgroundColor: isReject ? COLORS.danger : item.transfer_status === 'Accepted' ? COLORS.emerald : COLORS.denim }]} />
                    <Text style={[styles.sampleStatus, isReject && { color: COLORS.danger, fontWeight: '700' }]}>{item.transfer_status}</Text>
                  </View>
                  <Text style={styles.sampleSub}>From: {item.from_employee_name} ➔ To: {item.to_employee_name}</Text>
                  {isReject && item.rejection_reason ? (
                    <Text style={{ fontSize: 13, color: COLORS.danger, fontWeight: '600', marginTop: 4 }}>
                      ⚠️ Reject Reason: "{item.rejection_reason}"
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reject Transfer</Text>
                <TouchableOpacity onPress={() => setRejectModalVisible(false)}><Feather name="x" size={22} color={COLORS.muted} /></TouchableOpacity>
              </View>
              <Text style={[styles.fieldLabel, { color: COLORS.danger, fontWeight: '600' }]}>Reason for Rejection * (Required)</Text>
              <TextInput style={styles.input} placeholder="e.g. Not the correct sample / defective" value={rejectReason} onChangeText={setRejectReason} placeholderTextColor={COLORS.placeholder} multiline />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRejectModalVisible(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.modalRejectBtn} onPress={handleReject}><Text style={styles.modalRejectText}>Confirm Reject</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function getStatusDotColor(s: string) {
  switch (s) {
    case 'In Production': return { backgroundColor: COLORS.statusProd };
    case 'QA Pending': return { backgroundColor: COLORS.statusQA };
    case 'Approved': return { backgroundColor: COLORS.statusApproved };
    case 'Dispatched': return { backgroundColor: COLORS.statusDispatched };
    default: return { backgroundColor: COLORS.statusDev };
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.cream },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.cream },
  container: { flex: 1 },

  header: {
    backgroundColor: COLORS.indigo, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeText: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  userName: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 2 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 8, alignSelf: 'flex-start' },
  roleBadgeText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  logoutBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444',
    width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.indigo,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.warmWhite, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 4, marginHorizontal: 20, marginTop: -14,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.dark, marginTop: 4 },
  statLabel: { fontSize: 10, fontWeight: '600', color: COLORS.muted, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.divider },

  reportsContainer: { marginHorizontal: 20, marginTop: 16 },
  reportBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef3f7',
    padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#dce6ef',
  },
  emailReportIcon: {
    backgroundColor: COLORS.verified, width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  emailReportTitle: { fontSize: 13, fontWeight: '700', color: COLORS.dark },
  emailReportSub: { fontSize: 10, color: COLORS.muted, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark, textTransform: 'uppercase', letterSpacing: 0.5 },
  countBadge: { backgroundColor: COLORS.danger, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  pendingCard: {
    backgroundColor: COLORS.warmWhite, borderRadius: 14, padding: 14, marginBottom: 12, marginHorizontal: 20,
    borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3, borderLeftColor: COLORS.stitch,
  },
  pendingTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pendingIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fce8d5', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  pendingSample: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  pendingSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  pendingBadge: { backgroundColor: COLORS.pendingBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pendingBadgeText: { fontSize: 9, fontWeight: '700', color: '#92400e', letterSpacing: 0.5 },

  pendingInfo: { flexDirection: 'row', backgroundColor: COLORS.cream, borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.divider },
  pendingInfoCol: { flex: 1 },
  pendingInfoDivider: { width: 1, height: 28, backgroundColor: COLORS.border, marginHorizontal: 10 },
  pendingLabel: { fontSize: 9, fontWeight: '700', color: COLORS.muted, letterSpacing: 0.8, marginBottom: 3 },
  pendingValue: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  pendingRemarks: { fontSize: 12, color: COLORS.muted, fontStyle: 'italic', marginBottom: 12, paddingHorizontal: 2 },

  actionRow: { flexDirection: 'row', gap: 8 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: 10, backgroundColor: COLORS.warmWhite, borderWidth: 1, borderColor: COLORS.dangerLight },
  rejectBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  manualAcceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: 10, backgroundColor: '#eef3f7', borderWidth: 1, borderColor: COLORS.denimLight },
  manualAcceptBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.denim },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: 10, backgroundColor: COLORS.copper },
  acceptBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  sampleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.divider, backgroundColor: COLORS.warmWhite },
  sampleName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  sampleSub: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  sampleRight: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  sampleStatus: { fontSize: 11, fontWeight: '500', color: COLORS.muted },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: COLORS.muted, marginTop: 10, fontSize: 14 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  modalContent: { backgroundColor: COLORS.warmWhite, padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: COLORS.cream, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 15, color: COLORS.dark, minHeight: 60 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.sand },
  modalCancelText: { color: COLORS.muted, fontWeight: '600' },
  modalRejectBtn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.danger },
  modalRejectText: { color: '#fff', fontWeight: '600' },
});
