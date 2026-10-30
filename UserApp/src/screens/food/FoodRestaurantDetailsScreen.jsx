/**
 * Ported from Frontend/src/modules/Food/pages/user/restaurants/RestaurantDetails.jsx
 * (4638 lines). The web file's size is overwhelmingly: (a) multi-strategy
 * slug resolution (dining API -> restaurant-by-id -> name-search) for
 * browser deep-links — irrelevant here since RN navigation always carries
 * a real restaurantId/mongoId in route params, never a free-text URL slug;
 * (b) framer-motion/CSS decoration (coupon-strip auto-rotation, highlight
 * glow animation, swipeable image carousel) — no RN equivalent, dropped as
 * in every prior screen; (c) six bottom sheets. Of those six: the item
 * detail modal (variant choice + quantity + add), the offers modal, and
 * the veg/non-veg + sort filters are ported (sort/filter merged into one
 * simpler control — "highly reordered"/"spicy" chips are dropped, they key
 * off fields this project's menu data doesn't populate). The multi-outlet
 * location sheet is simplified to the inline address text already shown
 * (outlet switching is a multi-location feature, not applicable to a
 * single-district app). The "Menu options" sheet (which only wrapped a
 * single "Add to collection" action) and the "Schedule for later" sheet
 * (scheduled delivery time — secondary to being able to order at all) are
 * dropped outright; the former's one action is now a direct bookmark icon
 * on the header, matching Home's restaurant-card pattern.
 *
 * Expects route.params: { restaurantId, restaurant? } — `restaurant` is the
 * already-fetched summary object from FoodHomeScreen's list (same shape),
 * used to paint instantly while the full record (+ menu) loads underneath.
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, Modal, Pressable, ScrollView, Share, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  ChevronDown,
  Clock,
  Copy,
  MapPin,
  Minus,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Star,
  Utensils,
  X,
} from 'lucide-react-native';
import restaurantApi from '../../services/food/restaurantApi';
import {useFoodCart} from '../../context/FoodCartContext';
import {useFoodProfile} from '../../context/FoodProfileContext';
import {getRestaurantAvailabilityStatus} from '../../utils/restaurantAvailability';
import {isVegMenuItem} from '../../utils/vegMode';
import {filterPublicOffers} from '../../utils/offerUtils';
import {buildCartLineId, getDefaultFoodVariant, getFoodDisplayPrice, getFoodVariants, hasFoodVariants} from '../../utils/foodVariants';
import {normalizeImageUrl} from '../../utils/imageUrl';
import {removePlusCode, slugify} from '../../utils/foodCommon';
import {isModuleAuthenticated} from '../../utils/moduleAuth';

const FOOD_IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop';

const formatCouponText = coupon => {
  if (!coupon) return '';
  const minOrderValue = Number(coupon.minOrderValue);
  const minOrderText = Number.isFinite(minOrderValue) && minOrderValue > 0 ? ` above ₹${minOrderValue}` : '';
  if (coupon.discountType === 'percentage') {
    const discountPercentage = coupon.discountPercentage ?? coupon.discountValue ?? 0;
    const limitText = coupon.maxDiscount ? ` up to ₹${coupon.maxDiscount}` : '';
    return `${discountPercentage}% OFF${minOrderText}${limitText}`;
  }
  const value = coupon.originalPrice || coupon.discountValue || 0;
  return `Flat ₹${value} OFF${minOrderText}`;
};

const toArray = value => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).filter(entry => entry && typeof entry === 'object');
};

const normalizeMenuItem = item => {
  let foodType = item.foodType || 'Non-Veg';
  if (typeof foodType === 'string') {
    if (foodType.toLowerCase() === 'veg') foodType = 'Veg';
    else if (foodType.toLowerCase() === 'non-veg' || foodType.toLowerCase() === 'nonveg') foodType = 'Non-Veg';
  }
  return {
    ...item,
    id: String(item.id || item._id || `${Date.now()}-${Math.random()}`),
    name: item.name || 'Unnamed Item',
    foodType,
    isVeg: foodType === 'Veg',
    price: getFoodDisplayPrice(item),
    variants: getFoodVariants(item),
    isAvailable: item.isAvailable !== false,
    isRecommended: item.isRecommended === true,
    isSpicy: item.isSpicy === true,
    description: typeof item.description === 'string' ? item.description : '',
    image: normalizeImageUrl(item.image || item.images?.[0] || ''),
  };
};

const normalizeAddress = restaurant => {
  const loc = restaurant?.locationObject || restaurant?.location;
  if (!loc) return restaurant?.location || 'Location';
  if (typeof loc === 'string') return removePlusCode(loc);
  const parts = [loc.addressLine1, loc.addressLine2, loc.area, loc.city, loc.state, loc.pincode || loc.zipCode].filter(v => v && String(v).trim());
  if (parts.length > 0) return removePlusCode(parts.join(', '));
  if (loc.formattedAddress) return removePlusCode(loc.formattedAddress);
  return 'Location';
};

const transformRestaurant = (apiRestaurant, seeded) => {
  const r = apiRestaurant || {};
  return {
    ...seeded,
    id: r.restaurantId || r._id || seeded?.id,
    mongoId: r._id || seeded?.mongoId,
    restaurantId: r.restaurantId || seeded?.restaurantId,
    name: r.name || r.restaurantName || seeded?.name || 'Restaurant',
    cuisine: Array.isArray(r.cuisines) && r.cuisines.length > 0 ? r.cuisines[0] : seeded?.cuisine || 'Multi-cuisine',
    rating: Number(r.rating ?? seeded?.rating) || 0,
    reviews: Number(r.totalRatings ?? seeded?.totalRatings) || 0,
    deliveryTime: r.deliveryTime || r.estimatedDeliveryTime || seeded?.deliveryTime || '25-30 mins',
    distance: r.distance || seeded?.distance || null,
    location: normalizeAddress({locationObject: r.location}),
    locationObject: r.location,
    image: normalizeImageUrl(r.profileImage || r.image || (Array.isArray(r.coverImages) ? r.coverImages[0] : r.coverImage) || seeded?.image || ''),
    offers: Array.isArray(r.offers) ? r.offers : [],
    offerText: r.offer || seeded?.offerText || null,
    slug: (r.slug || seeded?.slug || slugify(r.name || seeded?.name || '')).replace(/[\s/]+/g, '-'),
    outletTimings: r.outletTimings || seeded?.outletTimings || null,
    deliveryTimings: r.deliveryTimings || seeded?.deliveryTimings || null,
    openingTime: r.openingTime || seeded?.openingTime || null,
    closingTime: r.closingTime || seeded?.closingTime || null,
    openDays: Array.isArray(r.openDays) ? r.openDays : seeded?.openDays || [],
    isActive: r.isActive !== false,
    isAcceptingOrders: r.isAcceptingOrders !== false,
    menuSections: seeded?.menuSections || [],
  };
};

export default function FoodRestaurantDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};
  const under250Only = params.under250 === true;

  const {cart, addToCart, removeFromCart, updateQuantity, getCartItem} = useFoodCart();
  const {vegMode, addFavorite, removeFavorite, isFavorite, addDishFavorite, removeDishFavorite, isDishFavorite} = useFoodProfile();

  const [restaurant, setRestaurant] = useState(() => (params.restaurant ? transformRestaurant(null, params.restaurant) : null));
  const [loading, setLoading] = useState(!params.restaurant);
  const [error, setError] = useState(null);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [publicOffers, setPublicOffers] = useState([]);
  const [expandedSections, setExpandedSections] = useState(() => new Set([0]));
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [vegNonVeg, setVegNonVeg] = useState(null); // null | 'veg' | 'non-veg'
  const [sortBy, setSortBy] = useState(null); // null | 'low-to-high' | 'high-to-low'
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSort, setShowSort] = useState(false);
  const [showOffers, setShowOffers] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');

  const restaurantId = params.restaurantId || params.restaurant?.id || params.restaurant?.restaurantId;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!params.restaurant) setLoading(true);
        setError(null);
        const response = await restaurantApi.getRestaurantById(restaurantId);
        if (cancelled) return;
        const apiRestaurant = response?.data?.data || null;
        if (!apiRestaurant) throw new Error('Restaurant not found');
        setRestaurant(prev => transformRestaurant(apiRestaurant, prev || params.restaurant));

        const objectId = apiRestaurant._id || apiRestaurant.restaurantId || restaurantId;
        setLoadingMenu(true);
        const [outletResult, menuResult] = await Promise.allSettled([restaurantApi.getOutletTimingsByRestaurantId(objectId), restaurantApi.getMenuByRestaurantId(objectId)]);
        if (cancelled) return;

        if (outletResult.status === 'fulfilled') {
          const outletTimings = outletResult.value?.data?.data?.outletTimings || outletResult.value?.data?.outletTimings;
          if (outletTimings) setRestaurant(prev => (prev ? {...prev, outletTimings} : prev));
        }

        if (menuResult.status === 'fulfilled' && menuResult.value?.data?.success) {
          const rawSections = menuResult.value.data.data?.menu?.sections || [];
          const menuSections = toArray(rawSections).map((section, sectionIndex) => ({
            id: String(section.id || section._id || `section-${sectionIndex}`),
            name: section.name || section.title || 'Unnamed Section',
            categoryId: section.categoryId,
            items: toArray(section.items).map(normalizeMenuItem),
            subsections: toArray(section.subsections).map((sub, subIndex) => ({
              id: String(sub.id || sub._id || `subsection-${sectionIndex}-${subIndex}`),
              name: sub.name || 'Unnamed Subsection',
              items: toArray(sub.items).map(normalizeMenuItem),
            })),
          }));

          const recommended = [];
          menuSections.forEach(section => {
            section.items.forEach(item => item.isRecommended && item.isAvailable !== false && recommended.push(item));
            section.subsections.forEach(sub => sub.items.forEach(item => item.isRecommended && item.isAvailable !== false && recommended.push(item)));
          });

          let finalSections = menuSections.filter(s => !['recommended', 'recommended for you'].includes(s.name.trim().toLowerCase()));
          if (recommended.length > 0) finalSections = [{id: 'recommended', name: 'Recommended for you', items: recommended, subsections: []}, ...finalSections];

          setRestaurant(prev => (prev ? {...prev, menuSections: finalSections} : prev));
          setExpandedSections(new Set(finalSections.map((_, idx) => idx)));
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || err?.message || 'Failed to load restaurant');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMenu(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, params.restaurant]);

  useEffect(() => {
    restaurantApi
      .getPublicOffers()
      .then(res => {
        const list = res?.data?.data?.allOffers || res?.data?.allOffers || [];
        setPublicOffers(list);
      })
      .catch(() => setPublicOffers([]));
  }, []);

  const coupons = useMemo(() => {
    if (!restaurant) return [];
    return filterPublicOffers(publicOffers, {restaurantId: restaurant.restaurantId || restaurant.id, restaurantSlug: restaurant.slug, restaurant, requireShowInCart: true}).map(o => ({
      couponCode: o.couponCode,
      discountType: o.discountType,
      discountPercentage: o.discountType === 'percentage' ? Number(o.discountValue) || 0 : 0,
      originalPrice: o.discountType === 'percentage' ? 0 : Number(o.discountValue || 0),
      minOrderValue: Number(o.minOrderValue) > 0 ? Number(o.minOrderValue) : null,
      maxDiscount: o.maxDiscount != null ? Number(o.maxDiscount) : null,
    }));
  }, [publicOffers, restaurant]);

  const availability = useMemo(() => getRestaurantAvailabilityStatus(restaurant, new Date()), [restaurant]);
  const isOffline = restaurant ? !availability.isOpen : false;

  const quantities = useMemo(() => {
    if (!restaurant?.name) return {};
    const map = {};
    cart.forEach(item => {
      if (item.restaurant === restaurant.name) map[item.id] = item.quantity || 0;
    });
    return map;
  }, [cart, restaurant?.name]);

  const getLineItemId = (item, variant) => buildCartLineId(item?.id, variant?.id || '');
  const getDishQuantity = (item, preferredVariantId = '') => {
    if (preferredVariantId) {
      const variant = getFoodVariants(item).find(v => String(v.id) === String(preferredVariantId));
      return quantities[getLineItemId(item, variant)] || 0;
    }
    if (hasFoodVariants(item)) {
      return getFoodVariants(item).reduce((sum, v) => sum + (quantities[getLineItemId(item, v)] || 0), 0);
    }
    return quantities[getLineItemId(item, null)] || 0;
  };
  const getSoleActiveVariant = item => {
    if (!hasFoodVariants(item)) return null;
    const active = getFoodVariants(item).filter(v => (quantities[getLineItemId(item, v)] || 0) > 0);
    return active.length === 1 ? active[0] : null;
  };

  const updateItemQuantity = useCallback(
    async (item, newQuantity, preferredVariant) => {
      if (!(await isModuleAuthenticated('user'))) {
        navigation.navigate('Login');
        return;
      }
      if (isOffline) {
        Toast.show({type: 'error', text1: 'Restaurant is currently offline'});
        return;
      }
      const resolvedVariant = preferredVariant || getDefaultFoodVariant(item);
      const lineItemId = getLineItemId(item, resolvedVariant);
      const validRestaurantId = restaurant?.restaurantId || restaurant?.mongoId || restaurant?.id;

      if (newQuantity <= 0) {
        await removeFromCart(lineItemId);
        return;
      }

      const existing = getCartItem(lineItemId);
      if (existing) {
        await updateQuantity(lineItemId, newQuantity);
        return;
      }

      const cartItem = {
        id: lineItemId,
        itemId: item.id,
        name: item.name,
        price: resolvedVariant?.price ?? item.price,
        variantId: resolvedVariant?.id || '',
        variantName: resolvedVariant?.name || '',
        variantPrice: resolvedVariant?.price ?? item.price,
        image: item.image,
        restaurant: restaurant.name,
        restaurantId: validRestaurantId,
        description: item.description,
        isVeg: item.isVeg === true,
        foodType: item.foodType,
      };
      const result = await addToCart(cartItem);
      if (result?.ok === false) {
        Toast.show({type: 'error', text1: result.error || 'Cannot add item from a different restaurant'});
        return;
      }
      if (newQuantity > 1) await updateQuantity(lineItemId, newQuantity);
    },
    [restaurant, isOffline, addToCart, removeFromCart, updateQuantity, getCartItem, navigation],
  );

  const menuCategories = useMemo(() => {
    if (!restaurant?.menuSections) return [];
    return restaurant.menuSections
      .filter(s => s.id !== 'recommended')
      .map((section, index) => {
        const count = section.items.length + section.subsections.reduce((sum, sub) => sum + sub.items.length, 0);
        if (count === 0) return null;
        return {id: slugify(section.categoryId || section.name || String(index)) || `section-${index}`, name: section.name, sectionIndex: index};
      })
      .filter(Boolean);
  }, [restaurant?.menuSections]);

  const filteredSections = useMemo(() => {
    if (!restaurant?.menuSections) return [];
    const filterItems = items =>
      items.filter(item => {
        if (item.isAvailable === false) return false;
        if (under250Only && getFoodDisplayPrice(item) > 250) return false;
        if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
        if (vegMode && !isVegMenuItem(item)) return false;
        if (!vegMode && vegNonVeg === 'veg' && !isVegMenuItem(item)) return false;
        if (!vegMode && vegNonVeg === 'non-veg' && isVegMenuItem(item)) return false;
        return true;
      });
    const sortItems = items => {
      if (!sortBy) return items;
      const sorted = [...items];
      sorted.sort((a, b) => (sortBy === 'low-to-high' ? getFoodDisplayPrice(a) - getFoodDisplayPrice(b) : getFoodDisplayPrice(b) - getFoodDisplayPrice(a)));
      return sorted;
    };

    return restaurant.menuSections
      .map((section, index) => ({
        section: {...section, items: sortItems(filterItems(section.items)), subsections: section.subsections.map(sub => ({...sub, items: sortItems(filterItems(sub.items))})).filter(sub => sub.items.length > 0)},
        originalIndex: index,
      }))
      .filter(({section}) => {
        if (selectedCategory !== 'all' && section.id !== 'recommended') {
          const sectionCatId = slugify(section.categoryId || section.name) || section.name;
          if (sectionCatId !== selectedCategory) return false;
        }
        return section.items.length > 0 || section.subsections.length > 0;
      });
  }, [restaurant?.menuSections, under250Only, searchQuery, vegMode, vegNonVeg, sortBy, selectedCategory]);

  const hasAppliedFilters = Boolean(under250Only || searchQuery.trim() || vegNonVeg || sortBy);

  const toggleSection = index => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleToggleFavoriteRestaurant = () => {
    if (!restaurant) return;
    if (isFavorite(restaurant.slug)) {
      removeFavorite(restaurant.slug);
    } else {
      addFavorite({slug: restaurant.slug, name: restaurant.name, cuisine: restaurant.cuisine, rating: restaurant.rating, deliveryTime: restaurant.deliveryTime, distance: restaurant.distance, image: restaurant.image});
    }
  };

  const handleShareRestaurant = () => {
    Share.share({message: `Check out ${restaurant?.name || 'this restaurant'} on Dima Hasao!`}).catch(() => {});
  };

  const handleCopyCoupon = code => {
    Clipboard.setString(code);
    Toast.show({type: 'success', text1: `Coupon ${code} copied!`});
  };

  const openItemDetail = item => {
    setSelectedItem(item);
    const variants = getFoodVariants(item);
    const inCart = variants.find(v => (quantities[getLineItemId(item, v)] || 0) > 0);
    setSelectedVariantId(inCart?.id || getDefaultFoodVariant(item)?.id || '');
  };

  const selectedVariant = selectedItem ? getFoodVariants(selectedItem).find(v => String(v.id) === String(selectedVariantId)) || getDefaultFoodVariant(selectedItem) : null;
  const selectedQuantity = selectedItem ? Math.max(1, getDishQuantity(selectedItem, selectedVariantId)) : 1;

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#0a4d2b" size="large" />
      </View>
    );
  }

  if (error && !restaurant) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <AlertCircle size={40} color="#ef4444" />
        <Text className="text-base font-bold text-gray-900 mt-3">Could not load this restaurant</Text>
        <Text className="text-sm text-gray-500 mt-1 text-center">{error}</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4 px-5 py-2.5 bg-[#0a4d2b] rounded-xl">
          <Text className="text-white font-semibold">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
        <Pressable onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full border border-gray-200 items-center justify-center">
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <View className="flex-row items-center gap-2">
          {showSearch ? (
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-full px-3 h-10 w-44">
              <Search size={16} color="#9ca3af" />
              <TextInput autoFocus value={searchQuery} onChangeText={setSearchQuery} placeholder="Search dishes..." placeholderTextColor="#9ca3af" className="flex-1 ml-2 text-sm text-gray-800" />
              <Pressable
                onPress={() => {
                  setSearchQuery('');
                  setShowSearch(false);
                }}>
                <X size={16} color="#9ca3af" />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowSearch(true)} className="flex-row items-center gap-2 h-10 px-4 rounded-full border border-gray-200">
              <Search size={16} color="#111827" />
              <Text className="text-sm font-medium text-gray-900">Search</Text>
            </Pressable>
          )}
          <Pressable onPress={handleToggleFavoriteRestaurant} className="w-10 h-10 rounded-full border border-gray-200 items-center justify-center">
            <Bookmark size={18} color={isFavorite(restaurant.slug) ? '#ef4444' : '#111827'} fill={isFavorite(restaurant.slug) ? '#ef4444' : 'none'} />
          </Pressable>
          <Pressable onPress={handleShareRestaurant} className="w-10 h-10 rounded-full border border-gray-200 items-center justify-center">
            <Share2 size={18} color="#111827" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 32}}>
        <View className="px-4">
          <View className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            <View className="h-1.5 w-full rounded-full bg-[#0a4d2b] -mt-4 mb-3" />
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 min-w-0">
                <Text className="text-2xl font-bold text-gray-900">{restaurant.name}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <Utensils size={14} color="#374151" />
                  <Text className="text-sm text-gray-700">{restaurant.cuisine}</Text>
                </View>
              </View>
              <View className="items-center">
                <View className="flex-row items-center gap-1 bg-[#257d3c] rounded-full px-2.5 py-1">
                  <Star size={12} color="#fff" fill="#fff" />
                  <Text className="text-xs font-bold text-white">{restaurant.rating > 0 ? restaurant.rating.toFixed(1) : 'NEW'}</Text>
                </View>
                <Text className="text-xs text-gray-500 mt-1">{restaurant.rating > 0 ? `${restaurant.reviews} ratings` : 'No ratings yet'}</Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between gap-3 mt-3">
              <View className="flex-row items-center gap-1 flex-1 min-w-0">
                <MapPin size={14} color="#374151" />
                <Text className="text-sm text-gray-700 flex-1" numberOfLines={1}>
                  {restaurant.distance ? `${restaurant.distance} | ` : ''}
                  {restaurant.location}
                </Text>
              </View>
              <View className={`rounded-xl px-2.5 py-1 ${isOffline ? 'bg-rose-600' : 'bg-[#257d3c]'}`}>
                <Text className="text-[10px] font-bold text-white text-center">{isOffline ? 'Offline' : 'Open now'}</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2 mt-3">
              <Clock size={14} color="#374151" />
              <Text className="text-sm text-gray-700">{restaurant.deliveryTime}</Text>
            </View>
          </View>

          {isOffline && (
            <View className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 mt-3">
              <Text className="text-sm text-rose-700">{restaurant.name} is currently offline. Orders are unavailable right now.</Text>
            </View>
          )}

          {coupons.length > 0 && (
            <Pressable onPress={() => setShowOffers(true)} className="flex-row items-center justify-between border border-gray-200 bg-white rounded-xl px-3.5 py-2.5 mt-3">
              <Text className="text-xs font-semibold text-gray-800 flex-1 mr-2" numberOfLines={1}>
                % {formatCouponText(coupons[0])}
              </Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-xs font-semibold text-gray-500">
                  {coupons.length} offer{coupons.length > 1 ? 's' : ''}
                </Text>
                <ChevronDown size={14} color="#6b7280" />
              </View>
            </Pressable>
          )}

          {restaurant.menuSections.length > 0 && (
            <View className="flex-row items-center gap-2 mt-4">
              <Pressable onPress={() => setShowSort(true)} className="flex-row items-center gap-1.5 border border-gray-300 rounded-full px-3 py-1.5">
                <SlidersHorizontal size={14} color="#111827" />
                <Text className="text-sm font-medium text-gray-900">Sort</Text>
                <ChevronDown size={12} color="#111827" />
              </Pressable>
              <Pressable
                onPress={() => setVegNonVeg(v => (v === 'veg' ? null : 'veg'))}
                className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${vegNonVeg === 'veg' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
                <View className="w-3 h-3 rounded-full bg-green-600" />
                <Text className={`text-sm font-medium ${vegNonVeg === 'veg' ? 'text-green-700' : 'text-gray-900'}`}>Veg</Text>
                {vegNonVeg === 'veg' && <X size={12} color="#6b7280" />}
              </Pressable>
              {!vegMode && (
                <Pressable
                  onPress={() => setVegNonVeg(v => (v === 'non-veg' ? null : 'non-veg'))}
                  className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${vegNonVeg === 'non-veg' ? 'border-red-600 bg-red-50' : 'border-gray-300'}`}>
                  <View className="w-3 h-3 rounded-full bg-red-600" />
                  <Text className={`text-sm font-medium ${vegNonVeg === 'non-veg' ? 'text-red-600' : 'text-gray-900'}`}>Non-veg</Text>
                  {vegNonVeg === 'non-veg' && <X size={12} color="#6b7280" />}
                </Pressable>
              )}
            </View>
          )}

          {menuCategories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{gap: 8}}>
              <Pressable onPress={() => setSelectedCategory('all')} className={`rounded-full border px-3 py-1.5 ${selectedCategory === 'all' ? 'border-[#0a4d2b] bg-[#0a4d2b15]' : 'border-gray-300'}`}>
                <Text className={`text-sm font-semibold ${selectedCategory === 'all' ? 'text-[#0a4d2b]' : 'text-gray-700'}`}>All</Text>
              </Pressable>
              {menuCategories.map(cat => (
                <Pressable key={cat.id} onPress={() => setSelectedCategory(cat.id)} className={`rounded-full border px-3 py-1.5 ${selectedCategory === cat.id ? 'border-[#0a4d2b] bg-[#0a4d2b15]' : 'border-gray-300'}`}>
                  <Text className={`text-sm font-semibold ${selectedCategory === cat.id ? 'text-[#0a4d2b]' : 'text-gray-700'}`}>{cat.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View className="px-4 mt-5">
          {loadingMenu && (
            <View className="py-10 items-center">
              <ActivityIndicator color="#0a4d2b" />
            </View>
          )}

          {!loadingMenu && filteredSections.length === 0 && (
            <View className="items-center py-14 px-4">
              <Utensils size={40} color="#9ca3af" />
              <Text className="text-lg font-bold text-gray-800 mt-3">{hasAppliedFilters ? 'No dishes match these filters' : 'Menu coming soon'}</Text>
              <Text className="text-sm text-gray-500 mt-1 text-center">{hasAppliedFilters ? 'Try clearing filters or search.' : `${restaurant.name} is still setting up their menu.`}</Text>
            </View>
          )}

          {filteredSections.map(({section, originalIndex}) => {
            const isExpanded = expandedSections.has(originalIndex);
            const allItems = [...section.items.map(item => ({item, key: item.id})), ...section.subsections.flatMap(sub => sub.items.map(item => ({item, key: item.id, subName: sub.name})))];

            return (
              <View key={section.id} className="mb-2">
                <Pressable onPress={() => toggleSection(originalIndex)} className="flex-row items-center justify-between py-2">
                  <Text className="text-lg font-bold text-gray-900">{section.name}</Text>
                  <ChevronDown size={18} color="#4b5563" style={{transform: [{rotate: isExpanded ? '0deg' : '-90deg'}]}} />
                </Pressable>

                {isExpanded && section.id === 'recommended' && section.items.length === 0 && <Text className="text-gray-500 text-sm py-4 text-center">No dish recommended</Text>}

                {isExpanded &&
                  allItems.map(({item, subName}) => {
                    const quantity = getDishQuantity(item);
                    return (
                      <Pressable key={item.id} onPress={() => openItemDetail(item)} className="flex-row gap-3 py-3.5 border-b border-gray-100">
                        <View className="flex-1 min-w-0">
                          <View className="flex-row items-center gap-2">
                            <View className={`w-4 h-4 border-2 rounded-sm items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                              <View className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                            </View>
                            <Text className="font-bold text-gray-800 text-base flex-1" numberOfLines={2}>
                              {item.name}
                            </Text>
                          </View>
                          {subName ? <Text className="text-[11px] text-gray-400 mt-0.5">{subName}</Text> : null}
                          <View className="flex-row items-center gap-3 mt-1">
                            {hasFoodVariants(item) && <Text className="text-xs text-gray-500">From</Text>}
                            <Text className="font-semibold text-gray-900">₹{Math.round(getFoodDisplayPrice(item))}</Text>
                          </View>
                          {item.description ? (
                            <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
                              {item.description}
                            </Text>
                          ) : null}
                          <View className="flex-row gap-4 mt-2.5">
                            <Pressable
                              onPress={e => {
                                e.stopPropagation?.();
                                const dishId = item.id;
                                const rid = restaurant.restaurantId || restaurant.mongoId || restaurant.id;
                                isDishFavorite(dishId, rid) ? removeDishFavorite(dishId, rid) : addDishFavorite({id: dishId, name: item.name, price: item.price, image: item.image, restaurantId: rid, restaurantName: restaurant.name, restaurantSlug: restaurant.slug, foodType: item.foodType});
                              }}
                              className="p-1.5 border border-gray-300 rounded-lg">
                              <Bookmark size={16} color={isDishFavorite(item.id, restaurant.restaurantId || restaurant.mongoId || restaurant.id) ? '#ef4444' : '#4b5563'} fill={isDishFavorite(item.id, restaurant.restaurantId || restaurant.mongoId || restaurant.id) ? '#ef4444' : 'none'} />
                            </Pressable>
                            <Pressable onPress={() => Share.share({message: `${item.name} at ${restaurant.name}`}).catch(() => {})} className="p-1.5 border border-gray-300 rounded-lg">
                              <Share2 size={16} color="#4b5563" />
                            </Pressable>
                          </View>
                        </View>

                        <View className="w-28 h-28 relative">
                          <Image source={{uri: item.image || FOOD_IMAGE_FALLBACK}} className="w-full h-full rounded-2xl" resizeMode="cover" />
                          {quantity > 0 ? (
                            <View className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white border border-[#0a4d2b] rounded-lg flex-row items-center px-3 py-1.5">
                              <Pressable
                                onPress={() => {
                                  const sole = getSoleActiveVariant(item);
                                  if (hasFoodVariants(item) && !sole) openItemDetail(item);
                                  else updateItemQuantity(item, Math.max(0, quantity - 1), sole);
                                }}>
                                <Minus size={14} color="#0a4d2b" />
                              </Pressable>
                              <Text className="text-sm font-bold text-[#0a4d2b] mx-2">{quantity}</Text>
                              <Pressable
                                onPress={() => {
                                  const sole = getSoleActiveVariant(item);
                                  if (hasFoodVariants(item) && !sole) openItemDetail(item);
                                  else updateItemQuantity(item, quantity + 1, sole);
                                }}>
                                <Plus size={14} color="#0a4d2b" />
                              </Pressable>
                            </View>
                          ) : (
                            <Pressable onPress={() => updateItemQuantity(item, 1, getDefaultFoodVariant(item))} className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white border border-[#0a4d2b] rounded-lg px-4 py-1.5 flex-row items-center gap-1">
                              <Text className="text-sm font-bold text-[#0a4d2b]">ADD</Text>
                              <Plus size={14} color="#0a4d2b" />
                            </Pressable>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={!!selectedItem} transparent animationType="fade" onRequestClose={() => setSelectedItem(null)}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center p-4" onPress={() => setSelectedItem(null)}>
          {selectedItem && (
            <Pressable onPress={e => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-[450px]" style={{maxHeight: '90%'}}>
              <View className="relative w-full h-56 rounded-t-3xl overflow-hidden bg-gray-100">
                <Image source={{uri: selectedItem.image || FOOD_IMAGE_FALLBACK}} className="w-full h-full" resizeMode="cover" />
                <Pressable onPress={() => setSelectedItem(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/80 items-center justify-center">
                  <X size={18} color="#fff" />
                </Pressable>
              </View>
              <ScrollView className="px-4 py-4" style={{maxHeight: 280}}>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className={`w-5 h-5 rounded border-2 items-center justify-center ${selectedItem.foodType === 'Veg' ? 'border-green-600' : 'border-red-600'}`}>
                    <View className={`w-2.5 h-2.5 rounded-full ${selectedItem.foodType === 'Veg' ? 'bg-green-600' : 'bg-red-600'}`} />
                  </View>
                  <Text className="text-xl font-bold text-gray-900 flex-1">{selectedItem.name}</Text>
                </View>
                {selectedItem.description ? <Text className="text-sm text-gray-600 mb-3">{selectedItem.description}</Text> : null}
                {hasFoodVariants(selectedItem) && (
                  <View className="mb-2">
                    <Text className="text-sm font-semibold text-gray-900 mb-2">Choose a variant</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {getFoodVariants(selectedItem).map(variant => (
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
              </ScrollView>
              <View className="border-t border-gray-200 px-3 py-4 flex-row items-center gap-3">
                <View className="flex-row items-center gap-3 border-2 border-gray-300 rounded-lg px-3 h-11">
                  <Pressable onPress={() => updateItemQuantity(selectedItem, selectedQuantity - 1, selectedVariant)} disabled={getDishQuantity(selectedItem, selectedVariantId) === 0}>
                    <Minus size={18} color={getDishQuantity(selectedItem, selectedVariantId) === 0 ? '#d1d5db' : '#4b5563'} />
                  </Pressable>
                  <Text className="text-lg font-semibold text-gray-900 min-w-[2rem] text-center">{selectedQuantity}</Text>
                  <Pressable onPress={() => updateItemQuantity(selectedItem, selectedQuantity + 1, selectedVariant)}>
                    <Plus size={18} color="#4b5563" />
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => {
                    updateItemQuantity(selectedItem, selectedQuantity, selectedVariant);
                    setSelectedItem(null);
                  }}
                  className="flex-1 h-11 rounded-lg bg-red-500 items-center justify-center flex-row gap-2">
                  <Text className="text-white font-semibold">{getDishQuantity(selectedItem, selectedVariantId) > 0 ? 'Update cart' : hasFoodVariants(selectedItem) ? 'Add' : 'Add item'}</Text>
                  <Text className="text-white font-bold">
                    {hasFoodVariants(selectedItem) ? `${selectedVariant?.name || 'Default'} · ₹${Math.round(selectedVariant?.price || selectedItem.price)}` : `₹${Math.round(selectedItem.price)}`}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          )}
        </Pressable>
      </Modal>

      <Modal visible={showOffers} transparent animationType="slide" onRequestClose={() => setShowOffers(false)}>
        <Pressable className="flex-1 bg-black/60 justify-end" onPress={() => setShowOffers(false)}>
          <Pressable onPress={e => e.stopPropagation()} className="bg-white rounded-t-3xl" style={{maxHeight: '75%'}}>
            <View className="px-5 pt-5 pb-3 border-b border-gray-100 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900 flex-1">Offers at {restaurant?.name}</Text>
              <Pressable onPress={() => setShowOffers(false)}>
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView className="px-5 py-4">
              {coupons.map((coupon, idx) => (
                <View key={coupon.couponCode || idx} className="border border-gray-100 rounded-2xl p-4 mb-3">
                  <Text className="text-base font-bold text-gray-950">{formatCouponText(coupon)}</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Use code <Text className="font-semibold text-gray-700">{coupon.couponCode}</Text>
                  </Text>
                  <Pressable onPress={() => handleCopyCoupon(coupon.couponCode)} className="flex-row items-center gap-2 self-start mt-3 px-3 py-1.5 border border-dashed border-blue-200 bg-blue-50 rounded-lg">
                    <Text className="text-xs font-bold text-blue-600">{coupon.couponCode}</Text>
                    <Copy size={12} color="#2563eb" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showSort} transparent animationType="fade" onRequestClose={() => setShowSort(false)}>
        <Pressable className="flex-1 bg-black/40 items-center justify-center p-6" onPress={() => setShowSort(false)}>
          <Pressable onPress={e => e.stopPropagation()} className="bg-white rounded-2xl p-4 w-full max-w-xs">
            <Text className="text-base font-bold text-gray-900 mb-3">Sort by price</Text>
            {[
              {value: null, label: 'Default'},
              {value: 'low-to-high', label: 'Price: Low to High'},
              {value: 'high-to-low', label: 'Price: High to Low'},
            ].map(opt => (
              <Pressable
                key={opt.label}
                onPress={() => {
                  setSortBy(opt.value);
                  setShowSort(false);
                }}
                className="flex-row items-center gap-2.5 p-2">
                <View className={`w-4 h-4 rounded-full border-2 items-center justify-center ${sortBy === opt.value ? 'border-green-600 bg-green-600' : 'border-gray-300'}`}>
                  {sortBy === opt.value && <View className="w-1.5 h-1.5 rounded-full bg-white" />}
                </View>
                <Text className="text-sm font-medium text-gray-900">{opt.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
