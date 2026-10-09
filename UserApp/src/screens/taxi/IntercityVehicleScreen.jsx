/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/intercity/IntercityVehicle.jsx.
 *
 * No direct API calls here (works off the route-state package/vehicle data
 * handed down by IntercityHomeScreen), so this is a near-verbatim port other
 * than the date/time inputs becoming DateTimePickerField and vehicle images
 * becoming VehicleIcon (RN has no web-asset PNGs to fall back on).
 */
import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, SafeAreaView, ScrollView, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, Calendar, ChevronRight, Clock3, Info, MapPin, Users} from 'lucide-react-native';

import {useSettings} from '../../context/SettingsContext';
import VehicleIcon from '../../components/taxi/VehicleIcon';
import DateTimePickerField from '../../components/DateTimePickerField';

const pad = n => String(n).padStart(2, '0');
const toDateInputValue = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const DEFAULT_BID_STEP_AMOUNT = 10;
const DEFAULT_BID_HEADROOM_PERCENT = 20;

const toConfiguredPositiveInteger = (value, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : fallback;
};

const clampPercentage = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, numeric));
};

const alignBidAmountToStep = ({baseFare, amount, stepAmount}) => {
  const safeBaseFare = Math.max(0, Math.round(Number(baseFare || 0)));
  const safeStepAmount = toConfiguredPositiveInteger(stepAmount, DEFAULT_BID_STEP_AMOUNT);
  const safeAmount = Math.max(safeBaseFare, Math.round(Number(amount || 0)));
  const delta = safeAmount - safeBaseFare;
  if (delta === 0) return safeBaseFare;
  return safeBaseFare + Math.ceil(delta / safeStepAmount) * safeStepAmount;
};

const normalizeVehicleEntry = (pkg, vehicle, index) => ({
  id: vehicle.id || `${pkg.id}:${vehicle.vehicleTypeId || index}`,
  packageId: pkg.id,
  packageTypeName: pkg.packageTypeName || 'Intercity',
  destination: pkg.destination || '',
  vehicleTypeId: vehicle.vehicleTypeId || '',
  name: vehicle.vehicleName || 'Vehicle',
  seats: Number(vehicle.capacity || 4) || 4,
  iconType: vehicle.iconType || vehicle.vehicleName || 'car',
  vehicleIconUrl: vehicle.icon || '',
  dispatchType: String(vehicle.dispatchType || 'normal').trim().toLowerCase(),
  supportsBidding: ['bidding', 'both'].includes(String(vehicle.dispatchType || 'normal').trim().toLowerCase()),
  baseFare: Number(vehicle.basePrice || 0),
  freeDistance: Number(vehicle.freeDistance || 0),
  pricePerKm: Number(vehicle.distancePrice || 0),
  freeTime: Number(vehicle.freeTime || 0),
  timePrice: Number(vehicle.timePrice || 0),
  serviceTax: Number(vehicle.serviceTax || 0),
  cancellationFee: Number(vehicle.cancellationFee || 0),
});

const calculateFare = (vehicle, tripType) => {
  const baseFare = Number(vehicle.baseFare || 0);
  return tripType === 'Round Trip' ? Math.round(baseFare * 1.8) : Math.round(baseFare);
};

const calculateDefaultBidCeiling = (fare, stepAmount = DEFAULT_BID_STEP_AMOUNT, headroomPercent = DEFAULT_BID_HEADROOM_PERCENT) => {
  const safeFare = Math.max(0, Number(fare || 0));
  const raisedFare = safeFare * (1 + clampPercentage(headroomPercent, DEFAULT_BID_HEADROOM_PERCENT) / 100);
  return alignBidAmountToStep({baseFare: safeFare, amount: raisedFare, stepAmount});
};

const getDisplayDate = (rideMode, travelDate) => (rideMode === 'schedule' ? travelDate : 'Ride Now');

export default function IntercityVehicleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {settings} = useSettings();
  const {
    fromCity,
    toCity,
    tripType: initialTripType,
    date: initialDate,
    rideMode: initialRideMode,
    selectedPackages = [],
    pickupAddress = '',
    pickupCoords = null,
  } = route.params || {};

  const [tripType, setTripType] = useState(initialTripType || 'One Way');
  const [rideMode, setRideMode] = useState(initialRideMode || 'now');
  const [travelDate, setTravelDate] = useState(() =>
    initialRideMode === 'schedule' && initialDate && initialDate !== 'Ride Now' ? new Date(initialDate) : new Date(),
  );
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (initialRideMode === 'schedule' && route.params?.scheduledAt) return new Date(route.params.scheduledAt);
    return new Date(Date.now() + 60 * 60 * 1000);
  });
  const [passengers, setPassengers] = useState(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  const minTravelDate = useMemo(() => new Date(), []);
  const maxTravelDate = useMemo(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), []);
  const minScheduledAt = useMemo(() => new Date(Date.now() + 60 * 60 * 1000), []);
  const maxScheduledAt = useMemo(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), []);

  const vehicles = useMemo(
    () => selectedPackages.flatMap(pkg => (Array.isArray(pkg.vehicles) ? pkg.vehicles : []).map((vehicle, index) => normalizeVehicleEntry(pkg, vehicle, index))),
    [selectedPackages],
  );

  useEffect(() => {
    if (!selectedVehicleId && vehicles.length) setSelectedVehicleId(vehicles[0].id);
  }, [selectedVehicleId, vehicles]);

  const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId) || vehicles[0] || null, [selectedVehicleId, vehicles]);

  useEffect(() => {
    if (!fromCity || !toCity) navigation.replace('IntercityHome');
  }, [fromCity, toCity, navigation]);

  useEffect(() => {
    if (!selectedVehicle) return;
    setPassengers(current => Math.min(Math.max(current, 1), selectedVehicle.seats));
  }, [selectedVehicle]);

  if (!fromCity || !toCity) return null;

  const finalFare = selectedVehicle ? calculateFare(selectedVehicle, tripType) : 0;
  const configuredBidStepAmount = toConfiguredPositiveInteger(settings?.bidRide?.bidding_amount_increase_or_decrease, DEFAULT_BID_STEP_AMOUNT);
  const configuredBidHighPercentage = clampPercentage(settings?.bidRide?.user_bidding_high_percentage, DEFAULT_BID_HEADROOM_PERCENT);

  const handleContinue = () => {
    if (!selectedVehicle) return;

    if (rideMode === 'schedule') {
      if (scheduledAt.getTime() <= Date.now() + 60 * 1000) {
        setScheduleError('Schedule time must be at least 1 minute ahead.');
        return;
      }
      if (travelDate > maxTravelDate) {
        setScheduleError('Advance booking is available for up to 7 days only.');
        return;
      }
    }
    setScheduleError('');

    navigation.navigate('IntercityDetails', {
      fromCity,
      toCity,
      tripType,
      rideMode,
      date: getDisplayDate(rideMode, toDateInputValue(travelDate)),
      travelDate: toDateInputValue(travelDate),
      scheduledAt: rideMode === 'schedule' ? scheduledAt.toISOString() : null,
      selectedPackages,
      pickupAddress,
      pickupCoords,
      distance: 0,
      vehicle: selectedVehicle,
      passengers,
      fare: finalFare,
      baseFare: finalFare,
      bookingMode: selectedVehicle.supportsBidding ? 'bidding' : 'normal',
      bidStepAmount: configuredBidStepAmount,
      userMaxBidFare: selectedVehicle.supportsBidding
        ? calculateDefaultBidCeiling(finalFare, configuredBidStepAmount, configuredBidHighPercentage)
        : finalFare,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 py-4 border-b border-slate-200 bg-white flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full border border-slate-200 bg-white items-center justify-center">
          <ArrowLeft size={18} color="#334155" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs font-medium text-slate-500">Intercity booking</Text>
          <Text className="text-lg font-semibold text-slate-900" numberOfLines={1}>{toCity}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 140, gap: 16}}>
        <View className="rounded-3xl border border-slate-200 bg-white p-5">
          <View className="flex-row items-start justify-between gap-3">
            <View>
              <Text className="text-sm font-medium text-slate-500">Route</Text>
              <Text className="mt-1 text-xl font-semibold text-slate-900">{fromCity} to {toCity}</Text>
            </View>
            <View className="rounded-full bg-blue-50 px-3 py-1">
              <Text className="text-xs font-medium text-blue-700">{selectedPackages.length} package{selectedPackages.length === 1 ? '' : 's'}</Text>
            </View>
          </View>
          {!!pickupAddress && (
            <View className="mt-4 flex-row items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3">
              <MapPin size={16} color="#2563eb" />
              <Text className="flex-1 text-sm text-slate-600" numberOfLines={2}>{pickupAddress}</Text>
            </View>
          )}
        </View>

        <View className="rounded-3xl border border-slate-200 bg-white p-5">
          <Text className="text-base font-semibold text-slate-900">Trip details</Text>
          <Text className="mt-1 text-sm text-slate-500">Choose how and when this trip should run.</Text>

          <View className="mt-4 flex-row gap-3">
            {['One Way', 'Round Trip'].map(type => (
              <Pressable
                key={type}
                onPress={() => setTripType(type)}
                className="flex-1 rounded-2xl border px-4 py-3"
                style={{borderColor: tripType === type ? '#2563eb' : '#e2e8f0', backgroundColor: tripType === type ? '#eff6ff' : '#fff'}}>
                <Text className="text-center text-sm font-medium" style={{color: tripType === type ? '#1d4ed8' : '#334155'}}>{type}</Text>
              </Pressable>
            ))}
          </View>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() => setRideMode('now')}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border px-4 py-3"
              style={{borderColor: rideMode === 'now' ? '#2563eb' : '#e2e8f0', backgroundColor: rideMode === 'now' ? '#eff6ff' : '#fff'}}>
              <Clock3 size={16} color={rideMode === 'now' ? '#1d4ed8' : '#334155'} />
              <Text className="text-sm font-medium" style={{color: rideMode === 'now' ? '#1d4ed8' : '#334155'}}>Ride now</Text>
            </Pressable>
            <Pressable
              onPress={() => setRideMode('schedule')}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border px-4 py-3"
              style={{borderColor: rideMode === 'schedule' ? '#2563eb' : '#e2e8f0', backgroundColor: rideMode === 'schedule' ? '#eff6ff' : '#fff'}}>
              <Calendar size={16} color={rideMode === 'schedule' ? '#1d4ed8' : '#334155'} />
              <Text className="text-sm font-medium" style={{color: rideMode === 'schedule' ? '#1d4ed8' : '#334155'}}>Schedule</Text>
            </Pressable>
          </View>

          {rideMode === 'schedule' && (
            <View className="mt-4">
              <Text className="mb-2 text-sm font-medium text-slate-700">Travel date</Text>
              <DateTimePickerField mode="date" value={travelDate} minimumDate={minTravelDate} maximumDate={maxTravelDate} onChange={date => { setTravelDate(date); setScheduleError(''); }}>
                {open => (
                  <Pressable onPress={open} className="flex-row h-12 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4">
                    <Text className="text-sm text-slate-900">{toDateInputValue(travelDate)}</Text>
                    <Calendar size={16} color="#94a3b8" />
                  </Pressable>
                )}
              </DateTimePickerField>

              <Text className="mb-2 mt-4 text-sm font-medium text-slate-700">Pickup time</Text>
              <DateTimePickerField mode="datetime" value={scheduledAt} minimumDate={minScheduledAt} maximumDate={maxScheduledAt} onChange={date => { setScheduledAt(date); setScheduleError(''); }}>
                {open => (
                  <Pressable onPress={open} className="flex-row h-12 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4">
                    <Text className="text-sm text-slate-900">{scheduledAt.toLocaleString('en-IN', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'})}</Text>
                    <Clock3 size={16} color="#94a3b8" />
                  </Pressable>
                )}
              </DateTimePickerField>

              {!!scheduleError ? (
                <Text className="mt-2 text-sm font-medium text-rose-500">{scheduleError}</Text>
              ) : (
                <Text className="mt-2 text-xs text-slate-500">Drivers will be notified automatically around this scheduled time.</Text>
              )}
            </View>
          )}

          <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <View className="flex-row items-center gap-2">
              <Users size={16} color="#64748b" />
              <View>
                <Text className="text-sm font-medium text-slate-900">Passengers</Text>
                <Text className="text-xs text-slate-500">Up to {selectedVehicle?.seats || 1} seats</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => setPassengers(c => Math.max(1, c - 1))} className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white">
                <Text className="text-lg text-slate-700">-</Text>
              </Pressable>
              <Text className="w-8 text-center text-base font-semibold text-slate-900">{passengers}</Text>
              <Pressable onPress={() => setPassengers(c => Math.min(selectedVehicle?.seats || 1, c + 1))} className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white">
                <Text className="text-lg text-slate-700">+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-base font-semibold text-slate-900">Choose vehicle</Text>
          <Text className="text-sm text-slate-500">Only vehicles mapped to this package are shown.</Text>

          {vehicles.length === 0 ? (
            <View className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 items-center">
              <Info size={20} color="#94a3b8" />
              <Text className="mt-3 text-sm font-medium text-slate-900">No vehicles available</Text>
              <Text className="mt-1 text-sm text-slate-500">Try another destination or package.</Text>
            </View>
          ) : (
            vehicles.map(vehicle => {
              const vehicleFare = calculateFare(vehicle, tripType);
              const isActive = selectedVehicleId === vehicle.id;
              return (
                <Pressable
                  key={vehicle.id}
                  onPress={() => {
                    setSelectedVehicleId(vehicle.id);
                    if (passengers > vehicle.seats) setPassengers(vehicle.seats);
                  }}
                  className="rounded-3xl border p-4"
                  style={{borderColor: isActive ? '#2563eb' : '#e2e8f0', backgroundColor: isActive ? '#eff6ff' : '#fff'}}>
                  <View className="flex-row items-center gap-4">
                    <View className="h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
                      <VehicleIcon name={vehicle.iconType} size={30} color="#0f172a" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>{vehicle.name}</Text>
                          <Text className="mt-1 text-sm text-slate-500">{vehicle.seats} seats · {vehicle.packageTypeName}</Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-lg font-semibold text-slate-900">Rs {vehicleFare.toLocaleString('en-IN')}</Text>
                          <Text className="text-xs text-slate-500">estimated</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-5 py-4">
        <View className="flex-row items-center justify-between gap-4">
          <View>
            <Text className="text-xs font-medium text-slate-500">{tripType} · {getDisplayDate(rideMode, toDateInputValue(travelDate))}</Text>
            <Text className="mt-1 text-xl font-semibold text-slate-900">Rs {finalFare.toLocaleString('en-IN')}</Text>
          </View>
          <Pressable
            onPress={handleContinue}
            disabled={!selectedVehicle}
            className="flex-row h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5"
            style={{opacity: selectedVehicle ? 1 : 0.5}}>
            <Text className="text-sm font-medium text-white">Continue</Text>
            <ChevronRight size={16} color="#fff" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
