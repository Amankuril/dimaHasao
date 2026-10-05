import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Fa from '../../../components/Fa';
import { Press } from '../../../components/ui';
import { SelectField } from '../../../components/kit';
import { Header, PatternDivider } from '../../../components/dh/Header';
import { HotelCard } from '../../../components/dh/hotel';
import { Panel, Pulse, StateBlock, Stepper, dhs } from '../../../components/dh/ui';
import { fetchHotels } from '../../../api/dh/hotelApi';
import { dh, poppins, tw } from '../../../theme';

// Web: DimaHasao/pages/HotelListScreen.jsx (/app/hotels)

const PROPERTY_TYPES = ['All', 'Resort', 'Homestay', 'Hotel', 'Lodge'];
const SORTS = [
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

export default function HotelListScreen() {
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
    <View style={{ gap: 14, marginBottom: 14 }}>
      <Panel pad={12} style={{ gap: 10 }}>
        <View style={{ justifyContent: 'center' }}>
          <Fa name="fa-solid fa-magnifying-glass" size={12} color={tw.emerald800} style={styles.searchIcon} />
          <TextInput
            placeholder="Search Haflong, Jatinga, Umrangso..."
            placeholderTextColor={tw.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            style={[dhs.input, { paddingLeft: 36, paddingRight: 32 }]}
            accessibilityLabel="Search stays"
          />
          {searchQuery ? (
            <Press onPress={() => setSearchQuery('')} style={styles.clear} accessibilityLabel="Clear search" hitSlop={8}>
              <Fa name="fa-solid fa-xmark" size={12} color={tw.gray400} />
            </Press>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={styles.pref}>
            <View style={[dhs.row, { gap: 6 }]}>
              <Fa name="fa-regular fa-moon" size={11} color={tw.emerald700} />
              <Text style={styles.prefLabel}>Nights:</Text>
            </View>
            <Stepper value={nights} onChange={setNights} label="nights" />
          </View>
          <View style={styles.pref}>
            <View style={[dhs.row, { gap: 6 }]}>
              <Fa name="fa-solid fa-users" size={11} color={tw.emerald700} />
              <Text style={styles.prefLabel}>Guests:</Text>
            </View>
            <Stepper value={guestCount} onChange={setGuestCount} label="guests" />
          </View>
        </View>
      </Panel>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {PROPERTY_TYPES.map((type) => {
          const active = selectedType === type;
          return (
            <Press key={type} scale={0.94} onPress={() => setSelectedType(type)} style={[styles.chip, active && styles.chipActive]} accessibilityState={{ selected: active }}>
              <Text style={[styles.chipText, active && { color: tw.amber300 }]}>{type === 'All' ? 'All Stays' : `${type}s`}</Text>
            </Press>
          );
        })}
      </ScrollView>

      <View style={[dhs.row, { justifyContent: 'space-between', paddingHorizontal: 4 }]}>
        <Text style={styles.count}>
          {filteredHotels.length} {filteredHotels.length === 1 ? 'Stay' : 'Stays'} Available
        </Text>
        <View style={[dhs.row, { gap: 6 }]}>
          <Text style={styles.sortLabel}>Sort:</Text>
          <SelectField value={sortBy} options={SORTS} onChange={setSortBy} accessibilityLabel="Sort stays" style={styles.sort} textStyle={styles.sortText} chevronColor={tw.gray800} />
        </View>
      </View>
    </View>
  );

  const empty = loading ? (
    <View style={{ gap: 16 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[dhs.panel, { overflow: 'hidden' }]}>
          <Pulse style={{ height: 160, borderRadius: 0 }} />
          <View style={{ padding: 16, gap: 8 }}>
            <Pulse style={{ height: 12, width: '33%' }} />
            <Pulse style={{ height: 16, width: '66%' }} />
            <Pulse style={{ height: 12, width: '50%' }} />
          </View>
        </View>
      ))}
    </View>
  ) : loadError ? (
    <StateBlock icon="fa-solid fa-triangle-exclamation" iconColor={tw.amber400} title="Couldn't load stays" text={loadError} actionLabel="Retry" onAction={() => refetch()} />
  ) : (
    <StateBlock
      icon="fa-solid fa-hotel"
      title="No Stays Found"
      text={
        hotels.length === 0
          ? 'No stays are listed yet. Please check back soon.'
          : `No hotels match "${searchQuery}" under ${selectedType}. Try searching another area or reset filters.`
      }
      actionLabel="Reset Filters"
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
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 112 }}
        keyboardShouldPersistTaps="handled"
        refreshing={isRefetching}
        onRefresh={refetch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchIcon: { position: 'absolute', left: 14, zIndex: 1 },
  clear: { position: 'absolute', right: 10, padding: 4 },
  pref: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: dh.cream, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: dh.border },
  prefLabel: { fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(500) },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: dh.border },
  chipActive: { backgroundColor: dh.nav, borderColor: tw.emerald800 },
  chipText: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(700) },
  count: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(700) },
  sortLabel: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(500) },
  sort: { backgroundColor: '#fff', borderWidth: 1, borderColor: dh.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minWidth: 96, gap: 4 },
  sortText: { fontSize: 11, lineHeight: 16.5, color: tw.gray800, ...poppins(600) },
});
