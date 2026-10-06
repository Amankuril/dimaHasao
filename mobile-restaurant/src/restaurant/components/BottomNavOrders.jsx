import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Compass, FileText, MessageSquare, Package } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { poppins, shadow } from '../../theme';
import useNotificationInbox from '../hooks/useNotificationInbox';
import { useRestaurantNotifications } from '../hooks/useRestaurantNotifications';
import { RT_GRADIENT } from '../theme';

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
      <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bar}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const dot = (tab.id === 'orders' && (newOrder || newReservation)) || (tab.id === 'feedback' && unreadCount > 0);
          const color = isActive ? '#fff' : 'rgba(255,255,255,0.78)';
          return (
            <Press
              key={tab.id}
              onPress={() => {
                if (tab.route !== pathname) navigate(tab.route);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              style={[styles.tab, isActive ? styles.tabActive : null]}
            >
              <Icon size={18} color={color} />
              {dot ? <View style={styles.dot} /> : null}
              <Text style={[styles.label, { color }]} numberOfLines={1}>{tab.label}</Text>
            </Press>
          );
        })}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 8, zIndex: 40 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: 4, borderRadius: 30, paddingVertical: 8, paddingLeft: 12, paddingRight: 8, ...shadow('0 16px 40px rgba(126,56,102,0.35)') },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 8 },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  label: { fontSize: 11, lineHeight: 12, ...poppins(400) },
  dot: { position: 'absolute', top: 8, right: '25%', width: 8, height: 8, borderRadius: 4, backgroundColor: RT_GRADIENT[0], borderWidth: 1, borderColor: RT_GRADIENT[0] },
});
