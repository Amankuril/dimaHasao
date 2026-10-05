import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Grid2x2, Search } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import Skeleton from '../../../components/Skeleton';
import { adminAPI } from '../../../api/food';
import { API_ORIGIN } from '../../../api/client';
import { foodImages } from '../../constants/images';
import { useLocation } from '../../hooks/useLocation';
import { useZone } from '../../hooks/useZone';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { useProfile } from '../../context/ProfileContext';
import { isNonVegCategoryScope } from '../../utils/vegMode';
import { normalizeImageUrl } from '../../utils/common';
import { F } from '../../components/shell';
import { poppins, tw } from '../../../theme';

/** Port of pages/user/Categories.jsx. */
export default function Categories() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const goBack = useAppBackNavigation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const { vegMode } = useProfile();
  const { location } = useLocation();
  const { zoneId } = useZone(location);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.getPublicCategories(zoneId ? { zoneId } : {});
        const list = response?.data?.data?.categories || response?.data?.categories || [];
        if (Array.isArray(list)) {
          setCategories(
            list.map((cat, idx) => {
              const img = normalizeImageUrl(cat?.image || cat?.imageUrl, API_ORIGIN);
              return {
                id: String(cat?.id || cat?._id || cat?.slug || idx),
                name: cat?.name || '',
                slug: cat?.slug || String(cat?.name || '').toLowerCase().replace(/\s+/g, '-'),
                image: img || foodImages[idx % foodImages.length],
                type: cat?.type || '',
                foodTypeScope: cat?.foodTypeScope || '',
              };
            }),
          );
        }
      } catch {
        // the grid stays empty
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [zoneId]);

  const filtered = categories.filter((cat) => {
    if (vegMode && isNonVegCategoryScope(cat)) return false;
    return (cat.name || '').toLowerCase().includes(query.toLowerCase());
  });

  const cell = (width - 32 - 3 * 16) / 4;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[styles.header, { paddingTop: 16 }]}>
        <Press scale={0.95} onPress={goBack} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={24} color={tw.neutral800} />
        </Press>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>All Categories</Text>
          <Text style={styles.kicker}>WHAT&apos;S ON YOUR MIND?</Text>
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
          <View>
            <Search size={20} color={focused ? F.green : tw.neutral400} style={styles.searchIcon} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search specialties, cuisines..."
              placeholderTextColor={tw.neutral400}
              style={[styles.search, focused ? { borderColor: F.green } : null]}
            />
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {loading ? (
            <View style={styles.grid}>
              {Array.from({ length: 12 }).map((_, i) => (
                <View key={i} style={{ width: cell, alignItems: 'center', gap: 12 }}>
                  <Skeleton style={{ width: cell, height: cell, borderRadius: cell / 2, backgroundColor: tw.neutral100 }} />
                  <Skeleton style={{ width: 48, height: 8, borderRadius: 4, backgroundColor: tw.neutral100 }} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.grid}>
              {filtered.map((category, index) => (
                <Press key={category.id || index} scale={0.9} onPress={() => router.push(`/food/user/category/${category.slug}`)} accessibilityLabel={category.name} style={{ width: cell, alignItems: 'center', gap: 10 }}>
                  <View style={[styles.circle, { width: cell, height: cell, borderRadius: cell / 2 }]}>
                    <Image source={typeof category.image === 'string' ? { uri: category.image } : category.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                  <Text style={styles.name}>{category.name}</Text>
                </Press>
              ))}
            </View>
          )}

          {filtered.length === 0 && !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Grid2x2 size={40} color={tw.neutral300} />
              </View>
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyBody}>We couldn&apos;t find any categories matching your search. Try another keyword!</Text>
              <Press scale={0.95} onPress={() => setQuery('')} accessibilityLabel="Show all categories" style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Show all categories</Text>
              </Press>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.8)', borderBottomWidth: 1, borderBottomColor: tw.neutral100 },
  back: { padding: 8, borderRadius: 20 },
  title: { fontSize: 20, lineHeight: 28, color: tw.neutral900, letterSpacing: -0.5, ...poppins(700) },
  kicker: { fontSize: 10, lineHeight: 10, color: tw.neutral500, letterSpacing: 1, marginTop: 4, ...poppins(700) },
  searchIcon: { position: 'absolute', left: 16, top: 18, zIndex: 1 },
  search: { height: 56, paddingLeft: 48, paddingRight: 16, backgroundColor: tw.neutral50, borderWidth: 1, borderColor: tw.neutral100, borderRadius: 16, fontSize: 14, color: tw.gray900, ...poppins(500) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 40 },
  circle: { overflow: 'hidden', borderWidth: 1, borderColor: tw.neutral100, backgroundColor: '#fff', ...{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' } },
  name: { fontSize: 11, lineHeight: 13.75, color: tw.neutral700, textAlign: 'center', ...poppins(700) },
  empty: { paddingVertical: 80, alignItems: 'center', paddingHorizontal: 24 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: tw.neutral50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 18, lineHeight: 28, color: tw.neutral900, ...poppins(700) },
  emptyBody: { fontSize: 14, lineHeight: 20, color: tw.neutral500, marginTop: 8, maxWidth: 240, textAlign: 'center', ...poppins(400) },
  emptyBtn: { marginTop: 32, paddingHorizontal: 32, paddingVertical: 12, backgroundColor: tw.neutral900, borderRadius: 16, ...{ boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' } },
  emptyBtnText: { color: '#fff', fontSize: 14, lineHeight: 20, ...poppins(700) },
});
