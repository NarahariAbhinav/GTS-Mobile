import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchNotifications();
    }, [user?.id])
  );

  const handleNotificationPress = async (item: any) => {
    if (!item.read) {
      try {
        await markNotificationRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
        );
      } catch (err) {
        console.error(err);
      }
    }
    
    // Navigate based on type
    if (item.type === 'handover_pending') {
      navigation.navigate('MySamples', { screen: 'Pending' });
    } else {
      navigation.navigate('Tracking');
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await markAllNotificationsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const renderItem = ({ item }: any) => {
    let icon = 'info';
    let iconColor = COLORS.denim;
    if (item.type === 'handover_pending') { icon = 'inbox'; iconColor = COLORS.copper; }
    if (item.type === 'handover_accepted') { icon = 'check-circle'; iconColor = COLORS.verified; }
    if (item.type === 'handover_rejected') { icon = 'x-circle'; iconColor = COLORS.rejected; }

    return (
      <TouchableOpacity 
        style={[styles.notificationCard, !item.read && styles.unreadCard]} 
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconBox, { backgroundColor: iconColor + '20' }]}>
          <Feather name={icon as any} size={20} color={iconColor} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.title, !item.read && styles.unreadText]}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.time}>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={COLORS.denimDark} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Notifications</Text>
        <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllRead}>
          <Feather name="check-circle" size={18} color={COLORS.denim} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.copper} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="bell-off" size={40} color={COLORS.border} />
              <Text style={styles.emptyText}>No notifications yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.cream },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  backBtn: { padding: 5 },
  pageTitle: { fontSize: 18, fontWeight: '700', color: COLORS.denimDark },
  markReadBtn: { padding: 5 },
  listContainer: { padding: 20 },
  notificationCard: {
    flexDirection: 'row', backgroundColor: '#fff', padding: 15,
    borderRadius: 12, marginBottom: 12, alignItems: 'flex-start',
    borderWidth: 1, borderColor: COLORS.border,
  },
  unreadCard: {
    backgroundColor: '#f8fafe', borderColor: '#d1def0',
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 15,
  },
  cardContent: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: COLORS.body, marginBottom: 4 },
  unreadText: { color: COLORS.denimDark, fontWeight: '700' },
  message: { fontSize: 13, color: COLORS.muted, lineHeight: 18, marginBottom: 6 },
  time: { fontSize: 11, color: COLORS.placeholder },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.denim,
    marginTop: 5, marginLeft: 10
  },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: COLORS.muted, marginTop: 15, fontSize: 15 },
});
