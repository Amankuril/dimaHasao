/**
 * Frontend/src/modules/Food/pages/user/ProductDetail.jsx is dead code on
 * web: its own first line reads "// old one", it renders entirely from a
 * hardcoded `productsData`/`restaurantsData` object (18 fake dishes, fake
 * reviews generated client-side), its review-submission JSX is commented
 * out, and — confirmed by grepping the whole Food module — nothing ever
 * links to its route (`/food/user/product/:id`); only UserRouter.jsx's own
 * route registration references it. There's nothing real to port.
 *
 * The one thing worth keeping is that `FoodProductDetail` exists in
 * FoodStack.jsx as a real, named route, presumably for a future deep link
 * (a shared dish link, a search result, a notification) that needs to open
 * a single dish without the full restaurant menu around it. So this screen
 * is a genuine implementation, backed by real data: given
 * {restaurantId, dishId} (or a pre-fetched {restaurant, item} pair to paint
 * instantly), it fetches that restaurant's menu, finds the dish, and shows
 * it full-screen using the same add-to-cart mechanics as the item detail
 * modal in FoodRestaurantDetailsScreen — variant choice, quantity, veg
 * indicator — plus a link back to the full restaurant menu.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, ScrollView, Text, View} from 'react-native';
import {Pressable} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {AlertCircle, ArrowLeft, Minus, Plus, Star} from 'lucide-react-native';
import restaurantApi from '../../services/food/restaurantApi';
import {useFoodCart} from '../../context/FoodCartContext';
import {buildCartLineId, getDefaultFoodVariant, getFoodDisplayPrice, getFoodVariants, hasFoodVariants} from '../../utils/foodVariants';
import {normalizeImageUrl} from '../../utils/imageUrl';
import {isModuleAuthenticated} from '../../utils/moduleAuth';
import Toast from 'react-native-toast-message';

const FOOD_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop';

export default function FoodProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};
  const restaurantId = params.restaurantId || params.restaurant?.id || params.restaurant?.restaurantId || params.restaurant?.mongoId;
  const dishId = params.dishId || params.item?.id;

  const {cart, addToCart, removeFromCart, updateQuantity, getCartItem} = useFoodCart();
  const [restaurant, setRestaurant] = useState(params.restaurant || null);
  const [item, setItem] = useState(params.item || null);
  const [loading, setLoading] = useState(!params.item);
  const [error, setError] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!restaurantId || !dishId) {
        if (!params.item) setError('Dish not found');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const [restaurantRes, menuRes] = await Promise.all([restaurant ? Promise.resolve(null) : restaurantApi.getRestaurantById(restaurantId), restaurantApi.getMenuByRestaurantId(restaurantId)]);
        if (cancelled) return;

        if (restaurantRes?.data?.data) {
          const r = restaurantRes.data.data;
          setRestaurant(prev => prev || {id: r.restaurantId || r._id, name: r.name || r.restaurantName || 'Restaurant', mongoId: r._id});
        }

        const sections = menuRes?.data?.data?.menu?.sections || [];
        const allItems = sections.flatMap(s => [...(s.items || []), ...(s.subsections || []).flatMap(sub => sub.items || [])]);
        const found = allItems.find(i => String(i.id || i._id) === String(dishId));
        if (!found) throw new Error('Dish not found');
        setItem({...found, id: String(found.id || found._id), image: normalizeImageUrl(found.image || found.images?.[0] || ''), isVeg: found.foodType === 'Veg'});
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load dish');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, dishId]);

  useEffect(() => {
    if (!item) return;
    setSelectedVariantId(getDefaultFoodVariant(item)?.id || '');
  }, [item]);

  const selectedVariant = item ? getFoodVariants(item).find(v => String(v.id) === String(selectedVariantId)) || getDefaultFoodVariant(item) : null;
  const lineItemId = item ? buildCartLineId(item.id, selectedVariant?.id || '') : null;
  const cartItem = lineItemId ? getCartItem(lineItemId) : null;
  const quantity = cartItem?.quantity || 0;

  const handleAdd = async () => {
    if (!(await isModuleAuthenticated('user'))) {
      navigation.navigate('Login');
      return;
    }
    const cartPayload = {
      id: lineItemId,
      itemId: item.id,
      name: item.name,
      price: selectedVariant?.price ?? item.price,
      variantId: selectedVariant?.id || '',
      variantName: selectedVariant?.name || '',
      variantPrice: selectedVariant?.price ?? item.price,
      image: item.image,
      restaurant: restaurant?.name,
      restaurantId: restaurant?.restaurantId || restaurant?.mongoId || restaurant?.id,
      description: item.description,
      isVeg: item.isVeg === true,
      foodType: item.foodType,
    };
    const result = await addToCart(cartPayload);
    if (result?.ok === false) {
      Toast.show({type: 'error', text1: result.error || 'Cannot add item from a different restaurant'});
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#0a4d2b" size="large" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <AlertCircle size={40} color="#ef4444" />
        <Text className="text-base font-bold text-gray-900 mt-3">Dish not found</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4 px-5 py-2.5 bg-[#0a4d2b] rounded-xl">
          <Text className="text-white font-semibold">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView>
        <View className="relative w-full h-64 bg-gray-100">
          <Image source={{uri: item.image || FOOD_IMAGE_FALLBACK}} className="w-full h-full" resizeMode="cover" />
          <Pressable onPress={() => navigation.goBack()} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 items-center justify-center">
            <ArrowLeft size={20} color="#111827" />
          </Pressable>
        </View>

        <View className="px-4 py-4">
          <View className="flex-row items-center gap-2">
            <View className={`w-5 h-5 rounded border-2 items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
              <View className={`w-2.5 h-2.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
            </View>
            <Text className="text-2xl font-bold text-gray-900 flex-1">{item.name}</Text>
          </View>

          {restaurant?.name ? (
            <Pressable onPress={() => navigation.navigate('FoodRestaurantDetails', {restaurantId: restaurant.id || restaurant.restaurantId, restaurant})} className="mt-1">
              <Text className="text-sm text-[#0a4d2b] font-semibold">{restaurant.name} · View full menu</Text>
            </Pressable>
          ) : null}

          {item.rating > 0 && (
            <View className="flex-row items-center gap-1 mt-2">
              <Star size={14} color="#facc15" fill="#facc15" />
              <Text className="text-sm font-semibold text-gray-800">{Number(item.rating).toFixed(1)}</Text>
            </View>
          )}

          {item.description ? <Text className="text-sm text-gray-600 mt-3 leading-relaxed">{item.description}</Text> : null}

          {hasFoodVariants(item) && (
            <View className="mt-4">
              <Text className="text-sm font-semibold text-gray-900 mb-2">Choose a variant</Text>
              <View className="flex-row flex-wrap gap-2">
                {getFoodVariants(item).map(variant => (
                  <Pressable
                    key={variant.id}
                    onPress={() => setSelectedVariantId(variant.id)}
                    className={`rounded-full border px-3 py-1.5 ${String(selectedVariantId) === String(variant.id) ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'}`}>
                    <Text className={`text-sm font-medium ${String(selectedVariantId) === String(variant.id) ? 'text-red-600' : 'text-gray-700'}`}>
                      {variant.name} · ₹{Math.round(variant.price)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Text className="text-xl font-bold text-gray-900 mt-5">₹{Math.round(selectedVariant?.price ?? item.price)}</Text>
        </View>
      </ScrollView>

      <View className="border-t border-gray-200 px-4 py-4 flex-row items-center gap-3">
        {quantity > 0 ? (
          <View className="flex-1 flex-row items-center justify-between border-2 border-[#0a4d2b] rounded-lg px-4 h-12">
            <Pressable onPress={() => (quantity - 1 <= 0 ? removeFromCart(lineItemId) : updateQuantity(lineItemId, quantity - 1))}>
              <Minus size={18} color="#0a4d2b" />
            </Pressable>
            <Text className="text-lg font-bold text-[#0a4d2b]">{quantity}</Text>
            <Pressable onPress={() => updateQuantity(lineItemId, quantity + 1)}>
              <Plus size={18} color="#0a4d2b" />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={handleAdd} className="flex-1 h-12 rounded-lg bg-[#0a4d2b] items-center justify-center">
            <Text className="text-white font-bold">Add to cart · ₹{Math.round(selectedVariant?.price ?? item.price)}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
