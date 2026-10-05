/* eslint-disable react-hooks/static-components -- small stateless row helpers declared next to the data they read */
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Clock, Heart, MapPin, Star, Trash2 } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { useProfile } from '../../context/ProfileContext';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { filterRestaurantsForVegMode } from '../../utils/vegMode';
import { F } from '../../components/shell';
import { poppins, tw } from '../../../theme';

/**
 * Port of pages/user/CollectionDetail.jsx. The web has no collection API: the
 * page shows the user's favourites under the name "Collection <id>".
 */
export default function CollectionDetail() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const goBack = useAppBackNavigation();
  const { favorites, removeFavorite, vegMode, vegModeOption } = useProfile();
  const [collection, setCollection] = useState({ id, name: 'My Collection', dishes: 0, restaurants: 0, items: [] });

  const visibleFavorites = useMemo(() => filterRestaurantsForVegMode(favorites || [], { vegMode, vegModeOption }), [favorites, vegMode, vegModeOption]);

  useEffect(() => {
    setCollection((prev) => ({ ...prev, name: `Collection ${id}`, items: visibleFavorites, restaurants: visibleFavorites.length, dishes: 0 }));
  }, [id, visibleFavorites]);

  const handleRemove = (slug) => {
    Alert.alert('', 'Remove this restaurant from collection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'OK',
        onPress: () => {
          removeFavorite(slug);
          setCollection((prev) => ({ ...prev, items: prev.items.filter((item) => item.slug !== slug), restaurants: prev.restaurants - 1 }));
        },
      },
    ]);
  };

  const Header = ({ sub }) => (
    <View style={styles.head}>
      <Press scale={0.9} onPress={goBack} accessibilityLabel="Back" style={styles.back}>
        <ArrowLeft size={16} color={tw.gray900} />
      </Press>
      <View>
        <Text style={styles.title}>{collection.name}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
    </View>
  );

  if (collection.items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFEF8' }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16 }}>
          <Header />
          <View style={styles.emptyCard}>
            <Heart size={64} color={tw.gray500} />
            <Text style={styles.emptyText}>This collection is empty</Text>
            <Press scale={0.97} onPress={() => router.navigate('/food/user')} accessibilityLabel="Explore Restaurants" style={styles.explore}>
              <Text style={styles.exploreText}>Explore Restaurants</Text>
            </Press>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFEF8' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: 96 + insets.bottom }}>
        <Header sub={`${collection.restaurants} ${collection.restaurants === 1 ? 'restaurant' : 'restaurants'}`} />
        <View style={{ gap: 24, marginTop: 16 }}>
          {collection.items.map((r) => (
            <Press key={r.slug} scale={0.98} onPress={() => router.push(`/food/user/restaurants/${r.slug}`)} accessibilityLabel={r.name} style={styles.card}>
              <View style={{ height: 192 }}>
                <Image source={{ uri: r.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop&q=80' }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.6)', 'transparent']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
                <Press scale={0.9} onPress={() => handleRemove(r.slug)} accessibilityLabel="Remove from collection" style={styles.trash}>
                  <Trash2 size={20} color={tw.red500} />
                </Press>
              </View>
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                  <View style={styles.rating}>
                    <Star size={12} color="#fff" fill="#fff" />
                    <Text style={styles.ratingText}>{r.rating || '4.5'}</Text>
                  </View>
                </View>
                <View style={styles.meta}>
                  <Clock size={16} color={tw.gray500} />
                  <Text style={styles.metaText}>{r.deliveryTime || '25-30 mins'}</Text>
                  <Text style={styles.metaText}>{'�'}</Text>
                  <MapPin size={16} color={tw.gray500} />
                  <Text style={styles.metaText}>{r.distance || '2.5 km'}</Text>
                </View>
                {r.cuisine ? <Text style={styles.metaText} numberOfLines={1}>{r.cuisine}</Text> : null}
              </View>
            </Press>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  back: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  sub: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 4, ...poppins(400) },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 18, lineHeight: 28, color: tw.gray500, marginTop: 16, marginBottom: 16, ...poppins(400) },
  explore: { backgroundColor: F.green, paddingHorizontal: 16, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  exploreText: { color: '#fff', fontSize: 14, lineHeight: 20, ...poppins(500) },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, overflow: 'hidden' },
  trash: { position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tw.green600, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  ratingText: { color: '#fff', fontSize: 14, lineHeight: 20, ...poppins(700) },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  metaText: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
});
