/**
 * Ported from Frontend/src/modules/Food/pages/user/dining/DiningRestaurantDetails.jsx
 * (743 lines). The web file spends most of its length on multi-strategy
 * slug resolution (dining API → restaurant-by-id → slug → name search) —
 * dropped the same way as every other restaurant-details screen in this
 * app, since RN navigation always carries a real restaurantId. Ported:
 * the hero (image, name, address, cost-for-two, cuisines, open/closed +
 * hours, rating), the Menu/Photos/About tab sections, the guest-count
 * booking sheet with live occupied-seats math, favorite toggle, share.
 * Dropped: the "Featured In" card — on web it's hardcoded static text
 * ("Pan-Asian Restaurants") with no real data behind it, not a feature.
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, Modal, Pressable, ScrollView, Share, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, Bookmark, CheckCircle2, IndianRupee, MapPin, Share2, Ticket, X} from 'lucide-react-native';
import restaurantApi from '../../services/food/restaurantApi';
import diningApi from '../../services/food/diningApi';
import {useFoodProfile} from '../../context/FoodProfileContext';
import {normalizeDiningRestaurant} from '../../utils/diningTransform';
import {isModuleAuthenticated} from '../../utils/moduleAuth';
import {getMenuFromResponse} from '../../utils/menuItems';
import {isVegMenuItem} from '../../utils/vegMode';
import {normalizeImageUrl} from '../../utils/imageUrl';
import Toast from 'react-native-toast-message';

const buildImageList = restaurant => {
  const candidates = [
    restaurant?.coverImage?.url,
    restaurant?.coverImage,
    ...(Array.isArray(restaurant?.coverImages) ? restaurant.coverImages.map(i => i?.url || i) : []),
    ...(Array.isArray(restaurant?.menuImages) ? restaurant.menuImages.map(i => i?.url || i) : []),
    restaurant?.profileImage?.url,
    restaurant?.profileImage,
  ];
  return candidates
    .map(v => normalizeImageUrl(typeof v === 'string' ? v : ''))
    .filter(Boolean)
    .filter((v, i, list) => list.indexOf(v) === i);
};

const buildFacilities = restaurant => {
  const facilities = [];
  if (restaurant?.diningSettings?.tableBookingEnabled !== false) facilities.push('Dinner');
  if (restaurant?.isAcceptingOrders !== false) facilities.push('Lunch');
  if (restaurant?.diningSettings?.homeDeliveryAvailable) facilities.push('Home delivery');
  if (restaurant?.diningSettings?.takeawayAvailable) facilities.push('Takeaway available');
  if (restaurant?.diningSettings?.vegOnly) facilities.push('Vegetarian only');
  return facilities.length > 0 ? facilities : ['Dinner', 'Lunch', 'Home delivery', 'Takeaway available'];
};

const buildFeaturedSections = (menuSections, vegMode) =>
  menuSections
    .map((section, index) => {
      const items = [...(section?.items || []), ...((section?.subsections || []).flatMap(s => s?.items || []))];
      const visible = vegMode ? items.filter(isVegMenuItem) : items;
      if (vegMode && visible.length === 0) return null;
      return {id: `${section?.name || 'section'}-${index}`, title: section?.name || 'Menu', pages: visible.length || 1};
    })
    .filter(Boolean)
    .slice(0, 2);

const formatTimeLabel = value => {
  if (!value) return null;
  if (/[ap]m/i.test(value)) return value.toUpperCase();
  const date = new Date(`2000-01-01T${String(value).padStart(5, '0')}`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-IN', {hour: 'numeric', minute: '2-digit', hour12: true});
};

const parseTimeMinutes = value => {
  if (!value) return null;
  const raw = String(value).trim();
  const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) return Number(hhmm[1]) * 60 + Number(hhmm[2]);
  const ampm = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!ampm) return null;
  let h = Number(ampm[1]);
  const m = Number(ampm[2] || 0);
  if (ampm[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (ampm[3].toUpperCase() === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

export default function FoodDiningRestaurantDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};
  const restaurantId = params.restaurantId || params.restaurant?.id || params.restaurant?._id;

  const {addFavorite, removeFavorite, isFavorite, vegMode} = useFoodProfile();

  const [restaurant, setRestaurant] = useState(() => (params.restaurant ? normalizeDiningRestaurant(params.restaurant) : null));
  const [menuSections, setMenuSections] = useState([]);
  const [outletTimings, setOutletTimings] = useState({});
  const [loading, setLoading] = useState(!params.restaurant);
  const [error, setError] = useState(null);
  const [currentBookings, setCurrentBookings] = useState([]);
  const [selectedGuests, setSelectedGuests] = useState(2);
  const [showBookingSheet, setShowBookingSheet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(!params.restaurant);
        setError(null);
        const response = await restaurantApi.getRestaurantById(restaurantId);
        const apiRestaurant = response?.data?.data;
        if (!apiRestaurant) throw new Error('Restaurant not found');
        if (cancelled) return;
        setRestaurant(normalizeDiningRestaurant(apiRestaurant));

        const authed = await isModuleAuthenticated('user');
        if (authed) {
          diningApi
            .getRestaurantBookings(apiRestaurant)
            .then(res => !cancelled && setCurrentBookings(res?.data?.success && Array.isArray(res.data.data) ? res.data.data : []))
            .catch(() => {});
        }

        restaurantApi
          .getOutletTimingsByRestaurantId(restaurantId)
          .then(res => !cancelled && setOutletTimings(res?.data?.data?.outletTimings || {}))
          .catch(() => {});

        restaurantApi
          .getMenuByRestaurantId(restaurantId)
          .then(res => {
            const menu = getMenuFromResponse(res);
            if (!cancelled) setMenuSections(Array.isArray(menu?.sections) ? menu.sections : []);
          })
          .catch(() => {});
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load restaurant');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, params.restaurant]);

  const occupiedSeats = useMemo(() => {
    const now = Date.now();
    const THIRTY_MIN = 30 * 60 * 1000;
    return currentBookings
      .filter(b => {
        if (b.status === 'approved') return true;
        if (b.status === 'pending') return now - new Date(b.createdAt || b.date).getTime() < THIRTY_MIN;
        return false;
      })
      .reduce((sum, b) => sum + (Number(b.guests) || 0), 0);
  }, [currentBookings]);

  const maxCapacity = restaurant?.diningSettings?.maxGuests || 6;
  const remainingSeats = Math.max(0, maxCapacity - occupiedSeats);

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator color="#0a4d2b" size="large" />
      </View>
    );
  }
  if (error || !restaurant) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-6">
        <Text className="text-lg font-bold text-gray-900">Restaurant not found</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4 px-5 py-2.5 bg-[#0a4d2b] rounded-xl">
          <Text className="text-white font-semibold">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const imageGallery = buildImageList(restaurant);
  const heroImage = imageGallery[0] || restaurant.image;
  const featuredSections = buildFeaturedSections(menuSections, vegMode);
  const facilities = buildFacilities(restaurant);
  const todayName = new Date().toLocaleDateString('en-US', {weekday: 'long'});
  const todayTiming = outletTimings?.[todayName] || null;
  const rawOpening = todayTiming?.openingTime || restaurant?.openingTime || restaurant?.diningSettings?.openingTime || '12:00';
  const rawClosing = todayTiming?.closingTime || restaurant?.closingTime || restaurant?.diningSettings?.closingTime || '23:59';
  const openingTime = formatTimeLabel(rawOpening);
  const closingTime = formatTimeLabel(rawClosing);
  const isOpenNow = (() => {
    if (todayTiming?.isOpen === false) return false;
    const cur = new Date().getHours() * 60 + new Date().getMinutes();
    const open = parseTimeMinutes(rawOpening);
    let close = parseTimeMinutes(rawClosing);
    if (open === null || close === null) return true;
    if (close <= open) close += 24 * 60;
    return cur >= open && cur <= close;
  })();
  const isDiningEnabled = restaurant?.diningSettings?.isEnabled !== false;
  const favorite = isFavorite(restaurant.slug);

  const handleShare = () => {
    Share.share({message: `Check out ${restaurant.name} on Dima Hasao Food!`}).catch(() => {});
  };

  const handleToggleFavorite = () => {
    if (favorite) removeFavorite(restaurant.slug);
    else addFavorite({slug: restaurant.slug, name: restaurant.name, cuisine: restaurant.cuisine, rating: restaurant.rating, image: heroImage});
  };

  const handleOpenBookingSheet = useCallback(async () => {
    if (!isDiningEnabled) return;
    if (!(await isModuleAuthenticated('user'))) {
      navigation.navigate('Login');
      return;
    }
    setShowBookingSheet(true);
  }, [isDiningEnabled, navigation]);

  const handleContinueBooking = () => {
    setShowBookingSheet(false);
    navigation.navigate('FoodTableBooking', {restaurant, guestCount: selectedGuests});
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{paddingBottom: 100}}>
        <View className="relative h-96">
          {heroImage ? <Image source={{uri: heroImage}} className="w-full h-full" resizeMode="cover" /> : <View className="w-full h-full bg-gray-300" />}
          <View className="absolute inset-0 bg-black/30" />
          <View className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-3 pt-3">
            <Pressable onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-black/40 items-center justify-center">
              <ArrowLeft size={20} color="#fff" />
            </Pressable>
            <Pressable onPress={handleShare} className="w-10 h-10 rounded-full bg-black/40 items-center justify-center">
              <Share2 size={20} color="#fff" />
            </Pressable>
          </View>
          <View className="absolute bottom-0 left-0 right-0 px-3 pb-4">
            <View className="flex-row items-end justify-between gap-3">
              <View className="flex-1 min-w-0">
                <Text className="text-3xl font-black text-white">{restaurant.name}</Text>
                <Text className="text-sm text-white/90 mt-1" numberOfLines={2}>
                  {restaurant.address}
                </Text>
                <Text className="text-sm text-white/90 mt-1">
                  {restaurant.costForTwo || '₹1900 for two'} · {restaurant.cuisine}
                </Text>
                <View className="flex-row items-center gap-1.5 bg-black/30 self-start px-2.5 py-1 rounded-full mt-2">
                  {isOpenNow ? <CheckCircle2 size={14} color="#48d597" /> : <View className="w-3.5 h-3.5 rounded-full bg-red-500" />}
                  <Text className={`text-xs font-medium ${isOpenNow ? 'text-[#48d597]' : 'text-red-400'}`}>{isOpenNow ? 'Open now' : 'Closed'}</Text>
                  {openingTime && closingTime ? <Text className="text-xs text-white/80">· {openingTime} to {closingTime}</Text> : null}
                </View>
              </View>
              <View className="bg-white rounded-2xl px-3 py-2 items-center">
                <View className="flex-row items-center gap-1">
                  <Text className="text-2xl font-black text-gray-900">{restaurant.rating.toFixed(1)}</Text>
                  <Text className="text-[#18b54f] text-lg">★</Text>
                </View>
                <Text className="text-xs text-gray-500">{restaurant.totalRatings || 0} Reviews</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-3 pt-3">
          <Pressable
            onPress={handleOpenBookingSheet}
            disabled={!isDiningEnabled}
            className={`flex-row items-center justify-center gap-2 rounded-full border px-3 py-3.5 ${isDiningEnabled ? 'border-gray-100 bg-white' : 'border-red-100 bg-red-50'}`}>
            <Ticket size={15} color="#0a4d2b" />
            <Text className="text-[15px] font-medium text-gray-900">{isDiningEnabled ? 'Book a table' : 'Dining paused'}</Text>
          </Pressable>
          {!isDiningEnabled && (
            <View className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Text className="text-sm text-amber-800">Dining bookings are currently turned off by the restaurant.</Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center justify-between px-3 pt-5">
          <View>
            <Text className="text-2xl font-black text-gray-900">Menu</Text>
          </View>
          <View className="bg-orange-50 px-3 py-1 rounded-full">
            <Text className="text-xs font-semibold text-orange-600">{featuredSections.length || 2} sections</Text>
          </View>
        </View>
        <View className="flex-row gap-3 px-3 mt-4">
          {(featuredSections.length > 0 ? featuredSections : [{id: 'food', title: 'Food', pages: 16}, {id: 'bev', title: 'Beverages', pages: 10}]).map((section, index) => (
            <View key={section.id} className="flex-1 rounded-2xl border border-gray-100 bg-white overflow-hidden">
              <View className="aspect-square bg-gray-50">
                {imageGallery[index] ? <Image source={{uri: imageGallery[index]}} className="w-full h-full" resizeMode="cover" /> : <View className="flex-1 items-center justify-center"><Text className="text-xs text-gray-400">Menu preview</Text></View>}
              </View>
              <View className="px-2 py-2 items-center">
                <Text className="text-base text-gray-900" numberOfLines={1}>
                  {section.title}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">{section.pages} items</Text>
              </View>
            </View>
          ))}
        </View>

        <View className="px-3 mt-6 border-t border-gray-100 pt-4">
          <Text className="text-2xl font-black text-gray-900">Photos</Text>
          <View className="flex-row flex-wrap gap-3 mt-4">
            {(imageGallery.length > 0 ? imageGallery.slice(0, 4) : []).map((image, index) => (
              <Image key={`${image}-${index}`} source={{uri: image}} className={index === 0 ? 'w-full h-40 rounded-2xl' : 'flex-1 h-28 rounded-2xl'} resizeMode="cover" />
            ))}
            {imageGallery.length === 0 && <Text className="text-sm text-gray-400">Photos coming soon</Text>}
          </View>
        </View>

        <View className="px-3 mt-6 border-t border-gray-100 pt-4">
          <Text className="text-2xl font-black text-gray-900">About the restaurant</Text>
          <View className="rounded-2xl border border-gray-100 bg-white p-4 mt-4" style={{gap: 14}}>
            <View className="flex-row items-start gap-3">
              <IndianRupee size={16} color="#f0b500" />
              <Text className="text-sm text-gray-600 flex-1">{restaurant.costForTwo || '₹1900 for two'}</Text>
            </View>
            <View className="flex-row items-start gap-3">
              <View className="w-2 h-2 rounded-full bg-gray-400 mt-1.5" />
              <Text className="text-sm text-gray-600 flex-1">{restaurant.cuisine}</Text>
            </View>
            <View className="flex-row items-start gap-3">
              <MapPin size={16} color="#0a4d2b" />
              <Text className="text-sm text-gray-600 flex-1">{restaurant.address}</Text>
            </View>
          </View>

          <Text className="text-lg font-semibold text-gray-900 mt-5">Facilities</Text>
          <View className="flex-row flex-wrap gap-y-3 mt-3">
            {facilities.map(facility => (
              <View key={facility} className="w-1/2 flex-row items-center gap-2">
                <View className="w-1.5 h-1.5 rounded-full border border-gray-400" />
                <Text className="text-sm text-gray-600">{facility}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <Pressable onPress={handleOpenBookingSheet} disabled={!isDiningEnabled} className={`h-12 rounded-2xl border items-center justify-center ${isDiningEnabled ? 'border-red-100 bg-white' : 'border-gray-200 bg-gray-50'}`}>
          <Text className={`text-base font-medium ${isDiningEnabled ? 'text-[#0a4d2b]' : 'text-gray-400'}`}>{isDiningEnabled ? 'Book a table' : 'Dining paused'}</Text>
        </Pressable>
      </View>

      <Modal visible={showBookingSheet} transparent animationType="slide" onRequestClose={() => setShowBookingSheet(false)}>
        <Pressable className="flex-1 bg-black/35 justify-end" onPress={() => setShowBookingSheet(false)}>
          <Pressable onPress={e => e.stopPropagation()} className="bg-white rounded-t-3xl px-4 pb-6 pt-4">
            <View className="self-center w-14 h-1.5 rounded-full bg-gray-200 mb-4" />
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 mr-3">
                <Text className="text-xl font-black text-gray-900">Select number of guests</Text>
                <Text className="text-sm text-gray-500 mt-1">{remainingSeats > 0 ? `Only ${remainingSeats} out of ${maxCapacity} seats available now.` : 'Fully booked for now. Try later!'}</Text>
              </View>
              <Pressable onPress={() => setShowBookingSheet(false)} className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
                <X size={16} color="#6b7280" />
              </Pressable>
            </View>

            <View className="flex-row flex-wrap gap-3">
              {Array.from({length: maxCapacity}, (_, index) => {
                const count = index + 1;
                const isBooked = count <= occupiedSeats;
                const isTooLarge = count > remainingSeats && !isBooked;
                const disabled = isBooked || isTooLarge;
                return (
                  <Pressable
                    key={count}
                    disabled={disabled}
                    onPress={() => setSelectedGuests(count)}
                    className={`rounded-2xl border px-4 py-3.5 items-center ${selectedGuests === count ? 'border-[#0a4d2b] bg-orange-50' : disabled ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'}`}
                    style={{minWidth: 64}}>
                    <Text className={`text-sm font-bold ${selectedGuests === count ? 'text-[#0a4d2b]' : disabled ? 'text-gray-300' : 'text-gray-900'}`}>{isBooked ? 'Booked' : count}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={handleContinueBooking}
              disabled={remainingSeats === 0 || selectedGuests > remainingSeats}
              className={`mt-6 h-12 rounded-2xl items-center justify-center ${remainingSeats === 0 || selectedGuests > remainingSeats ? 'bg-gray-200' : 'bg-[#0a4d2b]'}`}>
              <Text className={`text-base font-bold ${remainingSeats === 0 || selectedGuests > remainingSeats ? 'text-gray-400' : 'text-white'}`}>{remainingSeats === 0 ? 'Fully Booked' : 'Continue'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
