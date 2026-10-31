/**
 * Ported from Frontend/src/modules/Food/pages/user/dining/TableBookingSuccess.jsx
 * (251 lines): the pending/confirmed ticket card with live status
 * polling via `diningApi.getBookings`. Confetti is dropped (decorative,
 * no RN equivalent installed) — the pending→confirmed status change
 * itself still updates live.
 */
import React, {useEffect, useRef, useState} from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Calendar, CheckCircle2, Clock, Home, List, MapPin, Users} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import diningApi from '../../services/food/diningApi';

const CONFIRMED_STATUSES = ['accepted', 'confirmed'];
const FINAL_STATUSES = ['accepted', 'confirmed', 'cancelled', 'rejected'];
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop';

export default function FoodTableBookingSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const booking = route.params?.booking;
  const [liveStatus, setLiveStatus] = useState(booking?.status || 'pending');
  const prevStatusRef = useRef(booking?.status || 'pending');

  useEffect(() => {
    if (!booking?._id || FINAL_STATUSES.includes(liveStatus)) return undefined;

    const fetchStatus = async () => {
      try {
        const res = await diningApi.getBookings();
        if (!res?.data?.success) return;
        const all = Array.isArray(res.data.data) ? res.data.data : [];
        const found = all.find(b => String(b._id) === String(booking._id) || String(b.bookingId) === String(booking.bookingId));
        const newStatus = found?.status;
        if (newStatus && newStatus !== prevStatusRef.current) {
          prevStatusRef.current = newStatus;
          setLiveStatus(newStatus);
          if (CONFIRMED_STATUSES.includes(newStatus)) Toast.show({type: 'success', text1: 'Your booking has been confirmed!'});
          else if (newStatus === 'cancelled' || newStatus === 'rejected') Toast.show({type: 'error', text1: 'Your booking was not accepted.'});
        }
      } catch {
        // retry on next interval
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [booking?._id, booking?.bookingId, liveStatus]);

  if (!booking) {
    navigation.navigate('Dining');
    return null;
  }

  const isConfirmed = CONFIRMED_STATUSES.includes(liveStatus);
  const isPending = liveStatus === 'pending';
  const formattedDate = new Date(booking.date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});

  return (
    <View className="flex-1 bg-white items-center justify-center p-6">
      <View className={`w-20 h-20 rounded-full items-center justify-center mb-6 ${isPending ? 'bg-amber-50' : 'bg-orange-50'}`}>
        {isPending ? <Clock size={48} color="#f59e0b" /> : <CheckCircle2 size={48} color="#22c55e" />}
      </View>

      <View className="items-center mb-8" style={{gap: 6}}>
        <Text className="text-3xl font-black text-gray-900">{isPending ? 'Booking Requested!' : 'Seat Confirmed!'}</Text>
        <Text className="text-gray-500 font-medium italic">{isPending ? 'Waiting for restaurant approval' : 'Your table is ready for you'}</Text>
        <View className="bg-orange-50 px-4 py-1 rounded-full border border-[#0a4d2b]/20 mt-2">
          <Text className="text-[#0a4d2b] text-xs font-bold uppercase tracking-widest">BOOKING ID: {booking.bookingId}</Text>
        </View>

        {isPending && (
          <View className="mt-4 max-w-xs bg-amber-50 border border-amber-100 rounded-2xl p-4 flex-row gap-3">
            <View className="bg-amber-100 p-2 rounded-xl h-fit">
              <Clock size={16} color="#d97706" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-amber-900 text-xs">Waiting for Confirmation</Text>
              <Text className="text-amber-700/80 text-[10px] mt-1 leading-relaxed">The restaurant will review and approve your request shortly. You'll be notified of the status.</Text>
            </View>
          </View>
        )}
      </View>

      <View className="w-full max-w-sm bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
        <View className="p-6" style={{gap: 20}}>
          <View className="flex-row items-center gap-4">
            <Image source={{uri: booking.restaurant?.image || booking.restaurant?.profileImage?.url || FALLBACK_IMAGE}} className="w-16 h-16 rounded-2xl bg-white" resizeMode="cover" />
            <View className="flex-1 min-w-0">
              <Text className="font-black text-lg text-gray-900" numberOfLines={1}>
                {booking.restaurant?.name || 'Restaurant'}
              </Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <MapPin size={12} color="#9ca3af" />
                <Text className="text-xs text-gray-400 flex-1" numberOfLines={1}>
                  {typeof booking.restaurant?.location === 'string' ? booking.restaurant.location : booking.restaurant?.location?.addressLine1 || booking.restaurant?.location?.formattedAddress || booking.restaurant?.location?.address || ''}
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row flex-wrap border-y border-dashed border-slate-200 py-5" style={{gap: 16}}>
            <View style={{width: '45%'}}>
              <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date</Text>
              <View className="flex-row items-center gap-2 mt-1">
                <Calendar size={14} color="#ef4444" />
                <Text className="font-bold text-gray-800">{formattedDate}</Text>
              </View>
            </View>
            <View style={{width: '45%'}}>
              <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Time</Text>
              <View className="flex-row items-center gap-2 mt-1">
                <Clock size={14} color="#ef4444" />
                <Text className="font-bold text-gray-800">{booking.timeSlot}</Text>
              </View>
            </View>
            <View style={{width: '45%'}}>
              <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Guests</Text>
              <View className="flex-row items-center gap-2 mt-1">
                <Users size={14} color="#ef4444" />
                <Text className="font-bold text-gray-800">{booking.guests} People</Text>
              </View>
            </View>
            <View style={{width: '45%'}}>
              <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</Text>
              <View className={`self-start px-2 py-0.5 rounded-lg mt-1 ${isPending ? 'bg-amber-500' : isConfirmed ? 'bg-emerald-500' : 'bg-red-500'}`}>
                <Text className="text-white text-[10px] font-black tracking-widest uppercase">{isPending ? 'PENDING' : isConfirmed ? 'CONFIRMED' : liveStatus.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View className="w-full max-w-sm mt-10" style={{gap: 12}}>
        <Pressable onPress={() => navigation.navigate('FoodMyBookings')} className="h-14 rounded-2xl bg-red-500 flex-row items-center justify-center gap-2">
          <List size={18} color="#fff" />
          <Text className="text-white font-bold text-lg">View My Bookings</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Dining')} className="h-14 rounded-2xl bg-white border-2 border-slate-100 flex-row items-center justify-center gap-2">
          <Home size={18} color="#475569" />
          <Text className="text-slate-600 font-bold text-lg">Go to Home</Text>
        </Pressable>
        <Text className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">Show this ticket at the restaurant for a smooth entry</Text>
      </View>
    </View>
  );
}
