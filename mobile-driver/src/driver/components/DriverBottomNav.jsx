import { StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Briefcase, Bus, Car, History, Home, IndianRupee, Trophy, User, Users } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { localStore } from '../../lib/storage';
import { navigateTo } from '../../lib/webRouter';
import { outfit } from '../../theme';
import { DT } from '../ui/dt';
import { useDriverAppSettings } from '../hooks/useDriverAppSettings';

/*
 * Port of Taxi/modules/shared/components/DriverBottomNav.jsx. A white bar docked to the bottom edge with a hairline
 * top; the active tab is ink with a short bar above it, the rest muted. NAV_BAR_HEIGHT is how much a screen must leave clear.
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
          const tint = isActive ? DT.ink : DT.muted;
          return (
            <Press
              key={item.path}
              onPress={() => navigateTo(item.path)}
              scale={0.9}
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
              style={st.item}
            >
              {isActive ? <View style={st.activeBar} /> : null}
              <item.Icon size={20} strokeWidth={isActive ? 2 : 1.75} color={tint} />
              <Text numberOfLines={1} style={[st.label, { color: tint, ...outfit(isActive ? 600 : 500) }]}>
                {item.label}
              </Text>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    backgroundColor: DT.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DT.border,
  },
  nav: { height: 60, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'stretch' },
  item: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 2 },
  activeBar: { position: 'absolute', top: 0, width: 24, height: 2, borderRadius: 1, backgroundColor: DT.ink },
  label: { maxWidth: '100%', fontSize: 11, lineHeight: 14, textAlign: 'center' },
});
