import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertTriangle, ArrowLeft, Trash2, User } from 'lucide-react-native';
import { Dialog } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { showAccountDeletedToast } from '../../../components/customToasts';
import { toast } from '../../../lib/notify';
import { events } from '../../../lib/events';
import { navigateTo } from '../../../lib/webRouter';
import { authAPI } from '../../../api/food';
import { clearModuleAuth } from '../../utils/auth';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { poppins, shadow, tw } from '../../../theme';

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
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Press onPress={goBack} accessibilityLabel="Back" style={[styles.back, shadow('0 2px 12px rgba(0,0,0,0.08)')]}>
            <ArrowLeft size={24} color="#000" />
          </Press>
          <View>
            <Text style={styles.h1}>Settings</Text>
            <Text style={styles.sub}>Profile and account settings</Text>
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <Press scale={1} onPress={() => navigateTo('/user/profile/edit')} accessibilityLabel="Edit Profile" style={styles.item}>
            <User size={20} color={tw.gray500} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.itemTitle}>Edit Profile</Text>
              <Text style={styles.itemSub} numberOfLines={1}>Change your name, description and profile photo</Text>
            </View>
          </Press>
          <Press
            scale={1}
            onPress={() => {
              setDeleteCaptcha('');
              setDeleteAccountOpen(true);
            }}
            accessibilityLabel="Delete Account"
            style={styles.item}
          >
            <Trash2 size={20} color="#FF3131" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.itemTitle}>Delete Account</Text>
              <Text style={styles.itemSub} numberOfLines={1}>Tap to delete your account</Text>
            </View>
          </Press>
        </View>
      </ScrollView>

      <Dialog visible={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} blur={8} backdrop="rgba(0,0,0,0.6)" panelStyle={styles.dialog}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View style={styles.dialogIcon}>
            <Trash2 size={28} color={tw.red600} />
          </View>
          <Text style={styles.dialogTitle}>Delete Your Account?</Text>
        </View>
        <Text style={styles.dialogP}>Are you sure you want to delete your account?</Text>
        <View style={styles.warn}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <AlertTriangle size={16} color={tw.red600} />
            <Text style={styles.warnTitle}>Warning</Text>
          </View>
          <Text style={styles.warnText}>Your account will be Deleted. Admin will keep your historical records for revenue reporting.</Text>
        </View>
        <TextInput
          placeholder="Type DELETE to confirm"
          placeholderTextColor={tw.gray400}
          value={deleteCaptcha}
          onChangeText={(v) => setDeleteCaptcha(v.toUpperCase())}
          autoCapitalize="characters"
          style={[styles.input, deleteCaptcha ? styles.inputFilled : null]}
        />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Press onPress={() => setDeleteAccountOpen(false)} disabled={isDeleting} accessibilityLabel="Cancel" style={[styles.dBtn, styles.cancelBtn, isDeleting ? { opacity: 0.5 } : null]}>
            <Text style={[styles.dBtnText, { color: tw.gray900 }]}>Cancel</Text>
          </Press>
          <Press onPress={handleDeleteAccount} disabled={!canDelete} accessibilityLabel="Delete Account" style={[styles.dBtn, styles.delBtn, shadow('0 10px 15px -3px rgba(220,38,38,0.2)'), !canDelete ? { opacity: 0.6 } : null]}>
            <Text style={[styles.dBtnText, { color: '#fff' }]}>{isDeleting ? 'Deleting...' : 'Delete Account'}</Text>
          </Press>
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  back: { height: 44, width: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  h1: { fontSize: 22, lineHeight: 22, color: tw.gray900, letterSpacing: -0.55, ...poppins(700) },
  sub: { fontSize: 12, lineHeight: 16, color: tw.gray400, marginTop: 4, ...poppins(400) },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(229,231,235,0.8)' },
  itemTitle: { fontSize: 17, lineHeight: 25.5, color: tw.gray900, ...poppins(600) },
  itemSub: { fontSize: 13, lineHeight: 19.5, color: tw.gray500, marginTop: 2, ...poppins(400) },
  dialog: { width: 340, maxWidth: '92%', borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.red100, padding: 24, ...shadow('2xl') },
  dialogIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: tw.red100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  dialogTitle: { fontSize: 20, lineHeight: 28, color: tw.gray900, textAlign: 'center', ...poppins(900) },
  dialogP: { fontSize: 14, lineHeight: 22.75, color: tw.gray600, marginBottom: 16, textAlign: 'center', ...poppins(400) },
  warn: { marginBottom: 16, backgroundColor: tw.red50, borderLeftWidth: 4, borderLeftColor: tw.red500, borderTopRightRadius: 12, borderBottomRightRadius: 12, padding: 12 },
  warnTitle: { fontSize: 14, lineHeight: 20, color: tw.red700, ...poppins(700) },
  warnText: { fontSize: 12, lineHeight: 19.5, color: tw.red700, ...poppins(400) },
  input: { height: 48, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: tw.gray200, textAlign: 'center', color: tw.gray900, fontSize: 16, marginBottom: 24, ...poppins(500) },
  inputFilled: { letterSpacing: 2.4, ...poppins(700) },
  dBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#fff', borderWidth: 2, borderColor: tw.gray300 },
  delBtn: { backgroundColor: tw.red600 },
  dBtnText: { fontSize: 16, lineHeight: 24, ...poppins(700) },
});
