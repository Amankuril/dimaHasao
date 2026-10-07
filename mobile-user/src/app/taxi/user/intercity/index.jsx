import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { AlertTriangle, ArrowLeft, ArrowUpDown, Calendar, Check, ChevronRight, LocateFixed, MapPin, Pencil, PhoneCall, Search, X } from 'lucide-react-native';
import { Press, Spinner } from '../../../../components/ui';
import { Button, IconButton } from '../../../../components/ds';
import { NAV_CLEARANCE } from '../../../../components/dh/AppBottomNav';
import { useAnimatedValue } from '../../../../lib/useAnimatedValue';
import { toast } from '../../../../lib/notify';
import { useNavigate } from '../../../../lib/webRouter';
import { geocodeAPI } from '../../../../api/food';
import { color, elevation, radii, space, type } from '../../../../theme';
import usePlatformSettings from '../../../../shared/hooks/usePlatformSettings';
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
    <View ref={rootRef} collapsable={false} style={st.screen}>
      <View style={[st.header, { paddingTop: insets.top + space.sm }]}>
        <IconButton icon={ArrowLeft} label="Back to taxi home" onPress={() => navigate(routePrefix || '/')} />
        <Text style={st.headerTitle} accessibilityRole="header">Outstation cabs</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + space.xl + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg }}>
          <View style={st.card}>
            <View style={st.kickerRow}>
              <View style={st.kickerLine} />
              <Text style={st.kicker}>India&apos;s premier intercity cabs</Text>
              <View style={st.kickerLine} />
            </View>

            <View style={st.toggle} accessibilityRole="tablist">
              {[['One Way', 'Drop-off only'], ['Round Trip', 'Return with same cab']].map(([label, sub]) => {
                const active = tripType === label;
                return (
                  <Press
                    key={label}
                    onPress={() => setTripType(label)}
                    scale={1}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${label === 'One Way' ? 'One way' : 'Round trip'}. ${sub}`}
                    style={[st.toggleBtn, active && st.toggleBtnOn]}
                  >
                    <Text style={[st.toggleLabel, { color: active ? color.onPrimary : color.text }]}>{label === 'One Way' ? 'One way' : 'Round trip'}</Text>
                    <Text style={[st.toggleSub, { color: active ? color.textOnDarkMuted : color.textMuted }]}>{sub}</Text>
                  </Press>
                );
              })}
            </View>

            <View ref={boxRef} collapsable={false} style={st.locBox}>
              <Press onPress={handleOpenMapPicker} scale={1} accessibilityLabel={`From: ${pickupAddress || 'set pickup location'}. Change on map`} style={st.fromRow}>
                <View style={st.locIcon}><View style={st.pickupDot} /></View>
                <View style={st.locText}>
                  <Text style={[st.fieldLabel, { color: color.primary }]}>From (pickup)</Text>
                  <Text numberOfLines={1} style={[st.fieldValue, !pickupAddress && { color: color.textDisabled }]}>{pickupAddress || 'Enter Pickup Location'}</Text>
                </View>
              </Press>

              <View style={st.toRow}>
                <View style={st.locIcon}><View style={st.dropSquare} /></View>
                <View style={st.locText}>
                  <Text style={[st.fieldLabel, { color: color.danger }]}>To (drop)</Text>
                  <TextInput
                    placeholder="Enter Drop Location"
                    placeholderTextColor={color.textDisabled}
                    value={toCitySearch}
                    onChangeText={(text) => {
                      setToCitySearch(text);
                      if (selectedPackage && selectedPackage.destination !== text) setSelectedPackage(null);
                    }}
                    onFocus={openToDropdown}
                    accessibilityLabel="Drop city"
                    style={st.toInput}
                  />
                </View>
                {toCitySearch ? (
                  <Press onPress={() => { setToCitySearch(''); setSelectedPackage(null); }} hitSlop={10} accessibilityLabel="Clear drop" style={st.clearBtn}>
                    <X size={18} color={color.textMuted} />
                  </Press>
                ) : null}
              </View>

              <IconButton icon={ArrowUpDown} label="Swap pickup and drop" iconSize={18} iconColor={color.primary} onPress={handleSwapLocations} style={st.swapBtn} />
            </View>

            <Press onPress={triggerDateTimePicker} scale={1} accessibilityLabel={`Trip start ${displayDateStr} ${displayTimeStr}. Change`} style={st.tripStart}>
              <View style={st.calIcon}><Calendar size={20} color={color.goldText} /></View>
              <View style={st.locText}>
                <Text style={st.fieldLabel}>Trip start</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
                  <Text style={st.fieldValue}>{displayDateStr}</Text>
                  <Text style={st.timeText}>{displayTimeStr}</Text>
                </View>
              </View>
              <ChevronRight size={20} color={color.textMuted} />
            </Press>

            <Button title="Explore cabs" size="lg" iconRight={ChevronRight} onPress={handleExploreCabs} style={{ marginTop: space.xl }} />
          </View>
        </View>

        {supportPhone ? (
          <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
            <View style={st.cta}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={st.ctaKicker}>Need help planning?</Text>
                <Text style={st.ctaTitle}>Talk to the district team</Text>
                <Text style={st.ctaBody}>We can help you pick a route and a vehicle.</Text>
              </View>
              <Button title="Call us" icon={PhoneCall} variant="outline" size="sm" fullWidth={false} onPress={() => Linking.openURL(`tel:${supportPhone.replace(/\s+/g, '')}`).catch(() => {})} accessibilityLabel="Call the district team" style={{ minHeight: 44 }} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {isToFocused ? (
        <>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close suggestions" onPress={() => { setIsToFocused(false); Keyboard.dismiss(); }} />
          {dropPos ? (
            <View style={[st.dropdown, { left: dropPos.left, top: dropPos.top, width: dropPos.width }]}>
              <ScrollView style={{ maxHeight: 288 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {loading ? (
                  <View style={st.dropState}>
                    <Spinner size={18} color={color.primary} />
                    <Text style={st.dropStateText}>Loading routes...</Text>
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
                      accessibilityLabel={`From ${pkg.serviceLocationName} to ${pkg.destination}, starts from ₹${pkg.vehicles?.[0]?.basePrice || '---'}`}
                      style={[st.pkgRow, i === filteredPackages.length - 1 && { borderBottomWidth: 0 }]}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={st.pkgFrom} numberOfLines={1}>From {pkg.serviceLocationName}</Text>
                        <Text style={st.pkgTo} numberOfLines={1}>To {pkg.destination}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', paddingLeft: space.md }}>
                        <Text style={st.pkgFrom}>Starts from</Text>
                        <Text style={st.pkgPrice}>{`₹${pkg.vehicles?.[0]?.basePrice || '---'}`}</Text>
                      </View>
                    </Press>
                  ))
                ) : (
                  <View style={[st.dropState, { flexDirection: 'column', gap: space.xxs }]}>
                    <Text style={st.dropStateTitle}>No routes matching query</Text>
                    <Text style={st.dropStateText}>Check spelling or try a different city</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          ) : null}
        </>
      ) : null}

      {iosPicker ? (
        <Modal transparent animationType="slide" onRequestClose={() => setIosPicker(false)}>
          <Pressable style={{ flex: 1, backgroundColor: color.overlay }} accessibilityLabel="Close date picker" onPress={() => setIosPicker(false)} />
          <View style={[st.iosSheet, { paddingBottom: insets.bottom + space.lg }]}>
            <DateTimePicker value={currentPickerValue()} mode="datetime" display="spinner" minimumDate={new Date()} onChange={(_, d) => d && applyPicked(d)} />
            <Button title="Done" size="lg" onPress={() => setIosPicker(false)} style={{ marginHorizontal: space.lg }} />
          </View>
        </Modal>
      ) : null}

      <Modal visible={showMapPicker} animationType="slide" statusBarTranslucent onRequestClose={() => setShowMapPicker(false)}>
        <View style={{ flex: 1, backgroundColor: color.surface }}>
          <View style={{ flex: 1, backgroundColor: color.surfaceMuted }}>
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
                <AlertTriangle size={40} color={color.warning} />
                <Text style={st.mapDownText}>Map service unavailable. Please check your connection or API key.</Text>
              </View>
            )}

            <View pointerEvents="none" style={st.pinWrap}>
              <Animated.View style={{ alignItems: 'center', transform: [{ translateY: pinLift }] }}>
                <View style={st.pinHead}><MapPin size={20} color={color.textInverse} /></View>
                <View style={st.pinStick} />
              </Animated.View>
              <View style={st.pinShadow} />
            </View>

            <Press onPress={handleUseCurrentLocation} scale={0.9} accessibilityLabel="Move map to my location" accessibilityState={{ busy: isLocating }} style={st.locateBtn}>
              {isLocating ? <Spinner size={22} color={color.primary} /> : <LocateFixed size={24} color={color.primary} />}
            </Press>

            <View style={[st.pickerTop, { paddingTop: insets.top + space.md }]} pointerEvents="box-none">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <IconButton icon={ArrowLeft} label="Close map" onPress={() => setShowMapPicker(false)} style={st.pickBack} />
                <View style={st.pickCard}>
                  <View style={st.pickCardHead}>
                    <Text style={st.pickLabel}>Pinpoint pickup</Text>
                    <Press onPress={handleEditPickup} hitSlop={10} accessibilityLabel="Search pickup location" style={st.editPill}>
                      <Pencil size={14} color={color.primary} />
                      <Text style={st.editText}>Edit</Text>
                    </Press>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    {isEditingPickup ? (
                      <>
                        <Search size={16} color={color.textMuted} />
                        <TextInput
                          ref={mapSearchInputRef}
                          value={mapSearchInput}
                          onChangeText={setMapSearchInput}
                          onFocus={() => setIsMapSearchFocused(true)}
                          placeholder={isGeocoding ? 'Finding exact address...' : 'Search pickup location'}
                          placeholderTextColor={color.textDisabled}
                          accessibilityLabel="Search pickup location"
                          style={st.pickInput}
                        />
                      </>
                    ) : (
                      <Text numberOfLines={2} style={st.pickAddr}>
                        {isGeocoding ? 'Finding exact address...' : (pickupAddress || 'Set location on map')}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              {isSearchingMapLocations || mapSearchResults.length > 0 ? (
                <View style={st.sugBox}>
                  {isSearchingMapLocations ? (
                    <View style={st.sugLoading}>
                      <Spinner size={16} color={color.primary} />
                      <Text style={st.dropStateText}>Searching suggestions...</Text>
                    </View>
                  ) : null}
                  {mapSearchResults.map((result) => (
                    <Press key={normalizeSuggestionKey(result)} scale={1} onPress={() => handleMapSearchSuggestionSelect(result)} accessibilityLabel={`${result.title}, ${result.address}`} style={st.sugRow}>
                      <MapPin size={18} color={color.primary} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={st.sugTitle}>{result.title}</Text>
                        <Text numberOfLines={2} style={st.sugAddr}>{result.address}</Text>
                      </View>
                    </Press>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          <View style={[st.pickFoot, { paddingBottom: insets.bottom + space.lg }]}>
            <Button
              title="Confirm pickup"
              icon={Check}
              size="lg"
              disabled={isGeocoding}
              onPress={() => {
                const { lat, lng } = lastCenterRef.current;
                setPickupCoords([lng, lat]);
                if (!pickupAddress) reverseGeocode({ lat, lng });
                setShowMapPicker(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { paddingHorizontal: space.sm, paddingBottom: space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border, zIndex: 30 },
  headerTitle: { ...type.heading, color: color.text },
  card: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.xl, borderWidth: 1, borderColor: color.border, ...elevation.card },
  kickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, marginBottom: space.xl },
  kickerLine: { height: 1, flex: 1, backgroundColor: color.border },
  kicker: { ...type.overline, color: color.goldText },
  toggle: { flexDirection: 'row', borderRadius: radii.md, padding: space.xs, gap: space.xs, marginBottom: space.lg, backgroundColor: color.surfaceMuted },
  toggleBtn: { flex: 1, minHeight: 56, paddingVertical: space.sm, borderRadius: radii.sm + 2, alignItems: 'center', justifyContent: 'center' },
  toggleBtnOn: { backgroundColor: color.primary },
  toggleLabel: { ...type.bodyStrong },
  toggleSub: { ...type.caption },
  locBox: { borderWidth: 1, borderColor: color.border, borderRadius: radii.lg, backgroundColor: color.bg },
  fromRow: { paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingRight: 64, borderBottomWidth: 1, borderBottomColor: color.border },
  toRow: { paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingRight: 64 },
  locIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  pickupDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: color.primary, borderWidth: 3, borderColor: color.primarySoft },
  dropSquare: { width: 14, height: 14, borderRadius: 3, backgroundColor: color.danger, borderWidth: 3, borderColor: color.dangerSoft },
  locText: { flex: 1, minWidth: 0, marginLeft: space.md },
  fieldLabel: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.textMuted },
  fieldValue: { ...type.bodyStrong, fontSize: 15, color: color.text },
  toInput: { ...type.bodyStrong, fontSize: 15, color: color.text, paddingVertical: space.xxs, outlineStyle: 'none' },
  timeText: { ...type.small, color: color.textSecondary },
  clearBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  swapBtn: { position: 'absolute', right: space.md, top: '50%', marginTop: -22, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, zIndex: 10, ...elevation.card },
  tripStart: { marginTop: space.lg, padding: space.lg, minHeight: 64, borderRadius: radii.lg, backgroundColor: color.goldSoft, borderWidth: 1, borderColor: color.border, flexDirection: 'row', alignItems: 'center' },
  calIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  cta: { padding: space.lg, gap: space.md, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: color.primarySoft, borderWidth: 1, borderColor: color.primaryBorder },
  ctaKicker: { ...type.overline, color: color.primary },
  ctaTitle: { ...type.subheading, color: color.text },
  ctaBody: { ...type.caption, color: color.textSecondary },
  dropdown: { position: 'absolute', backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, zIndex: 50, elevation: 12, overflow: 'hidden', ...elevation.float },
  dropState: { padding: space.xxl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  dropStateTitle: { ...type.bodyStrong, color: color.text },
  dropStateText: { ...type.small, color: color.textMuted },
  pkgRow: { paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  pkgFrom: { ...type.caption, color: color.textMuted },
  pkgTo: { ...type.bodyStrong, color: color.text },
  pkgPrice: { ...type.price, fontSize: 16, color: color.text },
  iosSheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingTop: space.md },
  mapDown: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceMuted, padding: space.xxxl },
  mapDownText: { ...type.body, color: color.textSecondary, textAlign: 'center', marginTop: space.lg },
  pinWrap: { position: 'absolute', top: '50%', left: '50%', width: 48, marginLeft: -24, marginTop: -72, alignItems: 'center' },
  pinHead: { width: 44, height: 44, backgroundColor: color.primary, borderRadius: 22, borderWidth: 3, borderColor: color.surface, alignItems: 'center', justifyContent: 'center', ...elevation.float },
  pinStick: { width: 4, height: 20, backgroundColor: color.primary, marginTop: -2, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  pinShadow: { position: 'absolute', bottom: -4, width: 14, height: 6, borderRadius: 7, backgroundColor: color.overlay },
  locateBtn: { position: 'absolute', bottom: space.xl, right: space.lg, width: 52, height: 52, borderRadius: 26, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.border, zIndex: 20, ...elevation.float },
  pickerTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: space.lg, paddingBottom: space.lg, zIndex: 20 },
  pickBack: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.float },
  pickCard: { flex: 1, minWidth: 0, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.lg, paddingVertical: space.md, ...elevation.float },
  pickCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginBottom: space.xs },
  pickLabel: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.primary },
  editPill: { flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: color.primarySoft, borderRadius: radii.pill, paddingHorizontal: space.md, height: 28 },
  editText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.primary },
  pickInput: { flex: 1, minWidth: 0, ...type.bodyStrong, color: color.text, paddingVertical: space.xs, outlineStyle: 'none' },
  pickAddr: { flex: 1, ...type.bodyStrong, color: color.text },
  sugBox: { marginTop: space.md, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.md, paddingVertical: space.xs, ...elevation.card },
  sugLoading: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs, paddingVertical: space.sm },
  sugRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingHorizontal: space.xs, paddingVertical: space.md, minHeight: 52 },
  sugTitle: { ...type.bodyStrong, color: color.text },
  sugAddr: { ...type.small, color: color.textMuted },
  pickFoot: { paddingHorizontal: space.lg, paddingTop: space.lg, backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.border },
});
