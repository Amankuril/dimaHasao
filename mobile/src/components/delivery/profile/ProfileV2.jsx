import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AlertTriangle, Bike, Briefcase, ChevronRight, LogOut, Star, Ticket, Trash2 } from 'lucide-react-native';
import { authApi, deliveryApi as deliveryAPI } from '../../../api/delivery';
import { mediaUrl } from '../../../api/client';
import { useAuth } from '../../../context/AuthContext';
import { showUserFacingApiError } from '../../../lib/apiError';
import { toast } from '../../../lib/notify';
import { localStore } from '../../../lib/storage';
import { showAccountDeletedToast } from '../../customToasts';
import { Dialog } from '../../kit';
import { Spinner } from '../../Loader';
import { Press } from '../../ui';
import { display, ff, shadow, tw } from '../../../theme';

/*
 * Port of pages/ProfileV2.jsx. Root `font-poppins` -> Nunito Sans; h2/h3 Sora.
 * Not ported: the "Balance Found" dialog and the referral share action. The
 * web never opens the dialog (nothing sets showBalanceWarning) and never
 * renders a share button; the referral stats request is kept.
 */

const AVATAR = require('../../../../assets/images/profile_avatar.webp');

export default function ProfileV2() {
  const { logout, clearSession } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutSubmitting, setLogoutSubmitting] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteCaptcha, setDeleteCaptcha] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await deliveryAPI.getProfile();
        if (response?.data?.success && response?.data?.data?.profile) setProfile(response.data.data.profile);
      } catch {
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    deliveryAPI.getReferralStats().catch(() => {});
  }, []);

  const avatarSource = profile?.profileImage?.url ? { uri: mediaUrl(profile.profileImage.url) } : AVATAR;

  const handleLogout = async () => {
    if (logoutSubmitting) return;
    setLogoutSubmitting(true);
    localStore.removeItem('app:isOnline');
    // Clears the session; the guarded stack then lands on /login.
    await logout();
    setLogoutSubmitting(false);
  };

  const handleLogoutAllDevices = async () => {
    if (logoutSubmitting) return;
    setLogoutSubmitting(true);
    try {
      await authApi.logoutFromAllDevices();
    } catch {
      /* sign out locally regardless */
    }
    localStore.removeItem('app:isOnline');
    await clearSession();
    setLogoutSubmitting(false);
  };

  const handleDelete = async () => {
    if (isDeleting || deleteCaptcha !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await authApi.deleteAccount();
      showAccountDeletedToast();
      await clearSession();
    } catch (err) {
      showUserFacingApiError(err, 'Failed to delete account');
    } finally {
      setIsDeleting(false);
      setDeleteAccountOpen(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Spinner size={20} color={tw.gray600} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={[styles.head, shadow('sm')]}>
        <Press onPress={() => router.push('/food/delivery/profile/details')} scale={1} accessibilityLabel="Profile details" style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile?.name || ''}</Text>
              <ChevronRight size={20} color={tw.gray400} />
            </View>
            <Text style={styles.deliveryId}>{profile?.deliveryId || ''}</Text>
          </View>
          <View style={styles.avatarWrap}>
            <Image source={avatarSource} style={styles.avatar} />
            <View style={[styles.briefcase, shadow('md')]}>
              <Briefcase size={16} color={tw.gray600} />
            </View>
          </View>
        </Press>
      </View>

      <View style={styles.body}>
        <View style={styles.grid}>
          <Press onPress={() => router.navigate('/food/delivery/history')} scale={1} accessibilityLabel="Trips history" style={styles.tile}>
            <View style={styles.tileIcon}>
              <Bike size={24} color={tw.gray700} />
            </View>
            <Text style={styles.tileText}>Trips history</Text>
          </Press>
          <Press onPress={() => router.push('/food/delivery/profile/reviews')} scale={1} accessibilityLabel="My reviews" style={styles.tile}>
            <View style={styles.tileIcon}>
              <Star size={24} color={tw.primary} />
            </View>
            <Text style={styles.tileText}>My reviews</Text>
          </Press>
        </View>

        <View style={{ gap: 16 }}>
          <View>
            <Text style={styles.section}>Support</Text>
            <Press onPress={() => router.push('/food/delivery/help/tickets')} scale={1} accessibilityLabel="Support tickets" style={styles.row}>
              <View style={styles.rowLeft}>
                <Ticket size={20} color={tw.gray700} />
                <Text style={styles.rowText}>Support tickets</Text>
              </View>
              <ChevronRight size={20} color={tw.gray300} />
            </Press>
          </View>

          <View style={{ paddingTop: 8 }}>
            <Press onPress={() => setShowLogoutConfirm(true)} scale={1} accessibilityLabel="Logout" style={[styles.danger, { borderColor: tw.red100, boxShadow: '0 4px 20px -4px rgba(220,38,38,0.05)' }]}>
              <View style={styles.dangerLeft}>
                <View style={[styles.dangerIcon, { backgroundColor: tw.red50 }]}>
                  <LogOut size={20} color="#FF3131" style={{ marginLeft: 2 }} />
                </View>
                <View style={{ minWidth: 0 }}>
                  <Text style={styles.dangerTitle}>Logout</Text>
                  <Text style={styles.dangerSub}>Tap to logout from this device</Text>
                </View>
              </View>
              <ChevronRight size={18} color={tw.gray300} />
            </Press>
          </View>

          <Press
            onPress={() => {
              setDeleteCaptcha('');
              setDeleteAccountOpen(true);
            }}
            scale={0.99}
            accessibilityLabel="Delete Account"
            style={[styles.danger, { borderColor: tw.red50 }]}
          >
            <View style={styles.dangerLeft}>
              <View style={[styles.dangerIcon, { backgroundColor: '#FFF1F2' }]}>
                <Trash2 size={20} color="#FF3131" />
              </View>
              <View style={{ minWidth: 0 }}>
                <Text style={styles.dangerTitle}>Delete Account</Text>
                <Text style={styles.dangerSub}>Tap to delete your account</Text>
              </View>
            </View>
            <ChevronRight size={18} color="rgba(255,49,49,0.3)" />
          </Press>
        </View>
      </View>

      <Dialog visible={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} backdrop="rgba(0,0,0,0.5)" blur={8} panelStyle={[styles.logoutCard, shadow('2xl')]}>
        <View style={styles.logoutAvatarRing}>
          <Image source={avatarSource} style={styles.logoutAvatar} />
        </View>
        <Text style={styles.logoutName}>{profile?.name || 'Delivery Partner'}</Text>
        {profile?.deliveryId ? <Text style={styles.logoutId}>{profile.deliveryId}</Text> : null}
        <View style={{ width: '100%', gap: 12 }}>
          <Press onPress={handleLogout} disabled={logoutSubmitting} scale={0.98} accessibilityLabel="Logout" style={[styles.logoutBtn, logoutSubmitting && { opacity: 0.5 }]}>
            <Text style={styles.logoutBtnText}>{logoutSubmitting ? 'Logging out...' : 'Logout'}</Text>
          </Press>
          <Press onPress={handleLogoutAllDevices} disabled={logoutSubmitting} scale={0.98} accessibilityLabel="Logout from all devices" style={[styles.logoutAll, logoutSubmitting && { opacity: 0.5 }]}>
            <Text style={[styles.logoutBtnText, { color: '#DC2626' }]}>{logoutSubmitting ? 'Logging out...' : 'Logout from all devices'}</Text>
          </Press>
        </View>
        <Press onPress={() => setShowLogoutConfirm(false)} disabled={logoutSubmitting} scale={1} accessibilityLabel="Cancel" style={{ marginTop: 20 }}>
          <Text style={styles.cancel}>Cancel</Text>
        </Press>
      </Dialog>

      {/* No backdrop handler on the web's delete dialog: only Cancel closes it. */}
      <Dialog visible={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} closeOnBackdrop={false} backdrop="rgba(0,0,0,0.8)" blur={8} panelStyle={[styles.deleteCard, shadow('card')]}>
        <View style={styles.deleteHead}>
          <View style={styles.deleteIcon}>
            <Trash2 size={28} color={tw.red600} />
          </View>
          <Text style={styles.deleteTitle}>Delete Your Account?</Text>
        </View>
        <Text style={styles.deleteBody}>Are you sure you want to delete your account?</Text>
        <View style={styles.warning}>
          <View style={styles.warningHead}>
            <AlertTriangle size={16} color={tw.red600} />
            <Text style={styles.warningTitle}>Warning</Text>
          </View>
          <Text style={styles.warningText}>Your account will be Deleted. Admin will keep your historical records for revenue reporting.</Text>
        </View>
        <TextInput
          value={deleteCaptcha}
          onChangeText={(t) => setDeleteCaptcha(t.toUpperCase())}
          placeholder="Type DELETE to confirm"
          placeholderTextColor={tw.gray400}
          autoCapitalize="characters"
          accessibilityLabel="Type DELETE to confirm"
          style={[styles.captcha, deleteCaptcha ? styles.captchaFilled : styles.captchaEmpty]}
        />
        <View style={styles.deleteRow}>
          <Press onPress={() => setDeleteAccountOpen(false)} scale={1} accessibilityLabel="Cancel" style={styles.deleteCancel}>
            <Text style={styles.deleteCancelText}>Cancel</Text>
          </Press>
          <Press
            onPress={handleDelete}
            disabled={isDeleting || deleteCaptcha !== 'DELETE'}
            scale={1}
            accessibilityLabel="Delete Account"
            style={[styles.deleteConfirm, shadow('0 10px 15px -3px rgba(231,0,11,0.2), 0 4px 6px -4px rgba(231,0,11,0.2)'), (isDeleting || deleteCaptcha !== 'DELETE') && { opacity: 0.6 }]}
          >
            <Text style={styles.deleteConfirmText}>{isDeleting ? 'Deleting...' : 'Delete Account'}</Text>
          </Press>
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, minHeight: 600, backgroundColor: tw.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...ff(500) },
  page: { backgroundColor: tw.gray100, paddingBottom: 96 },
  head: { backgroundColor: '#fff', padding: 16, width: '100%' },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  name: { fontSize: 24, lineHeight: 32, color: tw.gray900, ...display(700, 24) },
  deliveryId: { color: tw.gray600, fontSize: 14, lineHeight: 20, marginBottom: 12, ...ff(500) },
  avatarWrap: { marginLeft: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: tw.gray200 },
  briefcase: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 999, padding: 8, borderWidth: 2, borderColor: '#fff' },
  body: { paddingHorizontal: 16, paddingVertical: 24 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  tile: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'transparent' },
  tileIcon: { borderRadius: 999, backgroundColor: tw.gray50, padding: 12 },
  tileText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...ff(700) },
  // h3 text-[10px] font-black -> Sora (.01em beats tracking-[0.2em])
  section: { color: tw.gray400, fontSize: 10, lineHeight: 15, textTransform: 'uppercase', marginBottom: 12, paddingHorizontal: 4, ...display(900, 10) },
  row: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...ff(700) },
  danger: { backgroundColor: '#fff', borderRadius: 19.2, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  dangerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, minWidth: 0, flexShrink: 1 },
  dangerIcon: { width: 51.2, height: 51.2, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  dangerTitle: { fontSize: 17, lineHeight: 25.5, color: '#FF3131', marginBottom: 2, ...ff(700) },
  dangerSub: { fontSize: 13, lineHeight: 19.5, color: tw.gray500, ...ff(500) },
  logoutCard: { width: '100%', maxWidth: 340, borderRadius: 28.8, backgroundColor: '#fff', padding: 28, alignItems: 'center' },
  // ring-4 is a box-shadow: no layout space
  logoutAvatarRing: { marginBottom: 12, borderRadius: 999, boxShadow: '0 0 0 4px #F9FAFB, 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)' },
  logoutAvatar: { width: 84, height: 84, borderRadius: 42 },
  logoutName: { fontSize: 19, lineHeight: 23.75, color: '#1F2937', marginBottom: 4, ...display(900, 19) },
  logoutId: { fontSize: 13, lineHeight: 19.5, color: tw.gray500, marginBottom: 24, ...ff(500) },
  logoutBtn: { width: '100%', borderRadius: 14, backgroundColor: '#DC2626', paddingVertical: 14, alignItems: 'center' },
  logoutAll: { width: '100%', borderRadius: 14, borderWidth: 1.5, borderColor: '#DC2626', backgroundColor: '#fff', paddingVertical: 14, alignItems: 'center' },
  logoutBtnText: { fontSize: 15, lineHeight: 22.5, color: '#fff', ...ff(700) },
  cancel: { fontSize: 15, lineHeight: 22.5, color: '#6B7280', ...ff(700) },
  deleteCard: { backgroundColor: '#fff', width: '100%', maxWidth: 384, borderRadius: 16, padding: 17.6 },
  deleteHead: { alignItems: 'center', marginBottom: 16 },
  deleteIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: tw.red100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  deleteTitle: { fontSize: 20, lineHeight: 28, color: tw.gray900, textAlign: 'center', ...display(900, 20) },
  deleteBody: { fontSize: 14, lineHeight: 22.75, color: tw.gray600, marginBottom: 16, textAlign: 'center', ...ff(500) },
  warning: { marginBottom: 16, backgroundColor: tw.red50, borderLeftWidth: 4, borderLeftColor: tw.red500, borderTopRightRadius: 12, borderBottomRightRadius: 12, padding: 12 },
  warningHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  warningTitle: { fontSize: 14, lineHeight: 20, color: tw.red700, ...ff(700) },
  warningText: { fontSize: 12, lineHeight: 19.5, color: tw.red700, ...ff(500) },
  // An <input>: the theme's white background, #E8DEE7 border and text colour win.
  captcha: { width: '100%', height: 48, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: '#E8DEE7', backgroundColor: '#fff', color: '#1F1F24', textAlign: 'center', fontSize: 16, marginBottom: 24, outlineWidth: 0 },
  captchaFilled: { letterSpacing: 1.6, ...ff(700) },
  captchaEmpty: { ...ff(500) },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteCancel: { flex: 1, height: 48, borderRadius: 12, borderWidth: 2, borderColor: tw.gray300, alignItems: 'center', justifyContent: 'center' },
  deleteCancelText: { fontSize: 16, lineHeight: 24, color: tw.gray700, ...ff(700) },
  deleteConfirm: { flex: 1, height: 48, borderRadius: 12, backgroundColor: tw.red600, alignItems: 'center', justifyContent: 'center' },
  deleteConfirmText: { fontSize: 16, lineHeight: 24, color: '#fff', ...ff(700) },
});
