import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { ArrowLeft, Check, ChevronRight, LocateFixed, MapPin, Minus, Navigation, Plus, SearchX, X } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../../../lib/webRouter';
import { Press, Spinner } from '../../../../components/ui';
import { geocodeAPI } from '../../../../api/food';
import { localStore } from '../../../../lib/storage';
import { events } from '../../../../lib/events';
import { Button, Card, EmptyState, IconButton, SectionHeader } from '../../../../components/ds';
import { color, elevation, radii, space, type } from '../../../../theme';
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
      try {
        // /admin/zones needs an admin token (the rider has none); /users/zones is the public list with the same rows.
        // /users/service-stores is not mounted on the backend, so its failure must not drop the zones.
        const [zonesResponse, storesResponse] = await Promise.all([
          api.get('/users/zones'),
          api.get('/users/service-stores').catch(() => ({ results: [] })),
        ]);
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

  // iOS keyboard: the screen sits under the module header, so the avoiding view needs its own window offset.
  const kavRef = useRef(null);
  const [kavOffset, setKavOffset] = useState(0);
  const measureKav = () => kavRef.current?.measureInWindow?.((_x, y) => setKavOffset(Number(y) || 0));
  const pointLabel = activeInput === 'pickup' ? 'Pickup' : activeInput === 'drop' ? 'Drop' : `Stop ${Number(activeInput) + 1}`;
  const pointColor = activeInput === 'pickup' ? color.primary : activeInput === 'drop' ? DROP : color.info;

  return (
    <KeyboardAvoidingView
      ref={kavRef}
      onLayout={measureKav}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={kavOffset}
      style={styles.root}
    >
      {/* Header */}
      {!showMapPicker && <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <IconButton icon={ArrowLeft} label="Go back" onPress={handleScreenBack} />
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={styles.headerKicker}>Ride</Text>
            <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">Where to?</Text>
          </View>
        </View>
      </View>}

      {!showMapPicker && <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xxl + (pickup && drop ? 0 : insets.bottom) }}>
        {/* Input Card */}
        <View style={styles.inputWrap}>
          <Card style={styles.inputCard}>
            {/* Pickup */}
            <View style={styles.row}>
              <View style={styles.markerCol}>
                <View style={[styles.dotRing, { borderColor: color.primary }]}><View style={[styles.dot, { backgroundColor: color.primary }]} /></View>
              </View>
              <View style={styles.fieldCol}>
                <Text style={[styles.fieldLabel, { color: color.primary }]}>Pickup</Text>
                <View style={[styles.field, activeInput === 'pickup' && styles.fieldFocused]}>
                  <TextInput
                    value={pickup}
                    onChangeText={(v) => setPickup(sanitizeLocationInput(v))}
                    onFocus={() => setActiveInput('pickup')}
                    selection={activeInput === 'pickup' ? undefined : { start: 0, end: 0 }}
                    placeholder="Your pickup location"
                    placeholderTextColor={color.textDisabled}
                    accessibilityLabel="Pickup location"
                    style={styles.input}
                  />
                  {pickup.length > 0 && (
                    <Press onPress={() => setPickup('')} scale={1} hitSlop={10} accessibilityLabel="Clear pickup" style={styles.clearBtn}><X size={18} color={color.textMuted} /></Press>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.connector} />

            {/* Stops */}
            {stops.map((stop, idx) => (
              <View key={`stop-${idx}`}>
                <View style={styles.row}>
                  <View style={styles.markerCol}>
                    <View style={[styles.dotRing, { borderColor: color.info }]}><View style={[styles.dot, { backgroundColor: color.info }]} /></View>
                  </View>
                  <View style={styles.fieldCol}>
                    <Text style={[styles.fieldLabel, { color: color.info }]}>{`Stop ${idx + 1}`}</Text>
                    <View style={[styles.field, activeInput === idx && styles.fieldFocused]}>
                      <TextInput
                        value={stop}
                        autoFocus={activeInput === idx}
                        placeholder={`Stop ${idx + 1} location...`}
                        placeholderTextColor={color.textDisabled}
                        onFocus={() => setActiveInput(idx)}
                        onChangeText={(v) => updateStop(idx, sanitizeLocationInput(v))}
                        accessibilityLabel={`Stop ${idx + 1} location`}
                        style={styles.input}
                      />
                      {stop.length > 0 && (
                        <Press onPress={() => updateStop(idx, '')} scale={1} hitSlop={10} accessibilityLabel={`Clear stop ${idx + 1}`} style={styles.clearBtn}><X size={18} color={color.textMuted} /></Press>
                      )}
                    </View>
                  </View>
                  <IconButton icon={Minus} label={`Remove stop ${idx + 1}`} variant="danger" size={36} iconSize={16} onPress={() => removeStop(idx)} style={styles.removeStop} />
                </View>
                <View style={[styles.connector, { marginTop: space.sm }]} />
              </View>
            ))}

            {/* Drop */}
            <View style={styles.row}>
              <View style={styles.markerCol}>
                <View style={styles.dropMarker} />
              </View>
              <View style={styles.fieldCol}>
                <Text style={[styles.fieldLabel, { color: DROP }]}>Drop</Text>
                <View style={[styles.field, activeInput === 'drop' && styles.fieldFocused]}>
                  <TextInput
                    value={drop}
                    autoFocus={activeInput === 'drop'}
                    placeholder="Enter drop location..."
                    placeholderTextColor={color.textDisabled}
                    onFocus={() => setActiveInput('drop')}
                    selection={activeInput === 'drop' ? undefined : { start: 0, end: 0 }}
                    onChangeText={(v) => setDrop(sanitizeLocationInput(v))}
                    accessibilityLabel="Drop location"
                    style={styles.input}
                  />
                  {drop.length > 0 && (
                    <Press onPress={() => setDrop('')} scale={1} hitSlop={10} accessibilityLabel="Clear drop" style={styles.clearBtn}><X size={18} color={color.textMuted} /></Press>
                  )}
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Action pills */}
        <View style={styles.pills}>
          <Button title="Select on map" icon={MapPin} variant="outline" size="md" onPress={showMapToast} style={styles.pill} />
          <Button title={`Add stop${stops.length > 0 ? ` (${stops.length})` : ''}`} icon={Plus} variant="outline" size="md" onPress={addStop} style={styles.pill} />
        </View>

        {/* Stop chips */}
        {stops.length > 0 && (
          <View style={styles.chipsWrap}>
            {stops.map((s, idx) => (
              <View key={idx} style={styles.chip}>
                <View style={styles.chipDot} />
                <Text style={styles.chipText} numberOfLines={1}>{s.trim() || `Stop ${idx + 1}`}</Text>
                <Press onPress={() => removeStop(idx)} scale={1} hitSlop={12} accessibilityLabel={`Remove stop ${idx + 1}`}><X size={14} color={color.textMuted} strokeWidth={2.5} /></Press>
              </View>
            ))}
          </View>
        )}

        {/* Results */}
        <View style={styles.resultsWrap}>
          <SectionHeader title={heading} />

          {searchResults.length > 0 ? (
            <Card padded={false} style={{ overflow: 'hidden' }}>
              <Press onPress={handleUseCurrentLocationResult} scale={0.99} accessibilityLabel="Use current location" accessibilityState={{ busy: isLocating }} style={styles.currentRow}>
                <View style={styles.currentIcon}>
                  {isLocating ? <Spinner size={18} color={color.primary} /> : <Navigation size={18} color={color.primary} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.currentTitle}>Use current location</Text>
                  <Text style={styles.currentSub}>Perfect for accurate pickup</Text>
                </View>
                <ChevronRight size={20} color={color.textMuted} />
              </Press>

              {searchResults.map((result, idx) => (
                <Press
                  key={idx}
                  onPress={() => handleSelectResult(result)}
                  scale={0.99}
                  accessibilityLabel={`${result.title}, ${result.address}`}
                  style={[styles.resultRow, idx === searchResults.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.resultIcon}><MapPin size={18} color={color.textSecondary} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{result.title}</Text>
                    <Text style={styles.resultAddr} numberOfLines={2}>{result.address}</Text>
                  </View>
                </Press>
              ))}
            </Card>
          ) : (
            <Card>
              <EmptyState icon={SearchX} title={`No results for "${query}"`} message="Try a different search term" style={styles.empty} />
            </Card>
          )}
          {query.trim().length >= 3 && (
            <View style={styles.noteRow}>
              {isSearchingLocations ? <Spinner size={14} color={color.primary} /> : null}
              <Text style={styles.note}>
                {isSearchingLocations
                  ? 'Searching locations inside your service zone...'
                  : zonePaths.length
                    ? 'Showing zone-prioritized results after 3+ characters.'
                    : 'Showing optimized search results after 3+ characters.'}
              </Text>
            </View>
          )}
          {!query.trim().length && currentZone?.name ? (
            <Text style={styles.note}>
              Popular suggestions are pulled from the admin-created stores in the <Text style={{ color: color.textSecondary, fontFamily: 'Poppins_600SemiBold' }}>{currentZone.name}</Text> zone.
            </Text>
          ) : null}
        </View>
      </ScrollView>}

      {/* Confirm button: pinned bar under the list */}
      {pickup && drop && !showMapPicker ? (
        <View style={[styles.confirmBar, { paddingBottom: space.lg + insets.bottom }]}>
          <Button title="Confirm & proceed" iconRight={ChevronRight} size="lg" onPress={() => handleConfirmNavigate()} />
        </View>
      ) : null}

      {/* Map picker overlay */}
      {showMapPicker && (
        <View style={styles.mapOverlay}>
          <View style={styles.mapArea}>
            {!HAS_VALID_GOOGLE_MAPS_KEY ? (
              <View style={styles.mapMsgWrap}>
                <Card style={styles.mapMsgCard}>
                  <View style={styles.mapMsgIcon}><X size={28} color={color.danger} /></View>
                  <Text style={styles.mapMsgTitle}>Map unavailable</Text>
                  <Text style={styles.mapMsgSub}>Google Maps API Key is missing.</Text>
                </Card>
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

            {/* Central pin: green for pickup, red for drop */}
            <View style={styles.pinWrap} pointerEvents="none">
              <Animated.View style={{ alignItems: 'center', transform: [{ translateY: pinLift }] }}>
                <View style={[styles.pinHead, { backgroundColor: pointColor }]}>
                  <MapPin size={18} color={color.textInverse} />
                </View>
                <View style={[styles.pinStick, { backgroundColor: pointColor }]} />
              </Animated.View>
              <View style={styles.pinShadow} />
            </View>

            {/* Current location FAB */}
            <Press onPress={handleUseCurrentLocation} disabled={isLocating} scale={0.9} accessibilityLabel="Move map to my location" accessibilityState={{ busy: isLocating }} style={styles.fab}>
              {isLocating ? <Spinner size={20} color={color.primary} /> : <LocateFixed size={22} color={color.primary} />}
            </Press>
          </View>

          {/* Header over the map */}
          <View style={[styles.mapHeader, { paddingTop: insets.top + space.md }]} pointerEvents="box-none">
            <View style={styles.mapHeaderRow}>
              <IconButton icon={ArrowLeft} label="Back to search" onPress={handleMapBack} style={styles.mapBack} />
              <View style={styles.mapAddrBox}>
                <Text style={[styles.mapAddrKicker, { color: pointColor }]}>{`Select ${pointLabel.toLowerCase()} point`}</Text>
                <Text style={styles.mapAddr} numberOfLines={1}>{isGeocoding ? 'Locating...' : pickedAddress}</Text>
              </View>
            </View>
          </View>

          {/* Confirm actions */}
          <View style={[styles.mapConfirm, { paddingBottom: space.lg + insets.bottom }]}>
            <View style={styles.mapConfirmRow}>
              <View style={[styles.mapConfirmIcon, { backgroundColor: activeInput === 'drop' ? color.dangerSoft : color.primarySoft }]}><MapPin size={20} color={pointColor} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.mapConfirmTitle}>{`Confirm ${pointLabel.toLowerCase()} spot`}</Text>
                <Text style={styles.mapConfirmAddr} numberOfLines={2}>{pickedAddress}</Text>
              </View>
            </View>
            <Button title="Confirm location" icon={Check} size="lg" onPress={handleConfirmMapLocation} disabled={isGeocoding} />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/** Drop is a red square marker everywhere in the ride flow; pickup is a brand-green dot. */
const DROP = color.danger;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border, zIndex: 30 },
  headerInner: { paddingHorizontal: space.sm, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  headerKicker: { ...type.overline, color: color.goldText },
  headerTitle: { ...type.heading, color: color.text },
  inputWrap: { paddingHorizontal: space.lg, paddingTop: space.lg },
  inputCard: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  markerCol: { width: 20, height: 48, alignItems: 'center', justifyContent: 'center' },
  fieldCol: { flex: 1, minWidth: 0, gap: space.xs },
  fieldLabel: { ...type.label },
  dotRing: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dropMarker: { width: 16, height: 16, borderRadius: 3, backgroundColor: DROP, borderWidth: 3, borderColor: color.dangerSoft },
  field: { minHeight: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: color.surfaceMuted, borderWidth: 1.5, borderColor: color.border, borderRadius: radii.md, paddingHorizontal: space.md },
  fieldFocused: { borderColor: color.primary, backgroundColor: color.surface },
  input: { flex: 1, minWidth: 0, ...type.body, fontSize: 15, color: color.text, paddingVertical: space.sm, margin: 0, outlineStyle: 'none' },
  clearBtn: { marginLeft: space.sm, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  connector: { marginLeft: 9, height: 12, width: 0, borderLeftWidth: 2, borderStyle: 'dotted', borderLeftColor: color.borderStrong },
  removeStop: { marginBottom: 6 },
  pills: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, marginVertical: space.lg },
  pill: { flex: 1, paddingHorizontal: space.sm },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg, marginBottom: space.lg },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.pill, paddingHorizontal: space.md, height: 36 },
  chipDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.info },
  chipText: { ...type.label, color: color.text, maxWidth: 140 },
  resultsWrap: { paddingHorizontal: space.lg, marginBottom: space.lg },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 68, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: color.border, backgroundColor: color.primarySoft },
  currentIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.primaryBorder, alignItems: 'center', justifyContent: 'center' },
  currentTitle: { ...type.bodyStrong, color: color.primary },
  currentSub: { ...type.caption, color: color.textSecondary },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 64, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  resultIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { ...type.bodyStrong, color: color.text },
  resultAddr: { ...type.small, color: color.textMuted },
  empty: { paddingVertical: space.xxl },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  note: { ...type.caption, color: color.textMuted, marginTop: space.md, flexShrink: 1 },
  confirmBar: { paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, ...elevation.sheet },
  // map picker
  mapOverlay: { flex: 1, backgroundColor: color.surface },
  mapArea: { flex: 1, backgroundColor: color.surfaceMuted },
  mapHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, paddingHorizontal: space.lg, paddingBottom: space.lg },
  mapHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mapBack: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.float },
  mapAddrBox: { flex: 1, minWidth: 0, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.lg, paddingVertical: space.sm, ...elevation.float },
  mapAddrKicker: { ...type.caption, fontFamily: 'Poppins_600SemiBold' },
  mapAddr: { ...type.bodyStrong, color: color.text },
  mapMsgWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl },
  mapMsgCard: { alignItems: 'center', paddingHorizontal: space.xxxl, paddingVertical: space.xxxl },
  mapMsgIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  mapMsgTitle: { ...type.subheading, color: color.text },
  mapMsgSub: { ...type.small, marginTop: space.sm, color: color.textMuted, textAlign: 'center' },
  pinWrap: { position: 'absolute', top: '50%', left: '50%', width: 40, marginLeft: -20, marginTop: -58, alignItems: 'center', zIndex: 10 },
  pinHead: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: color.surface, ...elevation.float },
  pinStick: { width: 4, height: 18, marginTop: -2, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  pinShadow: { position: 'absolute', bottom: -4, width: 10, height: 4, borderRadius: 4, backgroundColor: color.overlay },
  fab: { position: 'absolute', bottom: space.xl, right: space.lg, width: 48, height: 48, backgroundColor: color.surface, borderRadius: 24, borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center', zIndex: 20, ...elevation.float },
  mapConfirm: { paddingHorizontal: space.lg, paddingTop: space.lg, backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, marginTop: -space.xl, gap: space.lg, ...elevation.sheet },
  mapConfirmRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mapConfirmIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  mapConfirmTitle: { ...type.subheading, color: color.text },
  mapConfirmAddr: { ...type.small, color: color.textMuted },
});
