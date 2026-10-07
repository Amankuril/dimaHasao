import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Fa from '../../../components/Fa';
import { Chip, ChipRow, IconButton, fa } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { SelectField } from '../../../components/kit';
import { Header, PatternDivider } from '../../../components/dh/Header';
import { HotelCard } from '../../../components/dh/hotel';
import { Panel, Pulse, StateBlock, Stepper, dhs } from '../../../components/dh/ui';
import { fetchHotels } from '../../../api/dh/hotelApi';
import { color, radii, space, type } from '../../../theme';

// Web: DimaHasao/pages/HotelListScreen.jsx (/app/hotels)

const PROPERTY_TYPES = ['All', 'Resort', 'Homestay', 'Hotel', 'Lodge'];
const SORTS = [
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

export default function HotelListScreen() {
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [guestCount, setGuestCount] = useState(2);
  const [nights, setNights] = useState(1);

  const { data: hotels = [], isPending: loading, error, refetch, isRefetching } = useQuery({ queryKey: ['hotels'], queryFn: () => fetchHotels() });
  const loadError = error ? error?.response?.data?.message || 'Could not load stays. Please try again.' : '';

  const filteredHotels = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return hotels
      .filter((hotel) => {
        const matchesType = selectedType === 'All' || hotel.type === selectedType;
        const matchesSearch =
          (hotel.name || '').toLowerCase().includes(q) || (hotel.location || '').toLowerCase().includes(q) || (hotel.description || '').toLowerCase().includes(q);
        return matchesType && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.startingPrice - b.startingPrice;
        if (sortBy === 'price-high') return b.startingPrice - a.startingPrice;
        if (sortBy === 'rating') return b.rating - a.rating;
        return b.reviewCount - a.reviewCount;
      });
  }, [hotels, selectedType, searchQuery, sortBy]);

  const header = (
    <View style={{ gap: space.lg, marginBottom: space.lg }}>
      <Panel style={{ gap: space.md }}>
        <View style={styles.searchBox}>
          <Fa name="fa-solid fa-magnifying-glass" size={16} color={color.primary} />
          <TextInput
            placeholder="Search Haflong, Jatinga, Umrangso..."
            placeholderTextColor={color.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            style={styles.searchInput}
            accessibilityLabel="Search stays"
          />
          {searchQuery ? <IconButton icon={fa('fa-solid fa-xmark')} label="Clear search" size={40} iconSize={16} iconColor={color.textMuted} onPress={() => setSearchQuery('')} /> : null}
        </View>

        <View style={styles.pref}>
          <View style={[dhs.row, { gap: space.sm, flexShrink: 1 }]}>
            <Fa name="fa-regular fa-moon" size={16} color={color.primary} />
            <Text style={styles.prefLabel}>Nights</Text>
          </View>
          <Stepper value={nights} onChange={setNights} label="nights" />
        </View>
        <View style={styles.pref}>
          <View style={[dhs.row, { gap: space.sm, flexShrink: 1 }]}>
            <Fa name="fa-solid fa-users" size={16} color={color.primary} />
            <Text style={styles.prefLabel}>Guests</Text>
          </View>
          <Stepper value={guestCount} onChange={setGuestCount} label="guests" />
        </View>
      </Panel>

      <ChipRow style={styles.chipRow} contentStyle={{ paddingHorizontal: space.lg }}>
        {PROPERTY_TYPES.map((t) => (
          <Chip key={t} label={t === 'All' ? 'All stays' : `${t}s`} selected={selectedType === t} onPress={() => setSelectedType(t)} />
        ))}
      </ChipRow>

      <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm }]}>
        <Text style={styles.count}>
          {filteredHotels.length} {filteredHotels.length === 1 ? 'stay' : 'stays'} available
        </Text>
        <View style={[dhs.row, { gap: space.sm }]}>
          <Text style={styles.sortLabel}>Sort</Text>
          <SelectField value={sortBy} options={SORTS} onChange={setSortBy} accessibilityLabel="Sort stays" style={styles.sort} textStyle={styles.sortText} chevronColor={color.text} />
        </View>
      </View>
    </View>
  );

  const empty = loading ? (
    <View style={{ gap: space.lg }} accessibilityLabel="Loading stays">
      {[0, 1, 2].map((i) => (
        <View key={i} style={[dhs.panel, { overflow: 'hidden' }]}>
          <Pulse style={{ height: 180, borderRadius: 0 }} />
          <View style={{ padding: space.lg, gap: space.sm }}>
            <Pulse style={{ height: 12, width: '33%' }} />
            <Pulse style={{ height: 16, width: '66%' }} />
            <Pulse style={{ height: 12, width: '50%' }} />
          </View>
        </View>
      ))}
    </View>
  ) : loadError ? (
    <StateBlock icon="fa-solid fa-triangle-exclamation" iconColor={color.warning} title="Couldn't load stays" text={loadError} actionLabel="Retry" onAction={() => refetch()} />
  ) : (
    <StateBlock
      icon="fa-solid fa-hotel"
      title="No stays found"
      text={
        hotels.length === 0
          ? 'No stays are listed yet. Please check back soon.'
          : `No hotels match "${searchQuery}" under ${selectedType}. Try searching another area or reset filters.`
      }
      actionLabel="Reset filters"
      onAction={() => {
        setSearchQuery('');
        setSelectedType('All');
      }}
    />
  );

  return (
    <View style={dhs.page}>
      <Header title="HOTELS & HOMESTAYS" subtitle="Experience scenic stays across Dima Hasao" showBack rightAction="none" />
      <PatternDivider variant="green-gold" />
      <FlatList
        data={loading || loadError ? [] : filteredHotels}
        keyExtractor={(hotel) => hotel.id}
        renderItem={({ item }) => <HotelCard hotel={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{ padding: space.lg, paddingBottom: NAV_CLEARANCE + insets.bottom + space.lg }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshing={isRefetching}
        onRefresh={refetch}
      />
    </View>
  );
}

const Separator = () => <View style={{ height: space.lg }} />;

const styles = StyleSheet.create({
  searchBox: { height: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, paddingLeft: space.md, paddingRight: space.xs },
  searchInput: { flex: 1, minWidth: 0, height: 46, padding: 0, ...type.body, color: color.text },
  pref: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, backgroundColor: color.surfaceMuted, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radii.md },
  prefLabel: { ...type.bodyStrong, color: color.text },
  chipRow: { marginHorizontal: -space.lg },
  count: { ...type.bodyStrong, color: color.text, flexShrink: 1 },
  sortLabel: { ...type.small, color: color.textMuted },
  sort: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, paddingHorizontal: space.md, minHeight: 44, minWidth: 120, gap: space.xs },
  sortText: { ...type.label, color: color.text },
});
