import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Fa from '../../../components/Fa';
import { Press } from '../../../components/ui';
import Skeleton from '../../../components/Skeleton';
import { Header, PatternDivider } from '../../../components/dh/Header';
import { PlaceCard } from '../../../components/dh/places';
import { fetchDestinations } from '../../../api/dh/toursApi';
import { playfair, poppins, tw } from '../../../theme';

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

function StateCard({ icon, iconColor, title, text, action }) {
  return (
    <View style={styles.state}>
      <Fa name={icon} size={30} color={iconColor} style={{ marginBottom: 8 }} />
      <Text style={styles.stateTitle}>{title}</Text>
      {text ? <Text style={styles.stateText}>{text}</Text> : null}
      {action}
    </View>
  );
}

export default function TouristPlacesList() {
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }}>
      {visibleChips.map((chip) => {
        const active = activeFilter === chip.id;
        return (
          <Press key={chip.id} onPress={() => setActiveFilter(chip.id)} style={[styles.chip, active ? styles.chipActive : styles.chipIdle]} accessibilityState={{ selected: active }}>
            <Text style={[styles.chipText, active && { color: '#fff' }]}>{chip.label}</Text>
          </Press>
        );
      })}
    </ScrollView>
  );

  const empty = loading ? (
    <View style={{ gap: 20 }}>
      {[0, 1, 2].map((n) => (
        <View key={n} style={styles.skeletonCard}>
          <Skeleton style={{ height: 160, borderRadius: 0, backgroundColor: tw.gray200 }} />
          <View style={{ padding: 16, gap: 8 }}>
            <Skeleton style={{ height: 14, width: '66%', borderRadius: 4, backgroundColor: tw.gray200 }} />
            <Skeleton style={{ height: 12, width: '50%', borderRadius: 4, backgroundColor: tw.gray100 }} />
          </View>
        </View>
      ))}
    </View>
  ) : loadError ? (
    <StateCard
      icon="fa-solid fa-triangle-exclamation"
      iconColor={tw.amber400}
      title="Couldn't load destinations"
      text={loadError}
      action={
        <Text onPress={() => refetch()} style={styles.reset} accessibilityRole="button">
          Try again
        </Text>
      }
    />
  ) : (
    <StateCard
      icon="fa-solid fa-mountain"
      iconColor={tw.gray400}
      title={searchFilter || activeFilter !== 'all' ? 'No destinations match your search' : 'No destinations published yet'}
      action={
        <Text
          onPress={() => {
            setSearchFilter('');
            setActiveFilter('all');
          }}
          style={styles.reset}
          accessibilityRole="button"
        >
          Reset filters
        </Text>
      }
    />
  );

  return (
    <View style={styles.page}>
      <Header title="TOURIST PLACES" subtitle="Explore the Beauty of Dima Hasao" showBack rightAction="search" onSearchClick={() => setShowSearchInput((v) => !v)} />
      <PatternDivider variant="native" />

      {showSearchInput ? (
        <View style={styles.searchBar}>
          <View style={styles.searchBox}>
            <Fa name="fa-solid fa-magnifying-glass" size={12} color={tw.gray400} />
            <TextInput
              value={searchFilter}
              onChangeText={setSearchFilter}
              placeholder="Filter tourist destinations..."
              placeholderTextColor={tw.gray400}
              autoFocus
              returnKeyType="search"
              style={styles.searchInput}
              accessibilityLabel="Filter tourist destinations"
            />
            {searchFilter ? (
              <Press onPress={() => setSearchFilter('')} accessibilityLabel="Clear" hitSlop={8}>
                <Fa name="fa-solid fa-xmark" size={12} color={tw.gray400} />
              </Press>
            ) : null}
          </View>
        </View>
      ) : null}

      <FlatList
        data={loading || loadError ? [] : filteredPlaces}
        keyExtractor={(place) => place.id}
        renderItem={({ item }) => <PlaceCard place={item} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<View style={{ paddingHorizontal: 16 }}>{empty}</View>}
        ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
        contentContainerStyle={{ flexGrow: 1 }}
        ListHeaderComponentStyle={{ marginBottom: 16 }}
        CellRendererComponent={({ children, style, ...rest }) => (
          <View {...rest} style={[style, { paddingHorizontal: 16 }]}>
            {children}
          </View>
        )}
        refreshing={isRefetching}
        onRefresh={refetch}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          <View style={{ marginTop: 16 }}>
            <PatternDivider variant="native" />
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                <Fa name="fa-solid fa-leaf" size={13} color={tw.emerald400} />
                {'  '}Plan your trip, stay safe {'\n'} and enjoy the beauty of Dima Hasao!
              </Text>
              <View style={styles.footerDots}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.footerDot} />
                ))}
              </View>
            </View>
            {/* pb-20: room for the floating nav */}
            <View style={{ height: 80, backgroundColor: '#FDF5E6' }} />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FDF5E6' },
  searchBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderBottomWidth: 1, borderBottomColor: tw.orange200 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tw.gray100, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  searchInput: { flex: 1, fontSize: 12, color: tw.gray800, padding: 0, height: 22, ...poppins(400) },
  chips: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  chipActive: { backgroundColor: '#0A3A2A' },
  chipIdle: { backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,214,167,0.6)' },
  chipText: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(600) },
  skeletonCard: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 16, borderWidth: 1, borderColor: tw.orange200, overflow: 'hidden' },
  state: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, borderWidth: 1, borderColor: tw.orange200 },
  stateTitle: { fontSize: 14, lineHeight: 20, color: tw.gray700, textAlign: 'center', ...poppins(700) },
  stateText: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, textAlign: 'center', ...poppins(400) },
  reset: { marginTop: 12, fontSize: 12, lineHeight: 16, color: tw.emerald800, textDecorationLine: 'underline', ...poppins(600) },
  footer: { backgroundColor: '#0A3A2A', padding: 20, alignItems: 'center', marginTop: 8 },
  footerText: { fontSize: 14, lineHeight: 22.75, color: tw.amber200, textAlign: 'center', ...playfair(400, true) },
  footerDots: { marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 4, opacity: 0.6 },
  footerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: tw.amber400 },
});
