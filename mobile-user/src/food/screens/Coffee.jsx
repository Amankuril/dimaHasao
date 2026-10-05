import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import Image from '../../components/Img';
import { Press } from '../../components/ui';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { useLocation as useLocationHook } from '../hooks/useLocation';
import { navigateTo } from '../../lib/webRouter';
import { poppins, tw } from '../../theme';
import { F, useLocationSelector } from '../components/shell';
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
    <View style={{ marginBottom: 32 }}>
      <Text style={styles.section}>{sectionTitle}</Text>
      <View>
        {stores.map((store, index) => {
          const storeSlug = store.name.toLowerCase().replace(/\s+/g, '-');
          const isHighRating = store.rating >= 4.0;
          return (
            <Press
              key={store.id}
              scale={0.99}
              accessibilityLabel={`${store.name}, ${store.location}`}
              onPress={() => navigateTo(`/user/restaurants/${storeSlug}`)}
              style={[styles.row, index !== stores.length - 1 ? { borderBottomWidth: 1, borderBottomColor: tw.gray200 } : null]}
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
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.location}>{store.location}</Text>
                <View style={{ marginBottom: 8, flexDirection: 'row' }}>
                  <View style={[styles.rating, { backgroundColor: isHighRating ? tw.green600 : F.green }]}>
                    <Text style={styles.ratingText}>{store.rating}</Text>
                    <Star size={12} color="#fff" fill="#fff" />
                  </View>
                </View>
                <Text style={styles.distance}>{store.distance}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12 }}>
                  <Text style={styles.price}>{store.price}</Text>
                  {store.offer ? <Text style={styles.offer}>{store.offer}</Text> : null}
                </View>
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}>
        <View style={{ width: '100%', height: Math.round(width / 3), overflow: 'hidden' }}>
          <Image source={{ uri: coffeeBanner }} accessibilityLabel="Coffee" style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          <OverlayNav onBack={goBack} onLocation={openLocationSelector} cityName={cityName} />
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.title} accessibilityRole="header">
              Starbucks Coffee
            </Text>
            <Text style={styles.subtitle}>Cafe, Coffee, Beverages</Text>
            <View style={{ height: 1, backgroundColor: tw.gray200, marginTop: 16 }} />
          </View>
          <StoreList stores={starbucksStores} sectionTitle="DINING OUTLETS NEAR YOU" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, lineHeight: 32, color: tw.gray900, marginBottom: 8, ...poppins(700) },
  subtitle: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  section: { marginBottom: 16, fontSize: 14, lineHeight: 20, letterSpacing: 0.35, color: tw.gray500, textAlign: 'center', ...poppins(600) },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingVertical: 16 },
  logo: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  logoFallback: { width: '100%', height: '100%', backgroundColor: tw.gray200, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(600) },
  location: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 8, ...poppins(700) },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  ratingText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) },
  distance: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginBottom: 4, ...poppins(400) },
  price: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) },
  offer: { fontSize: 14, lineHeight: 20, color: F.green, ...poppins(500) },
});
