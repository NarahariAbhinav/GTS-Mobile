import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, getMySamples } from '../utils/api';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

export default function EmployeeMasterScreen() {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ employee_name: '', department: '', designation: '', phone_number: '', email: '', password: '', email_report_enabled: false, role: 'Employee' });
  const [employeeSamples, setEmployeeSamples] = useState<any[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [showAllSamples, setShowAllSamples] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchEmployees = async () => {
    try { const data = await getEmployees(); setEmployees(data); applyFilters('', 'All', data); }
    catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchEmployees(); }, []));

  const applyFilters = (text: string, filter: string, source?: any[]) => {
    let result = source || employees;
    if (filter !== 'All') {
      result = result.filter((i: any) => i.department === filter);
    }
    if (text) {
      const q = text.toLowerCase();
      result = result.filter((i: any) => (i.employee_name || '').toString().toLowerCase().includes(q) || (i.department || '').toString().toLowerCase().includes(q));
    }
    setFiltered(result);
  };

  const handleSearch = (text: string) => { setSearchQuery(text); applyFilters(text, activeFilter); };
  const handleFilter = (filter: string) => { setActiveFilter(filter); applyFilters(searchQuery, filter); };

  const departments = ['All', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))];

  const openAdd = () => { setEditItem(null); setEmployeeSamples([]); setForm({ employee_name: '', department: '', designation: '', phone_number: '', email: '', password: '', email_report_enabled: false, role: 'Employee' }); setModalVisible(true); };
  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ 
      employee_name: item.employee_name, 
      email: item.email, 
      password: '',
      department: item.department || '',
      designation: item.designation || '',
      phone_number: item.phone_number || '',
      email_report_enabled: item.email_report_enabled || false,
      role: item.role || 'Employee'
    });
    setEmployeeSamples([]);
    setShowAllSamples(false);
    setSamplesLoading(true);
    setModalVisible(true);
    // Fetch samples
    getMySamples(item.id)
      .then(res => setEmployeeSamples(res))
      .catch(err => console.error(err))
      .finally(() => setSamplesLoading(false));
  };

  const handleSave = async () => {
    if (!form.employee_name || !form.department) return;
    if (!editItem && !form.email) {
      alert('Email is required to create a login account.');
      return;
    }
    setSaving(true);
    try {
      if (editItem) { await updateEmployee(editItem.id, form); }
      else { await addEmployee({ ...form, password: form.password || '1234' }); }
      setModalVisible(false);
      fetchEmployees();
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Failed to save employee.';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: any) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete "${item.employee_name}"?\n\nThis will also remove their login account permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteEmployee(item.id);
              setModalVisible(false);
              fetchEmployees();
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'Failed to delete employee.');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item, index }: any) => (
    <TouchableOpacity style={styles.row} onPress={() => openEdit(item)} activeOpacity={0.6}>
      <Text style={styles.rowNum}>{index + 1}</Text>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{item.employee_name}</Text>
        <Text style={styles.rowSub}>{item.designation || '—'}</Text>
      </View>
      <View style={styles.rowMid}>
        <Text style={styles.rowDept}>{item.department}</Text>
      </View>
      <View style={styles.rolePill}>
        <Text style={styles.rolePillText}>{item.role || 'Employee'}</Text>
      </View>
      <Feather name="edit-2" size={14} color={COLORS.denimDark} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Employees</Text>
          <Text style={styles.pageSubtitle}>{filtered.length} team members</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={COLORS.placeholder} />
        <TextInput style={styles.searchInput} placeholder="Search by name or department..." value={searchQuery} onChangeText={handleSearch} placeholderTextColor={COLORS.placeholder} />
        {searchQuery ? (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Feather name="x-circle" size={16} color={COLORS.placeholder} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.searchDivider} />
        <TouchableOpacity onPress={() => setFilterModalVisible(true)}>
          <Feather name="filter" size={16} color={activeFilter !== 'All' ? COLORS.denimDark : COLORS.placeholder} />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.copper} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderItem}
          ListHeaderComponent={
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { width: 28 }]}>#</Text>
              <Text style={[styles.thText, { flex: 1.3 }]}>Name</Text>
              <Text style={[styles.thText, { flex: 0.8 }]}>Dept</Text>
              <Text style={[styles.thText, { width: 60 }]}>Role</Text>
              <View style={{ width: 14 }} />
            </View>
          }
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.emptyState}><Feather name="inbox" size={36} color={COLORS.border} /><Text style={styles.emptyText}>No employees found</Text></View>}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editItem ? 'Edit Employee' : 'New Employee'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Feather name="x" size={22} color={COLORS.muted} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput style={styles.input} value={form.employee_name} onChangeText={(t) => setForm({ ...form, employee_name: t })} placeholder="e.g. Rahul" placeholderTextColor={COLORS.placeholder} />
                <Text style={styles.fieldLabel}>Department</Text>
                <TextInput style={styles.input} value={form.department} onChangeText={(t) => setForm({ ...form, department: t })} placeholder="e.g. Production" placeholderTextColor={COLORS.placeholder} />
                <Text style={styles.fieldLabel}>Designation</Text>
                <TextInput style={styles.input} value={form.designation} onChangeText={(t) => setForm({ ...form, designation: t })} placeholder="e.g. Floor Supervisor" placeholderTextColor={COLORS.placeholder} />
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput style={styles.input} value={form.phone_number} onChangeText={(t) => setForm({ ...form, phone_number: t })} placeholder="e.g. 9876543210" placeholderTextColor={COLORS.placeholder} keyboardType="phone-pad" />
                
                {/* Employee Samples Tracking feature */}
                {editItem && (
                  <View style={styles.samplesBox}>
                    <View style={styles.samplesBoxHeader}>
                      <Feather name="box" size={16} color={COLORS.denimDark} />
                      <Text style={styles.samplesBoxTitle}>Holding {employeeSamples.length} Sample(s)</Text>
                    </View>
                    {samplesLoading ? <ActivityIndicator color={COLORS.copper} style={{ marginVertical: 10 }} /> : (
                       (showAllSamples ? employeeSamples : employeeSamples.slice(0, 3)).map(s => (
                         <View key={s.id} style={styles.sampleItem}>
                           <View style={{ flex: 1 }}>
                             <Text style={styles.sampleItemName}>{s.sample_name}</Text>
                             <Text style={styles.sampleItemSub}>{s.style_number} • {s.developed_for || 'No Brand'}</Text>
                           </View>
                           <View style={styles.sampleItemStatus}>
                             <Text style={styles.sampleItemStatusText}>{s.status}</Text>
                           </View>
                         </View>
                       ))
                    )}
                    {!samplesLoading && employeeSamples.length > 3 && (
                      <TouchableOpacity onPress={() => setShowAllSamples(!showAllSamples)} style={{ paddingVertical: 6, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.copper, fontSize: 13, fontWeight: '600' }}>
                          {showAllSamples ? 'Show Less' : `+ ${employeeSamples.length - 3} more`}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {!samplesLoading && employeeSamples.length === 0 && (
                      <Text style={styles.samplesBoxEmpty}>This employee has no samples right now.</Text>
                    )}
                  </View>
                )}

                {/* Email & Password — only shown when ADDING new employee */}
                {!editItem && (
                  <>
                    <Text style={styles.fieldLabel}>Work Email *</Text>
                    <TextInput style={styles.input} value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} placeholder="e.g. rahul@company.com" placeholderTextColor={COLORS.placeholder} autoCapitalize="none" keyboardType="email-address" />
                    <Text style={styles.fieldLabel}>Password (default: 1234)</Text>
                    <TextInput style={styles.input} value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} placeholder="Leave blank for default '1234'" placeholderTextColor={COLORS.placeholder} secureTextEntry />
                    <View style={styles.authNoteBox}>
                      <Feather name="info" size={12} color={COLORS.denim} />
                      <Text style={styles.authNoteText}>A Firebase login account will be automatically created for this employee.</Text>
                    </View>
                  </>
                )}

                <Text style={styles.fieldLabel}>System Role</Text>
                <View style={styles.roleSelector}>
                  <TouchableOpacity 
                    style={[styles.roleOption, form.role === 'Employee' && styles.roleOptionActive]}
                    onPress={() => setForm({ ...form, role: 'Employee' })}
                  >
                    <Text style={[styles.roleOptionText, form.role === 'Employee' && styles.roleOptionTextActive]}>Employee</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.roleOption, form.role === 'Admin' && styles.roleOptionActive]}
                    onPress={() => setForm({ ...form, role: 'Admin' })}
                  >
                    <Text style={[styles.roleOptionText, form.role === 'Admin' && styles.roleOptionTextActive]}>Admin</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Enable Email Reports</Text>
                  <Switch
                    trackColor={{ false: COLORS.divider, true: COLORS.copper }}
                    thumbColor={form.email_report_enabled ? '#fff' : '#f4f3f4'}
                    onValueChange={(val) => setForm({ ...form, email_report_enabled: val })}
                    value={form.email_report_enabled || false}
                  />
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
                    onPress={handleSave} 
                    activeOpacity={0.8}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>{editItem ? 'Update' : 'Save'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {/* Delete button — only visible when editing and user is Admin */}
                {editItem && isAdmin && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => { handleDelete(editItem); }}
                    activeOpacity={0.8}
                  >
                    <Feather name="trash-2" size={16} color="#fff" />
                    <Text style={styles.deleteBtnText}>Delete Employee</Text>
                  </TouchableOpacity>
                )}
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Department</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Feather name="x" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {departments.map((dept: any) => (
                <TouchableOpacity
                  key={dept}
                  style={styles.filterRow}
                  onPress={() => { handleFilter(dept); setFilterModalVisible(false); }}
                >
                  <Text style={[styles.filterRowText, activeFilter === dept && styles.filterRowTextActive]}>{dept}</Text>
                  {activeFilter === dept && <Feather name="check" size={18} color={COLORS.denimDark} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.cream },

  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18, backgroundColor: COLORS.indigo,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  pageSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.copper, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 14, marginBottom: 12,
    backgroundColor: COLORS.warmWhite, borderRadius: 12, paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.dark },
  searchDivider: { width: 1, height: 20, backgroundColor: COLORS.divider, marginHorizontal: 4 },

  tableHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: COLORS.sand, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  thText: { fontSize: 11, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider, backgroundColor: COLORS.warmWhite,
  },
  rowNum: { width: 28, fontSize: 13, fontWeight: '500', color: COLORS.muted },
  rowMain: { flex: 1.3 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  rowSub: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  rowMid: { flex: 0.8 },
  rowDept: { fontSize: 13, fontWeight: '500', color: COLORS.denimDark },
  rolePill: { width: 60, backgroundColor: COLORS.sand, paddingVertical: 3, borderRadius: 4, alignItems: 'center', marginRight: 8 },
  rolePillText: { fontSize: 10, fontWeight: '600', color: COLORS.denimDark },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.muted, marginTop: 10, fontSize: 14 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  modalContent: { backgroundColor: COLORS.warmWhite, padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.cream, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 15, color: COLORS.dark,
  },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, backgroundColor: COLORS.divider, padding: 16, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: COLORS.dark, fontSize: 16, fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: COLORS.copper, padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  roleSelector: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleOption: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.cream },
  roleOptionActive: { borderColor: COLORS.copper, backgroundColor: 'rgba(215, 114, 44, 0.1)' },
  roleOptionText: { fontSize: 14, fontWeight: '600', color: COLORS.muted },
  roleOptionTextActive: { color: COLORS.copper },

  deleteBtn: {
    backgroundColor: '#e53e3e', padding: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 10,
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  deleteBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  filterModalContent: { backgroundColor: COLORS.warmWhite, padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  filterRowText: { fontSize: 16, color: COLORS.dark },
  filterRowTextActive: { fontWeight: '700', color: COLORS.denimDark },

  authNoteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eef3f7', borderWidth: 1, borderColor: COLORS.divider,
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  authNoteText: { flex: 1, fontSize: 11, color: COLORS.muted, lineHeight: 16 },

  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.dark },

  samplesBox: {
    backgroundColor: COLORS.cream,
    borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.divider,
  },
  samplesBoxHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  samplesBoxTitle: { fontSize: 14, fontWeight: '700', color: COLORS.denimDark },
  sampleItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sampleItemName: { fontSize: 13, fontWeight: '700', color: COLORS.dark },
  sampleItemSub: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  sampleItemStatus: { backgroundColor: '#eef3f7', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  sampleItemStatusText: { fontSize: 9, fontWeight: '700', color: COLORS.denimDark },
  samplesBoxEmpty: { fontSize: 12, color: COLORS.muted, fontStyle: 'italic', textAlign: 'center', marginVertical: 8 },
});
