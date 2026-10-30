/**
 * Ported from Frontend/src/modules/Food/components/user/StickyCartCard.jsx.
 * Dropped the dead `totalPrice` calculation (computed in the web source but
 * never actually rendered there either — just "N items · View Cart", which
 * is what this shows).
 */
import React, {useState} from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ChevronRight, X} from 'lucide-react-native';
import {useFoodCart} from '../../context/FoodCartContext';

export default function StickyCartBar() {
  const navigation = useNavigation();
  const {cart, getCartCount} = useFoodCart();
  const [dismissed, setDismissed] = useState(false);
  const cartCount = getCartCount();

  if (cartCount === 0 || dismissed) return null;

  const restaurantName = cart[0]?.restaurant || 'Restaurant';
  const restaurantImage = cart[0]?.image || 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&h=200&fit=crop';

  return (
    <View className="absolute bottom-3 left-4 right-4">
      <View className="bg-white rounded-3xl border border-slate-200 overflow-hidden" style={{elevation: 8}}>
        <View className="flex-row items-center gap-3 p-3">
          <Image source={{uri: restaurantImage}} className="w-14 h-14 rounded-lg" resizeMode="cover" />
          <Pressable className="flex-1 min-w-0">
            <Text className="font-bold text-slate-900 text-base" numberOfLines={1}>{restaurantName}</Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-sm text-slate-500">View Menu</Text>
              <ChevronRight size={14} color="#64748b" />
            </View>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('FoodCart')} className="bg-[#0a4d2b] px-4 py-2.5 rounded-lg items-center">
            <Text className="text-xs text-white/90">View Cart</Text>
            <Text className="text-xs font-bold text-white">
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setDismissed(true)} className="w-8 h-8 items-center justify-center rounded-full">
            <X size={18} color="#94a3b8" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
