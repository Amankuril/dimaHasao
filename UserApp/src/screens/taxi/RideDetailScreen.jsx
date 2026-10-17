/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/ride/RideDetail.jsx.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {Image, Pressable, SafeAreaView, ScrollView, Share, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, HelpCircle, Repeat, Share2, Star} from 'lucide-react-native';

import api from '../../services/taxi/axiosInstance';
import VehicleIcon from '../../components/taxi/VehicleIcon';

const unwrap = response => response?.data || response;

const formatLongDate = value => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Trip details';
  return date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
};

const formatTime = value => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', hour12: true});
};

const pickFirstString = (...values) => {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return '';
};

const coordLabel = (location, fallback) => {
  const [lng, lat] = location?.coordinates || [];
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
  return fallback;
};

export default function RideDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const id = route.params?.id;
  const [ride, setRide] = useState(route.params?.ride || null);
  const [loading, setLoading] = useState(!route.params?.ride);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ride || !id) return undefined;
    let active = true;
    (async () => {
      try {
        const response = await api.get(`/rides/${id}`);
        if (active) setRide(unwrap(response));
      } catch (loadError) {
        if (active) setError(loadError?.message || 'Could not load trip details.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, ride]);

  const details = useMemo(() => {
    const driver = ride?.driver || ride?.driverId || {};
    const timeSource = ride?.completedAt || ride?.startedAt || ride?.acceptedAt || ride?.createdAt || ride?.updatedAt;
    const fare = Number(ride?.fare || 0);
    const taxes = Math.max(Math.round(fare * 0.18), 0);
    const status = String(ride?.status || ride?.liveStatus || 'trip').toLowerCase();
    const rideCode = String(ride?.rideId || ride?._id || ride?.id || id || 'ride');

    return {
      pickup: pickFirstString(ride?.pickupAddress, ride?.pickup?.address, ride?.pickup?.name) || coordLabel(ride?.pickupLocation || ride?.pickup, 'Pickup location'),
      drop: pickFirstString(ride?.dropAddress, ride?.drop?.address, ride?.drop?.name, ride?.destinationAddress) || coordLabel(ride?.dropLocation || ride?.drop, 'Drop location'),
      fare,
      taxes,
      baseFare: Math.max(fare - taxes, 0),
      startTime: ride?.startedAt || ride?.acceptedAt || timeSource,
      endTime: ride?.completedAt || timeSource,
      timeSource,
      statusLabel: status.charAt(0).toUpperCase() + status.slice(1),
      driverName: driver.name || 'Captain',
      rating: driver.rating || '4.9',
      plate: driver.vehicleNumber || 'Assigned',
      vehicle: driver.vehicleType || ride?.vehicleIconType || 'Taxi',
      paymentMethod: String(ride?.paymentMethod || ride?.payment_method || 'cash').trim().toLowerCase() === 'cash' ? 'Cash' : 'Online',
      rideCode,
      shortRideCode: rideCode.length > 14 ? `${rideCode.slice(0, 6)}...${rideCode.slice(-4)}` : rideCode,
    };
  }, [ride, id]);

  const handleShare = () => {
    Share.share({message: `My Dima Hasao trip #${details.shortRideCode} - ${details.pickup} to ${details.drop} | ₹${details.fare}.00`});
  };

  const handleRebook = () => {
    const vehicleTypeStr = String(ride?.vehicleIconType || ride?.driver?.vehicleType || '').toLowerCase();
    const rebookCategory = vehicleTypeStr.includes('bike') || vehicleTypeStr.includes('scooty') ? 'bike' : vehicleTypeStr.includes('auto') ? 'auto' : 'car';

    navigation.navigate('SelectLocation', {
      pickup: details.pickup,
      drop: details.drop,
      pickupCoords: ride?.pickupLocation?.coordinates || null,
      dropCoords: ride?.dropLocation?.coordinates || null,
      selectedCategory: rebookCategory,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-start justify-between gap-3 px-4 py-4 border-b border-slate-50">
        <View className="flex-row items-start gap-3 flex-1">
          <Pressable onPress={() => navigation.goBack()} className="pt-1">
            <ArrowLeft size={22} color="#0f172a" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[16px] font-black text-slate-900" numberOfLines={1}>
              Trip ID: #{details.shortRideCode}
            </Text>
            <Text className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">
              {details.statusLabel}: {formatLongDate(details.timeSource)}
            </Text>
          </View>
        </View>
        <Pressable onPress={handleShare}>
          <Share2 size={18} color="#94a3b8" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{padding: 16, gap: 20}}>
        {loading && (
          <View className="rounded-3xl border border-slate-50 bg-white p-5">
            <Text className="text-center text-[13px] font-black text-slate-500">Loading trip details...</Text>
          </View>
        )}
        {!!error && (
          <View className="rounded-3xl border border-rose-100 bg-rose-50 p-5">
            <Text className="text-center text-[13px] font-black text-rose-600">{error}</Text>
          </View>
        )}

        <View className="pl-6">
          <View className="mb-5">
            <View className="flex-row items-center gap-2 mb-1">
              <View className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 items-center justify-center">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </View>
              <Text className="text-[11px] font-black uppercase text-slate-400">Pickup</Text>
            </View>
            <Text className="text-[15px] font-black text-slate-800">{details.pickup}</Text>
            <Text className="text-[11px] font-bold text-slate-400 mt-0.5">{formatTime(details.startTime)}</Text>
          </View>
          <View>
            <View className="flex-row items-center gap-2 mb-1">
              <View className="w-3.5 h-3.5 rounded-full border-2 border-orange-500 items-center justify-center">
                <View className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              </View>
              <Text className="text-[11px] font-black uppercase text-slate-400">Drop</Text>
            </View>
            <Text className="text-[15px] font-black text-slate-800">{details.drop}</Text>
            <Text className="text-[11px] font-bold text-slate-400 mt-0.5">{formatTime(details.endTime)}</Text>
          </View>
        </View>

        <View className="bg-white rounded-3xl p-5 border border-slate-50">
          <View className="flex-row items-center gap-3 pb-4 border-b border-slate-50">
            <View className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center border border-slate-100">
              <VehicleIcon name={details.vehicle} size={20} />
            </View>
            <View>
              <Text className="text-[15px] font-black text-slate-900">{details.vehicle} Ride</Text>
              <Text className="text-[11px] font-bold uppercase text-slate-400">Payment by {details.paymentMethod}</Text>
            </View>
          </View>

          <View className="pt-3 gap-2.5">
            <View className="flex-row justify-between">
              <Text className="text-[13px] font-bold text-slate-500">Base Fare</Text>
              <Text className="text-[13px] font-bold text-slate-900">₹{details.baseFare}.00</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[13px] font-bold text-slate-500">Taxes & Fees</Text>
              <Text className="text-[13px] font-bold text-slate-900">₹{details.taxes}.00</Text>
            </View>
            <View className="flex-row justify-between pt-2 border-t border-slate-50">
              <Text className="text-[16px] font-black text-slate-900">Total Paid</Text>
              <Text className="text-[16px] font-black text-slate-900">₹{details.fare}.00</Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-between p-4 bg-orange-50 rounded-3xl border border-orange-50">
          <View className="flex-row items-center gap-3">
            <Image
              source={{uri: `https://ui-avatars.com/api/?name=${String(details.driverName).replace(' ', '+')}&background=f0f0f0&color=000`}}
              className="w-11 h-11 rounded-2xl"
            />
            <View>
              <Text className="text-[14px] font-black text-slate-900">{details.driverName}</Text>
              <View className="flex-row items-center gap-1">
                <Star size={12} color="#ea580c" fill="#ea580c" />
                <Text className="text-[11px] font-black text-orange-600">
                  {details.rating} - {details.plate}
                </Text>
              </View>
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate('RideSupport')} className="bg-white px-4 py-2 rounded-full border border-orange-100">
            <Text className="text-[12px] font-black text-slate-900">Support</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View className="flex-row gap-3 p-4 border-t border-slate-50">
        <Pressable onPress={handleRebook} className="flex-[2] bg-[#1C2833] rounded-2xl py-4 flex-row items-center justify-center gap-2">
          <Repeat size={16} color="#fff" />
          <Text className="text-white font-black text-[12px] uppercase">Rebook Ride</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('RideSupport')} className="flex-1 bg-slate-50 rounded-2xl py-4 flex-row items-center justify-center gap-1.5 border border-slate-100">
          <HelpCircle size={16} color="#0f172a" />
          <Text className="text-slate-900 font-black text-[12px] uppercase">Help</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
