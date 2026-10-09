/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/intercity/IntercityHome.jsx.
 *
 * Adapted for RN: the Google Maps JS SDK's AutocompleteService/PlacesService/
 * Geocoder become direct Google Places/Geocoding REST calls (src/utils/googlePlaces.js);
 * the draggable GoogleMap picker becomes a react-native-maps MapView with a
 * fixed center pin + onRegionChangeComplete (same pattern as SelectLocationScreen);
 * the single <input type="datetime-local"> becomes DateTimePickerField.
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Linking, Modal, PermissionsAndroid, Pressable, SafeAreaView, ScrollView, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MapView, {PROVIDER_GOOGLE} from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Toast from 'react-native-toast-message';
import {ArrowLeft, ArrowUpDown, Calendar, Check, ChevronRight, LoaderCircle, MapPin, Navigation, Pencil, PhoneCall, Search, User, X} from 'lucide-react-native';

import userService from '../../services/taxi/userService';
import usePlatformSettings from '../../hooks/usePlatformSettings';
import {fetchAutocomplete, reverseGeocode, resolvePlaceSelection} from '../../utils/googlePlaces';
import {DISTRICT_CENTER} from '../../constants/intercityCityCenters';
import DateTimePickerField from '../../components/DateTimePickerField';

const normalizeSearchValue = value => String(value || '').trim().toLowerCase();

const serializePackageForFlow = (pkg = {}) => ({
  id: pkg.id || '',
  serviceLocationId: pkg.serviceLocationId || '',
  serviceLocationName: pkg.serviceLocationName || '',
  packageTypeId: pkg.packageTypeId || '',
  packageTypeName: pkg.packageTypeName || '',
  destination: pkg.destination || '',
  availability: pkg.availability || 'available',
  vehicles: Array.isArray(pkg.vehicles)
    ? pkg.vehicles.map((vehicle, index) => ({
        id: vehicle.id || `${pkg.id || 'pkg'}:${vehicle.vehicleTypeId || index}`,
        vehicleTypeId: vehicle.vehicleTypeId || '',
        vehicleName: vehicle.vehicleName || 'Vehicle',
        capacity: Number(vehicle.capacity || 0),
        icon: vehicle.icon || '',
        iconType: vehicle.iconType || vehicle.vehicleName || 'car',
        dispatchType: String(vehicle.dispatchType || 'normal').trim().toLowerCase(),
        supportsBidding: ['bidding', 'both'].includes(String(vehicle.dispatchType || 'normal').trim().toLowerCase()),
        basePrice: Number(vehicle.basePrice || 0),
        freeDistance: Number(vehicle.freeDistance || 0),
        distancePrice: Number(vehicle.distancePrice || 0),
        freeTime: Number(vehicle.freeTime || 0),
        timePrice: Number(vehicle.timePrice || 0),
        serviceTax: Number(vehicle.serviceTax || 0),
        cancellationFee: Number(vehicle.cancellationFee || 0),
      }))
    : [],
});

const pad = n => String(n).padStart(2, '0');
const toDateInputValue = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatDateToDDMMYYYY = date => `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
const formatTimeTo12Hour = date => {
  const h = date.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${pad(displayHour)}:${pad(date.getMinutes())} ${ampm}`;
};

async function requestLocationPermission() {
  try {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
      title: 'Location access',
      message: 'Dima Hasao needs your location to set your pickup point.',
      buttonPositive: 'Allow',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function reverseGeocodeWithCity(lat, lng) {
  const address = await reverseGeocode(lat, lng);
  return {address, cityName: ''};
}

export default function IntercityHomeScreen() {
  const navigation = useNavigation();
  const supportPhone = String(usePlatformSettings().supportPhone || '').trim();

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromCity, setFromCity] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);

  const [toCitySearch, setToCitySearch] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isToFocused, setIsToFocused] = useState(false);

  const [tripType, setTripType] = useState('One Way');
  const [travelDateTime, setTravelDateTime] = useState(() => new Date(Date.now() + 60 * 60 * 1000));

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [pickedAddress, setPickedAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isEditingPickup, setIsEditingPickup] = useState(false);
  const [mapSearchInput, setMapSearchInput] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [isSearchingMapLocations, setIsSearchingMapLocations] = useState(false);

  const mapCenterRef = useRef(null);
  const sessionTokenRef = useRef(String(Date.now()));

  useEffect(() => {
    (async () => {
      try {
        const response = await userService.getIntercityPackages();
        const payload = response?.data?.data || response?.data || response || {};
        const results = Array.isArray(payload?.results) ? payload.results : [];
        setPackages(results);
        if (results.length && !fromCity && results[0]?.serviceLocationName) {
          setFromCity(results[0].serviceLocationName);
        }
      } catch {
        setPackages([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredPackages = useMemo(() => {
    const query = normalizeSearchValue(toCitySearch);
    if (!query) return packages;
    return packages.filter(
      pkg =>
        normalizeSearchValue(pkg.destination).includes(query) ||
        normalizeSearchValue(pkg.packageTypeName).includes(query) ||
        normalizeSearchValue(pkg.serviceLocationName).includes(query),
    );
  }, [packages, toCitySearch]);

  const handleUseCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;
    setIsLocating(true);
    Geolocation.getCurrentPosition(
      position => {
        setIsLocating(false);
        const {latitude, longitude} = position.coords;
        const nextRegion = {latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01};
        mapCenterRef.current = {latitude, longitude};
        setMapRegion(nextRegion);
      },
      () => setIsLocating(false),
      {enableHighAccuracy: true, timeout: 15000},
    );
  };

  const handleOpenMapPicker = () => {
    const start = Array.isArray(pickupCoords)
      ? {latitude: pickupCoords[1], longitude: pickupCoords[0]}
      : {latitude: DISTRICT_CENTER.lat, longitude: DISTRICT_CENTER.lng};
    mapCenterRef.current = start;
    setMapRegion({...start, latitudeDelta: 0.01, longitudeDelta: 0.01});
    setMapSearchInput(pickupAddress || '');
    setMapSearchResults([]);
    setIsEditingPickup(false);
    setPickedAddress(pickupAddress || 'Move the map to choose a location');
    setShowMapPicker(true);
    if (!pickupAddress) {
      setIsGeocoding(true);
      reverseGeocodeWithCity(start.latitude, start.longitude).then(({address}) => {
        setIsGeocoding(false);
        setPickedAddress(address);
      });
    }
  };

  const handleMapRegionChangeComplete = region => {
    mapCenterRef.current = {latitude: region.latitude, longitude: region.longitude};
    setIsGeocoding(true);
    reverseGeocodeWithCity(region.latitude, region.longitude).then(({address}) => {
      setIsGeocoding(false);
      setPickedAddress(address);
    });
  };

  const handleEditPickup = () => {
    setIsEditingPickup(true);
    setMapSearchInput('');
    setMapSearchResults([]);
  };

  useEffect(() => {
    const trimmed = mapSearchInput.trim();
    if (!showMapPicker || !isEditingPickup || trimmed.length < 3) {
      setMapSearchResults([]);
      setIsSearchingMapLocations(false);
      return undefined;
    }
    setIsSearchingMapLocations(true);
    const timer = setTimeout(async () => {
      const center = mapCenterRef.current
        ? {lat: mapCenterRef.current.latitude, lng: mapCenterRef.current.longitude}
        : DISTRICT_CENTER;
      const results = await fetchAutocomplete(trimmed, sessionTokenRef.current, {center});
      setMapSearchResults(results);
      setIsSearchingMapLocations(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [mapSearchInput, isEditingPickup, showMapPicker]);

  const handleMapSearchSuggestionSelect = async result => {
    const resolved = await resolvePlaceSelection(result);
    if (!Array.isArray(resolved?.coords)) return;
    const [lng, lat] = resolved.coords;
    mapCenterRef.current = {latitude: lat, longitude: lng};
    setMapRegion({latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01});
    setPickedAddress(resolved.address);
    setMapSearchInput(resolved.address);
    setMapSearchResults([]);
    setIsEditingPickup(false);
    sessionTokenRef.current = String(Date.now());
  };

  const handleConfirmMapPickup = () => {
    const center = mapCenterRef.current;
    if (center) setPickupCoords([center.longitude, center.latitude]);
    setPickupAddress(pickedAddress);
    setShowMapPicker(false);
  };

  const handleSwapLocations = () => {
    if (!pickupAddress && !toCitySearch && !selectedPackage) return;
    const prevPickupAddress = pickupAddress;
    const prevFromCity = fromCity;
    const newPickup = selectedPackage?.destination || toCitySearch || '';
    setPickupAddress(newPickup);
    setPickupCoords(null);

    const newDest = prevPickupAddress || prevFromCity || '';
    setToCitySearch(newDest);

    const reversedPkg = packages.find(
      pkg =>
        pkg.serviceLocationName.toLowerCase().trim() === newPickup.toLowerCase().trim() &&
        pkg.destination.toLowerCase().trim() === newDest.toLowerCase().trim(),
    );
    if (reversedPkg) {
      setSelectedPackage(reversedPkg);
      setFromCity(reversedPkg.serviceLocationName);
    } else {
      setSelectedPackage(null);
      if (newPickup) setFromCity(newPickup);
    }
  };

  const proceedWithPackage = pkg => {
    const flowPackage = serializePackageForFlow(pkg);
    const effectiveFromCity = flowPackage.serviceLocationName || fromCity || 'Pickup City';

    navigation.navigate('IntercityVehicle', {
      fromCity: effectiveFromCity,
      toCity: flowPackage.destination,
      tripType,
      rideMode: 'schedule',
      date: toDateInputValue(travelDateTime),
      scheduledAt: travelDateTime.toISOString(),
      selectedPackages: [flowPackage],
      pickupAddress,
      pickupCoords,
    });
  };

  const handleExploreCabs = () => {
    if (!pickupAddress) {
      Toast.show({type: 'error', text1: 'Please set your Pickup Location'});
      setShowMapPicker(true);
      return;
    }
    if (!selectedPackage) {
      const match = packages.find(p => p.destination.toLowerCase().trim() === toCitySearch.toLowerCase().trim());
      if (match) {
        setSelectedPackage(match);
        proceedWithPackage(match);
      } else {
        Toast.show({type: 'error', text1: 'Please select a valid Drop Location from the suggestions'});
        setIsToFocused(true);
      }
      return;
    }
    proceedWithPackage(selectedPackage);
  };

  const minDate = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), []);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <View className="px-5 py-4 flex-row items-center justify-between border-b border-slate-100 bg-white">
        <Pressable onPress={() => navigation.goBack()} className="w-10 h-10 rounded-2xl bg-white shadow-sm items-center justify-center border border-slate-100">
          <ArrowLeft size={20} color="#1e293b" />
        </Pressable>
        <Text className="text-[17px] font-extrabold text-slate-900">Outstation Cabs</Text>
        <View className="w-9 h-9 rounded-full bg-blue-100 items-center justify-center">
          <User size={18} color="#2563eb" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 40}} keyboardShouldPersistTaps="handled">
        <View className="bg-white rounded-[28px] p-6 border border-slate-100" style={{elevation: 2}}>
          <View className="flex-row items-center justify-center gap-3 mb-5">
            <View className="h-[1px] flex-1 bg-slate-200" />
            <Text className="text-[10px] font-extrabold text-blue-500 uppercase">India's Premier Intercity Cabs</Text>
            <View className="h-[1px] flex-1 bg-slate-200" />
          </View>

          <View className="flex-row border border-slate-200 rounded-xl p-1 mb-5 bg-white">
            {['One Way', 'Round Trip'].map(type => (
              <Pressable
                key={type}
                onPress={() => setTripType(type)}
                className="flex-1 py-3.5 rounded-lg items-center"
                style={{backgroundColor: tripType === type ? '#1E90FF' : 'transparent'}}>
                <Text className="text-[13px] font-extrabold uppercase" style={{color: tripType === type ? '#fff' : '#1e293b'}}>
                  {type}
                </Text>
                <Text className="text-[9px] mt-0.5" style={{color: tripType === type ? '#fff' : '#64748b'}}>
                  {type === 'One Way' ? 'Drop-off only' : 'Return with same cab'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="border border-slate-200 rounded-2xl bg-[#F2F7FA] overflow-visible">
            <Pressable onPress={handleOpenMapPicker} className="px-5 py-4 flex-row items-center gap-4 border-b border-slate-200/80">
              <MapPin size={20} color="#94a3b8" />
              <View className="flex-1">
                <Text className="text-[9px] font-extrabold text-slate-400 uppercase mb-1">FROM</Text>
                <Text className="text-[15px] font-bold text-slate-800" numberOfLines={1}>
                  {pickupAddress || 'Enter Pickup Location'}
                </Text>
              </View>
            </Pressable>

            <View className="px-5 py-4 flex-row items-center gap-4">
              <MapPin size={20} color="#1E90FF" />
              <View className="flex-1">
                <Text className="text-[9px] font-extrabold text-slate-400 uppercase mb-1">TO</Text>
                <TextInput
                  value={toCitySearch}
                  onChangeText={text => {
                    setToCitySearch(text);
                    if (selectedPackage && selectedPackage.destination !== text) setSelectedPackage(null);
                  }}
                  onFocus={() => setIsToFocused(true)}
                  placeholder="Enter Drop Location"
                  className="text-[15px] font-bold text-slate-800 p-0"
                />
              </View>
              {!!toCitySearch && (
                <Pressable
                  onPress={() => {
                    setToCitySearch('');
                    setSelectedPackage(null);
                  }}>
                  <X size={16} color="#94a3b8" />
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={handleSwapLocations}
              className="absolute right-4 top-1/2 w-9 h-9 rounded-full bg-white border border-slate-200 items-center justify-center"
              style={{marginTop: -18}}>
              <ArrowUpDown size={15} color="#1E90FF" />
            </Pressable>
          </View>

          {isToFocused && (
            <View className="mt-2 bg-white rounded-2xl border border-slate-100 max-h-72">
              {loading ? (
                <View className="p-6 flex-row items-center justify-center gap-2">
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text className="text-[13px] text-slate-400">Loading routes...</Text>
                </View>
              ) : filteredPackages.length > 0 ? (
                <ScrollView style={{maxHeight: 280}} keyboardShouldPersistTaps="handled">
                  {filteredPackages.map(pkg => (
                    <Pressable
                      key={pkg.id}
                      onPress={() => {
                        setSelectedPackage(pkg);
                        setToCitySearch(pkg.destination);
                        setFromCity(pkg.serviceLocationName);
                        setIsToFocused(false);
                      }}
                      className="px-5 py-3.5 flex-row items-center justify-between border-b border-slate-50">
                      <View className="flex-1 pr-3">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">From {pkg.serviceLocationName}</Text>
                        <Text className="text-[14px] font-black text-slate-800">To {pkg.destination}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-[9px] font-bold text-slate-400 uppercase">Starts from</Text>
                        <Text className="text-[14px] font-black text-slate-900">₹{pkg.vehicles?.[0]?.basePrice || '---'}</Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <View className="p-6 items-center">
                  <Text className="text-[13px] font-bold text-slate-400">No routes matching query</Text>
                </View>
              )}
              <Pressable onPress={() => setIsToFocused(false)} className="py-2.5 items-center border-t border-slate-50">
                <Text className="text-[11px] font-black text-slate-400 uppercase">Close</Text>
              </Pressable>
            </View>
          )}

          <DateTimePickerField mode="datetime" value={travelDateTime} minimumDate={minDate} maximumDate={maxDate} onChange={setTravelDateTime}>
            {open => (
              <Pressable onPress={open} className="mt-4 p-4 rounded-2xl bg-[#EBF5FC] border border-[#D5E6F3] flex-row items-center gap-4">
                <View className="w-8 h-8 rounded-xl bg-white items-center justify-center">
                  <Calendar size={18} color="#1E90FF" />
                </View>
                <View className="flex-1">
                  <Text className="text-[9px] font-extrabold text-slate-400 uppercase mb-1">TRIP START</Text>
                  <View className="flex-row items-baseline gap-2">
                    <Text className="text-[15px] font-black text-slate-800">{formatDateToDDMMYYYY(travelDateTime)}</Text>
                    <Text className="text-[12px] text-slate-500">{formatTimeTo12Hour(travelDateTime)}</Text>
                  </View>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </Pressable>
            )}
          </DateTimePickerField>

          <Pressable onPress={handleExploreCabs} className="mt-5 bg-[#FF7A1A] rounded-xl py-4 items-center">
            <Text className="text-white font-extrabold text-[15px] uppercase tracking-widest">Explore Cabs</Text>
          </Pressable>
        </View>

        {!!supportPhone && (
          <View className="mt-6 p-4 bg-[#E8F2EC] border border-[#0a4d2b]/15 rounded-2xl flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[8px] font-extrabold text-[#0a4d2b] uppercase mb-0.5">Need help planning?</Text>
              <Text className="text-[13px] font-extrabold text-slate-900">TALK TO THE DISTRICT TEAM</Text>
              <Text className="text-[10px] text-slate-500 mt-0.5">We can help you pick a route and a vehicle.</Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL(`tel:${supportPhone.replace(/\s+/g, '')}`)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex-row items-center gap-1.5">
              <PhoneCall size={12} color="#0a4d2b" />
              <Text className="text-[11px] font-black text-slate-900">Call us</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Modal visible={showMapPicker} animationType="slide" onRequestClose={() => setShowMapPicker(false)}>
        <SafeAreaView className="flex-1">
          <View className="px-5 pt-3 pb-4 border-b border-slate-50">
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => setShowMapPicker(false)} className="w-10 h-10 rounded-2xl bg-white border border-slate-100 items-center justify-center">
                <ArrowLeft size={20} color="#0f172a" />
              </Pressable>
              <View className="flex-1 bg-white rounded-2xl border border-blue-50 px-4 py-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-[10px] font-black uppercase text-blue-600">Pinpoint Pickup</Text>
                  <Pressable onPress={handleEditPickup} className="flex-row items-center gap-1 bg-slate-100 rounded-full px-2.5 py-1">
                    <Pencil size={10} color="#475569" />
                    <Text className="text-[10px] font-black uppercase text-slate-600">Edit</Text>
                  </Pressable>
                </View>
                {isEditingPickup ? (
                  <View className="flex-row items-center gap-2">
                    <Search size={14} color="#94a3b8" />
                    <TextInput
                      autoFocus
                      value={mapSearchInput}
                      onChangeText={setMapSearchInput}
                      placeholder="Search pickup location"
                      className="flex-1 text-[14px] font-bold text-slate-900 p-0"
                    />
                  </View>
                ) : (
                  <Text className="text-[14px] font-bold text-slate-900" numberOfLines={1}>
                    {isGeocoding ? 'Finding exact address...' : pickedAddress || 'Set location on map'}
                  </Text>
                )}
              </View>
            </View>

            {(isSearchingMapLocations || mapSearchResults.length > 0) && (
              <View className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-2">
                {isSearchingMapLocations && (
                  <View className="flex-row items-center gap-2 py-2">
                    <LoaderCircle size={14} color="#3b82f6" />
                    <Text className="text-[12px] font-bold text-slate-500">Searching suggestions...</Text>
                  </View>
                )}
                {mapSearchResults.map(result => (
                  <Pressable
                    key={result.placeId || result.title}
                    onPress={() => handleMapSearchSuggestionSelect(result)}
                    className="flex-row items-start gap-3 py-3 border-b border-slate-50 last:border-0">
                    <MapPin size={15} color="#3b82f6" />
                    <View className="flex-1">
                      <Text className="text-[13px] font-black text-slate-900" numberOfLines={1}>{result.title}</Text>
                      <Text className="text-[12px] font-bold text-slate-500" numberOfLines={1}>{result.address}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View className="flex-1 relative bg-slate-100">
            {mapRegion && (
              <MapView
                provider={PROVIDER_GOOGLE}
                style={{flex: 1}}
                initialRegion={mapRegion}
                onRegionChangeComplete={handleMapRegionChangeComplete}
              />
            )}
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
              <MapPin size={40} color="#1E90FF" style={{marginBottom: 40}} />
            </View>
            <Pressable
              onPress={handleUseCurrentLocation}
              className="absolute bottom-8 right-6 w-14 h-14 bg-white rounded-2xl items-center justify-center border border-slate-100"
              style={{elevation: 4}}>
              {isLocating ? <ActivityIndicator color="#3b82f6" /> : <Navigation size={22} color="#0f172a" />}
            </Pressable>
          </View>

          <View className="px-6 pt-5 pb-10 bg-white border-t border-slate-50">
            <Pressable onPress={handleConfirmMapPickup} disabled={isGeocoding} className="bg-[#1E90FF] rounded-2xl py-4 flex-row items-center justify-center gap-2">
              <Check size={18} color="#fff" />
              <Text className="text-white font-black text-[15px] uppercase">Confirm Pickup</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
