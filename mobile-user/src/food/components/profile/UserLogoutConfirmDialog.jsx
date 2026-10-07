import { StyleSheet, Text, View } from 'react-native';
import { Power } from 'lucide-react-native';
import { Dialog } from '../../../components/kit';
import { Button } from '../../../components/ds';
import { color, elevation, radii, space, type } from '../../../theme';

/** Port of shared/components/UserLogoutConfirmDialog.jsx. */
export default function UserLogoutConfirmDialog({ open, onClose, onConfirm, isLoggingOut = false }) {
  return (
    <Dialog visible={open} onClose={onClose} blur={8} backdrop={color.overlay} panelStyle={styles.panel}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Power size={26} color={color.danger} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Log out?
        </Text>
      </View>
      <Text style={styles.body}>Are you sure you want to log out?</Text>
      <View style={styles.row}>
        <Button title="No" variant="outline" onPress={onClose} disabled={isLoggingOut} accessibilityLabel="No" style={{ flex: 1 }} />
        <Button title={isLoggingOut ? 'Logging out...' : 'Yes'} variant="danger" onPress={onConfirm} disabled={isLoggingOut} accessibilityLabel="Yes" style={{ flex: 1 }} />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: 384, backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xl, overflow: 'hidden', ...elevation.float },
  head: { alignItems: 'center', marginBottom: space.sm },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  title: { ...type.heading, color: color.text },
  body: { ...type.body, color: color.textSecondary, textAlign: 'center', marginBottom: space.xl },
  row: { flexDirection: 'row', gap: space.md },
});
