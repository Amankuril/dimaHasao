import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Heart, MapPin, Star, Trash2 } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { useProfile } from '../../context/ProfileContext';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { filterRestaurantsForVegMode } from '../../utils/vegMode';
import { EmptyState } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { PageBar } from '../../components/discovery/bits';
import { color, elevation, radii, space, type } from '../../../theme';

/**
 * Port of pages/user/CollectionDetail.jsx. The web has no collection API: the
 * page shows the user's favourites under the name "Collection <id>".
 */
export default function CollectionDetail() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const goBack = useAppBackNavigation();
  const { favorites, removeFavorite, vegMode, vegModeOption } = useProfile();
  const [collection, setCollection] = useState({ id, name: 'My Collection', dishes: 0, restaurants: 0, items: [] });

  const visibleFavorites = useMemo(() => filterRestaurantsForVegMode(favorites || [], { vegMode, vegModeOption }), [favorites, vegMode, vegModeOption]);

  useEffect(() => {
    setCollection((prev) => ({ ...prev, name: `Collection ${id}`, items: visibleFavorites, restaurants: visibleFavorites.length, dishes: 0 }));
  }, [id, visibleFavorites]);

  const handleRemove = (slug) => {
    Alert.alert('', 'Remove this restaurant from collection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'OK',
        onPress: () => {
          removeFavorite(slug);
          setCollection((prev) => ({ ...prev, items: prev.items.filter((item) => item.slug !== slug), restaurants: prev.restaurants - 1 }));
        },
      },
    ]);
  };

  if (collection.items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <PageBar title={collection.name} onBack={goBack} />
        <ScrollView contentContainerStyle={{ padding: space.lg }}>
          <View style={styles.emptyCard}>
            <EmptyState icon={Heart} title="This collection is empty" actionLabel="Explore restaurants" onAction={() => router.navigate('/food/user')} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PageBar title={collection.name} subtitle={`${collection.restaurants} ${collection.restaurants === 1 ? 'restaurant' : 'restaurants'}`} onBack={goBack} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}>
        {collection.items.map((r) => {
          const open = () => router.push(`/food/user/restaurants/${r.slug}`);
          return (
            <View key={r.slug} style={styles.card}>
              <Press scale={1} onPress={open} accessibilityLabel={r.name} style={{ height: 180 }}>
                <Image source={{ uri: r.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop&q=80' }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.45)', 'transparent']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
              </Press>
              <Press scale={0.9} onPress={() => handleRemove(r.slug)} accessibilityLabel="Remove from collection" style={styles.trash}>
                <Trash2 size={20} color={color.danger} />
              </Press>
              <Press scale={0.99} onPress={open} accessibilityRole="button" accessibilityLabel={`${r.name}, open menu`} style={{ padding: space.lg, gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
                  <Text style={styles.name} numberOfLines={2}>{r.name}</Text>
                  <View style={styles.rating}>
                    <Star size={13} color={color.goldText} fill={color.gold} strokeWidth={0} />
                    <Text style={styles.ratingText}>{r.rating || '4.5'}</Text>
                  </View>
                </View>
                <View style={styles.meta}>
                  <Clock size={14} color={color.textSecondary} />
                  <Text style={styles.metaText}>{r.deliveryTime || '25-30 mins'}</Text>
                  <Text style={styles.metaText}>·</Text>
                  <MapPin size={14} color={color.textSecondary} />
                  <Text style={styles.metaText}>{r.distance || '2.5 km'}</Text>
                </View>
                {r.cuisine ? <Text style={styles.metaText} numberOfLines={1}>{r.cuisine}</Text> : null}
              </Press>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyCard: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border },
  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.card },
  trash: { position: 'absolute', top: space.md, right: space.md, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...elevation.card },
  name: { flex: 1, ...type.heading, color: color.text },
  rating: { flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 26, paddingHorizontal: space.sm, borderRadius: radii.pill, backgroundColor: color.goldSoft, borderWidth: 1, borderColor: color.border },
  ratingText: { ...type.label, color: color.goldText },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, flexWrap: 'wrap' },
  metaText: { ...type.caption, color: color.textSecondary },
});
