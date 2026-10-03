/**
 * Ported from the restaurant-card JSX repeated across Dining.jsx's two
 * restaurant grids — image with a "PRE-BOOK TABLE" banner, featured-dish
 * badge, bookmark, name + rating badge, cuisine/cost meta row.
 */
import React from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Bookmark, Star} from 'lucide-react-native';
import {useFoodProfile} from '../../context/FoodProfileContext';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop';

export default function DiningRestaurantCard({restaurant}) {
  const navigation = useNavigation();
  const {addFavorite, removeFavorite, isFavorite} = useFoodProfile();
  const favorite = isFavorite(restaurant.slug);

  const toggleFavorite = () => {
    if (favorite) {
      removeFavorite(restaurant.slug);
    } else {
      addFavorite({slug: restaurant.slug, name: restaurant.name, cuisine: restaurant.cuisine, rating: restaurant.rating, image: restaurant.image});
    }
  };

  return (
    <Pressable
      onPress={() => navigation.navigate('FoodDiningRestaurantDetails', {restaurantId: restaurant.id, restaurant})}
      className="bg-white rounded-3xl overflow-hidden border border-gray-100 mb-4"
      style={{elevation: 2}}>
      <View className="relative h-44">
        <Image source={{uri: restaurant.image || FALLBACK_IMAGE}} className="w-full h-full" resizeMode="cover" />
        {restaurant.featuredDish && restaurant.featuredDish !== "Chef's special" && restaurant.featuredPrice > 0 && (
          <View className="absolute top-3 left-3 bg-gray-800/80 px-3 py-1.5 rounded-lg">
            <Text className="text-white text-xs font-medium">
              {restaurant.featuredDish} · ₹{restaurant.featuredPrice}
            </Text>
          </View>
        )}
        <Pressable onPress={toggleFavorite} className="absolute top-3 right-3 w-9 h-9 bg-white/90 rounded-lg items-center justify-center">
          <Bookmark size={18} color="#1f2937" fill={favorite ? '#1f2937' : 'none'} />
        </Pressable>
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-3" style={{backgroundColor: 'rgba(10,77,43,0.85)', paddingTop: 20}}>
          <Text className="text-white text-[11px] font-medium uppercase tracking-wide">Pre-book table</Text>
          <Text className="text-white text-base font-bold mt-0.5">{restaurant.offer}</Text>
        </View>
      </View>

      <View className="p-3.5">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>
            {restaurant.name}
          </Text>
          <View className="flex-row items-center gap-1 bg-[#267e3e] px-2 py-1 rounded-lg">
            <Text className="text-sm font-bold text-white">{restaurant.rating || '0'}</Text>
            <Star size={12} color="#fff" fill="#fff" />
          </View>
        </View>
        <View className="flex-row items-center gap-2 mt-1.5">
          <Text className="text-sm text-gray-500" numberOfLines={1}>
            {restaurant.cuisine}
          </Text>
          {restaurant.costForTwo ? (
            <>
              <Text className="text-gray-400">·</Text>
              <Text className="text-sm text-gray-500">{restaurant.costForTwo}</Text>
            </>
          ) : null}
        </View>
        <Text className="text-xs text-gray-400 mt-1" numberOfLines={1}>
          {restaurant.address}
          {Number.isFinite(restaurant.distanceKm) ? ` · ${restaurant.distanceKm.toFixed(1)} km` : ''}
        </Text>
      </View>
    </Pressable>
  );
}
