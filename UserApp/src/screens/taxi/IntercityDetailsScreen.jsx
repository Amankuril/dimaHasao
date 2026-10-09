/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/intercity/IntercityDetails.jsx.
 *
 * Adapted for RN: Autocomplete/GoogleMap become the same REST-call +
 * react-native-maps pattern used in IntercityHomeScreen/SelectLocationScreen.
 * Dropped the web's toHistorySafeState Proxy-unwrapping workaround — that
 * existed only because browser history.pushState runs values through
 * structuredClone, which React Navigation's in-memory route params never do.
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import MapView, {PROVIDER_GOOGLE} from 'react-native-maps';
import {ArrowLeft, Check, ChevronRight, LoaderCircle, MapPin, MapPinned, ShieldCheck} from 'lucide-react-native';

import api from '../../services/taxi/axiosInstance';
import {fetchAutocomplete, reverseGeocode, resolvePlaceSelection} from '../../utils/googlePlaces';
import {getCityCenter, getCityCoords} from '../../constants/intercityCityCenters';
import {generateIntercityBookingId, generateSearchNonce} from '../../utils/intercityIds';

const unwrapApiPayload = response => response?.data?.data || response?.data || response || {};

export default function IntercityDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const state = route.params || {};
  const {fromCity, toCity, vehicle} = state;

  const [pickup, setPickup] = useState(state.pickupAddress || '');
  const [drop, setDrop] = useState('');
  const [pickupCoords, setPickupCoords] = useState(state.pickupCoords || null);
  const [dropCoords, setDropCoords] = useState(null);

  const [activeField, setActiveField] = useState(null); // 'pickup' | 'drop' | null — which field has focus/suggestions open
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [activeMapField, setActiveMapField] = useState('pickup');
  const [mapRegion, setMapRegion] = useState(null);
  const [pickedAddress, setPickedAddress] = useState('Move the map to choose a location');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [liveDriverCount, setLiveDriverCount] = useState(0);
  const [isFetchingDrivers, setIsFetchingDrivers] = useState(false);
  const [driverFetchError, setDriverFetchError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isProceeding, setIsProceeding] = useState(false);

  const mapCenterRef = useRef(null);
  const sessionTokenRef = useRef(String(Date.now()));

  const serviceLocationId = useMemo(
    () => state.serviceLocationId || state.selectedPackages?.[0]?.serviceLocationId || '',
    [state.serviceLocationId, state.selectedPackages],
  );

  const effectivePickupCoords = useMemo(
    () => pickupCoords || state.pickupCoords || getCityCoords(fromCity),
    [fromCity, pickupCoords, state.pickupCoords],
  );

  useEffect(() => {
    if (!fromCity || !vehicle) navigation.replace('IntercityHome');
  }, [fromCity, vehicle, navigation]);

  useEffect(() => {
    let active = true;
    const loadNearbyDrivers = async () => {
      if (!vehicle?.vehicleTypeId || !Array.isArray(effectivePickupCoords)) {
        if (active) {
          setLiveDriverCount(0);
          setDriverFetchError('');
          setIsFetchingDrivers(false);
        }
        return;
      }
      try {
        if (active) {
          setIsFetchingDrivers(true);
          setDriverFetchError('');
        }
        const response = await api.get('/rides/available-drivers', {
          params: {
            vehicleTypeId: vehicle.vehicleTypeId,
            vehicleIconType: vehicle.iconType || vehicle.name || 'car',
            lng: effectivePickupCoords[0],
            lat: effectivePickupCoords[1],
            service_location_id: serviceLocationId,
            transport_type: 'intercity',
          },
        });
        if (!active) return;
        const availability = unwrapApiPayload(response);
        setLiveDriverCount(Number(availability?.totalDrivers || 0));
      } catch (error) {
        if (!active) return;
        setLiveDriverCount(0);
        setDriverFetchError(error?.message || 'Could not fetch live driver availability.');
      } finally {
        if (active) setIsFetchingDrivers(false);
      }
    };
    loadNearbyDrivers();
    return () => {
      active = false;
    };
  }, [effectivePickupCoords, serviceLocationId, vehicle]);

  if (!fromCity || !vehicle) return null;

  const query = activeField === 'pickup' ? pickup : drop;

  useEffect(() => {
    if (!activeField || query.trim().length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      return undefined;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const center = getCityCenter(activeField === 'pickup' ? fromCity : toCity);
      const results = await fetchAutocomplete(query, sessionTokenRef.current, {center});
      setSuggestions(results);
      setIsSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, activeField, fromCity, toCity]);

  const selectSuggestion = async result => {
    const resolved = await resolvePlaceSelection(result);
    if (!Array.isArray(resolved?.coords)) return;
    if (activeField === 'pickup') {
      setPickup(resolved.address);
      setPickupCoords(resolved.coords);
    } else {
      setDrop(resolved.address);
      setDropCoords(resolved.coords);
    }
    setSuggestions([]);
    setActiveField(null);
    sessionTokenRef.current = String(Date.now());
  };

  const openMapPicker = field => {
    const savedCoords = field === 'pickup' ? pickupCoords : dropCoords;
    const savedAddress = field === 'pickup' ? pickup : drop;
    const cityCenter = getCityCenter(field === 'pickup' ? fromCity : toCity);
    const center = Array.isArray(savedCoords) ? {latitude: savedCoords[1], longitude: savedCoords[0]} : {latitude: cityCenter.lat, longitude: cityCenter.lng};

    setActiveMapField(field);
    mapCenterRef.current = center;
    setMapRegion({...center, latitudeDelta: 0.015, longitudeDelta: 0.015});
    setPickedAddress(savedAddress || (field === 'pickup' ? `${fromCity} location` : toCity));
    setActiveField(null);
    setShowMapPicker(true);
  };

  const handleMapRegionChangeComplete = region => {
    mapCenterRef.current = {latitude: region.latitude, longitude: region.longitude};
    setIsGeocoding(true);
    reverseGeocode(region.latitude, region.longitude).then(address => {
      setIsGeocoding(false);
      setPickedAddress(address);
    });
  };

  const handleConfirmMapLocation = () => {
    const center = mapCenterRef.current;
    const coords = [center.longitude, center.latitude];
    if (activeMapField === 'pickup') {
      setPickup(pickedAddress);
      setPickupCoords(coords);
    } else {
      setDrop(pickedAddress);
      setDropCoords(coords);
    }
    setShowMapPicker(false);
  };

  const handleContinue = async () => {
    if (!pickup.trim() || !drop.trim()) {
      setValidationError(
        !pickup.trim() && !drop.trim()
          ? 'Enter your exact pickup and drop addresses to continue.'
          : !pickup.trim()
          ? 'Enter your exact pickup address to continue.'
          : 'Enter your exact drop address to continue.',
      );
      return;
    }
    setValidationError('');

    const nextPickupCoords = pickupCoords || getCityCoords(fromCity);
    const nextDropCoords = dropCoords || getCityCoords(toCity);
    const bookingId = state.bookingId || generateIntercityBookingId();
    let availabilitySnapshot = {totalDrivers: liveDriverCount, fetchedAt: new Date().toISOString()};

    if (vehicle?.vehicleTypeId && Array.isArray(nextPickupCoords)) {
      try {
        setIsProceeding(true);
        setDriverFetchError('');
        const response = await api.get('/rides/available-drivers', {
          params: {
            vehicleTypeId: vehicle.vehicleTypeId,
            vehicleIconType: vehicle.iconType || vehicle.name || 'car',
            lng: nextPickupCoords[0],
            lat: nextPickupCoords[1],
            service_location_id: serviceLocationId,
            transport_type: 'intercity',
          },
        });
        const availability = unwrapApiPayload(response) || {};
        availabilitySnapshot = {...availability, totalDrivers: Number(availability?.totalDrivers || 0), fetchedAt: new Date().toISOString()};
        setLiveDriverCount(Number(availability?.totalDrivers || 0));
      } catch (error) {
        setDriverFetchError(error?.message || 'Could not fetch live driver availability.');
      } finally {
        setIsProceeding(false);
      }
    }

    const nextState = {
      ...state,
      bookingId,
      pickup,
      drop,
      pickupCoords: nextPickupCoords,
      dropCoords: nextDropCoords,
      searchNonce: generateSearchNonce(),
      vehicleTypeId: vehicle.vehicleTypeId || '',
      vehicleIconType: vehicle.iconType || vehicle.name || 'car',
      vehicleIconUrl: vehicle.vehicleIconUrl || vehicle.icon || '',
      paymentMethod: 'Cash',
      serviceType: 'intercity',
      transport_type: 'intercity',
      bookingMode: vehicle.supportsBidding ? 'bidding' : state.bookingMode || 'normal',
      bidStepAmount: Number(state.bidStepAmount || 10),
      userMaxBidFare: vehicle.supportsBidding ? Number(state.userMaxBidFare || state.fare || 0) : Number(state.fare || 0),
      intercity: {
        bookingId,
        fromCity,
        toCity,
        tripType: state.tripType || 'One Way',
        travelDate: state.date || 'Ride Now',
        passengers: state.passengers || 1,
        distance: Number(state.distance || 0),
        vehicleName: vehicle.name || vehicle.id || 'Intercity Cab',
        packageId: vehicle.packageId || '',
        packageTypeName: vehicle.packageTypeName || 'Intercity',
      },
      driverAvailability: availabilitySnapshot,
    };

    if (state.rideMode === 'schedule' && state.scheduledAt) {
      navigation.navigate('IntercityConfirm', nextState);
      return;
    }
    navigation.navigate('SearchingDriver', nextState);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFBFF]">
      <View className="px-5 py-4 border-b border-indigo-50 bg-white flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()} className="w-10 h-10 rounded-2xl bg-white border border-slate-100 items-center justify-center">
          <ArrowLeft size={20} color="#0f172a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[18px] font-black text-slate-900">Location Details</Text>
          <Text className="text-[11px] font-bold text-slate-400 uppercase" numberOfLines={1}>{fromCity} → {toCity}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 160}} keyboardShouldPersistTaps="handled">
        <View className="bg-white rounded-[28px] p-5 border border-indigo-50">
          <View className="mb-6">
            <Text className="text-[11px] font-black text-blue-600 uppercase mb-2">Pickup in {fromCity}</Text>
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-blue-50 border-2 border-blue-100 items-center justify-center">
                <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              </View>
              <TextInput
                value={pickup}
                onChangeText={text => {
                  setPickup(text);
                  setPickupCoords(null);
                  setValidationError('');
                }}
                onFocus={() => setActiveField('pickup')}
                placeholder="Building, street name, etc."
                className="flex-1 h-14 bg-slate-50 rounded-2xl px-4 text-[15px] font-bold text-slate-900"
              />
            </View>
            {activeField === 'pickup' && (suggestions.length > 0 || isSearching) && (
              <View className="ml-11 mt-2 rounded-2xl border border-slate-100 bg-white">
                {isSearching && (
                  <View className="flex-row items-center gap-2 px-3 py-2">
                    <LoaderCircle size={14} color="#3b82f6" />
                    <Text className="text-[12px] text-slate-500">Searching...</Text>
                  </View>
                )}
                {suggestions.map(result => (
                  <Pressable key={result.placeId || result.title} onPress={() => selectSuggestion(result)} className="px-3 py-2.5 border-b border-slate-50">
                    <Text className="text-[13px] font-black text-slate-900" numberOfLines={1}>{result.title}</Text>
                    <Text className="text-[11px] text-slate-500" numberOfLines={1}>{result.address}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable onPress={() => openMapPicker('pickup')} className="ml-11 mt-3 flex-row items-center gap-2 self-start rounded-xl bg-blue-50 px-4 py-2">
              <MapPinned size={14} color="#1d4ed8" />
              <Text className="text-[12px] font-black text-blue-700">Map Selection</Text>
            </Pressable>
          </View>

          <View>
            <Text className="text-[11px] font-black text-indigo-600 uppercase mb-2">Drop in {toCity}</Text>
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-full bg-indigo-50 border-2 border-indigo-100 items-center justify-center">
                <MapPin size={14} color="#4338ca" />
              </View>
              <TextInput
                value={drop}
                onChangeText={text => {
                  setDrop(text);
                  setDropCoords(null);
                  setValidationError('');
                }}
                onFocus={() => setActiveField('drop')}
                placeholder="Station, mall, hotel name..."
                className="flex-1 h-14 bg-slate-50 rounded-2xl px-4 text-[15px] font-bold text-slate-900"
              />
            </View>
            {activeField === 'drop' && (suggestions.length > 0 || isSearching) && (
              <View className="ml-11 mt-2 rounded-2xl border border-slate-100 bg-white">
                {isSearching && (
                  <View className="flex-row items-center gap-2 px-3 py-2">
                    <LoaderCircle size={14} color="#3b82f6" />
                    <Text className="text-[12px] text-slate-500">Searching...</Text>
                  </View>
                )}
                {suggestions.map(result => (
                  <Pressable key={result.placeId || result.title} onPress={() => selectSuggestion(result)} className="px-3 py-2.5 border-b border-slate-50">
                    <Text className="text-[13px] font-black text-slate-900" numberOfLines={1}>{result.title}</Text>
                    <Text className="text-[11px] text-slate-500" numberOfLines={1}>{result.address}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable onPress={() => openMapPicker('drop')} className="ml-11 mt-3 flex-row items-center gap-2 self-start rounded-xl bg-indigo-50 px-4 py-2">
              <MapPinned size={14} color="#4338ca" />
              <Text className="text-[12px] font-black text-indigo-700">Map Selection</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-6 bg-slate-900 rounded-[28px] p-5 flex-row items-center gap-4">
          <View className="w-12 h-12 rounded-2xl bg-white/10 items-center justify-center border border-white/5">
            <ShieldCheck size={24} color="#60a5fa" />
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-black text-white">Doorstep Service</Text>
            <Text className="text-[11px] font-bold text-white/50 mt-1 uppercase">Exact locations help drivers navigate directly to you.</Text>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-3 bg-[#FAFBFF] border-t border-slate-100">
        <View className="mb-3 flex-row items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 border border-slate-100">
          <View>
            <Text className="text-[10px] font-black uppercase text-slate-400">Live Fetching</Text>
            <Text className="mt-1 text-[14px] font-black text-slate-900">
              {isFetchingDrivers ? 'Checking nearby drivers...' : `${liveDriverCount} drivers nearby`}
            </Text>
          </View>
          {isFetchingDrivers ? (
            <LoaderCircle size={18} color="#3b82f6" />
          ) : (
            <View className="rounded-full bg-blue-50 px-3 py-1">
              <Text className="text-[11px] font-black text-blue-700">Live</Text>
            </View>
          )}
        </View>
        {!!validationError && (
          <View className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <Text className="text-[12px] font-bold text-rose-600">{validationError}</Text>
          </View>
        )}
        {!!driverFetchError && (
          <View className="mb-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
            <Text className="text-[11px] font-bold text-rose-500">{driverFetchError}</Text>
          </View>
        )}
        <Pressable onPress={handleContinue} disabled={isProceeding} className="h-16 bg-blue-600 rounded-[22px] flex-row items-center justify-center gap-3">
          {isProceeding ? (
            <>
              <LoaderCircle size={20} color="#fff" />
              <Text className="text-white font-black text-[15px] uppercase">Fetching Drivers...</Text>
            </>
          ) : (
            <>
              <Text className="text-white font-black text-[15px] uppercase">Proceed to Live Tracking</Text>
              <ChevronRight size={20} color="#fff" />
            </>
          )}
        </Pressable>
      </View>

      <Modal visible={showMapPicker} animationType="slide" onRequestClose={() => setShowMapPicker(false)}>
        <SafeAreaView className="flex-1">
          <View className="px-5 pt-3 pb-4 border-b border-slate-50 flex-row items-center gap-3">
            <Pressable onPress={() => setShowMapPicker(false)} className="w-10 h-10 rounded-2xl bg-white border border-slate-100 items-center justify-center">
              <ArrowLeft size={20} color="#0f172a" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-[10px] font-black uppercase text-blue-600">{activeMapField === 'pickup' ? `Pickup in ${fromCity}` : `Drop in ${toCity}`}</Text>
              <Text className="text-[14px] font-bold text-slate-900" numberOfLines={1}>{isGeocoding ? 'Finding exact address...' : pickedAddress}</Text>
            </View>
          </View>

          <View className="flex-1 relative bg-slate-100">
            {mapRegion && (
              <MapView provider={PROVIDER_GOOGLE} style={{flex: 1}} initialRegion={mapRegion} onRegionChangeComplete={handleMapRegionChangeComplete} />
            )}
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
              {activeMapField === 'pickup' ? (
                <MapPinned size={40} color="#2563eb" style={{marginBottom: 40}} />
              ) : (
                <MapPin size={40} color="#4338ca" style={{marginBottom: 40}} />
              )}
            </View>
          </View>

          <View className="px-6 pt-5 pb-10 bg-white border-t border-indigo-50 gap-4">
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center border border-blue-100">
                <MapPin size={22} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-black text-slate-900">Confirm Spot</Text>
                <Text className="text-[12px] font-bold text-slate-400 mt-1" numberOfLines={1}>{pickedAddress}</Text>
              </View>
            </View>
            <Pressable onPress={handleConfirmMapLocation} disabled={isGeocoding} className="h-14 bg-blue-600 rounded-[20px] flex-row items-center justify-center gap-2">
              <Check size={18} color="#fff" />
              <Text className="text-white font-black text-[14px] uppercase">Confirm Location</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
