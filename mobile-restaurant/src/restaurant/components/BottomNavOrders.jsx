import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, FileText, MessageSquare, Package } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { color, elevation, radii, space, type } from '../../theme';
import useNotificationInbox from '../hooks/useNotificationInbox';
import { useRestaurantNotifications } from '../hooks/useRestaurantNotifications';

const BASE = '/food/restaurant';
const TABS = [
  { id: 'orders', label: 'Orders', icon: FileText, route: BASE },
  { id: 'inventory', label: 'Inventory', icon: Package, route: `${BASE}/inventory` },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, route: `${BASE}/feedback` },
  { id: 'explore', label: 'Explore', icon: Compass, route: `${BASE}/explore` },
];

const findActiveTab = (pathname) =>
  TABS.slice()
    .sort((a, b) => b.route.length - a.route.length)
    .find((tab) => pathname === tab.route || pathname.startsWith(`${tab.route}/`));

/** Space a scrolling screen leaves so its last row clears the floating bar. */
export const BOTTOM_NAV_HEIGHT = 76;

/** Port of Food/components/restaurant/BottomNavOrders.jsx: the floating pill with the four main destinations. */
export default function BottomNavOrders({ activeTabOverride }) {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { unreadCount } = useNotificationInbox('restaurant', { limit: 20, pollMs: 60 * 1000 });
  const { newOrder, newReservation } = useRestaurantNotifications();
  const activeTab = useMemo(() => activeTabOverride || findActiveTab(pathname)?.id || 'orders', [pathname, activeTabOverride]);

  if (pathname.includes('/create-offers') || pathname.includes('/help-centre/support')) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(12, insets.bottom) }]}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const dot = (tab.id === 'orders' && (newOrder || newReservation)) || (tab.id === 'feedback' && unreadCount > 0);
          const tint = isActive ? color.goldOnDark : 'rgba(255,255,255,0.85)';
          return (
            <Press
              key={tab.id}
              onPress={() => {
                if (tab.route !== pathname) navigate(tab.route);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={dot ? `${tab.label}, new` : tab.label}
              style={[styles.tab, isActive ? styles.tabActive : null]}
            >
              <Icon size={20} color={tint} />
              {dot ? <View style={styles.dot} /> : null}
              <Text style={[styles.label, { color: tint }, isActive && styles.labelOn]} numberOfLines={1}>{tab.label}</Text>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.md, zIndex: 40 },
  bar: { width: '100%', maxWidth: 448, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space.xs, borderRadius: radii.pill, backgroundColor: color.primaryPressed, borderWidth: 1, borderColor: 'rgba(202,168,62,0.35)', padding: space.xs + 2, ...elevation.float },
  tab: { flex: 1, minWidth: 0, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radii.pill, paddingHorizontal: space.xs },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  label: { ...type.caption },
  labelOn: { fontFamily: 'Poppins_600SemiBold' },
  dot: { position: 'absolute', top: 6, right: '28%', width: 10, height: 10, borderRadius: 5, backgroundColor: color.goldBright, borderWidth: 2, borderColor: color.primaryPressed },
});
