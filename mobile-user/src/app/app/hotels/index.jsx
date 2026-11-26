import { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
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
const PRICE_BANDS = [
  { value: 'any', label: 'Any price', test: () => true },
  { value: 'u2', label: 'Under ₹2,000', test: (p) => p > 0 && p < 2000 },
  { value: '2to4', label: '₹2,000–4,000', test: (p) => p >= 2000 && p <= 4000 },
  { value: 'o4', label: '₹4,000+', test: (p) => p > 4000 },
];

/** Balanced fix with a last-known fallback: a stay search needs the town, not the metre. */
async function readGuestPosition() {
  let perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) throw new Error('Allow location access to see stays near you.');
  const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }).catch(() => null);
  try {
    let timer;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), 12000);
      }),
    ]).finally(() => clearTimeout(timer));
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    if (last?.coords) return { lat: last.coords.latitude, lng: last.coords.longitude };
    throw new Error('Could not read your location. Check that GPS is on.');
  }
}

const SORTS = [
  { value: 'nearest', label: 'Nearest' },
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
  // Where to look: 'all' areas, one city, or 'near' the guest's position.
  const [area, setArea] = useState('all');
  const [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState('');
  const [priceBand, setPriceBand] = useState('any');
  const [topRated, setTopRated] = useState(false);

  const nearMe = area === 'near' && position;
  const { data: hotels = [], isPending: loading, error, refetch, isRefetching } = useQuery({
    queryKey: ['hotels', nearMe ? `${position.lat.toFixed(3)},${position.lng.toFixed(3)}` : 'all'],
    queryFn: () => (nearMe ? fetchHotels({ lat: position.lat, lng: position.lng, radius: 150 }) : fetchHotels()),
  });
  // Every area that actually has stays, for the "where" chips.
  const { data: allHotels = [] } = useQuery({ queryKey: ['hotels', 'all'], queryFn: () => fetchHotels(), enabled: Boolean(nearMe) });
  const cities = useMemo(() => {
    const source = nearMe ? allHotels : hotels;
    const counts = new Map();
    source.forEach((h) => h.city && counts.set(h.city, (counts.get(h.city) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [hotels, allHotels, nearMe]);
  const loadError = error ? error?.response?.data?.message || 'Could not load stays. Please try again.' : '';

  useEffect(() => {
    if (area !== 'near' && sortBy === 'nearest') setSortBy('popular');
  }, [area, sortBy]);

  const chooseNearMe = async () => {
    if (area === 'near') {
      setArea('all');
      return;
    }
    setLocating(true);
    setLocationNote('');
    try {
      const pos = await readGuestPosition();
      setPosition(pos);
      setArea('near');
      setSortBy('nearest');
    } catch (err) {
      setLocationNote(err.message);
    } finally {
      setLocating(false);
    }
  };

  const filteredHotels = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return hotels
      .filter((hotel) => {
        const matchesType = selectedType === 'All' || hotel.type === selectedType;
        const matchesSearch =
          (hotel.name || '').toLowerCase().includes(q) || (hotel.location || '').toLowerCase().includes(q) || (hotel.description || '').toLowerCase().includes(q);
        const matchesArea = area === 'all' || area === 'near' || hotel.city === area;
        const matchesPrice = (PRICE_BANDS.find((b) => b.value === priceBand) || PRICE_BANDS[0]).test(Number(hotel.startingPrice) || 0);
        const matchesRating = !topRated || Number(hotel.rating) >= 4;
        return matchesType && matchesSearch && matchesArea && matchesPrice && matchesRating;
      })
      .sort((a, b) => {
        if (sortBy === 'nearest' && a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
        if (sortBy === 'price-low') return a.startingPrice - b.startingPrice;
        if (sortBy === 'price-high') return b.startingPrice - a.startingPrice;
        if (sortBy === 'rating') return b.rating - a.rating;
        return b.reviewCount - a.reviewCount;
      });
  }, [hotels, selectedType, searchQuery, sortBy, area, priceBand, topRated]);

  const header = (
    <View style={{ gap: space.lg, marginBottom: space.lg }}>
      <Panel style={{ gap: space.md }}>
        <View style={styles.searchBox}>
          <Fa name="fa-solid fa-magnifying-glass" size={16} color={color.primary} />
          <TextInput
            placeholder="Search Haflong, Jatinga, Umrangso"
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
          <Stepper value={nights} onChange={setNights} label="nights" max={30} />
        </View>
        <View style={styles.pref}>
          <View style={[dhs.row, { gap: space.sm, flexShrink: 1 }]}>
            <Fa name="fa-solid fa-users" size={16} color={color.primary} />
            <Text style={styles.prefLabel}>Guests</Text>
          </View>
          <Stepper value={guestCount} onChange={setGuestCount} label="guests" max={20} />
        </View>
      </Panel>

      <View style={{ gap: space.sm }}>
        <Text style={styles.groupLabel}>Where</Text>
        <ChipRow style={styles.chipRow} contentStyle={{ paddingHorizontal: space.lg }}>
          <Chip label={locating ? 'Locating…' : 'Near me'} icon={fa('fa-solid fa-location-crosshairs')} selected={area === 'near'} onPress={chooseNearMe} />
          <Chip label="All areas" selected={area === 'all'} onPress={() => setArea('all')} />
          {cities.map((c) => (
            <Chip key={c} label={c} selected={area === c} onPress={() => setArea(c)} />
          ))}
        </ChipRow>
        {locationNote ? <Text style={styles.note}>{locationNote}</Text> : null}
        {area === 'near' && !loading && hotels.length === 0 && !loadError ? (
          <Text style={styles.note}>No stays within 150 km of you. Pick an area above to browse all stays.</Text>
        ) : null}
      </View>

      <ChipRow style={styles.chipRow} contentStyle={{ paddingHorizontal: space.lg }}>
        {PRICE_BANDS.map((b) => (
          <Chip key={b.value} label={b.label} selected={priceBand === b.value} onPress={() => setPriceBand(b.value)} />
        ))}
        <Chip label="4+ rated" icon={fa('fa-solid fa-star')} selected={topRated} onPress={() => setTopRated((v) => !v)} />
      </ChipRow>

      <ChipRow style={styles.chipRow} contentStyle={{ paddingHorizontal: space.lg }}>
        {PROPERTY_TYPES.map((t) => (
          <Chip key={t} label={t === 'All' ? 'All stays' : `${t}s`} selected={selectedType === t} onPress={() => setSelectedType(t)} />
        ))}
      </ChipRow>

      <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm }]}>
        <Text style={styles.count}>
          {/* While loading or failed, a count of 0 would contradict the message below. */}
          {loading || (loadError && !hotels.length) ? 'Stays' : `${filteredHotels.length} ${filteredHotels.length === 1 ? 'stay' : 'stays'} available`}
        </Text>
        <View style={[dhs.row, { gap: space.sm }]}>
          <Text style={styles.sortLabel}>Sort</Text>
          <SelectField value={sortBy} options={area === 'near' ? SORTS : SORTS.filter((o) => o.value !== 'nearest')} onChange={setSortBy} accessibilityLabel="Sort stays" style={styles.sort} textStyle={styles.sortText} chevronColor={color.text} />
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
          : 'No stays match these filters. Try another area, price or type.'
      }
      actionLabel="Reset filters"
      onAction={() => {
        setSearchQuery('');
        setSelectedType('All');
        setArea('all');
        setPriceBand('any');
        setTopRated(false);
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
        renderItem={({ item }) => <HotelCard hotel={item} stay={{ nights, guests: guestCount }} />}
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
  groupLabel: { ...type.label, color: color.textMuted },
  note: { ...type.small, color: color.textSecondary },
  sortLabel: { ...type.small, color: color.textMuted },
  sort: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, paddingHorizontal: space.md, minHeight: 44, minWidth: 120, gap: space.xs },
  sortText: { ...type.label, color: color.text },
});
