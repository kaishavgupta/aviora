import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, SafeAreaView } from 'react-native';
import { Text, Button, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';

/**
 * ScannerModal component.
 * Opens a full-screen camera view to scan QR codes.
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Modal visibility.
 * @param {Function} props.onClose - Triggered when modal is closed manually.
 * @param {Function} props.onScan - Triggered when a QR code is successfully scanned. Receives the scanned data string.
 */
export default function ScannerModal({ visible, onClose, onScan }) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Reset scanned state when modal opens
  useEffect(() => {
    if (visible) {
      setScanned(false);
    }
  }, [visible]);

  if (!visible) return null;

  if (!permission) {
    // Camera permissions are still loading
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" />
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <Text style={styles.message}>We need your permission to show the camera.</Text>
          <Button mode="contained" onPress={requestPermission} style={styles.permissionBtn}>
            Grant Permission
          </Button>
          <Button mode="text" onPress={onClose} style={styles.cancelBtn}>
            Cancel
          </Button>
        </View>
      </Modal>
    );
  }

  const handleBarcodeScanned = ({ type, data }) => {
    if (!scanned) {
      setScanned(true);
      if (onScan) {
        onScan(data);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.header}>
              <IconButton
                icon="close"
                size={30}
                iconColor="#FFFFFF"
                onPress={onClose}
                style={styles.closeBtn}
              />
            </View>
            <View style={styles.scanTargetContainer}>
              <View style={styles.scanTarget} />
            </View>
            <View style={styles.footer}>
              <Text variant="titleMedium" style={styles.instructions}>
                Align QR Code within the frame to start assistance.
              </Text>
            </View>
          </View>
        </CameraView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  message: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  permissionBtn: {
    marginBottom: 10,
    width: '100%',
  },
  cancelBtn: {
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 10,
    alignItems: 'flex-end',
  },
  closeBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanTargetContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTarget: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00E676', // Green target box
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  instructions: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
