/**
 * Ported from Frontend/src/modules/Food/pages/user/dining/TableBooking.jsx
 * (492 lines) — guest count, 3-day date picker, lunch/dinner slot grid
 * built from outlet timings, and the same occupied-seats math as
 * FoodDiningRestaurantDetailsScreen's booking sheet.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import restaurantApi from '../../services/food/restaurantApi';
import diningApi from '../../services/food/diningApi';

const buildDates = (count = 3) =>
  Array.from({length: count}, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });

const formatTimeValue = value => {
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

const getDayName = date => date.toLocaleDateString('en-US', {weekday: 'long'});

const buildSlots = timing => {
  if (!timing || timing.isOpen === false) return [];
  const opening = parseTimeMinutes(timing.openingTime);
  let closing = parseTimeMinutes(timing.closingTime);
  if (opening === null || closing === null) return [];
  if (closing <= opening) closing += 24 * 60;

  const slots = [];
  let cursor = opening;
  while (cursor <= closing) {
    const hours = Math.floor((cursor % (24 * 60)) / 60);
    const minutes = cursor % 60;
    slots.push(formatTimeValue(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`));
    cursor += 30;
  }
  return slots;
};

const buildFallbackTiming = restaurant => ({
  isOpen: true,
  openingTime: String(restaurant?.openingTime || restaurant?.diningSettings?.openingTime || '12:00').trim(),
  closingTime: String(restaurant?.closingTime || restaurant?.diningSettings?.closingTime || '23:00').trim(),
});

const getMealPeriod = slot => {
  if (!slot) return 'all';
  const match = String(slot).toUpperCase().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
  if (!match) return 'all';
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (match[3] === 'PM' && hour !== 12) hour += 12;
  if (match[3] === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute < 17 * 60 ? 'lunch' : 'dinner';
};

export default function FoodTableBookingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};

  const [restaurant] = useState(params.restaurant || null);
  const [outletTimings, setOutletTimings] = useState({});
  const [currentBookings, setCurrentBookings] = useState([]);
  const [selectedGuests, setSelectedGuests] = useState(params.guestCount || 2);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedMealPeriod, setSelectedMealPeriod] = useState('lunch');

  useEffect(() => {
    if (!restaurant) return;
    const restaurantId = restaurant._id || restaurant.id;
    restaurantApi
      .getOutletTimingsByRestaurantId(restaurantId)
      .then(res => setOutletTimings(res?.data?.data?.outletTimings || {}))
      .catch(() => setOutletTimings({}));
    diningApi
      .getRestaurantBookings(restaurant)
      .then(res => setCurrentBookings(res?.data?.success && Array.isArray(res.data.data) ? res.data.data : []))
      .catch(() => {});
  }, [restaurant]);

  const occupiedSeats = useMemo(() => {
    const now = Date.now();
    const THIRTY_MIN = 30 * 60 * 1000;
    return currentBookings
      .filter(b => {
        if (['approved', 'accepted', 'confirmed'].includes(b.status)) return true;
        if (b.status === 'pending') return now - new Date(b.createdAt || b.date).getTime() < THIRTY_MIN;
        return false;
      })
      .reduce((sum, b) => sum + (Number(b.guests) || 0), 0);
  }, [currentBookings]);

  const maxCapacity = restaurant?.diningSettings?.maxGuests || 10;
  const remainingSeats = Math.max(0, maxCapacity - occupiedSeats);
  const dates = useMemo(() => buildDates(3), []);

  const selectedDayTiming = useMemo(() => {
    const fromOutlet = outletTimings?.[getDayName(selectedDate)];
    if (fromOutlet && fromOutlet.isOpen !== false) return fromOutlet;
    return buildFallbackTiming(restaurant);
  }, [outletTimings, selectedDate, restaurant]);

  const allSlots = useMemo(() => buildSlots(selectedDayTiming), [selectedDayTiming]);
  const availableSlots = useMemo(() => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();
    if (!isToday) return allSlots;
    const now = new Date();
    const curMinutes = now.getHours() * 60 + now.getMinutes();
    return allSlots.filter(slot => parseTimeMinutes(slot) > curMinutes + 15);
  }, [allSlots, selectedDate]);

  const filteredSlots = useMemo(() => availableSlots.filter(slot => getMealPeriod(slot) === selectedMealPeriod), [availableSlots, selectedMealPeriod]);

  useEffect(() => {
    if (!selectedSlot && filteredSlots.length > 0) setSelectedSlot(filteredSlots[0]);
    else if (selectedSlot && filteredSlots.length > 0 && !filteredSlots.includes(selectedSlot)) setSelectedSlot(filteredSlots[0]);
    else if (filteredSlots.length === 0) setSelectedSlot(null);
  }, [filteredSlots, selectedSlot]);

  if (!restaurant) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-6">
        <Text className="text-gray-700">Restaurant not found</Text>
      </View>
    );
  }

  const isDiningEnabled = restaurant?.diningSettings?.isEnabled !== false;
  const canProceed = Boolean(isDiningEnabled && selectedSlot && selectedGuests);

  const handleProceed = () => {
    if (!isDiningEnabled) {
      Toast.show({type: 'error', text1: 'Dining bookings are currently paused for this restaurant.'});
      return;
    }
    if (!canProceed) {
      Toast.show({type: 'error', text1: 'Please select date, time and guests to continue.'});
      return;
    }
    navigation.navigate('FoodTableBookingConfirmation', {restaurant, guests: selectedGuests, date: selectedDate.toISOString(), timeSlot: selectedSlot});
  };

  return (
    <View className="flex-1 bg-[#f5f6fb]">
      <View className="px-4 pt-3 pb-6" style={{backgroundColor: '#ffe7c6'}}>
        <Pressable onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-white items-center justify-center">
          <ArrowLeft size={20} color="#383838" />
        </Pressable>
        <View className="mt-5 items-center">
          <Text className="text-[26px] font-black text-[#25314a]">Book a table</Text>
          <Text className="text-sm font-medium text-[#636363] mt-1">{restaurant.name || restaurant.restaurantName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 120}} style={{marginTop: -16}}>
        {!isDiningEnabled && (
          <View className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 mb-4">
            <Text className="text-sm font-semibold text-amber-900">Dining bookings are paused by this restaurant.</Text>
          </View>
        )}

        <View className="rounded-3xl bg-white p-4 shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-medium text-[#2f3545]">Select number of guests</Text>
            <Text className="text-xs font-bold text-[#0a4d2b] bg-orange-50 px-2 py-1 rounded-lg">{remainingSeats} left</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {Array.from({length: maxCapacity}, (_, index) => {
              const count = index + 1;
              const isBooked = count <= occupiedSeats;
              const isTooLarge = count > remainingSeats && !isBooked;
              return (
                <Pressable
                  key={count}
                  disabled={isBooked || isTooLarge}
                  onPress={() => setSelectedGuests(count)}
                  className={`h-11 w-11 items-center justify-center rounded-xl border ${selectedGuests === count ? 'border-[#ef8f98] bg-[#fffaf9]' : isBooked || isTooLarge ? 'border-gray-100 bg-gray-50' : 'border-[#ececf2] bg-white'}`}>
                  <Text className={`text-sm font-bold ${selectedGuests === count ? 'text-[#d64f63]' : isBooked || isTooLarge ? 'text-gray-300' : 'text-[#444b5f]'}`}>{isBooked ? 'X' : count}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="rounded-3xl bg-white p-4 shadow-sm mb-4">
          <Text className="text-sm font-medium text-[#2f3545]">Select date</Text>
          <View className="flex-row gap-3 mt-4">
            {dates.map((date, index) => {
              const active = selectedDate.toDateString() === date.toDateString();
              return (
                <Pressable key={date.toISOString()} onPress={() => setSelectedDate(date)} className={`flex-1 rounded-2xl border px-3 py-4 items-center ${active ? 'border-[#ef8f98] bg-[#fffaf9]' : 'border-[#ececf2] bg-white'}`}>
                  <Text className="text-sm font-medium text-[#444b5f]">{index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : date.toLocaleDateString('en-IN', {weekday: 'long'})}</Text>
                  <Text className="text-sm text-[#7b8191] mt-1">{date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short'})}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="rounded-3xl bg-white p-4 shadow-sm">
          <Text className="text-sm font-medium text-[#2f3545]">Select time of day</Text>
          <View className="flex-row gap-2 mt-4">
            {[{id: 'lunch', label: 'Lunch'}, {id: 'dinner', label: 'Dinner'}].map(period => {
              const active = selectedMealPeriod === period.id;
              return (
                <Pressable key={period.id} onPress={() => setSelectedMealPeriod(period.id)} className={`rounded-full border px-4 py-2 ${active ? 'border-[#ef8f98] bg-white' : 'border-[#ececf2] bg-[#fafafc]'}`}>
                  <Text className={`text-sm font-medium ${active ? 'text-[#d64f63]' : 'text-[#666f82]'}`}>{period.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row flex-wrap gap-3 mt-4">
            {filteredSlots.length === 0 ? (
              <View className="w-full rounded-2xl border border-dashed border-gray-200 px-4 py-8 items-center">
                <Text className="text-sm text-[#7c8394] text-center">No {selectedMealPeriod} slots available for the selected date.</Text>
              </View>
            ) : (
              filteredSlots.map(slot => {
                const active = selectedSlot === slot;
                return (
                  <Pressable key={slot} onPress={() => setSelectedSlot(slot)} className={`rounded-2xl border px-3 py-3.5 items-center ${active ? 'border-[#ef8f98] bg-[#fffaf9]' : 'border-[#ececf2] bg-white'}`} style={{width: '31%'}}>
                    <Text className="text-sm font-medium text-[#334155]">{slot}</Text>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-[#f5f6fb] p-4">
        <Pressable onPress={handleProceed} disabled={!canProceed} className={`h-14 rounded-2xl items-center justify-center ${canProceed ? 'bg-[#0a4d2b]' : 'bg-gray-300'}`}>
          <Text className="text-lg font-bold text-white">{!isDiningEnabled ? 'Dining paused' : canProceed ? 'Proceed to confirmation' : 'Select a time slot to proceed'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
