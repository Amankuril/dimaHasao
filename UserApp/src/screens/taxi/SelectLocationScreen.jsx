/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/ride/SelectLocation.jsx.
 *
 * Kept 1:1: zone/geofencing (point-in-polygon zone matching, so a pickup
 * resolves the right service_location_id/zone_id for pricing), the
 * popular-suggestions-vs-search-results logic, and the save/recent-location
 * bookkeeping that SelectVehicle and the home screen depend on.
 *
 * Adapted for RN: the Google Maps JS SDK's AutocompleteService/PlacesService/
 * Geocoder (browser-only objects) become direct HTTP calls to the same
 * Google Places/Geocoding REST APIs; the draggable-map picker becomes a
 * react-native-maps MapView with a fixed center pin and onRegionChangeComplete
 * standing in for the web's map "idle" event. Parcel-flow branches are
 * dropped — parcel is a retired route the web version itself redirects away
 * from (see TaxiHomeScreen's RETIRED_ROUTES).
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, {PROVIDER_GOOGLE} from 'react-native-maps';
import {ArrowLeft, Check, Clock, MapPin, Navigation, Search} from 'lucide-react-native';

import api from '../../services/taxi/axiosInstance';
import {GOOGLE_MAPS_API_KEY} from '../../services/api/config';
import {getSavedLocation, getSavedLocationCoords, saveLocation} from '../../services/taxi/locationStore';
import {
  coordsForPlace,
  DEFAULT_COORDS,
  DEFAULT_PLACE,
  DISTRICT_PLACES,
  DISTRICT_PLACE_COORDS,
} from '../../constants/districtPlaces';

const RECENT_LOCATIONS_KEY = 'dimahasao_taxi_recent_locations';
const RECENT_LOCATIONS_UPDATED_EVENT = 'dimahasao:taxi-recent-locations-updated';

const unwrapResults = response => {
  const payload = response?.data?.data || response?.data || response;
  return payload?.results || payload?.zones || (Array.isArray(payload) ? payload : []);
};

const isZoneActive = zone => zone?.active !== false && Number(zone?.status ?? 1) !== 0;
const getZoneId = zone => zone?._id || zone?.id || '';
const getZoneServiceLocationId = zone =>
  zone?.service_location_id?._id || zone?.service_location_id?.id || zone?.service_location_id || '';
const getStoreZoneId = store => store?.zone_id?._id || store?.zone_id?.id || store?.zone_id || '';

const toZonePoint = point => {
  if (Array.isArray(point) && point.length >= 2) {
    const [lng, lat] = point;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) return {lat: Number(lat), lng: Number(lng)};
  }
  if (point && typeof point === 'object') {
    const lat = Number(point.lat ?? point.latitude);
    const lng = Number(point.lng ?? point.longitude ?? point.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return {lat, lng};
  }
  return null;
};

const normalizeZonePath = zone => {
  const source =
    Array.isArray(zone?.coordinates?.[0]) && Array.isArray(zone?.coordinates?.[0]?.[0])
      ? zone.coordinates[0]
      : zone?.coordinates;
  if (!Array.isArray(source)) return [];
  return source.map(toZonePoint).filter(Boolean);
};

const isPointInPolygon = (point, polygon) => {
  if (!point || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersects = yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const findMatchingZone = (coords, zones = []) => {
  if (!Array.isArray(coords) || coords.length !== 2 || !zones.length) return null;
  const [lng, lat] = coords;
  const point = {lat: Number(lat), lng: Number(lng)};
  return zones.find(zone => {
    const path = normalizeZonePath(zone);
    return path.length >= 3 && isPointInPolygon(point, path);
  }) || null;
};

async function saveRecentLocation(address, coords) {
  if (!address || !address.trim()) return;
  try {
    const saved = await AsyncStorage.getItem(RECENT_LOCATIONS_KEY);
    let list = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(list)) list = [];
    list = list.filter(item => item.address.toLowerCase() !== address.toLowerCase());
    list.unshift({
      name: address.split(',')[0].trim(),
      address,
      lat: coords ? coords[1] : null,
      lon: coords ? coords[0] : null,
      distance: coords ? 'Recent' : '',
    });
    await AsyncStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(list.slice(0, 5)));
    DeviceEventEmitter.emit(RECENT_LOCATIONS_UPDATED_EVENT);
  } catch {
    // best-effort
  }
}

async function geocodeAddress(address, fallback = DEFAULT_COORDS) {
  if (!address?.trim()) return fallback;
  const known = DISTRICT_PLACE_COORDS[address];
  if (known) return known;
  if (!GOOGLE_MAPS_API_KEY) return fallback;

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const body = await res.json();
    const loc = body?.results?.[0]?.geometry?.location;
    return loc ? [loc.lng, loc.lat] : fallback;
  } catch {
    return fallback;
  }
}

async function reverseGeocode(lat, lng) {
  if (!GOOGLE_MAPS_API_KEY) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const body = await res.json();
    return body?.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function fetchAutocomplete(query, sessionToken) {
  if (!GOOGLE_MAPS_API_KEY || query.trim().length < 3) return [];
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query,
      )}&components=country:in&sessiontoken=${sessionToken}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const body = await res.json();
    if (body?.status !== 'OK') return [];
    return (body.predictions || []).slice(0, 6).map(p => ({
      title: p.structured_formatting?.main_text || p.description,
      address: p.description,
      placeId: p.place_id,
    }));
  } catch {
    return [];
  }
}

async function resolvePlaceSelection(result) {
  if (Array.isArray(result?.coords) && result.coords.length === 2) {
    return {title: result.title, address: result.address || result.title, coords: result.coords};
  }
  if (result?.placeId && GOOGLE_MAPS_API_KEY) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${result.placeId}&fields=formatted_address,geometry,name&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const body = await res.json();
      const loc = body?.result?.geometry?.location;
      if (loc) {
        return {
          title: result.title || body.result.name,
          address: body.result.formatted_address || result.address || result.title,
          coords: [loc.lng, loc.lat],
        };
      }
    } catch {
      // fall through to plain geocode below
    }
  }
  const coords = await geocodeAddress(result?.address || result?.title || '');
  return {title: result?.title || '', address: result?.address || result?.title || '', coords};
}

export default function SelectLocationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = route.params || {};

  const [pickup, setPickup] = useState(routeParams.pickup || DEFAULT_PLACE.title);
  const [drop, setDrop] = useState(routeParams.drop || '');
  const [pickupCoords, setPickupCoords] = useState(routeParams.pickupCoords || coordsForPlace(routeParams.pickup || DEFAULT_PLACE.title));
  const [dropCoords, setDropCoords] = useState(routeParams.dropCoords || null);
  const [activeInput, setActiveInput] = useState(routeParams.activeInput === 'pickup' ? 'pickup' : 'drop');

  const [zones, setZones] = useState([]);
  const [serviceStores, setServiceStores] = useState([]);
  const [remoteResults, setRemoteResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [pickedAddress, setPickedAddress] = useState('Loading address...');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const sessionTokenRef = useRef(String(Date.now()));
  const mapCenterRef = useRef(null);

  // Hydrate from the last saved pickup once (route params win if given).
  useEffect(() => {
    if (routeParams.pickup || routeParams.pickupCoords) return;
    (async () => {
      const saved = await getSavedLocation();
      const savedCoords = await getSavedLocationCoords();
      if (saved?.address) setPickup(saved.address);
      if (savedCoords) setPickupCoords(savedCoords);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const serviceLocationId = routeParams.service_location_id || routeParams.serviceLocationId || '';
    if (!serviceLocationId) return;
    (async () => {
      try {
        const [zonesRes, storesRes] = await Promise.all([api.get('/admin/zones'), api.get('/users/service-stores')]);
        setZones(unwrapResults(zonesRes).filter(isZoneActive));
        setServiceStores(unwrapResults(storesRes).filter(s => s?.active !== false));
      } catch {
        setZones([]);
        setServiceStores([]);
      }
    })();
  }, [routeParams.service_location_id, routeParams.serviceLocationId]);

  const query = activeInput === 'pickup' ? pickup : drop;

  const currentZone = useMemo(() => findMatchingZone(pickupCoords, zones), [pickupCoords, zones]);

  const popularSuggestions = useMemo(() => {
    const currentZoneId = String(getZoneId(currentZone));
    const zoneStores = currentZoneId ? serviceStores.filter(s => String(getStoreZoneId(s)) === currentZoneId) : [];
    if (zoneStores.length) {
      return zoneStores.slice(0, 6).map(store => ({
        title: store.name || store.address || 'Service Store',
        address: store.address || currentZone?.name || 'Service Store',
        coords: Number.isFinite(Number(store.longitude)) && Number.isFinite(Number(store.latitude))
          ? [Number(store.longitude), Number(store.latitude)]
          : null,
      }));
    }
    return DISTRICT_PLACES.slice(0, 6);
  }, [currentZone, serviceStores]);

  const localResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return popularSuggestions;
    return DISTRICT_PLACES.filter(p => p.title.toLowerCase().includes(trimmed) || p.address.toLowerCase().includes(trimmed));
  }, [query, popularSuggestions]);

  // Debounced remote autocomplete, same 350ms as the web version.
  useEffect(() => {
    if (query.trim().length < 3) {
      setRemoteResults([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await fetchAutocomplete(query, sessionTokenRef.current);
      setRemoteResults(results);
      setIsSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const searchResults = useMemo(() => {
    const merged = [...remoteResults, ...localResults];
    const seen = new Set();
    return merged.filter(r => {
      const key = `${r.title}|${r.address}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [remoteResults, localResults]);

  const confirmAndContinue = async (finalDrop, finalDropCoords) => {
    const resolvedDrop = finalDrop || drop;
    if (!resolvedDrop?.trim()) return;

    const resolvedPickupCoords = pickupCoords || (await geocodeAddress(pickup));
    const resolvedDropCoords = finalDropCoords || dropCoords || (await geocodeAddress(resolvedDrop));

    await saveLocation({address: pickup, lat: resolvedPickupCoords[1], lon: resolvedPickupCoords[0]});
    await saveRecentLocation(pickup, resolvedPickupCoords);
    await saveRecentLocation(resolvedDrop, resolvedDropCoords);

    const matchedZone = findMatchingZone(resolvedPickupCoords, zones);

    navigation.navigate('SelectVehicle', {
      ...routeParams,
      pickup,
      drop: resolvedDrop,
      pickupCoords: resolvedPickupCoords,
      dropCoords: resolvedDropCoords,
      service_location_id: getZoneServiceLocationId(matchedZone) || '',
      zone_id: getZoneId(matchedZone) || '',
    });
  };

  const selectResult = async result => {
    const resolved = await resolvePlaceSelection(result);
    if (activeInput === 'pickup') {
      setPickup(resolved.address);
      setPickupCoords(resolved.coords);
      await saveLocation({address: resolved.address, lat: resolved.coords[1], lon: resolved.coords[0]});
      await saveRecentLocation(resolved.address, resolved.coords);
      setActiveInput('drop');
    } else {
      setDrop(resolved.address);
      setDropCoords(resolved.coords);
      await saveRecentLocation(resolved.address, resolved.coords);
      confirmAndContinue(resolved.address, resolved.coords);
    }
  };

  const openMapPicker = () => {
    const activeCoords = activeInput === 'drop' ? dropCoords : pickupCoords;
    const start = Array.isArray(activeCoords)
      ? {latitude: activeCoords[1], longitude: activeCoords[0]}
      : Array.isArray(pickupCoords)
      ? {latitude: pickupCoords[1], longitude: pickupCoords[0]}
      : {latitude: DEFAULT_COORDS[1], longitude: DEFAULT_COORDS[0]};

    mapCenterRef.current = start;
    setMapRegion({...start, latitudeDelta: 0.01, longitudeDelta: 0.01});
    setPickedAddress(String(activeInput === 'drop' ? drop : pickup).trim() || 'Loading address...');
    setShowMapPicker(true);
    reverseGeocode(start.latitude, start.longitude).then(setPickedAddress);
  };

  const handleRegionChangeComplete = region => {
    mapCenterRef.current = {latitude: region.latitude, longitude: region.longitude};
    setIsGeocoding(true);
    reverseGeocode(region.latitude, region.longitude).then(address => {
      setIsGeocoding(false);
      setPickedAddress(address);
    });
  };

  const confirmMapLocation = async () => {
    const center = mapCenterRef.current;
    const coords = [center.longitude, center.latitude];

    if (activeInput === 'pickup') {
      setPickup(pickedAddress);
      setPickupCoords(coords);
      await saveLocation({address: pickedAddress, lat: coords[1], lon: coords[0]});
      await saveRecentLocation(pickedAddress, coords);
      setActiveInput('drop');
    } else {
      setDrop(pickedAddress);
      setDropCoords(coords);
      await saveRecentLocation(pickedAddress, coords);
      setShowMapPicker(false);
      confirmAndContinue(pickedAddress, coords);
      return;
    }
    setShowMapPicker(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-slate-100">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#0f172a" />
        </Pressable>
        <Text className="text-base font-extrabold text-slate-900">Set your trip</Text>
      </View>

      <View className="px-4 py-3 gap-2">
        <Pressable
          onPress={() => setActiveInput('pickup')}
          className={`flex-row items-center gap-2.5 rounded-xl border px-3 py-2.5 ${activeInput === 'pickup' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
          <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <TextInput
            value={pickup}
            onChangeText={setPickup}
            onFocus={() => setActiveInput('pickup')}
            placeholder="Pickup location"
            className="flex-1 text-[13px] font-semibold text-slate-900"
          />
        </Pressable>

        <Pressable
          onPress={() => setActiveInput('drop')}
          className={`flex-row items-center gap-2.5 rounded-xl border px-3 py-2.5 ${activeInput === 'drop' ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
          <MapPin size={14} color="#dc2626" />
          <TextInput
            value={drop}
            onChangeText={setDrop}
            onFocus={() => setActiveInput('drop')}
            placeholder="Where to?"
            className="flex-1 text-[13px] font-semibold text-slate-900"
          />
        </Pressable>

        <Pressable onPress={openMapPicker} className="flex-row items-center gap-2 py-1">
          <Navigation size={14} color="#0f172a" />
          <Text className="text-[12px] font-bold text-slate-700">Pick on map instead</Text>
        </Pressable>
      </View>

      <View className="flex-row items-center gap-2 px-4 pb-2">
        <Search size={14} color="#94a3b8" />
        <Text className="text-[11px] font-bold uppercase text-slate-400">
          {query.trim() ? 'Search results' : 'Popular'}
        </Text>
        {isSearching && <ActivityIndicator size="small" />}
      </View>

      <FlatList
        data={searchResults}
        keyExtractor={(item, idx) => item.placeId || `${item.title}-${idx}`}
        renderItem={({item}) => (
          <Pressable onPress={() => selectResult(item)} className="flex-row items-center gap-3 px-4 py-3 border-b border-slate-50">
            <Clock size={16} color="#64748B" />
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-slate-900" numberOfLines={1}>
                {item.title}
              </Text>
              <Text className="text-[11px] text-slate-500" numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          </Pressable>
        )}
      />

      {/* Map picker */}
      <Modal visible={showMapPicker} animationType="slide">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center gap-3 px-4 py-3 border-b border-slate-100">
            <Pressable onPress={() => setShowMapPicker(false)}>
              <ArrowLeft size={20} color="#0f172a" />
            </Pressable>
            <Text className="text-base font-extrabold text-slate-900">
              {activeInput === 'pickup' ? 'Pick your pickup point' : 'Pick your drop point'}
            </Text>
          </View>

          <View className="flex-1">
            {mapRegion && (
              <MapView
                provider={PROVIDER_GOOGLE}
                style={{flex: 1}}
                initialRegion={mapRegion}
                onRegionChangeComplete={handleRegionChangeComplete}
              />
            )}
            {/* Fixed center pin — the map pans under it, same UX as the web's draggable-map + static marker. */}
            <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
              <MapPin size={36} color="#dc2626" style={{marginBottom: 36}} />
            </View>
          </View>

          <View className="px-4 py-3 border-t border-slate-100 gap-2">
            <View className="flex-row items-center gap-2">
              {isGeocoding ? <ActivityIndicator size="small" /> : <MapPin size={14} color="#0f172a" />}
              <Text className="text-[13px] font-semibold text-slate-900 flex-1" numberOfLines={2}>
                {pickedAddress}
              </Text>
            </View>
            <Pressable onPress={confirmMapLocation} className="flex-row items-center justify-center gap-2 bg-[#0a3a22] rounded-xl py-3">
              <Check size={16} color="#fff" />
              <Text className="text-white font-bold text-sm">Confirm location</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
