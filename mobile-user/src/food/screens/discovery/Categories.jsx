import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Grid2x2 } from 'lucide-react-native';
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
import { EmptyState } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { PageBar, SearchField } from '../../components/discovery/bits';
import { color, elevation, space, type } from '../../../theme';

/** Port of pages/user/Categories.jsx. */
export default function Categories() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const goBack = useAppBackNavigation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
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

  const cols = width < 340 ? 3 : 4;
  const gap = space.md;
  const cell = (width - space.lg * 2 - (cols - 1) * gap) / cols;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PageBar title="All categories" subtitle="What's on your mind?" onBack={goBack} />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}>
        <View style={{ paddingHorizontal: space.lg, paddingVertical: space.lg }}>
          <SearchField value={query} onChangeText={setQuery} onClear={() => setQuery('')} placeholder="Search specialties, cuisines" accessibilityLabel="Search categories" />
        </View>

        <View style={{ paddingHorizontal: space.lg }}>
          {loading ? (
            <View style={[styles.grid, { columnGap: gap }]} accessibilityRole="progressbar" accessibilityLabel="Loading categories">
              {Array.from({ length: 12 }).map((_, i) => (
                <View key={i} style={{ width: cell, alignItems: 'center', gap: space.sm }}>
                  <Skeleton style={{ width: cell, height: cell, borderRadius: cell / 2, backgroundColor: color.surfaceMuted }} />
                  <Skeleton style={{ width: 48, height: 12, borderRadius: 6, backgroundColor: color.surfaceMuted }} />
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.grid, { columnGap: gap }]}>
              {filtered.map((category, index) => (
                <Press key={category.id || index} scale={0.94} onPress={() => router.push(`/food/user/category/${category.slug}`)} accessibilityRole="button" accessibilityLabel={category.name} style={{ width: cell, alignItems: 'center', gap: space.sm }}>
                  <View style={[styles.circle, { width: cell, height: cell, borderRadius: cell / 2 }]}>
                    <Image source={typeof category.image === 'string' ? { uri: category.image } : category.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                  <Text style={styles.name} numberOfLines={2}>{category.name}</Text>
                </Press>
              ))}
            </View>
          )}

          {filtered.length === 0 && !loading ? (
            <EmptyState
              icon={Grid2x2}
              title="No results found"
              message="We couldn't find any categories matching your search. Try another keyword!"
              actionLabel="Show all categories"
              onAction={() => setQuery('')}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.xxl },
  circle: { overflow: 'hidden', borderWidth: 2, borderColor: color.border, backgroundColor: color.surface, ...elevation.card },
  name: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.text, textAlign: 'center' },
});
