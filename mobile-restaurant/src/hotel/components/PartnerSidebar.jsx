import { useEffect, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X, User, Building, List,
  History, Shield,
  FileText, HelpCircle, LogOut,
  LayoutDashboard,
  ChevronRight, Wallet, Bell, Settings, Edit3, Info, Phone, Calendar, TrendingUp,
} from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import { Press } from '../../components/ui';
import { mediaUrl } from '../../api/client';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { poppins, shadow, tw } from '../../theme';
import usePartnerStore from '../store/partnerStore';
import { clearPartnerSessions } from '../../restaurant/utils/partnerSession';
import { usePartnerAuth } from '../utils/partnerAuth';
import { HT, HT_GRADIENT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/components/PartnerSidebar.jsx:
 * the slide-in drawer (85% wide, max 300) over a black/60 overlay.
 * Paths are the unified app's /hotel/partner/<page>.
 */
const MENU_GROUPS = [
  {
    title: 'Overview',
    items: [{ icon: LayoutDashboard, label: 'Dashboard', path: '/hotel/partner/dashboard' }],
  },
  {
    title: 'Growth & Finance',
    items: [
      { icon: Wallet, label: 'Wallet', path: '/hotel/partner/wallet' },
      { icon: TrendingUp, label: 'Revenue Report', path: '/hotel/partner/revenue' },
      { icon: History, label: 'Bookings', path: '/hotel/partner/bookings' },
    ],
  },
  {
    title: 'Management',
    items: [
      { icon: Building, label: 'My Properties', path: '/hotel/partner/properties' },
      { icon: Calendar, label: 'Manage Inventory', path: '/hotel/partner/inventory-properties' },
      { icon: List, label: 'Reviews & Ratings', path: '/hotel/partner/reviews' },
      { icon: Bell, label: 'Notifications', path: '/hotel/partner/notifications' },
    ],
  },
  {
    title: 'Support & Legal',
    items: [
      { icon: HelpCircle, label: 'Help & Support', path: '/hotel/partner/support' },
      { icon: FileText, label: 'Terms & Conditions', path: '/hotel/partner/terms' },
      { icon: Shield, label: 'Privacy Policy', path: '/hotel/partner/privacy' },
      { icon: Info, label: 'About Dima Hasao Partner', path: '/hotel/partner/about' },
      { icon: Phone, label: 'Contact Support', path: '/hotel/partner/contact' },
      { icon: Settings, label: 'Settings', path: '/hotel/partner/settings' },
    ],
  },
];

const MenuItem = ({ icon: Icon, label, path, badge, onNavigate }) => (
  <Press scale={0.95} onPress={() => onNavigate(path)} accessibilityLabel={label} style={styles.menuItem}>
    <View style={styles.menuIcon}>
      <Icon size={16} color={HT.primary} />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
    {badge ? (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    ) : null}
    <ChevronRight size={14} color={tw.gray300} />
  </Press>
);

const PartnerSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.85, 300);
  const formData = usePartnerStore((state) => state.formData);
  const { user: sessionUser } = usePartnerAuth();
  const user = sessionUser || {};

  const x = useAnimatedValue(-drawerWidth);
  const fade = useAnimatedValue(0);
  const [mounted, setMounted] = useState(Boolean(isOpen));

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      x.setValue(-drawerWidth);
      Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(x, { toValue: -drawerWidth, duration: 300, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const handleNavigation = (path) => {
    if (path) {
      navigate(path);
      onClose();
    }
  };

  const handleLogout = async () => {
    // The web sidebar runs localStorage.clear(): it signs out of BOTH businesses and drops the profiles
    // and the wizard draft. clearPartnerSessions() is the app's equivalent for the partner sessions.
    await clearPartnerSessions();
    usePartnerStore.getState().resetForm();
    onClose();
    navigate('/hotel/partner/login');
  };

  const avatar = mediaUrl(user.profileImage);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={onClose} accessibilityLabel="Close menu" />
        </Animated.View>

        <Animated.View style={[styles.drawer, { width: drawerWidth, transform: [{ translateX: x }] }]}>
          <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 16 + insets.bottom }} showsVerticalScrollIndicator={false}>
            <View style={styles.topRow}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.brand, { color: HT.primary }]}>Dima</Text>
                  <Text style={[styles.brand, { color: tw.amber600 }]}>Hasao</Text>
                </View>
                <Text style={styles.partner}>Partner</Text>
              </View>
              <Press onPress={onClose} accessibilityLabel="Close menu" style={styles.closeBtn}>
                <X size={20} color={tw.gray500} />
              </Press>
            </View>

            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <LinearGradient colors={HT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileCard}>
                <View style={styles.glow} />
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <View style={styles.avatar}>
                    {avatar ? <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <User size={22} color="#fff" />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {user.name || formData?.full_name || formData?.owner_name || 'Partner'}
                    </Text>
                    <Text style={styles.email} numberOfLines={1}>
                      {user.email || formData?.email || 'Manage Account'}
                    </Text>
                  </View>
                </View>
                <Press onPress={() => handleNavigation('/hotel/partner/profile')} accessibilityLabel="Edit profile" style={styles.editBtn}>
                  <Edit3 size={14} color="#fff" />
                </Press>
              </LinearGradient>
            </View>

            <View style={{ paddingHorizontal: 20, gap: 20, paddingBottom: 128 }}>
              {MENU_GROUPS.map((group) => (
                <View key={group.title}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  <View style={{ gap: 4 }}>
                    {group.items.map((item) => (
                      <MenuItem key={item.label} {...item} onNavigate={handleNavigation} />
                    ))}
                  </View>
                </View>
              ))}

              <View style={styles.footer}>
                <Press onPress={handleLogout} accessibilityLabel="Log Out" style={styles.logout}>
                  <LogOut size={14} color={tw.red500} />
                  <Text style={styles.logoutText}>Log Out</Text>
                </Press>
                <Text style={styles.version}>Partner App • v1.0.0</Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  drawer: { height: '100%', backgroundColor: '#fff', ...shadow('2xl') },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 },
  brand: { fontSize: 18, lineHeight: 18, letterSpacing: -0.45, ...poppins(900) },
  partner: { fontSize: 9, lineHeight: 13, letterSpacing: 1.8, textTransform: 'uppercase', color: tw.gray400, marginTop: 4, ...poppins(700) },
  closeBtn: { padding: 8, borderRadius: 999, backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray100 },
  profileCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', overflow: 'hidden', ...shadow('lg') },
  glow: { position: 'absolute', top: -40, right: -40, width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.1)' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { fontSize: 16, lineHeight: 20, color: '#fff', ...poppins(700) },
  email: { fontSize: 10, lineHeight: 15, color: 'rgba(255,255,255,0.8)', marginTop: 2, ...poppins(400) },
  editBtn: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  groupTitle: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, marginBottom: 8, paddingLeft: 8, ...poppins(700) },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 10, borderRadius: 12 },
  menuIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: HT.primaryTint, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) },
  badge: { backgroundColor: HT.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 10, lineHeight: 15, color: '#fff', ...poppins(700) },
  footer: { paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100 },
  logout: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  logoutText: { fontSize: 12, lineHeight: 16, color: tw.red500, ...poppins(500) },
  version: { fontSize: 10, lineHeight: 15, color: tw.gray400, marginTop: 16, paddingHorizontal: 8, ...poppins(400) },
});

export { PartnerSidebar };
export default PartnerSidebar;
