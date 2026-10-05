import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import { ArrowLeft, Clock, Star } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { restaurantAPI } from '../../../api/food';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { useProfile } from '../../context/ProfileContext';
import { filterDishesForVegMode, matchesVegRestaurantFilter } from '../../utils/vegMode';
import { toast } from '../../../lib/notify';
import { RestaurantGridSkeleton } from '../../components/discovery/bits';
import { F } from '../../components/shell';
import { poppins, tw } from '../../../theme';

/** The web's offerpagebanner.svg, drawn with react-native-svg. */
function OfferBanner({ width, height }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice">
      <Rect width={1200} height={400} rx={32} fill="#FF4C4C" />
      <SvgText x="600" y="180" textAnchor="middle" alignmentBaseline="middle" fontSize="72" fontWeight="bold" fill="#fff">Great Offers</SvgText>
      <SvgText x="600" y="240" textAnchor="middle" alignmentBaseline="middle" fontSize="32" fill="#fff">Save big on your next meal!</SvgText>
      <Circle cx={1100} cy={80} r={60} fill="#fff" fillOpacity={0.15} />
      <Circle cx={100} cy={320} r={40} fill="#fff" fillOpacity={0.1} />
      <Rect x={900} y={250} width={180} height={80} rx={24} fill="#fff" fillOpacity={0.18} />
    </Svg>
  );
}

/** Port of pages/user/Offers.jsx. */
export default function Offers() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
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

  const bannerH = Math.max(height * 0.25, 0);
  const cardW = (width - 32 - 16) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}>
        <View style={{ height: bannerH, overflow: 'hidden' }}>
          <OfferBanner width={width} height={bannerH} />
          <Press scale={0.9} onPress={goBack} accessibilityLabel="Back" style={[styles.back, { top: 16 }]}>
            <ArrowLeft size={20} color="#fff" />
          </Press>
        </View>

        <View style={{ padding: 16, gap: 24 }}>
          {showSkeleton ? <RestaurantGridSkeleton count={4} compact /> : null}

          {error && !loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 80 }}>
              <Text style={{ color: tw.red500, textAlign: 'center', fontSize: 16, lineHeight: 24, ...poppins(400) }}>{error}</Text>
              <Press onPress={() => setAttempt((n) => n + 1)} accessibilityLabel="Retry" style={styles.retry}>
                <Text style={styles.retryText}>Retry</Text>
              </Press>
            </View>
          ) : null}

          {!showSkeleton && !error ? (
            <>
              {visibleGroupedOffers.map(([offerText, dishes]) => (
                <View key={offerText}>
                  <Text style={styles.groupTitle}>{offerText}</Text>
                  <View style={styles.grid}>
                    {dishes.slice(0, 8).map((dish) => (
                      <Press key={dish.id} scale={0.98} onPress={() => router.push(`/food/user/restaurants/${dish.restaurantSlug}`)} accessibilityLabel={dish.restaurantName} style={{ width: cardW }}>
                        <View style={styles.imgBox}>
                          <Image source={{ uri: dish.dishImage || dish.restaurantImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop' }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          <View style={styles.offerBadge}>
                            <Text style={styles.offerBadgeText}>{dish.offer}</Text>
                          </View>
                        </View>
                        <View style={styles.rating}>
                          <Text style={styles.ratingText}>{dish.restaurantRating?.toFixed(1) || '0.0'}</Text>
                          <Star size={10} color="#fff" fill="#fff" />
                        </View>
                        <Text style={styles.rName} numberOfLines={1}>{dish.restaurantName}</Text>
                        <Text style={styles.dName} numberOfLines={1}>{dish.dishName} - ₹{dish.discountedPrice}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} color={tw.gray500} />
                          <Text style={styles.time}>{dish.deliveryTime}</Text>
                        </View>
                      </Press>
                    ))}
                  </View>
                </View>
              ))}

              {visibleGroupedOffers.length === 0 && offers.length > 0 ? (
                <View style={{ gap: 16 }}>
                  <Text style={styles.coupons}>Available Coupons</Text>
                  {offers.map((o) => (
                    <View key={o.id || o.offerId} style={styles.coupon}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                        <View style={{ flexShrink: 1 }}>
                          <Text style={styles.cLabel}>Coupon</Text>
                          <Text style={styles.cCode}>{o.couponCode || '-'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <View style={styles.cTitle}>
                            <Text style={styles.cTitleText}>{o.title || 'Offer'}</Text>
                          </View>
                          {o.couponType === 'delivery' ? (
                            <View style={[styles.pill, { backgroundColor: tw.emerald100 }]}>
                              <Text style={[styles.pillText, { color: tw.emerald700 }]}>Delivery Only</Text>
                            </View>
                          ) : null}
                          {o.couponType === 'takeaway' ? (
                            <View style={[styles.pill, { backgroundColor: tw.orange100 }]}>
                              <Text style={[styles.pillText, { color: tw.orange700 }]}>Takeaway Only</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <Text style={styles.cBody}>
                        <Text style={poppins(600)}>Restaurant:</Text> {o.restaurantName || 'All Restaurants'}
                      </Text>
                      {o.endDate ? <Text style={styles.cValid}>Valid till: {new Date(o.endDate).toLocaleDateString()}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : null}

              {offers.length === 0 && !loading ? <Text style={styles.none}>No offers available at the moment</Text> : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(30,41,57,0.6)', alignItems: 'center', justifyContent: 'center' },
  retry: { marginTop: 16, backgroundColor: F.green, paddingHorizontal: 16, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 14, lineHeight: 20, ...poppins(500) },
  groupTitle: { fontSize: 24, lineHeight: 32, color: tw.red500, textAlign: 'center', marginBottom: 16, letterSpacing: 0.6, ...poppins(900) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  imgBox: { height: 128, borderRadius: 12, overflow: 'hidden', marginBottom: 8, backgroundColor: tw.gray100 },
  offerBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: tw.blue600, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  offerBadgeText: { color: '#fff', fontSize: 10, lineHeight: 16, ...poppins(600) },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', backgroundColor: tw.green600, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
  ratingText: { color: '#fff', fontSize: 12, lineHeight: 16, ...poppins(700) },
  rName: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  dName: { fontSize: 12, lineHeight: 16, color: tw.gray600, marginBottom: 4, ...poppins(400) },
  time: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  coupons: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  coupon: { borderWidth: 1, borderColor: tw.slate200, borderRadius: 12, padding: 16, gap: 8, backgroundColor: '#fff' },
  cLabel: { fontSize: 12, lineHeight: 16, color: tw.slate500, ...poppins(400) },
  cCode: { fontSize: 18, lineHeight: 28, color: tw.slate900, letterSpacing: 0.45, ...poppins(800) },
  cTitle: { backgroundColor: tw.blue600, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cTitleText: { color: '#fff', fontSize: 12, lineHeight: 16, ...poppins(600) },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillText: { fontSize: 10, lineHeight: 15, ...poppins(500) },
  cBody: { fontSize: 14, lineHeight: 20, color: tw.slate700, ...poppins(400) },
  cValid: { fontSize: 12, lineHeight: 16, color: tw.slate500, ...poppins(400) },
  none: { textAlign: 'center', paddingVertical: 48, color: tw.gray500, fontSize: 16, lineHeight: 24, ...poppins(400) },
});
