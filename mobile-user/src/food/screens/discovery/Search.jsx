import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, BadgePercent, Clock, History, MapPin, Mic, Search, Star, Utensils, X } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import Skeleton from '../../../components/Skeleton';
import { useProfessionalSearch } from '../../hooks/pages/useProfessionalSearch';
import { RestaurantGridSkeleton } from '../../components/discovery/bits';
import { F } from '../../components/shell';
import CategoryBrowse from './CategoryPage';
import { poppins, tw } from '../../../theme';

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
    <View style={{ flex: 1, backgroundColor: tw.slate50 }}>
      <View style={[styles.header, { paddingTop: 8 }]}>
        <Press scale={0.9} onPress={() => (router.canGoBack() ? router.back() : router.replace('/food/user'))} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={20} color={tw.gray700} />
        </Press>
        <View style={{ flex: 1 }}>
          <Search size={16} color={F.green} strokeWidth={2.5} style={styles.sIcon} />
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
          <View style={styles.rightBox}>
            {query ? (
              <Press scale={0.9} onPress={handleClear} accessibilityLabel="Clear search" style={{ padding: 6 }}>
                <X size={16} color={tw.gray400} />
              </Press>
            ) : null}
            <View style={{ width: 1, height: 16, backgroundColor: tw.gray200, marginHorizontal: 2 }} />
            <Press scale={0.95} onPress={() => inputRef.current?.focus()} accessibilityLabel="Voice search" style={{ padding: 6, borderRadius: 12 }}>
              <Mic size={20} color={F.green} />
            </Press>
          </View>
        </View>
      </View>

      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" onScroll={onScroll} scrollEventThrottle={64} contentContainerStyle={{ padding: 16, paddingBottom: 96 + insets.bottom }}>
        {!query && !isTakeawaySearch ? (
          <View style={{ marginBottom: 32 }}>
            <View style={styles.catHead}>
              <Text style={styles.catTitle}>TOP CATEGORIES</Text>
              {visibleCategories.length > 8 ? <Text style={styles.swipe}>SWIPE FOR MORE</Text> : null}
            </View>
            {categories.length === 0 ? (
              <View style={styles.catGrid}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <View key={i} style={styles.catCell}>
                    <Skeleton style={{ width: 60, height: 60, borderRadius: 22, backgroundColor: tw.gray100, marginBottom: 8 }} />
                    <Skeleton style={{ width: 48, height: 12, borderRadius: 4, backgroundColor: tw.gray100 }} />
                  </View>
                ))}
              </View>
            ) : visibleCategories.length === 0 ? (
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, paddingHorizontal: 4, ...poppins(400) }}>No veg categories available</Text>
            ) : (
              <View style={styles.catGrid}>
                {visibleCategories.map((cat) => {
                  const active = selectedCategoryId === cat._id;
                  return (
                    <Press key={cat._id} scale={0.95} onPress={() => handleCategoryClick(cat._id)} accessibilityLabel={cat.name} accessibilityState={{ selected: active }} style={styles.catCell}>
                      <View style={[styles.catBox, active ? styles.catBoxActive : null]}>
                        <View style={styles.catInner}>
                          {cat.image ? (
                            <Image source={{ uri: getMediaUrl(cat.image) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.gray50 }}>
                              <Utensils size={24} color={tw.gray200} />
                            </View>
                          )}
                        </View>
                      </View>
                      <Text numberOfLines={1} style={[styles.catName, active ? { color: F.green } : null]}>{cat.name}</Text>
                    </Press>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {loading && !selectedCategorySlug ? (
          <View style={{ gap: 24, marginTop: 24 }}>
            <View style={styles.catHead}>
              <Skeleton style={{ height: 16, width: 128, borderRadius: 4, backgroundColor: tw.gray100 }} />
              <Skeleton style={{ height: 16, width: 64, borderRadius: 4, backgroundColor: tw.gray100 }} />
            </View>
            <RestaurantGridSkeleton count={4} />
          </View>
        ) : null}

        {!query && !loading && history.length > 0 ? (
          <View style={{ marginBottom: 32 }}>
            <Text style={styles.recent}>RECENTLY SEARCHED</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {history.map((term, i) => (
                <Press key={i} scale={0.97} onPress={() => setQuery(term)} accessibilityLabel={term} style={styles.chip}>
                  <History size={12} color={tw.slate600} />
                  <Text style={styles.chipText}>{term}</Text>
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
            style={{ marginTop: 16, marginHorizontal: -16, minHeight: 600 }}
          >
            <CategoryBrowse key={selectedCategorySlug} embeddedCategorySlug={selectedCategorySlug} hideHeader hideCategoryCarousel hideFilters disableAutoScroll nearEndRef={nearEnd} />
          </View>
        ) : !loading && query ? (
          <View
            ref={resultsRef}
            onLayout={(e) => {
              resultsY.current = e.nativeEvent.layout.y;
            }}
            style={{ gap: 32 }}
          >
            {results.dishes.length > 0 ? (
              <View>
                <View style={styles.secHead}>
                  <Text style={styles.secTitle}>MATCHED DISHES</Text>
                  <View style={styles.count}>
                    <Text style={styles.countText}>{results.dishes.length} results</Text>
                  </View>
                </View>
                <View style={{ gap: 16 }}>
                  {results.dishes.map((r) => (
                    <Press
                      key={r._id}
                      scale={0.98}
                      onPress={() => router.push(`/food/user/restaurants/${r.slug || r._id}${r.matchedDishId ? `?dish=${r.matchedDishId}` : ''}`)}
                      accessibilityLabel={`${r.matchedDish || query} at ${r.restaurantName}`}
                      style={styles.dish}
                    >
                      <View style={styles.dishImg}>
                        <Image source={{ uri: getMediaUrl(r.matchedDishImage || r.profileImage || r.image || (Array.isArray(r.images) && r.images[0])) || undefined }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        {r.pureVegRestaurant ? (
                          <View style={styles.vegBox}>
                            <View style={{ flex: 1, backgroundColor: tw.green600, borderRadius: 999 }} />
                          </View>
                        ) : null}
                      </View>
                      <View style={{ flex: 1, minWidth: 0, paddingVertical: 4 }}>
                        <View style={styles.dishTag}>
                          <Text style={styles.dishTagText}>{String(r.matchedDish || query).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.dishName} numberOfLines={1}>{r.restaurantName}</Text>
                        <View style={styles.dishMeta}>
                          <Star size={12} color={F.green} fill={F.green} />
                          <Text style={styles.dishRating}>{r.rating || 'New'}</Text>
                          <Text style={{ color: tw.gray200 }}>•</Text>
                          <Clock size={12} color={tw.gray500} />
                          <Text style={styles.dishMetaText}>{r.estimatedDeliveryTime || '30-40 mins'}</Text>
                          <Text style={{ color: tw.gray200 }}>•</Text>
                          <Text style={[styles.dishMetaText, { flexShrink: 1 }]} numberOfLines={1}>{r.cuisines?.slice(0, 2).join(', ')}</Text>
                        </View>
                      </View>
                    </Press>
                  ))}
                </View>
              </View>
            ) : null}

            {results.restaurants.length > 0 ? (
              <View>
                <View style={styles.secHead}>
                  <Text style={styles.secTitle}>RESTAURANTS</Text>
                  <View style={styles.count}>
                    <Text style={styles.countText}>{results.restaurants.length} stores</Text>
                  </View>
                </View>
                <View style={{ gap: 24 }}>
                  {results.restaurants.map((r) => (
                    <Press key={r._id} scale={0.98} onPress={() => router.push(`/food/user/restaurants/${r.slug || r._id}`)} accessibilityLabel={r.restaurantName}>
                      <View style={styles.rImg}>
                        <Image source={{ uri: getMediaUrl(r.profileImage || r.image || (Array.isArray(r.images) && r.images[0])) || undefined }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.2)', 'transparent']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={[StyleSheet.absoluteFill, { opacity: 0.8 }]} />
                        <View style={styles.rBottom}>
                          <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                            <Text style={styles.rName} numberOfLines={1}>{r.restaurantName}</Text>
                            <Text style={styles.rCuisine} numberOfLines={1}>{String(r.cuisines?.join(', ') || '').toUpperCase()}</Text>
                          </View>
                          <View style={styles.rRating}>
                            <Star size={16} color="#fff" fill="#fff" />
                            <Text style={styles.rRatingText}>{r.rating || '4.0'}</Text>
                          </View>
                        </View>
                        {r.offer ? (
                          <View style={styles.rOffer}>
                            <BadgePercent size={14} color="#fff" />
                            <Text style={styles.rOfferText}>{String(r.offer).toUpperCase()}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.rFoot}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
                          <View style={styles.rMeta}>
                            <Clock size={14} color={F.green} />
                            <Text style={styles.rMetaText}>{String(r.estimatedDeliveryTime || '30 mins').toUpperCase()}</Text>
                          </View>
                          <Text style={{ color: tw.gray200 }}>•</Text>
                          <View style={[styles.rMeta, { flexShrink: 1 }]}>
                            <MapPin size={14} color={F.green} />
                            <Text style={styles.rMetaText} numberOfLines={1}>{String(r.location?.area || 'Nearby').toUpperCase()}</Text>
                          </View>
                        </View>
                        <LinearGradient colors={[F.green, '#F87171']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.view}>
                          <Text style={styles.viewText}>VIEW MENU</Text>
                        </LinearGradient>
                      </View>
                    </Press>
                  ))}
                </View>
              </View>
            ) : null}

            {!loading && results.restaurants.length === 0 && results.dishes.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 80 }}>
                <View style={styles.emptyIcon}>
                  <Search size={32} color={tw.slate300} />
                </View>
                <Text style={styles.emptyTitle}>We couldn&apos;t find any results</Text>
                <Text style={styles.emptyBody}>Maybe try searching for something else or check your spelling</Text>
                <Press scale={0.97} onPress={handleClear} accessibilityLabel="Clear all filters" style={styles.emptyBtn}>
                  <Text style={styles.emptyBtnText}>Clear all filters</Text>
                </Press>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.8)', borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  back: { padding: 6, borderRadius: 20 },
  sIcon: { position: 'absolute', left: 14, top: 12, zIndex: 1 },
  placeholder: { position: 'absolute', left: 40, right: 80, top: 0, height: 40, lineHeight: 40, fontSize: 14, color: tw.gray400, ...poppins(400) },
  input: { height: 40, paddingVertical: 0, paddingLeft: 40, paddingRight: 80, backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray100, borderRadius: 16, fontSize: 14, color: tw.gray900, ...poppins(400) },
  rightBox: { position: 'absolute', right: 6, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  catHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 4 },
  catTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: tw.gray400, ...poppins(900) },
  swipe: { fontSize: 10, lineHeight: 15, letterSpacing: -0.5, color: F.green, ...poppins(700) },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 24 },
  catCell: { width: '25%', alignItems: 'center' },
  catBox: { width: 60, height: 60, borderRadius: 22, marginBottom: 8, borderWidth: 2, borderColor: tw.gray50, backgroundColor: '#fff', ...{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' } },
  catBoxActive: { borderColor: F.green, boxShadow: '0 4px 6px -1px rgba(10,77,43,0.05)' },
  catInner: { ...StyleSheet.absoluteFill, borderRadius: 20, overflow: 'hidden' },
  catName: { fontSize: 10, lineHeight: 15, color: tw.gray500, textAlign: 'center', ...poppins(700) },
  recent: { fontSize: 14, lineHeight: 20, letterSpacing: 0.7, color: tw.slate500, marginBottom: 8, paddingHorizontal: 4, ...poppins(600) },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate200, borderRadius: 999 },
  chipText: { fontSize: 14, lineHeight: 20, color: tw.slate600, ...poppins(400) },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 4 },
  secTitle: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: tw.gray400, ...poppins(900) },
  count: { backgroundColor: tw.gray100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  countText: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(700) },
  dish: { flexDirection: 'row', gap: 16, padding: 12, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: tw.gray100, overflow: 'hidden', ...{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' } },
  dishImg: { width: 96, height: 96, borderRadius: 16, overflow: 'hidden', backgroundColor: tw.gray50 },
  vegBox: { position: 'absolute', top: 6, left: 6, width: 16, height: 16, borderWidth: 1, borderColor: tw.green600, padding: 1.5, backgroundColor: '#fff', borderRadius: 2 },
  dishTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(10,77,43,0.05)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginBottom: 4 },
  dishTagText: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.9, color: '#F87171', ...poppins(900) },
  dishName: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(900) },
  dishMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dishRating: { fontSize: 11, lineHeight: 16.5, color: tw.gray900, ...poppins(900) },
  dishMetaText: { fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(500) },
  rImg: { borderRadius: 32, overflow: 'hidden', aspectRatio: 16 / 10, marginBottom: 16, backgroundColor: tw.gray100, ...{ boxShadow: '0 20px 25px -5px rgba(229,231,235,0.2)' } },
  rBottom: { position: 'absolute', bottom: 16, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  rName: { fontSize: 20, lineHeight: 28, color: '#fff', marginBottom: 6, ...poppins(900) },
  rCuisine: { fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, color: 'rgba(255,255,255,0.8)', ...poppins(700) },
  rRating: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  rRatingText: { color: '#fff', fontSize: 14, lineHeight: 20, ...poppins(900) },
  rOffer: { position: 'absolute', top: 20, left: 0, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: F.green, paddingHorizontal: 16, paddingVertical: 8, borderTopRightRadius: 16, borderBottomRightRadius: 16 },
  rOfferText: { color: '#fff', fontSize: 10, lineHeight: 15, letterSpacing: -0.5, ...poppins(900) },
  rFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, gap: 8 },
  rMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rMetaText: { fontSize: 12, lineHeight: 16, letterSpacing: -0.3, color: tw.gray500, ...poppins(700) },
  view: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  viewText: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: '#fff', ...poppins(900) },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, lineHeight: 28, color: tw.slate900, marginBottom: 8, ...poppins(700) },
  emptyBody: { fontSize: 14, lineHeight: 20, color: tw.slate500, maxWidth: 320, textAlign: 'center', ...poppins(400) },
  emptyBtn: { marginTop: 24, paddingHorizontal: 16, height: 36, borderRadius: 12, borderWidth: 1, borderColor: tw.rose500, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { color: tw.rose500, fontSize: 14, lineHeight: 20, ...poppins(500) },
});
