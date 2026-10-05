import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Image from '../../../components/Img';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../../components/Fa';
import { Press } from '../../../components/ui';
import { Header, PatternDivider } from '../../../components/dh/Header';
import { ChipRow, ResultsBar, SearchPanel } from '../../../components/dh/booking';
import { Pulse, StateBlock, dhs } from '../../../components/dh/ui';
import { PACKAGE_TYPES, fetchPackages } from '../../../api/dh/toursApi';
import { dh, montserrat, poppins, shadow, tw } from '../../../theme';

// Web: DimaHasao/pages/TourPackageListScreen.jsx (/app/packages) + components/tour/PackageCard.jsx

const TYPES = ['All', ...PACKAGE_TYPES];
const QUICK = [
  ['fa-solid fa-car', 'Private Cab'],
  ['fa-solid fa-hotel', 'Stay Included'],
  ['fa-solid fa-utensils', 'Meals'],
];

function PackageCard({ pkg }) {
  return (
    <Press scale={0.99} onPress={() => router.push(`/app/packages/${pkg.id}`)} style={styles.card} accessibilityLabel={`${pkg.title}. View plan`}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: pkg.heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
        <View style={styles.badges}>
          <Text style={[styles.badge, styles.badgeGreen]}>{pkg.duration}</Text>
          <Text style={[styles.badge, { backgroundColor: tw.amber500, color: '#fff' }]}>{pkg.type}</Text>
        </View>
        <View style={styles.rating}>
          <Text style={styles.ratingText}>{pkg.rating}</Text>
          <Fa name="fa-solid fa-star" size={8} color={tw.amber300} />
        </View>
        <View style={styles.imageFoot}>
          <View style={[dhs.row, { gap: 4, maxWidth: '70%' }]}>
            <Fa name="fa-solid fa-map-pin" size={12} color={tw.amber400} />
            <Text style={styles.dest} numberOfLines={1}>{pkg.destinations.join(' • ')}</Text>
          </View>
          <Text style={styles.difficulty}>{pkg.difficulty}</Text>
        </View>
      </View>

      <View style={{ padding: 14, gap: 12 }}>
        <View>
          <Text style={styles.title}>{pkg.title}</Text>
          {pkg.highlights[0] ? (
            <Text style={styles.highlight} numberOfLines={2}>{pkg.highlights[0]}</Text>
          ) : null}
          <View style={styles.quick}>
            {QUICK.map(([icon, label]) => (
              <View key={label} style={styles.quickItem}>
                <Fa name={icon} size={9} color={tw.emerald800} />
                <Text style={styles.quickText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.foot}>
          <View>
            <View style={[dhs.row, { alignItems: 'baseline', gap: 6 }]}>
              <Text style={styles.price}>₹{pkg.pricePerPerson.toLocaleString('en-IN')}</Text>
              {pkg.originalPrice ? <Text style={styles.strike}>₹{pkg.originalPrice.toLocaleString('en-IN')}</Text> : null}
            </View>
            <Text style={styles.priceNote}>per traveler + all inclusive</Text>
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>View Plan</Text>
            <Fa name="fa-solid fa-arrow-right" size={10} color={tw.amber300} />
          </View>
        </View>
      </View>
    </Press>
  );
}

export default function TourPackageListScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [sortBy, setSortBy] = useState('popular');

  const { data: packages = [], isPending: loading, error, refetch, isRefetching } = useQuery({ queryKey: ['tour-packages'], queryFn: () => fetchPackages() });
  const loadError = error ? error?.response?.data?.message || 'Could not load packages. Please try again.' : '';

  const filteredPackages = useMemo(() => {
    const needle = searchQuery.toLowerCase();
    return packages
      .filter((pkg) => {
        const matchesType = selectedType === 'All' || pkg.type === selectedType;
        const matchesSearch =
          pkg.title.toLowerCase().includes(needle) || pkg.subtitle.toLowerCase().includes(needle) || pkg.destinations.some((d) => d.toLowerCase().includes(needle));
        return matchesType && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.pricePerPerson - b.pricePerPerson;
        if (sortBy === 'price-high') return b.pricePerPerson - a.pricePerPerson;
        if (sortBy === 'rating') return b.rating - a.rating;
        return b.reviewCount - a.reviewCount;
      });
  }, [packages, searchQuery, selectedType, sortBy]);

  const header = (
    <View style={{ gap: 14, marginBottom: 14 }}>
      <SearchPanel value={searchQuery} onChange={setSearchQuery} placeholder="Search packages (Jatinga, Silaikul, Trekking)..." />
      <ChipRow items={TYPES} value={selectedType} onChange={setSelectedType} label={(t) => (t === 'All' ? 'All Packages' : t)} />
      <ResultsBar text={`${filteredPackages.length} ${filteredPackages.length === 1 ? 'Package' : 'Packages'} Available`} sortBy={sortBy} onSort={setSortBy} />
    </View>
  );

  const empty = loading ? (
    <View style={{ gap: 16 }}>
      {[0, 1, 2].map((n) => (
        <View key={n} style={[dhs.panel, { overflow: 'hidden' }]}>
          <Pulse style={{ height: 176, borderRadius: 0 }} />
          <View style={{ padding: 14, gap: 8 }}>
            <Pulse style={{ height: 14, width: '75%' }} />
            <Pulse tone={100} style={{ height: 12, width: '50%' }} />
            <Pulse tone={100} style={{ height: 12, width: '33%' }} />
          </View>
        </View>
      ))}
    </View>
  ) : loadError ? (
    <StateBlock icon="fa-solid fa-triangle-exclamation" iconColor={tw.amber400} title="Couldn't load packages" text={loadError} actionLabel="Try Again" onAction={() => refetch()} />
  ) : (
    <StateBlock
      icon="fa-solid fa-suitcase-rolling"
      title="No Tour Packages Found"
      text={
        searchQuery || selectedType !== 'All'
          ? `No packages match ${searchQuery ? `"${searchQuery}"` : 'this category'}. Try another category or reset filters.`
          : 'No tour packages are live yet. Please check back soon.'
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
      <Header title="TOUR PACKAGES" subtitle="Curated expeditions, treks & cultural journeys" showBack rightAction="none" />
      <PatternDivider variant="green-gold" />
      <FlatList
        data={loading || loadError ? [] : filteredPackages}
        keyExtractor={(pkg) => pkg.id}
        renderItem={({ item }) => <PackageCard pkg={item} />}
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
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(229,221,195,0.8)', ...shadow('xs') },
  imageWrap: { height: 176, backgroundColor: tw.gray200 },
  badges: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { fontSize: 10, lineHeight: 15, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden', ...poppins(700) },
  badgeGreen: { backgroundColor: 'rgba(6,56,30,0.9)', color: tw.amber300, borderWidth: 1, borderColor: 'rgba(255,185,0,0.4)' },
  rating: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  ratingText: { fontSize: 10, lineHeight: 15, color: '#fff', ...poppins(700) },
  imageFoot: { position: 'absolute', bottom: 8, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dest: { flexShrink: 1, fontSize: 11, lineHeight: 16.5, color: '#fff', ...poppins(500) },
  difficulty: { fontSize: 10, lineHeight: 15, color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', ...poppins(500) },
  title: { fontSize: 14, lineHeight: 19.25, color: tw.gray900, ...montserrat(700) },
  highlight: { fontSize: 11, lineHeight: 17.9, color: tw.gray500, marginTop: 4, ...poppins(400) },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  quickItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: dh.cream, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(229,221,195,0.6)' },
  quickText: { fontSize: 10, lineHeight: 15, color: tw.gray600, ...poppins(400) },
  foot: { paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 16, lineHeight: 24, color: tw.emerald950, ...montserrat(800) },
  strike: { fontSize: 11, color: tw.gray400, textDecorationLine: 'line-through', ...poppins(400) },
  priceNote: { fontSize: 9.5, lineHeight: 14, color: tw.gray400, ...poppins(400) },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: dh.nav, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  ctaText: { fontSize: 12, lineHeight: 16, color: tw.amber300, ...poppins(700) },
});
