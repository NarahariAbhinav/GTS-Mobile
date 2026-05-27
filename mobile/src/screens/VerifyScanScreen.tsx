import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { acceptTransfer } from '../utils/api';

export default function VerifyScanScreen({ navigation, route }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  const { transactionId, expectedStyleNumber, sampleName } = route.params;

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || processing) return;
    setScanned(true);

    const scannedValue = data.trim();

    // Verify: scanned barcode must match the expected style number
    if (scannedValue.toLowerCase() === expectedStyleNumber.toLowerCase()) {
      setProcessing(true);
      try {
        await acceptTransfer(transactionId);
        Alert.alert(
          '✓ Verified & Accepted',
          `Barcode matched. "${sampleName}" is now officially in your possession.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } catch (error: any) {
        Alert.alert('Error', error?.response?.data?.error || 'Failed to accept transfer');
        setScanned(false);
      } finally {
        setProcessing(false);
      }
    } else {
      Alert.alert(
        'Barcode Mismatch',
        `Scanned "${scannedValue}" but expected "${expectedStyleNumber}".\n\nPlease scan the correct garment tag.`,
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
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
          <Text style={styles.permText}>Scan the garment barcode to verify you have the physical sample.</Text>
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
          <Text style={styles.topTitle}>Verify & Accept</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Feather name="shield" size={16} color="#fff" />
          <Text style={styles.infoBannerText}>
            Scan the barcode on "{sampleName}" to prove you have the garment
          </Text>
        </View>

        {/* Scan Frame */}
        <View style={styles.frameContainer}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.expectedText}>Expected: {expectedStyleNumber}</Text>
        </View>

        {/* Bottom */}
        <View style={styles.bottomHint}>
          {processing ? (
            <Text style={styles.hintText}>Verifying and accepting...</Text>
          ) : (
            <>
              <Text style={styles.hintText}>Point camera at the garment tag barcode</Text>
              <Text style={styles.hintSub}>Ownership transfers only after barcode match</Text>
            </>
          )}
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

  permTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
  permText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  grantBtn: {
    backgroundColor: '#111827', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 10, marginTop: 24,
  },
  grantBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  backLink: { marginTop: 16 },
  backLinkText: { color: '#6b7280', fontSize: 14 },

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

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(17,24,39,0.85)', marginHorizontal: 20,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10,
  },
  infoBannerText: { flex: 1, fontSize: 13, color: '#fff', lineHeight: 18 },

  frameContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: FRAME_SIZE, height: FRAME_SIZE, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#10b981' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  expectedText: {
    color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500',
    textAlign: 'center', marginTop: 16, letterSpacing: 1,
  },

  bottomHint: { alignItems: 'center', paddingBottom: 40, paddingHorizontal: 20 },
  hintText: { fontSize: 14, color: '#fff', fontWeight: '500', textAlign: 'center' },
  hintSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6 },
});
