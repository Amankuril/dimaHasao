import { useEffect, useMemo, useState } from 'react';
import { Image as RNImage, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, BadgePercent, Bookmark, Clock, Star, Utensils } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import apiClient from '../../../api/food';
import { API_ORIGIN } from '../../../api/client';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { useLocation } from '../../hooks/useLocation';
import { useZone } from '../../hooks/useZone';
import { useProfile } from '../../context/ProfileContext';
import { filterRestaurantsForVegMode } from '../../utils/vegMode';
import { toast } from '../../../lib/notify';
import { RestaurantGridSkeleton } from '../../components/discovery/bits';
import { F } from '../../components/shell';
import { poppins, tw } from '../../../theme';

const BANNER = require('../../../../assets/food/gourmet_banner.jpg');

const resolveImageUrl = (url) => {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(https?:|\/\/|data:|blob:)/i.test(trimmed)) return trimmed;
  return `${String(API_ORIGIN).replace(/\/$/, '')}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
};

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Port of pages/user/Gourmet.jsx. */
export default function Gourmet() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const goBack = useAppBackNavigation();
  const [favorites, setFavorites] = useState(new Set());
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const { location } = useLocation();
  const { zoneId } = useZone(location);
  const { vegMode, vegModeOption } = useProfile();
  const showSkeleton = useDelayedLoading(loading);

  const visible = useMemo(() => {
    let l = list;
    if (zoneId) l = l.filter((r) => !r.zoneId || String(r.zoneId) === String(zoneId));
    return filterRestaurantsForVegMode(l, { vegMode, vegModeOption });
  }, [list, vegMode, vegModeOption, zoneId]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get('/food/hero-banners/gourmet/public', zoneId ? { params: { zoneId } } : {});
        const data = response?.data?.data;
        setList(data?.restaurants ?? (Array.isArray(data) ? data : []));
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || 'Failed to load Gourmet restaurants';
        setError(message);
        toast.error(message);
        setList([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [zoneId, attempt]);

  const toggleFavorite = (id) =>
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}>
        <View style={{ height: height * 0.3, overflow: 'hidden', ...{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' } }}>
          <RNImage source={BANNER} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'transparent']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
          <Press scale={0.9} onPress={goBack} accessibilityLabel="Back" style={[styles.back, { top: 16 }]}>
            <ArrowLeft size={20} color="#fff" />
          </Press>
          <View style={styles.bannerText}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 32, height: 2, backgroundColor: F.green }} />
              <Text style={styles.kicker}>EXPERIENCE EXCELLENCE</Text>
            </View>
            <Text style={styles.h1}>Gourmet Dining</Text>
            <Text style={styles.sub}>Indulge in carefully curated premium dining from the city&apos;s finest restaurants.</Text>
          </View>
        </View>

        <View style={{ padding: 16, gap: 16 }}>
          <View style={styles.countRow}>
            <Text style={styles.count}>{showSkeleton ? '...' : visible.length} PREMIER ESTABLISHMENTS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.live} />
              <Text style={styles.liveText}>LIVE DEALS AVAILABLE</Text>
            </View>
          </View>

          {showSkeleton ? <RestaurantGridSkeleton count={4} /> : null}

          {error && !loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 80 }}>
              <Text style={{ color: tw.red500, textAlign: 'center', fontSize: 16, lineHeight: 24, ...poppins(400) }}>{error}</Text>
              <Press onPress={() => setAttempt((n) => n + 1)} accessibilityLabel="Retry" style={styles.retry}>
                <Text style={styles.retryText}>Retry</Text>
              </Press>
            </View>
          ) : null}

          {!showSkeleton && !error ? (
            visible.length === 0 ? (
              <Text style={styles.none}>No Gourmet restaurants available at the moment</Text>
            ) : (
              <View style={{ gap: 16 }}>
                {visible.map((item) => {
                  const restaurant = item.restaurant || item;
                  const slug = restaurant.slug || restaurant.restaurantName?.toLowerCase().replace(/\s+/g, '-') || restaurant.name?.toLowerCase().replace(/\s+/g, '-') || '';
                  const id = restaurant._id || restaurant.restaurantId || restaurant.id;
                  const fav = favorites.has(id);
                  let distanceStr = '1.2 km';
                  const rLat = restaurant.location?.latitude || restaurant.location?.coordinates?.[1];
                  const rLng = restaurant.location?.longitude || restaurant.location?.coordinates?.[0];
                  if (location?.latitude && location?.longitude && rLat && rLng) distanceStr = `${calculateDistance(location.latitude, location.longitude, rLat, rLng).toFixed(1)} km`;
                  else if (restaurant.distance) distanceStr = restaurant.distance;

                  const cover = restaurant.coverImages?.length > 0 ? restaurant.coverImages.map((i) => i.url || i).filter(Boolean) : [];
                  const menu = restaurant.menuImages?.length > 0 ? restaurant.menuImages.map((i) => i.url || i).filter(Boolean) : [];
                  const raw = cover.length > 0 ? cover[0] : menu.length > 0 ? menu[0] : restaurant.profileImage?.url || restaurant.profileImage || restaurant.image || '';
                  const img = resolveImageUrl(raw);

                  return (
                    <Press key={id} scale={0.98} onPress={() => router.push(`/food/user/restaurants/${slug}`)} accessibilityLabel={restaurant.restaurantName || restaurant.name} style={styles.card}>
                      <View style={{ height: 192, backgroundColor: tw.gray100 }}>
                        {img ? (
                          <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Utensils size={32} color={tw.gray200} />
                          </View>
                        )}
                        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.6)', 'transparent']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} />
                        <Press scale={0.9} onPress={() => toggleFavorite(id)} accessibilityLabel={fav ? 'Remove bookmark' : 'Bookmark'} style={styles.bookmark}>
                          <Bookmark size={20} color={fav ? '#fff' : 'rgba(255,255,255,0.8)'} fill={fav ? '#fff' : 'none'} />
                        </Press>
                        <View style={styles.ratingBadge}>
                          <Text style={styles.ratingText}>{restaurant.rating?.toFixed(1) || '4.0'}</Text>
                          <Star size={14} color={F.green} fill={F.green} />
                        </View>
                      </View>
                      <View style={{ padding: 20 }}>
                        <Text style={styles.name} numberOfLines={1}>{restaurant.restaurantName || restaurant.name}</Text>
                        <View style={styles.metaRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Clock size={16} color={F.green} strokeWidth={2.5} />
                            <Text style={styles.meta}>{restaurant.estimatedDeliveryTime || '25-30 mins'}</Text>
                          </View>
                          <Text style={{ color: tw.gray200 }}>•</Text>
                          <Text style={[styles.meta, { color: '#F87171', ...poppins(900) }]}>{distanceStr} away</Text>
                        </View>
                        {restaurant.offer ? (
                          <View style={styles.offer}>
                            <BadgePercent size={16} color={F.green} strokeWidth={3} />
                            <Text style={styles.offerText}>{String(restaurant.offer).toUpperCase()}</Text>
                          </View>
                        ) : (
                          <View style={styles.elite}>
                            <Text style={styles.eliteText}>ELITE SELECTION</Text>
                          </View>
                        )}
                      </View>
                    </Press>
                  );
                })}
              </View>
            )
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  bannerText: { position: 'absolute', bottom: 32, left: 24, right: 24, gap: 8 },
  kicker: { fontSize: 10, lineHeight: 15, letterSpacing: 3, color: 'rgba(255,255,255,0.8)', ...poppins(900) },
  h1: { fontSize: 30, lineHeight: 36, color: '#fff', ...poppins(900) },
  sub: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.7)', ...poppins(500) },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  count: { fontSize: 10, lineHeight: 15, letterSpacing: 2, color: tw.gray400, ...poppins(900) },
  live: { width: 6, height: 6, borderRadius: 3, backgroundColor: tw.green500 },
  liveText: { fontSize: 10, lineHeight: 15, color: tw.gray500, ...poppins(700) },
  retry: { marginTop: 16, backgroundColor: F.green, paddingHorizontal: 16, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 14, lineHeight: 20, ...poppins(500) },
  none: { textAlign: 'center', paddingVertical: 48, color: tw.gray500, fontSize: 16, lineHeight: 24, ...poppins(400) },
  card: { backgroundColor: '#fff', borderRadius: 32, overflow: 'hidden', ...{ boxShadow: '0 25px 50px -12px rgba(229,231,235,0.4)' } },
  bookmark: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  ratingBadge: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  ratingText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(900) },
  name: { fontSize: 20, lineHeight: 28, color: tw.gray900, marginBottom: 12, ...poppins(900) },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  meta: { fontSize: 12, lineHeight: 16, color: tw.gray500, letterSpacing: -0.3, ...poppins(700) },
  offer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(10,77,43,0.05)', borderRadius: 16, alignSelf: 'flex-start' },
  offerText: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: F.green, ...poppins(900) },
  elite: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: tw.gray50, borderRadius: 16, alignSelf: 'flex-start' },
  eliteText: { fontSize: 10, lineHeight: 15, letterSpacing: 1.5, color: tw.gray400, ...poppins(900) },
});
