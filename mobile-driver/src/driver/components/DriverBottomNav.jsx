import { StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Briefcase, Bus, Car, History, Home, IndianRupee, Trophy, User, Users } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { localStore } from '../../lib/storage';
import { navigateTo } from '../../lib/webRouter';
import { outfit, shadow } from '../../theme';
import { DT } from '../ui/dt';
import { useDriverAppSettings } from '../hooks/useDriverAppSettings';

/*
 * Port of Taxi/modules/shared/components/DriverBottomNav.jsx. Drawn in the user app's taxi style: a floating deep-green pill
 * with a gold active icon and label. NAV_BAR_HEIGHT is how much a screen must leave clear at the bottom.
 */

const isEnabledFlag = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(String(value || '').trim().toLowerCase());
};

/** Height the bar occupies (pt-2 + 68), plus the bottom inset: what a screen's `pb-28`/`pb-32` clears. */
export const NAV_BAR_HEIGHT = 92;

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
    <View pointerEvents="box-none" style={[st.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={st.nav}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.path ||
            pathname.startsWith(`${item.path}/`) ||
            (item.path === `${routePrefix}/home` && pathname === `${routePrefix}/dashboard`);
          const tint = isActive ? DT.accent : 'rgba(255,255,255,0.78)';
          return (
            <Press
              key={item.path}
              onPress={() => navigateTo(item.path)}
              scale={0.9}
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
              style={[st.item, isActive && st.itemActive]}
            >
              <item.Icon size={20} strokeWidth={isActive ? 2.6 : 2} color={tint} />
              {/* literal upper case with a minWidth: Android clips the last letter of letter-spaced, text-transformed labels */}
              <Text numberOfLines={1} style={[st.label, { color: tint, ...outfit(isActive ? 800 : 600) }]}>
                {item.label.toUpperCase()}
              </Text>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, zIndex: 50 },
  nav: {
    height: 64,
    borderRadius: DT.radius.pill,
    backgroundColor: DT.brand,
    borderWidth: 1,
    borderColor: 'rgba(202,168,62,0.35)',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow('xl'),
  },
  item: { flex: 1, minWidth: 0, height: 52, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: DT.radius.pill, paddingHorizontal: 2 },
  itemActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  label: { maxWidth: '100%', minWidth: 30, fontSize: 8.5, lineHeight: 11, letterSpacing: 0.3, textAlign: 'center' },
});
