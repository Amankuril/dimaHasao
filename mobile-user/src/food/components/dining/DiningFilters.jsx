import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowDownUp, IndianRupee, MapPin, SlidersHorizontal, Star, Timer, UtensilsCrossed } from 'lucide-react-native';
import { BottomSheet } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { poppins, tw } from '../../../theme';
import { F } from '../shell';

/*
 * The "Filters and sorting" modal and the filter chip row shared by the
 * Dining tab and the two "explore" pages. The Dining tab draws the selected
 * state in the brand green on cream; the explore pages use green-500/50/600.
 */
export const DINING_QUICK_FILTERS = [
  { id: 'delivery-under-30', label: 'Under 30 mins' },
  { id: 'delivery-under-45', label: 'Under 45 mins' },
  { id: 'distance-under-1km', label: 'Under 1km', icon: MapPin },
  { id: 'distance-under-2km', label: 'Under 2km', icon: MapPin },
  { id: 'rating-35-plus', label: '3.5+ Rating' },
  { id: 'rating-4-plus', label: '4.0+ Rating' },
  { id: 'rating-45-plus', label: '4.5+ Rating' },
];

const TABS = [
  { id: 'sort', label: 'Sort By', icon: ArrowDownUp },
  { id: 'time', label: 'Time', icon: Timer },
  { id: 'rating', label: 'Rating', icon: Star },
  { id: 'distance', label: 'Distance', icon: MapPin },
  { id: 'price', label: 'Dish Price', icon: IndianRupee },
  { id: 'cuisine', label: 'Cuisine', icon: UtensilsCrossed },
];

const SORTS = [
  { id: null, label: 'Relevance' },
  { id: 'rating-high', label: 'Rating: High to Low' },
  { id: 'rating-low', label: 'Rating: Low to High' },
];

const PALETTES = {
  dining: { accent: F.green, border: F.green, bg: F.cream, priceBg: 'rgba(10,77,43,0.1)', tabText: F.green, apply: F.green },
  explore: { accent: tw.green600, border: tw.green500, bg: tw.green50, priceBg: tw.green50, tabText: tw.green600, apply: tw.green600 },
};

/** Horizontal chip row: the Filters button, then one toggle per quick filter. */
export function DiningFilterChips({ activeFilters, toggleFilter, onOpenFilters, blackText = false }) {
  return (
    <View style={{ paddingVertical: 4, marginBottom: 16 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.chipRow}>
        <Press scale={0.95} onPress={onOpenFilters} accessibilityLabel="Filters and sorting" style={styles.chip}>
          <SlidersHorizontal size={12} color={tw.gray700} />
          <Text style={[styles.chipText, { color: '#000' }]}>Filters</Text>
        </Press>
        {DINING_QUICK_FILTERS.map((filter) => {
          const Icon = filter.icon;
          const active = activeFilters.has(filter.id);
          return (
            <Press
              key={filter.id}
              scale={0.95}
              onPress={() => toggleFilter(filter.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={filter.label}
              style={[styles.chip, active ? { backgroundColor: F.green, borderColor: F.green } : null]}
            >
              {Icon ? <Icon size={12} color={active ? '#fff' : tw.gray600} fill={active ? '#fff' : 'none'} /> : null}
              <Text style={[styles.chipText, { color: active && !blackText ? '#fff' : '#000' }]}>{filter.label}</Text>
            </Press>
          );
        })}
      </ScrollView>
    </View>
  );
}

function RowOption({ label, active, onPress, palette }) {
  return (
    <Press
      scale={0.98}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      style={[styles.rowOpt, active ? { borderColor: palette.border, backgroundColor: palette.bg } : null]}
    >
      <Text style={[styles.optText, { textAlign: 'left' }, active ? { color: palette.accent } : null]}>{label}</Text>
    </Press>
  );
}

function TileOption({ label, active, onPress, Icon, filled, palette }) {
  return (
    <Press
      scale={0.98}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      style={[styles.tile, active ? { borderColor: palette.border, backgroundColor: palette.bg } : null]}
    >
      <Icon size={24} color={active ? palette.accent : filled ? tw.gray400 : tw.gray600} fill={active && filled ? palette.accent : 'none'} strokeWidth={filled ? 2 : 1.5} />
      <Text style={[styles.optText, active ? { color: palette.accent } : null]}>{label}</Text>
    </Press>
  );
}

export function DiningFilterModal({
  visible,
  onClose,
  activeFilters,
  toggleFilter,
  sortBy,
  setSortBy,
  selectedCuisine,
  setSelectedCuisine,
  resultCount,
  onClear,
  vegMode = false,
  variant = 'dining',
  tabAccent,
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [tab, setTab] = useState('sort');
  const palette = PALETTES[variant] || PALETTES.dining;
  const tabText = tabAccent || palette.tabText;
  const has = (id) => activeFilters.has(id);
  const hasAny = activeFilters.size > 0 || !!sortBy || !!selectedCuisine;
  const cuisines = vegMode
    ? ['Continental', 'Italian', 'Asian', 'Indian', 'Chinese', 'American', 'Cafe']
    : ['Continental', 'Italian', 'Asian', 'Indian', 'Chinese', 'American', 'Seafood', 'Cafe'];

  return (
    <BottomSheet visible={visible} onClose={onClose} backdrop="rgba(0,0,0,0.5)" spring={{ stiffness: 400, damping: 30 }} panelStyle={[styles.panel, { maxHeight: height * 0.85 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Filters and sorting</Text>
        <Press scale={0.96} onPress={onClear} accessibilityLabel="Clear all filters" hitSlop={8}>
          <Text style={styles.clear}>Clear all</Text>
        </Press>
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.tabs}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <Press
                key={t.id}
                scale={1}
                onPress={() => setTab(t.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t.label}
                style={[styles.tab, active ? { backgroundColor: '#fff' } : null]}
              >
                {active ? <View style={styles.tabBar} /> : null}
                <Icon size={20} color={active ? tabText : tw.gray500} strokeWidth={1.5} />
                <Text style={[styles.tabText, active ? { color: tabText } : null]}>{t.label}</Text>
              </Press>
            );
          })}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          {tab === 'sort' ? (
            <View style={styles.section}>
              <Text style={styles.h3}>Sort by</Text>
              <View style={{ gap: 12 }}>
                {SORTS.map((o) => (
                  <RowOption key={o.id || 'relevance'} palette={palette} label={o.label} active={sortBy === o.id} onPress={() => setSortBy(o.id)} />
                ))}
              </View>
            </View>
          ) : null}

          {tab === 'time' ? (
            <View style={styles.section}>
              <Text style={styles.h3}>Estimated Time</Text>
              <View style={styles.grid}>
                <TileOption palette={palette} Icon={Timer} label="Under 30 mins" active={has('delivery-under-30')} onPress={() => toggleFilter('delivery-under-30')} />
                <TileOption palette={palette} Icon={Timer} label="Under 45 mins" active={has('delivery-under-45')} onPress={() => toggleFilter('delivery-under-45')} />
              </View>
            </View>
          ) : null}

          {tab === 'rating' ? (
            <View style={styles.section}>
              <Text style={styles.h3}>Restaurant Rating</Text>
              <View style={styles.grid}>
                <TileOption palette={palette} Icon={Star} filled label="Rated 3.5+" active={has('rating-35-plus')} onPress={() => toggleFilter('rating-35-plus')} />
                <TileOption palette={palette} Icon={Star} filled label="Rated 4.0+" active={has('rating-4-plus')} onPress={() => toggleFilter('rating-4-plus')} />
                <TileOption palette={palette} Icon={Star} filled label="Rated 4.5+" active={has('rating-45-plus')} onPress={() => toggleFilter('rating-45-plus')} />
              </View>
            </View>
          ) : null}

          {tab === 'distance' ? (
            <View style={styles.section}>
              <Text style={styles.h3}>Distance</Text>
              <View style={styles.grid}>
                <TileOption palette={palette} Icon={MapPin} label="Under 1 km" active={has('distance-under-1km')} onPress={() => toggleFilter('distance-under-1km')} />
                <TileOption palette={palette} Icon={MapPin} label="Under 2 km" active={has('distance-under-2km')} onPress={() => toggleFilter('distance-under-2km')} />
              </View>
            </View>
          ) : null}

          {tab === 'price' ? (
            <View style={styles.section}>
              <Text style={styles.h3}>Dish Price</Text>
              <View style={{ gap: 12 }}>
                <RowOption palette={{ ...palette, bg: palette.priceBg }} label="Under ₹200" active={has('price-under-200')} onPress={() => toggleFilter('price-under-200')} />
                <RowOption palette={{ ...palette, bg: palette.priceBg }} label="Under ₹500" active={has('price-under-500')} onPress={() => toggleFilter('price-under-500')} />
              </View>
            </View>
          ) : null}

          {tab === 'cuisine' ? (
            <View style={styles.section}>
              <Text style={styles.h3}>Cuisine</Text>
              <View style={styles.grid}>
                {cuisines.map((cuisine) => {
                  const active = selectedCuisine === cuisine;
                  return (
                    <Press
                      key={cuisine}
                      scale={0.98}
                      onPress={() => setSelectedCuisine(active ? null : cuisine)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                      accessibilityLabel={cuisine}
                      style={[styles.cuisine, active ? { borderColor: palette.border, backgroundColor: palette.bg } : null]}
                    >
                      <Text style={[styles.optText, active ? { color: palette.accent } : null]}>{cuisine}</Text>
                    </Press>
                  );
                })}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Press scale={0.98} onPress={onClose} accessibilityLabel="Close filters" style={styles.footBtn}>
          <Text style={styles.closeText}>Close</Text>
        </Press>
        <Press scale={0.98} onPress={onClose} accessibilityLabel="Show results" style={[styles.footBtn, { backgroundColor: hasAny ? palette.apply : tw.gray200 }]}>
          <Text style={[styles.applyText, hasAny ? { color: '#fff' } : null]}>{hasAny ? `Show ${resultCount} results` : 'Show results'}</Text>
        </Press>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chipRow: { gap: 6, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 12 },
  chip: { height: 28, paddingHorizontal: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200 },
  chipText: { fontSize: 12, lineHeight: 16, ...poppins(700) },

  panel: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  title: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  clear: { fontSize: 14, lineHeight: 20, color: F.green, ...poppins(500) },
  bodyRow: { flexDirection: 'row', flexShrink: 1, minHeight: 0 },
  tabs: { width: 96, backgroundColor: tw.gray50, borderRightWidth: 1, borderRightColor: tw.gray200 },
  tab: { alignItems: 'center', gap: 4, paddingVertical: 16, paddingHorizontal: 8 },
  tabBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: F.green, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  tabText: { fontSize: 12, lineHeight: 15, color: tw.gray500, textAlign: 'center', ...poppins(500) },
  section: { marginBottom: 32 },
  h3: { fontSize: 18, lineHeight: 28, color: tw.gray900, marginBottom: 16, ...poppins(600) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '47%', flexGrow: 1, maxWidth: '48.5%', alignItems: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200 },
  cuisine: { width: '47%', flexGrow: 1, maxWidth: '48.5%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, alignItems: 'center' },
  rowOpt: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200 },
  optText: { fontSize: 14, lineHeight: 20, color: tw.gray700, textAlign: 'center', ...poppins(500) },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.gray200, backgroundColor: '#fff' },
  footBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  closeText: { fontSize: 16, lineHeight: 24, color: tw.gray700, ...poppins(600) },
  applyText: { fontSize: 16, lineHeight: 24, color: tw.gray500, ...poppins(600) },
});
