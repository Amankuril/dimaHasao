import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, BadgePercent, ChevronRight, Clock, History, MapPin, Mic, Search, Star, Utensils, X } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import Skeleton from '../../../components/Skeleton';
import { useProfessionalSearch } from '../../hooks/pages/useProfessionalSearch';
import { RestaurantGridSkeleton } from '../../components/discovery/bits';
import CategoryBrowse from './CategoryPage';
import { EmptyState, SectionHeader, StatusBadge } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { color, elevation, radii, space, type } from '../../../theme';

/** Port of pages/user/search/ProfessionalSearch.jsx (the page the router mounts at `search`). */
export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const s = useProfessionalSearch();
  const {
    query, setQuery, results, loading, categories, visibleCategories, selectedCategoryId, history, selectedCategorySlug, isTakeawaySearch,
    handleClear, handleCategoryClick, getMediaUrl, scrollToResultsRef, resultsRef,
  } = s;
  const scroller = useRef(null);
  const inputRef = useRef(null);
  const resultsY = useRef(0);
  const nearEnd = useRef(null);

  scrollToResultsRef.current = () => scroller.current?.scrollTo({ y: Math.max(0, resultsY.current - 80), animated: true });

  const onScroll = (e) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height > contentSize.height - 400) nearEnd.current?.();
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={styles.header}>
        <Press scale={0.9} onPress={() => (router.canGoBack() ? router.back() : router.replace('/food/user'))} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={22} color={color.text} />
        </Press>
        <View style={styles.field}>
          <Search size={18} color={color.primary} strokeWidth={2.5} />
          <View style={{ flex: 1, height: '100%', justifyContent: 'center' }}>
            <TextInput
              ref={inputRef}
              autoFocus
              value={query}
              onChangeText={setQuery}
              accessibilityLabel={isTakeawaySearch ? 'Search takeaway restaurants' : 'Search dishes or restaurants'}
              returnKeyType="search"
              style={styles.input}
            />
            {/* Android wraps a long hint onto a second line; the web truncates it. */}
            {query ? null : (
              <Text pointerEvents="none" numberOfLines={1} style={styles.placeholder}>
                {isTakeawaySearch ? 'Search takeaway restaurants...' : 'Search dishes or restaurants'}
              </Text>
            )}
          </View>
          {query ? (
            <Press scale={0.9} onPress={handleClear} accessibilityLabel="Clear search" style={styles.fieldBtn}>
              <X size={18} color={color.textSecondary} />
            </Press>
          ) : null}
          <View style={styles.divider} />
          <Press scale={0.95} onPress={() => inputRef.current?.focus()} accessibilityLabel="Voice search" style={styles.fieldBtn}>
            <Mic size={20} color={color.primary} />
          </Press>
        </View>
      </View>

      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" onScroll={onScroll} scrollEventThrottle={64} contentContainerStyle={{ padding: space.lg, paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}>
        {!query && !isTakeawaySearch ? (
          <View style={{ marginBottom: space.xxl }}>
            <View style={styles.catHead}>
              <SectionHeader title="Top categories" style={{ marginBottom: 0, flexShrink: 1 }} />
              {visibleCategories.length > 8 ? <Text style={styles.swipe}>Swipe for more</Text> : null}
            </View>
            {categories.length === 0 ? (
              <View style={styles.catGrid}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <View key={i} style={styles.catCell}>
                    <Skeleton style={{ width: 64, height: 64, borderRadius: radii.lg, backgroundColor: color.surfaceMuted, marginBottom: space.sm }} />
                    <Skeleton style={{ width: 48, height: 12, borderRadius: 6, backgroundColor: color.surfaceMuted }} />
                  </View>
                ))}
              </View>
            ) : visibleCategories.length === 0 ? (
              <Text style={styles.muted}>No veg categories available</Text>
            ) : (
              <View style={styles.catGrid}>
                {visibleCategories.map((cat) => {
                  const active = selectedCategoryId === cat._id;
                  return (
                    <Press key={cat._id} scale={0.95} onPress={() => handleCategoryClick(cat._id)} accessibilityRole="button" accessibilityLabel={cat.name} accessibilityState={{ selected: active }} style={styles.catCell}>
                      <View style={[styles.catBox, active ? styles.catBoxActive : null]}>
                        {cat.image ? (
                          <Image source={{ uri: getMediaUrl(cat.image) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceMuted }}>
                            <Utensils size={24} color={color.textDisabled} />
                          </View>
                        )}
                      </View>
                      <Text numberOfLines={1} style={[styles.catName, active ? { color: color.primary, fontFamily: 'Poppins_700Bold' } : null]}>{cat.name}</Text>
                    </Press>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {loading && !selectedCategorySlug ? (
          <View style={{ gap: space.xxl, marginTop: space.xxl }}>
            <View style={styles.catHead}>
              <Skeleton style={{ height: 16, width: 128, borderRadius: 6, backgroundColor: color.surfaceMuted }} />
              <Skeleton style={{ height: 16, width: 64, borderRadius: 6, backgroundColor: color.surfaceMuted }} />
            </View>
            <RestaurantGridSkeleton count={4} />
          </View>
        ) : null}

        {!query && !loading && history.length > 0 ? (
          <View style={{ marginBottom: space.xxl }}>
            <SectionHeader title="Recently searched" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {history.map((term, i) => (
                <Press key={i} scale={0.97} onPress={() => setQuery(term)} accessibilityRole="button" accessibilityLabel={term} style={styles.chip}>
                  <History size={14} color={color.textSecondary} />
                  <Text style={styles.chipText} numberOfLines={1}>{term}</Text>
                </Press>
              ))}
            </View>
          </View>
        ) : null}

        {selectedCategorySlug ? (
          <View
            ref={resultsRef}
            onLayout={(e) => {
              resultsY.current = e.nativeEvent.layout.y;
            }}
            style={{ marginTop: space.lg, marginHorizontal: -space.lg, minHeight: 600 }}
          >
            <CategoryBrowse key={selectedCategorySlug} embeddedCategorySlug={selectedCategorySlug} hideHeader hideCategoryCarousel hideFilters disableAutoScroll nearEndRef={nearEnd} />
          </View>
        ) : !loading && query ? (
          <View
            ref={resultsRef}
            onLayout={(e) => {
              resultsY.current = e.nativeEvent.layout.y;
            }}
            style={{ gap: space.xxl }}
          >
            {results.dishes.length > 0 ? (
              <View>
                <View style={styles.secHead}>
                  <SectionHeader title="Matched dishes" style={{ marginBottom: 0, flexShrink: 1 }} />
                  <StatusBadge label={`${results.dishes.length} results`} tone="neutral" />
                </View>
                <View style={{ gap: space.md }}>
                  {results.dishes.map((r) => (
                    <Press
                      key={r._id}
                      scale={0.98}
                      onPress={() => router.push(`/food/user/restaurants/${r.slug || r._id}${r.matchedDishId ? `?dish=${r.matchedDishId}` : ''}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`${r.matchedDish || query} at ${r.restaurantName}`}
                      style={styles.dish}
                    >
                      <View style={styles.dishImg}>
                        <Image source={{ uri: getMediaUrl(r.matchedDishImage || r.profileImage || r.image || (Array.isArray(r.images) && r.images[0])) || undefined }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        {r.pureVegRestaurant ? (
                          <View style={styles.vegBox} accessibilityLabel="Pure veg">
                            <View style={{ flex: 1, backgroundColor: color.veg, borderRadius: radii.pill }} />
                          </View>
                        ) : null}
                      </View>
                      <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                        <View style={styles.dishTag}>
                          <Text style={styles.dishTagText} numberOfLines={1}>{String(r.matchedDish || query)}</Text>
                        </View>
                        <Text style={styles.dishName} numberOfLines={2}>{r.restaurantName}</Text>
                        <View style={styles.dishMeta}>
                          <Star size={12} color={color.goldText} fill={color.gold} strokeWidth={0} />
                          <Text style={styles.dishRating}>{r.rating || 'New'}</Text>
                          <Text style={styles.dot}>·</Text>
                          <Clock size={12} color={color.textSecondary} />
                          <Text style={styles.dishMetaText}>{r.estimatedDeliveryTime || '30-40 mins'}</Text>
                        </View>
                        {r.cuisines?.length ? <Text style={styles.dishMetaText} numberOfLines={1}>{r.cuisines?.slice(0, 2).join(', ')}</Text> : null}
                      </View>
                    </Press>
                  ))}
                </View>
              </View>
            ) : null}

            {results.restaurants.length > 0 ? (
              <View>
                <View style={styles.secHead}>
                  <SectionHeader title="Restaurants" style={{ marginBottom: 0, flexShrink: 1 }} />
                  <StatusBadge label={`${results.restaurants.length} stores`} tone="neutral" />
                </View>
                <View style={{ gap: space.lg }}>
                  {results.restaurants.map((r) => (
                    <Press key={r._id} scale={0.98} onPress={() => router.push(`/food/user/restaurants/${r.slug || r._id}`)} accessibilityRole="button" accessibilityLabel={r.restaurantName} style={styles.rCard}>
                      <View style={styles.rImg}>
                        <Image source={{ uri: getMediaUrl(r.profileImage || r.image || (Array.isArray(r.images) && r.images[0])) || undefined }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0.15)', 'transparent']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
                        <View style={styles.rBottom}>
                          <View style={{ flex: 1, minWidth: 0, marginRight: space.sm }}>
                            <Text style={styles.rName} numberOfLines={1}>{r.restaurantName}</Text>
                            <Text style={styles.rCuisine} numberOfLines={1}>{String(r.cuisines?.join(', ') || '')}</Text>
                          </View>
                          <View style={styles.rRating}>
                            <Star size={14} color={color.gold} fill={color.gold} strokeWidth={0} />
                            <Text style={styles.rRatingText}>{r.rating || '4.0'}</Text>
                          </View>
                        </View>
                        {r.offer ? (
                          <View style={styles.rOffer}>
                            <BadgePercent size={14} color={color.onGold} />
                            <Text style={styles.rOfferText} numberOfLines={1}>{String(r.offer)}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.rFoot}>
                        <View style={styles.rMetaWrap}>
                          <View style={styles.rMeta}>
                            <Clock size={14} color={color.textSecondary} />
                            <Text style={styles.rMetaText}>{String(r.estimatedDeliveryTime || '30 mins')}</Text>
                          </View>
                          <View style={[styles.rMeta, { flexShrink: 1 }]}>
                            <MapPin size={14} color={color.textSecondary} />
                            <Text style={styles.rMetaText} numberOfLines={1}>{String(r.location?.area || 'Nearby')}</Text>
                          </View>
                        </View>
                        <View style={styles.view}>
                          <Text style={styles.viewText}>View menu</Text>
                          <ChevronRight size={14} color={color.primary} />
                        </View>
                      </View>
                    </Press>
                  ))}
                </View>
              </View>
            ) : null}

            {!loading && results.restaurants.length === 0 && results.dishes.length === 0 ? (
              <EmptyState icon={Search} title="We couldn't find any results" message="Maybe try searching for something else or check your spelling" actionLabel="Clear all filters" onAction={handleClear} />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingLeft: space.xs, paddingRight: space.lg, paddingVertical: space.sm, backgroundColor: color.bg, borderBottomWidth: 1, borderBottomColor: color.border },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  field: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md, paddingRight: space.xxs, backgroundColor: color.surface, borderWidth: 1, borderColor: color.primaryBorder, borderRadius: radii.md },
  input: { height: '100%', minWidth: 0, paddingVertical: 0, ...type.body, color: color.text, outlineWidth: 0 },
  placeholder: { position: 'absolute', left: 0, right: 0, ...type.body, color: color.textMuted },
  fieldBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  divider: { width: 1, height: 20, backgroundColor: color.border },
  muted: { ...type.small, color: color.textMuted },
  catHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.lg },
  swipe: { ...type.caption, color: color.primary },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.xl },
  catCell: { width: '25%', alignItems: 'center', paddingHorizontal: space.xxs },
  catBox: { width: 64, height: 64, borderRadius: radii.lg, marginBottom: space.sm, borderWidth: 2, borderColor: color.border, backgroundColor: color.surface, overflow: 'hidden', ...elevation.card },
  catBoxActive: { borderColor: color.primary },
  catName: { ...type.caption, color: color.text, textAlign: 'center', alignSelf: 'stretch' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 40, maxWidth: '100%', paddingHorizontal: space.md + 2, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.pill },
  chipText: { ...type.label, color: color.textSecondary, flexShrink: 1 },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.md },
  dish: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, ...elevation.card },
  dishImg: { width: 88, height: 88, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  vegBox: { position: 'absolute', top: 6, left: 6, width: 16, height: 16, borderWidth: 1.5, borderColor: color.veg, padding: 2, backgroundColor: color.surface, borderRadius: 3 },
  dishTag: { alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: color.goldSoft, paddingHorizontal: space.sm, height: 22, justifyContent: 'center', borderRadius: radii.pill },
  dishTagText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.goldText },
  dishName: { ...type.subheading, color: color.text },
  dishMeta: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  dishRating: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.goldText },
  dot: { ...type.caption, color: color.textMuted },
  dishMetaText: { ...type.caption, color: color.textSecondary },
  rCard: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.card },
  rImg: { aspectRatio: 16 / 9, backgroundColor: color.surfaceMuted },
  rBottom: { position: 'absolute', bottom: space.md, left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  rName: { ...type.heading, color: color.textInverse },
  rCuisine: { ...type.caption, color: color.textOnDarkMuted },
  rRating: { flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 28, paddingHorizontal: space.sm + 2, borderRadius: radii.pill, backgroundColor: 'rgba(17,17,17,0.6)' },
  rRatingText: { ...type.label, color: color.textInverse },
  rOffer: { position: 'absolute', top: space.md, left: 0, maxWidth: '80%', flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, height: 28, paddingHorizontal: space.md, backgroundColor: color.goldBright, borderTopRightRadius: radii.pill, borderBottomRightRadius: radii.pill },
  rOfferText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.onGold, flexShrink: 1 },
  rFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md },
  rMetaWrap: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexShrink: 1 },
  rMeta: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  rMetaText: { ...type.caption, color: color.textSecondary },
  view: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  viewText: { ...type.label, color: color.primary },
});
