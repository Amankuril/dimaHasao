import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, BadgePercent, Bookmark, ChefHat, Clock, MapPin, Star, Utensils } from 'lucide-react-native';
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
import { DiscoveryHero, RestaurantGridSkeleton } from '../../components/discovery/bits';
import { EmptyState, StatusBadge } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { color, elevation, radii, space, type } from '../../../theme';

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
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}>
        <DiscoveryHero
          image={BANNER}
          onBack={goBack}
          height={220}
          kicker="Experience excellence"
          title="Gourmet dining"
          tagline="Indulge in carefully curated premium dining from the city's finest restaurants."
        />

        <View style={{ padding: space.lg, gap: space.lg }}>
          <View style={styles.countRow}>
            <Text style={styles.count}>{showSkeleton ? '...' : visible.length} premier establishments</Text>
            <View style={styles.liveRow}>
              <View style={styles.live} />
              <Text style={styles.liveText}>Live deals available</Text>
            </View>
          </View>

          {showSkeleton ? <RestaurantGridSkeleton count={4} /> : null}

          {error && !loading ? <EmptyState icon={AlertCircle} title={error} actionLabel="Retry" onAction={() => setAttempt((n) => n + 1)} /> : null}

          {!showSkeleton && !error ? (
            visible.length === 0 ? (
              <EmptyState icon={ChefHat} title="No Gourmet restaurants available at the moment" />
            ) : (
              <View style={{ gap: space.lg }}>
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
                  const name = restaurant.restaurantName || restaurant.name;
                  const open = () => router.push(`/food/user/restaurants/${slug}`);

                  return (
                    <View key={id} style={styles.card}>
                      <Press scale={1} onPress={open} accessibilityLabel={name} style={styles.photo}>
                        {img ? (
                          <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Utensils size={32} color={color.textDisabled} />
                          </View>
                        )}
                        <View pointerEvents="none" style={styles.ratingBadge}>
                          <Star size={13} color={color.gold} fill={color.gold} strokeWidth={0} />
                          <Text style={styles.ratingText}>{restaurant.rating?.toFixed(1) || '4.0'}</Text>
                        </View>
                      </Press>
                      <Press scale={0.9} onPress={() => toggleFavorite(id)} accessibilityRole="button" accessibilityState={{ selected: fav }} accessibilityLabel={fav ? 'Remove bookmark' : 'Bookmark'} style={[styles.bookmark, fav ? styles.bookmarkOn : null]}>
                        <Bookmark size={20} color={fav ? color.onPrimary : color.text} fill={fav ? color.onPrimary : 'none'} />
                      </Press>
                      <Press scale={0.99} onPress={open} accessibilityRole="button" accessibilityLabel={`${name}, open menu`} style={styles.body}>
                        <Text style={styles.name} numberOfLines={2}>{name}</Text>
                        <View style={styles.metaRow}>
                          <Clock size={14} color={color.textSecondary} />
                          <Text style={styles.meta}>{restaurant.estimatedDeliveryTime || '25-30 mins'}</Text>
                          <Text style={styles.meta}>·</Text>
                          <MapPin size={14} color={color.textSecondary} />
                          <Text style={styles.meta}>{distanceStr} away</Text>
                        </View>
                        {restaurant.offer ? (
                          <StatusBadge label={String(restaurant.offer)} tone="gold" icon={BadgePercent} style={{ marginTop: space.sm }} />
                        ) : (
                          <StatusBadge label="Elite selection" tone="neutral" icon={ChefHat} style={{ marginTop: space.sm }} />
                        )}
                      </Press>
                    </View>
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
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  count: { ...type.label, color: color.textSecondary },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  live: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.goldBright },
  liveText: { ...type.caption, color: color.textMuted },
  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.card },
  photo: { height: 184, backgroundColor: color.surfaceMuted },
  bookmark: { position: 'absolute', top: space.md, right: space.md, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...elevation.card },
  bookmarkOn: { backgroundColor: color.primary },
  ratingBadge: { position: 'absolute', bottom: space.md, left: space.md, flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 28, paddingHorizontal: space.sm + 2, borderRadius: radii.pill, backgroundColor: 'rgba(17,17,17,0.78)' },
  ratingText: { ...type.label, color: color.textInverse },
  body: { padding: space.lg, gap: space.xs },
  name: { ...type.heading, color: color.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, flexWrap: 'wrap' },
  meta: { ...type.caption, color: color.textSecondary },
});
