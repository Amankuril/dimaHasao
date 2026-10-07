import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Image from '../../../components/Img';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../../components/Fa';
import { Press } from '../../../components/ui';
import { StatusBadge, fa } from '../../../components/ds';
import { Header, PatternDivider } from '../../../components/dh/Header';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { ChipRow, ResultsBar, SearchPanel } from '../../../components/dh/booking';
import { Pulse, StateBlock, dhs } from '../../../components/dh/ui';
import { PACKAGE_TYPES, fetchPackages } from '../../../api/dh/toursApi';
import { color, elevation, radii, space, type } from '../../../theme';

// Web: DimaHasao/pages/TourPackageListScreen.jsx (/app/packages) + components/tour/PackageCard.jsx

const TYPES = ['All', ...PACKAGE_TYPES];
const QUICK = [
  ['fa-solid fa-car', 'Private Cab'],
  ['fa-solid fa-hotel', 'Stay Included'],
  ['fa-solid fa-utensils', 'Meals'],
];

function PackageCard({ pkg }) {
  return (
    <Press scale={0.99} onPress={() => router.push(`/app/packages/${pkg.id}`)} style={styles.card} accessibilityLabel={`${pkg.title}, ${pkg.duration}, ₹${pkg.pricePerPerson.toLocaleString('en-IN')} per traveller. View plan`}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: pkg.heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(6,28,14,0.75)']} style={StyleSheet.absoluteFill} />
        <View style={styles.badges}>
          <StatusBadge label={pkg.duration} tone="primary" icon={fa('fa-regular fa-clock')} style={{ backgroundColor: color.surface }} />
          <StatusBadge label={pkg.type} tone="gold" />
        </View>
        <View style={styles.rating}>
          <Text style={styles.ratingText}>{pkg.rating}</Text>
          <Fa name="fa-solid fa-star" size={12} color={color.goldOnDark} />
        </View>
        <View style={styles.imageFoot}>
          <View style={[dhs.row, { gap: space.xs + 2, flexShrink: 1 }]}>
            <Fa name="fa-solid fa-map-pin" size={14} color={color.goldOnDark} />
            <Text style={styles.dest} numberOfLines={1}>
              {pkg.destinations.join(' • ')}
            </Text>
          </View>
          {pkg.difficulty ? <Text style={styles.difficulty}>{pkg.difficulty}</Text> : null}
        </View>
      </View>

      <View style={{ padding: space.lg, gap: space.md }}>
        <View style={{ gap: space.xs + 2 }}>
          <Text style={styles.title} numberOfLines={2}>
            {pkg.title}
          </Text>
          {pkg.highlights[0] ? (
            <Text style={styles.highlight} numberOfLines={2}>
              {pkg.highlights[0]}
            </Text>
          ) : null}
          <View style={styles.quick}>
            {QUICK.map(([icon, label]) => (
              <View key={label} style={styles.quickItem}>
                <Fa name={icon} size={12} color={color.primary} />
                <Text style={styles.quickText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.foot}>
          <View style={{ flexShrink: 1 }}>
            <View style={[dhs.row, { alignItems: 'baseline', gap: space.sm }]}>
              <Text style={styles.price}>₹{pkg.pricePerPerson.toLocaleString('en-IN')}</Text>
              {pkg.originalPrice ? <Text style={styles.strike}>₹{pkg.originalPrice.toLocaleString('en-IN')}</Text> : null}
            </View>
            <Text style={styles.priceNote}>per traveller, all inclusive</Text>
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>View plan</Text>
            <Fa name="fa-solid fa-arrow-right" size={14} color={color.onPrimary} />
          </View>
        </View>
      </View>
    </Press>
  );
}

export default function TourPackageListScreen() {
  const insets = useSafeAreaInsets();
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
    <View style={{ gap: space.lg, marginBottom: space.lg }}>
      <SearchPanel value={searchQuery} onChange={setSearchQuery} placeholder="Search packages (Jatinga, Silaikul, Trekking)..." />
      <ChipRow items={TYPES} value={selectedType} onChange={setSelectedType} label={(t) => (t === 'All' ? 'All packages' : t)} />
      <ResultsBar text={`${filteredPackages.length} ${filteredPackages.length === 1 ? 'package' : 'packages'} available`} sortBy={sortBy} onSort={setSortBy} />
    </View>
  );

  const empty = loading ? (
    <View style={{ gap: space.lg }} accessibilityLabel="Loading packages">
      {[0, 1, 2].map((n) => (
        <View key={n} style={[dhs.panel, { overflow: 'hidden' }]}>
          <Pulse style={{ height: 180, borderRadius: 0 }} />
          <View style={{ padding: space.lg, gap: space.sm }}>
            <Pulse style={{ height: 16, width: '75%' }} />
            <Pulse tone={100} style={{ height: 13, width: '50%' }} />
            <Pulse tone={100} style={{ height: 13, width: '33%' }} />
          </View>
        </View>
      ))}
    </View>
  ) : loadError ? (
    <StateBlock icon="fa-solid fa-triangle-exclamation" iconColor={color.warning} title="Couldn't load packages" text={loadError} actionLabel="Try again" onAction={() => refetch()} />
  ) : (
    <StateBlock
      icon="fa-solid fa-suitcase-rolling"
      title="No tour packages found"
      text={
        searchQuery || selectedType !== 'All'
          ? `No packages match ${searchQuery ? `"${searchQuery}"` : 'this category'}. Try another category or reset filters.`
          : 'No tour packages are live yet. Please check back soon.'
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
      <Header title="TOUR PACKAGES" subtitle="Curated expeditions, treks & cultural journeys" showBack rightAction="none" />
      <PatternDivider variant="green-gold" />
      <FlatList
        data={loading || loadError ? [] : filteredPackages}
        keyExtractor={(pkg) => pkg.id}
        renderItem={({ item }) => <PackageCard pkg={item} />}
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
  card: { backgroundColor: color.surface, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: color.border, ...elevation.card },
  imageWrap: { aspectRatio: 16 / 9, backgroundColor: color.surfaceMuted },
  badges: { position: 'absolute', top: space.md, left: space.md, right: 72, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, flexWrap: 'wrap' },
  rating: { position: 'absolute', top: space.md, right: space.md, flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: space.sm, height: 24, borderRadius: radii.pill },
  ratingText: { ...type.caption, color: color.textInverse },
  imageFoot: { position: 'absolute', bottom: space.sm, left: space.md, right: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  dest: { flexShrink: 1, ...type.label, color: color.textInverse },
  difficulty: { ...type.caption, color: color.textInverse, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radii.sm, overflow: 'hidden' },
  title: { ...type.subheading, color: color.text },
  highlight: { ...type.small, color: color.textSecondary },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2, marginTop: space.xs },
  quickItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, backgroundColor: color.surfaceMuted, paddingHorizontal: space.sm + 2, height: 28, borderRadius: radii.pill },
  quickText: { ...type.caption, color: color.text },
  foot: { paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  price: { ...type.price, color: color.text },
  strike: { ...type.small, color: color.textMuted, textDecorationLine: 'line-through' },
  priceNote: { ...type.caption, color: color.textMuted },
  cta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.primary, paddingHorizontal: space.lg, height: 44, borderRadius: radii.md },
  ctaText: { ...type.buttonSm, color: color.onPrimary },
});
