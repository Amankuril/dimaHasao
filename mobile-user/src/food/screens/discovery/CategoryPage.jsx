import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowDownUp, ArrowLeft, BadgePercent, Bookmark, Grid2x2, IndianRupee, MapPin, Search, ShieldCheck, SlidersHorizontal, Star, Timer, Zap } from 'lucide-react-native';
import Image from '../../../components/Img';
import { BottomSheet } from '../../../components/kit';
import { Press } from '../../../components/ui';
import Skeleton from '../../../components/Skeleton';
import { useCategoryPage } from '../../hooks/pages/useCategoryPage';
import { RestaurantImageCarousel, openRestaurant } from '../../components/RestaurantCard';
import { RestaurantGridSkeleton } from '../../components/discovery/bits';
import { F } from '../../components/shell';
import { poppins, shadow, tw } from '../../../theme';

const DISH_FALLBACK = require('../../../../assets/food/dish_fallback.webp');

const QUICK_ROW_1 = [
  { id: 'under-30-mins', label: 'Under 30 mins' },
  { id: 'delivery-under-45', label: 'Under 45 mins' },
  { id: 'rating-4-plus', label: 'Rating 4.0+' },
  { id: 'rating-45-plus', label: 'Rating 4.5+' },
];
const QUICK_ROW_2 = [
  { id: 'distance-under-1km', label: 'Under 1km', icon: MapPin },
  { id: 'distance-under-2km', label: 'Under 2km', icon: MapPin },
  { id: 'flat-50-off', label: 'Flat 50% OFF' },
  { id: 'under-250', label: 'Under ₹250' },
];
const SHEET_TABS = [
  { id: 'sort', label: 'Sort By', icon: ArrowDownUp },
  { id: 'time', label: 'Time', icon: Timer },
  { id: 'rating', label: 'Rating', icon: Star },
  { id: 'distance', label: 'Distance', icon: MapPin },
  { id: 'price', label: 'Dish Price', icon: IndianRupee },
  { id: 'offers', label: 'Offers', icon: BadgePercent },
  { id: 'trust', label: 'Trust', icon: ShieldCheck },
];
const SORTS = [
  { id: null, label: 'Relevance' },
  { id: 'price-low', label: 'Price: Low to High' },
  { id: 'price-high', label: 'Price: High to Low' },
  { id: 'rating-high', label: 'Rating: High to Low' },
  { id: 'rating-low', label: 'Rating: Low to High' },
];
// section -> its toggles; `tile` draws the two-column icon tile, otherwise a full-width row
const SHEET_SECTIONS = [
  { id: 'time', title: 'Estimated Time', tile: Timer, options: [['under-30-mins', 'Under 30 mins'], ['delivery-under-45', 'Under 45 mins']] },
  { id: 'rating', title: 'Restaurant Rating', tile: Star, fill: true, options: [['rating-35-plus', 'Rated 3.5+'], ['rating-4-plus', 'Rated 4.0+'], ['rating-45-plus', 'Rated 4.5+']] },
  { id: 'distance', title: 'Distance', tile: MapPin, options: [['distance-under-1km', 'Under 1 km'], ['distance-under-2km', 'Under 2 km']] },
  { id: 'price', title: 'Dish Price', options: [['price-under-200', 'Under ₹200'], ['under-250', 'Under ₹250'], ['price-under-500', 'Under ₹500']] },
  { id: 'offers', title: 'Offers', tile: BadgePercent, options: [['flat-50-off', 'Flat 50% OFF'], ['price-match', 'Price Match']] },
];

function Img({ uri, style }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return <Image source={uri && !failed ? { uri } : DISH_FALLBACK} onError={() => setFailed(true)} style={style} resizeMode="cover" />;
}

function Chip({ label, active, onPress, Icon }) {
  return (
    <Press scale={0.96} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: !!active }} accessibilityLabel={label} style={[styles.chip, active ? { backgroundColor: F.green, borderColor: F.green } : null]} hitSlop={{ top: 8, bottom: 8 }}>
      {Icon ? <Icon size={14} color={active ? '#fff' : tw.gray900} /> : null}
      <Text style={[styles.chipText, active ? { color: '#fff' } : null]}>{label}</Text>
    </Press>
  );
}

/**
 * Port of pages/user/CategoryPage.jsx (logic: useCategoryPage). Also embedded by
 * the search screen, which owns the scrolling then: with `embeddedCategorySlug`
 * it renders as a plain column and hands its "load more" to `nearEndRef`.
 */
export default function CategoryPage({ embeddedCategorySlug = null, hideHeader = false, hideCategoryCarousel = false, hideFilters = false, disableAutoScroll = false, isBrowseActive = true, nearEndRef = null }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const c = useCategoryPage({ embeddedCategorySlug, hideHeader, hideCategoryCarousel, hideFilters, disableAutoScroll, isBrowseActive });
  const {
    navigate, searchQuery, setSearchQuery, selectedCategory, categoryBackPath, activeFilters, setActiveFilters, favorites, sortBy, setSortBy, isFilterOpen,
    setIsFilterOpen, setIsLoadingFilterResults, loadingCategories, loadingZone, displayCategories, showCategorySkeleton, toggleFilter, toggleFavorite,
    filteredRecommended, showRestaurantSkeleton, recommendedItems, allRestaurantsWithoutRecommended, visibleAllRestaurants, visibleAllCount, setVisibleAllCount,
    isContentLoading, hasNoResults, handleCategorySelect, shouldShowGrayscale, isCategoryView, isRestaurantClosed, menuEnrichmentRequestRef, setIsEnrichingMenus,
    ALL_LIST_LOAD_MORE,
  } = c;

  const [sheetTab, setSheetTab] = useState('sort');
  const sheetScroll = useRef(null);
  const sheetOffsets = useRef({});
  const rail = useRef(null);
  const railX = useRef({});

  const total = allRestaurantsWithoutRecommended.length;
  const loadMore = () => {
    if (visibleAllCount < total) setVisibleAllCount((prev) => (prev >= total ? prev : Math.min(prev + ALL_LIST_LOAD_MORE, total)));
  };
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  useEffect(() => {
    if (!nearEndRef) return undefined;
    nearEndRef.current = () => loadMoreRef.current();
    return () => {
      nearEndRef.current = null;
    };
  }, [nearEndRef]);

  // Keep the selected category in view in the rail.
  useEffect(() => {
    const x = railX.current[selectedCategory];
    if (x != null) rail.current?.scrollTo({ x: Math.max(0, x - width / 2 + 32), animated: true });
  }, [selectedCategory, width, displayCategories.length]);

  const flashLoading = () => {
    setIsLoadingFilterResults(true);
    setTimeout(() => setIsLoadingFilterResults(false), 500);
  };
  const recCardWidth = (width - 32 - 24) / 3;

  const renderRecCard = (restaurant) => {
    const closed = isRestaurantClosed(restaurant);
    const displayImg = isCategoryView ? restaurant.categoryDishImage : restaurant.categoryDishImage || restaurant.image;
    const title = isCategoryView ? restaurant.categoryDishName || restaurant.featuredDish || restaurant.name : restaurant.name;
    return (
      <Press key={restaurant.id} scale={0.98} onPress={() => openRestaurant(restaurant, { from: categoryBackPath, dishId: restaurant.dishId })} accessibilityLabel={`${title}${isCategoryView ? ` at ${restaurant.name}` : ''}`} style={[{ width: recCardWidth }, shouldShowGrayscale || closed ? { opacity: 0.75 } : null]}>
        <View style={styles.recImg}>
          <Img uri={displayImg} style={{ width: '100%', height: '100%' }} />
          {restaurant.offer ? (
            <LinearGradient colors={['#0a4d2b', '#06381e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.recOffer}>
              <Text style={styles.recOfferText} numberOfLines={1}>{restaurant.offer}</Text>
            </LinearGradient>
          ) : null}
          <View style={styles.recRating}>
            <Text style={styles.recRatingText}>{Number(restaurant.rating) > 0 ? Number(restaurant.rating).toFixed(1) : 'NEW'}</Text>
            <Star size={10} color="#fff" fill="#fff" />
          </View>
        </View>
        <Text style={styles.recName} numberOfLines={1}>{title}</Text>
        {isCategoryView ? <Text style={styles.recSub} numberOfLines={1}>{restaurant.name}</Text> : null}
      </Press>
    );
  };

  const topRow = [];
  const bottomRow = [];
  if (recommendedItems.length >= 6) {
    recommendedItems.forEach((item, index) => (Math.floor(index / 3) % 2 === 0 ? topRow : bottomRow).push(item));
  }

  const header = (
    <View style={styles.sticky}>
      {!hideHeader ? (
        <View style={styles.searchRow}>
          <Press scale={0.92} onPress={() => navigate('/food/user', { replace: true })} accessibilityLabel="Go back" style={styles.back} hitSlop={6}>
            <ArrowLeft size={20} color={tw.gray700} />
          </Press>
          <View style={styles.searchBox}>
            <Search size={16} color={tw.gray500} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Restaurant name or a dish..."
              placeholderTextColor={tw.gray600}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="Search restaurants or dishes"
              style={styles.searchInput}
            />
          </View>
        </View>
      ) : null}

      {!hideCategoryCarousel ? (
        <ScrollView ref={rail} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} style={{ borderBottomWidth: 1, borderBottomColor: tw.gray100 }}>
          {showCategorySkeleton || ((loadingCategories || loadingZone) && displayCategories.length <= 1) ? (
            [0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={{ alignItems: 'center', gap: 8 }}>
                <Skeleton style={{ width: 64, height: 64, borderRadius: 32 }} />
                <Skeleton style={{ width: 48, height: 12, borderRadius: 6 }} />
              </View>
            ))
          ) : displayCategories.length > 0 ? (
            displayCategories.map((cat) => {
              const categorySlug = cat.slug || cat.id;
              const isSelected = selectedCategory === categorySlug || selectedCategory === cat.id;
              const isAll = categorySlug === 'all' || cat.id === 'all';
              return (
                <Press
                  key={cat.id}
                  scale={0.96}
                  onPress={() => handleCategorySelect(cat)}
                  onLayout={(e) => {
                    railX.current[categorySlug] = e.nativeEvent.layout.x;
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${cat.name} category`}
                  style={[styles.cat, isSelected ? { borderBottomColor: F.green } : null]}
                >
                  <View style={[styles.catCircle, isSelected ? styles.catCircleOn : isAll ? { borderColor: tw.gray200, backgroundColor: '#fff' } : null, isSelected && (isAll || !cat.image) ? { backgroundColor: 'rgba(10,77,43,0.1)' } : null]}>
                    {isAll ? (
                      <Grid2x2 size={24} color={isSelected ? F.green : tw.gray500} />
                    ) : cat.image ? (
                      <Image source={typeof cat.image === 'string' ? { uri: cat.image } : cat.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Text style={styles.catInitials}>{String(cat.name || '?').trim().slice(0, 2).toUpperCase()}</Text>
                    )}
                  </View>
                  <Text style={[styles.catName, isSelected ? { color: F.green } : null]} numberOfLines={1}>{cat.name}</Text>
                </Press>
              );
            })
          ) : (
            <Text style={styles.noCats}>No categories available</Text>
          )}
        </ScrollView>
      ) : null}
    </View>
  );

  const body = (
    <View style={shouldShowGrayscale ? { opacity: 0.75 } : null}>
      {!hideFilters ? (
        <View style={{ paddingVertical: 12, gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.chipRow}>
            <Press scale={0.96} onPress={() => setIsFilterOpen(true)} accessibilityLabel="Filters and sorting" style={styles.chip} hitSlop={{ top: 8, bottom: 8 }}>
              <SlidersHorizontal size={14} color="#000" />
              <Text style={styles.chipText}>Filters</Text>
            </Press>
            {QUICK_ROW_1.map((f) => (
              <Chip key={f.id} label={f.label} active={activeFilters.has(f.id)} onPress={() => toggleFilter(f.id)} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.chipRow}>
            {QUICK_ROW_2.map((f) => (
              <Chip key={f.id} label={f.label} Icon={f.icon} active={activeFilters.has(f.id)} onPress={() => toggleFilter(f.id)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 24 }}>
        {selectedCategory !== 'all' && (isContentLoading || filteredRecommended.length > 0) ? (
          <View>
            <Text style={styles.heading}>RECOMMENDED FOR YOU</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}>
              {isContentLoading && filteredRecommended.length === 0 ? (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={{ width: recCardWidth }}>
                      <Skeleton style={{ aspectRatio: 1, borderRadius: 12, marginBottom: 8 }} />
                      <Skeleton style={{ height: 12, width: '75%', borderRadius: 4, marginBottom: 4 }} />
                      <Skeleton style={{ height: 10, width: '50%', borderRadius: 4 }} />
                    </View>
                  ))}
                </View>
              ) : recommendedItems.length >= 6 ? (
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>{topRow.map(renderRecCard)}</View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>{bottomRow.map(renderRecCard)}</View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 12 }}>{recommendedItems.map(renderRecCard)}</View>
              )}
            </ScrollView>
          </View>
        ) : null}

        <View>
          <Text style={styles.heading}>ALL RESTAURANTS</Text>
          {showRestaurantSkeleton || (isContentLoading && visibleAllRestaurants.length === 0) ? (
            <RestaurantGridSkeleton count={4} compact />
          ) : (
            <View style={{ gap: 16 }}>
              {visibleAllRestaurants.map((restaurant) => {
                const isFavorite = favorites.has(restaurant.id);
                const closed = isRestaurantClosed(restaurant);
                const useCarousel = isCategoryView && Array.isArray(restaurant.recommendedDishes) && restaurant.recommendedDishes.length > 0;
                const badge = !isCategoryView && (restaurant.categoryDishName || restaurant.featuredDish);
                return (
                  <Press key={restaurant.id} scale={0.99} onPress={() => openRestaurant(restaurant, { from: categoryBackPath })} accessibilityLabel={restaurant.name} style={[styles.card, shouldShowGrayscale || closed ? { opacity: 0.75 } : null]}>
                    <View style={{ height: 176, backgroundColor: tw.gray50 }}>
                      {useCarousel ? (
                        <RestaurantImageCarousel restaurant={restaurant} height={176} radius={6} backFrom={categoryBackPath} categoryFallbackImage={DISH_FALLBACK} />
                      ) : (
                        <Img uri={isCategoryView ? restaurant.categoryDishImage : restaurant.image} style={{ width: '100%', height: '100%' }} />
                      )}
                      {badge ? (
                        <View style={styles.dishBadge}>
                          <Text style={styles.dishBadgeText} numberOfLines={1}>{`${badge} • ₹${restaurant.categoryDishPrice || restaurant.featuredPrice}`}</Text>
                        </View>
                      ) : null}
                      {restaurant.isAd ? <Text style={styles.ad}>Ad</Text> : null}
                      <Press scale={0.9} onPress={() => toggleFavorite(restaurant.id)} accessibilityLabel={isFavorite ? 'Remove bookmark' : 'Bookmark restaurant'} style={styles.bookmark} hitSlop={6}>
                        <Bookmark size={20} color={isFavorite ? tw.gray800 : tw.gray600} fill={isFavorite ? tw.gray800 : 'none'} strokeWidth={2} />
                      </Press>
                    </View>
                    <View style={{ padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.cardName} numberOfLines={1}>{restaurant.name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                            <Zap size={16} color="#257d3c" fill="#257d3c" strokeWidth={2.5} />
                            <Text style={styles.cardMeta}>{restaurant.deliveryTime || '25-30 mins'}</Text>
                            {restaurant.distance ? (
                              <>
                                <Text style={[styles.cardMeta, { marginHorizontal: 4, ...poppins(700) }]}>|</Text>
                                <Text style={styles.cardMeta}>{restaurant.distance}</Text>
                              </>
                            ) : null}
                          </View>
                        </View>
                        <View style={styles.cardRating}>
                          <Star size={14} color="#fff" fill="#fff" strokeWidth={0} />
                          <Text style={styles.cardRatingText}>{Number(restaurant.rating) > 0 ? Number(restaurant.rating).toFixed(1) : 'NEW'}</Text>
                        </View>
                      </View>
                      {restaurant.offer ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <BadgePercent size={16} color={F.green} strokeWidth={2} />
                          <Text style={styles.cardOffer}>{restaurant.offer}</Text>
                        </View>
                      ) : null}
                    </View>
                  </Press>
                );
              })}
            </View>
          )}

          {visibleAllCount < total ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator size="small" color={tw.gray400} />
            </View>
          ) : null}

          {hasNoResults ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={styles.empty}>{searchQuery ? `No restaurants found for "${searchQuery}"` : 'No restaurants found with selected filters'}</Text>
              <Press
                scale={0.97}
                accessibilityLabel="Clear all filters"
                onPress={() => {
                  setIsLoadingFilterResults(true);
                  setActiveFilters(new Set());
                  setSearchQuery('');
                  setSortBy(null);
                  menuEnrichmentRequestRef.current += 1;
                  setIsEnrichingMenus(false);
                  setTimeout(() => setIsLoadingFilterResults(false), 500);
                }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>Clear all filters</Text>
              </Press>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );

  const hasAny = activeFilters.size > 0 || !!sortBy;
  const sheet = (
    <BottomSheet visible={isFilterOpen} onClose={() => setIsFilterOpen(false)} backdrop="rgba(0,0,0,0.5)" panelStyle={[styles.sheet, { maxHeight: height * 0.85 }]}>
      <View style={styles.sheetHead}>
        <Text style={styles.sheetTitle}>Filters and sorting</Text>
        <Press
          scale={0.96}
          hitSlop={8}
          accessibilityLabel="Clear all filters"
          onPress={() => {
            setActiveFilters(new Set());
            setSortBy(null);
            flashLoading();
          }}
        >
          <Text style={styles.sheetClear}>Clear all</Text>
        </Press>
      </View>
      <View style={{ flexDirection: 'row', flexShrink: 1, minHeight: 0 }}>
        <View style={styles.tabs}>
          {SHEET_TABS.map((tab) => {
            const Icon = tab.icon;
            const on = sheetTab === tab.id;
            return (
              <Press
                key={tab.id}
                scale={1}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={tab.label}
                onPress={() => {
                  setSheetTab(tab.id);
                  if (sheetOffsets.current[tab.id] != null) sheetScroll.current?.scrollTo({ y: sheetOffsets.current[tab.id], animated: true });
                }}
                style={[styles.tab, on ? { backgroundColor: '#fff' } : null]}
              >
                {on ? <View style={styles.tabBar} /> : null}
                <Icon size={20} color={on ? F.green : tw.gray500} strokeWidth={1.5} />
                <Text style={[styles.tabText, on ? { color: F.green } : null]}>{tab.label}</Text>
              </Press>
            );
          })}
        </View>
        <ScrollView ref={sheetScroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          <View style={{ marginBottom: 32 }} onLayout={(e) => (sheetOffsets.current.sort = e.nativeEvent.layout.y)}>
            <Text style={styles.h3}>Sort by</Text>
            <View style={{ gap: 12 }}>
              {SORTS.map((o) => {
                const on = sortBy === o.id;
                return (
                  <Press key={o.id || 'relevance'} scale={0.98} onPress={() => setSortBy(o.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.rowOpt, on ? styles.optOn : null]}>
                    <Text style={[styles.optText, { textAlign: 'left' }, on ? { color: tw.green600 } : null]}>{o.label}</Text>
                  </Press>
                );
              })}
            </View>
          </View>
          {SHEET_SECTIONS.map((section) => {
            const Tile = section.tile;
            return (
              <View key={section.id} style={{ marginBottom: 32 }} onLayout={(e) => (sheetOffsets.current[section.id] = e.nativeEvent.layout.y)}>
                <Text style={styles.h3}>{section.title}</Text>
                <View style={Tile ? { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } : { gap: 12 }}>
                  {section.options.map(([id, label]) => {
                    const on = activeFilters.has(id);
                    return (
                      <Press key={id} scale={0.98} onPress={() => toggleFilter(id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} style={[Tile ? styles.tile : styles.rowOpt, on ? styles.optOn : null]}>
                        {Tile ? <Tile size={24} color={on ? F.green : section.fill ? tw.gray400 : tw.gray600} fill={on && section.fill ? F.green : 'none'} strokeWidth={section.fill ? 2 : 1.5} /> : null}
                        <Text style={[styles.optText, Tile ? null : { textAlign: 'left' }, on ? { color: F.green } : null]}>{label}</Text>
                      </Press>
                    );
                  })}
                </View>
              </View>
            );
          })}
          {sheetTab === 'trust' ? (
            <View style={{ gap: 12 }}>
              <Text style={[styles.h3, { marginBottom: 4 }]}>Trust Markers</Text>
              <View style={styles.rowOpt}>
                <Text style={[styles.optText, { textAlign: 'left' }]}>Top Rated</Text>
              </View>
              <View style={styles.rowOpt}>
                <Text style={[styles.optText, { textAlign: 'left' }]}>Trusted by 1000+ users</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
      <View style={[styles.sheetFoot, { paddingBottom: 16 + insets.bottom }]}>
        <Press scale={0.98} onPress={() => setIsFilterOpen(false)} accessibilityLabel="Close filters" style={styles.footBtn}>
          <Text style={styles.footClose}>Close</Text>
        </Press>
        <Press
          scale={0.98}
          accessibilityLabel="Show results"
          onPress={() => {
            setIsFilterOpen(false);
            flashLoading();
          }}
          style={[styles.footBtn, { backgroundColor: hasAny ? F.green : tw.gray200 }]}
        >
          <Text style={[styles.footClose, { color: hasAny ? '#fff' : tw.gray500 }]}>Show results</Text>
        </Press>
      </View>
    </BottomSheet>
  );

  // Inside the search screen: one scroll view (the parent's), no header of our own.
  if (embeddedCategorySlug) {
    return (
      <View style={{ backgroundColor: '#fff' }}>
        {!hideHeader || !hideCategoryCarousel ? header : null}
        {body}
        {sheet}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {header}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={64}
        onScroll={(e) => {
          const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
          if (contentOffset.y + layoutMeasurement.height > contentSize.height - 400) loadMore();
        }}
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
      >
        {body}
      </ScrollView>
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  sticky: { backgroundColor: '#fff', zIndex: 2, ...shadow('sm') },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: tw.gray300, backgroundColor: tw.gray50, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 0, fontSize: 14, color: tw.gray900, ...poppins(400) },
  rail: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 16, alignItems: 'flex-start' },
  cat: { alignItems: 'center', gap: 6, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  catCircle: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  catCircleOn: { borderColor: F.green, ...shadow('lg') },
  catInitials: { fontSize: 14, color: tw.gray600, ...poppins(600) },
  catName: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(500) },
  noCats: { fontSize: 14, lineHeight: 20, color: tw.gray600, paddingVertical: 16, ...poppins(400) },

  chipRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingBottom: 4 },
  chip: { height: 28, paddingHorizontal: 10, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200 },
  chipText: { fontSize: 12, lineHeight: 16, color: '#000', ...poppins(700) },

  heading: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: tw.gray400, marginBottom: 16, ...poppins(600) },
  recImg: { aspectRatio: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 8, backgroundColor: tw.gray200 },
  recOffer: { position: 'absolute', top: 6, left: 6, maxWidth: '90%', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  recOfferText: { fontSize: 10, lineHeight: 15, color: '#fff', ...poppins(600) },
  recRating: { position: 'absolute', bottom: 0, left: 0, backgroundColor: tw.green600, borderWidth: 4, borderColor: '#fff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 2 },
  recRatingText: { fontSize: 11, lineHeight: 16, color: '#fff', ...poppins(700) },
  recName: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(600) },
  recSub: { fontSize: 10, lineHeight: 15, color: tw.gray500, ...poppins(400) },

  card: { backgroundColor: '#fff', borderRadius: 6, overflow: 'hidden', ...shadow('md') },
  dishBadge: { position: 'absolute', top: 12, left: 12, maxWidth: '70%', backgroundColor: 'rgba(30,41,57,0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  dishBadgeText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(500) },
  ad: { position: 'absolute', top: 12, right: 56, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10, lineHeight: 15, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', ...poppins(400) },
  bookmark: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 16, lineHeight: 20, letterSpacing: -0.4, color: '#1c1c1c', ...poppins(700) },
  cardMeta: { fontSize: 14, lineHeight: 20, color: '#257d3c', ...poppins(600) },
  cardRating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#257d3c', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cardRatingText: { fontSize: 14, lineHeight: 20, letterSpacing: -0.35, color: '#fff', ...poppins(700) },
  cardOffer: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) },
  empty: { fontSize: 14, lineHeight: 20, color: tw.gray500, textAlign: 'center', ...poppins(400) },
  clearBtn: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  clearBtnText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },

  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  sheetTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  sheetClear: { fontSize: 14, lineHeight: 20, color: F.green, ...poppins(500) },
  tabs: { width: 96, backgroundColor: tw.gray50, borderRightWidth: 1, borderRightColor: tw.gray200 },
  tab: { alignItems: 'center', gap: 4, paddingVertical: 16, paddingHorizontal: 8 },
  tabBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: F.green, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  tabText: { fontSize: 12, lineHeight: 15, color: tw.gray500, textAlign: 'center', ...poppins(500) },
  h3: { fontSize: 18, lineHeight: 28, color: tw.gray900, marginBottom: 16, ...poppins(600) },
  tile: { width: '47%', flexGrow: 1, maxWidth: '48.5%', alignItems: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200 },
  rowOpt: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200 },
  optOn: { borderColor: F.green, backgroundColor: F.cream },
  optText: { fontSize: 14, lineHeight: 20, color: tw.gray700, textAlign: 'center', ...poppins(500) },
  sheetFoot: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.gray200, backgroundColor: '#fff' },
  footBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  footClose: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(600) },
});
