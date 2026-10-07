import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { History, LayoutGrid, Package, User as UserIcon, Wallet } from 'lucide-react-native';
import { useDeliveryStore, dedupeOrdersByIdentity } from '../../delivery/store/useDeliveryStore';
import { Press } from '../ui';
import { color, radii, space, type } from '../../theme';

/*
 * The (tabs) tab bar. Five equal-width tabs; the active one is brand green
 * with a tinted pill behind the icon, the rest a readable grey. Each tab is
 * the full column (>= 56 px tall), so it is easy to hit on the move.
 */
const TABS = [
  { key: 'feed', label: 'Feed', Icon: LayoutGrid, href: '/food/delivery' },
  { key: 'orders', label: 'Orders', Icon: Package, href: '/food/delivery/orders' },
  { key: 'pocket', label: 'Pocket', Icon: Wallet, href: '/food/delivery/pocket' },
  { key: 'history', label: 'History', Icon: History, href: '/food/delivery/history' },
  { key: 'profile', label: 'Profile', Icon: UserIcon, href: '/food/delivery/profile' },
];

const ROUTE_TO_TAB = { index: 'feed', orders: 'orders', pocket: 'pocket', history: 'history', profile: 'profile' };

export function DeliveryBottomNav({ currentTab = 'feed' }) {
  const insets = useSafeAreaInsets();
  const newOrders = useDeliveryStore((state) => state.newOrders);
  const newOrdersCount = useMemo(() => dedupeOrdersByIdentity(newOrders).length, [newOrders]);

  return (
    <View style={[styles.bar, { paddingBottom: space.sm + insets.bottom }]} accessibilityRole="tablist">
      {TABS.map(({ key, label, Icon, href }) => {
        const active = currentTab === key;
        const tint = active ? color.primary : color.textMuted;
        const badge = key === 'orders' && newOrdersCount > 0 ? newOrdersCount : 0;
        return (
          <Press
            key={key}
            scale={0.94}
            onPress={() => router.navigate(href)}
            accessibilityRole="tab"
            accessibilityLabel={badge ? `${label}, ${badge} new` : label}
            accessibilityState={{ selected: active }}
            style={styles.tab}
          >
            <View style={[styles.iconPill, active && styles.iconPillOn]}>
              <Icon size={22} color={tint} strokeWidth={active ? 2.4 : 2} />
              {badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color: tint }, active && styles.labelOn]} numberOfLines={1}>
              {label}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

/** Adapter for <Tabs tabBar={...}>. */
export function DeliveryTabBar({ state }) {
  const routeName = state.routes[state.index]?.name;
  return <DeliveryBottomNav currentTab={ROUTE_TO_TAB[routeName] || 'feed'} />;
}

export default DeliveryBottomNav;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.borderStrong,
    paddingHorizontal: space.xs,
    paddingTop: space.sm,
    flexDirection: 'row',
    zIndex: 200,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 56, justifyContent: 'center' },
  iconPill: { width: 56, height: 32, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  iconPillOn: { backgroundColor: color.primarySoft },
  label: { ...type.caption },
  labelOn: { fontFamily: 'NunitoSans_800ExtraBold' },
  badge: {
    position: 'absolute',
    top: -2,
    right: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: color.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.surface,
  },
  badgeText: { color: color.textInverse, fontSize: 12, lineHeight: 14, fontFamily: 'NunitoSans_800ExtraBold' },
});
