import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Copy, TicketPercent } from 'lucide-react-native';
import { toast } from '../../../lib/notify';
import { navigateTo } from '../../../lib/webRouter';
import { restaurantAPI } from '../../../api/food';
import { Button, EmptyState, StatusBadge } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { PageHeader } from '../../components/profile/ProfileChrome';
import { color, elevation, radii, space, type } from '../../../theme';

/** Port of pages/user/profile/Coupons.jsx. */
export default function Coupons() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await restaurantAPI.getPublicOffers();
        const list = res?.data?.data?.allOffers || res?.data?.allOffers || [];
        if (!cancelled) setOffers(Array.isArray(list) ? list.filter((o) => o?.showInCart !== false) : []);
      } catch {
        if (!cancelled) setOffers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedOffers = useMemo(() => [...offers].sort((a, b) => String(a?.couponCode || '').localeCompare(String(b?.couponCode || ''))), [offers]);

  const handleCopy = async (code) => {
    const value = String(code || '').trim();
    if (!value) return;
    try {
      await Clipboard.setStringAsync(value);
      toast.success('Coupon copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const minH = { minHeight: height * 0.6 };

  const renderOffer = ({ item: offer }) => {
    const code = offer?.couponCode || '';
    const title = offer?.title || '';
    const restaurantName = offer?.restaurantName || 'All Restaurants';
    const endDate = offer?.endDate ? new Date(offer.endDate) : null;
    const expiryText = endDate && !Number.isNaN(endDate.getTime()) ? `Valid till ${endDate.toLocaleDateString()}` : 'No expiry';
    return (
      <View style={styles.offer}>
        <View style={styles.offerIcon}>
          <TicketPercent size={22} color={color.goldText} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
          <Text style={styles.code} selectable>
            {code}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' }}>
            {title ? <StatusBadge label={title} tone="gold" /> : null}
            {offer.couponType === 'delivery' ? <StatusBadge label="Delivery Only" tone="primary" /> : null}
            {offer.couponType === 'takeaway' ? <StatusBadge label="Takeaway Only" tone="neutral" /> : null}
          </View>
          <Text style={styles.rest} numberOfLines={1}>
            {restaurantName}
          </Text>
          <Text style={styles.expiry}>{expiryText}</Text>
        </View>
        <Button title="Copy" icon={Copy} variant="secondary" size="sm" fullWidth={false} onPress={() => handleCopy(code)} accessibilityLabel={`Copy ${code}`} style={{ minHeight: 44 }} />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PageHeader title="Your coupons" onBack={() => navigateTo('/user/profile')} />
      {loading ? (
        <View style={[{ alignItems: 'center', justifyContent: 'center', gap: space.md }, minH]} accessibilityRole="progressbar">
          <ActivityIndicator color={color.primary} />
          <Text style={styles.loading}>Loading coupons...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedOffers}
          keyExtractor={(offer, i) => String(offer?.id || offer?.offerId || offer?.couponCode || i)}
          renderItem={renderOffer}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={{ padding: space.lg, paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={[{ justifyContent: 'center' }, minH]}>
              <EmptyState icon={TicketPercent} title="No coupons found" message="Discover hidden coupons on your map screen after placing an order" />
            </View>
          }
        />
      )}
    </View>
  );
}

const Separator = () => <View style={{ height: space.md }} />;

const styles = StyleSheet.create({
  loading: { ...type.body, color: color.textMuted },
  offer: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, padding: space.lg, ...elevation.card },
  offerIcon: { height: 44, width: 44, borderRadius: radii.md, backgroundColor: color.goldSoft, alignItems: 'center', justifyContent: 'center' },
  code: { ...type.subheading, color: color.text, letterSpacing: 0.5 },
  rest: { ...type.small, color: color.textSecondary },
  expiry: { ...type.caption, color: color.textMuted },
});
