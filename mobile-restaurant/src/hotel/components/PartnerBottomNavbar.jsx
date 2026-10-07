import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Briefcase, UserCircle } from 'lucide-react-native';
import { useNavigate, useLocation } from '../../lib/webRouter';
import { Press } from '../../components/ui';
import { poppins, tw } from '../../theme';
import { HT } from '../theme';

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
              accessibilityState={{ selected: isActive }}
              style={styles.item}
            >
              {isActive ? <View style={styles.pill} /> : null}
              <Icon
                size={22}
                color={isActive ? HT.primary : tw.gray400}
                fill={isActive ? HT.primary : 'none'} /* fill-[#005CA8]/10: partnerTheme.css repaints every fill-[#005CA8]* as solid primary (alpha dropped) */
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text style={[styles.label, { color: isActive ? HT.primary : tw.gray400 }]}>{item.name}</Text>
            </Press>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(243,244,246,0.8)',
    paddingHorizontal: 8,
    boxShadow: '0 -8px 30px rgba(0,0,0,0.08)',
  },
  row: { height: PARTNER_NAV_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4 },
  pill: { position: 'absolute', left: 8, right: 8, top: 6, bottom: 6, borderRadius: 12, backgroundColor: HT.primarySoft },
  label: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, ...poppins(700) },
});

export { PartnerBottomNavbar };
export default PartnerBottomNavbar;
