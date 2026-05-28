import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats, getSamples, sendDailyReportEmail, getNotifications, sendExcelReportEmail } from '../utils/api';
import { COLORS } from '../utils/theme';

export default function DashboardScreen({ navigation }: any) {
  const { user, isAdmin, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentSamples, setRecentSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
  };

  const fetchData = async (isRefresh = false) => {
    if (!isRefresh && !stats) setLoading(true); // only show full screen loader if no data
    try {
      const promises: Promise<any>[] = [
        getDashboardStats().catch(() => ({ totalSamples: 0, totalEmployees: 0, inTransit: 0, pendingQA: 0, pendingTransfers: 0 })),
        getSamples().catch(() => [])
      ];
      if (user?.id) promises.push(getNotifications(user.id).catch(() => []));
      
      const results = await Promise.all(promises);
      setStats(results[0]);
      setRecentSamples((results[1] || []).slice(0, 3));
      if (results[2]) setNotifications(results[2]);
    } catch (error) { console.error(error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [user?.id]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleSendReport = async () => {
    const adminEmail = user?.email;
    if (!adminEmail) { Alert.alert('Error', 'Could not find your email.'); return; }
    try {
      Alert.alert('Sending Report...', `Sending to ${adminEmail}`);
      await sendDailyReportEmail(adminEmail);
      Alert.alert('Success', `Daily Report sent to ${adminEmail}!`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDownloadExcel = async () => {
    const adminEmail = user?.email;
    if (!adminEmail) { Alert.alert('Error', 'Could not find your email address.'); return; }

    try {
      Alert.alert('Generating Excel...', 'Fetching samples for export...');
      const allSamples = await getSamples();
      
      let csvContent = "Sample Name,Style Number,Brand,Status,Current Holder,Department,Created Date\n";
      
      allSamples.forEach((s: any) => {
        const dateStr = s.created_at ? new Date(s.created_at).toLocaleDateString() : '';
        const name = `"${s.sample_name || ''}"`;
        const style = `"${s.style_number || ''}"`;
        const brand = `"${s.developed_for || ''}"`;
        const status = `"${s.status || ''}"`;
        const holder = `"${s.current_holder_name || ''}"`;
        const dept = `"${s.current_department || ''}"`;
        const date = `"${dateStr}"`;
        
        csvContent += `${name},${style},${brand},${status},${holder},${dept},${date}\n`;
      });

      await sendExcelReportEmail(adminEmail, csvContent);
      Alert.alert('Success ✅', `Excel report has been sent to ${adminEmail}!`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to email report: ' + err.message);
    }
  };

  if (loading) {
    return <View style={styles.loaderContainer}><ActivityIndicator size="large" color={COLORS.copper} /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.copper]} />}
      >

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.employee_name || 'Admin'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
                <Feather name="bell" size={18} color="rgba(255,255,255,0.9)" />
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
            <Text style={styles.roleBadgeText}>{user?.role} • {user?.department}</Text>
          </View>
        </View>

        {/* Overview Strip */}
        <View style={styles.overviewRow}>
          <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('Samples')} activeOpacity={0.7}>
            <View style={[styles.statIcon, { backgroundColor: '#e8e0f5' }]}>
              <Feather name="box" size={16} color={COLORS.denim} />
            </View>
            <Text style={styles.statValue}>{stats?.totalSamples || 0}</Text>
            <Text style={styles.statLabel}>Samples</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('Employees')} activeOpacity={0.7}>
            <View style={[styles.statIcon, { backgroundColor: '#e6f5ec' }]}>
              <Feather name="users" size={16} color={COLORS.verified} />
            </View>
            <Text style={styles.statValue}>{stats?.totalEmployees || 0}</Text>
            <Text style={styles.statLabel}>Employees</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('Tracking')} activeOpacity={0.7}>
            <View style={[styles.statIcon, { backgroundColor: '#fdf6e3' }]}>
              <Feather name="repeat" size={16} color={COLORS.stitch} />
            </View>
            <Text style={styles.statValue}>{stats?.inTransit || 0}</Text>
            <Text style={styles.statLabel}>In Transit</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('Tracking')} activeOpacity={0.7}>
            <View style={[styles.statIcon, { backgroundColor: '#fce8d5' }]}>
              <Feather name="clock" size={16} color={COLORS.copper} />
            </View>
            <Text style={styles.statValue}>{stats?.pendingQA || 0}</Text>
            <Text style={styles.statLabel}>QA</Text>
          </TouchableOpacity>
        </View>

        {/* Reports Section */}
        <View style={styles.reportsContainer}>
          <TouchableOpacity style={styles.reportBtn} onPress={handleSendReport} activeOpacity={0.8}>
            <View style={styles.emailReportIcon}>
              <Feather name="mail" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emailReportTitle}>Email Report</Text>
              <Text style={styles.emailReportSub}>Send via email</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.reportBtn, { marginLeft: 10 }]} onPress={handleDownloadExcel} activeOpacity={0.8}>
            <View style={[styles.emailReportIcon, { backgroundColor: COLORS.verified }]}>
              <Feather name="download" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emailReportTitle}>Email Excel</Text>
              <Text style={styles.emailReportSub}>Send via email</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Samples')}>
            <View style={[styles.actionIcon, { backgroundColor: COLORS.sand }]}>
              <Feather name="plus-circle" size={22} color={COLORS.denim} />
            </View>
            <Text style={styles.actionText}>New Sample</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Employees')}>
            <View style={[styles.actionIcon, { backgroundColor: COLORS.sand }]}>
              <Feather name="user-plus" size={22} color={COLORS.denim} />
            </View>
            <Text style={styles.actionText}>Add Staff</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Transfers')}>
            <View style={[styles.actionIcon, { backgroundColor: '#fce8d5' }]}>
              <Feather name="send" size={22} color={COLORS.copper} />
            </View>
            <Text style={styles.actionText}>Handover</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Tracking')}>
            <View style={[styles.actionIcon, { backgroundColor: '#fdf6e3' }]}>
              <Feather name="map-pin" size={22} color={COLORS.stitch} />
            </View>
            <Text style={styles.actionText}>Track</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Samples */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Samples</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tracking')}>
            <Text style={styles.viewAll}>View All ({stats?.totalSamples || 0}) →</Text>
          </TouchableOpacity>
        </View>

        {recentSamples.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.sampleCard}
            onPress={() => navigation.navigate('Timeline', { sampleId: item.id, sampleName: item.sample_name, sampleDetails: item })}
            activeOpacity={0.7}
          >
            <View style={styles.sampleTop}>
              <View style={styles.sampleIconBox}>
                <MaterialCommunityIcons name="tshirt-crew" size={18} color={COLORS.copper} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sampleName}>{item.sample_name}</Text>
                <Text style={styles.sampleSub}>{item.style_number} • {item.developed_for}</Text>
              </View>
              <View style={[styles.statusPill, getStatusBg(item.status)]}>
                <Text style={[styles.statusPillText, getStatusFg(item.status)]}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.holderRow}>
              <View style={styles.holderCol}>
                <Text style={styles.holderLabel}>HOLDER</Text>
                <Text style={styles.holderValue}>{item.current_holder_name || 'Unassigned'}</Text>
              </View>
              <View style={styles.colDivider} />
              <View style={styles.holderCol}>
                <Text style={styles.holderLabel}>DEPARTMENT</Text>
                <Text style={styles.holderValue}>{item.current_department || '—'}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.border} />
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStatusBg(s: string) {
  if (s === 'In Production') return { backgroundColor: '#dbeafe' };
  if (s === 'QA Pending') return { backgroundColor: COLORS.pendingBg };
  if (s === 'Approved') return { backgroundColor: COLORS.verifiedBg };
  if (s === 'Dispatched') return { backgroundColor: '#f3e8ff' };
  return { backgroundColor: COLORS.sand };
}
function getStatusFg(s: string) {
  if (s === 'In Production') return { color: '#1d4ed8' };
  if (s === 'QA Pending') return { color: '#92400e' };
  if (s === 'Approved') return { color: COLORS.verified };
  if (s === 'Dispatched') return { color: '#7e22ce' };
  return { color: COLORS.muted };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.cream },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.cream },
  container: { flex: 1 },

  // Header
  header: {
    backgroundColor: COLORS.indigo, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeText: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  userName: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 2 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 6, marginTop: 8, alignSelf: 'flex-start',
  },
  roleBadgeText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)'  },
  notifBtn: {
    padding: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  badge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: COLORS.rejected, width: 14, height: 14,
    borderRadius: 7, justifyContent: 'center', alignItems: 'center'
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  logoutBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Overview
  overviewRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.warmWhite, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 4,
    marginHorizontal: 20, marginTop: -14,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.dark, marginTop: 6 },
  statLabel: { fontSize: 9, fontWeight: '600', color: COLORS.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 40, backgroundColor: COLORS.divider },

  // Reports Section
  reportsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20, marginTop: 24,
  },
  reportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef3f7',
    padding: 12, borderRadius: 16,
    borderWidth: 1, borderColor: '#dce6ef',
  },
  emailReportIcon: {
    backgroundColor: COLORS.denim, width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  emailReportTitle: { fontSize: 13, fontWeight: '700', color: COLORS.dark },
  emailReportSub: { fontSize: 10, color: COLORS.muted, marginTop: 2 },

  // Quick Actions
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark, marginBottom: 12, marginTop: 4, paddingHorizontal: 20 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 20 },
  actionItem: { alignItems: 'center', width: '23%' },
  actionIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionText: { fontSize: 11, fontWeight: '600', color: COLORS.dark, textAlign: 'center' },

  // Section Header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 },
  viewAll: { fontSize: 13, color: COLORS.copper, fontWeight: '600' },

  // Sample Cards
  sampleCard: {
    backgroundColor: COLORS.warmWhite, borderRadius: 14, padding: 14, marginBottom: 10, marginHorizontal: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sampleTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sampleIconBox: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fce8d5',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  sampleName: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  sampleSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  holderRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cream,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: COLORS.divider,
  },
  holderCol: { flex: 1 },
  colDivider: { width: 1, height: 28, backgroundColor: COLORS.border, marginHorizontal: 10 },
  holderLabel: { fontSize: 9, fontWeight: '700', color: COLORS.muted, letterSpacing: 0.8, marginBottom: 3 },
  holderValue: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
});
