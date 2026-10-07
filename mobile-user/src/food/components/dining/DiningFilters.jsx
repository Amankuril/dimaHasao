import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowDownUp, IndianRupee, MapPin, SlidersHorizontal, Star, Timer, UtensilsCrossed } from 'lucide-react-native';
import { BottomSheet } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { Button, Chip } from '../../../components/ds';
import { color, elevation, radii, space, type } from '../../../theme';

/*
 * The "Filters and sorting" modal and the filter chip row shared by the
 * Dining tab and the two "explore" pages. Both draw the selected state in
 * the brand green (design-system tokens); `variant` / `blackText` / `tabAccent`
 * are still accepted so callers stay unchanged.
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

const BRAND = { accent: color.primary, border: color.primary, bg: color.primarySoft, priceBg: color.primarySoft, tabText: color.primary, apply: color.primary };
const PALETTES = { dining: BRAND, explore: BRAND };

/** Horizontal chip row: the Filters button, then one toggle per quick filter. */
export function DiningFilterChips({ activeFilters, toggleFilter, onOpenFilters }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.chipRow}>
        <Chip label="Filters" icon={SlidersHorizontal} onPress={onOpenFilters} />
        {DINING_QUICK_FILTERS.map((filter) => (
          <Chip key={filter.id} label={filter.label} icon={filter.icon} selected={activeFilters.has(filter.id)} onPress={() => toggleFilter(filter.id)} />
        ))}
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
      <Icon size={24} color={active ? palette.accent : color.textMuted} fill={active && filled ? palette.accent : 'none'} strokeWidth={2} />
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
    <BottomSheet visible={visible} onClose={onClose} backdrop={color.overlay} spring={{ stiffness: 400, damping: 30 }} panelStyle={[styles.panel, { maxHeight: height * 0.85 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Filters and sorting</Text>
        <Press scale={0.96} onPress={onClear} accessibilityLabel="Clear all filters" style={styles.clearBtn}>
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
                style={[styles.tab, active ? { backgroundColor: color.surface } : null]}
              >
                {active ? <View style={styles.tabBar} /> : null}
                <Icon size={20} color={active ? tabText : color.textMuted} strokeWidth={2} />
                <Text style={[styles.tabText, active ? { color: tabText } : null]}>{t.label}</Text>
              </Press>
            );
          })}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg }} showsVerticalScrollIndicator={false}>
          {tab === 'sort' ? (
            <View style={styles.section}>
              <Text style={styles.h3}>Sort by</Text>
              <View style={{ gap: space.md }}>
                {SORTS.map((o) => (
                  <RowOption key={o.id || 'relevance'} palette={palette} label={o.label} active={sortBy === o.id} onPress={() => setSortBy(o.id)} />
                ))}
              </View>
            </View>
          ) : null}

          {tab === 'time' ? (
            <View style={styles.section}>
              <Text style={styles.h3}>Estimated time</Text>
              <View style={styles.grid}>
                <TileOption palette={palette} Icon={Timer} label="Under 30 mins" active={has('delivery-under-30')} onPress={() => toggleFilter('delivery-under-30')} />
                <TileOption palette={palette} Icon={Timer} label="Under 45 mins" active={has('delivery-under-45')} onPress={() => toggleFilter('delivery-under-45')} />
              </View>
            </View>
          ) : null}

          {tab === 'rating' ? (
            <View style={styles.section}>
              <Text style={styles.h3}>Restaurant rating</Text>
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
              <Text style={styles.h3}>Dish price</Text>
              <View style={{ gap: space.md }}>
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

      <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
        <Button title="Close" variant="outline" onPress={onClose} accessibilityLabel="Close filters" style={{ flex: 1 }} />
        <Button title={hasAny ? `Show ${resultCount} results` : 'Show results'} variant={hasAny ? 'primary' : 'secondary'} onPress={onClose} accessibilityLabel="Show results" style={{ flex: 1 }} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chipRow: { gap: space.sm, alignItems: 'center', paddingHorizontal: space.lg },

  panel: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden', ...elevation.sheet },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.lg, paddingRight: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  title: { ...type.heading, color: color.text },
  clearBtn: { minHeight: 44, paddingHorizontal: space.sm, justifyContent: 'center' },
  clear: { ...type.label, color: color.primary },
  bodyRow: { flexDirection: 'row', flexShrink: 1, minHeight: 0 },
  tabs: { width: 96, backgroundColor: color.surfaceMuted, borderRightWidth: 1, borderRightColor: color.border },
  tab: { alignItems: 'center', gap: space.xs, paddingVertical: space.lg, paddingHorizontal: space.sm, minHeight: 64 },
  tabBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: color.primary, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  tabText: { ...type.caption, color: color.textSecondary, textAlign: 'center' },
  section: { marginBottom: space.xxxl },
  h3: { ...type.subheading, color: color.text, marginBottom: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { width: '47%', flexGrow: 1, maxWidth: '48.5%', alignItems: 'center', gap: space.sm, padding: space.lg, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  cuisine: { width: '47%', flexGrow: 1, maxWidth: '48.5%', minHeight: 48, paddingHorizontal: space.lg, justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: color.border, alignItems: 'center', backgroundColor: color.surface },
  rowOpt: { minHeight: 48, paddingHorizontal: space.lg, justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  optText: { ...type.body, color: color.text, textAlign: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, backgroundColor: color.surface },
});
