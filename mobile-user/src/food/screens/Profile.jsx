import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertTriangle, ArrowLeft, Bookmark, Building2, Check, ChevronRight, Info, Leaf, LifeBuoy, MapPin, Power,
  Settings as SettingsIcon, ShoppingCart, Tag, Utensils, Wallet,
} from 'lucide-react-native';
import Image from '../../components/Img';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { userAPI } from '../../api/food';
import { useProfile } from '../context/ProfileContext';
import { normalizeImageUrl } from '../utils/common';
import { resolveProfileBackPath } from '../utils/mainTabRoutes';
import { F, useLocationSelector, useFoodNavScroll } from '../components/shell';
import UserLogoutConfirmDialog from '../components/profile/UserLogoutConfirmDialog';
import RequireUser from '../components/profile/RequireUser';
import { formatSavedAddressSubtitle, performUserLogout } from '../../shared/utils/userSession';
import { navigateTo, useLocation } from '../../lib/webRouter';
import { localStore } from '../../lib/storage';
import { poppins, shadow, tw } from '../../theme';

const AVATAR = require('../../../assets/food/profile_avatar.webp');

const ICON = {
  wallet: { bg: tw.amber50, color: tw.amber600 },
  coupons: { bg: tw.rose50, color: tw.rose600 },
  cart: { bg: tw.orange50, color: tw.orange600 },
  addresses: { bg: tw.emerald50, color: tw.emerald600 },
  veg: { bg: tw.green50, color: tw.green600 },
  collections: { bg: tw.indigo50, color: tw.indigo600 },
  dining: { bg: tw.orange50, color: tw.orange600 },
  orders: { bg: tw.blue50, color: tw.blue600 },
  support: { bg: tw.sky50, color: tw.sky600 },
  about: { bg: tw.slate50, color: tw.slate600 },
  safety: { bg: tw.red50, color: tw.red600 },
  settings: { bg: tw.indigo50, color: tw.indigo600 },
  logout: { bg: tw.gray100, color: tw.gray700 },
};

function OptionIcon({ k, Icon }) {
  return (
    <View style={[styles.optIcon, { backgroundColor: ICON[k].bg }]}>
      <Icon size={20} color={ICON[k].color} />
    </View>
  );
}

function Row({ k, Icon, label, sub, right, onPress, bold, accessibilityLabel }) {
  return (
    <Press scale={0.99} onPress={onPress} accessibilityLabel={accessibilityLabel || label} style={[styles.card, shadow('sm')]}>
      <View style={[styles.rowLeft]}>
        <OptionIcon k={k} Icon={Icon} />
        <View style={{ flexShrink: 1 }}>
          <Text style={[styles.label, bold ? poppins(700) : null]} numberOfLines={1}>{label}</Text>
          {sub ? <Text style={styles.sub} numberOfLines={1}>{sub}</Text> : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        {right}
        <ChevronRight size={20} color={tw.gray400} />
      </View>
    </Press>
  );
}

function SectionTitle({ children }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionBar} />
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}

function VegOption({ active, offStyle, title, desc, onPress, showLeaf, leafOn }) {
  const border = active ? (offStyle ? '#06381e' : tw.green600) : tw.gray200;
  const bg = active ? (offStyle ? '#fdfafc' : tw.green50) : '#fff';
  const dot = active ? (offStyle ? '#06381e' : tw.green600) : tw.gray300;
  return (
    <Press scale={0.98} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: active }} style={[styles.vegOpt, { borderColor: border, backgroundColor: bg }]}>
      <View style={styles.rowLeft}>
        <View style={[styles.radio, { borderColor: dot }, active ? { backgroundColor: dot } : null]}>{active ? <Check size={12} color="#fff" /> : null}</View>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.vegTitle}>{title}</Text>
          <Text style={styles.vegDesc}>{desc}</Text>
        </View>
      </View>
      {showLeaf ? <Leaf size={20} color={leafOn ? tw.green600 : tw.gray400} /> : null}
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

  return (
    <View style={{ flex: 1, backgroundColor: F.cream }}>
      <ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 80 + insets.bottom }}>
        <View style={{ marginBottom: 20 }}>
          <Press scale={0.95} onPress={() => navigateTo(resolveProfileBackPath(location.state?.from))} accessibilityLabel="Back" style={styles.back}>
            <ArrowLeft size={24} color="#000" />
          </Press>
        </View>

        <View style={[styles.profileCard, shadow('0 4px 16px rgba(0,0,0,0.02)')]}>
          <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            {hasValidEmail ? <Text style={styles.contact}>{userProfile.email}</Text> : null}
            {userProfile?.phone ? <Text style={styles.contact}>{userProfile.phone}</Text> : null}
            {!hasValidEmail && !userProfile?.phone ? <Text style={[styles.contact, { color: tw.gray400 }]}>Not available</Text> : null}
            <Press scale={1} onPress={go('/user/profile/edit')} accessibilityLabel="Edit profile" style={styles.editLink}>
              <Text style={styles.editText}>Edit profile</Text>
              <Text style={styles.editArrow}>▶</Text>
            </Press>
          </View>
        </View>

        <View style={{ gap: 8, marginTop: 12, marginBottom: 12 }}>
          <Row
            k="wallet" Icon={Wallet} label="My Wallet" onPress={go('/food/user/wallet')}
            right={
              walletBalance === null ? (
                <View style={styles.balSkeleton} />
              ) : (
                <Text style={styles.balance}>{'₹'}{Number(walletBalance).toFixed(0)}</Text>
              )
            }
          />
          <Row k="coupons" Icon={Tag} label="Your coupons" onPress={go('/user/profile/coupons')} />
          <Row k="cart" Icon={ShoppingCart} label="Your cart" onPress={go('/user/cart')} />
          <Row
            k="addresses" Icon={MapPin} label="Saved addresses" sub={savedAddressSummary} onPress={openLocationSelector}
            right={<View style={styles.countBadge}><Text style={styles.countText}>{addresses?.length || 0}</Text></View>}
          />
          <Row
            k="veg" Icon={Leaf} label="Veg Mode" onPress={() => setVegModeOpen(true)}
            right={<Text style={styles.label}>{vegMode ? (vegModeOption === 'pure-veg' ? 'Pure Veg' : 'All restaurants') : 'OFF'}</Text>}
          />
        </View>

        <View style={{ marginBottom: 12 }}>
          <SectionTitle>Collections</SectionTitle>
          <Row k="collections" Icon={Bookmark} label="Your collections" onPress={go('/user/profile/favorites')} />
        </View>

        <View style={{ marginBottom: 12 }}>
          <SectionTitle>Dining Bookings</SectionTitle>
          <Row k="dining" Icon={Utensils} label="Your reservations" sub="View table booking status" onPress={go('/user/profile/dining-bookings')} />
        </View>

        <View style={{ marginBottom: 12 }}>
          <SectionTitle>Food Orders</SectionTitle>
          <Row k="orders" Icon={Building2} label="Your orders" onPress={() => navigateTo('/user/orders', { state: { from: 'profile', backTo: '/food/user/profile' } })} />
        </View>

        <View style={{ marginBottom: 64 }}>
          <SectionTitle>More</SectionTitle>
          <View style={{ gap: 8 }}>
            <Row k="support" Icon={LifeBuoy} label="Help & Support" onPress={go('/user/profile/support')} />
            <Row k="about" Icon={Info} label="About" onPress={go('/user/profile/about')} />
            <Row k="safety" Icon={AlertTriangle} label="Report a safety emergency" onPress={go('/user/profile/report-safety-emergency')} />
            <Row k="settings" Icon={SettingsIcon} label="Settings" onPress={go('/user/profile/settings')} />
            <Row k="logout" Icon={Power} bold label={isLoggingOut ? 'Logging out...' : 'Log out'} onPress={() => !isLoggingOut && setLogoutConfirmOpen(true)} />
          </View>
        </View>
      </ScrollView>

      <Dialog visible={vegModeOpen} onClose={() => setVegModeOpen(false)} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.vegPanel}>
        <View style={styles.vegHead}>
          <Text style={styles.vegHeading}>Veg Mode</Text>
          <Text style={styles.vegSub}>Filter restaurants and dishes based on your dietary preferences</Text>
        </View>
        <View style={{ gap: 8, paddingHorizontal: 20, paddingBottom: 20 }}>
          <VegOption
            active={vegMode && vegModeOption === 'all'} title="All restaurants" desc="Veg dishes from every restaurant" showLeaf leafOn={vegMode && vegModeOption === 'all'}
            onPress={() => { handleVegModeOptionUpdate('all'); setVegModeOpen(false); }}
          />
          <VegOption
            active={vegMode && vegModeOption === 'pure-veg'} title="Pure Veg restaurants only" desc="Hide restaurants that serve non-veg" showLeaf leafOn={vegMode && vegModeOption === 'pure-veg'}
            onPress={() => { handleVegModeOptionUpdate('pure-veg'); setVegModeOpen(false); }}
          />
          <VegOption
            active={!vegMode} offStyle title="Veg Mode OFF" desc="Show all options"
            onPress={() => { handleVegModeUpdate(false); setVegModeOpen(false); }}
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
  back: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center', justifyContent: 'center', ...shadow('0 2px 12px rgba(0,0,0,0.08)'),
  },
  profileCard: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9.2, flexDirection: 'row', alignItems: 'center', gap: 16, overflow: 'hidden' },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: tw.gray100 },
  name: { fontSize: 19, lineHeight: 23.75, color: tw.gray900, textTransform: 'capitalize', ...poppins(700) },
  contact: { marginTop: 2, fontSize: 13, lineHeight: 19.5, color: tw.gray500, ...poppins(400) },
  editLink: { marginTop: 4, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  editText: { fontSize: 13, lineHeight: 19.5, color: tw.gray700, ...poppins(500) },
  editArrow: { fontSize: 9, lineHeight: 9, marginLeft: 4, color: tw.gray500 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optIcon: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(500) },
  sub: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  balance: { fontSize: 16, lineHeight: 24, color: tw.green600, ...poppins(600) },
  balSkeleton: { width: 48, height: 16, borderRadius: 4, backgroundColor: tw.gray200 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: tw.gray100 },
  countText: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(500) },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 4 },
  sectionBar: { width: 4, height: 16, borderRadius: 4, backgroundColor: F.green },
  sectionTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) },
  vegPanel: { width: '100%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.gray200, overflow: 'hidden', ...shadow('lg') },
  vegHead: { padding: 20, paddingBottom: 12, gap: 6 },
  vegHeading: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  vegSub: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  vegOpt: { padding: 12, borderRadius: 12, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  vegTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  vegDesc: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
});
