/**
 * Shared implementation behind FoodHomeDeliveryScreen (mode="delivery") and
 * FoodHomeTakeawayScreen (mode="takeaway") — ported from
 * Frontend/src/modules/Food/pages/user/Home.jsx (4676 lines) and its
 * HomeHeader.jsx. Dropped, all documented in the Food 9b task notes:
 *  - every CSS-keyframe/framer-motion decoration (background blobs, the
 *    rotating veg/non-veg "FLAVOUR FEST" food-image banner, card hover
 *    tilts, scroll-synced sticky header) — no RN equivalent, purely visual.
 *  - PromoRow/FestBanner/QuickSection — confirmed dead or inert on web
 *    itself (see Food 9b notes).
 *  - RestaurantImageCarousel -> a single static image (still real data).
 *  - RestaurantCardOfferCarousel's 3s auto-rotation -> shows the first
 *    matching coupon statically (same `formatCouponText` logic).
 *  - OrderTrackingCard (an in-progress-order banner) -> deferred to Food 9d
 *    alongside the rest of order tracking.
 *  - the admin-configurable Explore-More icons/hero-banner network calls
 *    -> the same 4 fallback destinations the web uses when that admin data
 *    is absent (Under250/Offers/Gourmet/Collections), rendered with lucide
 *    icons instead of remote admin artwork.
 * Everything else — location, zone, veg-mode toggle + its two confirmation
 * modals, categories, restaurant fetch/transform/sort/filter, availability
 * badges, favorites, pagination, takeaway's inline search — is ported.
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, Image, Modal, Pressable, RefreshControl, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
  AlertCircle,
  Bell,
  Bookmark,
  ChevronDown,
  Clock,
  Gift,
  Layers,
  MapPin,
  Mic,
  Search,
  ShoppingCart,
  Star,
  Tag,
  UtensilsCrossed,
  Wallet,
  X,
  Zap,
} from 'lucide-react-native';
import {useFoodLocation} from '../../hooks/useFoodLocation';
import {useFoodZone} from '../../hooks/useFoodZone';
import {useFoodProfile} from '../../context/FoodProfileContext';
import restaurantApi from '../../services/food/restaurantApi';
import publicApi from '../../services/food/publicApi';
import {getRestaurantAvailabilityStatus} from '../../utils/restaurantAvailability';
import {sortRestaurantsByAvailabilityAndDistance} from '../../utils/restaurantBrowseSort';
import {filterRestaurantsForVegMode, filterCategoriesForVegMode} from '../../utils/vegMode';
import {isModuleAuthenticated} from '../../utils/moduleAuth';
import {normalizeImageUrl} from '../../utils/imageUrl';
import {slugify} from '../../utils/foodCommon';
import StickyCartBar from '../../components/food/StickyCartBar';

const BATCH_SIZE = 9;

const EXPLORE_ITEMS = [
  {id: 'under-250', label: 'Under ₹250', Icon: Tag, screen: 'Under250', isTab: true},
  {id: 'offers', label: 'Offers', Icon: Gift, screen: 'FoodOffers'},
  {id: 'gourmet', label: 'Gourmet', Icon: UtensilsCrossed, screen: 'FoodGourmet'},
  {id: 'collection', label: 'Collections', Icon: Layers, screen: 'FoodFavorites'},
];

const getRestaurantDisplayName = restaurant => {
  const candidates = [restaurant?.name, restaurant?.restaurantName, restaurant?.onboarding?.step1?.restaurantName];
  const resolved = candidates.find(c => typeof c === 'string' && c.trim().length > 0);
  return resolved ? resolved.trim() : 'Restaurant';
};

const formatCouponText = coupon => {
  if (!coupon) return '';
  const minOrderValue = Number(coupon.minOrderValue);
  const minOrderText = Number.isFinite(minOrderValue) && minOrderValue > 0 ? ` above ₹${minOrderValue}` : '';
  if (coupon.discountType === 'percentage') {
    const discountPercentage = coupon.discountPercentage ?? coupon.discountValue;
    const limitText = coupon.maxDiscount ? ` up to ₹${coupon.maxDiscount}` : '';
    return `${discountPercentage}% OFF${minOrderText}${limitText}`;
  }
  const value = coupon.originalPrice || coupon.discountValue || 0;
  return `Flat ₹${value} OFF${minOrderText}`;
};

const formatRatingsCount = count => {
  if (count === 1) return '1 rating';
  if (count < 100) return `${count} ratings`;
  if (count < 1000) return `${Math.floor(count / 100) * 100}+ ratings`;
  return `${(count / 1000).toFixed(1)}K+ ratings`;
};

const locationPrimaryText = location => {
  if (!location) return 'Select Location';
  const area = location.area || location.subLocality || location.mainTitle || location.neighborhood;
  const city = (location.city || '').toLowerCase();
  const state = (location.state || '').toLowerCase();
  if (area && !/^-?\d+(\.\d+)?$/.test(String(area).trim())) {
    const areaLower = String(area).toLowerCase();
    if (areaLower !== city && areaLower !== state) return area;
  }
  if (location.address && location.address !== 'Select location') {
    const parts = location.address.split(',').map(p => p.trim());
    for (const part of parts) {
      const partLower = part.toLowerCase();
      if (partLower && partLower !== city && partLower !== state && !/^-?\d/.test(part) && part.length > 2) return part;
    }
  }
  return location.area || location.city || 'Select Location';
};

const locationSecondaryText = location => {
  const state = location?.state || '';
  const pincode = location?.pincode || '';
  if (state && pincode) return `${state}, ${pincode}`;
  if (state) return state;
  if (pincode) return pincode;
  const addr = location?.address || '';
  if (addr && addr.length > 10) return addr.split(',').slice(1, 3).join(',').trim() || 'Pinpoint location';
  return 'Pinpoint location';
};

export default function FoodHomeScreen({mode = 'delivery'}) {
  const navigation = useNavigation();
  const isTakeaway = mode === 'takeaway';

  const {vegMode, vegModeOption, setVegMode, setVegModeOption, addFavorite, removeFavorite, isFavorite} = useFoodProfile();
  const {location} = useFoodLocation();
  const {zoneId, isOutOfService, loading: zoneLoading} = useFoodZone(location);

  const [categories, setCategories] = useState([]);
  const [publicOffers, setPublicOffers] = useState([]);
  const [restaurantsData, setRestaurantsData] = useState([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [refreshing, setRefreshing] = useState(false);

  const [vegModalStage, setVegModalStage] = useState(null); // null | 'turn-on' | 'turn-off'
  const [vegOptionDraft, setVegOptionDraft] = useState(vegModeOption);

  const [takeawaySearchOpen, setTakeawaySearchOpen] = useState(false);
  const [takeawaySearch, setTakeawaySearch] = useState('');

  useEffect(() => {
    restaurantApi
      .getPublicOffers()
      .then(res => {
        const list = res?.data?.data?.allOffers || res?.data?.allOffers || [];
        setPublicOffers(list.filter(o => o?.showInCart !== false && (!o?.status || o.status === 'active')));
      })
      .catch(() => setPublicOffers([]));
  }, []);

  useEffect(() => {
    if (zoneLoading) return;
    let cancelled = false;
    publicApi
      .getPublicCategories(zoneId ? {zoneId} : {})
      .then(res => {
        if (cancelled) return;
        const list = res?.data?.data?.categories || res?.data?.categories || [];
        setCategories(
          (Array.isArray(list) ? list : []).map((cat, idx) => ({
            id: String(cat?.id || cat?._id || cat?.slug || idx),
            name: cat?.name || '',
            slug: cat?.slug || slugify(cat?.name || ''),
            image: normalizeImageUrl(cat?.image || cat?.imageUrl),
            foodTypeScope: cat?.foodTypeScope || cat?.type || '',
          })),
        );
      })
      .catch(() => cancelled || setCategories([]));
    return () => {
      cancelled = true;
    };
  }, [zoneId, zoneLoading]);

  const fetchRestaurants = useCallback(async () => {
    if (!zoneId) {
      setRestaurantsData([]);
      setLoadingRestaurants(false);
      return;
    }
    setLoadingRestaurants(true);
    try {
      const params = {limit: 40, zoneId, orderType: mode};
      if (Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)) {
        params.lat = Number(location.latitude);
        params.lng = Number(location.longitude);
      }
      const response = await restaurantApi.getRestaurants(params);
      const list = response?.data?.data?.restaurants || [];
      const transformed = list
        .filter(r => (isTakeaway ? r.takeawaySettings?.isEnabled || r.takeawayAvailable : true))
        .map(r => {
          const image = normalizeImageUrl(r.profileImage || r.image || r.imageUrl || (Array.isArray(r.coverImages) ? r.coverImages[0] : r.coverImage) || '');
          return {
            id: r.restaurantId || r._id,
            mongoId: r._id || null,
            restaurantId: r.restaurantId,
            name: getRestaurantDisplayName(r),
            slug: r.slug || slugify(getRestaurantDisplayName(r)),
            rating: Number(r.rating) || 0,
            totalRatings: Number(r.totalRatings) || 0,
            deliveryTime: isTakeaway ? r.preparationTime || '20-25 mins' : r.deliveryTime || r.estimatedDeliveryTime || (r.estimatedDeliveryTimeMinutes ? `${r.estimatedDeliveryTimeMinutes} mins` : '25-30 mins'),
            distance: r.distance || null,
            distanceInKm: Number.isFinite(Number(r.distanceInKm)) ? Number(r.distanceInKm) : null,
            topOrder: Number.isFinite(Number(r.__topOrder ?? r.topOrder)) ? Number(r.__topOrder ?? r.topOrder) : 1000000,
            image,
            isActive: r.isActive !== false,
            isAcceptingOrders: r.isAcceptingOrders !== false,
            openDays: Array.isArray(r.openDays) ? r.openDays : [],
            deliveryTimings: r.deliveryTimings || null,
            outletTimings: r.outletTimings || null,
            openingTime: r.openingTime || r?.deliveryTimings?.openingTime || null,
            closingTime: r.closingTime || r?.deliveryTimings?.closingTime || null,
            pureVegRestaurant: r.pureVegRestaurant === true,
            hasNonVegMenu: r.hasNonVegMenu,
            isPureVeg: r.isPureVeg,
            hasDishes: r.hasDishes === true || r.totalMenuItems > 0,
          };
        });
      setRestaurantsData(transformed);
    } catch {
      setRestaurantsData([]);
    } finally {
      setLoadingRestaurants(false);
    }
  }, [zoneId, location?.latitude, location?.longitude, mode, isTakeaway]);

  useEffect(() => {
    if (zoneLoading) return;
    const timer = setTimeout(fetchRestaurants, 50);
    return () => clearTimeout(timer);
  }, [fetchRestaurants, zoneLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRestaurants();
    setRefreshing(false);
  }, [fetchRestaurants]);

  const processedRestaurants = useMemo(() => {
    const vegFiltered = filterRestaurantsForVegMode(restaurantsData, {vegMode, vegModeOption});
    const searched =
      isTakeaway && takeawaySearch.trim()
        ? vegFiltered.filter(r => r.name.toLowerCase().includes(takeawaySearch.trim().toLowerCase()))
        : vegFiltered;
    return sortRestaurantsByAvailabilityAndDistance(searched);
  }, [restaurantsData, vegMode, vegModeOption, isTakeaway, takeawaySearch]);

  const displayCategories = useMemo(() => filterCategoriesForVegMode(categories, vegMode), [categories, vegMode]);

  const visibleRestaurants = processedRestaurants.slice(0, visibleCount);
  const hasMore = visibleCount < processedRestaurants.length;

  const requireAuth = useCallback(
    async screenName => {
      const authed = await isModuleAuthenticated('user');
      if (authed) navigation.navigate(screenName);
      else navigation.navigate('Login');
    },
    [navigation],
  );

  const handleVegToggle = next => {
    if (next && !vegMode) {
      setVegOptionDraft(vegModeOption);
      setVegModalStage('turn-on');
    } else if (!next && vegMode) {
      setVegModalStage('turn-off');
    } else {
      setVegMode(next);
    }
  };

  const couponsForRestaurant = useCallback(
    restaurant => {
      if (restaurant.hasDishes === false) return [];
      return publicOffers.filter(o => {
        if (String(o?.restaurantScope) === 'selected') {
          const couponRestId = String(o.restaurantId || '').trim();
          if (couponRestId !== String(restaurant.restaurantId || '').trim() && couponRestId !== String(restaurant.id || '').trim() && couponRestId !== String(restaurant.mongoId || '').trim()) {
            return false;
          }
        }
        const cType = String(o.couponType || 'all').trim().toLowerCase();
        return isTakeaway ? cType === 'takeaway' || cType === 'all' : cType === 'delivery' || cType === 'all';
      });
    },
    [publicOffers, isTakeaway],
  );

  const renderHeader = () => (
    <View>
      <View className="bg-[#0a4d2b] rounded-b-[2rem] pb-4 pt-2">
        <View className="flex-row items-start justify-between px-4 pt-3">
          <Pressable onPress={() => requireAuth('FoodAddressSelector')} className="flex-row items-start gap-2 flex-1 mr-3">
            <View className="bg-white/10 p-1.5 rounded-xl mt-0.5">
              <MapPin size={16} color="#fff" />
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-1">
                <Text className="text-[15px] font-black text-white" numberOfLines={1}>
                  {locationPrimaryText(location)}
                </Text>
                <ChevronDown size={12} color="rgba(255,255,255,0.7)" />
              </View>
              <Text className="text-[10px] font-medium text-white/80 mt-0.5" numberOfLines={1}>
                {locationSecondaryText(location)}
              </Text>
            </View>
          </Pressable>

          <View className="flex-row items-center gap-4">
            <Pressable onPress={() => requireAuth('FoodNotifications')}>
              <Bell size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={() => requireAuth('FoodWallet')}>
              <Wallet size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Profile')} className="w-9 h-9 rounded-full border-[1.5px] border-white items-center justify-center overflow-hidden bg-[#FFF5E6]">
              <Text className="text-[#0a4d2b] font-black text-base">U</Text>
            </Pressable>
          </View>
        </View>

        {isTakeaway ? (
          <View className="px-4 pt-3">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Self-Pickup</Text>
                <Text className="text-xl font-bold text-white">Takeaway</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Pressable onPress={() => setTakeawaySearchOpen(v => !v)} className={`p-2.5 rounded-full ${takeawaySearchOpen ? 'bg-white' : 'bg-white/20'}`}>
                  <Search size={18} color={takeawaySearchOpen ? '#0a4d2b' : '#fff'} />
                </Pressable>
                <Pressable onPress={() => navigation.navigate('FoodCart')} className="p-2.5 bg-white/20 rounded-full">
                  <ShoppingCart size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
            {takeawaySearchOpen && (
              <View className="flex-row items-center bg-white rounded-xl px-3 py-2 mt-3">
                <Search size={16} color="#0a4d2b" />
                <TextInput
                  autoFocus
                  value={takeawaySearch}
                  onChangeText={setTakeawaySearch}
                  placeholder="Search takeaway restaurants..."
                  placeholderTextColor="#9ca3af"
                  className="flex-1 ml-2 text-[13px] font-semibold text-gray-700"
                />
                {takeawaySearch ? (
                  <Pressable onPress={() => setTakeawaySearch('')}>
                    <X size={16} color="#94a3b8" />
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        ) : (
          <View className="px-4 pt-3 flex-row items-center gap-3">
            <Pressable onPress={() => navigation.navigate('FoodSearch', {mode})} className="flex-1 flex-row items-center bg-white rounded-2xl px-4 py-3">
              <Search size={18} color="#0a4d2b" />
              <Text className="flex-1 ml-2 text-[14px] font-bold text-gray-400">Search for restaurants, cuisines...</Text>
              <Mic size={18} color="#9ca3af" />
            </Pressable>
            <View className="items-center gap-1">
              <Text className="text-[9px] font-black text-white uppercase tracking-widest">Veg Mode</Text>
              <Pressable
                onPress={() => handleVegToggle(!vegMode)}
                className={`w-11 h-5 rounded-full justify-center ${vegMode ? 'bg-[#48c479]' : 'bg-gray-400/60'}`}>
                <View className={`w-4 h-4 bg-white rounded-full ${vegMode ? 'ml-6' : 'ml-0.5'}`} />
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {!isTakeaway && (
        <>
          <View className="px-4 py-3">
            {displayCategories.length > 0 && (
              <FlatList
                data={displayCategories.slice(0, 12)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id}
                renderItem={({item}) => (
                  <Pressable onPress={() => navigation.navigate('FoodCategoryPage', {category: item})} className="items-center mr-4 w-16">
                    <View className="w-16 h-16 rounded-full overflow-hidden border border-gray-100 bg-gray-50">
                      {item.image ? <Image source={{uri: item.image}} className="w-full h-full" resizeMode="cover" /> : null}
                    </View>
                    <Text className="text-[11px] text-gray-700 mt-1 text-center" numberOfLines={1}>
                      {item.name}
                    </Text>
                  </Pressable>
                )}
                ListFooterComponent={
                  <Pressable onPress={() => navigation.navigate('FoodCategories')} className="items-center w-16">
                    <View className="w-16 h-16 rounded-full bg-orange-50 items-center justify-center border border-orange-100">
                      <UtensilsCrossed size={22} color="#0a4d2b" />
                    </View>
                    <Text className="text-[11px] text-gray-700 mt-1">See All</Text>
                  </Pressable>
                }
              />
            )}
          </View>

          <View className="flex-row justify-between px-4 pb-4">
            {EXPLORE_ITEMS.map(item => (
              <Pressable
                key={item.id}
                onPress={() => navigation.navigate(item.screen)}
                className="items-center flex-1 mx-1">
                <View className="w-14 h-14 rounded-2xl bg-white border border-gray-100 items-center justify-center shadow-sm">
                  <item.Icon size={22} color="#0a4d2b" />
                </View>
                <Text className="text-[10px] text-gray-600 mt-1 text-center" numberOfLines={1}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {isOutOfService && (
        <View className="mx-4 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex-row items-center gap-2">
          <AlertCircle size={16} color="#b45309" />
          <Text className="text-xs text-amber-800 flex-1">We don't deliver to this location yet. Showing nearby options may be limited.</Text>
        </View>
      )}

      {loadingRestaurants && (
        <View className="py-10 items-center">
          <ActivityIndicator color="#0a4d2b" />
        </View>
      )}

      {isTakeaway && !loadingRestaurants && takeawaySearch.trim() && visibleRestaurants.length === 0 && (
        <View className="items-center py-14 px-6">
          <Search size={28} color="#cbd5e1" />
          <Text className="text-base font-bold text-gray-800 mt-3">No takeaway restaurants found for "{takeawaySearch}"</Text>
          <Text className="text-sm text-gray-500 mt-1.5 text-center">Search by restaurant name only</Text>
        </View>
      )}
    </View>
  );

  const renderRestaurant = ({item: restaurant}) => {
    const availability = getRestaurantAvailabilityStatus(restaurant, new Date());
    const favorite = isFavorite(restaurant.slug);
    const coupons = couponsForRestaurant(restaurant);
    const couponText = coupons.length > 0 ? formatCouponText(coupons[0]) : null;

    return (
      <Pressable
        onPress={() => navigation.navigate('FoodRestaurantDetails', {restaurantId: restaurant.id, restaurant})}
        className={`mx-4 mb-4 bg-white rounded-3xl border border-gray-200 overflow-hidden ${isOutOfService || !availability.isOpen ? 'opacity-60' : ''}`}
        style={{elevation: 2}}>
        <View className="relative">
          <Image source={{uri: restaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop'}} className="w-full h-40" resizeMode="cover" />
          <Pressable
            onPress={() => (favorite ? removeFavorite(restaurant.slug) : addFavorite({slug: restaurant.slug, name: restaurant.name, rating: restaurant.rating, image: restaurant.image}))}
            className={`absolute top-3 right-3 w-10 h-10 rounded-2xl items-center justify-center ${favorite ? 'bg-red-500' : 'bg-white/90'}`}>
            <Bookmark size={18} color={favorite ? '#fff' : '#1f2937'} fill={favorite ? '#fff' : 'none'} />
          </Pressable>
        </View>

        <View className="p-4">
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1 min-w-0">
              <Text className="text-lg font-bold text-[#1c1c1c]" numberOfLines={1}>
                {restaurant.name}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-1.5">
                <Zap size={14} color="#257d3c" />
                <Text className="text-sm font-semibold text-[#257d3c]">{restaurant.deliveryTime}</Text>
                {restaurant.distance ? (
                  <>
                    <Text className="text-[#257d3c] font-bold">|</Text>
                    <Text className="text-sm font-semibold text-[#257d3c]">{restaurant.distance}</Text>
                  </>
                ) : null}
              </View>
              {couponText ? <Text className="text-xs font-bold text-slate-700 mt-1.5">% {couponText}</Text> : null}
            </View>
            <View className="items-end">
              <View className="flex-row items-center gap-1 bg-[#257d3c] px-2 py-1 rounded-lg">
                <Star size={13} color="#fff" fill="#fff" />
                <Text className="text-sm font-bold text-white">{restaurant.rating > 0 ? restaurant.rating.toFixed(1) : 'NEW'}</Text>
              </View>
              {restaurant.rating > 0 && <Text className="text-[10px] text-gray-500 mt-0.5">{formatRatingsCount(restaurant.totalRatings)}</Text>}
            </View>
          </View>

          {!availability.isOpen && (
            <View className={`flex-row items-center gap-1.5 self-start px-2 py-1 rounded-md mt-2 ${availability.reason === 'inactive' || availability.reason === 'not-accepting-orders' ? 'bg-red-50' : 'bg-gray-100'}`}>
              {availability.reason === 'inactive' || availability.reason === 'not-accepting-orders' ? (
                <>
                  <AlertCircle size={12} color="#ef4444" />
                  <Text className="text-[10px] font-bold uppercase text-red-600">Offline</Text>
                </>
              ) : availability.openingTime ? (
                <>
                  <Clock size={12} color="#6b7280" />
                  <Text className="text-[10px] font-bold uppercase text-gray-600">Opens at {availability.openingTime}</Text>
                </>
              ) : (
                <>
                  <AlertCircle size={12} color="#6b7280" />
                  <Text className="text-[10px] font-bold uppercase text-gray-600">Closed</Text>
                </>
              )}
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={visibleRestaurants}
        keyExtractor={item => String(item.id || item.mongoId || item.slug)}
        renderItem={renderRestaurant}
        ListHeaderComponent={renderHeader}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasMore) setVisibleCount(c => c + BATCH_SIZE);
        }}
        ListFooterComponent={hasMore ? <ActivityIndicator className="py-4" color="#0a4d2b" /> : <View className="h-24" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0a4d2b']} />}
      />

      <StickyCartBar />

      <Modal visible={vegModalStage === 'turn-on'} transparent animationType="fade" onRequestClose={() => setVegModalStage(null)}>
        <Pressable
          className="flex-1 bg-black/30 items-center justify-center p-6"
          onPress={() => setVegModalStage(null)}>
          <Pressable onPress={e => e.stopPropagation()} className="bg-white rounded-2xl p-4 w-full max-w-xs">
            <Text className="text-base font-bold text-gray-900 mb-3">See veg dishes from</Text>
            {[
              {value: 'all', label: 'All restaurants'},
              {value: 'pure-veg', label: 'Pure Veg restaurants only'},
            ].map(opt => (
              <Pressable key={opt.value} onPress={() => setVegOptionDraft(opt.value)} className="flex-row items-center gap-2.5 p-1.5">
                <View className={`w-4 h-4 rounded-full border-2 items-center justify-center ${vegOptionDraft === opt.value ? 'border-green-600 bg-green-600' : 'border-gray-300'}`}>
                  {vegOptionDraft === opt.value && <View className="w-1.5 h-1.5 rounded-full bg-white" />}
                </View>
                <Text className="text-sm font-medium text-gray-900">{opt.label}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setVegModeOption(vegOptionDraft);
                setVegMode(true);
                setVegModalStage(null);
              }}
              className="bg-[#0a4d2b] py-2.5 rounded-xl items-center mt-3">
              <Text className="text-white font-semibold text-sm">Apply</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={vegModalStage === 'turn-off'} transparent animationType="fade" onRequestClose={() => setVegModalStage(null)}>
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-2xl w-full max-w-sm p-6">
            <View className="items-center mb-4">
              <View className="w-20 h-20 rounded-full bg-pink-100 items-center justify-center">
                <AlertCircle size={40} color="#fff" style={{backgroundColor: 'rgba(239,68,68,0.9)', borderRadius: 40, padding: 8}} />
              </View>
            </View>
            <Text className="text-2xl font-bold text-gray-900 text-center mb-2">Switch off Veg Mode?</Text>
            <Text className="text-gray-600 text-center mb-6 text-sm">You'll see all restaurants, including those serving non-veg dishes</Text>
            <Pressable
              onPress={() => {
                setVegMode(false);
                setVegModalStage(null);
              }}
              className="py-2 items-center">
              <Text className="text-red-600 text-base">Switch off</Text>
            </Pressable>
            <Pressable onPress={() => setVegModalStage(null)} className="py-2 items-center">
              <Text className="text-gray-900 text-base">Keep using this mode</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
