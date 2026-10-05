import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowDownUp, BadgePercent, IndianRupee, MapPin, ShieldCheck, Star, Timer } from 'lucide-react-native';
import { BottomSheet } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { poppins, tw } from '../../../theme';
import { F } from '../shell';

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
      <Text style={[styles.optText, { textAlign: 'left' }, active ? { color: F.green } : null]}>{label}</Text>
    </Press>
  );
}

function TileOption({ label, active, onPress, Icon, fillWhenActive }) {
  return (
    <Press scale={0.98} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: active }} accessibilityLabel={label} style={[styles.tile, active ? styles.optActive : null]}>
      <Icon size={24} color={active ? F.green : fillWhenActive ? tw.gray400 : tw.gray600} fill={active && fillWhenActive ? F.green : 'none'} strokeWidth={fillWhenActive ? 2 : 1.5} />
      <Text style={[styles.optText, active ? { color: F.green } : null]}>{label}</Text>
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
    <BottomSheet visible={visible} onClose={onClose} backdrop="rgba(0,0,0,0.5)" spring={{ stiffness: 400, damping: 30 }} panelStyle={[styles.panel, { maxHeight: height * 0.85 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Filters and sorting</Text>
        <Press scale={0.96} onPress={onClear} accessibilityLabel="Clear all filters" hitSlop={8}>
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
                style={[styles.tab, active ? { backgroundColor: '#fff' } : null]}
              >
                {active ? <View style={styles.tabBar} /> : null}
                <Icon size={20} color={active ? F.green : tw.gray500} strokeWidth={1.5} />
                <Text style={[styles.tabText, active ? { color: F.green } : null]}>{tab.label}</Text>
              </Press>
            );
          })}
        </View>

        <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} onScroll={onScroll} scrollEventThrottle={32} showsVerticalScrollIndicator={false}>
          <View {...section('sort')}>
            <Text style={styles.h3}>Sort by</Text>
            <View style={{ gap: 12 }}>
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
            <View style={{ gap: 12 }}>
              <RowOption label="Under ₹200" active={has('price-under-200')} onPress={() => toggleFilter('price-under-200')} />
              <RowOption label="Under ₹500" active={has('price-under-500')} onPress={() => toggleFilter('price-under-500')} />
            </View>
          </View>

          <View {...section('trust')}>
            <Text style={styles.h3}>Trust Markers</Text>
            <View style={{ gap: 12 }}>
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

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Press scale={0.98} onPress={onClose} accessibilityLabel="Close filters" style={styles.footBtn}>
          <Text style={styles.closeText}>Close</Text>
        </Press>
        <Press scale={0.98} disabled={loading} onPress={onApply} accessibilityLabel="Show results" style={[styles.footBtn, styles.apply, hasAny ? { backgroundColor: F.green } : null]}>
          <Text style={[styles.applyText, hasAny ? { color: '#fff' } : null]}>{loading ? 'Loading...' : 'Show results'}</Text>
        </Press>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
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
  rowOpt: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200 },
  optActive: { borderColor: F.green, backgroundColor: F.cream },
  optText: { fontSize: 14, lineHeight: 20, color: tw.gray700, textAlign: 'center', ...poppins(500) },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.gray200, backgroundColor: '#fff' },
  footBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  closeText: { fontSize: 16, lineHeight: 24, color: tw.gray700, ...poppins(600) },
  apply: { backgroundColor: tw.gray200 },
  applyText: { fontSize: 16, lineHeight: 24, color: tw.gray500, ...poppins(600) },
});
