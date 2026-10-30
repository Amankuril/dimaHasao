/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/intercity/IntercityConfirm.jsx.
 *
 * Two paths, same as the web version: an instant (not scheduled, or
 * bidding) booking hands off to SearchingDriverScreen — the exact same
 * screen task 8c built for the regular ride flow, now carrying an
 * `intercity` sub-object so the POST /rides payload identifies it as an
 * outstation trip (see the SearchingDriverScreen.jsx fix in this task that
 * added that field's pass-through). A scheduled, non-bidding booking posts
 * directly here and shows a saving/scheduled/error confirmation.
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, SafeAreaView, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Calendar, CheckCircle2, Clock3, LoaderCircle, Navigation} from 'lucide-react-native';

import api from '../../services/taxi/axiosInstance';
import {generateIntercityBookingId, generateSearchNonce} from '../../utils/intercityIds';

export default function IntercityConfirmScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const state = route.params || {};
  const [status, setStatus] = useState('saving');
  const [error, setError] = useState('');
  const requestStartedRef = useRef(false);
  const isScheduled = state.rideMode === 'schedule' && Boolean(state.scheduledAt);
  const isBiddingRide = String(state.bookingMode || '').trim().toLowerCase() === 'bidding';

  useEffect(() => {
    if (!state.pickup || !state.drop || !state.vehicle) {
      navigation.replace('IntercityHome');
      return;
    }

    if (!isScheduled || isBiddingRide) {
      const bookingId = state.bookingId || generateIntercityBookingId();
      navigation.replace('SearchingDriver', {
        ...state,
        bookingId,
        searchNonce: state.searchNonce || generateSearchNonce(),
        vehicleTypeId: state.vehicleTypeId || state.vehicle?.vehicleTypeId || '',
        vehicleIconType: state.vehicleIconType || state.vehicle?.iconType || state.vehicle?.name || 'car',
        vehicleIconUrl: state.vehicleIconUrl || state.vehicle?.vehicleIconUrl || state.vehicle?.icon || '',
        paymentMethod: state.paymentMethod || 'Cash',
        serviceType: 'intercity',
        transport_type: 'intercity',
        bookingMode: isBiddingRide ? 'bidding' : state.bookingMode || 'normal',
        bidStepAmount: Number(state.bidStepAmount || 10),
        userMaxBidFare: Number(state.userMaxBidFare || state.fare || 0),
        intercity: {
          bookingId,
          fromCity: state.fromCity || '',
          toCity: state.toCity || '',
          tripType: state.tripType || 'One Way',
          travelDate: state.date || 'Ride Now',
          passengers: state.passengers || 1,
          distance: Number(state.distance || 0),
          vehicleName: state.vehicle?.name || state.vehicle?.id || 'Intercity Cab',
          packageId: state.vehicle?.packageId || '',
          packageTypeName: state.vehicle?.packageTypeName || 'Intercity',
        },
      });
      return;
    }

    if (requestStartedRef.current) return;
    requestStartedRef.current = true;

    const bookingId = state.bookingId || generateIntercityBookingId();

    (async () => {
      try {
        await api.post('/rides', {
          pickup: state.pickupCoords,
          drop: state.dropCoords,
          pickupAddress: state.pickup,
          dropAddress: state.drop,
          fare: Number(state.fare || 0),
          vehicleTypeId: state.vehicleTypeId || state.vehicle?.vehicleTypeId || '',
          vehicleTypeIds:
            state.vehicleTypeId || state.vehicle?.vehicleTypeId ? [state.vehicleTypeId || state.vehicle?.vehicleTypeId] : [],
          vehicleIconType: state.vehicleIconType || state.vehicle?.iconType || state.vehicle?.name || 'car',
          vehicleIconUrl: state.vehicleIconUrl || state.vehicle?.vehicleIconUrl || state.vehicle?.icon || '',
          paymentMethod: state.paymentMethod || 'Cash',
          serviceType: 'intercity',
          transport_type: 'intercity',
          bookingMode: state.bookingMode || 'normal',
          userMaxBidFare: Number(state.userMaxBidFare || state.fare || 0),
          bidStepAmount: Number(state.bidStepAmount || 10),
          scheduledAt: state.scheduledAt,
          intercity: {
            bookingId,
            fromCity: state.fromCity || '',
            toCity: state.toCity || '',
            tripType: state.tripType || 'One Way',
            travelDate: state.travelDate || state.date || '',
            passengers: state.passengers || 1,
            distance: Number(state.distance || 0),
            vehicleName: state.vehicle?.name || state.vehicle?.id || 'Intercity Cab',
          },
        });
        setStatus('scheduled');
      } catch (requestError) {
        setStatus('error');
        setError(requestError?.message || 'Could not schedule this intercity ride.');
      }
    })();
  }, [isScheduled, isBiddingRide, navigation, state]); // eslint-disable-line react-hooks/exhaustive-deps

  const formattedSchedule = useMemo(() => {
    if (!state.scheduledAt) return '';
    const parsed = new Date(state.scheduledAt);
    if (Number.isNaN(parsed.getTime())) return state.scheduledAt;
    return parsed.toLocaleString('en-IN', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});
  }, [state.scheduledAt]);

  const palette =
    status === 'scheduled'
      ? {bg: 'rgba(16,185,129,0.15)', color: '#34d399'}
      : status === 'error'
      ? {bg: 'rgba(225,29,72,0.15)', color: '#fb7185'}
      : {bg: 'rgba(37,99,235,0.15)', color: '#60a5fa'};

  return (
    <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center px-6">
      <View className="w-full rounded-[32px] border border-white/10 bg-white/5 px-6 py-8">
        <View className="w-16 h-16 rounded-[22px] items-center justify-center self-center" style={{backgroundColor: palette.bg}}>
          {status === 'scheduled' ? <CheckCircle2 size={26} color={palette.color} /> : <Navigation size={26} color={palette.color} />}
        </View>
        <Text className="mt-5 text-[22px] font-black text-white text-center">
          {status === 'scheduled' ? 'Intercity ride scheduled' : status === 'error' ? 'Scheduling failed' : 'Scheduling your ride'}
        </Text>
        <Text className="mt-2 text-[13px] font-bold text-white/55 text-center">
          {status === 'scheduled'
            ? 'Your booking has been saved. Drivers will be notified automatically at the scheduled time.'
            : status === 'error'
            ? error
            : 'Saving your intercity booking and preparing automatic driver notification.'}
        </Text>

        <View className="mt-6 rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
          <View className="flex-row items-center gap-3">
            <Calendar size={16} color="#93c5fd" />
            <Text className="text-sm font-bold text-white">Scheduled For</Text>
          </View>
          <Text className="mt-2 text-lg font-black text-white">{formattedSchedule || state.date || 'Scheduled'}</Text>
          <View className="mt-4 flex-row items-center gap-3">
            <Clock3 size={15} color="rgba(255,255,255,0.65)" />
            <Text className="text-xs font-bold text-white/65 uppercase">{state.fromCity} to {state.toCity}</Text>
          </View>
        </View>

        {status === 'saving' && (
          <View className="mt-6 flex-row items-center justify-center gap-3">
            <LoaderCircle size={18} color="#93c5fd" />
            <Text className="text-[12px] font-black uppercase text-blue-300">Saving Schedule</Text>
          </View>
        )}

        <Pressable onPress={() => navigation.navigate('TaxiHome')} className="mt-6 h-12 rounded-[18px] bg-white items-center justify-center">
          <Text className="text-sm font-black uppercase text-slate-900">{status === 'error' ? 'Back to Home' : 'Done'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
