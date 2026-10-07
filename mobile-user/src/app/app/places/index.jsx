import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Fa from '../../../components/Fa';
import { Chip, ChipRow, IconButton, fa } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { Pulse, StateBlock } from '../../../components/dh/ui';
import { Header, PatternDivider } from '../../../components/dh/Header';
import { PlaceCard } from '../../../components/dh/places';
import { fetchDestinations } from '../../../api/dh/toursApi';
import { color, radii, space, type } from '../../../theme';

// Web: DimaHasao/pages/TouristPlacesList.jsx (/app/places)

const FILTER_CHIPS = [
  { id: 'all', label: 'All Places' },
  { id: 'viewpoint', label: 'Viewpoints' },
  { id: 'town', label: 'Town & Culture' },
  { id: 'trek', label: 'Treks & Peaks' },
  { id: 'temple', label: 'Temples' },
  { id: 'lake', label: 'Lakes' },
  { id: 'wildlife', label: 'Wildlife' },
];

export default function TouristPlacesList() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  const { data: places = [], isPending: loading, error, refetch, isRefetching } = useQuery({ queryKey: ['destinations'], queryFn: () => fetchDestinations() });
  const loadError = error ? error?.response?.data?.message || 'Could not load places. Please try again.' : '';

  const needle = searchFilter.toLowerCase();
  const filteredPlaces = places.filter((place) => {
    const matchesSearch =
      place.name.toLowerCase().includes(needle) || place.location.toLowerCase().includes(needle) || place.description.toLowerCase().includes(needle);
    return matchesSearch && (activeFilter === 'all' || place.category === activeFilter);
  });

  // Chips with nothing behind them are noise once an admin curates the list.
  const visibleChips = FILTER_CHIPS.filter((chip) => chip.id === 'all' || places.some((p) => p.category === chip.id));

  const listHeader = (
    <ChipRow contentStyle={styles.chips}>
      {visibleChips.map((chip) => (
        <Chip key={chip.id} label={chip.label} selected={activeFilter === chip.id} onPress={() => setActiveFilter(chip.id)} />
      ))}
    </ChipRow>
  );

  const empty = loading ? (
    <View style={{ gap: space.md }} accessibilityLabel="Loading places">
      {[0, 1, 2].map((n) => (
        <View key={n} style={styles.skeletonCard}>
          <Pulse style={{ height: 180, borderRadius: 0 }} />
          <View style={{ padding: space.lg, gap: space.sm }}>
            <Pulse style={{ height: 16, width: '66%' }} />
            <Pulse tone={100} style={{ height: 13, width: '50%' }} />
          </View>
        </View>
      ))}
    </View>
  ) : loadError ? (
    <StateBlock icon="fa-solid fa-triangle-exclamation" iconColor={color.warning} title="Couldn't load destinations" text={loadError} actionLabel="Try again" onAction={() => refetch()} />
  ) : (
    <StateBlock
      icon="fa-solid fa-mountain"
      title={searchFilter || activeFilter !== 'all' ? 'No destinations match your search' : 'No destinations published yet'}
      actionLabel="Reset filters"
      onAction={() => {
        setSearchFilter('');
        setActiveFilter('all');
      }}
    />
  );

  return (
    <View style={styles.page}>
      <Header title="TOURIST PLACES" subtitle="Explore the Beauty of Dima Hasao" showBack rightAction="search" onSearchClick={() => setShowSearchInput((v) => !v)} />
      <PatternDivider variant="native" />

      {showSearchInput ? (
        <View style={styles.searchBar}>
          <View style={styles.searchBox}>
            <Fa name="fa-solid fa-magnifying-glass" size={16} color={color.textMuted} />
            <TextInput
              value={searchFilter}
              onChangeText={setSearchFilter}
              placeholder="Filter tourist destinations..."
              placeholderTextColor={color.textMuted}
              autoFocus
              returnKeyType="search"
              style={styles.searchInput}
              accessibilityLabel="Filter tourist destinations"
            />
            {searchFilter ? <IconButton icon={fa('fa-solid fa-xmark')} label="Clear" size={40} iconSize={16} iconColor={color.textMuted} onPress={() => setSearchFilter('')} /> : null}
          </View>
        </View>
      ) : null}

      <FlatList
        data={loading || loadError ? [] : filteredPlaces}
        keyExtractor={(place) => place.id}
        renderItem={({ item }) => <PlaceCard place={item} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<View style={{ paddingHorizontal: space.lg }}>{empty}</View>}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{ flexGrow: 1 }}
        ListHeaderComponentStyle={{ marginBottom: space.lg }}
        CellRendererComponent={({ children, style, ...rest }) => (
          <View {...rest} style={[style, { paddingHorizontal: space.lg }]}>
            {children}
          </View>
        )}
        refreshing={isRefetching}
        onRefresh={refetch}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListFooterComponent={
          <View style={{ marginTop: space.xxl }}>
            <PatternDivider variant="native" />
            <View style={[styles.footer, { paddingBottom: NAV_CLEARANCE + insets.bottom + space.lg }]}>
              <Fa name="fa-solid fa-leaf" size={14} color={color.gold} />
              <Text style={styles.footerText}>Plan your trip, stay safe and enjoy the beauty of Dima Hasao!</Text>
              <View style={styles.footerDots}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.footerDot} />
                ))}
              </View>
            </View>
          </View>
        }
      />
    </View>
  );
}

const Separator = () => <View style={{ height: space.lg }} />;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  searchBar: { paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  searchBox: { height: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.surfaceMuted, borderRadius: radii.md, paddingLeft: space.md, paddingRight: space.xs },
  searchInput: { flex: 1, minWidth: 0, height: 46, padding: 0, ...type.body, color: color.text },
  chips: { paddingTop: space.md },
  skeletonCard: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden' },
  footer: { backgroundColor: color.primaryDeep, paddingTop: space.xl, paddingHorizontal: space.xl, alignItems: 'center', gap: space.sm },
  footerText: { ...type.tagline, fontSize: 15, lineHeight: 22, color: color.textOnDarkMuted, textAlign: 'center' },
  footerDots: { flexDirection: 'row', justifyContent: 'center', gap: space.xs, opacity: 0.7 },
  footerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.gold },
});
