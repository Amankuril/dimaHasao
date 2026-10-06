import { StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Briefcase, Bus, Car, History, Home, IndianRupee, Trophy, User, Users } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { localStore } from '../../lib/storage';
import { navigateTo } from '../../lib/webRouter';
import { outfit, tw } from '../../theme';
import { useDriverAppSettings } from '../hooks/useDriverAppSettings';

/* Port of Taxi/modules/shared/components/DriverBottomNav.jsx (fixed bottom bar of the driver screens). */

const isEnabledFlag = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(String(value || '').trim().toLowerCase());
};

/** Height the bar occupies (pt-2 + 68), plus the bottom inset: what a screen's `pb-28`/`pb-32` clears. */
export const NAV_BAR_HEIGHT = 76;

export default function DriverBottomNav() {
  const pathname = usePathname().replace(/\/+$/, '');
  const insets = useSafeAreaInsets();
  const { settings } = useDriverAppSettings();
  const role = String(localStore.getItem('role') || 'driver').toLowerCase();
  const isOwner = role === 'owner';
  const routePrefix = isOwner ? '/taxi/owner' : '/taxi/driver';
  const busEnabled = isEnabledFlag(settings.transportRide?.enable_bus_service);

  const navItems = isOwner
    ? [
        { Icon: Home, label: 'Dashboard', path: `${routePrefix}/dashboard` },
        { Icon: Users, label: 'Drivers', path: `${routePrefix}/manage-drivers` },
        { Icon: Car, label: 'Vehicle', path: `${routePrefix}/vehicle-fleet` },
        { Icon: Briefcase, label: 'Pooling', path: `${routePrefix}/pooling-vehicles` },
        ...(busEnabled ? [{ Icon: Bus, label: 'Bus', path: `${routePrefix}/bus-service` }] : []),
        { Icon: User, label: 'Account', path: `${routePrefix}/profile` },
      ]
    : [
        { Icon: Home, label: 'Home', path: `${routePrefix}/home` },
        { Icon: History, label: 'History', path: `${routePrefix}/history` },
        { Icon: IndianRupee, label: 'Wallet', path: `${routePrefix}/wallet` },
        { Icon: Trophy, label: 'Milestone', path: `${routePrefix}/incentives` },
        { Icon: User, label: 'Accounts', path: `${routePrefix}/profile` },
      ];

  return (
    <View style={[st.nav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={st.grid}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.path ||
            pathname.startsWith(`${item.path}/`) ||
            (item.path === `${routePrefix}/home` && pathname === `${routePrefix}/dashboard`);
          return (
            <Press
              key={item.path}
              onPress={() => navigateTo(item.path)}
              scale={1}
              accessibilityLabel={item.label}
              style={[st.item, isActive && st.itemActive]}
            >
              <View style={{ transform: [{ scale: isActive ? 1.05 : 1 }], opacity: isActive ? 1 : 0.8 }}>
                <item.Icon size={20} strokeWidth={isActive ? 2.5 : 2} color={isActive ? '#000000' : 'rgba(0,0,0,0.6)'} />
              </View>
              <Text
                numberOfLines={1}
                style={[st.label, { color: isActive ? '#000000' : 'rgba(0,0,0,0.6)', opacity: isActive ? 1 : 0.8, transform: [{ scale: isActive ? 1 : 0.95 }], ...outfit(isActive ? 900 : 700) }]}
              >
                {item.label}
              </Text>
              {isActive ? <View style={st.bar} /> : null}
            </Press>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  nav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: tw.slate100,
    boxShadow: '0 -10px 30px rgba(0,0,0,0.03)',
    zIndex: 50,
  },
  grid: { height: 68, flexDirection: 'row', alignItems: 'stretch', gap: 2 },
  item: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16, paddingHorizontal: 4 },
  itemActive: { backgroundColor: tw.slate50, transform: [{ translateY: -1 }] },
  label: { maxWidth: '100%', fontSize: 8, letterSpacing: 0.32, textTransform: 'uppercase', textAlign: 'center' },
  bar: { position: 'absolute', top: -8, width: 28, height: 2, borderRadius: 999, backgroundColor: tw.slate900 },
});
