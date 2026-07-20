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
  const [selectedSamples, setSelectedSamples] = useState<any[]>([]);
  const [toEmployee, setToEmployee] = useState<any>(null);
  const [department, setDepartment] = useState('');
  const [remarks, setRemarks] = useState('');
  
  const [isExternal, setIsExternal] = useState(false);
  const [externalVendor, setExternalVendor] = useState('');
  const [courierName, setCourierName] = useState('');
  const [awbNumber, setAwbNumber] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectionType, setSelectionType] = useState<'sample' | 'employee'>('sample');
  const [modalSearch, setModalSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [samplesData, employeesData] = await Promise.all([getSamples(), getEmployees()]);
      setSamples(samplesData);
      setEmployees(employeesData);
      
      const prefilledIds = route?.params?.prefilledSampleIds;
      if (prefilledIds && prefilledIds.length > 0) {
        const found = samplesData.filter((s: any) => prefilledIds.includes(s.id));
        if (found.length > 0) {
          setSelectedSamples(prev => {
            const map = new Map(prev.map(p => [p.id, p]));
            found.forEach((f: any) => map.set(f.id, f));
            return Array.from(map.values());
          });
        }
      }
    } catch (error) { console.error(error); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [route?.params?.prefilledSampleIds]));

  const handleSelect = (item: any) => {
    if (selectionType === 'sample') {
      setSelectedSamples(prev => {
        const exists = prev.find(s => s.id === item.id);
        if (exists) return prev.filter(s => s.id !== item.id);
        return [...prev, item];
      });
    } else {
      setToEmployee(item);
      setDepartment(item.department);
      setModalVisible(false);
      setModalSearch('');
    }
  };

  const removeSample = (id: string) => {
    setSelectedSamples(prev => prev.filter(s => s.id !== id));
  };

  const handleTransfer = async () => {
    if (selectedSamples.length === 0) {
      Alert.alert('Missing Fields', 'Please select at least one sample.');
      return;
    }
    
    if (!isExternal && (!toEmployee || !department)) {
      Alert.alert('Missing Fields', 'Please select a receiving employee.');
      return;
    }
    
    if (isExternal && (!externalVendor || !courierName)) {
      Alert.alert('Missing Fields', 'Please enter Vendor and Courier names.');
      return;
    }
    
    setLoading(true);
    try {
      const from_employee_id = selectedSamples[0].current_holder_id;
      
      const payload = {
        sample_ids: selectedSamples.map(s => s.id),
        from_employee_id,
        to_employee_id: toEmployee?.id,
        department, 
        remarks,
        is_external: isExternal,
        external_vendor: externalVendor,
        courier_name: courierName,
        awb_number: awbNumber
      };
      
      const res = await transferSample(payload);
      
      Alert.alert('Transfer Initiated', res.message || 'Samples transferred successfully.', [
        { text: 'OK', onPress: () => {
          setSelectedSamples([]); setToEmployee(null); setDepartment(''); setRemarks('');
          setExternalVendor(''); setCourierName(''); setAwbNumber('');
          if (navigation.canGoBack()) navigation.goBack();
        }}
      ]);
    } catch (error: any) { 
        Alert.alert('Error', error?.response?.data?.error || 'Failed to transfer sample'); 
    }
    finally { setLoading(false); }
  };

  const getFilteredModalData = () => {
    const source: any[] = selectionType === 'sample' ? samples : employees;
    if (!modalSearch) return source;
    const q = modalSearch.toLowerCase();
    if (selectionType === 'sample') {
      return source.filter((i: any) => (i.sample_name || '').toString().toLowerCase().includes(q) || (i.style_number || '').toString().toLowerCase().includes(q));
    } else {
      return source.filter((i: any) => (i.employee_name || '').toString().toLowerCase().includes(q) || (i.department || '').toString().toLowerCase().includes(q));
    }
  };

  const renderModalItem = ({ item }: any) => {
    const isSelected = selectionType === 'sample' && selectedSamples.some(s => s.id === item.id);
    return (
      <TouchableOpacity style={[styles.modalItem, isSelected && styles.modalItemSelected]} onPress={() => handleSelect(item)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalItemName}>{selectionType === 'sample' ? item.sample_name : item.employee_name}</Text>
          <Text style={styles.modalItemSub}>
            {selectionType === 'sample' ? `${item.style_number}  •  ${item.developed_for}` : `${item.department}  •  ${item.designation || ''}`}
          </Text>
        </View>
        {isSelected ? (
            <Feather name="check-circle" size={18} color={COLORS.copper} />
        ) : (
            <Feather name={selectionType === 'sample' ? "circle" : "chevron-right"} size={16} color={COLORS.border} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Sample Handover</Text>
        <Text style={styles.pageSubtitle}>Transfer or dispatch garment samples</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.tabContainer}>
              <TouchableOpacity style={[styles.tab, !isExternal && styles.tabActive]} onPress={() => setIsExternal(false)}>
                  <Text style={[styles.tabText, !isExternal && styles.tabTextActive]}>Internal Transfer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, isExternal && styles.tabActive]} onPress={() => setIsExternal(true)}>
                  <Text style={[styles.tabText, isExternal && styles.tabTextActive]}>External Dispatch</Text>
              </TouchableOpacity>
          </View>

          <View style={styles.labelRowWithAction}>
            <View style={styles.labelRow}>
              <Feather name="box" size={14} color={COLORS.copper} />
              <Text style={styles.fieldLabel}>Selected Samples ({selectedSamples.length})</Text>
            </View>
            <TouchableOpacity 
              style={styles.scanBtnSmall} 
              onPress={() => navigation.navigate('BarcodeScanner', { samples, returnScreen: 'Handover', batchMode: true })}
            >
              <Feather name="maximize" size={12} color="#fff" />
              <Text style={styles.scanBtnTextSmall}>Batch Scan</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.selector} onPress={() => { setSelectionType('sample'); setModalSearch(''); setModalVisible(true); }}>
            <Text style={styles.selectorPlaceholder}>
              Tap to search & add samples...
            </Text>
            <Feather name="search" size={16} color={COLORS.placeholder} />
          </TouchableOpacity>

          {selectedSamples.length > 0 && (
            <View style={styles.selectedSamplesList}>
                {selectedSamples.map(s => (
                    <View key={s.id} style={styles.sampleChip}>
                        <Text style={styles.sampleChipText}>{s.sample_name} ({s.style_number})</Text>
                        <TouchableOpacity onPress={() => removeSample(s.id)}>
                            <Feather name="x" size={14} color={COLORS.denimDark} />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
          )}

          {!isExternal ? (
              <>
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
              </>
          ) : (
              <>
                <View style={styles.labelRow}>
                    <Feather name="truck" size={14} color={COLORS.denimDark} />
                    <Text style={styles.fieldLabel}>Vendor / Destination Name</Text>
                </View>
                <TextInput style={styles.input} value={externalVendor} onChangeText={setExternalVendor} placeholder="e.g. ABC Wash House" placeholderTextColor={COLORS.placeholder} />

                <View style={styles.labelRow}>
                    <Feather name="package" size={14} color={COLORS.muted} />
                    <Text style={styles.fieldLabel}>Courier / Person Name</Text>
                </View>
                <TextInput style={styles.input} value={courierName} onChangeText={setCourierName} placeholder="e.g. DHL, FedEx, or John Doe" placeholderTextColor={COLORS.placeholder} />

                <View style={styles.labelRow}>
                    <Feather name="hash" size={14} color={COLORS.muted} />
                    <Text style={styles.fieldLabel}>AWB / Tracking No (Optional)</Text>
                </View>
                <TextInput style={styles.input} value={awbNumber} onChangeText={setAwbNumber} placeholder="e.g. 1234567890" placeholderTextColor={COLORS.placeholder} />
              </>
          )}

          <View style={styles.labelRow}>
            <Feather name="message-square" size={14} color={COLORS.muted} />
            <Text style={styles.fieldLabel}>Remarks (Optional)</Text>
          </View>
          <TextInput style={styles.input} value={remarks} onChangeText={setRemarks} placeholder="e.g. Sent for quality review" placeholderTextColor={COLORS.placeholder} multiline />

          <TouchableOpacity
            style={[styles.transferBtn, (selectedSamples.length === 0 || loading) && styles.transferBtnDisabled]}
            onPress={handleTransfer} disabled={selectedSamples.length === 0 || loading} activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="send" size={18} color="#fff" />}
            <Text style={styles.transferBtnText}>{loading ? 'Transferring...' : (isExternal ? 'Dispatch External' : 'Complete Transfer')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select {selectionType === 'sample' ? 'Samples' : 'Employee'}</Text>
                <TouchableOpacity onPress={() => { setModalVisible(false); setModalSearch(''); }}>
                  {selectionType === 'sample' ? (
                      <Text style={{color: COLORS.copper, fontWeight: '600'}}>Done</Text>
                  ) : (
                      <Feather name="x" size={22} color={COLORS.muted} />
                  )}
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
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#Eaf1f6', borderRadius: 10, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: {width:0,height:1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  tabTextActive: { color: COLORS.denimDark },

  labelRowWithAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
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
    borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: COLORS.denim, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  selectorText: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  selectorPlaceholder: { fontSize: 14, color: COLORS.placeholder },
  
  selectedSamplesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  sampleChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#Eaf1f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 8 },
  sampleChipText: { fontSize: 13, fontWeight: '600', color: COLORS.denimDark },

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
    backgroundColor: COLORS.copper, padding: 16, borderRadius: 12, marginTop: 10
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
  modalItemSelected: { backgroundColor: '#e0e7ff' },
  modalItemName: { fontSize: 15, fontWeight: '600', color: COLORS.dark },
  modalItemSub: { fontSize: 12, color: COLORS.muted, marginTop: 3 },

  emptyState: { alignItems: 'center', padding: 30 },
  emptyText: { color: COLORS.muted, marginTop: 8, fontSize: 13 },
});
