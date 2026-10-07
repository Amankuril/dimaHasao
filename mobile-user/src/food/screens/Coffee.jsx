import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgePercent, MapPin, Star } from 'lucide-react-native';
import Image from '../../components/Img';
import { Press } from '../../components/ui';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { useLocation as useLocationHook } from '../hooks/useLocation';
import { navigateTo } from '../../lib/webRouter';
import { color, elevation, radii, space, type } from '../../theme';
import { useLocationSelector } from '../components/shell';
import { SectionHeader, StatusBadge } from '../../components/ds';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { OverlayNav } from '../components/dining/DiningCards';

const coffeeBanner = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&h=400&fit=crop';
const starbucksLogo = 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=200&h=200&fit=crop';

/* The web page renders only this fixed list (it reads nothing from the API); reproduced as is. */
const starbucksStores = [
  { id: 1, name: 'Starbucks', rating: 4.4, location: 'YN Road, Indore', distance: '1.3 km', price: '₹900 for two', offer: 'Flat 25% OFF', logo: starbucksLogo },
  { id: 2, name: 'Starbucks', rating: 2.8, location: 'YN Road, Indore', distance: '1.3 km', price: '₹600 for two', offer: null, logo: starbucksLogo },
  { id: 3, name: 'Starbucks', rating: 4.5, location: 'MG Road, Indore', distance: '2.1 km', price: '₹850 for two', offer: 'Flat 20% OFF', logo: starbucksLogo },
  { id: 4, name: 'Starbucks', rating: 4.2, location: 'Vijay Nagar, Indore', distance: '0.9 km', price: '₹950 for two', offer: 'Flat 30% OFF', logo: starbucksLogo },
];

function StoreList({ stores, sectionTitle }) {
  return (
    <View style={{ marginBottom: space.xxl }}>
      <SectionHeader title={sectionTitle} />
      <View style={styles.list}>
        {stores.map((store, index) => {
          const storeSlug = store.name.toLowerCase().replace(/\s+/g, '-');
          return (
            <Press
              key={store.id}
              scale={0.99}
              accessibilityRole="button"
              accessibilityLabel={`${store.name}, ${store.location}`}
              onPress={() => navigateTo(`/user/restaurants/${storeSlug}`)}
              style={[styles.row, index !== stores.length - 1 ? { borderBottomWidth: 1, borderBottomColor: color.border } : null]}
            >
              <View style={styles.logo}>
                {store.logo ? (
                  <Image source={{ uri: store.logo }} accessibilityLabel={store.name} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={styles.logoFallback}>
                    <Text style={styles.logoLetter}>{store.name.charAt(0)}</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
                  <Text style={styles.location} numberOfLines={2}>{store.location}</Text>
                  <View style={styles.rating}>
                    <Star size={12} color={color.goldText} fill={color.gold} strokeWidth={0} />
                    <Text style={styles.ratingText}>{store.rating}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <MapPin size={13} color={color.textSecondary} />
                  <Text style={styles.distance}>{store.distance}</Text>
                  <Text style={styles.distance}>·</Text>
                  <Text style={styles.price}>{store.price}</Text>
                </View>
                {store.offer ? <StatusBadge label={store.offer} tone="gold" icon={BadgePercent} /> : null}
              </View>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

/** Port of pages/user/Coffee.jsx. */
export default function Coffee() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const goBack = useAppBackNavigation();
  const { openLocationSelector } = useLocationSelector();
  const { location } = useLocationHook();
  const cityName = location?.city || 'Select';

  return (
    <View style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}>
        <View style={{ width: '100%', height: Math.round(width / 3), overflow: 'hidden', backgroundColor: color.primaryDeep }}>
          <Image source={{ uri: coffeeBanner }} accessibilityLabel="Coffee" style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          <OverlayNav onBack={goBack} onLocation={openLocationSelector} cityName={cityName} />
        </View>

        <View style={{ paddingHorizontal: space.lg, paddingTop: space.xxl }}>
          <View style={{ marginBottom: space.xxl }}>
            <Text style={styles.title} accessibilityRole="header">
              Starbucks Coffee
            </Text>
            <Text style={styles.subtitle}>Cafe, Coffee, Beverages</Text>
          </View>
          <StoreList stores={starbucksStores} sectionTitle="Dining outlets near you" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  title: { ...type.heading, fontSize: 22, lineHeight: 30, color: color.text, marginBottom: space.xs },
  subtitle: { ...type.small, color: color.textMuted },
  list: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.lg, ...elevation.card },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg, paddingVertical: space.lg },
  logo: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  logoFallback: { width: '100%', height: '100%', backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { ...type.label, color: color.textMuted },
  location: { ...type.subheading, color: color.text, flex: 1, minWidth: 0 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 24, paddingHorizontal: space.sm, borderRadius: radii.pill, backgroundColor: color.goldSoft },
  ratingText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.goldText },
  distance: { ...type.caption, color: color.textSecondary },
  price: { ...type.caption, color: color.textSecondary },
});
