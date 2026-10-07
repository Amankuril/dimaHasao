import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, BadgePercent, Clock, Star, Ticket } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { restaurantAPI } from '../../../api/food';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { useProfile } from '../../context/ProfileContext';
import { filterDishesForVegMode, matchesVegRestaurantFilter } from '../../utils/vegMode';
import { toast } from '../../../lib/notify';
import { DiscoveryHero, RestaurantGridSkeleton } from '../../components/discovery/bits';
import { EmptyState, SectionHeader, StatusBadge } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { color, elevation, radii, space, type } from '../../../theme';

/** Port of pages/user/Offers.jsx. */
export default function Offers() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const goBack = useAppBackNavigation();
  const [offers, setOffers] = useState([]);
  const [groupedOffers, setGroupedOffers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const showSkeleton = useDelayedLoading(loading);
  const { vegMode, vegModeOption } = useProfile();

  const visibleGroupedOffers = useMemo(() => {
    const entries = Object.entries(groupedOffers || {});
    if (!vegMode) return entries;
    return entries
      .map(([offerText, dishes]) => {
        const filtered = filterDishesForVegMode(dishes || [], vegMode).filter((dish) =>
          matchesVegRestaurantFilter({ pureVegRestaurant: dish?.pureVegRestaurant, hasNonVegMenu: dish?.hasNonVegMenu, isPureVeg: dish?.isPureVeg }, { vegMode, vegModeOption }),
        );
        return [offerText, filtered];
      })
      .filter(([, dishes]) => dishes.length > 0);
  }, [groupedOffers, vegMode, vegModeOption]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await restaurantAPI.getPublicOffers();
        const data = response?.data?.data;
        if (data) {
          setOffers(data.allOffers || []);
          setGroupedOffers(data.groupedByOffer || {});
        }
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || 'Failed to load offers';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [attempt]);

  const cardW = (width - space.lg * 2 - space.md) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}>
        <DiscoveryHero onBack={goBack} height={180} kicker="Offers" title="Great offers" tagline="Save big on your next meal!" />

        <View style={{ padding: space.lg, gap: space.xxl }}>
          {showSkeleton ? <RestaurantGridSkeleton count={4} compact /> : null}

          {error && !loading ? <EmptyState icon={AlertCircle} title={error} actionLabel="Retry" onAction={() => setAttempt((n) => n + 1)} /> : null}

          {!showSkeleton && !error ? (
            <>
              {visibleGroupedOffers.map(([offerText, dishes]) => (
                <View key={offerText}>
                  <SectionHeader title={offerText} />
                  <View style={styles.grid}>
                    {dishes.slice(0, 8).map((dish) => (
                      <Press key={dish.id} scale={0.98} onPress={() => router.push(`/food/user/restaurants/${dish.restaurantSlug}`)} accessibilityRole="button" accessibilityLabel={dish.restaurantName} style={[styles.tile, { width: cardW }]}>
                        <View style={styles.imgBox}>
                          <Image source={{ uri: dish.dishImage || dish.restaurantImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop' }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          <View style={styles.offerBadge}>
                            <BadgePercent size={12} color={color.onGold} />
                            <Text style={styles.offerBadgeText} numberOfLines={1}>{dish.offer}</Text>
                          </View>
                        </View>
                        <View style={styles.tileBody}>
                          <View style={styles.rating}>
                            <Star size={12} color={color.goldText} fill={color.gold} strokeWidth={0} />
                            <Text style={styles.ratingText}>{dish.restaurantRating?.toFixed(1) || '0.0'}</Text>
                          </View>
                          <Text style={styles.rName} numberOfLines={1}>{dish.restaurantName}</Text>
                          <Text style={styles.dName} numberOfLines={1}>{dish.dishName} - ₹{dish.discountedPrice}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                            <Clock size={12} color={color.textMuted} />
                            <Text style={styles.time}>{dish.deliveryTime}</Text>
                          </View>
                        </View>
                      </Press>
                    ))}
                  </View>
                </View>
              ))}

              {visibleGroupedOffers.length === 0 && offers.length > 0 ? (
                <View>
                  <SectionHeader title="Available coupons" />
                  <View style={{ gap: space.md }}>
                    {offers.map((o) => (
                      <View key={o.id || o.offerId} style={styles.coupon}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                          <View style={{ flexShrink: 1 }}>
                            <Text style={styles.cLabel}>Coupon</Text>
                            <Text style={styles.cCode}>{o.couponCode || '-'}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: space.xs, flexShrink: 1 }}>
                            <StatusBadge label={o.title || 'Offer'} tone="gold" icon={Ticket} />
                            {o.couponType === 'delivery' ? <StatusBadge label="Delivery only" tone="info" /> : null}
                            {o.couponType === 'takeaway' ? <StatusBadge label="Takeaway only" tone="warning" /> : null}
                          </View>
                        </View>
                        <Text style={styles.cBody}>
                          <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>Restaurant:</Text> {o.restaurantName || 'All Restaurants'}
                        </Text>
                        {o.endDate ? <Text style={styles.cValid}>Valid till: {new Date(o.endDate).toLocaleDateString()}</Text> : null}
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {offers.length === 0 && !loading ? <EmptyState icon={BadgePercent} title="No offers available at the moment" /> : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.card },
  imgBox: { height: 120, backgroundColor: color.surfaceMuted },
  offerBadge: { position: 'absolute', top: space.sm, left: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 24, paddingHorizontal: space.sm, borderRadius: radii.pill, backgroundColor: color.goldBright, maxWidth: '88%' },
  offerBadgeText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.onGold, flexShrink: 1 },
  tileBody: { padding: space.md, gap: space.xxs },
  rating: { flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start', height: 22, paddingHorizontal: space.sm, borderRadius: radii.pill, backgroundColor: color.goldSoft, marginBottom: space.xxs },
  ratingText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.goldText },
  rName: { ...type.bodyStrong, color: color.text },
  dName: { ...type.caption, fontFamily: 'Poppins_400Regular', color: color.textSecondary },
  time: { ...type.caption, color: color.textMuted },
  coupon: { borderWidth: 1, borderColor: color.border, borderRadius: radii.lg, padding: space.lg, gap: space.sm, backgroundColor: color.surface, ...elevation.card },
  cLabel: { ...type.caption, color: color.textMuted },
  cCode: { ...type.heading, color: color.text, letterSpacing: 0.5 },
  cBody: { ...type.small, color: color.textSecondary },
  cValid: { ...type.caption, color: color.textMuted },
});
