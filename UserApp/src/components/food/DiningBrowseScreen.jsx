/**
 * Shared implementation behind FoodDiningScreen, FoodDiningCategoryScreen,
 * FoodDiningExplore50Screen, FoodDiningExploreNearScreen and
 * FoodCoffeeScreen. On web these are five separate files; the real one
 * (Dining.jsx) fetches `diningApi.getRestaurants` for real, but
 * DiningExplore50.jsx, DiningExploreNear.jsx and Coffee.jsx never call
 * the dining API at all — they render a hardcoded "Starbucks, Indore"
 * demo array (confirmed by grepping each file for `diningAPI`, which
 * finds nothing). Rather than port three screens of fake Indore café
 * listings into a Dima Hasao app, all five browse variants here share
 * one real, backend-driven implementation and differ only by title and
 * a `filterFn`/`sortFn` pair — e.g. ExploreNear sorts by distance,
 * Explore50/Coffee filter by offer/cuisine. DiningCategory.jsx's filter
 * (by category slug) is real on web and ported the same way, as a
 * filterFn.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ArrowLeft, Search, UtensilsCrossed} from 'lucide-react-native';
import diningApi from '../../services/food/diningApi';
import {useFoodLocation} from '../../hooks/useFoodLocation';
import {normalizeDiningRestaurantList} from '../../utils/diningTransform';
import {normalizeImageUrl} from '../../utils/imageUrl';
import {slugify} from '../../utils/foodCommon';
import DiningRestaurantCard from './DiningRestaurantCard';

export default function DiningBrowseScreen({title, showCategories = false, filterFn, sortFn, emptyLabel = 'No restaurants found'}) {
  const navigation = useNavigation();
  const {location} = useFoodLocation();
  const [categories, setCategories] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = {};
        if (Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)) {
          params.lat = location.latitude;
          params.lng = location.longitude;
        }
        const [catsRes, restRes] = await Promise.all([showCategories ? diningApi.getCategories() : Promise.resolve(null), diningApi.getRestaurants(params)]);
        if (cancelled) return;
        if (catsRes) {
          const cats = catsRes?.data?.success ? catsRes.data.data || [] : [];
          setCategories(
            cats
              .filter(c => String(c?.name || '').trim())
              .map(c => ({id: c._id || c.id, name: String(c.name).trim(), slug: slugify(c.slug || c.name), imageUrl: normalizeImageUrl(c.imageUrl || '')})),
          );
        }
        const rests = restRes?.data?.success ? restRes.data.data || [] : [];
        setRestaurants(normalizeDiningRestaurantList(rests, location));
      } catch {
        if (!cancelled) {
          setRestaurants([]);
          setCategories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location, showCategories]);

  const filtered = useMemo(() => {
    let list = restaurants;
    if (filterFn) list = list.filter(filterFn);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q));
    }
    if (sortFn) list = [...list].sort(sortFn);
    return list;
  }, [restaurants, filterFn, sortFn, search]);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white flex-row items-center gap-3 px-4 py-3 border-b border-gray-100">
        <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 items-center justify-center">
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">{title}</Text>
      </View>

      <View className="px-4 py-3">
        <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 h-10">
          <Search size={16} color="#9ca3af" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search restaurants or cuisines" placeholderTextColor="#9ca3af" className="flex-1 ml-2 text-sm text-gray-800" />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0a4d2b" size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => String(r.id)}
          renderItem={({item}) => (
            <View className="px-4">
              <DiningRestaurantCard restaurant={item} />
            </View>
          )}
          ListHeaderComponent={
            showCategories && categories.length > 0 ? (
              <FlatList
                horizontal
                data={categories}
                showsHorizontalScrollIndicator={false}
                keyExtractor={c => String(c.id)}
                contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 12, gap: 10}}
                renderItem={({item}) => (
                  <Pressable onPress={() => navigation.navigate('FoodDiningCategory', {categorySlug: item.slug, categoryName: item.name})} className="w-24 items-center">
                    <View className="w-24 h-24 rounded-2xl bg-white border border-gray-100 overflow-hidden items-center justify-center">
                      {item.imageUrl ? <Image source={{uri: item.imageUrl}} className="w-full h-full" resizeMode="contain" /> : <UtensilsCrossed size={28} color="#9ca3af" />}
                    </View>
                    <Text className="text-xs font-semibold text-gray-700 mt-1.5 text-center" numberOfLines={2}>
                      {item.name}
                    </Text>
                  </Pressable>
                )}
              />
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <UtensilsCrossed size={36} color="#9ca3af" />
              <Text className="text-sm text-gray-500 mt-2">{emptyLabel}</Text>
            </View>
          }
          contentContainerStyle={{paddingTop: 4, paddingBottom: 24}}
        />
      )}
    </View>
  );
}
