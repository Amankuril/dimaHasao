import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertTriangle, Trash2, User } from 'lucide-react-native';
import { Dialog } from '../../../components/kit';
import { Button, Card, ListRow } from '../../../components/ds';
import { PageHeader } from '../../components/profile/ProfileChrome';
import { showAccountDeletedToast } from '../../../components/customToasts';
import { toast } from '../../../lib/notify';
import { events } from '../../../lib/events';
import { navigateTo } from '../../../lib/webRouter';
import { authAPI } from '../../../api/food';
import { clearModuleAuth } from '../../utils/auth';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { color, elevation, radii, space, type } from '../../../theme';

/** Port of pages/user/profile/Settings.jsx. */
export default function Settings() {
  const goBack = useAppBackNavigation();
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteCaptcha, setDeleteCaptcha] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (isDeleting || deleteCaptcha !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await authAPI.deleteAccount('user');
      showAccountDeletedToast();
      clearModuleAuth('user');
      events.emit('userAuthChanged');
      navigateTo('/login', { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeleteAccountOpen(false);
    }
  };

  const canDelete = !isDeleting && deleteCaptcha === 'DELETE';

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PageHeader title="Settings" subtitle="Profile and account settings" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <ListRow icon={User} title="Edit Profile" subtitle="Change your name, description and profile photo" onPress={() => navigateTo('/user/profile/edit')} />
        </Card>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <ListRow
            icon={Trash2}
            tone="danger"
            title="Delete Account"
            subtitle="Tap to delete your account"
            onPress={() => {
              setDeleteCaptcha('');
              setDeleteAccountOpen(true);
            }}
          />
        </Card>
      </ScrollView>

      <Dialog visible={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} blur={8} backdrop={color.overlay} panelStyle={styles.dialog}>
        <View style={{ alignItems: 'center', marginBottom: space.md }}>
          <View style={styles.dialogIcon}>
            <Trash2 size={26} color={color.danger} />
          </View>
          <Text style={styles.dialogTitle} accessibilityRole="header">
            Delete your account?
          </Text>
        </View>
        <Text style={styles.dialogP}>Are you sure you want to delete your account?</Text>
        <View style={styles.warn}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xxs }}>
            <AlertTriangle size={16} color={color.danger} />
            <Text style={styles.warnTitle}>Warning</Text>
          </View>
          <Text style={styles.warnText}>Your account will be Deleted. Admin will keep your historical records for revenue reporting.</Text>
        </View>
        <Text style={styles.label}>Type DELETE to confirm</Text>
        <TextInput
          placeholder="DELETE"
          placeholderTextColor={color.textMuted}
          value={deleteCaptcha}
          onChangeText={(v) => setDeleteCaptcha(v.toUpperCase())}
          autoCapitalize="characters"
          accessibilityLabel="Type DELETE to confirm"
          style={[styles.input, deleteCaptcha ? styles.inputFilled : null]}
        />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Button title="Cancel" variant="outline" onPress={() => setDeleteAccountOpen(false)} disabled={isDeleting} accessibilityLabel="Cancel" style={{ flex: 1 }} />
          <Button
            title={isDeleting ? 'Deleting...' : 'Delete Account'}
            variant="danger"
            onPress={handleDeleteAccount}
            disabled={!canDelete}
            accessibilityLabel="Delete Account"
            style={{ flex: 1 }}
          />
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl * 2 },
  dialog: { width: 360, maxWidth: '92%', borderRadius: radii.xl, backgroundColor: color.surface, padding: space.xl, ...elevation.float },
  dialogIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  dialogTitle: { ...type.heading, color: color.text, textAlign: 'center' },
  dialogP: { ...type.body, color: color.textSecondary, marginBottom: space.lg, textAlign: 'center' },
  warn: { marginBottom: space.lg, backgroundColor: color.dangerSoft, borderRadius: radii.md, padding: space.md },
  warnTitle: { ...type.bodyStrong, color: color.danger },
  warnText: { ...type.small, color: color.text },
  label: { ...type.label, color: color.text, marginBottom: space.xs },
  input: { height: 48, paddingHorizontal: space.lg, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, textAlign: 'center', ...type.body, color: color.text, marginBottom: space.xl },
  inputFilled: { borderColor: color.danger, ...type.bodyStrong },
});
