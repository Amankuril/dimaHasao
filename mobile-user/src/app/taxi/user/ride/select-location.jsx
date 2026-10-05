import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { AlertTriangle, ArrowLeft, Check, ChevronRight, Map as MapIcon, MapPin, Minus, Navigation, Plus, X } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../../../lib/webRouter';
import { Press, Spinner } from '../../../../components/ui';
import { geocodeAPI } from '../../../../api/food';
import { localStore } from '../../../../lib/storage';
import { events } from '../../../../lib/events';
import { tw } from '../../../../theme';
import { fo } from '../../../../taxi/account/ui';
import api from '../../../../taxi/api/client';
import { DISTRICT_CENTER, HAS_VALID_GOOGLE_MAPS_KEY } from '../../../../taxi/utils/googleMaps';
import { getSavedLocation, getSavedLocationCoords, saveLocation } from '../../../../taxi/services/locationStore';
import { coordsForPlace, DEFAULT_COORDS, DEFAULT_PLACE, DISTRICT_PLACES, DISTRICT_PLACE_COORDS } from '../../../../taxi/constants/districtPlaces';

/* Port of Taxi/modules/user/pages/ride/SelectLocation.jsx (phone layout). The Maps JS SDK's
   autocomplete / geocoder are replaced by the backend geocode proxy (geocodeAPI). */

const getCoords = coordsForPlace;
const MAP_REVERSE_GEOCODE_DEBOUNCE_MS = 500;
const routePrefix = '/taxi/user';
const getLatLngCacheKey = (coords, precision = 5) =>
  `${Number(coords?.lat || 0).toFixed(precision)},${Number(coords?.lng || 0).toFixed(precision)}`;
const sanitizeLocationInput = (value) => String(value || '').replace(/^\s+/g, '').replace(/\s{2,}/g, ' ');

const unwrapResults = (response) => {
  const payload = response?.data?.data || response?.data || response;
  return payload?.results || payload?.zones || (Array.isArray(payload) ? payload : []);
};

const getZoneServiceLocationId = (zone) =>
  zone?.service_location_id?._id
  || zone?.service_location_id?.id
  || zone?.service_location_id
  || zone?.service_location?._id
  || zone?.service_location?.id
  || zone?.service_location
  || '';

const isZoneActive = (zone) => zone?.active !== false && Number(zone?.status ?? 1) !== 0;
const getZoneId = (zone) => zone?._id || zone?.id || '';
const getStoreZoneId = (store) => store?.zone_id?._id || store?.zone_id?.id || store?.zone_id || '';

const toZonePoint = (point) => {
  if (Array.isArray(point) && point.length >= 2) {
    const [lng, lat] = point;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) return { lat: Number(lat), lng: Number(lng) };
  }
  if (point && typeof point === 'object') {
    const lat = Number(point.lat ?? point.latitude);
    const lng = Number(point.lng ?? point.longitude ?? point.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
};

const normalizeZonePath = (zone) => {
  const source = Array.isArray(zone?.coordinates?.[0]) && Array.isArray(zone?.coordinates?.[0]?.[0])
    ? zone.coordinates[0]
    : zone?.coordinates;
  if (!Array.isArray(source)) return [];
  return source.map(toZonePoint).filter(Boolean);
};

const getBoundsFromPaths = (paths) => {
  if (!paths.length) return null;
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  paths.forEach((path) => {
    path.forEach((point) => {
      north = Math.max(north, point.lat);
      south = Math.min(south, point.lat);
      east = Math.max(east, point.lng);
      west = Math.min(west, point.lng);
    });
  });
  if (![north, south, east, west].every(Number.isFinite)) return null;
  return { north, south, east, west };
};

const isPointInPolygon = (point, polygon) => {
  if (!point || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersects = ((yi > point.lat) !== (yj > point.lat))
      && (point.lng < ((xj - xi) * (point.lat - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
};

const findMatchingZone = (coords, zones = []) => {
  if (!Array.isArray(coords) || coords.length !== 2 || !Array.isArray(zones) || !zones.length) return null;
  const [lng, lat] = coords;
  const point = { lat: Number(lat), lng: Number(lng) };
  return zones.find((zone) => {
    const zonePath = normalizeZonePath(zone);
    return zonePath.length >= 3 && isPointInPolygon(point, zonePath);
  }) || null;
};

const saveRecentLocation = (address, coords) => {
  if (!address || address.trim().length === 0) return;
  try {
    const key = 'Appzeto 24:recentLocations';
    let list = [];
    const saved = localStore.getItem(key);
    if (saved) list = JSON.parse(saved);
    if (!Array.isArray(list)) list = [];
    list = list.filter((item) => item.address.toLowerCase() !== address.toLowerCase());
    const name = address.split(',')[0].trim();
    list.unshift({
      name,
      address,
      lat: coords ? coords[1] : null,
      lon: coords ? coords[0] : null,
      distance: coords ? 'Recent' : '',
    });
    list = list.slice(0, 5);
    localStore.setItem(key, JSON.stringify(list));
    events.emit('storage');
    events.emit('Appzeto 24:recent-locations-updated');
  } catch (e) {
    console.error('Error saving recent location:', e);
  }
};

/** Device position: high accuracy first, then the web's relaxed retry. */
async function getDevicePosition() {
  let perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) throw new Error('Location permission denied');
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
  } catch {
    return Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);
  }
}

const reverseGeocodeAddress = async (lat, lng) => {
  try {
    const response = await geocodeAPI.reverse(lat, lng);
    const data = response?.data?.data;
    if (data?.status === 'OK' && data.results?.[0]?.formatted_address) return data.results[0].formatted_address;
  } catch {
    // fall through to the caller's fallback label
  }
  return null;
};

const textSearchPlaces = async (textQuery, bounds) => {
  const body = { textQuery, maxResultCount: 6 };
  if (bounds) {
    body.latitude = (bounds.north + bounds.south) / 2;
    body.longitude = (bounds.east + bounds.west) / 2;
  }
  const res = await geocodeAPI.textSearch(body);
  const places = res?.data?.data?.places;
  return Array.isArray(places) ? places : [];
};

const placeToResult = (p) => {
  const lat = Number(p?.location?.latitude);
  const lng = Number(p?.location?.longitude);
  const name = p?.displayName?.text || p?.displayName || '';
  const addr = p?.formattedAddress || '';
  return {
    title: name || addr,
    address: addr || name,
    placeId: p?.id,
    coords: Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : undefined,
  };
};

export default function SelectLocation() {
  const insets = useSafeAreaInsets();
  const location = useLocation();
  const routeState = location.state || {};
  const serviceLocationId = routeState.service_location_id || routeState.serviceLocationId || '';
  const routeActiveInput = routeState.activeInput === 'pickup' || routeState.activeInput === 'drop' ? routeState.activeInput : 'drop';
  const isParcelFlow = routeState.flow === 'parcel' || String(routeState.returnTo || '').includes('/parcel/details');
  const savedLocation = getSavedLocation();
  const savedPickupLabel = String(savedLocation?.address || '').trim();
  const savedPickupCoords = getSavedLocationCoords();
  const [pickup, setPickup] = useState(() => routeState.pickup || savedPickupLabel || DEFAULT_PLACE.title);
  const [drop, setDrop] = useState(() => routeState.drop || '');
  const [pickupCoords, setPickupCoords] = useState(() => routeState.pickupCoords || savedPickupCoords || getCoords(routeState.pickup || savedPickupLabel || DEFAULT_PLACE.title));
  const [dropCoords, setDropCoords] = useState(() => routeState.dropCoords || null);
  const [stops, setStops] = useState(() => routeState.stops || []);
  const [activeInput, setActiveInput] = useState(routeActiveInput); // 'pickup' | 'drop' | stopIdx
  const [showMapPicker, setShowMapPicker] = useState(Boolean(routeState.openMapPicker));
  const [mapCenter, setMapCenter] = useState(DISTRICT_CENTER);
  const [pickedAddress, setPickedAddress] = useState('Loading address...');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [zones, setZones] = useState([]);
  const [zonePaths, setZonePaths] = useState([]);
  const [serviceStores, setServiceStores] = useState([]);
  const [remoteResults, setRemoteResults] = useState([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const mapRef = useRef(null);
  const lastCenterRef = useRef(DISTRICT_CENTER);
  const reverseGeocodeTimerRef = useRef(null);
  const lastReverseGeocodedCenterRef = useRef(null);
  const searchCacheRef = useRef(new Map());
  const latestSearchRef = useRef(0);
  const coordsLookupCacheRef = useRef(new Map());
  const placeSelectionCacheRef = useRef(new Map());
  const reverseGeocodeCacheRef = useRef(new Map());
  const navigate = useNavigate();
  const parcelReturnPath = routeState.returnTo || `${routePrefix}/parcel/details`;

  const allResults = DISTRICT_PLACES;
  const zoneBounds = useMemo(() => getBoundsFromPaths(zonePaths), [zonePaths]);

  useEffect(() => {
    let active = true;
    const loadZoneData = async () => {
      if (!serviceLocationId) {
        setZones([]);
        setZonePaths([]);
        setServiceStores([]);
        return;
      }
      try {
        const [zonesResponse, storesResponse] = await Promise.all([api.get('/admin/zones'), api.get('/users/service-stores')]);
        if (!active) return;
        const matchingZones = unwrapResults(zonesResponse).filter((zone) => isZoneActive(zone));
        const matchingPaths = matchingZones.map(normalizeZonePath).filter((path) => path.length >= 3);
        const matchingStores = unwrapResults(storesResponse).filter((store) => {
          if (store?.active === false || String(store?.status || '').toLowerCase() === 'inactive') return false;
          return true;
        });
        setZones(matchingZones);
        setZonePaths(matchingPaths);
        setServiceStores(matchingStores);
      } catch {
        if (active) {
          setZones([]);
          setZonePaths([]);
          setServiceStores([]);
        }
      }
    };
    loadZoneData();
    return () => {
      active = false;
    };
  }, [serviceLocationId]);

  const resolveCoords = async (label, fallback = DEFAULT_COORDS) => {
    if (!label || !String(label).trim()) return fallback;
    const knownCoords = DISTRICT_PLACE_COORDS[label];
    if (knownCoords) return knownCoords;
    const cacheKey = String(label).trim().toLowerCase();
    const cachedCoords = coordsLookupCacheRef.current.get(cacheKey);
    if (cachedCoords) return cachedCoords;
    try {
      const places = await textSearchPlaces(String(label).trim(), zoneBounds);
      const first = places.map(placeToResult).find((r) => r.coords);
      if (first) {
        coordsLookupCacheRef.current.set(cacheKey, first.coords);
        return first.coords;
      }
    } catch {
      // fall back below
    }
    return fallback;
  };

  const resolvePlaceSelection = async (result) => {
    if (Array.isArray(result?.coords) && result.coords.length === 2) {
      return { title: result.title, address: result.address || result.title, coords: result.coords };
    }
    const cacheKey = String(result?.placeId || `${result?.title || ''}|${result?.address || ''}`.trim().toLowerCase());
    const cachedSelection = placeSelectionCacheRef.current.get(cacheKey);
    if (cachedSelection) return cachedSelection;
    const coords = await resolveCoords(result?.address || result?.title || '');
    const resolvedSelection = { title: result?.title || '', address: result?.address || result?.title || '', coords };
    placeSelectionCacheRef.current.set(cacheKey, resolvedSelection);
    return resolvedSelection;
  };

  const query = (() => {
    if (activeInput === 'pickup') return pickup;
    if (activeInput === 'drop') return drop;
    if (typeof activeInput === 'number') return stops[activeInput] || '';
    return '';
  })();
  const currentZone = useMemo(() => findMatchingZone(pickupCoords, zones), [pickupCoords, zones]);

  const popularSuggestions = useMemo(() => {
    const currentZoneId = String(getZoneId(currentZone));
    const zoneStores = currentZoneId ? serviceStores.filter((store) => String(getStoreZoneId(store)) === currentZoneId) : [];
    if (zoneStores.length) {
      return zoneStores.slice(0, 6).map((store) => ({
        title: store.name || store.address || 'Service Store',
        address: store.address || currentZone?.name || 'Service Store',
        coords: Number.isFinite(Number(store.longitude)) && Number.isFinite(Number(store.latitude)) ? [Number(store.longitude), Number(store.latitude)] : null,
      }));
    }
    return allResults.slice(0, 6);
  }, [currentZone, serviceStores]);

  const isInitialDefault = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return false;
    if (activeInput === 'pickup') {
      const defaultPickup = String(routeState.pickup || '').trim();
      const currentSaved = String(savedPickupLabel || '').trim();
      return trimmedQuery === defaultPickup || trimmedQuery === currentSaved;
    }
    if (activeInput === 'drop') return trimmedQuery === String(routeState.drop || '').trim();
    if (typeof activeInput === 'number') return trimmedQuery === String(routeState.stops?.[activeInput] || '').trim();
    return false;
  }, [query, activeInput, routeState.pickup, routeState.drop, routeState.stops, savedPickupLabel]);

  const localSearchResults = useMemo(
    () => (query.trim().length >= 1 && !isInitialDefault
      ? allResults.filter((result) => result.title.toLowerCase().includes(query.toLowerCase()) || result.address.toLowerCase().includes(query.toLowerCase()))
      : popularSuggestions),
    [popularSuggestions, query, isInitialDefault],
  );

  useEffect(() => {
    if (isInitialDefault || !query.trim() || query.trim().length < 3) {
      setRemoteResults([]);
      setIsSearchingLocations(false);
      return undefined;
    }
    const normalizedQuery = query.trim().toLowerCase();
    const cached = searchCacheRef.current.get(normalizedQuery);
    if (cached) {
      setRemoteResults(cached);
      setIsSearchingLocations(false);
      return undefined;
    }
    const requestId = latestSearchRef.current + 1;
    latestSearchRef.current = requestId;
    setIsSearchingLocations(true);
    const timeoutId = setTimeout(async () => {
      let nextResults = [];
      try {
        const places = await textSearchPlaces(query.trim(), zoneBounds);
        nextResults = places.slice(0, 6).map(placeToResult);
      } catch {
        nextResults = [];
      }
      if (latestSearchRef.current !== requestId) return;
      searchCacheRef.current.set(normalizedQuery, nextResults);
      setRemoteResults(nextResults);
      setIsSearchingLocations(false);
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [query, zoneBounds]);

  const searchResults = useMemo(() => {
    const merged = [...remoteResults, ...localSearchResults];
    const seen = new Set();
    return merged.filter((result) => {
      const key = `${String(result.title || '').trim().toLowerCase()}|${String(result.address || '').trim().toLowerCase()}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [localSearchResults, remoteResults]);

  const getMapStartCoord = () => {
    const activeCoords = activeInput === 'drop' ? dropCoords : pickupCoords;
    if (Array.isArray(activeCoords) && activeCoords.length === 2) return { lat: activeCoords[1], lng: activeCoords[0] };
    if (activeInput === 'drop' && Array.isArray(pickupCoords) && pickupCoords.length === 2) return { lat: pickupCoords[1], lng: pickupCoords[0] };
    if (Array.isArray(pickupCoords) && pickupCoords.length === 2) return { lat: pickupCoords[1], lng: pickupCoords[0] };
    return DISTRICT_CENTER;
  };

  const shouldSkipReverseGeocode = (nextCenter, threshold = 0.00015) => (
    Math.abs(Number(nextCenter?.lat ?? 0) - Number(lastReverseGeocodedCenterRef.current?.lat ?? 0)) < threshold
    && Math.abs(Number(nextCenter?.lng ?? 0) - Number(lastReverseGeocodedCenterRef.current?.lng ?? 0)) < threshold
  );

  const reverseGeocodeMapCenter = async (nextCenter, fallbackLabel = '') => {
    const cacheKey = getLatLngCacheKey(nextCenter);
    const cachedAddress = reverseGeocodeCacheRef.current.get(cacheKey);
    if (cachedAddress) {
      lastReverseGeocodedCenterRef.current = nextCenter;
      setPickedAddress(cachedAddress);
      return;
    }
    setIsGeocoding(true);
    const address = await reverseGeocodeAddress(nextCenter.lat, nextCenter.lng);
    setIsGeocoding(false);
    lastReverseGeocodedCenterRef.current = nextCenter;
    if (address) {
      reverseGeocodeCacheRef.current.set(cacheKey, address);
      setPickedAddress(address);
      return;
    }
    setPickedAddress(fallbackLabel || `${nextCenter.lat.toFixed(5)}, ${nextCenter.lng.toFixed(5)}`);
  };

  const showMapToast = () => {
    Keyboard.dismiss();
    const startCoord = getMapStartCoord();
    const seedAddress = activeInput === 'drop' ? drop : pickup;
    setMapCenter(startCoord);
    lastCenterRef.current = startCoord;
    setPickedAddress(String(seedAddress || '').trim() || 'Loading address...');
    setShowMapPicker(true);
  };

  useEffect(() => {
    if (!showMapPicker) return;
    const startCoord = getMapStartCoord();
    const seedAddress = activeInput === 'drop' ? drop : pickup;
    setMapCenter(startCoord);
    lastCenterRef.current = startCoord;
    setPickedAddress(String(seedAddress || '').trim() || 'Loading address...');
  }, [showMapPicker, activeInput, pickupCoords, dropCoords, pickup, drop]);

  useEffect(() => {
    if (!showMapPicker) return;
    const startCoord = getMapStartCoord();
    reverseGeocodeMapCenter(startCoord, `${startCoord.lat.toFixed(5)}, ${startCoord.lng.toFixed(5)}`);
  }, [showMapPicker, activeInput, pickupCoords, dropCoords]);

  useEffect(() => () => {
    if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
  }, []);

  const handleMapIdle = (region) => {
    const lat = region.latitude;
    const lng = region.longitude;
    const dist = Math.abs(lat - lastCenterRef.current.lat) + Math.abs(lng - lastCenterRef.current.lng);
    if (dist < 0.00001) {
      setIsDragging(false);
      return;
    }
    lastCenterRef.current = { lat, lng };
    setIsDragging(false);
    const nextCenter = { lat, lng };
    if (shouldSkipReverseGeocode(nextCenter)) return;
    if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
    reverseGeocodeTimerRef.current = setTimeout(() => {
      reverseGeocodeMapCenter(nextCenter, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }, MAP_REVERSE_GEOCODE_DEBOUNCE_MS);
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const pos = await getDevicePosition();
      mapRef.current?.animateToRegion({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.003, longitudeDelta: 0.003 }, 400);
    } catch {
      // location unavailable: stay put
    } finally {
      setIsLocating(false);
    }
  };

  const handleConfirmNavigate = async (optionalDrop, optionalDropCoords = null) => {
    const finalDrop = typeof optionalDrop === 'string' ? optionalDrop : drop;
    const finalPickup = pickup || DEFAULT_PLACE.title;
    if (!finalDrop || finalDrop.trim().length === 0) return;

    const resolvedPickupCoords = pickupCoords || await resolveCoords(finalPickup);
    const resolvedDropCoords = optionalDropCoords || dropCoords || await resolveCoords(finalDrop);

    if (isParcelFlow) {
      navigate(parcelReturnPath, {
        state: {
          ...routeState,
          pickup: finalPickup,
          drop: finalDrop,
          pickupCoords: resolvedPickupCoords,
          dropCoords: resolvedDropCoords,
          activeInput: 'drop',
          editPickup: false,
          openMapPicker: false,
        },
      });
      return;
    }

    saveLocation({ address: finalPickup, lat: resolvedPickupCoords[1], lon: resolvedPickupCoords[0] });
    saveRecentLocation(finalPickup, resolvedPickupCoords);
    saveRecentLocation(finalDrop, resolvedDropCoords);

    const matchedPickupZone = findMatchingZone(resolvedPickupCoords, zones);
    const nextServiceLocationId = getZoneServiceLocationId(matchedPickupZone) || '';
    const nextZoneId = getZoneId(matchedPickupZone) || '';

    navigate(`${routePrefix}/ride/select-vehicle`, {
      state: {
        ...routeState,
        pickup: finalPickup,
        drop: finalDrop,
        stops: stops.filter((s) => s.trim().length > 0),
        pickupCoords: resolvedPickupCoords,
        dropCoords: resolvedDropCoords,
        service_location_id: nextServiceLocationId,
        zone_id: nextZoneId,
        selectedCategory: routeState.selectedCategory,
      },
    });
  };

  const returnParcelSelection = (targetInput, address, coords) => {
    navigate(parcelReturnPath, {
      state: {
        ...routeState,
        pickup: targetInput === 'pickup' ? address : pickup,
        drop: targetInput === 'drop' ? address : drop,
        pickupCoords: targetInput === 'pickup' ? coords : pickupCoords,
        dropCoords: targetInput === 'drop' ? coords : dropCoords,
        activeInput: targetInput,
        editPickup: targetInput === 'pickup',
        openMapPicker: false,
      },
    });
  };

  const handleParcelBack = (keepMapPicker = false) => {
    navigate(parcelReturnPath, {
      state: {
        ...routeState,
        pickup,
        drop,
        pickupCoords,
        dropCoords,
        activeInput,
        editPickup: activeInput === 'pickup',
        openMapPicker: keepMapPicker,
      },
    });
  };

  const handleScreenBack = () => {
    if (isParcelFlow) {
      handleParcelBack(false);
      return;
    }
    navigate(-1);
  };

  const handleMapBack = () => {
    if (isParcelFlow) {
      handleParcelBack(false);
      return;
    }
    setShowMapPicker(false);
  };

  const addStop = () => {
    setStops((prev) => [...prev, '']);
    setActiveInput(stops.length);
  };
  const removeStop = (idx) => {
    setStops((prev) => prev.filter((_, i) => i !== idx));
    setActiveInput('drop');
  };
  const updateStop = (idx, val) => {
    setStops((prev) => prev.map((s, i) => (i === idx ? val : s)));
  };

  const handleConfirmMapLocation = () => {
    const finalAddress = pickedAddress;
    const selectedCoords = [lastCenterRef.current.lng, lastCenterRef.current.lat];

    if (activeInput === 'pickup') {
      if (isParcelFlow) {
        returnParcelSelection('pickup', finalAddress, selectedCoords);
        return;
      }
      setPickup(finalAddress);
      setPickupCoords(selectedCoords);
      saveLocation({ address: finalAddress, lat: selectedCoords[1], lon: selectedCoords[0] });
      saveRecentLocation(finalAddress, selectedCoords);
      setActiveInput('drop');
    } else if (activeInput === 'drop') {
      if (isParcelFlow) {
        returnParcelSelection('drop', finalAddress, selectedCoords);
        return;
      }
      setDrop(finalAddress);
      setDropCoords(selectedCoords);
      saveRecentLocation(finalAddress, selectedCoords);
      handleConfirmNavigate(finalAddress, selectedCoords);
    } else if (typeof activeInput === 'number') {
      updateStop(activeInput, finalAddress);
      saveRecentLocation(finalAddress, selectedCoords);
    }
    setShowMapPicker(false);
  };

  const handleSelectResult = async (result, selectedCoords = null) => {
    const normalizedResult = typeof result === 'string' ? { title: result, address: result, coords: selectedCoords } : result;
    const resolvedSelection = await resolvePlaceSelection(normalizedResult);
    const finalTitle = resolvedSelection.title || resolvedSelection.address;
    const resolvedCoords = selectedCoords || resolvedSelection.coords;

    if (activeInput === 'pickup') {
      if (isParcelFlow) {
        returnParcelSelection('pickup', finalTitle, resolvedCoords);
        return;
      }
      setPickup(finalTitle);
      setPickupCoords(resolvedCoords);
      saveLocation({ address: finalTitle, lat: resolvedCoords[1], lon: resolvedCoords[0] });
      saveRecentLocation(finalTitle, resolvedCoords);
      setActiveInput('drop');
    } else if (activeInput === 'drop') {
      if (isParcelFlow) {
        returnParcelSelection('drop', finalTitle, resolvedCoords);
        return;
      }
      setDrop(finalTitle);
      setDropCoords(resolvedCoords);
      saveRecentLocation(finalTitle, resolvedCoords);
      handleConfirmNavigate(finalTitle, resolvedCoords);
    } else if (typeof activeInput === 'number') {
      updateStop(activeInput, finalTitle);
      saveRecentLocation(finalTitle, resolvedCoords);
      if (activeInput < stops.length - 1) setActiveInput(activeInput + 1);
      else setActiveInput('drop');
    }
  };

  const handleUseCurrentLocationResult = async () => {
    setIsLocating(true);
    let pos;
    try {
      pos = await getDevicePosition();
    } catch {
      setIsLocating(false);
      return;
    }
    setIsLocating(false);
    const { latitude, longitude } = pos.coords;
    const addr = (await reverseGeocodeAddress(latitude, longitude)) || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    const coords = [longitude, latitude];
    if (isParcelFlow) {
      returnParcelSelection(activeInput, addr, coords);
      return;
    }
    if (activeInput === 'drop') {
      setDrop(addr);
      setDropCoords(coords);
      handleConfirmNavigate(addr, coords);
    } else {
      handleSelectResult(addr, coords);
    }
  };

  // pin lift while dragging / geocoding
  const pinLift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pinLift, { toValue: isDragging || isGeocoding ? -12 : 0, stiffness: 300, damping: 20, mass: 1, useNativeDriver: true }).start();
  }, [isDragging, isGeocoding, pinLift]);

  const mapRegion = {
    latitude: mapCenter.lat,
    longitude: mapCenter.lng,
    latitudeDelta: 0.006,
    longitudeDelta: 0.006,
  };

  const heading = query.trim().length > 0 ? 'Search Results' : currentZone?.name ? `${currentZone.name} Suggestions` : 'Popular Locations';

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#F8FAFC', '#F3F4F6', '#EEF2F7']} locations={[0, 0.38, 1]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <Press onPress={handleScreenBack} style={styles.backBtn}>
            <ArrowLeft size={22} color={tw.slate900} strokeWidth={3} />
          </Press>
          <View style={{ minWidth: 0 }}>
            <Text style={styles.headerKicker}>RIDE</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>Where to?</Text>
          </View>
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: pickup && drop ? 110 : 24 + insets.bottom }}>
        {/* Input Card */}
        <View style={styles.inputWrap}>
          <View style={styles.inputCard}>
            {/* Pickup */}
            <View style={styles.row}>
              <View style={[styles.dotRing, { borderColor: tw.emerald700 }]}><View style={[styles.dot, { backgroundColor: tw.emerald700 }]} /></View>
              <View style={[styles.field, activeInput === 'pickup' && { boxShadow: `0 0 0 2px ${tw.emerald200}` }]}>
                <TextInput
                  value={pickup}
                  onChangeText={(v) => setPickup(sanitizeLocationInput(v))}
                  onFocus={() => setActiveInput('pickup')}
                  placeholder="Your pickup location"
                  placeholderTextColor={tw.slate300}
                  style={styles.input}
                />
                {pickup.length > 0 && (
                  <Press onPress={() => setPickup('')} scale={1} style={styles.clearBtn}><X size={16} color={tw.slate300} /></Press>
                )}
              </View>
            </View>

            <View style={styles.connector} />

            {/* Stops */}
            {stops.map((stop, idx) => (
              <View key={`stop-${idx}`}>
                <View style={styles.row}>
                  <View style={[styles.dotRing, { borderColor: tw.indigo500 }]}><View style={[styles.dot, { backgroundColor: tw.indigo500 }]} /></View>
                  <View
                    style={[
                      styles.field,
                      stop.trim().length > 0
                        ? { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: tw.indigo200 || '#C7D2FE', boxShadow: '0 10px 24px rgba(99,102,241,0.10)' }
                        : { backgroundColor: 'rgba(238,242,255,0.7)', borderColor: 'rgba(224,231,255,0.7)' },
                      activeInput === idx && { boxShadow: `0 0 0 2px ${'#C7D2FE'}` },
                    ]}
                  >
                    <TextInput
                      value={stop}
                      autoFocus={activeInput === idx}
                      placeholder={`Stop ${idx + 1} location...`}
                      placeholderTextColor={stop.trim().length > 0 ? tw.slate300 : '#A3B3FF'}
                      onFocus={() => setActiveInput(idx)}
                      onChangeText={(v) => updateStop(idx, sanitizeLocationInput(v))}
                      style={styles.input}
                    />
                    {stop.length > 0 && (
                      <Press onPress={() => updateStop(idx, '')} scale={1} style={styles.clearBtn}><X size={16} color="#A3B3FF" /></Press>
                    )}
                  </View>
                  <Press onPress={() => removeStop(idx)} style={styles.removeStop}>
                    <Minus size={14} color={tw.red500 || '#F43F5E'} strokeWidth={3} />
                  </Press>
                </View>
                <View style={[styles.connector, { marginTop: 12 }]} />
              </View>
            ))}

            {/* Drop */}
            <View style={styles.row}>
              <View style={[styles.dotRing, { borderColor: tw.orange600 }]}><View style={[styles.dot, { backgroundColor: tw.orange600 }]} /></View>
              <View style={[styles.field, activeInput === 'drop' && { boxShadow: `0 0 0 2px ${tw.orange200}` }]}>
                <TextInput
                  value={drop}
                  autoFocus={activeInput === 'drop'}
                  placeholder="Enter drop location..."
                  placeholderTextColor={tw.slate300}
                  onFocus={() => setActiveInput('drop')}
                  onChangeText={(v) => setDrop(sanitizeLocationInput(v))}
                  style={styles.input}
                />
                {drop.length > 0 && (
                  <Press onPress={() => setDrop('')} scale={1} style={styles.clearBtn}><X size={16} color={tw.slate300} /></Press>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Action pills */}
        <View style={styles.pills}>
          <Press onPress={showMapToast} style={styles.pill}>
            <MapPin size={16} color={tw.slate900} />
            <Text style={styles.pillText}>Select on map</Text>
          </Press>
          <Press onPress={addStop} style={styles.pill}>
            <View style={styles.plusBox}><Plus size={12} color="#fff" strokeWidth={3} /></View>
            <Text style={styles.pillText}>Add stop {stops.length > 0 ? `(${stops.length})` : ''}</Text>
          </Press>
        </View>

        {/* Stop chips */}
        {stops.length > 0 && (
          <View style={styles.chipsWrap}>
            {stops.map((s, idx) => (
              <View key={idx} style={styles.chip}>
                <View style={styles.chipDot} />
                <Text style={styles.chipText} numberOfLines={1}>{s.trim() || `Stop ${idx + 1}`}</Text>
                <Press onPress={() => removeStop(idx)} scale={1}><X size={11} color={tw.slate400} strokeWidth={3} /></Press>
              </View>
            ))}
          </View>
        )}

        {/* Results */}
        <View style={styles.resultsWrap}>
          <Text style={styles.resultsHeading}>{heading.toUpperCase()}</Text>

          {searchResults.length > 0 ? (
            <View style={styles.resultsCard}>
              <Press onPress={handleUseCurrentLocationResult} scale={0.99} style={styles.currentRow}>
                <View style={styles.currentIcon}>
                  {isLocating ? <Spinner size={18} color={tw.emerald500} /> : <Navigation size={18} color={tw.emerald500} fill={tw.emerald50} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.currentTitle}>Use Current Location</Text>
                  <Text style={styles.currentSub}>Perfect for accurate pickup</Text>
                </View>
                <ChevronRight size={16} color={tw.slate300} />
              </Press>

              {searchResults.map((result, idx) => (
                <Press
                  key={idx}
                  onPress={() => handleSelectResult(result)}
                  scale={0.99}
                  style={[styles.resultRow, idx === searchResults.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.resultIcon}><MapPin size={18} color={tw.slate500} strokeWidth={2.6} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.resultTitle}>{result.title}</Text>
                    <Text style={styles.resultAddr} numberOfLines={1}>{result.address}</Text>
                  </View>
                </Press>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Text style={styles.emptyDash}>—</Text></View>
              <Text style={styles.emptyTitle}>
                No results for <Text style={{ color: tw.slate900 }}>&quot;{query}&quot;</Text>
              </Text>
              <Text style={styles.emptySub}>Try a different search term</Text>
            </View>
          )}
          {query.trim().length >= 3 && (
            <Text style={styles.note}>
              {isSearchingLocations
                ? 'Searching locations inside your service zone...'
                : zonePaths.length
                  ? 'Showing zone-prioritized results after 3+ characters.'
                  : 'Showing optimized search results after 3+ characters.'}
            </Text>
          )}
          {!query.trim().length && currentZone?.name ? (
            <Text style={styles.note}>
              Popular suggestions are pulled from the admin-created stores in the <Text style={{ color: tw.slate600 }}>{currentZone.name}</Text> zone.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Confirm button */}
      {pickup && drop && !showMapPicker ? (
        <View style={[styles.confirmWrap, { bottom: 24 }]} pointerEvents="box-none">
          <Press onPress={() => handleConfirmNavigate()} scale={0.98} style={styles.confirmBtn}>
            <Text style={styles.confirmText}>Confirm & Proceed</Text>
            <ChevronRight size={18} color={tw.slate900} strokeWidth={3} style={{ opacity: 0.6 }} />
          </Press>
        </View>
      ) : null}

      {/* Map picker overlay */}
      {showMapPicker && (
        <View style={styles.mapOverlay}>
          <View style={styles.mapArea}>
            {!HAS_VALID_GOOGLE_MAPS_KEY ? (
              <View style={styles.mapMsgWrap}>
                <View style={styles.mapMsgCard}>
                  <View style={styles.mapMsgIcon}><X size={32} color={tw.rose400 || '#FB7185'} /></View>
                  <Text style={styles.mapMsgTitle}>Config Error</Text>
                  <Text style={styles.mapMsgSub}>Google Maps API Key is missing.</Text>
                </View>
              </View>
            ) : (
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFill}
                initialRegion={mapRegion}
                toolbarEnabled={false}
                showsMyLocationButton={false}
                showsCompass={false}
                moveOnMarkerPress={false}
                onPanDrag={() => setIsDragging(true)}
                onRegionChangeComplete={handleMapIdle}
              />
            )}

            {/* Central pin */}
            <View style={styles.pinWrap} pointerEvents="none">
              <Animated.View style={{ alignItems: 'center', transform: [{ translateY: pinLift }] }}>
                <View style={styles.pinHead}>
                  <View style={{ transform: [{ rotate: '-45deg' }] }}>
                    <MapIcon size={18} color="#fff" fill="rgba(255,255,255,0.2)" />
                  </View>
                </View>
                <View style={styles.pinStick} />
              </Animated.View>
              <View style={styles.pinShadow} />
            </View>

            {/* Current location FAB */}
            <Press onPress={handleUseCurrentLocation} disabled={isLocating} scale={0.9} style={styles.fab}>
              {isLocating ? <Spinner size={20} color={tw.slate400} /> : <Navigation size={20} color={tw.slate900} fill="rgba(15,23,43,0.1)" />}
            </Press>
          </View>

          {/* Header over the map */}
          <LinearGradient colors={['#FFFFFF', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0)']} style={[styles.mapHeader, { paddingTop: insets.top + 16 }]}>
            <View style={styles.mapHeaderRow}>
              <Press onPress={handleMapBack} style={styles.mapBack}>
                <ArrowLeft size={20} color={tw.slate900} strokeWidth={2.5} />
              </Press>
              <View style={styles.mapAddrBox}>
                <Text style={styles.mapAddrKicker}>SELECT POINT</Text>
                <Text style={styles.mapAddr} numberOfLines={1}>{isGeocoding ? 'Locating...' : pickedAddress}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Confirm actions */}
          <View style={[styles.mapConfirm, { paddingBottom: 40 + Math.max(0, insets.bottom - 16) }]}>
            <View style={styles.mapConfirmRow}>
              <View style={styles.mapConfirmIcon}><MapPin size={20} color={tw.slate400} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.mapConfirmTitle}>Confirm Spot</Text>
                <Text style={styles.mapConfirmAddr} numberOfLines={1}>{pickedAddress}</Text>
              </View>
            </View>
            <Press onPress={handleConfirmMapLocation} disabled={isGeocoding} scale={0.98} style={[styles.mapConfirmBtn, isGeocoding && { opacity: 0.5 }]}>
              <Check size={18} color="#fff" strokeWidth={3} />
              <Text style={styles.mapConfirmBtnText}>Confirm Location</Text>
            </Press>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: 'rgba(255,255,255,0.7)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.7)', boxShadow: '0 10px 20px rgba(15,23,42,0.05)', zIndex: 30 },
  headerInner: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 8, marginLeft: -8, borderRadius: 999 },
  headerKicker: { ...fo(700), fontSize: 10, letterSpacing: 0.5, color: tw.slate400 },
  headerTitle: { ...fo(700), marginTop: 2, fontSize: 20, lineHeight: 20, letterSpacing: -0.5, color: tw.slate900 },
  inputWrap: { paddingHorizontal: 20, paddingTop: 16 },
  inputCard: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', boxShadow: '0 18px 44px rgba(15,23,42,0.08)', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dotRing: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  input: { flex: 1, ...fo(500), fontSize: 15, color: tw.slate900, padding: 0, margin: 0 },
  clearBtn: { marginLeft: 8 },
  connector: { marginLeft: 9, height: 8, width: 0, borderLeftWidth: 1.5, borderStyle: 'dotted', borderLeftColor: 'rgba(202,213,226,0.7)' },
  removeStop: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FFE4E6', alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginVertical: 16 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 999, paddingVertical: 10, boxShadow: '0 12px 26px rgba(15,23,42,0.06)' },
  pillText: { ...fo(700), fontSize: 13, color: tw.slate800 },
  plusBox: { width: 16, height: 16, borderRadius: 4, backgroundColor: tw.indigo500, alignItems: 'center', justifyContent: 'center' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  chipDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C86FF' },
  chipText: { ...fo(700), fontSize: 12, color: tw.slate700, maxWidth: 110 },
  resultsWrap: { paddingHorizontal: 20, marginBottom: 16 },
  resultsHeading: { ...fo(700), fontSize: 14, color: tw.slate400, marginBottom: 12, marginLeft: 4, letterSpacing: 1.4 },
  resultsCard: { backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden', boxShadow: '0 14px 34px rgba(15,23,42,0.06)' },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(236,253,245,0.3)' },
  currentIcon: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.emerald100, alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  currentTitle: { ...fo(700), fontSize: 15, lineHeight: 19, color: tw.slate900 },
  currentSub: { ...fo(500), fontSize: 12, color: tw.slate400, marginTop: 2 },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.7)' },
  resultIcon: { marginTop: 2, width: 40, height: 40, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  resultTitle: { ...fo(600), fontSize: 15, lineHeight: 19, color: tw.slate900 },
  resultAddr: { ...fo(500), fontSize: 13, color: tw.slate500, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { width: 56, height: 56, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  emptyDash: { ...fo(700), fontSize: 22, color: tw.slate400 },
  emptyTitle: { ...fo(600), marginTop: 12, fontSize: 15, color: tw.slate600, textAlign: 'center' },
  emptySub: { ...fo(500), fontSize: 13, color: tw.slate400, marginTop: 4 },
  note: { ...fo(700), fontSize: 11, color: tw.slate400, marginTop: 12, paddingHorizontal: 4 },
  confirmWrap: { position: 'absolute', left: 20, right: 20, zIndex: 40 },
  confirmBtn: { backgroundColor: '#f8e001', paddingVertical: 16, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 30px rgba(248,224,1,0.3)' },
  confirmText: { ...fo(700), fontSize: 16, color: tw.slate900 },
  // map picker
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', zIndex: 100 },
  mapArea: { flex: 1, backgroundColor: tw.slate200 },
  mapHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, paddingHorizontal: 20, paddingBottom: 16 },
  mapHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mapBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' },
  mapAddrBox: { flex: 1, minWidth: 0, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, paddingHorizontal: 16, paddingVertical: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' },
  mapAddrKicker: { ...fo(700), fontSize: 10, letterSpacing: 0.5, color: tw.slate400, marginBottom: 2 },
  mapAddr: { ...fo(600), fontSize: 14, lineHeight: 17, color: tw.slate900 },
  mapMsgWrap: { ...StyleSheet.absoluteFillObject, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  mapMsgCard: { backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 32, paddingVertical: 40, borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  mapMsgIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  mapMsgTitle: { ...fo(700), fontSize: 16, color: tw.slate900 },
  mapMsgSub: { ...fo(500), marginTop: 8, fontSize: 13, color: tw.slate500, textAlign: 'center' },
  pinWrap: { position: 'absolute', top: '50%', left: '50%', width: 40, marginLeft: -20, marginTop: -61, alignItems: 'center', zIndex: 10 },
  pinHead: { width: 40, height: 40, backgroundColor: tw.slate900, borderRadius: 16, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }], borderWidth: 2, borderColor: '#fff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  pinStick: { width: 4, height: 20, backgroundColor: tw.slate900, marginTop: -8 },
  pinShadow: { position: 'absolute', bottom: -4, width: 8, height: 4, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.3)' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 48, height: 48, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center', zIndex: 20, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' },
  mapConfirm: { paddingHorizontal: 20, paddingTop: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.slate50, gap: 16 },
  mapConfirmRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4, paddingHorizontal: 4 },
  mapConfirmIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  mapConfirmTitle: { ...fo(700), fontSize: 15, lineHeight: 15, color: tw.slate900 },
  mapConfirmAddr: { ...fo(500), fontSize: 12, color: tw.slate400, marginTop: 4 },
  mapConfirmBtn: { width: '100%', backgroundColor: tw.slate900, paddingVertical: 16, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 20px 25px -5px rgba(226,232,240,1)' },
  mapConfirmBtnText: { ...fo(700), fontSize: 15, color: '#fff' },
});
