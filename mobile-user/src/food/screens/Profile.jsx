import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertTriangle, ArrowLeft, Bookmark, Building2, Check, Info, Leaf, LifeBuoy, MapPin, Pencil, Power,
  Settings as SettingsIcon, ShoppingCart, Tag, Utensils, Wallet,
} from 'lucide-react-native';
import Image from '../../components/Img';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { Button, Card, IconButton, ListRow, SectionHeader } from '../../components/ds';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { userAPI } from '../../api/food';
import { useProfile } from '../context/ProfileContext';
import { normalizeImageUrl } from '../utils/common';
import { resolveProfileBackPath } from '../utils/mainTabRoutes';
import { useLocationSelector, useFoodNavScroll } from '../components/shell';
import UserLogoutConfirmDialog from '../components/profile/UserLogoutConfirmDialog';
import RequireUser from '../components/profile/RequireUser';
import { formatSavedAddressSubtitle, performUserLogout } from '../../shared/utils/userSession';
import { navigateTo, useLocation } from '../../lib/webRouter';
import { localStore } from '../../lib/storage';
import { color, radii, space, type } from '../../theme';

const AVATAR = require('../../../assets/food/profile_avatar.webp');

/** One titled group of rows in a single card. */
function Group({ title, children }) {
  return (
    <View style={{ marginTop: space.xxl }}>
      {title ? <SectionHeader title={title} /> : null}
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {children}
      </Card>
    </View>
  );
}

function VegOption({ active, title, desc, onPress, showLeaf, leafOn }) {
  return (
    <Press
      scale={0.98}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={title}
      style={[styles.vegOpt, active ? styles.vegOptOn : null]}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.radio, active ? styles.radioOn : null]}>{active ? <Check size={12} color={color.onPrimary} /> : null}</View>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.vegTitle}>{title}</Text>
          <Text style={styles.vegDesc}>{desc}</Text>
        </View>
      </View>
      {showLeaf ? <Leaf size={20} color={leafOn ? color.veg : color.textDisabled} /> : null}
    </Press>
  );
}

function ProfileContent() {
  const insets = useSafeAreaInsets();
  const { userProfile, vegMode, setVegMode, vegModeOption, setVegModeOption, getDefaultAddress, addresses } = useProfile();
  const { openLocationSelector } = useLocationSelector();
  const location = useLocation();
  const onScroll = useFoodNavScroll();
  const [vegModeOpen, setVegModeOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);

  const savedAddressSummary = formatSavedAddressSubtitle(addresses, getDefaultAddress?.());

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      userAPI
        .getWallet()
        .then((res) => {
          const w = res?.data?.data?.wallet || res?.data?.wallet;
          const bal = Number(w?.balance);
          if (mounted) setWalletBalance(Number.isFinite(bal) ? bal : 0);
        })
        .catch(() => {});
      return () => {
        mounted = false;
      };
    }, []),
  );

  const handleVegModeUpdate = (next) => {
    setVegMode(next);
    localStore.setItem('userVegMode', String(next));
  };
  const handleVegModeOptionUpdate = (opt) => {
    setVegModeOption(opt);
    if (!vegMode) {
      setVegMode(true);
      localStore.setItem('userVegMode', 'true');
    }
  };

  const displayName = userProfile?.name || userProfile?.phone || 'User';
  const hasValidEmail = !!(userProfile?.email && userProfile.email.trim() !== '' && userProfile.email.includes('@'));
  const img = userProfile?.profileImage;
  const hasImage = typeof img === 'string' && img.trim() !== '' && img !== 'null' && img !== 'undefined';
  const avatarSource = userProfile?.localImagePreview ? { uri: userProfile.localImagePreview } : hasImage ? { uri: normalizeImageUrl(img) } : AVATAR;

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await performUserLogout();
    } catch {
      // the web goes to the login either way
    } finally {
      setIsLoggingOut(false);
      navigateTo('/login', { replace: true });
    }
  };

  const go = (path) => () => navigateTo(path);

  const vegLabel = vegMode ? (vegModeOption === 'pure-veg' ? 'Pure Veg' : 'All restaurants') : 'Off';

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.lg, paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}
      >
        <View style={styles.topRow}>
          <IconButton icon={ArrowLeft} label="Back" variant="soft" onPress={() => navigateTo(resolveProfileBackPath(location.state?.from))} />
          <Text style={styles.pageTitle} accessibilityRole="header">
            Profile
          </Text>
        </View>

        <Card style={styles.profileCard}>
          <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            {hasValidEmail ? (
              <Text style={styles.contact} numberOfLines={1}>
                {userProfile.email}
              </Text>
            ) : null}
            {userProfile?.phone ? <Text style={styles.contact}>{userProfile.phone}</Text> : null}
            {!hasValidEmail && !userProfile?.phone ? <Text style={[styles.contact, { color: color.textDisabled }]}>Not available</Text> : null}
          </View>
          <Button title="Edit" icon={Pencil} variant="secondary" size="sm" fullWidth={false} onPress={go('/user/profile/edit')} accessibilityLabel="Edit profile" style={{ minHeight: 44 }} />
        </Card>

        <Group title="Account">
          <ListRow
            icon={Wallet}
            iconTone="gold"
            title="My Wallet"
            onPress={go('/food/user/wallet')}
            divider
            value={walletBalance === null ? <View style={styles.balSkeleton} /> : <Text style={styles.balance}>{'₹'}{Number(walletBalance).toFixed(0)}</Text>}
          />
          <ListRow icon={Tag} iconTone="gold" title="Your coupons" onPress={go('/user/profile/coupons')} divider />
          <ListRow icon={ShoppingCart} title="Your cart" onPress={go('/user/cart')} divider />
          <ListRow
            icon={MapPin}
            title="Saved addresses"
            subtitle={savedAddressSummary}
            onPress={openLocationSelector}
            divider
            value={
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{addresses?.length || 0}</Text>
              </View>
            }
          />
          <ListRow icon={Leaf} title="Veg Mode" onPress={() => setVegModeOpen(true)} value={<Text style={styles.valueText}>{vegLabel}</Text>} />
        </Group>

        <Group title="Collections">
          <ListRow icon={Bookmark} title="Your collections" onPress={go('/user/profile/favorites')} />
        </Group>

        <Group title="Dining bookings">
          <ListRow icon={Utensils} title="Your reservations" subtitle="View table booking status" onPress={go('/user/profile/dining-bookings')} />
        </Group>

        <Group title="Food orders">
          <ListRow icon={Building2} title="Your orders" onPress={() => navigateTo('/user/orders', { state: { from: 'profile', backTo: '/food/user/profile' } })} />
        </Group>

        <Group title="More">
          <ListRow icon={LifeBuoy} iconTone="info" title="Help & Support" onPress={go('/user/profile/support')} divider />
          <ListRow icon={Info} iconTone="neutral" title="About" onPress={go('/user/profile/about')} divider />
          <ListRow icon={AlertTriangle} iconTone="warning" title="Report a safety emergency" onPress={go('/user/profile/report-safety-emergency')} divider />
          <ListRow icon={SettingsIcon} iconTone="neutral" title="Settings" onPress={go('/user/profile/settings')} />
        </Group>

        <View style={{ marginTop: space.xxl }}>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <ListRow icon={Power} tone="danger" title={isLoggingOut ? 'Logging out...' : 'Log out'} onPress={() => !isLoggingOut && setLogoutConfirmOpen(true)} />
          </Card>
        </View>
      </ScrollView>

      <Dialog visible={vegModeOpen} onClose={() => setVegModeOpen(false)} backdrop={color.overlay} panelStyle={styles.vegPanel}>
        <View style={styles.vegHead}>
          <Text style={styles.vegHeading}>Veg Mode</Text>
          <Text style={styles.vegSub}>Filter restaurants and dishes based on your dietary preferences</Text>
        </View>
        <View style={{ gap: space.sm, paddingHorizontal: space.xl, paddingBottom: space.xl }} accessibilityRole="radiogroup">
          <VegOption
            active={vegMode && vegModeOption === 'all'}
            title="All restaurants"
            desc="Veg dishes from every restaurant"
            showLeaf
            leafOn={vegMode && vegModeOption === 'all'}
            onPress={() => {
              handleVegModeOptionUpdate('all');
              setVegModeOpen(false);
            }}
          />
          <VegOption
            active={vegMode && vegModeOption === 'pure-veg'}
            title="Pure Veg restaurants only"
            desc="Hide restaurants that serve non-veg"
            showLeaf
            leafOn={vegMode && vegModeOption === 'pure-veg'}
            onPress={() => {
              handleVegModeOptionUpdate('pure-veg');
              setVegModeOpen(false);
            }}
          />
          <VegOption
            active={!vegMode}
            title="Veg Mode off"
            desc="Show all options"
            onPress={() => {
              handleVegModeUpdate(false);
              setVegModeOpen(false);
            }}
          />
        </View>
      </Dialog>

      <UserLogoutConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          handleLogout();
        }}
        isLoggingOut={isLoggingOut}
      />
    </View>
  );
}

export default function Profile() {
  return (
    <RequireUser>
      <ProfileContent />
    </RequireUser>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  pageTitle: { ...type.titleSerif, color: color.primary },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: color.gold, backgroundColor: color.goldSoft },
  name: { ...type.heading, color: color.text, textTransform: 'capitalize' },
  contact: { marginTop: space.xxs, ...type.small, color: color.textMuted },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexShrink: 1 },
  valueText: { ...type.label, color: color.textSecondary },
  balance: { ...type.bodyStrong, color: color.success },
  balSkeleton: { width: 48, height: 16, borderRadius: 4, backgroundColor: color.surfaceMuted },
  countBadge: { minWidth: 28, height: 24, paddingHorizontal: space.sm, borderRadius: radii.pill, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  countText: { ...type.caption, color: color.textSecondary },
  vegPanel: { width: '100%', maxWidth: 384, backgroundColor: color.surface, borderRadius: radii.xl, overflow: 'hidden' },
  vegHead: { padding: space.xl, paddingBottom: space.md, gap: space.xs },
  vegHeading: { ...type.heading, color: color.text },
  vegSub: { ...type.small, color: color.textSecondary },
  vegOpt: { minHeight: 64, padding: space.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vegOptOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: color.primary, backgroundColor: color.primary },
  vegTitle: { ...type.bodyStrong, color: color.text },
  vegDesc: { ...type.small, color: color.textMuted },
});
