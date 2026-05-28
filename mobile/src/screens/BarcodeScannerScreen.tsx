import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';

export default function BarcodeScannerScreen({ navigation, route }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const samples = route?.params?.samples || [];

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    const scannedValue = data.trim();

    // Match against style_number
    const match = samples.find((s: any) =>
      s.style_number.toLowerCase() === scannedValue.toLowerCase()
    );

    if (match) {
      if (route?.params?.returnScreen === 'Handover') {
        navigation.navigate('Dashboard', { screen: 'Transfers', params: { prefilledSampleId: match.id } });
      } else {
        navigation.replace('Timeline', {
          sampleId: match.id,
          sampleName: match.sample_name,
          sampleDetails: match,
        });
      }
    } else {
      Alert.alert(
        'Not Found',
        `No sample found for barcode: "${scannedValue}"`,
        [{ text: 'Scan Again', onPress: () => setScanned(false) }]
      );
    }
  };

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permText}>Requesting camera permission...</Text>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Feather name="camera-off" size={48} color="#d1d5db" />
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permText}>We need camera access to scan barcodes on garment sample tags.</Text>
          <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
            <Text style={styles.grantBtnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: [
            'qr', 'ean13', 'ean8', 'code128', 'code39', 'code93',
            'upc_a', 'upc_e', 'itf14', 'codabar',
          ],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <SafeAreaView style={styles.overlay}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Scan Barcode</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Scan Frame */}
        <View style={styles.frameContainer}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Bottom Hint */}
        <View style={styles.bottomHint}>
          <Text style={styles.hintText}>
            Point camera at the barcode on the garment tag
          </Text>
          <Text style={styles.hintSub}>
            Supports QR, EAN, Code128, Code39, UPC
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const FRAME_SIZE = 250;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },

  // Permission UI
  permTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
  permText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  grantBtn: {
    backgroundColor: '#111827', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 10, marginTop: 24,
  },
  grantBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  backLink: { marginTop: 16 },
  backLinkText: { color: '#6b7280', fontSize: 14 },

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },

  // Scan Frame
  frameContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: {
    width: FRAME_SIZE, height: FRAME_SIZE, position: 'relative',
  },
  corner: {
    position: 'absolute', width: 30, height: 30,
    borderColor: '#fff',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },

  // Bottom Hint
  bottomHint: {
    alignItems: 'center', paddingBottom: 40, paddingHorizontal: 20,
  },
  hintText: { fontSize: 14, color: '#fff', fontWeight: '500', textAlign: 'center' },
  hintSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6 },
});
