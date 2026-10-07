import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowDownUp, ArrowLeft, BadgePercent, Bookmark, Clock, Grid2x2, IndianRupee, MapPin, Search, ShieldCheck, SlidersHorizontal, Star, Store, Timer } from 'lucide-react-native';
import Image from '../../../components/Img';
import { BottomSheet } from '../../../components/kit';
import { Press } from '../../../components/ui';
import Skeleton from '../../../components/Skeleton';
import { useCategoryPage } from '../../hooks/pages/useCategoryPage';
import { RestaurantImageCarousel, openRestaurant } from '../../components/RestaurantCard';
import { RestaurantGridSkeleton } from '../../components/discovery/bits';
import { Button, Chip as DsChip, EmptyState, SectionHeader, StatusBadge } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { color, elevation, radii, space, type } from '../../../theme';

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
  return <DsChip label={label} selected={!!active} onPress={onPress} icon={Icon} style={styles.chip} />;
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
  const recCardWidth = (width - space.lg * 2 - space.md * 2) / 3;

  const renderRecCard = (restaurant) => {
    const closed = isRestaurantClosed(restaurant);
    const displayImg = isCategoryView ? restaurant.categoryDishImage : restaurant.categoryDishImage || restaurant.image;
    const title = isCategoryView ? restaurant.categoryDishName || restaurant.featuredDish || restaurant.name : restaurant.name;
    return (
      <Press key={restaurant.id} scale={0.98} onPress={() => openRestaurant(restaurant, { from: categoryBackPath, dishId: restaurant.dishId })} accessibilityRole="button" accessibilityLabel={`${title}${isCategoryView ? ` at ${restaurant.name}` : ''}`} style={[{ width: recCardWidth }, shouldShowGrayscale || closed ? { opacity: 0.75 } : null]}>
        <View style={styles.recImg}>
          <Img uri={displayImg} style={{ width: '100%', height: '100%' }} />
          {restaurant.offer ? (
            <View style={styles.recOffer}>
              <Text style={styles.recOfferText} numberOfLines={1}>{restaurant.offer}</Text>
            </View>
          ) : null}
          <View style={styles.recRating}>
            <Star size={11} color={color.gold} fill={color.gold} strokeWidth={0} />
            <Text style={styles.recRatingText}>{Number(restaurant.rating) > 0 ? Number(restaurant.rating).toFixed(1) : 'New'}</Text>
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
          <Press scale={0.92} onPress={() => navigate('/food/user', { replace: true })} accessibilityLabel="Go back" style={styles.back}>
            <ArrowLeft size={22} color={color.text} />
          </Press>
          <View style={styles.searchBox}>
            <Search size={18} color={color.primary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Restaurant name or a dish"
              placeholderTextColor={color.textMuted}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="Search restaurants or dishes"
              style={styles.searchInput}
            />
          </View>
        </View>
      ) : null}

      {!hideCategoryCarousel ? (
        <ScrollView ref={rail} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} style={{ borderBottomWidth: 1, borderBottomColor: color.border }}>
          {showCategorySkeleton || ((loadingCategories || loadingZone) && displayCategories.length <= 1) ? (
            [0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={{ alignItems: 'center', gap: 8 }}>
                <Skeleton style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: color.surfaceMuted }} />
                <Skeleton style={{ width: 48, height: 12, borderRadius: 6, backgroundColor: color.surfaceMuted }} />
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
                  style={[styles.cat, isSelected ? { borderBottomColor: color.primary } : null]}
                >
                  <View style={[styles.catCircle, isSelected ? styles.catCircleOn : isAll ? { borderColor: color.border, backgroundColor: color.surface } : null, isSelected && (isAll || !cat.image) ? { backgroundColor: color.primarySoft } : null]}>
                    {isAll ? (
                      <Grid2x2 size={24} color={isSelected ? color.primary : color.textSecondary} />
                    ) : cat.image ? (
                      <Image source={typeof cat.image === 'string' ? { uri: cat.image } : cat.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Text style={styles.catInitials}>{String(cat.name || '?').trim().slice(0, 2).toUpperCase()}</Text>
                    )}
                  </View>
                  <Text style={[styles.catName, isSelected ? { color: color.primary, fontFamily: 'Poppins_700Bold' } : null]} numberOfLines={1}>{cat.name}</Text>
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
        <View style={{ paddingVertical: space.md, gap: space.sm }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.chipRow}>
            <DsChip label="Filters" icon={SlidersHorizontal} selected={false} onPress={() => setIsFilterOpen(true)} style={styles.chip} />
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

      <View style={{ paddingHorizontal: space.lg, paddingVertical: space.lg, gap: space.xxl }}>
        {selectedCategory !== 'all' && (isContentLoading || filteredRecommended.length > 0) ? (
          <View>
            <SectionHeader title="Recommended for you" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xs }}>
              {isContentLoading && filteredRecommended.length === 0 ? (
                <View style={{ flexDirection: 'row', gap: space.md }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={{ width: recCardWidth }}>
                      <Skeleton style={{ aspectRatio: 1, borderRadius: radii.md, marginBottom: space.sm, backgroundColor: color.surfaceMuted }} />
                      <Skeleton style={{ height: 12, width: '75%', borderRadius: 6, marginBottom: space.xs, backgroundColor: color.surfaceMuted }} />
                      <Skeleton style={{ height: 12, width: '50%', borderRadius: 6, backgroundColor: color.surfaceMuted }} />
                    </View>
                  ))}
                </View>
              ) : recommendedItems.length >= 6 ? (
                <View style={{ gap: space.md }}>
                  <View style={{ flexDirection: 'row', gap: space.md }}>{topRow.map(renderRecCard)}</View>
                  <View style={{ flexDirection: 'row', gap: space.md }}>{bottomRow.map(renderRecCard)}</View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: space.md }}>{recommendedItems.map(renderRecCard)}</View>
              )}
            </ScrollView>
          </View>
        ) : null}

        <View>
          <SectionHeader title="All restaurants" />
          {showRestaurantSkeleton || (isContentLoading && visibleAllRestaurants.length === 0) ? (
            <RestaurantGridSkeleton count={4} compact />
          ) : (
            <View style={{ gap: space.lg }}>
              {visibleAllRestaurants.map((restaurant) => {
                const isFavorite = favorites.has(restaurant.id);
                const closed = isRestaurantClosed(restaurant);
                const useCarousel = isCategoryView && Array.isArray(restaurant.recommendedDishes) && restaurant.recommendedDishes.length > 0;
                const badge = !isCategoryView && (restaurant.categoryDishName || restaurant.featuredDish);
                const open = () => openRestaurant(restaurant, { from: categoryBackPath });
                const meta = [restaurant.deliveryTime || '25-30 mins', restaurant.distance].filter(Boolean).join('  ·  ');
                return (
                  <View key={restaurant.id} style={[styles.card, shouldShowGrayscale || closed ? { opacity: 0.75 } : null]}>
                    <View style={{ height: 176, backgroundColor: color.surfaceMuted }}>
                      {useCarousel ? (
                        <RestaurantImageCarousel restaurant={restaurant} height={176} radius={radii.lg} backFrom={categoryBackPath} categoryFallbackImage={DISH_FALLBACK} />
                      ) : (
                        <Press scale={1} onPress={open} accessibilityLabel={restaurant.name} style={{ flex: 1 }}>
                          <Img uri={isCategoryView ? restaurant.categoryDishImage : restaurant.image} style={{ width: '100%', height: '100%' }} />
                        </Press>
                      )}
                      {badge ? (
                        <View pointerEvents="none" style={styles.dishBadge}>
                          <Text style={styles.dishBadgeText} numberOfLines={1}>{`${badge} · ₹${restaurant.categoryDishPrice || restaurant.featuredPrice}`}</Text>
                        </View>
                      ) : null}
                      {restaurant.isAd ? <Text style={styles.ad}>Ad</Text> : null}
                      <Press scale={0.9} onPress={() => toggleFavorite(restaurant.id)} accessibilityRole="button" accessibilityState={{ selected: isFavorite }} accessibilityLabel={isFavorite ? 'Remove bookmark' : 'Bookmark restaurant'} style={[styles.bookmark, isFavorite ? { backgroundColor: color.primary } : null]}>
                        <Bookmark size={20} color={isFavorite ? color.onPrimary : color.text} fill={isFavorite ? color.onPrimary : 'none'} strokeWidth={2} />
                      </Press>
                    </View>
                    <Press scale={0.99} onPress={open} accessibilityRole="button" accessibilityLabel={`${restaurant.name}, ${meta}`} style={{ padding: space.lg, gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.cardName} numberOfLines={2}>{restaurant.name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginTop: space.xs }}>
                            <Clock size={14} color={color.textSecondary} />
                            <Text style={styles.cardMeta} numberOfLines={1}>{meta}</Text>
                          </View>
                        </View>
                        <View style={styles.cardRating}>
                          <Star size={13} color={color.goldText} fill={color.gold} strokeWidth={0} />
                          <Text style={styles.cardRatingText}>{Number(restaurant.rating) > 0 ? Number(restaurant.rating).toFixed(1) : 'New'}</Text>
                        </View>
                      </View>
                      {restaurant.offer ? <StatusBadge label={restaurant.offer} tone="gold" icon={BadgePercent} style={{ marginTop: space.xs, maxWidth: '100%' }} /> : null}
                    </Press>
                  </View>
                );
              })}
            </View>
          )}

          {visibleAllCount < total ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator size="small" color={color.primary} />
            </View>
          ) : null}

          {hasNoResults ? (
            <EmptyState
              icon={Store}
              title={searchQuery ? `No restaurants found for "${searchQuery}"` : 'No restaurants found with selected filters'}
              actionLabel="Clear all filters"
              onAction={() => {
                setIsLoadingFilterResults(true);
                setActiveFilters(new Set());
                setSearchQuery('');
                setSortBy(null);
                menuEnrichmentRequestRef.current += 1;
                setIsEnrichingMenus(false);
                setTimeout(() => setIsLoadingFilterResults(false), 500);
              }}
            />
          ) : null}
        </View>
      </View>
    </View>
  );

  const hasAny = activeFilters.size > 0 || !!sortBy;
  const sheet = (
    <BottomSheet visible={isFilterOpen} onClose={() => setIsFilterOpen(false)} backdrop={color.overlay} panelStyle={[styles.sheet, { maxHeight: height * 0.85 }]}>
      <View style={styles.sheetHead}>
        <Text style={styles.sheetTitle} accessibilityRole="header">Filters and sorting</Text>
        <Press
          scale={0.96}
          style={styles.sheetClearBtn}
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
                style={[styles.tab, on ? { backgroundColor: color.surface } : null]}
              >
                {on ? <View style={styles.tabBar} /> : null}
                <Icon size={20} color={on ? color.primary : color.textMuted} strokeWidth={1.75} />
                <Text style={[styles.tabText, on ? { color: color.primary } : null]}>{tab.label}</Text>
              </Press>
            );
          })}
        </View>
        <ScrollView ref={sheetScroll} style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg }} showsVerticalScrollIndicator={false}>
          <View style={{ marginBottom: space.xxl }} onLayout={(e) => (sheetOffsets.current.sort = e.nativeEvent.layout.y)}>
            <Text style={styles.h3}>Sort by</Text>
            <View style={{ gap: space.sm }}>
              {SORTS.map((o) => {
                const on = sortBy === o.id;
                return (
                  <Press key={o.id || 'relevance'} scale={0.98} onPress={() => setSortBy(o.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.rowOpt, on ? styles.optOn : null]}>
                    <Text style={[styles.optText, { textAlign: 'left' }, on ? styles.optTextOn : null]}>{o.label}</Text>
                  </Press>
                );
              })}
            </View>
          </View>
          {SHEET_SECTIONS.map((section) => {
            const Tile = section.tile;
            return (
              <View key={section.id} style={{ marginBottom: space.xxl }} onLayout={(e) => (sheetOffsets.current[section.id] = e.nativeEvent.layout.y)}>
                <Text style={styles.h3}>{section.title}</Text>
                <View style={Tile ? { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm } : { gap: space.sm }}>
                  {section.options.map(([id, label]) => {
                    const on = activeFilters.has(id);
                    return (
                      <Press key={id} scale={0.98} onPress={() => toggleFilter(id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} style={[Tile ? styles.tile : styles.rowOpt, on ? styles.optOn : null]}>
                        {Tile ? <Tile size={22} color={on ? (section.fill ? color.goldText : color.primary) : color.textMuted} fill={on && section.fill ? color.gold : 'none'} strokeWidth={section.fill ? 2 : 1.75} /> : null}
                        <Text style={[styles.optText, Tile ? null : { textAlign: 'left' }, on ? styles.optTextOn : null]}>{label}</Text>
                      </Press>
                    );
                  })}
                </View>
              </View>
            );
          })}
          {sheetTab === 'trust' ? (
            <View style={{ gap: space.sm }}>
              <Text style={[styles.h3, { marginBottom: space.xs }]}>Trust markers</Text>
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
      <View style={[styles.sheetFoot, { paddingBottom: space.lg + insets.bottom }]}>
        <Button title="Close" variant="outline" accessibilityLabel="Close filters" onPress={() => setIsFilterOpen(false)} style={{ flex: 1 }} />
        <Button
          title="Show results"
          variant={hasAny ? 'primary' : 'secondary'}
          onPress={() => {
            setIsFilterOpen(false);
            flashLoading();
          }}
          style={{ flex: 1 }}
        />
      </View>
    </BottomSheet>
  );

  // Inside the search screen: one scroll view (the parent's), no header of our own.
  if (embeddedCategorySlug) {
    return (
      <View style={{ backgroundColor: color.bg }}>
        {!hideHeader || !hideCategoryCarousel ? header : null}
        {body}
        {sheet}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      {header}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={64}
        onScroll={(e) => {
          const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
          if (contentOffset.y + layoutMeasurement.height > contentSize.height - 400) loadMore();
        }}
        contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}
      >
        {body}
      </ScrollView>
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  sticky: { backgroundColor: color.bg, zIndex: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingLeft: space.xs, paddingRight: space.lg, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flex: 1, height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: color.primaryBorder, backgroundColor: color.surface, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md },
  searchInput: { flex: 1, minWidth: 0, height: '100%', paddingVertical: 0, ...type.body, color: color.text, outlineWidth: 0 },
  rail: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs, gap: space.lg, alignItems: 'flex-start' },
  cat: { width: 72, alignItems: 'center', gap: space.xs + 2, paddingBottom: space.sm, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  catCircle: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', borderWidth: 2, borderColor: color.border, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  catCircleOn: { borderColor: color.primary },
  catInitials: { ...type.label, color: color.textSecondary },
  catName: { ...type.caption, color: color.textSecondary, textAlign: 'center', alignSelf: 'stretch' },
  noCats: { ...type.small, color: color.textMuted, paddingVertical: space.lg },

  chipRow: { paddingHorizontal: space.lg, gap: space.sm, alignItems: 'center' },
  chip: { height: 40 },

  recImg: { aspectRatio: 1, borderRadius: radii.md, overflow: 'hidden', marginBottom: space.sm, backgroundColor: color.surfaceMuted },
  recOffer: { position: 'absolute', top: space.xs + 2, left: space.xs + 2, maxWidth: '88%', paddingHorizontal: space.sm, height: 22, justifyContent: 'center', borderRadius: radii.pill, backgroundColor: color.goldBright },
  recOfferText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.onGold },
  recRating: { position: 'absolute', bottom: space.xs + 2, left: space.xs + 2, flexDirection: 'row', alignItems: 'center', gap: 3, height: 22, paddingHorizontal: space.sm, borderRadius: radii.pill, backgroundColor: 'rgba(17,17,17,0.78)' },
  recRatingText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.textInverse },
  recName: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.text },
  recSub: { ...type.caption, fontFamily: 'Poppins_400Regular', color: color.textMuted },

  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.card },
  dishBadge: { position: 'absolute', top: space.md, left: space.md, maxWidth: '70%', height: 30, justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.78)', paddingHorizontal: space.md - 2, borderRadius: radii.pill },
  dishBadgeText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.textInverse },
  ad: { position: 'absolute', top: space.md, right: 64, backgroundColor: 'rgba(17,17,17,0.6)', color: color.textInverse, ...type.caption, paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radii.sm, overflow: 'hidden' },
  bookmark: { position: 'absolute', top: space.md, right: space.md, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...elevation.card },
  cardName: { ...type.heading, color: color.text },
  cardMeta: { ...type.caption, color: color.textSecondary, flexShrink: 1 },
  cardRating: { flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 26, paddingHorizontal: space.sm, borderRadius: radii.pill, backgroundColor: color.goldSoft, borderWidth: 1, borderColor: color.border },
  cardRatingText: { ...type.label, color: color.goldText },

  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.lg, paddingRight: space.xs, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  sheetTitle: { ...type.heading, color: color.text },
  sheetClearBtn: { minHeight: 44, paddingHorizontal: space.md, justifyContent: 'center' },
  sheetClear: { ...type.label, color: color.primary },
  tabs: { width: 96, backgroundColor: color.surfaceMuted, borderRightWidth: 1, borderRightColor: color.border },
  tab: { alignItems: 'center', gap: space.xs, paddingVertical: space.md + 2, paddingHorizontal: space.xs },
  tabBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: color.primary, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  tabText: { ...type.caption, color: color.textSecondary, textAlign: 'center' },
  h3: { ...type.subheading, color: color.text, marginBottom: space.md },
  tile: { width: '47%', flexGrow: 1, maxWidth: '48.5%', minHeight: 84, alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  rowOpt: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  optOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  optText: { ...type.body, color: color.text, textAlign: 'center' },
  optTextOn: { color: color.primary, fontFamily: 'Poppins_600SemiBold' },
  sheetFoot: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.surface },
});
