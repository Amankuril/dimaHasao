import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Search } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { useProfile } from '../../context/ProfileContext';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { useLocation as useLocationHook } from '../../hooks/useLocation';
import { navigateTo } from '../../../lib/webRouter';
import { poppins, tw } from '../../../theme';
import { useLocationSelector, useSearchOverlay } from '../shell';
import { DiningFilterChips, DiningFilterModal } from './DiningFilters';
import { ExploreRestaurantCard, OverlayNav } from './DiningCards';

const BANNER = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop';

/*
 * The web ships these two pages with this fixed list (they are not linked from
 * anywhere in the app and read nothing from the API); it is reproduced as is.
 */
const popularRestaurants = [
  { id: 1, name: 'IRIS', rating: 4.3, location: 'Press Complex, Indore', distance: '2.9 km', cuisine: 'Continental', price: '₹1500 for two', image: '', offer: 'Flat 30% OFF + 3 more', deliveryTime: '30-35 mins', featuredDish: 'Pasta', featuredPrice: 450 },
  { id: 2, name: 'Skyline Rooftop', rating: 4.5, location: 'MG Road, Indore', distance: '3.2 km', cuisine: 'Multi-cuisine', price: '₹2000 for two', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop', offer: 'Flat 25% OFF + 2 more', deliveryTime: '35-40 mins', featuredDish: 'Grilled Chicken', featuredPrice: 550 },
  { id: 3, name: 'The Grand Bistro', rating: 4.7, location: 'Vijay Nagar, Indore', distance: '1.8 km', cuisine: 'Continental', price: '₹1800 for two', image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop', offer: 'Flat 35% OFF + 4 more', deliveryTime: '25-30 mins', featuredDish: 'Risotto', featuredPrice: 650 },
  { id: 4, name: 'Coastal Kitchen', rating: 4.4, location: 'Palasia, Indore', distance: '2.1 km', cuisine: 'Seafood', price: '₹1600 for two', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop', offer: 'Flat 20% OFF + 2 more', deliveryTime: '28-33 mins', featuredDish: 'Fish Curry', featuredPrice: 480 },
  { id: 5, name: 'Garden Terrace', rating: 4.6, location: 'Scheme 54, Indore', distance: '4.5 km', cuisine: 'North Indian', price: '₹1200 for two', image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800&h=600&fit=crop', offer: 'Flat 30% OFF + 3 more', deliveryTime: '40-45 mins', featuredDish: 'Butter Chicken', featuredPrice: 380 },
  { id: 6, name: 'Midnight Lounge', rating: 4.2, location: 'Bhawarkua, Indore', distance: '3.8 km', cuisine: 'Continental', price: '₹2200 for two', image: '', offer: 'Flat 25% OFF + 2 more', deliveryTime: '35-40 mins', featuredDish: 'Steak', featuredPrice: 750 },
];

/** Shared body of pages/user/DiningExplore50.jsx and DiningExploreNear.jsx (they differ only in the banner's alt text and one tab colour). */
export default function ExplorePage({ tabAccent }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const goBack = useAppBackNavigation();
  const { openSearch } = useSearchOverlay();
  const { openLocationSelector } = useLocationSelector();
  const { location } = useLocationHook();
  const { addFavorite, removeFavorite, isFavorite } = useProfile();
  const cityName = location?.city || 'Select';
  const input = useRef(null);

  const [heroSearch, setHeroSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState(null);
  const [selectedCuisine, setSelectedCuisine] = useState(null);

  const toggleFilter = (filterId) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filterId)) next.delete(filterId);
      else next.add(filterId);
      return next;
    });
  };

  const filteredRestaurants = useMemo(() => {
    let filtered = [...popularRestaurants];
    const mins = (r) => {
      const m = r.deliveryTime.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : null;
    };
    const km = (r) => {
      const m = r.distance.match(/(\d+\.?\d*)/);
      return m ? parseFloat(m[1]) : null;
    };
    if (activeFilters.has('delivery-under-30')) filtered = filtered.filter((r) => mins(r) != null && mins(r) <= 30);
    if (activeFilters.has('delivery-under-45')) filtered = filtered.filter((r) => mins(r) != null && mins(r) <= 45);
    if (activeFilters.has('distance-under-1km')) filtered = filtered.filter((r) => km(r) != null && km(r) <= 1.0);
    if (activeFilters.has('distance-under-2km')) filtered = filtered.filter((r) => km(r) != null && km(r) <= 2.0);
    if (activeFilters.has('rating-35-plus')) filtered = filtered.filter((r) => r.rating >= 3.5);
    if (activeFilters.has('rating-4-plus')) filtered = filtered.filter((r) => r.rating >= 4.0);
    if (activeFilters.has('rating-45-plus')) filtered = filtered.filter((r) => r.rating >= 4.5);
    if (selectedCuisine) filtered = filtered.filter((r) => r.cuisine.toLowerCase().includes(selectedCuisine.toLowerCase()));
    if (sortBy === 'rating-high') filtered.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'rating-low') filtered.sort((a, b) => a.rating - b.rating);
    return filtered;
  }, [activeFilters, selectedCuisine, sortBy]);

  const submitSearch = () => {
    const q = heroSearch.trim();
    if (!q) return;
    navigateTo(`/user/search?q=${encodeURIComponent(q)}`);
    setHeroSearch('');
  };

  return (
    <View style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}>
        <View style={{ height: Math.round(height * 0.39), overflow: 'hidden' }}>
          <Image source={{ uri: BANNER }} accessibilityLabel="Banner" style={StyleSheet.absoluteFill} resizeMode="cover" />
          <OverlayNav onBack={goBack} onLocation={openLocationSelector} cityName={cityName} />
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <View style={{ marginBottom: 24 }}>
            <View style={{ justifyContent: 'center' }}>
              <TextInput
                ref={input}
                value={heroSearch}
                onChangeText={setHeroSearch}
                onFocus={() => {
                  input.current?.blur();
                  openSearch();
                }}
                onSubmitEditing={submitSearch}
                returnKeyType="search"
                placeholder="Search for restaurants, cuisines, dishes..."
                placeholderTextColor={tw.gray400}
                accessibilityLabel="Search for restaurants, cuisines, dishes"
                style={styles.search}
              />
              <View pointerEvents="none" style={styles.searchIcon}>
                <Search size={20} color={tw.gray400} />
              </View>
              <Press scale={0.9} onPress={() => {}} accessibilityLabel="Voice search" style={styles.mic}>
                <Mic size={16} color={tw.gray500} />
              </Press>
            </View>
          </View>

          <View style={{ marginTop: 8, marginBottom: 16 }}>
            <Text style={styles.heading}>POPULAR RESTAURANTS AROUND YOU</Text>
          </View>

          <View style={{ marginHorizontal: -16 }}>
            <DiningFilterChips blackText activeFilters={activeFilters} toggleFilter={toggleFilter} onOpenFilters={() => setIsFilterOpen(true)} />
          </View>

          <View style={{ gap: 16 }}>
            {filteredRestaurants.map((restaurant) => {
              const restaurantSlug = restaurant.name.toLowerCase().replace(/\s+/g, '-');
              const favorite = isFavorite(restaurantSlug);
              return (
                <ExploreRestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  favorite={favorite}
                  onPress={() => navigateTo(`/user/restaurants/${restaurantSlug}`)}
                  onToggleFavorite={() => {
                    if (favorite) removeFavorite(restaurantSlug);
                    else
                      addFavorite({
                        slug: restaurantSlug,
                        name: restaurant.name,
                        cuisine: restaurant.cuisine,
                        rating: restaurant.rating,
                        deliveryTime: restaurant.deliveryTime,
                        distance: restaurant.distance,
                        image: restaurant.image,
                      });
                  }}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      <DiningFilterModal
        variant="explore"
        tabAccent={tabAccent}
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        activeFilters={activeFilters}
        toggleFilter={toggleFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedCuisine={selectedCuisine}
        setSelectedCuisine={setSelectedCuisine}
        resultCount={filteredRestaurants.length}
        onClear={() => {
          setActiveFilters(new Set());
          setSortBy(null);
          setSelectedCuisine(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  search: { height: 48, paddingLeft: 48, paddingRight: 48, borderRadius: 12, borderWidth: 2, borderColor: tw.gray200, backgroundColor: '#fff', fontSize: 16, color: tw.gray900, ...poppins(400) },
  searchIcon: { position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' },
  mic: { position: 'absolute', right: 8, top: 8, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heading: { paddingHorizontal: 12, fontSize: 14, lineHeight: 20, letterSpacing: 0.35, color: tw.gray500, textAlign: 'center', ...poppins(600) },
});
