import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { History, LayoutGrid, Package, User as UserIcon, Wallet } from 'lucide-react-native';
import { useDeliveryStore, dedupeOrdersByIdentity } from '../../delivery/store/useDeliveryStore';
import { Press } from '../ui';
import { display, poppins, shadow, tw } from '../../theme';

/*
 * Port of components/DeliveryBottomNav.jsx, used as the (tabs) tab bar.
 * `bg-white border-t border-gray-100 px-4 py-3 pb-6`, five buttons; the
 * active one is gray-950 and scale-110, the rest gray-400 at 70 % opacity.
 * The bottom padding adds the safe-area inset (permitted difference 1).
 */
const TABS = [
  { key: 'feed', label: 'Feed', Icon: LayoutGrid, href: '/food/delivery' },
  { key: 'orders', label: 'Orders', Icon: Package, href: '/food/delivery/orders' },
  { key: 'pocket', label: 'Pocket', Icon: Wallet, href: '/food/delivery/pocket' },
  { key: 'history', label: 'Trip History', Icon: History, href: '/food/delivery/history' },
  { key: 'profile', label: 'Profile', Icon: UserIcon, href: '/food/delivery/profile' },
];

const ROUTE_TO_TAB = { index: 'feed', orders: 'orders', pocket: 'pocket', history: 'history', profile: 'profile' };

export function DeliveryBottomNav({ currentTab = 'feed' }) {
  const insets = useSafeAreaInsets();
  const newOrders = useDeliveryStore((state) => state.newOrders);
  const newOrdersCount = useMemo(() => dedupeOrdersByIdentity(newOrders).length, [newOrders]);

  return (
    <View style={[styles.bar, shadow('navTop'), { paddingBottom: 24 + insets.bottom }]}>
      {TABS.map(({ key, label, Icon, href }) => {
        const active = currentTab === key;
        const color = active ? tw.gray950 : tw.gray400;
        return (
          <Press
            key={key}
            scale={1}
            onPress={() => router.navigate(href)}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            hitSlop={8}
            style={[styles.tab, active ? styles.active : styles.inactive]}
          >
            <Icon size={24} color={color} strokeWidth={2} />
            <Text style={[styles.label, { color }]}>{label}</Text>
            {key === 'orders' && newOrdersCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{newOrdersCount > 9 ? '9+' : newOrdersCount}</Text>
              </View>
            ) : null}
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
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: tw.gray100,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 200,
  },
  tab: { alignItems: 'center', gap: 4 },
  active: { transform: [{ scale: 1.1 }] },
  inactive: { opacity: 0.7 },
  // text-[11px] font-medium; `font-sans` loses to the theme's inherit rule,
  // and DeliveryHomeV2's root has no font-poppins class, so this is Poppins.
  label: { fontSize: 11, lineHeight: 16.5, ...poppins(500) },
  badge: {
    position: 'absolute',
    top: -4,
    right: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: tw.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  // font-black -> Sora
  badgeText: { fontSize: 9, lineHeight: 11, color: '#fff', ...display(900, 9) },
});
