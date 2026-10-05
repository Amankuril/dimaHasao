import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Keyboard, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { AlertTriangle, ArrowLeft, ArrowUpDown, Calendar, Check, ChevronRight, LoaderCircle, MapPin, MapPinned, Navigation, Pencil, PhoneCall, Search, User, X } from 'lucide-react-native';
import { Press } from '../../../../components/ui';
import { useAnimatedValue } from '../../../../lib/useAnimatedValue';
import { toast } from '../../../../lib/notify';
import { useNavigate } from '../../../../lib/webRouter';
import { geocodeAPI } from '../../../../api/food';
import { tw } from '../../../../theme';
import usePlatformSettings from '../../../../shared/hooks/usePlatformSettings';
import { fo } from '../../../../taxi/account/ui';
import { userService } from '../../../../taxi/services/userService';
import { DISTRICT_CENTER, HAS_VALID_GOOGLE_MAPS_KEY } from '../../../../taxi/utils/googleMaps';
import { getTaxiUserRoutePrefix } from '../../../../taxi/utils/routePrefix';

// Web: Taxi/modules/user/pages/intercity/IntercityHome.jsx (/taxi/user/intercity)
// The Maps JS SDK (autocomplete / geocoder / GoogleMap) is replaced by react-native-maps and the backend geocode proxy.

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase();

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

const formatDateToDDMMYYYY = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
};

const formatTimeTo12Hour = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayHour).padStart(2, '0')}:${minutes} ${ampm}`;
};

const normalizeSuggestionKey = (result) => `${String(result?.title || '').trim().toLowerCase()}|${String(result?.address || '').trim().toLowerCase()}`;
const MAP_REVERSE_GEOCODE_DEBOUNCE_MS = 450;
const getLatLngCacheKey = (coords, precision = 5) => `${Number(coords?.lat || 0).toFixed(precision)},${Number(coords?.lng || 0).toFixed(precision)}`;

const pad2 = (n) => String(n).padStart(2, '0');
const toLocalDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const placeToResult = (p) => {
  const lat = Number(p?.location?.latitude);
  const lng = Number(p?.location?.longitude);
  const name = p?.displayName?.text || p?.displayName || '';
  const addr = p?.formattedAddress || '';
  return {
    title: name || addr,
    address: addr || name,
    placeId: p?.id,
    coords: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined,
  };
};

const regionFor = (c, delta = 0.01) => ({ latitude: c.lat, longitude: c.lng, latitudeDelta: delta, longitudeDelta: delta });

export default function IntercityHome() {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const routePrefix = getTaxiUserRoutePrefix();
  // The district's own number, set once in Global Settings.
  const supportPhone = String(usePlatformSettings().supportPhone || '').trim();

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');

  const [fromCity, setFromCity] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);

  const [toCitySearch, setToCitySearch] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isToFocused, setIsToFocused] = useState(false);

  const [travelDate, setTravelDate] = useState(() => toLocalDate(new Date()));
  const [travelTime, setTravelTime] = useState(() => {
    const now = new Date(Date.now() + 60 * 60 * 1000); // Default to 1 hour from now
    return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  });
  const [tripType, setTripType] = useState('One Way');
  const [iosPicker, setIosPicker] = useState(false);

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapCenter, setMapCenter] = useState(DISTRICT_CENTER);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mapSearchInput, setMapSearchInput] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [isSearchingMapLocations, setIsSearchingMapLocations] = useState(false);
  const [isMapSearchFocused, setIsMapSearchFocused] = useState(false);
  const [isEditingPickup, setIsEditingPickup] = useState(false);
  const mapRef = useRef(null);
  const lastCenterRef = useRef(DISTRICT_CENTER);
  const mapSearchInputRef = useRef(null);
  const mapSearchCacheRef = useRef(new Map());
  const latestMapSearchRef = useRef(0);
  const reverseGeocodeTimerRef = useRef(null);
  const reverseGeocodeCacheRef = useRef(new Map());
  const rootRef = useRef(null);
  const boxRef = useRef(null);
  const [dropPos, setDropPos] = useState(null);

  useEffect(() => {
    const loadPackages = async () => {
      try {
        setLoading(true);
        const response = await userService.getIntercityPackages();
        const results = Array.isArray(response?.results) ? response.results : [];
        setPackages(results);
        // Initial setup for fromCity if results exist
        if (results.length > 0 && !fromCity && results[0]?.serviceLocationName) {
          setFromCity(results[0].serviceLocationName);
        }
      } catch {
        setError('Could not load intercity packages');
      } finally {
        setLoading(false);
      }
    };
    loadPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set current location on mount if allowed
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!active) return;
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMapCenter(coords);
        setPickupCoords([coords.lng, coords.lat]);
        reverseGeocode(coords);
      } catch {
        // permission denied / no fix: the rider sets the pickup on the map
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reverseGeocode = async (coords) => {
    const cacheKey = getLatLngCacheKey(coords);
    const cached = reverseGeocodeCacheRef.current.get(cacheKey);
    const applyCity = (cityName) => {
      if (!cityName) return;
      const matched = packages.find((pkg) => String(pkg.serviceLocationName || '').toLowerCase() === cityName.toLowerCase());
      if (matched) setFromCity(matched.serviceLocationName);
    };
    if (cached) {
      setPickupAddress(cached.address);
      applyCity(cached.cityName);
      return;
    }

    setIsGeocoding(true);
    try {
      const response = await geocodeAPI.reverse(coords.lat, coords.lng);
      const data = response?.data?.data;
      const first = data?.status === 'OK' ? data.results?.[0] : null;
      if (first) {
        const address = first.formatted_address;
        setPickupAddress(address);
        // Find city name to filter packages
        const cityObj = (first.address_components || []).find((c) => c.types.includes('locality') || c.types.includes('administrative_area_level_2'));
        const cityName = cityObj?.long_name || '';
        reverseGeocodeCacheRef.current.set(cacheKey, { address, cityName });
        if (cityObj) applyCity(cityName);
      }
    } catch {
      // keep the previous address
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleMapIdle = (region) => {
    const lat = region.latitude;
    const lng = region.longitude;
    const diff = Math.abs(lat - lastCenterRef.current.lat) + Math.abs(lng - lastCenterRef.current.lng);
    if (diff < 0.00001) {
      setIsDragging(false);
      return;
    }
    lastCenterRef.current = { lat, lng };
    setIsDragging(false);
    if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
    reverseGeocodeTimerRef.current = setTimeout(() => {
      reverseGeocode({ lat, lng });
    }, MAP_REVERSE_GEOCODE_DEBOUNCE_MS);
  };

  useEffect(() => () => {
    if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
  }, []);

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted && perm.canAskAgain !== false) perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const nextCenter = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (mapRef.current) mapRef.current.animateToRegion(regionFor(nextCenter, 0.0025), 300);
      else setMapCenter(nextCenter);
    } catch {
      // ignored, as the web's error callback
    } finally {
      setIsLocating(false);
    }
  };

  const handleOpenMapPicker = () => {
    const center = Array.isArray(pickupCoords) && pickupCoords.length === 2 ? { lat: pickupCoords[1], lng: pickupCoords[0] } : mapCenter;
    setMapCenter(center);
    lastCenterRef.current = center;
    setMapSearchInput(pickupAddress || '');
    setMapSearchResults([]);
    setIsSearchingMapLocations(false);
    setIsMapSearchFocused(false);
    setIsEditingPickup(false);
    setShowMapPicker(true);
    // Reverse geocoding only runs on drag end; without this a rider who confirmed without moving the map had no address.
    if (!pickupAddress) reverseGeocode(center);
  };

  const handleEditPickup = () => {
    setIsEditingPickup(true);
    setMapSearchInput('');
    setMapSearchResults([]);
    setIsMapSearchFocused(true);
    setTimeout(() => mapSearchInputRef.current?.focus(), 50);
  };

  const handleMapSearchSuggestionSelect = (result) => {
    if (!result?.coords) return;
    const nextCenter = result.coords;
    lastCenterRef.current = nextCenter;
    setMapCenter(nextCenter);
    setPickupAddress(result.address);
    setMapSearchInput(result.address);
    setMapSearchResults([]);
    setIsMapSearchFocused(false);
    setIsEditingPickup(false);
    Keyboard.dismiss();
    if (mapRef.current) mapRef.current.animateToRegion(regionFor(nextCenter, 0.0025), 300);
  };

  useEffect(() => {
    const trimmedQuery = mapSearchInput.trim();
    if (!showMapPicker || !isMapSearchFocused || !trimmedQuery || trimmedQuery.length < 4 || !HAS_VALID_GOOGLE_MAPS_KEY || trimmedQuery === String(pickupAddress || '').trim()) {
      setMapSearchResults([]);
      setIsSearchingMapLocations(false);
      return undefined;
    }
    const normalizedQuery = trimmedQuery.toLowerCase();
    const cached = mapSearchCacheRef.current.get(normalizedQuery);
    if (cached) {
      setMapSearchResults(cached);
      setIsSearchingMapLocations(false);
      return undefined;
    }
    const requestId = latestMapSearchRef.current + 1;
    latestMapSearchRef.current = requestId;
    setIsSearchingMapLocations(true);
    const timeoutId = setTimeout(async () => {
      let nextResults = [];
      try {
        const res = await geocodeAPI.textSearch({ textQuery: trimmedQuery, maxResultCount: 6, latitude: mapCenter.lat, longitude: mapCenter.lng });
        const places = res?.data?.data?.places;
        nextResults = Array.isArray(places) ? places.map(placeToResult).filter((r) => r.coords) : [];
      } catch {
        nextResults = [];
      }
      if (latestMapSearchRef.current !== requestId) return;
      mapSearchCacheRef.current.set(normalizedQuery, nextResults);
      setMapSearchResults(nextResults);
      setIsSearchingMapLocations(false);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [isMapSearchFocused, mapCenter, mapSearchInput, pickupAddress, showMapPicker]);

  const filteredPackages = useMemo(() => {
    const query = normalizeSearchValue(toCitySearch);
    if (query) {
      return packages.filter((pkg) => normalizeSearchValue(pkg.destination).includes(query)
        || normalizeSearchValue(pkg.packageTypeName).includes(query)
        || normalizeSearchValue(pkg.serviceLocationName).includes(query));
    }
    return packages;
  }, [packages, toCitySearch]);

  const handleSwapLocations = () => {
    if (!pickupAddress && !toCitySearch && !selectedPackage) return;
    const prevPickupAddress = pickupAddress;
    const prevFromCity = fromCity;
    const newPickup = selectedPackage?.destination || toCitySearch || '';
    setPickupAddress(newPickup);
    setPickupCoords(null);
    const newDest = prevPickupAddress || prevFromCity || '';
    setToCitySearch(newDest);
    // Try to find a package that matches this reverse route
    const reversedPkg = packages.find((pkg) => pkg.serviceLocationName.toLowerCase().trim() === newPickup.toLowerCase().trim()
      && pkg.destination.toLowerCase().trim() === newDest.toLowerCase().trim());
    if (reversedPkg) {
      setSelectedPackage(reversedPkg);
      setFromCity(reversedPkg.serviceLocationName);
    } else {
      setSelectedPackage(null);
      if (newPickup) setFromCity(newPickup);
    }
  };

  const currentPickerValue = () => {
    const d = new Date(`${travelDate}T${travelTime}`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  };

  const applyPicked = (d) => {
    setTravelDate(toLocalDate(d));
    setTravelTime(`${pad2(d.getHours())}:${pad2(d.getMinutes())}`);
  };

  const triggerDateTimePicker = () => {
    const current = currentPickerValue();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (event, date) => {
          if (event.type !== 'set' || !date) return;
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            onChange: (ev, time) => {
              if (ev.type !== 'set' || !time) return;
              const next = new Date(date);
              next.setHours(time.getHours(), time.getMinutes(), 0, 0);
              applyPicked(next);
            },
          });
        },
      });
    } else {
      setIosPicker(true);
    }
  };

  const proceedWithPackage = (pkg) => {
    const flowPackage = serializePackageForFlow(pkg);
    const effectiveFromCity = flowPackage.serviceLocationName || fromCity || 'Pickup City';
    const combinedScheduledAt = new Date(`${travelDate}T${travelTime}`);
    navigate(`${routePrefix}/intercity/vehicle`, {
      state: {
        fromCity: effectiveFromCity,
        toCity: flowPackage.destination,
        tripType,
        rideMode: 'schedule',
        date: travelDate,
        scheduledAt: combinedScheduledAt.toISOString(),
        selectedPackages: [flowPackage],
        pickupAddress,
        pickupCoords,
      },
    });
  };

  const handleExploreCabs = () => {
    if (!pickupAddress) {
      toast.error('Please set your Pickup Location');
      setShowMapPicker(true);
      return;
    }
    if (!selectedPackage) {
      // Check if we can auto-match the current drop search query to a package
      const match = packages.find((p) => p.destination.toLowerCase().trim() === toCitySearch.toLowerCase().trim());
      if (match) {
        setSelectedPackage(match);
        proceedWithPackage(match);
      } else {
        toast.error('Please select a valid Drop Location from the suggestions');
        openToDropdown();
      }
      return;
    }
    proceedWithPackage(selectedPackage);
  };

  const openToDropdown = () => {
    setIsToFocused(true);
    setTimeout(() => {
      if (!boxRef.current || !rootRef.current) return;
      rootRef.current.measureInWindow((rx, ry) => {
        boxRef.current?.measureInWindow((x, y, w, h) => setDropPos({ left: x - rx, top: y - ry + h + 8, width: w }));
      });
    }, 0);
  };

  const displayDateStr = formatDateToDDMMYYYY(travelDate);
  const displayTimeStr = formatTimeTo12Hour(travelTime);

  const pinLift = useAnimatedValue(0);
  useEffect(() => {
    Animated.spring(pinLift, { toValue: isDragging || isGeocoding ? -15 : 0, stiffness: 300, damping: 20, mass: 1, useNativeDriver: true }).start();
  }, [isDragging, isGeocoding, pinLift]);

  return (
    <View ref={rootRef} collapsable={false} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={[st.header, { paddingTop: insets.top + 16 }]}>
        <Press onPress={() => navigate(routePrefix || '/')} scale={0.9} style={st.backBtn}>
          <ArrowLeft size={20} color={tw.slate800} strokeWidth={2.5} />
        </Press>
        <Text style={[{ fontSize: 17, letterSpacing: -0.425, color: tw.slate900 }, fo(800)]}>Outstation Cabs</Text>
        <View style={st.userDot}><User size={18} color={tw.blue600} strokeWidth={2.5} /></View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 112 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View style={st.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
              <LinearGradient colors={['rgba(226,232,240,0)', tw.slate200]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 1, flex: 1 }} />
              <Text style={[{ fontSize: 10, color: tw.blue500, letterSpacing: 1.5, textTransform: 'uppercase' }, fo(800)]}>India&apos;s Premier Intercity Cabs</Text>
              <LinearGradient colors={[tw.slate200, 'rgba(226,232,240,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 1, flex: 1 }} />
            </View>

            <View style={st.toggle}>
              {[['One Way', 'Drop-off only'], ['Round Trip', 'Return with same cab']].map(([label, sub]) => {
                const active = tripType === label;
                return (
                  <Press key={label} onPress={() => setTripType(label)} scale={1} style={[st.toggleBtn, active && { backgroundColor: '#1E90FF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }]}>
                    <Text style={[{ fontSize: 13, lineHeight: 16.25, letterSpacing: 0.33, textTransform: 'uppercase', color: active ? '#fff' : tw.slate800 }, fo(active ? 800 : 800)]}>{label}</Text>
                    <Text style={[{ fontSize: 9, marginTop: 2, lineHeight: 9, opacity: 0.85, color: active ? '#fff' : tw.slate500 }, fo(400)]}>{sub}</Text>
                  </Press>
                );
              })}
            </View>

            <View ref={boxRef} collapsable={false} style={st.locBox}>
              <Press onPress={handleOpenMapPicker} scale={1} style={st.fromRow}>
                <View style={st.locIcon}><MapPin size={20} color={tw.slate400} /></View>
                <View style={{ flex: 1, minWidth: 0, marginLeft: 16 }}>
                  <Text style={[st.fieldLabel, { marginBottom: 6 }, fo(800)]}>FROM</Text>
                  <Text numberOfLines={1} style={[{ fontSize: 15, lineHeight: 20.6, color: tw.slate800 }, fo(700)]}>{pickupAddress || 'Enter Pickup Location'}</Text>
                </View>
              </Press>

              <View style={st.toRow}>
                <View style={st.locIcon}><MapPin size={20} color="#1E90FF" /></View>
                <View style={{ flex: 1, minWidth: 0, marginLeft: 16 }}>
                  <Text style={[st.fieldLabel, { marginBottom: 4 }, fo(800)]}>TO</Text>
                  <TextInput
                    placeholder="Enter Drop Location"
                    placeholderTextColor={tw.slate400}
                    value={toCitySearch}
                    onChangeText={(text) => {
                      setToCitySearch(text);
                      if (selectedPackage && selectedPackage.destination !== text) setSelectedPackage(null);
                    }}
                    onFocus={openToDropdown}
                    style={[{ padding: 0, marginTop: 2, fontSize: 15, lineHeight: 20.6, color: tw.slate800 }, fo(700)]}
                  />
                </View>
                {toCitySearch ? (
                  <Press onPress={() => { setToCitySearch(''); setSelectedPackage(null); }} style={st.clearBtn}>
                    <X size={14} color={tw.slate400} />
                  </Press>
                ) : null}
              </View>

              <Press onPress={handleSwapLocations} scale={0.95} style={st.swapBtn}>
                <ArrowUpDown size={15} color="#1E90FF" />
              </Press>
            </View>

            <Press onPress={triggerDateTimePicker} scale={1} style={st.tripStart}>
              <View style={st.calIcon}><Calendar size={18} color="#1E90FF" /></View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={[st.fieldLabel, { marginBottom: 6 }, fo(800)]}>TRIP START</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text style={[{ fontSize: 15, lineHeight: 15, color: tw.slate800 }, fo(900)]}>{displayDateStr}</Text>
                  <Text style={[{ fontSize: 12, lineHeight: 12, color: tw.slate500 }, fo(500)]}>{displayTimeStr}</Text>
                </View>
              </View>
              <ChevronRight size={16} color={tw.slate400} />
            </Press>

            <Press onPress={handleExploreCabs} scale={0.98} style={st.explore}>
              <Text style={[{ fontSize: 15, letterSpacing: 1.5, color: '#fff', textTransform: 'uppercase' }, fo(800)]}>EXPLORE CABS</Text>
            </Press>
          </View>
        </View>

        {supportPhone ? (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <LinearGradient colors={['rgba(232,242,236,0.8)', 'rgba(243,248,245,0.8)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.cta}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                <Text style={[{ fontSize: 8, color: '#0a4d2b', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 }, fo(800)]}>Need help planning?</Text>
                <Text style={[{ fontSize: 13, lineHeight: 16.25, color: tw.slate900 }, fo(800)]}>TALK TO THE DISTRICT TEAM</Text>
                <Text style={[{ fontSize: 10, lineHeight: 13.75, marginTop: 2, color: tw.slate500 }, fo(400)]}>We can help you pick a route and a vehicle.</Text>
              </View>
              <Press onPress={() => Linking.openURL(`tel:${supportPhone.replace(/\s+/g, '')}`).catch(() => {})} style={st.callBtn}>
                <PhoneCall size={12} color="#0a4d2b" />
                <Text style={[{ fontSize: 11, color: tw.slate900, marginLeft: 6 }, fo(900)]}>Call us</Text>
              </Press>
            </LinearGradient>
          </View>
        ) : null}
      </ScrollView>

      {isToFocused ? (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setIsToFocused(false); Keyboard.dismiss(); }} />
          {dropPos ? (
            <View style={[st.dropdown, { left: dropPos.left, top: dropPos.top, width: dropPos.width }]}>
              <ScrollView style={{ maxHeight: 288 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {loading ? (
                  <View style={{ padding: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <ActivityIndicator size="small" color={tw.blue500} />
                    <Text style={[{ fontSize: 13, color: tw.slate400 }, fo(500)]}>Loading routes...</Text>
                  </View>
                ) : filteredPackages.length > 0 ? (
                  filteredPackages.map((pkg, i) => (
                    <Press
                      key={pkg.id}
                      scale={1}
                      onPress={() => {
                        setSelectedPackage(pkg);
                        setToCitySearch(pkg.destination);
                        setFromCity(pkg.serviceLocationName);
                        setIsToFocused(false);
                        Keyboard.dismiss();
                      }}
                      style={[st.pkgRow, i === filteredPackages.length - 1 && { borderBottomWidth: 0 }]}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[{ fontSize: 10, color: tw.slate400, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }, fo(700)]}>From {pkg.serviceLocationName}</Text>
                        <Text style={[{ fontSize: 14, color: tw.slate800 }, fo(900)]}>To {pkg.destination}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', paddingLeft: 12 }}>
                        <Text style={[{ fontSize: 9, color: tw.slate400, letterSpacing: 0.45, textTransform: 'uppercase' }, fo(700)]}>Starts from</Text>
                        <Text style={[{ fontSize: 14, color: tw.slate900 }, fo(900)]}>{`₹${pkg.vehicles?.[0]?.basePrice || '---'}`}</Text>
                      </View>
                    </Press>
                  ))
                ) : (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <Text style={[{ fontSize: 13, color: tw.slate400 }, fo(700)]}>No routes matching query</Text>
                    <Text style={[{ fontSize: 11, marginTop: 2, color: tw.slate400 }, fo(400)]}>Check spelling or try a different city</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          ) : null}
        </>
      ) : null}

      {iosPicker ? (
        <Modal transparent animationType="slide" onRequestClose={() => setIosPicker(false)}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setIosPicker(false)} />
          <View style={{ backgroundColor: '#fff', paddingBottom: insets.bottom + 12 }}>
            <DateTimePicker value={currentPickerValue()} mode="datetime" display="spinner" minimumDate={new Date()} onChange={(_, d) => d && applyPicked(d)} />
            <Press onPress={() => setIosPicker(false)} style={[st.explore, { marginHorizontal: 20 }]}>
              <Text style={[{ fontSize: 15, color: '#fff' }, fo(800)]}>Done</Text>
            </Press>
          </View>
        </Modal>
      ) : null}

      <Modal visible={showMapPicker} animationType="slide" statusBarTranslucent onRequestClose={() => setShowMapPicker(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flex: 1, backgroundColor: tw.slate100 }}>
            {HAS_VALID_GOOGLE_MAPS_KEY ? (
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFill}
                initialRegion={regionFor(mapCenter)}
                toolbarEnabled={false}
                showsMyLocationButton={false}
                showsCompass={false}
                moveOnMarkerPress={false}
                onPanDrag={() => setIsDragging(true)}
                onRegionChangeComplete={handleMapIdle}
              />
            ) : (
              <View style={st.mapDown}>
                <AlertTriangle size={40} color={tw.amber400} />
                <Text style={[{ fontSize: 14, color: tw.slate500, textAlign: 'center', marginTop: 16 }, fo(700)]}>Map service unavailable. Please check your connection or API key.</Text>
              </View>
            )}

            <View pointerEvents="none" style={st.pinWrap}>
              <Animated.View style={{ alignItems: 'center', transform: [{ translateY: pinLift }] }}>
                <View style={st.pinHead}><MapPinned size={20} color="#fff" /></View>
                <View style={{ width: 4, height: 24, backgroundColor: tw.blue600, marginTop: -8 }} />
              </Animated.View>
              <View style={st.pinShadow} />
            </View>

            <Press onPress={handleUseCurrentLocation} scale={0.9} style={st.locateBtn}>
              {isLocating ? <ActivityIndicator size="small" color={tw.blue500} /> : <Navigation size={24} color={tw.slate900} />}
            </Press>

            <LinearGradient colors={['#fff', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0)']} locations={[0, 0.5, 1]} style={[st.pickerTop, { paddingTop: insets.top + 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Press onPress={() => setShowMapPicker(false)} scale={0.9} style={st.pickBack}>
                  <ArrowLeft size={20} color={tw.slate900} strokeWidth={2.5} />
                </Press>
                <View style={st.pickCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                    <Text style={[{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: tw.blue600 }, fo(900)]}>Pinpoint Pickup</Text>
                    <Press onPress={handleEditPickup} style={st.editPill}>
                      <Pencil size={10} color={tw.slate600} />
                      <Text style={[{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: tw.slate600, marginLeft: 4 }, fo(900)]}>Edit</Text>
                    </Press>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {isEditingPickup ? (
                      <>
                        <Search size={14} color={tw.slate400} />
                        <TextInput
                          ref={mapSearchInputRef}
                          value={mapSearchInput}
                          onChangeText={setMapSearchInput}
                          onFocus={() => setIsMapSearchFocused(true)}
                          placeholder={isGeocoding ? 'Finding exact address...' : 'Search pickup location'}
                          placeholderTextColor={tw.slate400}
                          style={[{ flex: 1, padding: 0, fontSize: 14, color: tw.slate900 }, fo(700)]}
                        />
                      </>
                    ) : (
                      <Text numberOfLines={1} style={[{ flex: 1, fontSize: 14, lineHeight: 17.5, color: tw.slate900 }, fo(700)]}>
                        {isGeocoding ? 'Finding exact address...' : (pickupAddress || 'Set location on map')}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              {isSearchingMapLocations || mapSearchResults.length > 0 ? (
                <View style={st.sugBox}>
                  {isSearchingMapLocations ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingVertical: 8 }}>
                      <LoaderCircle size={14} color={tw.blue500} />
                      <Text style={[{ fontSize: 12, color: tw.slate500 }, fo(700)]}>Searching suggestions...</Text>
                    </View>
                  ) : null}
                  {mapSearchResults.map((result) => (
                    <Press key={normalizeSuggestionKey(result)} scale={1} onPress={() => handleMapSearchSuggestionSelect(result)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 4, paddingVertical: 12 }}>
                      <MapPin size={15} color={tw.blue500} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={[{ fontSize: 13, color: tw.slate900 }, fo(900)]}>{result.title}</Text>
                        <Text style={[{ fontSize: 12, lineHeight: 20, marginTop: 2, color: tw.slate500 }, fo(700)]}>{result.address}</Text>
                      </View>
                    </Press>
                  ))}
                </View>
              ) : null}
            </LinearGradient>
          </View>

          <View style={[st.pickFoot, { paddingBottom: Math.max(insets.bottom, 0) + 48 }]}>
            <Press
              scale={0.98}
              disabled={isGeocoding}
              onPress={() => {
                const { lat, lng } = lastCenterRef.current;
                setPickupCoords([lng, lat]);
                if (!pickupAddress) reverseGeocode({ lat, lng });
                setShowMapPicker(false);
              }}
              style={[st.confirm, isGeocoding && { opacity: 0.4 }]}
            >
              <Check size={20} color="#fff" strokeWidth={3} />
              <Text style={[{ fontSize: 16, letterSpacing: 1.6, textTransform: 'uppercase', color: '#fff', marginLeft: 12 }, fo(900)]}>Confirm Pickup</Text>
            </Press>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.slate100, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', zIndex: 30 },
  backBtn: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  userDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: tw.blue100, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: tw.slate100, boxShadow: '0 12px 40px rgba(0,0,0,0.04)' },
  toggle: { flexDirection: 'row', borderWidth: 1, borderColor: tw.slate200, borderRadius: 12, padding: 4, marginBottom: 20, backgroundColor: '#fff' },
  toggleBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  locBox: { borderWidth: 1, borderColor: tw.slate200, borderRadius: 16, backgroundColor: '#F2F7FA', padding: 2 },
  fromRow: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(226,232,240,0.8)' },
  toRow: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' },
  locIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 9, lineHeight: 9, color: tw.slate400, letterSpacing: 0.45, textTransform: 'uppercase' },
  clearBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  swapBtn: { position: 'absolute', right: 16, top: '50%', marginTop: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate200, alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  tripStart: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: '#EBF5FC', borderWidth: 1, borderColor: '#D5E6F3', flexDirection: 'row', alignItems: 'center' },
  calIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  explore: { marginTop: 20, backgroundColor: '#FF7A1A', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  cta: { padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(10,77,43,0.15)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  callBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate200, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  dropdown: { position: 'absolute', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, zIndex: 50, elevation: 12, boxShadow: '0 20px 25px rgba(0,0,0,0.1)' },
  pkgRow: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: tw.slate50 },
  mapDown: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.slate50, padding: 40 },
  pinWrap: { position: 'absolute', top: '50%', left: '50%', width: 48, marginLeft: -24, marginTop: -90, alignItems: 'center' },
  pinHead: { width: 48, height: 48, backgroundColor: tw.blue600, borderRadius: 18, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' },
  pinShadow: { position: 'absolute', bottom: -4, width: 16, height: 8, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.2)' },
  locateBtn: { position: 'absolute', bottom: 40, right: 24, width: 56, height: 56, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.slate100, zIndex: 20, boxShadow: '0 20px 25px rgba(0,0,0,0.1)' },
  pickerTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 24, zIndex: 20 },
  pickBack: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  pickCard: { flex: 1, minWidth: 0, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: tw.blue50, paddingHorizontal: 20, paddingVertical: 16, boxShadow: '0 10px 15px rgba(0,0,0,0.1)' },
  editPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: tw.slate100, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  sugBox: { marginTop: 16, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: tw.slate200, paddingHorizontal: 16, paddingVertical: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  pickFoot: { paddingHorizontal: 24, paddingTop: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.slate50 },
  confirm: { height: 64, backgroundColor: tw.blue600, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 25px rgba(59,130,246,0.2)' },
});
