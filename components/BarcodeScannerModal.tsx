import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './ThemedText';

const PLUM = '#5B2333';

export default function BarcodeScannerModal({ visible, onClose, onScanned }: {
  visible: boolean; onClose: () => void; onScanned: (code: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const handledRef = useRef(false);

  function handleShow() {
    handledRef.current = false;
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (handledRef.current) return;
    handledRef.current = true;
    onScanned(data);
  }

  return (
    <Modal visible={visible} animationType="slide" onShow={handleShow}>
      <View style={styles.screen}>
        {permission?.granted ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
              <Text style={styles.hint}>point your camera at a barcode</Text>
            </View>
          </>
        ) : (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>
              {permission?.canAskAgain === false
                ? 'camera access was denied — enable it in system settings to scan barcodes.'
                : 'camera access is needed to scan barcodes.'}
            </Text>
            {permission?.canAskAgain !== false && (
              <Pressable style={styles.grantBtn} onPress={requestPermission}>
                <Text style={styles.grantBtnText}>allow camera access</Text>
              </Pressable>
            )}
          </View>
        )}
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  frame: { width: 240, height: 140, borderWidth: 2, borderColor: '#fff', borderRadius: 12 },
  hint: { color: '#fff', fontSize: 13, marginTop: 16 },
  permissionBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 16 },
  permissionText: { color: '#fff', fontSize: 14, textAlign: 'center' },
  grantBtn: { backgroundColor: PLUM, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20 },
  grantBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  cancelBtn: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 },
  cancelText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
