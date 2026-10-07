import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Bookmark, Clock, Heart, MapPin, Star } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { confirm, toast } from '../../../lib/notify';
import { navigateTo, useLocation } from '../../../lib/webRouter';
import { useProfile } from '../../context/ProfileContext';
import { filterDishesForVegMode, filterRestaurantsForVegMode } from '../../utils/vegMode';
import { Button, EmptyState, SegmentedControl } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { PageHeader } from '../../components/profile/ProfileChrome';
import { color, elevation, radii, space, type } from '../../../theme';

const SCRIM = ['rgba(6,44,22,0.55)', 'rgba(6,44,22,0)', 'rgba(6,44,22,0)'];

const FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop&q=80';

function Thumb({ uri, style }) {
  const [failed, setFailed] = useState(false);
  return <Image source={{ uri: !failed && uri ? uri : FALLBACK }} onError={() => setFailed(true)} style={style} resizeMode="cover" />;
}

function ViewButton({ label, onPress }) {
  return <Button title={label} iconRight={ArrowRight} size="sm" onPress={onPress} accessibilityLabel={label} style={{ minHeight: 40 }} />;
}

function EmptyBlock({ Icon, text, button }) {
  return <EmptyState icon={Icon} title={text} actionLabel={button} onAction={() => navigateTo('/user')} />;
}

/** Port of pages/user/profile/Favorites.jsx. */
export default function Favorites() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const location = useLocation();
  const from = location.state?.from || '/food/user/profile';
  const { favorites, dishFavorites: allDishFavorites, removeFavorite, removeDishFavorite, vegMode, vegModeOption } = useProfile();
  const restaurantFavorites = useMemo(() => filterRestaurantsForVegMode(favorites || [], { vegMode, vegModeOption }), [favorites, vegMode, vegModeOption]);
  const dishFavorites = useMemo(() => filterDishesForVegMode(allDishFavorites || [], vegMode), [allDishFavorites, vegMode]);
  const [activeTab, setActiveTab] = useState('restaurants');
  const cardWidth = Math.floor((width - space.lg * 2 - space.md) / 2);

  const handleRemoveFavorite = async (slug) => {
    if (await confirm('Remove this restaurant from favorites?', '', { confirmText: 'OK' })) {
      removeFavorite(slug);
      toast.success('Restaurant removed from favorites');
    }
  };
  const handleRemoveDishFavorite = async (dishId, restaurantId) => {
    if (await confirm('Remove this dish from favorites?', '', { confirmText: 'OK' })) {
      removeDishFavorite(dishId, restaurantId);
      toast.success('Dish removed from favorites');
    }
  };

  const totalFavorites = restaurantFavorites.length + dishFavorites.length;
  const onBack = () => navigateTo(from);
  const bottom = NAV_CLEARANCE + space.lg + insets.bottom;

  if (totalFavorites === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <PageHeader title="My Favorites" onBack={onBack} />
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: bottom }}>
          <EmptyBlock Icon={Heart} text="You haven't added any favorites yet" button="Explore Restaurants" />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PageHeader
        title="My Favorites"
        subtitle={`${dishFavorites.length || 0} ${dishFavorites.length === 1 ? 'dish' : 'dishes'} • ${restaurantFavorites.length || 0} ${restaurantFavorites.length === 1 ? 'restaurant' : 'restaurants'}`}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: bottom }}>
        <SegmentedControl
          style={{ marginBottom: space.lg }}
          options={[
            { value: 'restaurants', label: 'Restaurants', count: restaurantFavorites.length },
            { value: 'dishes', label: 'Dishes', count: dishFavorites.length },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'restaurants' ? (
          restaurantFavorites.length === 0 ? (
            <EmptyBlock Icon={Heart} text="No restaurants saved yet" button="Explore Restaurants" />
          ) : (
            <View style={styles.grid}>
              {restaurantFavorites.map((restaurant) => (
                <View key={restaurant.slug} style={[styles.favCard, { width: cardWidth }]}>
                  <Press scale={0.98} onPress={() => navigateTo(`/user/restaurants/${restaurant.slug}`)} accessibilityLabel={restaurant.name} style={{ flex: 1 }}>
                    <View style={styles.imageBox}>
                      <Thumb uri={restaurant.image} style={StyleSheet.absoluteFill} />
                      <LinearGradient colors={SCRIM} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                      <View style={styles.ratingPill}>
                        <Star size={12} color={color.gold} fill={color.gold} />
                        <Text style={styles.ratingText}>{restaurant.rating}</Text>
                      </View>
                    </View>
                    <View style={styles.favBody}>
                      <View>
                        <Text style={styles.favTitle} numberOfLines={1}>
                          {restaurant.name}
                        </Text>
                        <Text style={styles.favSub} numberOfLines={1}>
                          {restaurant.cuisine}
                        </Text>
                      </View>
                      <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                          <Clock size={14} color={color.textMuted} />
                          <Text style={styles.metaText} numberOfLines={1}>
                            {restaurant.deliveryTime}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <MapPin size={14} color={color.textMuted} />
                          <Text style={styles.metaText} numberOfLines={1}>
                            {restaurant.distance}
                          </Text>
                        </View>
                      </View>
                      <ViewButton label="View Restaurant" onPress={() => navigateTo(`/user/restaurants/${restaurant.slug}`)} />
                    </View>
                  </Press>
                  <Press onPress={() => handleRemoveFavorite(restaurant.slug)} accessibilityLabel="Remove from favorites" style={styles.heartBtn}>
                    <Heart size={18} color={color.primary} fill={color.primary} />
                  </Press>
                </View>
              ))}
            </View>
          )
        ) : null}

        {activeTab === 'dishes' ? (
          dishFavorites.length === 0 ? (
            <EmptyBlock Icon={Bookmark} text="No dishes saved yet" button="Explore Dishes" />
          ) : (
            <View style={styles.grid}>
              {dishFavorites.map((dish) => {
                const restaurantSlug = dish.restaurantSlug || '';
                const open = () => navigateTo(`/food/user/restaurants/${restaurantSlug}?dish=${dish.id}`);
                return (
                  <View key={`${dish.id}-${dish.restaurantId}`} style={[styles.favCard, { width: cardWidth }]}>
                    <Press scale={0.98} onPress={open} accessibilityLabel={dish.name} style={{ flex: 1 }}>
                      <View style={styles.imageBox}>
                        <Thumb uri={dish.image} style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={SCRIM} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                      </View>
                      <View style={styles.favBody}>
                        <View>
                          <Text style={styles.favTitle} numberOfLines={1}>
                            {dish.name}
                          </Text>
                          <Text style={styles.favSub} numberOfLines={1}>
                            {dish.restaurantName || 'Restaurant'}
                          </Text>
                        </View>
                        <View style={styles.metaRow}>
                          <View style={styles.metaItem}>
                            {dish.foodType === 'Veg' ? (
                              <View style={[styles.vegBox, { borderColor: color.veg }]}>
                                <View style={[styles.vegDot, { backgroundColor: color.veg }]} />
                              </View>
                            ) : (
                              // The web's `border-#06381e` / `bg-#06381e` are invalid classes: no colour renders.
                              <View style={[styles.vegBox, { borderColor: 'transparent' }]}>
                                <View style={[styles.vegDot, { backgroundColor: 'transparent' }]} />
                              </View>
                            )}
                            <Text style={styles.metaText}>{dish.foodType || 'N/A'}</Text>
                          </View>
                          <Text style={styles.price}>{`₹${Math.round(dish.price || 0)}`}</Text>
                        </View>
                        <ViewButton label="View Dish" onPress={open} />
                      </View>
                    </Press>
                    <Press onPress={() => handleRemoveDishFavorite(dish.id, dish.restaurantId)} accessibilityLabel="Remove from favorites" style={styles.heartBtn}>
                      <Bookmark size={18} color={color.primary} fill={color.primary} />
                    </Press>
                  </View>
                );
              })}
            </View>
          )
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  favCard: { overflow: 'hidden', borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, ...elevation.card },
  favBody: { padding: space.md, gap: space.sm, flex: 1 },
  imageBox: { aspectRatio: 4 / 3, width: '100%', overflow: 'hidden', backgroundColor: color.surfaceMuted },
  heartBtn: {
    position: 'absolute',
    top: space.xs,
    right: space.xs,
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingPill: {
    position: 'absolute',
    bottom: space.sm,
    left: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: color.surface,
    paddingHorizontal: space.sm,
    height: 24,
    borderRadius: radii.pill,
  },
  ratingText: { ...type.caption, color: color.text },
  favTitle: { ...type.bodyStrong, color: color.text },
  favSub: { ...type.caption, color: color.textMuted },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexShrink: 1 },
  metaText: { ...type.caption, color: color.textMuted, flexShrink: 1 },
  vegBox: { width: 14, height: 14, borderWidth: 2, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  price: { ...type.bodyStrong, color: color.text },
});
