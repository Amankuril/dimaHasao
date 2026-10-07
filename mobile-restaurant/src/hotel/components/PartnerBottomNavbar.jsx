import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Briefcase, UserCircle } from 'lucide-react-native';
import { useNavigate, useLocation } from '../../lib/webRouter';
import { Press } from '../../components/ui';
import { color, radii, space, type } from '../../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/components/PartnerBottomNavbar.jsx.
 * Three tabs, the active one on a primary/10 pill. Routes are the unified
 * app's /hotel/partner/<page> (the web's /hotel/<page> aliases redirect there).
 */
const NAV_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, route: '/hotel/partner/dashboard' },
  { name: 'Bookings', icon: Briefcase, route: '/hotel/partner/bookings' },
  { name: 'Profile', icon: UserCircle, route: '/hotel/partner/profile' },
];

export const PARTNER_NAV_HEIGHT = 68;

const PartnerBottomNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const insets = useSafeAreaInsets();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('dashboard') || path === '/hotel' || path === '/hotel/partner') return 'Dashboard';
    if (path.includes('bookings')) return 'Bookings';
    if (path.includes('profile')) return 'Profile';
    return '';
  };
  const activeTab = getActiveTab();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <View style={styles.row}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;
          return (
            <Press
              key={item.name}
              scale={1}
              onPress={() => navigate(item.route)}
              accessibilityLabel={item.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={styles.item}
            >
              {isActive ? <View style={styles.pill} /> : null}
              <Icon size={22} color={isActive ? color.goldOnDark : 'rgba(255,255,255,0.85)'} strokeWidth={isActive ? 2.5 : 2} />
              <Text style={[styles.label, { color: isActive ? color.goldOnDark : 'rgba(255,255,255,0.85)' }, isActive && { fontFamily: 'Poppins_600SemiBold' }]}>{item.name}</Text>
            </Press>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.primaryPressed,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(202,168,62,0.35)',
    paddingHorizontal: space.sm,
    boxShadow: '0 -8px 30px rgba(6,28,14,0.18)',
  },
  row: { height: PARTNER_NAV_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2, padding: space.xs },
  pill: { position: 'absolute', left: space.sm, right: space.sm, top: 6, bottom: 6, borderRadius: radii.md, backgroundColor: 'rgba(255,255,255,0.12)' },
  label: { ...type.caption },
});

export { PartnerBottomNavbar };
export default PartnerBottomNavbar;
