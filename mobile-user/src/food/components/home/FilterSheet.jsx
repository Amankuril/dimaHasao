import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowDownUp, BadgePercent, Check, IndianRupee, MapPin, ShieldCheck, Star, Timer } from 'lucide-react-native';
import { BottomSheet } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { Button } from '../../../components/ds';
import { color, radii, space, type } from '../../../theme';

const TABS = [
  { id: 'sort', label: 'Sort By', icon: ArrowDownUp },
  { id: 'time', label: 'Time', icon: Timer },
  { id: 'rating', label: 'Rating', icon: Star },
  { id: 'distance', label: 'Distance', icon: MapPin },
  { id: 'price', label: 'Dish Price', icon: IndianRupee },
  { id: 'offers', label: 'Offers', icon: BadgePercent },
  { id: 'trust', label: 'Trust', icon: ShieldCheck },
];
// The web lists the Offers tab before Trust but lays the Trust section out first.
const TAB_ORDER = ['sort', 'time', 'rating', 'distance', 'price', 'trust', 'offers'];

const SORTS = [
  { id: null, label: 'Relevance' },
  { id: 'price-low', label: 'Price: Low to High' },
  { id: 'price-high', label: 'Price: High to Low' },
  { id: 'rating-high', label: 'Rating: High to Low' },
  { id: 'rating-low', label: 'Rating: Low to High' },
];

function RowOption({ label, active, onPress }) {
  return (
    <Press scale={0.98} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: active }} accessibilityLabel={label} style={[styles.rowOpt, active ? styles.optActive : null]}>
      <Text style={[styles.optText, { textAlign: 'left', flex: 1 }, active ? styles.optTextActive : null]}>{label}</Text>
      <View style={[styles.box, active ? styles.boxOn : null]}>{active ? <Check size={14} color={color.onPrimary} strokeWidth={3} /> : null}</View>
    </Press>
  );
}

function TileOption({ label, active, onPress, Icon, fillWhenActive }) {
  return (
    <Press scale={0.98} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: active }} accessibilityLabel={label} style={[styles.tile, active ? styles.optActive : null]}>
      <Icon size={22} color={active ? (fillWhenActive ? color.goldText : color.primary) : color.textMuted} fill={active && fillWhenActive ? color.gold : 'none'} strokeWidth={fillWhenActive ? 2 : 1.75} />
      <Text style={[styles.optText, active ? styles.optTextActive : null]}>{label}</Text>
    </Press>
  );
}

/** "Filters and sorting" bottom sheet of the food Home / Takeaway pages. */
export default function FilterSheet({ visible, onClose, activeFilters, toggleFilter, sortBy, setSortBy, selectedCuisine, onClear, onApply, loading, isTakeaway }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('sort');
  const scroller = useRef(null);
  const offsets = useRef({});
  const has = (id) => activeFilters.has(id);
  const hasAny = activeFilters.size > 0 || !!sortBy || !!selectedCuisine;

  const onScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y + 40;
    let current = 'sort';
    TAB_ORDER.forEach((id) => {
      if (offsets.current[id] != null && offsets.current[id] <= y) current = id;
    });
    if (current !== activeTab) setActiveTab(current);
  };
  const section = (id) => ({
    onLayout: (e) => {
      offsets.current[id] = e.nativeEvent.layout.y;
    },
    style: styles.section,
  });

  return (
    <BottomSheet visible={visible} onClose={onClose} backdrop={color.overlay} spring={{ stiffness: 400, damping: 30 }} panelStyle={[styles.panel, { maxHeight: height * 0.85 }]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Filters and sorting</Text>
        <Press scale={0.96} onPress={onClear} accessibilityLabel="Clear all filters" style={styles.clearBtn}>
          <Text style={styles.clear}>Clear all</Text>
        </Press>
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.tabs}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <Press
                key={tab.id}
                scale={1}
                onPress={() => {
                  setActiveTab(tab.id);
                  scroller.current?.scrollTo({ y: offsets.current[tab.id] || 0, animated: true });
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
                style={[styles.tab, active ? { backgroundColor: color.surface } : null]}
              >
                {active ? <View style={styles.tabBar} /> : null}
                <Icon size={20} color={active ? color.primary : color.textMuted} strokeWidth={1.75} />
                <Text style={[styles.tabText, active ? { color: color.primary } : null]}>{tab.label}</Text>
              </Press>
            );
          })}
        </View>

        <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg }} onScroll={onScroll} scrollEventThrottle={32} showsVerticalScrollIndicator={false}>
          <View {...section('sort')}>
            <Text style={styles.h3}>Sort by</Text>
            <View style={{ gap: space.sm }}>
              {SORTS.map((o) => (
                <RowOption key={o.id || 'relevance'} label={o.label} active={sortBy === o.id} onPress={() => setSortBy(o.id)} />
              ))}
            </View>
          </View>

          <View {...section('time')}>
            <Text style={styles.h3}>{isTakeaway ? 'Estimated Readiness' : 'Estimated Time'}</Text>
            <View style={styles.grid}>
              <TileOption Icon={Timer} label={isTakeaway ? 'Within 30 mins' : 'Under 30 mins'} active={has('delivery-under-30')} onPress={() => toggleFilter('delivery-under-30')} />
              <TileOption Icon={Timer} label={isTakeaway ? 'Within 45 mins' : 'Under 45 mins'} active={has('delivery-under-45')} onPress={() => toggleFilter('delivery-under-45')} />
            </View>
          </View>

          <View {...section('rating')}>
            <Text style={styles.h3}>Restaurant Rating</Text>
            <View style={styles.grid}>
              <TileOption Icon={Star} fillWhenActive label="Rated 3.5+" active={has('rating-35-plus')} onPress={() => toggleFilter('rating-35-plus')} />
              <TileOption Icon={Star} fillWhenActive label="Rated 4.0+" active={has('rating-4-plus')} onPress={() => toggleFilter('rating-4-plus')} />
              <TileOption Icon={Star} fillWhenActive label="Rated 4.5+" active={has('rating-45-plus')} onPress={() => toggleFilter('rating-45-plus')} />
            </View>
          </View>

          <View {...section('distance')}>
            <Text style={styles.h3}>Distance</Text>
            <View style={styles.grid}>
              <TileOption Icon={MapPin} label="Under 1 km" active={has('distance-under-1km')} onPress={() => toggleFilter('distance-under-1km')} />
              <TileOption Icon={MapPin} label="Under 2 km" active={has('distance-under-2km')} onPress={() => toggleFilter('distance-under-2km')} />
            </View>
          </View>

          <View {...section('price')}>
            <Text style={styles.h3}>Dish Price</Text>
            <View style={{ gap: space.sm }}>
              <RowOption label="Under ₹200" active={has('price-under-200')} onPress={() => toggleFilter('price-under-200')} />
              <RowOption label="Under ₹500" active={has('price-under-500')} onPress={() => toggleFilter('price-under-500')} />
            </View>
          </View>

          <View {...section('trust')}>
            <Text style={styles.h3}>Trust Markers</Text>
            <View style={{ gap: space.sm }}>
              <RowOption label="Top Rated" active={has('top-rated')} onPress={() => toggleFilter('top-rated')} />
              <RowOption label="Trusted by 1000+ users" active={has('trusted')} onPress={() => toggleFilter('trusted')} />
            </View>
          </View>

          <View {...section('offers')}>
            <Text style={styles.h3}>Offers</Text>
            <RowOption label="Restaurants with offers" active={has('has-offers')} onPress={() => toggleFilter('has-offers')} />
          </View>
        </ScrollView>
      </View>

      <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
        <Button title="Close" variant="outline" accessibilityLabel="Close filters" onPress={onClose} style={{ flex: 1 }} />
        <Button
          title={loading ? 'Loading...' : 'Show results'}
          variant={hasAny ? 'primary' : 'secondary'}
          accessibilityLabel="Show results"
          disabled={loading}
          onPress={onApply}
          style={{ flex: 1 }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.lg, paddingRight: space.xs, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  title: { ...type.heading, color: color.text },
  clearBtn: { minHeight: 44, paddingHorizontal: space.md, justifyContent: 'center' },
  clear: { ...type.label, color: color.primary },
  bodyRow: { flexDirection: 'row', flexShrink: 1, minHeight: 0 },
  tabs: { width: 96, backgroundColor: color.surfaceMuted, borderRightWidth: 1, borderRightColor: color.border },
  tab: { alignItems: 'center', gap: space.xs, paddingVertical: space.md + 2, paddingHorizontal: space.xs },
  tabBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: color.primary, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  tabText: { ...type.caption, color: color.textSecondary, textAlign: 'center' },
  section: { marginBottom: space.xxl },
  h3: { ...type.subheading, color: color.text, marginBottom: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '47%', flexGrow: 1, maxWidth: '48.5%', minHeight: 84, alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  rowOpt: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  optActive: { borderColor: color.primary, backgroundColor: color.primarySoft },
  optText: { ...type.body, color: color.text, textAlign: 'center' },
  optTextActive: { color: color.primary, fontFamily: 'Poppins_600SemiBold' },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { borderColor: color.primary, backgroundColor: color.primary },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.surface },
});
