/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/ride/SelectVehicle.jsx
 * (2,810 lines on the web). Kept 1:1: vehicle-type loading, zone-aware
 * pricing-rule matching, the exact fare formula, driver-availability badges,
 * and promo-code validation (src/utils/taxiPricing.js has the pure parts).
 *
 * Deliberately out of scope for this pass (flagged, not silently dropped):
 *  - Bidding (rider-proposed fare) — every vehicle books instantly at the
 *    calculated fare instead of opening a negotiation modal.
 *  - "Schedule for later" — only immediate booking; scheduling needs a
 *    date/time picker dependency this pass doesn't pull in.
 *  - The animated live nearby-driver map overlay — pure visual polish, not
 *    load-bearing for booking a ride.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, Modal, Pressable, SafeAreaView, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, Banknote, Check, CreditCard, TicketPercent, Users, X} from 'lucide-react-native';

import api from '../../services/taxi/axiosInstance';
import {userService} from '../../services/taxi/userService';
import {GOOGLE_MAPS_API_KEY} from '../../services/api/config';
import VehicleIcon from '../../components/taxi/VehicleIcon';
import {
  calculateDistanceMeters,
  calculateEstimatedFare,
  estimateDurationMinutes,
  findBestPricingRule,
  formatCurrency,
  formatDistanceLabel,
  formatPromoSummary,
  getSetPricePaginationMeta,
  getSetPriceRows,
  getVehicleTypes,
  isPointInPolygon,
  isZoneActive,
  normalizeVehicleType,
  normalizeZonePath,
  resolveRideTransportType,
  unwrap,
} from '../../utils/taxiPricing';

const PAYMENT_OPTIONS = [
  {id: 'cash', stateValue: 'Cash', label: 'Cash', sub: 'Pay after ride', Icon: Banknote},
  {id: 'online', stateValue: 'Online Payment', label: 'Online Payment', sub: 'UPI, Cards or Wallets', Icon: CreditCard},
];

async function fetchDrivingRoute(origin, destination) {
  if (!GOOGLE_MAPS_API_KEY) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const body = await res.json();
    const leg = body?.routes?.[0]?.legs?.[0];
    if (!leg) return null;
    return {distanceMeters: leg.distance?.value || 0, durationMinutes: Math.max(1, Math.round((leg.duration?.value || 0) / 60))};
  } catch {
    return null;
  }
}

export default function SelectVehicleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};

  const pickupCoords = params.pickupCoords;
  const dropCoords = params.dropCoords;
  const zoneId = params.zone_id || '';
  const serviceLocationId = params.service_location_id || '';
  const resolvedTransportType = resolveRideTransportType(params.transport_type, params.transportType, 'taxi');

  const [vehicles, setVehicles] = useState([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [pricingRules, setPricingRules] = useState([]);
  const [tripMetrics, setTripMetrics] = useState({
    distanceMeters: calculateDistanceMeters(pickupCoords, dropCoords),
    durationMinutes: estimateDurationMinutes(calculateDistanceMeters(pickupCoords, dropCoords)),
  });
  const [availabilityByVehicleId, setAvailabilityByVehicleId] = useState({});
  const [selectedId, setSelectedId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [availablePromos, setAvailablePromos] = useState([]);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoFeedback, setPromoFeedback] = useState('');
  const [promoError, setPromoError] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);

  // Vehicle types, filtered to this ride's category if the home screen passed one.
  useEffect(() => {
    let active = true;
    (async () => {
      setIsLoadingVehicles(true);
      try {
        const response = await api.get('/users/vehicle-types');
        if (!active) return;
        const categoryFilter = String(params.selectedCategory || params.vehicleType || '').trim().toLowerCase();
        let next = getVehicleTypes(response)
          .filter(type => {
            const isActive = type.active !== false && Number(type.status ?? 1) !== 0;
            const transportType = String(type.transport_type || 'taxi').toLowerCase();
            return isActive && (transportType === 'taxi' || transportType === 'both');
          })
          .map(normalizeVehicleType);

        if (categoryFilter) {
          const filtered = next.filter(v => v.category === categoryFilter);
          if (filtered.length) next = filtered;
        }

        setVehicles(next);
        if (next.length && !selectedId) setSelectedId(next[0].id);
      } catch {
        if (active) setVehicles([]);
      } finally {
        if (active) setIsLoadingVehicles(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pricing rules for this transport type.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const aggregated = [];
        let page = 1;
        let lastPage = 1;
        do {
          const response = await api.get('/users/set-prices', {
            params: {scope: 'ride', page, limit: 100, transport_type: resolvedTransportType},
          });
          if (!active) return;
          aggregated.push(...getSetPriceRows(response));
          lastPage = getSetPricePaginationMeta(response).lastPage;
          page += 1;
        } while (page <= lastPage);
        if (active) setPricingRules(aggregated);
      } catch {
        if (active) setPricingRules([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [resolvedTransportType]);

  // Real driving distance/duration (falls back to the haversine estimate already seeded above).
  useEffect(() => {
    if (!Array.isArray(dropCoords) || !Array.isArray(pickupCoords)) return;
    let active = true;
    (async () => {
      const result = await fetchDrivingRoute(
        {lat: pickupCoords[1], lng: pickupCoords[0]},
        {lat: dropCoords[1], lng: dropCoords[0]},
      );
      if (active && result) setTripMetrics(result);
    })();
    return () => {
      active = false;
    };
  }, [pickupCoords, dropCoords]);

  // Driver availability per vehicle.
  useEffect(() => {
    if (!vehicles.length || !Array.isArray(pickupCoords)) return;
    let active = true;
    (async () => {
      try {
        const entries = await Promise.all(
          vehicles.map(async vehicle => {
            const response = await api.get('/rides/available-drivers', {
              params: {
                vehicleTypeId: vehicle.vehicleTypeId,
                vehicleIconType: vehicle.iconType,
                lng: pickupCoords[0],
                lat: pickupCoords[1],
                service_location_id: serviceLocationId,
                transport_type: vehicle.transportType || resolvedTransportType,
              },
            });
            return [vehicle.id, unwrap(response)];
          }),
        );
        if (active) setAvailabilityByVehicleId(Object.fromEntries(entries));
      } catch {
        // availability badges are a nice-to-have; silently keep showing fares
      }
    })();
    return () => {
      active = false;
    };
  }, [vehicles, pickupCoords, serviceLocationId, resolvedTransportType]);

  const pricedVehicles = useMemo(
    () =>
      vehicles.map(vehicle => {
        const pricingRule = findBestPricingRule({
          rules: pricingRules,
          vehicleTypeId: vehicle.vehicleTypeId,
          zoneId,
          serviceLocationId,
          transportType: resolveRideTransportType(resolvedTransportType, vehicle.transportType),
        });
        return {
          ...vehicle,
          price: calculateEstimatedFare({vehicle, pricingRule, distanceMeters: tripMetrics.distanceMeters, durationMinutes: tripMetrics.durationMinutes}),
        };
      }),
    [vehicles, pricingRules, zoneId, serviceLocationId, resolvedTransportType, tripMetrics],
  );

  const selectedVehicle = pricedVehicles.find(v => v.id === selectedId) || pricedVehicles[0] || null;

  useEffect(() => {
    setAppliedPromo(null);
    setPromoFeedback('');
    setPromoError('');
  }, [selectedId]);

  const openCouponModal = async () => {
    setShowCouponModal(true);
    try {
      const response = await userService.getAvailablePromos({service_location_id: serviceLocationId, transport_type: resolvedTransportType});
      setAvailablePromos(unwrap(response)?.promos || unwrap(response) || []);
    } catch {
      setAvailablePromos([]);
    }
  };

  const applyPromoCode = async rawCode => {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!selectedVehicle || !code) {
      setPromoError('Enter a coupon code.');
      return false;
    }
    setApplyingPromo(true);
    setPromoError('');
    try {
      const response = await userService.validatePromo({
        code,
        fare: Number(selectedVehicle.price || 0),
        service_location_id: serviceLocationId,
        transport_type: resolvedTransportType,
      });
      const payload = unwrap(response);
      if (!payload?.eligible) {
        setAppliedPromo(null);
        setPromoError(payload?.message || 'This coupon is not valid for this ride.');
        return false;
      }
      setAppliedPromo(payload);
      setPromoCodeInput(code);
      setPromoFeedback(`${code} applied. You save ${formatCurrency(payload?.breakdown?.discount_amount || 0)}.`);
      return true;
    } catch (error) {
      setAppliedPromo(null);
      setPromoError(error?.response?.data?.message || error?.message || 'Could not apply this coupon right now.');
      return false;
    } finally {
      setApplyingPromo(false);
    }
  };

  const proceedToBooking = () => {
    if (!selectedVehicle) return;
    const baseFare = Number(selectedVehicle.price || 0);
    const finalFare = appliedPromo?.breakdown?.fare_after_discount ?? baseFare;

    navigation.navigate('SearchingDriver', {
      pickup: params.pickup,
      drop: params.drop,
      pickupCoords,
      dropCoords,
      zone_id: zoneId,
      service_location_id: serviceLocationId,
      transport_type: resolvedTransportType,
      vehicle: selectedVehicle,
      vehicleTypeId: selectedVehicle.vehicleTypeId,
      vehicleIconType: selectedVehicle.iconType,
      paymentMethod,
      fare: finalFare,
      baseFare,
      promo_code: appliedPromo?.promo?.code || '',
      promoBreakdown: appliedPromo?.breakdown || null,
      bookingMode: 'normal',
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-slate-100">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#0f172a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-sm font-extrabold text-slate-900" numberOfLines={1}>
            {params.drop || 'Choose a ride'}
          </Text>
          <Text className="text-[11px] text-slate-500" numberOfLines={1}>
            {formatDistanceLabel(tripMetrics.distanceMeters)} • ~{tripMetrics.durationMinutes} min
          </Text>
        </View>
      </View>

      {isLoadingVehicles ? (
        <ActivityIndicator className="py-10" />
      ) : (
        <FlatList
          data={pricedVehicles}
          keyExtractor={v => v.id}
          contentContainerStyle={{paddingBottom: 16}}
          renderItem={({item}) => {
            const availability = availabilityByVehicleId[item.id];
            const isAvailable = !availability || (availability.totalDrivers ?? 1) > 0;
            const isSelected = item.id === selectedId;
            return (
              <Pressable
                onPress={() => setSelectedId(item.id)}
                className={`flex-row items-center gap-3 px-4 py-3 mx-3 my-1 rounded-2xl border ${isSelected ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}>
                <View className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
                  <VehicleIcon name={item.category} size={22} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[14px] font-extrabold text-slate-900">{item.name}</Text>
                    <Users size={12} color="#94a3b8" />
                    <Text className="text-[11px] text-slate-500">{item.capacity}</Text>
                  </View>
                  <Text className="text-[11px] text-slate-500 mt-0.5" numberOfLines={1}>
                    {item.sublabel}
                  </Text>
                  {!isAvailable && <Text className="text-[10px] font-bold text-rose-500 mt-0.5">Not available right now</Text>}
                </View>
                <Text className="text-[15px] font-black text-slate-900">{formatCurrency(item.price)}</Text>
              </Pressable>
            );
          }}
        />
      )}

      <View className="px-4 py-3 border-t border-slate-100 gap-2">
        <View className="flex-row gap-2">
          <Pressable onPress={() => setShowPaymentModal(true)} className="flex-1 flex-row items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5">
            {paymentMethod === 'Cash' ? <Banknote size={16} color="#059669" /> : <CreditCard size={16} color="#2563eb" />}
            <Text className="text-[12px] font-bold text-slate-800 flex-1" numberOfLines={1}>
              {paymentMethod}
            </Text>
          </Pressable>
          <Pressable onPress={openCouponModal} className="flex-1 flex-row items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5">
            <TicketPercent size={16} color="#d97706" />
            <Text className="text-[12px] font-bold text-slate-800 flex-1" numberOfLines={1}>
              {appliedPromo?.promo?.code || 'Apply coupon'}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={proceedToBooking} disabled={!selectedVehicle} className="bg-[#0a3a22] rounded-xl py-3.5 items-center">
          <Text className="text-white font-black text-sm">
            {selectedVehicle ? `Book ${selectedVehicle.name} • ${formatCurrency(appliedPromo?.breakdown?.fare_after_discount ?? selectedVehicle.price)}` : 'Select a vehicle'}
          </Text>
        </Pressable>
      </View>

      {/* Payment method modal */}
      <Modal visible={showPaymentModal} transparent animationType="fade" onRequestClose={() => setShowPaymentModal(false)}>
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShowPaymentModal(false)}>
          <Pressable className="bg-white rounded-t-3xl p-4" onPress={() => {}}>
            <Text className="text-base font-extrabold text-slate-900 mb-3">Payment method</Text>
            {PAYMENT_OPTIONS.map(option => (
              <Pressable
                key={option.id}
                onPress={() => {
                  setPaymentMethod(option.stateValue);
                  setShowPaymentModal(false);
                }}
                className="flex-row items-center gap-3 py-3 border-b border-slate-50">
                <option.Icon size={20} color="#0f172a" />
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-slate-900">{option.label}</Text>
                  <Text className="text-[11px] text-slate-500">{option.sub}</Text>
                </View>
                {paymentMethod === option.stateValue && <Check size={16} color="#059669" />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Coupon modal */}
      <Modal visible={showCouponModal} transparent animationType="fade" onRequestClose={() => setShowCouponModal(false)}>
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShowCouponModal(false)}>
          <Pressable className="bg-white rounded-t-3xl p-4" style={{maxHeight: '75%'}} onPress={() => {}}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-extrabold text-slate-900">Apply coupon</Text>
              <Pressable onPress={() => setShowCouponModal(false)}>
                <X size={18} color="#475569" />
              </Pressable>
            </View>

            <View className="flex-row gap-2 mb-2">
              <TextInput
                value={promoCodeInput}
                onChangeText={setPromoCodeInput}
                placeholder="Enter coupon code"
                autoCapitalize="characters"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] font-semibold"
              />
              <Pressable
                onPress={() => applyPromoCode(promoCodeInput)}
                disabled={applyingPromo}
                className="bg-[#0a3a22] rounded-xl px-4 items-center justify-center">
                {applyingPromo ? <ActivityIndicator color="#fff" size="small" /> : <Text className="text-white font-bold text-xs">Apply</Text>}
              </Pressable>
            </View>
            {!!promoFeedback && <Text className="text-[12px] font-semibold text-emerald-600 mb-2">{promoFeedback}</Text>}
            {!!promoError && <Text className="text-[12px] font-semibold text-rose-500 mb-2">{promoError}</Text>}

            <FlatList
              data={availablePromos}
              keyExtractor={(item, idx) => item.code || idx}
              renderItem={({item}) => (
                <Pressable onPress={() => applyPromoCode(item.code)} className="flex-row items-center justify-between py-3 border-b border-slate-50">
                  <View className="flex-1">
                    <Text className="text-[13px] font-extrabold text-slate-900">{item.code}</Text>
                    <Text className="text-[11px] text-slate-500">{formatPromoSummary(item)}</Text>
                  </View>
                  <Text className="text-[11px] font-bold text-amber-600">Apply</Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
