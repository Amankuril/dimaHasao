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
import { Button, Card, ListRow, SectionHeader } from '../../ds';
import { color, elevation, radii, space, touch, type } from '../../../theme';

/*
 * Profile tab body. Renders in normal flow under the tab's HomeHeader, so it
 * adds no header offset of its own.
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
      <View style={styles.loading} accessibilityLabel="Loading profile">
        <Spinner size={20} color={color.textMuted} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Card onPress={() => router.push('/food/delivery/profile/details')} accessibilityLabel="Profile details" style={styles.head}>
        <View style={styles.avatarWrap}>
          <Image source={avatarSource} style={styles.avatar} accessibilityIgnoresInvertColors />
          <View style={styles.briefcase}>
            <Briefcase size={14} color={color.textSecondary} />
          </View>
        </View>
        <View style={styles.headText}>
          <Text style={styles.name} numberOfLines={2}>
            {profile?.name || ''}
          </Text>
          {profile?.deliveryId ? (
            <Text style={styles.deliveryId} numberOfLines={1}>
              {profile.deliveryId}
            </Text>
          ) : null}
          <Text style={styles.headLink}>View and edit profile</Text>
        </View>
        <ChevronRight size={20} color={color.textDisabled} />
      </Card>

      <View style={styles.grid}>
        <Card onPress={() => router.navigate('/food/delivery/history')} accessibilityLabel="Trips history" style={styles.tile}>
          <View style={styles.tileIcon}>
            <Bike size={22} color={color.primary} />
          </View>
          <Text style={styles.tileText} numberOfLines={1}>
            Trips history
          </Text>
        </Card>
        <Card onPress={() => router.push('/food/delivery/profile/reviews')} accessibilityLabel="My reviews" style={styles.tile}>
          <View style={styles.tileIcon}>
            <Star size={22} color={color.primary} />
          </View>
          <Text style={styles.tileText} numberOfLines={1}>
            My reviews
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Support" />
        <Card padded={false} style={styles.group}>
          <ListRow icon={Ticket} title="Support tickets" subtitle="Raise or track an issue" onPress={() => router.push('/food/delivery/help/tickets')} />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Account" />
        <Card padded={false} style={styles.group}>
          <ListRow icon={LogOut} tone="danger" title="Logout" subtitle="Sign out from this device" onPress={() => setShowLogoutConfirm(true)} divider />
          <ListRow
            icon={Trash2}
            tone="danger"
            title="Delete account"
            subtitle="Permanently remove your account"
            onPress={() => {
              setDeleteCaptcha('');
              setDeleteAccountOpen(true);
            }}
          />
        </Card>
      </View>

      <Dialog visible={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} backdrop={color.overlay} blur={8} panelStyle={styles.dialog}>
        <Image source={avatarSource} style={styles.logoutAvatar} accessibilityIgnoresInvertColors />
        <Text style={styles.dialogTitle} numberOfLines={2}>
          {profile?.name || 'Delivery Partner'}
        </Text>
        {profile?.deliveryId ? <Text style={styles.logoutId}>{profile.deliveryId}</Text> : null}
        <Text style={styles.dialogBody}>Do you want to log out?</Text>
        <View style={styles.dialogActions}>
          <Button title={logoutSubmitting ? 'Logging out...' : 'Logout'} variant="danger" onPress={handleLogout} disabled={logoutSubmitting} accessibilityLabel="Logout" />
          <Button
            title={logoutSubmitting ? 'Logging out...' : 'Logout from all devices'}
            variant="dangerSoft"
            onPress={handleLogoutAllDevices}
            disabled={logoutSubmitting}
            accessibilityLabel="Logout from all devices"
          />
          <Button title="Cancel" variant="ghost" onPress={() => setShowLogoutConfirm(false)} disabled={logoutSubmitting} />
        </View>
      </Dialog>

      {/* No backdrop handler on the web's delete dialog: only Cancel closes it. */}
      <Dialog visible={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} closeOnBackdrop={false} backdrop={color.overlay} blur={8} panelStyle={styles.dialog}>
        <View style={styles.deleteIcon}>
          <Trash2 size={26} color={color.danger} />
        </View>
        <Text style={styles.dialogTitle} accessibilityRole="header">
          Delete your account?
        </Text>
        <Text style={styles.dialogBody}>Are you sure you want to delete your account?</Text>
        <View style={styles.warning}>
          <View style={styles.warningHead}>
            <AlertTriangle size={16} color={color.danger} />
            <Text style={styles.warningTitle}>Warning</Text>
          </View>
          <Text style={styles.warningText}>Your account will be deleted. Admin will keep your historical records for revenue reporting.</Text>
        </View>
        <Text style={styles.captchaLabel}>Type DELETE to confirm</Text>
        <TextInput
          value={deleteCaptcha}
          onChangeText={(t) => setDeleteCaptcha(t.toUpperCase())}
          placeholder="DELETE"
          placeholderTextColor={color.textDisabled}
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel="Type DELETE to confirm"
          style={[styles.captcha, deleteCaptcha ? styles.captchaFilled : null, deleteCaptcha === 'DELETE' && { borderColor: color.danger }]}
        />
        <View style={styles.deleteRow}>
          <Button title="Cancel" variant="outline" onPress={() => setDeleteAccountOpen(false)} style={styles.flex1} />
          <Button
            title={isDeleting ? 'Deleting...' : 'Delete'}
            variant="danger"
            onPress={handleDelete}
            disabled={isDeleting || deleteCaptcha !== 'DELETE'}
            accessibilityLabel="Delete Account"
            style={styles.flex1}
          />
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, minHeight: 320, backgroundColor: color.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  loadingText: { ...type.body, color: color.textSecondary },
  page: { flexGrow: 1, backgroundColor: color.bg, padding: space.lg, paddingBottom: space.xxxl, gap: space.md },

  head: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatarWrap: { width: 64, height: 64 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted },
  briefcase: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.surface,
    borderWidth: 2,
    borderColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.card,
  },
  headText: { flex: 1, minWidth: 0, gap: space.xxs },
  name: { ...type.heading, color: color.text },
  deliveryId: { ...type.small, color: color.textMuted },
  headLink: { ...type.label, color: color.primary, marginTop: space.xs },

  grid: { flexDirection: 'row', gap: space.md },
  tile: { flex: 1, alignItems: 'center', gap: space.sm, minHeight: 104, justifyContent: 'center' },
  tileIcon: { width: touch, height: touch, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  tileText: { ...type.bodyStrong, color: color.text },

  section: { marginTop: space.md },
  group: { overflow: 'hidden' },

  dialog: { width: '100%', maxWidth: 360, borderRadius: radii.xl, backgroundColor: color.surface, padding: space.xxl, alignItems: 'center', ...elevation.sheet },
  dialogTitle: { ...type.heading, color: color.text, textAlign: 'center' },
  dialogBody: { ...type.body, color: color.textSecondary, textAlign: 'center', marginTop: space.xs },
  dialogActions: { alignSelf: 'stretch', gap: space.sm, marginTop: space.xl },
  logoutAvatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: color.border, marginBottom: space.md, backgroundColor: color.surfaceMuted },
  logoutId: { ...type.small, color: color.textMuted, marginTop: space.xxs },

  deleteIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  warning: { alignSelf: 'stretch', marginTop: space.lg, backgroundColor: color.dangerSoft, borderRadius: radii.md, padding: space.md, gap: space.xs },
  warningHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  warningTitle: { ...type.label, color: color.danger },
  warningText: { ...type.small, color: color.text },
  captchaLabel: { ...type.label, color: color.text, alignSelf: 'stretch', marginTop: space.lg, marginBottom: space.sm },
  captcha: {
    alignSelf: 'stretch',
    height: touch,
    paddingHorizontal: space.lg,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    color: color.text,
    textAlign: 'center',
    ...type.body,
    outlineWidth: 0,
  },
  captchaFilled: { ...type.bodyStrong, letterSpacing: 1.6 },
  deleteRow: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl },
  flex1: { flex: 1 },
});
