import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, FlatList, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSamples, getEmployees, transferSample } from '../utils/api';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

export default function HandoverScreen({ route, navigation }: any) {
  const [samples, setSamples] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [toEmployee, setToEmployee] = useState<any>(null);
  const [department, setDepartment] = useState('');
  const [remarks, setRemarks] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectionType, setSelectionType] = useState<'sample' | 'employee'>('sample');
  const [modalSearch, setModalSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [samplesData, employeesData] = await Promise.all([getSamples(), getEmployees()]);
      setSamples(samplesData);
      setEmployees(employeesData);
      if (route?.params?.prefilledSampleId && !selectedSample) {
        const found = samplesData.find((s: any) => s.id === route.params.prefilledSampleId);
        if (found) setSelectedSample(found);
      }
    } catch (error) { console.error(error); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [route?.params?.prefilledSampleId]));

  const handleSelect = (item: any) => {
    if (selectionType === 'sample') { setSelectedSample(item); }
    else { setToEmployee(item); setDepartment(item.department); }
    setModalVisible(false);
    setModalSearch('');
  };

  const handleTransfer = async () => {
    if (!selectedSample || !toEmployee || !department) {
      Alert.alert('Missing Fields', 'Please select a sample and an employee.');
      return;
    }
    setLoading(true);
    try {
      await transferSample({
        sample_id: selectedSample.id,
        from_employee_id: selectedSample.current_holder_id,
        to_employee_id: toEmployee.id,
        department, remarks
      });
      Alert.alert('Transfer Initiated', `${selectedSample.sample_name} sent to ${toEmployee.employee_name}. Awaiting acceptance.`, [
        { text: 'OK', onPress: () => {
          setSelectedSample(null); setToEmployee(null); setDepartment(''); setRemarks('');
          if (navigation.canGoBack()) navigation.goBack();
        }}
      ]);
    } catch (error) { Alert.alert('Error', 'Failed to transfer sample'); }
    finally { setLoading(false); }
  };

  const getFilteredModalData = () => {
    const source: any[] = selectionType === 'sample' ? samples : employees;
    if (!modalSearch) return source;
    const q = modalSearch.toLowerCase();
    if (selectionType === 'sample') {
      return source.filter((i: any) => i.sample_name.toLowerCase().includes(q) || i.style_number.toLowerCase().includes(q));
    } else {
      return source.filter((i: any) => i.employee_name.toLowerCase().includes(q) || i.department.toLowerCase().includes(q));
    }
  };

  const renderModalItem = ({ item }: any) => (
    <TouchableOpacity style={styles.modalItem} onPress={() => handleSelect(item)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.modalItemName}>{selectionType === 'sample' ? item.sample_name : item.employee_name}</Text>
        <Text style={styles.modalItemSub}>
          {selectionType === 'sample' ? `${item.style_number}  •  ${item.developed_for}` : `${item.department}  •  ${item.designation || ''}`}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={COLORS.border} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Sample Handover</Text>
        <Text style={styles.pageSubtitle}>Transfer garment samples between employees</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.labelRowWithAction}>
            <View style={styles.labelRow}>
              <Feather name="box" size={14} color={COLORS.copper} />
              <Text style={styles.fieldLabel}>Select Sample</Text>
            </View>
            <TouchableOpacity 
              style={styles.scanBtnSmall} 
              onPress={() => navigation.navigate('BarcodeScanner', { samples, returnScreen: 'Handover' })}
            >
              <Feather name="maximize" size={12} color="#fff" />
              <Text style={styles.scanBtnTextSmall}>Scan</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.selector} onPress={() => { setSelectionType('sample'); setModalSearch(''); setModalVisible(true); }}>
            <Text style={selectedSample ? styles.selectorText : styles.selectorPlaceholder}>
              {selectedSample ? selectedSample.sample_name : 'Tap to search & select sample...'}
            </Text>
            <Feather name="search" size={16} color={COLORS.placeholder} />
          </TouchableOpacity>

          {selectedSample && (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>CURRENT HOLDER</Text>
              <Text style={styles.infoValue}>
                {selectedSample.current_holder_name || 'Unassigned'}
                {selectedSample.current_department ? `  •  ${selectedSample.current_department}` : ''}
              </Text>
            </View>
          )}

          <View style={styles.labelRow}>
            <Feather name="user" size={14} color={COLORS.denimDark} />
            <Text style={styles.fieldLabel}>Transfer To</Text>
          </View>
          <TouchableOpacity style={styles.selector} onPress={() => { setSelectionType('employee'); setModalSearch(''); setModalVisible(true); }}>
            <Text style={toEmployee ? styles.selectorText : styles.selectorPlaceholder}>
              {toEmployee ? toEmployee.employee_name : 'Tap to search & select employee...'}
            </Text>
            <Feather name="search" size={16} color={COLORS.placeholder} />
          </TouchableOpacity>

          <View style={styles.labelRow}>
            <Feather name="briefcase" size={14} color={COLORS.muted} />
            <Text style={styles.fieldLabel}>Department (Auto-filled)</Text>
          </View>
          <View style={styles.disabledInput}><Text style={styles.disabledText}>{department || 'Fills automatically'}</Text></View>

          <View style={styles.labelRow}>
            <Feather name="message-square" size={14} color={COLORS.muted} />
            <Text style={styles.fieldLabel}>Remarks (Optional)</Text>
          </View>
          <TextInput style={styles.input} value={remarks} onChangeText={setRemarks} placeholder="e.g. Sent for quality review" placeholderTextColor={COLORS.placeholder} multiline />

          <TouchableOpacity
            style={[styles.transferBtn, (!selectedSample || !toEmployee || loading) && styles.transferBtnDisabled]}
            onPress={handleTransfer} disabled={!selectedSample || !toEmployee || loading} activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="send" size={18} color="#fff" />}
            <Text style={styles.transferBtnText}>{loading ? 'Transferring...' : 'Complete Transfer'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select {selectionType === 'sample' ? 'Sample' : 'Employee'}</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); setModalSearch(''); }}>
                  <Feather name="x" size={22} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalSearchBar}>
                <Feather name="search" size={16} color={COLORS.placeholder} />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder={selectionType === 'sample' ? 'Type sample name or style...' : 'Type employee name or dept...'}
                  value={modalSearch} onChangeText={setModalSearch}
                  placeholderTextColor={COLORS.placeholder} autoFocus={true}
                />
                {modalSearch ? <TouchableOpacity onPress={() => setModalSearch('')}><Feather name="x-circle" size={16} color={COLORS.placeholder} /></TouchableOpacity> : null}
              </View>
              <Text style={styles.resultCount}>{getFilteredModalData().length} results</Text>
              <FlatList
                data={getFilteredModalData()}
                keyExtractor={(item: any) => item.id.toString()}
                renderItem={renderModalItem}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptyState}><Feather name="inbox" size={28} color={COLORS.border} /><Text style={styles.emptyText}>No matches found</Text></View>
                }
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.cream },

  pageHeader: {
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18,
    backgroundColor: COLORS.indigo,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  pageSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  formContainer: { padding: 20, paddingBottom: 100 },

  labelRowWithAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  scanBtnSmall: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.copper, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  scanBtnTextSmall: { fontSize: 11, fontWeight: '600', color: '#fff' },

  selector: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 14, marginBottom: 20,
    shadowColor: COLORS.denim, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  selectorText: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  selectorPlaceholder: { fontSize: 14, color: COLORS.placeholder },

  infoBox: {
    backgroundColor: '#Eaf1f6', borderRadius: 10, padding: 14, marginBottom: 24, marginTop: -8,
    borderLeftWidth: 3, borderLeftColor: COLORS.denimDark,
  },
  infoLabel: { fontSize: 10, fontWeight: '700', color: COLORS.denimDark, letterSpacing: 0.8, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.dark },

  disabledInput: {
    backgroundColor: COLORS.divider, borderRadius: 12, padding: 14, marginBottom: 20,
  },
  disabledText: { fontSize: 14, color: COLORS.muted, fontWeight: '500' },

  input: {
    backgroundColor: COLORS.warmWhite, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 15, color: COLORS.dark, minHeight: 48,
  },

  transferBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.copper, padding: 16, borderRadius: 12,
  },
  transferBtnDisabled: { backgroundColor: COLORS.placeholder },
  transferBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  modalContent: {
    backgroundColor: COLORS.warmWhite, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },

  modalSearchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.cream, borderRadius: 12,
    paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: COLORS.border, gap: 8, marginBottom: 8,
  },
  modalSearchInput: { flex: 1, fontSize: 14, color: COLORS.dark },

  resultCount: { fontSize: 11, color: COLORS.muted, fontWeight: '500', marginBottom: 8, marginLeft: 4 },

  modalItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  modalItemName: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  modalItemSub: { fontSize: 12, color: COLORS.muted, marginTop: 3 },

  emptyState: { alignItems: 'center', padding: 30 },
  emptyText: { color: COLORS.muted, marginTop: 8, fontSize: 13 },
});
