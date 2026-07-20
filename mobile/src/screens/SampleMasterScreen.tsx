import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { getSamples, getSamplesPaginated, addSample, updateSample, bulkAddSamples } from '../utils/api';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

// ── Barcode helpers ─────────────────────────────────────────────────────────

// Encodes a string into Code128-B bars (returns array of 0/1)
function encodeCode128(text: string): number[] {
  const CODE128_B_START = 104;
  const CODE128_STOP = 106;
  const patterns: Record<number, string> = {
    0:'11011001100',1:'11001101100',2:'11001100110',3:'10010011000',
    4:'10010001100',5:'10001001100',6:'10011001000',7:'10011000100',
    8:'10001100100',9:'11001001000',10:'11001000100',11:'11000100100',
    12:'10110011100',13:'10011011100',14:'10011001110',15:'10111001100',
    16:'10011101100',17:'10011100110',18:'11001110010',19:'11001011100',
    20:'11001001110',21:'11011100100',22:'11001110100',23:'11101101110',
    24:'11101001100',25:'11100101100',26:'11100100110',27:'11101100100',
    28:'11100110100',29:'11100110010',30:'11011011000',31:'11011000110',
    32:'11000110110',33:'10100011000',34:'10001011000',35:'10001000110',
    36:'10110001000',37:'10001101000',38:'10001100010',39:'11010001000',
    40:'11000101000',41:'11000100010',42:'10110111000',43:'10110001110',
    44:'10001101110',45:'10111011000',46:'10111000110',47:'10001110110',
    48:'11101110110',49:'11010001110',50:'11000101110',51:'11011101000',
    52:'11011100010',53:'11011101110',54:'11101011000',55:'11101000110',
    56:'11100010110',57:'11101101000',58:'11101100010',59:'11100011010',
    60:'11101111010',61:'11001000010',62:'11110001010',63:'10100110000',
    64:'10100001100',65:'10010110000',66:'10010000110',67:'10000101100',
    68:'10000100110',69:'10110010000',70:'10110000100',71:'10011010000',
    72:'10011000010',73:'10000110100',74:'10000110010',75:'11000010010',
    76:'11001010000',77:'11110111010',78:'11000010100',79:'10001111010',
    80:'10100111100',81:'10010111100',82:'10010011110',83:'10111100100',
    84:'10011110100',85:'10011110010',86:'11110100100',87:'11110010100',
    88:'11110010010',89:'11011011110',90:'11011110110',91:'11110110110',
    92:'10101111000',93:'10100011110',94:'10001011110',95:'10111101000',
    96:'10111100010',97:'11110101000',98:'11110100010',99:'10111011110',
    100:'10111101110',101:'11101011110',102:'11110101110',
    103:'11010000100',104:'11010010000',105:'11010011100',106:'11000111010',
  };
  const chars = text.split('').map(c => c.charCodeAt(0) - 32);
  let checksum = CODE128_B_START;
  chars.forEach((v, i) => { checksum += v * (i + 1); });
  const sequence = [CODE128_B_START, ...chars, checksum % 103, CODE128_STOP];
  return sequence.flatMap(code =>
    (patterns[code] || '').split('').map(Number)
  );
}

// Returns an SVG XML string for a Code128 barcode
function generateBarcodeSVG(text: string, width = 280, height = 70): string {
  const bars = encodeCode128(text);
  const barWidth = width / bars.length;
  const rects = bars
    .map((on, i) => on ? `<rect x="${(i * barWidth).toFixed(2)}" y="0" width="${barWidth.toFixed(2)}" height="${height}" fill="#000"/>` : '')
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rects}</svg>`;
}

// Returns a full printable HTML page for the label
function buildLabelHTML(sample: any): string {
  const bars = encodeCode128(sample.style_number);
  const totalBars = bars.length;
  const bw = (280 / totalBars).toFixed(2);
  const rectsHtml = bars
    .map((on, i) => on ? `<rect x="${(i * (280 / totalBars)).toFixed(2)}" y="0" width="${bw}" height="70" fill="#000"/>` : '')
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>
    body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff;font-family:Arial,sans-serif;}
    .label{border:2px solid #222;border-radius:10px;padding:20px 24px;width:300px;text-align:center;}
    .brand{font-size:11px;font-weight:700;letter-spacing:2px;color:#555;margin-bottom:8px;text-transform:uppercase;}
    .name{font-size:16px;font-weight:800;color:#111;margin-bottom:4px;}
    .for{font-size:12px;color:#555;margin-bottom:14px;}
    svg{display:block;margin:0 auto 8px;}
    .style{font-size:13px;font-weight:600;letter-spacing:1.5px;color:#333;}
  </style></head><body>
  <div class="label">
    <div class="brand">GTS — Garment Tracker</div>
    <div class="name">${sample.sample_name}</div>
    <div class="for">For: ${sample.developed_for || '—'}</div>
    <svg xmlns="http://www.w3.org/2000/svg" width="280" height="70" viewBox="0 0 280 70">${rectsHtml}</svg>
    <div class="style">${sample.style_number}</div>
  </div></body></html>`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function SampleMasterScreen({ navigation }: any) {
  const [samples, setSamples] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [barcodeModal, setBarcodeModal] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ sample_name: '', style_number: '', developed_for: '' });
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 50;

  const uniqueBrands = Array.from(new Set(samples.map((s: any) => s.developed_for).filter((b: any) => b && b.trim() !== '')));

  const handleImportExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const workbook = xlsxRead(base64, { type: 'base64' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = xlsxUtils.sheet_to_json(sheet);
      if (rows.length === 0) { Alert.alert('Empty File', 'No data rows found in the Excel file.'); return; }
      const samples = rows.map(r => ({
        sample_name: String(r['Sample Name'] || r['sample_name'] || '').trim(),
        style_number: String(r['Style Number'] || r['style_number'] || '').trim(),
        developed_for: String(r['Developed For'] || r['developed_for'] || '').trim(),
      })).filter(s => s.sample_name && s.style_number);
      if (samples.length === 0) { Alert.alert('Invalid Format', 'Columns must be: Sample Name, Style Number, Developed For'); return; }
      Alert.alert(
        'Import Samples',
        `Found ${samples.length} samples. Import them all?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Import', onPress: async () => {
            setImporting(true);
            try {
              const res = await bulkAddSamples(samples);
              fetchSamples();
              Alert.alert('Import Complete', `Imported: ${res.created}\nSkipped (Duplicates): ${res.skipped}`);
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally { setImporting(false); }
          }},
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const fetchSamples = async (query = '', reset = true) => {
    try {
      if (reset) {
        const res = await getSamplesPaginated(PAGE_SIZE, undefined, query);
        setSamples(res.data);
        setHasMore(res.hasMore);
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const lastId = samples[samples.length - 1]?.id;
      const res = await getSamplesPaginated(PAGE_SIZE, lastId, searchQuery);
      const merged = [...samples, ...res.data];
      setSamples(merged);
      setHasMore(res.hasMore);
    } catch (error) { console.error(error); }
    finally { setLoadingMore(false); }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchSamples(searchQuery, true);
  };

  useFocusEffect(useCallback(() => { setLoading(true); setHasMore(true); fetchSamples(searchQuery); }, []));

  // Debounce search
  useEffect(() => {
    const delay = setTimeout(() => {
      setLoading(true);
      fetchSamples(searchQuery, true);
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleSearch = (text: string) => { setSearchQuery(text); };

  const openAdd = () => {
    setEditItem(null);
    setForm({ sample_name: '', style_number: '', developed_for: '' });
    setModalVisible(true);
  };
  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ sample_name: item.sample_name, style_number: item.style_number, developed_for: item.developed_for || '' });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.sample_name.trim() || !form.style_number.trim()) {
      Alert.alert('Missing Fields', 'Sample name and style number are required.');
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await updateSample(editItem.id, form);
        setModalVisible(false);
      } else {
        const result = await addSample(form);
        setModalVisible(false);
        // Show barcode modal for new sample
        setBarcodeModal({ ...form, id: result?.id });
      }
      fetchSamples();
    } catch (error) { console.error(error); }
    finally { setSaving(false); }
  };

  const handlePrintLabel = async (sample: any) => {
    try {
      const html = buildLabelHTML(sample);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      // Android: save directly to chosen folder
      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const pdfBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri, `Label_${sample.style_number}`, 'application/pdf'
          );
          await FileSystem.writeAsStringAsync(newUri, pdfBase64, { encoding: FileSystem.EncodingType.Base64 });
          Alert.alert('Saved! ✅', `Label saved as "Label_${sample.style_number}.pdf"`);
          return;
        }
      }
      // Fallback: share sheet
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkPrint = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Selection', 'Please select at least one sample to print.');
      return;
    }
    try {
      const selectedSamples = samples.filter(s => selectedIds.has(s.id));
      const pagesHtml = selectedSamples.map(sample => {
        const bars = encodeCode128(sample.style_number);
        const totalBars = bars.length;
        const bw = (280 / totalBars).toFixed(2);
        const rectsHtml = bars.map((on, i) => on ? `<rect x="${(i * (280 / totalBars)).toFixed(2)}" y="0" width="${bw}" height="70" fill="#000"/>` : '').join('');
        return `
        <div style="page-break-after: always; display:flex; justify-content:center; align-items:center; height:100vh;">
          <div class="label" style="border:2px solid #222;border-radius:10px;padding:20px 24px;width:300px;text-align:center;">
            <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#555;margin-bottom:8px;text-transform:uppercase;">GTS — Garment Tracker</div>
            <div style="font-size:16px;font-weight:800;color:#111;margin-bottom:4px;">${sample.sample_name}</div>
            <div style="font-size:12px;color:#555;margin-bottom:14px;">For: ${sample.developed_for || '—'}</div>
            <svg xmlns="http://www.w3.org/2000/svg" width="280" height="70" viewBox="0 0 280 70" style="display:block;margin:0 auto 8px;">${rectsHtml}</svg>
            <div style="font-size:13px;font-weight:600;letter-spacing:1.5px;color:#333;">${sample.style_number}</div>
          </div>
        </div>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{margin:0;background:#fff;font-family:Arial,sans-serif;}</style></head><body>${pagesHtml}</body></html>`;
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      
      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const pdfBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          const newUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, `Bulk_Labels_${Date.now()}`, 'application/pdf');
          await FileSystem.writeAsStringAsync(newUri, pdfBase64, { encoding: FileSystem.EncodingType.Base64 });
          Alert.alert('Saved! ✅', 'Bulk labels saved as PDF.');
        } else {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
        }
      } else {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }

      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate bulk PDF.');
    }
  };

  const renderItem = ({ item, index }: any) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity 
        style={[styles.row, isSelected && { backgroundColor: '#eef2ff' }]} 
        onPress={() => selectionMode ? toggleSelection(item.id) : null}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            setSelectedIds(new Set([item.id]));
          }
        }}
        activeOpacity={selectionMode ? 0.7 : 1}
      >
        {selectionMode ? (
          <View style={{ width: 30, alignItems: 'center' }}>
            <Feather name={isSelected ? "check-square" : "square"} size={18} color={isSelected ? COLORS.indigo : COLORS.placeholder} />
          </View>
        ) : (
          <Text style={styles.rowNum}>{index + 1}</Text>
        )}
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle}>{item.sample_name}</Text>
          <Text style={styles.rowSub}>{item.style_number}</Text>
        </View>
        <View style={styles.rowMid}><Text style={styles.rowBrand}>{item.developed_for || '—'}</Text></View>
        {/* Label chip button */}
        <TouchableOpacity style={styles.labelChip} onPress={() => setBarcodeModal(item)}>
          <Feather name="tag" size={12} color={COLORS.denim} />
          <Text style={styles.labelChipText}>Label</Text>
        </TouchableOpacity>
        {/* Edit icon */}
        <TouchableOpacity onPress={() => openEdit(item)} style={{ paddingLeft: 8 }}>
          <Feather name="edit-2" size={14} color={COLORS.muted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {selectionMode ? (
        <View style={[styles.pageHeader, { backgroundColor: COLORS.indigo, paddingBottom: 15, borderBottomLeftRadius: 15, borderBottomRightRadius: 15 }]}>
          <View>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{selectedIds.size} Selected</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Bulk Action Mode</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity onPress={handleBulkPrint} style={{ backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}>
              <Text style={{ color: COLORS.indigo, fontWeight: '600', fontSize: 13 }}>Generate PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSelectionMode(false); setSelectedIds(new Set()); }} style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
              <Text style={{ color: '#fff', fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Samples</Text>
            <Text style={styles.pageSubtitle}>Sample Database</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.importBtn} onPress={handleImportExcel} disabled={importing}>
              {importing
                ? <ActivityIndicator size="small" color={COLORS.indigo} />
                : <><Feather name="upload" size={15} color={COLORS.indigo} /><Text style={styles.importBtnText}>Import</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>New</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={COLORS.placeholder} />
        <TextInput
          style={styles.searchInput} placeholder="Search by name or style..."
          value={searchQuery} onChangeText={handleSearch}
          placeholderTextColor={COLORS.placeholder}
        />
      </View>

      {loading && !refreshing ? <ActivityIndicator size="large" color={COLORS.copper} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={samples}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { width: 28 }]}>#</Text>
              <Text style={[styles.thText, { flex: 1.3 }]}>Sample</Text>
              <Text style={[styles.thText, { flex: 0.8 }]}>Brand</Text>
              <Text style={[styles.thText, { width: 60 }]}>Label</Text>
              <View style={{ width: 24 }} />
            </View>
          }
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.copper]} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={COLORS.copper} style={{ paddingVertical: 16 }} /> : null}
          ListEmptyComponent={<View style={styles.emptyState}><Feather name="inbox" size={36} color={COLORS.border} /><Text style={styles.emptyText}>No samples found</Text></View>}
        />
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editItem ? 'Edit Sample' : 'New Sample'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Feather name="x" size={22} color={COLORS.muted} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.fieldLabel}>Sample Name</Text>
                <TextInput
                  style={styles.input} value={form.sample_name}
                  onChangeText={(t) => setForm({ ...form, sample_name: t })}
                  placeholder="e.g. Ocean Blue Denim" placeholderTextColor={COLORS.placeholder}
                />
                <Text style={styles.fieldLabel}>Style Number</Text>
                <TextInput
                  style={styles.input} value={form.style_number}
                  onChangeText={(t) => setForm({ ...form, style_number: t })}
                  placeholder="e.g. DN-2024-BLU" placeholderTextColor={COLORS.placeholder}
                  autoCapitalize="characters"
                />
                <Text style={styles.fieldLabel}>Developed For (Brand)</Text>
                <TextInput
                  style={styles.input} value={form.developed_for}
                  onChangeText={(t) => { setForm({ ...form, developed_for: t }); setShowBrandSuggestions(true); }}
                  onFocus={() => setShowBrandSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
                  placeholder="e.g. Zara" placeholderTextColor={COLORS.placeholder}
                />
                {showBrandSuggestions && (
                  (() => {
                    const filtered = uniqueBrands.filter((b: any) => b.toLowerCase().includes(form.developed_for.toLowerCase()));
                    if (filtered.length === 0 || (filtered.length === 1 && filtered[0] === form.developed_for)) return null;
                    return (
                      <View style={styles.suggestionsContainer}>
                        {filtered.slice(0, 5).map((b: any, idx: number) => (
                          <TouchableOpacity key={idx} style={styles.suggestionItem} onPress={() => { setForm({...form, developed_for: b}); setShowBrandSuggestions(false); }}>
                            <Text style={styles.suggestionText}>{b}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })()
                )}
                {/* Barcode preview in form */}
                {form.style_number.trim().length > 0 && (
                  <View style={styles.barcodePreviewBox}>
                    <Text style={styles.barcodePreviewLabel}>Barcode Preview</Text>
                    <SvgXml xml={generateBarcodeSVG(form.style_number)} width={260} height={60} />
                    <Text style={styles.barcodeStyleText}>{form.style_number}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.saveBtnText}>{editItem ? 'Update Sample' : 'Add Sample & Generate Barcode'}</Text>
                  }
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Barcode View Modal ───────────────────────────────────────── */}
      <Modal visible={!!barcodeModal} animationType="fade" transparent={true} onRequestClose={() => setBarcodeModal(null)}>
        {barcodeModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.barcodeModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sample Label</Text>
                <TouchableOpacity onPress={() => setBarcodeModal(null)}><Feather name="x" size={22} color={COLORS.muted} /></TouchableOpacity>
              </View>

              {/* Label card preview */}
              <View style={styles.labelCard}>
                <Text style={styles.labelBrand}>GTS — Garment Tracker</Text>
                <Text style={styles.labelName}>{barcodeModal.sample_name}</Text>
                <Text style={styles.labelFor}>For: {barcodeModal.developed_for || '—'}</Text>
                <SvgXml xml={generateBarcodeSVG(String(barcodeModal.style_number || ''), 260, 70)} width={260} height={70} />
                <Text style={styles.labelStyle}>{barcodeModal.style_number}</Text>
              </View>

              <TouchableOpacity style={styles.downloadBtn} onPress={() => handlePrintLabel(barcodeModal)} activeOpacity={0.8}>
                <Feather name="download" size={18} color="#fff" />
                <Text style={styles.downloadBtnText}>Download / Print Label</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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

  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18,
    backgroundColor: COLORS.indigo,
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
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 14,
    backgroundColor: COLORS.warmWhite, borderRadius: 12, paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: COLORS.border, gap: 8, marginBottom: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.dark },

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
  rowBrand: { fontSize: 13, fontWeight: '500', color: COLORS.body },
  labelChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: '#e8f0fb', borderRadius: 8,
    borderWidth: 1, borderColor: '#c5d8f5',
  },
  labelChipText: { fontSize: 11, fontWeight: '700', color: COLORS.denim },
  importBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  importBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.muted, marginTop: 10, fontSize: 14 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  modalContent: { backgroundColor: COLORS.warmWhite, padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  barcodeModalContent: {
    backgroundColor: COLORS.warmWhite, padding: 24,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.cream, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 15, color: COLORS.dark,
  },
  suggestionsContainer: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    marginTop: -10, marginBottom: 14, overflow: 'hidden', elevation: 2,
  },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  suggestionText: { fontSize: 14, color: COLORS.dark },

  // Barcode preview inside form
  barcodePreviewBox: {
    alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12,
    paddingVertical: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  barcodePreviewLabel: { fontSize: 10, fontWeight: '600', color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  barcodeStyleText: { fontSize: 13, fontWeight: '600', color: COLORS.dark, letterSpacing: 2, marginTop: 8 },

  saveBtn: { backgroundColor: COLORS.copper, padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Label card in barcode modal
  labelCard: {
    alignItems: 'center', borderWidth: 2, borderColor: COLORS.dark,
    borderRadius: 14, padding: 20, marginBottom: 20, backgroundColor: '#fff',
  },
  labelBrand: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: COLORS.muted, marginBottom: 6, textTransform: 'uppercase' },
  labelName: { fontSize: 17, fontWeight: '800', color: COLORS.dark, marginBottom: 4 },
  labelFor: { fontSize: 12, color: COLORS.muted, marginBottom: 14 },
  labelStyle: { fontSize: 13, fontWeight: '700', letterSpacing: 2, color: COLORS.dark, marginTop: 8 },

  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.indigo, padding: 16, borderRadius: 14,
  },
  downloadBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
