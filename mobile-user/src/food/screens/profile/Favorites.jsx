import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight, Bookmark, Clock, Heart, MapPin, Star } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { confirm, toast } from '../../../lib/notify';
import { navigateTo, useLocation } from '../../../lib/webRouter';
import { useProfile } from '../../context/ProfileContext';
import { filterDishesForVegMode, filterRestaurantsForVegMode } from '../../utils/vegMode';
import { Button, Card, CardContent, UI } from '../../components/cart/ui';
import { F } from '../../components/shell';
import { poppins, shadow, tw } from '../../../theme';

const FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop&q=80';

function Thumb({ uri, style }) {
  const [failed, setFailed] = useState(false);
  return <Image source={{ uri: !failed && uri ? uri : FALLBACK }} onError={() => setFailed(true)} style={style} resizeMode="cover" />;
}

function ViewButton({ label, onPress }) {
  return (
    <Press scale={0.98} onPress={onPress} accessibilityLabel={label} style={styles.viewBtn}>
      <Text style={styles.viewText}>{label}</Text>
      <ArrowRight size={12} color="#fff" style={{ marginLeft: 4 }} />
    </Press>
  );
}

function ExploreButton({ label }) {
  return (
    <Button onPress={() => navigateTo('/user')} style={{ backgroundColor: F.green }} textStyle={{ color: '#fff' }}>{label}</Button>
  );
}

function EmptyBlock({ Icon, text, button, card }) {
  const inner = (
    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
      <Icon size={64} color={UI.mutedForeground} style={{ marginBottom: 16 }} />
      <Text style={styles.emptyText}>{text}</Text>
      <ExploreButton label={button} />
    </View>
  );
  return card ? (
    <Card>
      <CardContent>{inner}</CardContent>
    </Card>
  ) : (
    inner
  );
}

/** Port of pages/user/profile/Favorites.jsx. */
export default function Favorites() {
  const { width } = useWindowDimensions();
  const location = useLocation();
  const from = location.state?.from || '/food/user/profile';
  const { favorites, dishFavorites: allDishFavorites, removeFavorite, removeDishFavorite, vegMode, vegModeOption } = useProfile();
  const restaurantFavorites = useMemo(() => filterRestaurantsForVegMode(favorites || [], { vegMode, vegModeOption }), [favorites, vegMode, vegModeOption]);
  const dishFavorites = useMemo(() => filterDishesForVegMode(allDishFavorites || [], vegMode), [allDishFavorites, vegMode]);
  const [activeTab, setActiveTab] = useState('restaurants');
  const cardWidth = (width - 32 - 16) / 2;

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
  const back = (
    <Press onPress={() => navigateTo(from)} accessibilityLabel="Back" style={styles.back}>
      <ArrowLeft size={16} color={UI.foreground} />
    </Press>
  );

  if (totalFavorites === 0) {
    return (
      <LinearGradient colors={['rgba(254,252,232,0.3)', '#FFFFFF', 'rgba(255,247,237,0.2)']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}>
          <View style={styles.headerRow}>
            {back}
            <Text style={styles.h1}>My Favorites</Text>
          </View>
          <EmptyBlock card Icon={Heart} text="You haven't added any favorites yet" button="Explore Restaurants" />
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['rgba(254,252,232,0.3)', '#FFFFFF', 'rgba(255,247,237,0.2)']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={[styles.headerRow, { marginBottom: 16 }]}>
          {back}
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>My Favorites</Text>
            <Text style={styles.count}>
              {`${dishFavorites.length || 0} ${dishFavorites.length === 1 ? 'dish' : 'dishes'} • ${restaurantFavorites.length || 0} ${restaurantFavorites.length === 1 ? 'restaurant' : 'restaurants'}`}
            </Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {[
            ['restaurants', `Restaurants (${restaurantFavorites.length})`],
            ['dishes', `Dishes (${dishFavorites.length})`],
          ].map(([id, label]) => (
            <Press key={id} scale={1} onPress={() => setActiveTab(id)} accessibilityLabel={label} style={[styles.tab, activeTab === id ? styles.tabActive : null]}>
              <Text style={[styles.tabText, activeTab === id ? { color: F.green } : { color: tw.gray500 }]}>{label}</Text>
            </Press>
          ))}
        </View>

        {activeTab === 'restaurants' ? (
          restaurantFavorites.length === 0 ? (
            <EmptyBlock Icon={Heart} text="No restaurants saved yet" button="Explore Restaurants" />
          ) : (
            <View style={styles.grid}>
              {restaurantFavorites.map((restaurant) => (
                <Press key={restaurant.slug} scale={1} onPress={() => navigateTo(`/user/restaurants/${restaurant.slug}`)} accessibilityLabel={restaurant.name} style={{ width: cardWidth }}>
                  <Card style={styles.favCard}>
                    <View style={styles.imageBox}>
                      <Thumb uri={restaurant.image} style={StyleSheet.absoluteFill} />
                      <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                      <Press onPress={() => handleRemoveFavorite(restaurant.slug)} accessibilityLabel="Remove from favorites" style={styles.heartBtn}>
                        <Heart size={16} color={tw.red500} fill={tw.red500} />
                      </Press>
                      <View style={styles.ratingPill}>
                        <Star size={12} color={tw.yellow400} fill={tw.yellow400} />
                        <Text style={styles.ratingText}>{restaurant.rating}</Text>
                      </View>
                    </View>
                    <CardContent style={{ padding: 12, gap: 8 }}>
                      <View>
                        <Text style={styles.favTitle} numberOfLines={1}>{restaurant.name}</Text>
                        <Text style={styles.favSub} numberOfLines={1}>{restaurant.cuisine}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                          <Clock size={12} color={UI.mutedForeground} />
                          <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <MapPin size={12} color={UI.mutedForeground} />
                          <Text style={styles.metaText}>{restaurant.distance}</Text>
                        </View>
                      </View>
                      <ViewButton label="View Restaurant" onPress={() => navigateTo(`/user/restaurants/${restaurant.slug}`)} />
                    </CardContent>
                  </Card>
                </Press>
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
                  <Press key={`${dish.id}-${dish.restaurantId}`} scale={1} onPress={open} accessibilityLabel={dish.name} style={{ width: cardWidth }}>
                    <Card style={styles.favCard}>
                      <View style={styles.imageBox}>
                        <Thumb uri={dish.image} style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                        <Press onPress={() => handleRemoveDishFavorite(dish.id, dish.restaurantId)} accessibilityLabel="Remove from favorites" style={styles.heartBtn}>
                          <Bookmark size={16} color={tw.red500} fill={tw.red500} />
                        </Press>
                      </View>
                      <CardContent style={{ padding: 12, gap: 8 }}>
                        <View>
                          <Text style={styles.favTitle} numberOfLines={1}>{dish.name}</Text>
                          <Text style={styles.favSub} numberOfLines={1}>{dish.restaurantName || 'Restaurant'}</Text>
                        </View>
                        <View style={styles.metaRow}>
                          <View style={styles.metaItem}>
                            {dish.foodType === 'Veg' ? (
                              <View style={[styles.vegBox, { borderColor: tw.green600 }]}>
                                <View style={[styles.vegDot, { backgroundColor: tw.green600 }]} />
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
                      </CardContent>
                    </Card>
                  </Press>
                );
              })}
            </View>
          )
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { height: 32, width: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 18, lineHeight: 28, color: UI.foreground, ...poppins(700) },
  count: { marginTop: 4, fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(600) },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 24, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: F.green },
  tabText: { fontSize: 16, lineHeight: 24, ...poppins(500) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  favCard: { overflow: 'hidden', height: '100%' },
  imageBox: { height: 128, width: '100%', overflow: 'hidden' },
  heartBtn: { position: 'absolute', top: 8, right: 8, height: 28, width: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  ratingPill: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  ratingText: { fontSize: 12, lineHeight: 16, color: UI.foreground, ...poppins(700) },
  favTitle: { fontSize: 14, lineHeight: 14, color: UI.foreground, marginBottom: 2, ...poppins(700) },
  favSub: { fontSize: 12, lineHeight: 16, color: UI.mutedForeground, ...poppins(500) },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: UI.border },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, lineHeight: 16, color: UI.mutedForeground, ...poppins(500) },
  vegBox: { width: 12, height: 12, borderWidth: 2, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  price: { fontSize: 14, lineHeight: 20, color: F.green, ...poppins(700) },
  viewBtn: { width: '100%', height: 32, borderRadius: 6, backgroundColor: F.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...shadow('xs') },
  viewText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(500) },
  emptyText: { color: UI.mutedForeground, fontSize: 18, lineHeight: 28, marginBottom: 16, textAlign: 'center', ...poppins(400) },
});
