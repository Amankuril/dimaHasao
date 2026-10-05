import { StyleSheet, Text, View } from 'react-native';
import { Power } from 'lucide-react-native';
import { Dialog } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { poppins, shadow, tw } from '../../../theme';

/** Port of shared/components/UserLogoutConfirmDialog.jsx. */
export default function UserLogoutConfirmDialog({ open, onClose, onConfirm, isLoggingOut = false }) {
  return (
    <Dialog visible={open} onClose={onClose} blur={8} backdrop="rgba(0,0,0,0.6)" panelStyle={styles.panel}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Power size={28} color="#FF3131" />
        </View>
        <Text style={styles.title}>Log out?</Text>
      </View>
      <Text style={styles.body}>Are you sure you want to log out?</Text>
      <View style={styles.row}>
        <Press onPress={onClose} disabled={isLoggingOut} scale={0.97} style={[styles.btn, styles.no]} accessibilityLabel="No">
          <Text style={[styles.btnText, { color: tw.gray700 }]}>No</Text>
        </Press>
        <Press onPress={onConfirm} disabled={isLoggingOut} scale={0.95} style={[styles.btn, styles.yes]} accessibilityLabel="Yes">
          <Text style={[styles.btnText, { color: '#fff' }]}>{isLoggingOut ? 'Logging out...' : 'Yes'}</Text>
        </Press>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%', maxWidth: 384, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    padding: 24, overflow: 'hidden', ...shadow('2xl'),
  },
  head: { alignItems: 'center', marginBottom: 16 },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  body: { fontSize: 14, lineHeight: 22.75, color: tw.gray500, textAlign: 'center', marginBottom: 24, ...poppins(400) },
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  no: { borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  yes: { backgroundColor: '#FF3131', ...shadow('0 10px 15px -3px rgba(239,68,68,0.2), 0 4px 6px -4px rgba(239,68,68,0.2)') },
  btnText: { fontSize: 16, lineHeight: 24, ...poppins(700) },
});
