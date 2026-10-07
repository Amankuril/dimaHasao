import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image as RNImage, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { Briefcase, Building2, ChevronLeft, ChevronRight, Crosshair, Home, MapPin, Navigation, Pencil, Plus, Search, Trash2, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press, Spinner } from '../../components/ui';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { Input } from '../components/cart/ui';
import { geocodeAPI } from '../../api/food';
import { useLocation as useGeoLocation } from '../hooks/useLocation';
import { useProfile } from '../context/ProfileContext';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { geocodeGooglePlaceId, getFreshGpsCoordinates, reverseGeocodeWithGoogle } from '../utils/googleGeocoding';
import { resolveAddressSelectorUi } from '../../shared/utils/addressSelectorTheme';
import { CONSUMER_BRAND_LOGO } from '../../shared/constants/brandLogo';
import { navigateTo, useLocation as useRouterLocation } from '../../lib/webRouter';
import { events } from '../../lib/events';
import { localStore, sessionStore } from '../../lib/storage';
import { toast } from '../../lib/notify';
import { poppins, shadow, tw } from '../../theme';

const ENABLE_LOCATION_REVERSE_GEOCODE = process.env.EXPO_PUBLIC_ENABLE_LOCATION_REVERSE_GEOCODE !== 'false';
const PLUS_CODE = /^[a-z0-9]{2,8}\+[a-z0-9]{0,3}[,\s]*/i;
const cleanAddr = (s) => String(s || '').replace(PLUS_CODE, '').replace(/,\s*India$/, '');

/* getAddressSelectorTheme(), as colours instead of Tailwind classes. */
const THEMES = {
  food: {
    page: '#ffffff', header: '#ffffff', headerBorder: tw.gray100, eyebrow: null, headerTitle: tw.gray900,
    accent: '#0a4d2b', accentSoft: tw.red50, suggestionIconBg: tw.red50, locationIconBg: tw.red50, locationText: '#0a4d2b', locationIcon: '#0a4d2b',
    btn: '#0a4d2b', btnWeight: 700, btnSize: 18, chipOn: '#0a4d2b', chipOff: tw.zinc100, chipOffBorder: tw.zinc200, chipOffText: tw.zinc700,
    pinned: { backgroundColor: 'rgba(10,77,43,0.05)', borderColor: 'rgba(10,77,43,0.1)', borderRadius: 12 }, pinnedLabel: '#0a4d2b',
    saved: { backgroundColor: tw.slate50, borderColor: 'transparent', borderRadius: 12 }, chevBg: 'rgba(10,77,43,0.1)', chevIcon: '#0a4d2b',
    listSection: '#ffffff', listBorder: tw.zinc100, searchSection: '#ffffff', footer: '#ffffff', footerBorder: tw.gray200,
    listTitle: 'Select Location', listEyebrow: '', toastGradient: ['rgba(10,77,43,0.95)', 'rgba(6,56,30,0.95)'],
  },
  taxi: {
    page: '#F3F4F6', header: 'rgba(255,255,255,0.7)', headerBorder: 'rgba(255,255,255,0.7)', eyebrow: tw.slate400, headerTitle: tw.slate900,
    accent: '#4F39F6', accentSoft: '#EEF2FF', suggestionIconBg: '#EEF2FF', locationIconBg: tw.emerald50, locationText: tw.emerald600, locationIcon: tw.emerald600,
    btn: tw.slate900, btnWeight: 900, btnSize: 16, chipOn: tw.slate900, chipOff: '#ffffff', chipOffBorder: tw.zinc200, chipOffText: tw.zinc700,
    pinned: { backgroundColor: 'rgba(238,242,255,0.8)', borderColor: '#E0E7FF', borderRadius: 18 }, pinnedLabel: '#4F39F6',
    saved: { backgroundColor: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.8)', borderRadius: 22 }, chevBg: '#EEF2FF', chevIcon: '#4F39F6',
    listSection: 'rgba(255,255,255,0.75)', listBorder: 'rgba(255,255,255,0.7)', searchSection: 'rgba(255,255,255,0.7)', footer: 'rgba(255,255,255,0.9)', footerBorder: 'rgba(255,255,255,0.7)',
    listTitle: 'Saved Addresses', listEyebrow: 'Profile', toastGradient: ['rgba(79,57,246,0.95)', 'rgba(15,23,43,0.95)'],
  },
};

const getAddressIcon = (address) => {
  const label = (address.label || address.additionalDetails || '').toLowerCase();
  if (label.includes('home')) return Home;
  if (label.includes('work') || label.includes('office')) return Briefcase;
  if (label.includes('building') || label.includes('apt')) return Building2;
  return Home;
};

const getAddressCoordinates = (address) => {
  const coords = address?.location?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const lat = Number(address?.latitude ?? address?.lat);
  const lng = Number(address?.longitude ?? address?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
};

const normalizeLabelForForm = (label) => {
  const value = String(label || 'Home').toLowerCase();
  if (value.includes('office') || value.includes('work')) return 'Work';
  if (value.includes('other')) return 'Other';
  return 'Home';
};

const formatAddressPreview = (address) => {
  if (!address) return '';
  return [address.additionalDetails, address.street, address.city, address.state, address.zipCode].filter(Boolean).join(', ');
};

const readStoredLocation = () => {
  try {
    const stored = localStore.getItem('userLocation');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Number.isFinite(parsed?.latitude) && Number.isFinite(parsed?.longitude)) return parsed;
    }
  } catch {}
  return null;
};

const showAddressRemovedBrandedToast = (theme) => {
  toast.custom(
    () => (
      <View style={styles.removedToast}>
        <View style={[styles.removedLogo, { backgroundColor: theme.toastGradient[0] }]}>
          <RNImage source={CONSUMER_BRAND_LOGO} style={{ width: '100%', height: '100%', tintColor: '#fff' }} resizeMode="contain" />
        </View>
        <Text style={styles.removedText}>Address Removed Successfully</Text>
      </View>
    ),
    { id: 'address-removed-toast', duration: 4000 },
  );
};

/** Places search through the backend proxy (the web uses the Places JS SDK's AutocompleteService). */
async function searchPlaces(q, location) {
  const body = { textQuery: q, maxResultCount: 6 };
  if (Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)) {
    body.latitude = location.latitude;
    body.longitude = location.longitude;
  }
  const res = await geocodeAPI.textSearch(body);
  const places = res?.data?.data?.places;
  if (!Array.isArray(places)) return [];
  return places.slice(0, 6).map((p) => {
    const name = p?.displayName?.text || '';
    const addr = p?.formattedAddress || '';
    const display = name && addr && !addr.startsWith(name) ? `${name}, ${addr}` : addr || name;
    return { id: p.id, placeId: p.id, display };
  });
}

/** Port of pages/user/cart/AddressSelectorPage.jsx (also the taxi module's address picker). */
export default function AddressSelector() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const routerLocation = useRouterLocation();
  const goBack = useAppBackNavigation();
  const uiVariant = useMemo(() => {
    const parsed = new URLSearchParams(routerLocation.search || '');
    return resolveAddressSelectorUi({ ...(routerLocation.state || {}), from: routerLocation.state?.from || parsed.get('from') || '', ui: routerLocation.state?.ui || parsed.get('ui') });
  }, [routerLocation.state, routerLocation.search]);
  const theme = THEMES[uiVariant] || THEMES.food;

  const { location, requestLocation, requestLocationFast } = useGeoLocation();
  const { addresses = [], addAddress, updateAddress, deleteAddress, setDefaultAddress, isAuthenticated, loading: profileLoading } = useProfile();
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);
  const [mapPosition, setMapPosition] = useState(() => {
    const s = readStoredLocation();
    return s ? [s.latitude, s.longitude] : [22.7196, 75.8577];
  });
  const [addressFormData, setAddressFormData] = useState({ street: '', city: '', state: '', zipCode: '', additionalDetails: '', label: 'Home', phone: '' });
  const [isFetchingLocationState, setIsFetchingLocationState] = useState(false);
  const [mapGpsLoading, setMapGpsLoading] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');
  const [addressAutocompleteValue, setAddressAutocompleteValue] = useState('');
  const [keywordAddressSuggestions, setKeywordAddressSuggestions] = useState([]);
  const [isKeywordSearching, setIsKeywordSearching] = useState(false);
  const [formScrollTop, setFormScrollTop] = useState(0);
  const mapRef = useRef(null);
  const geocodeDebounceRef = useRef(null);
  const initialMapCenterRef = useRef(mapPosition);
  const getAddressId = (address) => address?.id || address?._id || null;

  useEffect(() => () => geocodeDebounceRef.current && clearTimeout(geocodeDebounceRef.current), []);

  // Reuse the location Home already has; "Use current location" refreshes explicitly.
  useEffect(() => {
    const applyLoc = (loc) => {
      if (!loc) return;
      const clean = cleanAddr(loc.formattedAddress || loc.address || '');
      if (clean) setCurrentAddress(clean);
      if (Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude))) {
        const coords = [Number(loc.latitude), Number(loc.longitude)];
        setMapPosition(coords);
        initialMapCenterRef.current = coords;
      }
    };
    applyLoc(location);
    applyLoc(readStoredLocation());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const clean = cleanAddr(location?.formattedAddress || location?.address || '');
    if (clean) setCurrentAddress(clean);
  }, [location?.formattedAddress, location?.address, location?.latitude, location?.longitude]);

  // Place search (backend proxy), 350 ms debounce.
  useEffect(() => {
    const q = String(addressAutocompleteValue || '').trim();
    if (q.length < 3) {
      setKeywordAddressSuggestions([]);
      setIsKeywordSearching(false);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setIsKeywordSearching(true);
      try {
        const list = await searchPlaces(q, location);
        if (!cancelled) setKeywordAddressSuggestions(list);
      } catch {
        if (!cancelled) setKeywordAddressSuggestions([]);
      } finally {
        if (!cancelled) setIsKeywordSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [addressAutocompleteValue, location?.latitude, location?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyGeocodedAddressToForm = useCallback((parsed, formattedOverride) => {
    const formatted = formattedOverride || parsed?.formattedAddress || parsed?.address || '';
    setCurrentAddress(cleanAddr(formatted));
    setAddressFormData((prev) => {
      let streetVal = parsed?.area || parsed?.address || formatted.split(',')[0] || prev.street;
      if (streetVal) {
        streetVal = cleanAddr(streetVal).trim();
        if (streetVal.endsWith(',')) streetVal = streetVal.slice(0, -1).trim();
      }
      return { ...prev, street: streetVal || prev.street, city: parsed?.city || prev.city, state: parsed?.state || prev.state, zipCode: parsed?.pincode || prev.zipCode };
    });
  }, []);

  const handleMapMoveEnd = useCallback(
    (lat, lng) => {
      if (!ENABLE_LOCATION_REVERSE_GEOCODE) return;
      if (geocodeDebounceRef.current) clearTimeout(geocodeDebounceRef.current);
      geocodeDebounceRef.current = setTimeout(async () => {
        try {
          applyGeocodedAddressToForm(await reverseGeocodeWithGoogle(lat, lng));
        } catch {}
      }, 400);
    },
    [applyGeocodedAddressToForm],
  );

  const handleBack = () => goBack();

  const handleUseCurrentLocation = async () => {
    try {
      setIsFetchingLocationState(true);
      const loc = typeof requestLocationFast === 'function' ? await requestLocationFast() : await requestLocation();
      if (loc) {
        sessionStore.setItem('manual_location_update', 'true');
        localStore.setItem('deliveryAddressMode', 'current');
        events.emit('userLocationUpdated');
        handleBack();
      } else {
        setIsFetchingLocationState(false);
      }
    } catch {
      setIsFetchingLocationState(false);
      toast.error('Failed to get current location', { id: 'geo' });
    }
  };

  const handleSelectSavedAddress = async (address) => {
    const id = getAddressId(address);
    if (!id) return;
    sessionStore.setItem('manual_location_update', 'true');
    setDefaultAddress(id);
    try {
      localStore.setItem('deliveryAddressMode', 'saved');
      events.emit('userLocationUpdated');
      handleBack();
    } catch {}
  };

  const panMapToCoordinates = useCallback((latitude, longitude, zoom = 17) => {
    setMapPosition([latitude, longitude]);
    initialMapCenterRef.current = [latitude, longitude];
    const delta = 360 / Math.pow(2, zoom) * 0.9;
    mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: delta, longitudeDelta: delta }, 400);
  }, []);

  const handleCenterMapOnMyLocation = async () => {
    if (mapGpsLoading) return;
    setMapGpsLoading(true);
    try {
      const { latitude, longitude } = await getFreshGpsCoordinates();
      panMapToCoordinates(latitude, longitude);
      applyGeocodedAddressToForm(await reverseGeocodeWithGoogle(latitude, longitude));
      toast.success('Moved to your current location', { id: 'geo-map' });
    } catch {
      if (location?.latitude && location?.longitude) {
        panMapToCoordinates(location.latitude, location.longitude);
        applyGeocodedAddressToForm(location, location.formattedAddress || location.address);
        toast.info('Using last known location', { id: 'geo-map' });
      } else {
        toast.error('Allow location permission to use GPS', { id: 'geo-map' });
      }
    } finally {
      setMapGpsLoading(false);
    }
  };

  const handleSelectOuterSuggestion = async (s) => {
    setIsFetchingLocationState(true);
    try {
      let lat;
      let lng;
      let display;
      let parsed;
      if (s.placeId) {
        parsed = await geocodeGooglePlaceId(s.placeId);
        lat = parsed.latitude;
        lng = parsed.longitude;
        display = parsed.formattedAddress;
      } else if (s.lat && s.lng) {
        lat = s.lat;
        lng = s.lng;
        display = s.display;
        parsed = await reverseGeocodeWithGoogle(lat, lng);
      } else {
        toast.error('Could not resolve location coordinates');
        return;
      }
      const finalLoc = {
        latitude: lat, longitude: lng, city: parsed.city || '', state: parsed.state || '', country: parsed.country || 'India', area: parsed.area || '',
        address: parsed.address || display, formattedAddress: display || parsed.formattedAddress, pincode: parsed.pincode || '',
      };
      localStore.setItem('userLocation', JSON.stringify(finalLoc));
      sessionStore.setItem('manual_location_update', 'true');
      localStore.setItem('deliveryAddressMode', 'current');
      events.emit('userLocationUpdated');
      handleBack();
    } catch {
      toast.error('Failed to select location');
    } finally {
      setIsFetchingLocationState(false);
    }
  };

  const handleSelectMapSuggestion = async (s) => {
    try {
      const parsed = await geocodeGooglePlaceId(s.placeId || s.id);
      const lat = parsed.latitude;
      const lng = parsed.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        toast.error('Could not resolve location coordinates');
        return;
      }
      panMapToCoordinates(lat, lng);
      setAddressAutocompleteValue(parsed.formattedAddress || s.display || '');
      applyGeocodedAddressToForm(parsed);
      setKeywordAddressSuggestions([]);
    } catch {
      toast.error('Failed to select location');
    }
  };

  const resolveExistingLocation = () => {
    if (Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)) return location;
    const stored = readStoredLocation();
    if (stored) return stored;
    if (Number.isFinite(mapPosition[0]) && Number.isFinite(mapPosition[1])) {
      return { latitude: mapPosition[0], longitude: mapPosition[1], formattedAddress: currentAddress, address: currentAddress };
    }
    return null;
  };

  const handleAddAddressClick = () => {
    if (!isAuthenticated) {
      toast.info('Please login to add an address');
      navigateTo('/login');
      return;
    }
    setEditingAddressId(null);
    setAddressAutocompleteValue('');
    setKeywordAddressSuggestions([]);
    const loc = resolveExistingLocation();
    if (loc?.latitude && loc?.longitude) {
      initialMapCenterRef.current = [loc.latitude, loc.longitude];
      setMapPosition([loc.latitude, loc.longitude]);
      applyGeocodedAddressToForm(loc, loc.formattedAddress || loc.address || currentAddress);
    }
    setFormScrollTop(0);
    setShowAddressForm(true);
  };

  const handleEditAddressClick = (addr) => {
    if (!isAuthenticated) {
      toast.info('Please login to edit an address');
      navigateTo('/login');
      return;
    }
    const id = getAddressId(addr);
    if (!id) return;
    const coords = getAddressCoordinates(addr);
    setEditingAddressId(id);
    setAddressAutocompleteValue('');
    setKeywordAddressSuggestions([]);
    setAddressFormData({
      street: addr.street || '', city: addr.city || '', state: addr.state || '', zipCode: addr.zipCode || '',
      additionalDetails: addr.additionalDetails || '', label: normalizeLabelForForm(addr.label), phone: addr.phone || '',
    });
    setCurrentAddress([addr.additionalDetails, addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', '));
    if (coords) {
      initialMapCenterRef.current = [coords.lat, coords.lng];
      setMapPosition([coords.lat, coords.lng]);
    }
    setFormScrollTop(0);
    setShowAddressForm(true);
  };

  const handleDeleteAddressClick = (addr) => {
    if (!isAuthenticated) {
      toast.info('Please login to delete an address');
      navigateTo('/login');
      return;
    }
    setDeleteDialog({ address: addr });
  };

  const confirmDeleteAddress = async () => {
    const id = getAddressId(deleteDialog?.address);
    if (!id) {
      setDeleteDialog(null);
      return;
    }
    setIsDeletingAddress(true);
    try {
      await deleteAddress(id);
      setDeleteDialog(null);
      showAddressRemovedBrandedToast(theme);
    } catch {
      toast.error('Failed to delete address');
    } finally {
      setIsDeletingAddress(false);
    }
  };

  const handleCancelAddressForm = () => {
    setAddressAutocompleteValue('');
    setKeywordAddressSuggestions([]);
    setEditingAddressId(null);
    setShowAddressForm(false);
  };

  const locationDataFromForm = () => {
    const line = [addressFormData.street, addressFormData.city, addressFormData.state, addressFormData.zipCode].filter(Boolean).join(', ');
    return {
      latitude: mapPosition[0], longitude: mapPosition[1], city: addressFormData.city || '', state: addressFormData.state || '', address: line,
      area: addressFormData.additionalDetails || addressFormData.street || '', pincode: addressFormData.zipCode || '', formattedAddress: line,
    };
  };

  const handleAddressFormSubmit = async () => {
    if (!isAuthenticated) {
      toast.info('Please login to save an address');
      navigateTo('/login');
      return;
    }
    if (!addressFormData.street || !addressFormData.city) {
      toast.error('Please fill required fields');
      return;
    }
    setLoadingAddress(true);
    try {
      const payload = {
        ...addressFormData,
        label: addressFormData.label === 'Work' ? 'Office' : addressFormData.label,
        location: { type: 'Point', coordinates: [mapPosition[1], mapPosition[0]] },
        latitude: mapPosition[0],
        longitude: mapPosition[1],
      };
      if (editingAddressId) {
        const updated = await updateAddress(editingAddressId, payload);
        if (updated) {
          try {
            const defaultAddr = addresses.find((a) => a.isDefault) || updated;
            const isEditingDefault = String(getAddressId(defaultAddr)) === String(editingAddressId) || Boolean(updated?.isDefault);
            if (isEditingDefault) {
              sessionStore.setItem('manual_location_update', 'true');
              localStore.setItem('deliveryAddressMode', 'saved');
              localStore.setItem('userLocation', JSON.stringify(locationDataFromForm()));
              events.emit('userLocationUpdated');
            }
          } catch {}
          toast.success('Address updated');
          setEditingAddressId(null);
          setShowAddressForm(false);
        }
        return;
      }
      const created = await addAddress(payload);
      if (created) {
        const id = getAddressId(created);
        if (id) await setDefaultAddress(id);
        try {
          sessionStore.setItem('manual_location_update', 'true');
          localStore.setItem('deliveryAddressMode', 'saved');
          localStore.setItem('userLocation', JSON.stringify(locationDataFromForm()));
          events.emit('userLocationUpdated');
        } catch {}
        handleBack();
      }
    } catch {
      toast.error('Failed to save address');
    } finally {
      setLoadingAddress(false);
    }
  };

  const renderHeader = (onBack, title, eyebrow) => (
    <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.headerBorder }]}>
      <Press scale={0.92} onPress={onBack} accessibilityLabel="Back" style={styles.headBack}>
        <ChevronLeft size={24} color={tw.gray900} />
      </Press>
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: theme.eyebrow }]}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={[styles.headTitle, { color: theme.headerTitle }, uiVariant === 'taxi' ? { ...poppins(800) } : null]}>{title}</Text>
      </View>
    </View>
  );

  const renderSearch = (placeholder) => (
    <View style={styles.searchWrap}>
      <Search size={20} color={tw.neutral400} style={styles.searchIcon} />
      <Input value={addressAutocompleteValue} onChangeText={setAddressAutocompleteValue} placeholder={placeholder} style={styles.searchInput} placeholderTextColor={tw.neutral400} />
      {addressAutocompleteValue ? (
        <Press scale={0.9} onPress={() => setAddressAutocompleteValue('')} accessibilityLabel="Clear search" style={styles.searchClear} hitSlop={8}>
          <X size={16} color={tw.zinc400} />
        </Press>
      ) : null}
    </View>
  );

  const fieldInput = { height: 48, borderRadius: 12 };

  if (showAddressForm) {
    const mapHeight = Math.max(260, Math.min(420, Math.round(height * 0.45)));
    const initialRegion = { latitude: initialMapCenterRef.current[0], longitude: initialMapCenterRef.current[1], latitudeDelta: 0.0025, longitudeDelta: 0.0025 };
    const labels = ['Home', 'Work', 'Other'];
    return (
      <View style={{ flex: 1, backgroundColor: theme.page }}>
        {renderHeader(handleCancelAddressForm, editingAddressId ? 'Edit Address' : 'Add Address', theme.listEyebrow)}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(e) => setFormScrollTop(e.nativeEvent.contentOffset.y)}
          contentContainerStyle={{ paddingBottom: 96 }}
        >
          <View style={{ height: mapHeight, zIndex: 0, opacity: Math.min(1, Math.max(0.4, 1 - formScrollTop / 500)), transform: [{ translateY: formScrollTop * 0.4 }] }}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              initialRegion={initialRegion}
              toolbarEnabled={false}
              showsMyLocationButton={false}
              showsCompass={false}
              onRegionChangeComplete={(r) => {
                setMapPosition([r.latitude, r.longitude]);
                handleMapMoveEnd(r.latitude, r.longitude);
              }}
            />
            <View pointerEvents="none" style={styles.pinLayer}>
              <View style={{ alignItems: 'center', marginBottom: 32 }}>
                <View style={styles.pinHead}>
                  <View style={styles.pinCore}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                  </View>
                </View>
                <View style={styles.pinStem} />
                <View style={styles.pinShadow} />
              </View>
            </View>
            <View style={styles.mapSearch}>
              {renderSearch('Search area, street, landmark...')}
              {isKeywordSearching ? <View style={styles.searchSpin}><Spinner size={16} color={theme.accent} /></View> : null}
              {keywordAddressSuggestions.length > 0 ? (
                <View style={styles.mapSuggestions}>
                  <Text style={styles.sugHead}>SUGGESTIONS</Text>
                  {keywordAddressSuggestions.map((s, i) => (
                    <Press key={s.id} scale={0.99} onPress={() => handleSelectMapSuggestion(s)} style={[styles.mapSug, i < keywordAddressSuggestions.length - 1 ? { borderBottomWidth: 1, borderBottomColor: tw.gray50 } : null]}>
                      <MapPin size={16} color={tw.gray400} style={{ marginTop: 4 }} />
                      <Text style={styles.mapSugText} numberOfLines={1}>{s.display}</Text>
                    </Press>
                  ))}
                </View>
              ) : null}
            </View>
            <Press scale={0.96} disabled={mapGpsLoading} onPress={handleCenterMapOnMyLocation} accessibilityLabel="Use my location" style={[styles.gpsBtn, mapGpsLoading ? { opacity: 0.7 } : null]}>
              {mapGpsLoading ? <Spinner size={16} color={theme.accent} /> : <Navigation size={16} color={theme.accent} />}
              <Text style={styles.gpsText}>{mapGpsLoading ? 'Locating...' : 'Use My Location'}</Text>
            </Press>
          </View>

          <View style={styles.formSheet}>
            <View style={[styles.pinned, theme.pinned]}>
              <MapPin size={20} color={theme.accent} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.pinnedLabel, { color: theme.pinnedLabel }]}>PINNED LOCATION</Text>
                <Text style={styles.pinnedText} numberOfLines={2}>{currentAddress || 'Select a location on map'}</Text>
              </View>
            </View>

            <View>
              <Text style={styles.labelBold}>Primary Address (Street / Area / Landmark)</Text>
              <Input placeholder="Search or drag to update street/area" value={addressFormData.street} onChangeText={(v) => setAddressFormData({ ...addressFormData, street: v })} style={[fieldInput, { backgroundColor: tw.gray50, marginBottom: 16 }]} />
              <Text style={[styles.labelBold, { color: tw.gray700 }]}>Secondary Address (House No. / Flat / Floor)</Text>
              <Input placeholder="E.g. Flat 402, 4th Floor, Dima Hasao Building" value={addressFormData.additionalDetails} onChangeText={(v) => setAddressFormData({ ...addressFormData, additionalDetails: v })} style={[fieldInput, { borderColor: tw.gray200 }]} />
            </View>

            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelSm}>City</Text>
                <Input value={addressFormData.city} onChangeText={(v) => setAddressFormData({ ...addressFormData, city: v })} style={fieldInput} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.labelSm}>State</Text>
                <Input value={addressFormData.state} onChangeText={(v) => setAddressFormData({ ...addressFormData, state: v })} style={fieldInput} />
              </View>
            </View>

            <View>
              <Text style={styles.labelSm}>Pincode / ZIP</Text>
              <Input placeholder="Pincode" value={addressFormData.zipCode || ''} onChangeText={(v) => setAddressFormData({ ...addressFormData, zipCode: v })} style={fieldInput} />
            </View>

            <View>
              <Text style={[styles.labelBold, { marginBottom: 8 }]}>Save address as</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {labels.map((value) => {
                  const on = addressFormData.label === value;
                  return (
                    <Press key={value} scale={0.97} onPress={() => setAddressFormData({ ...addressFormData, label: value })} accessibilityState={{ selected: on }} style={[styles.chip, on ? { backgroundColor: theme.chipOn, ...shadow('sm') } : { backgroundColor: theme.chipOff, borderWidth: 1, borderColor: theme.chipOffBorder }]}>
                      <Text style={[styles.chipText, { color: on ? '#fff' : theme.chipOffText }]}>{value}</Text>
                    </Press>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.footer, borderTopColor: theme.footerBorder, paddingBottom: 16 + insets.bottom }]}>
          <Press scale={0.98} disabled={loadingAddress} onPress={handleAddressFormSubmit} accessibilityLabel="Save address" style={[styles.saveBtn, { backgroundColor: theme.btn }, loadingAddress ? { opacity: 0.5 } : null]}>
            <Text style={{ fontSize: theme.btnSize, lineHeight: 28, color: '#fff', ...poppins(theme.btnWeight) }}>
              {loadingAddress ? (editingAddressId ? 'Updating...' : 'Saving...') : editingAddressId ? 'Update Address' : 'Save Address & Proceed'}
            </Text>
          </Press>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.page }}>
      {renderHeader(handleBack, theme.listTitle, theme.listEyebrow)}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 + NAV_CLEARANCE + insets.bottom }}>
        <View style={{ padding: 16, backgroundColor: theme.searchSection }}>
          {renderSearch('Search for area, street name...')}
        </View>

        {keywordAddressSuggestions.length > 0 ? (
          <View style={styles.sugList}>
            {keywordAddressSuggestions.map((s, i) => {
              const title = s.display.split(',')[0] || s.display;
              const subtitle = s.display.split(',').slice(1).join(',').trim() || s.display;
              return (
                <Press key={s.id} scale={0.99} onPress={() => handleSelectOuterSuggestion(s)} style={[styles.sugRow, i < keywordAddressSuggestions.length - 1 ? { borderBottomWidth: 1, borderBottomColor: tw.zinc100 } : null]}>
                  <View style={[styles.sugIcon, { backgroundColor: theme.suggestionIconBg }]}>
                    <MapPin size={18} color={theme.accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.sugTitle} numberOfLines={1}>{title}</Text>
                    <Text style={styles.sugSub} numberOfLines={1}>{subtitle}</Text>
                  </View>
                  <ChevronRight size={16} color={tw.zinc300} style={{ marginTop: 10 }} />
                </Press>
              );
            })}
          </View>
        ) : null}

        {isKeywordSearching ? (
          <View style={styles.searching}>
            <Spinner size={16} color={theme.accent} />
            <Text style={{ fontSize: 12, lineHeight: 16, color: tw.zinc500, ...poppins(400) }}>Searching location...</Text>
          </View>
        ) : null}

        <View style={{ backgroundColor: theme.listSection, borderBottomWidth: 1, borderBottomColor: theme.listBorder }}>
          <Press scale={0.99} onPress={handleUseCurrentLocation} accessibilityLabel="Use current location" style={styles.actionRow}>
            <View style={[styles.actionIcon, { backgroundColor: theme.locationIconBg }]}>
              <Crosshair size={20} color={theme.locationIcon} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.actionTitle, { color: theme.locationText }]}>Use current location</Text>
              <Text style={styles.actionSub} numberOfLines={1}>{currentAddress ? cleanAddr(currentAddress) : 'Enable GPS for accuracy'}</Text>
            </View>
            <ChevronRight size={20} color={tw.zinc300} />
          </Press>
          <View style={{ height: 1, backgroundColor: theme.listBorder }} />
          <Press scale={0.99} onPress={handleAddAddressClick} accessibilityLabel="Add Address" style={styles.actionRow}>
            <View style={[styles.actionIcon, { backgroundColor: theme.accentSoft }]}>
              <Plus size={20} color={theme.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.actionTitle, { color: theme.accent }]}>Add Address</Text>
            </View>
            <ChevronRight size={20} color={tw.zinc300} />
          </Press>
        </View>

        <View style={{ padding: 24 }}>
          <Text style={styles.savedHead}>SAVED ADDRESSES</Text>
          <View style={{ gap: 16 }}>
            {profileLoading && addresses.length === 0 ? (
              [1, 2].map((i) => (
                <View key={i} style={[styles.savedCard, { backgroundColor: tw.slate50, borderColor: 'transparent', borderRadius: 12 }]}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tw.gray200 }} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={{ height: 16, width: '25%', borderRadius: 4, backgroundColor: tw.gray200 }} />
                    <View style={{ height: 12, width: '75%', borderRadius: 4, backgroundColor: tw.gray200 }} />
                  </View>
                </View>
              ))
            ) : addresses.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40, opacity: 0.5 }}>
                <MapPin size={48} color={tw.gray400} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(400) }}>No addresses saved yet</Text>
              </View>
            ) : (
              addresses.map((addr, idx) => {
                const Icon = getAddressIcon(addr);
                const addressLine = [addr.additionalDetails, addr.street, addr.city, addr.state].filter(Boolean).join(', ').replace(PLUS_CODE, '');
                return (
                  <View key={getAddressId(addr) || idx} style={[styles.savedCard, theme.saved]}>
                    <Press scale={0.99} onPress={() => handleSelectSavedAddress(addr)} accessibilityLabel={`Deliver to ${addr.label || 'Address'}`} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingRight: 4 }}>
                      <View style={styles.savedIcon}>
                        <Icon size={20} color={tw.gray600} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.savedLabel} numberOfLines={1}>{addr.label || 'Address'}</Text>
                          <View style={[styles.savedChev, { backgroundColor: theme.chevBg }]}>
                            <ChevronRight size={16} color={theme.chevIcon} strokeWidth={2.5} />
                          </View>
                        </View>
                        <Text style={styles.savedLine} numberOfLines={2}>{addressLine}</Text>
                      </View>
                    </Press>
                    <View style={{ gap: 6, paddingTop: 4 }}>
                      <Press scale={0.92} onPress={() => handleEditAddressClick(addr)} accessibilityLabel="Edit address" style={styles.roundBtn}>
                        <Pencil size={16} color={tw.gray500} />
                      </Press>
                      <Press scale={0.92} onPress={() => handleDeleteAddressClick(addr)} accessibilityLabel="Delete address" style={styles.roundBtn}>
                        <Trash2 size={16} color={tw.gray500} />
                      </Press>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {isFetchingLocationState ? (
        <View style={styles.fetching} accessibilityRole="progressbar" accessibilityLabel="Fetching Location">
          <Spinner size={40} color={theme.accent} strokeWidth={3} />
          <Text style={styles.fetchingText}>Fetching Location...</Text>
        </View>
      ) : null}

      <Dialog visible={!!deleteDialog} onClose={() => !isDeletingAddress && setDeleteDialog(null)} backdrop="rgba(0,0,0,0.45)" panelStyle={styles.delPanel}>
        <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 }}>
          <View style={{ alignItems: 'center' }}>
            <View style={styles.delIcon}>
              <Trash2 size={24} color={tw.red600} />
            </View>
            <Text style={styles.delTitle}>Delete address?</Text>
            <Text style={styles.delBody}>This action cannot be undone. You will need to add this address again.</Text>
          </View>
          <View style={styles.delPreview}>
            <Text style={styles.delPreviewLabel}>{String(deleteDialog?.address?.label || 'Address').toUpperCase()}</Text>
            <Text style={styles.delPreviewText}>{formatAddressPreview(deleteDialog?.address) || 'Saved delivery address'}</Text>
          </View>
          <View style={{ marginTop: 24, gap: 12 }}>
            <Press scale={0.98} disabled={isDeletingAddress} onPress={confirmDeleteAddress} accessibilityLabel="Delete address" style={[styles.delBtn, { backgroundColor: tw.red600 }, isDeletingAddress ? { opacity: 0.5 } : null]}>
              <Text style={{ fontSize: 15, lineHeight: 24, color: '#fff', ...poppins(600) }}>{isDeletingAddress ? 'Deleting...' : 'Delete address'}</Text>
            </Press>
            <Press scale={0.98} disabled={isDeletingAddress} onPress={() => setDeleteDialog(null)} accessibilityLabel="Cancel" style={[styles.delBtn, { backgroundColor: tw.zinc100, borderWidth: 1, borderColor: 'rgba(228,228,231,0.8)' }, isDeletingAddress ? { opacity: 0.5 } : null]}>
              <Text style={{ fontSize: 15, lineHeight: 24, color: tw.zinc700, ...poppins(600) }}>Cancel</Text>
            </Press>
          </View>
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  headBack: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, lineHeight: 14, letterSpacing: 2.6, ...poppins(900) },
  headTitle: { fontSize: 20, lineHeight: 28, ...poppins(700) },

  searchWrap: { justifyContent: 'center', ...shadow('sm') },
  searchIcon: { position: 'absolute', left: 16, zIndex: 1 },
  searchInput: { height: 56, paddingLeft: 48, paddingRight: 40, borderWidth: 2, borderColor: 'rgba(228,228,231,0.9)', borderRadius: 16, backgroundColor: '#fff', fontSize: 14, color: tw.zinc900, ...poppins(500) },
  searchClear: { position: 'absolute', right: 14, padding: 4, borderRadius: 999 },
  searchSpin: { position: 'absolute', right: 44, top: 20 },

  mapSearch: { position: 'absolute', top: 16, left: 16, right: 16, zIndex: 20 },
  mapSuggestions: { marginTop: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray100, overflow: 'hidden', ...shadow('0 25px 50px rgba(0,0,0,0.25)') },
  sugHead: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.gray400, backgroundColor: tw.gray50, ...poppins(700) },
  mapSug: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  mapSugText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  pinLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  pinHead: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.green100, alignItems: 'center', justifyContent: 'center', marginBottom: -6 },
  pinCore: { width: 24, height: 24, borderRadius: 12, backgroundColor: tw.green600, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pinStem: { width: 6, height: 24, backgroundColor: tw.green600, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#fff', borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  pinShadow: { position: 'absolute', bottom: -4, width: 18, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.2)' },
  gpsBtn: { position: 'absolute', bottom: 40, right: 16, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 24, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, ...shadow('0 20px 25px rgba(0,0,0,0.1)') },
  gpsText: { fontSize: 14, lineHeight: 20, color: '#000', ...poppins(500) },

  formSheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -32, zIndex: 10, padding: 16, gap: 24, ...shadow('0 -12px 24px rgba(0,0,0,0.1)') },
  pinned: { flexDirection: 'row', gap: 12, padding: 16, borderWidth: 1 },
  pinnedLabel: { fontSize: 12, lineHeight: 16, marginBottom: 4, ...poppins(700) },
  pinnedText: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) },
  labelBold: { fontSize: 14, lineHeight: 14, color: tw.gray900, marginBottom: 8, ...poppins(700) },
  labelSm: { fontSize: 12, lineHeight: 12, color: tw.gray900, marginBottom: 4, ...poppins(500) },
  chip: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 14, lineHeight: 20, ...poppins(600) },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 16 },
  saveBtn: { height: 48, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },

  sugList: { marginHorizontal: 16, marginTop: 8, marginBottom: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.zinc200, borderRadius: 16, overflow: 'hidden', ...shadow('0 20px 25px rgba(0,0,0,0.1)') },
  sugRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  sugIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  sugTitle: { fontSize: 14, lineHeight: 20, color: tw.zinc900, ...poppins(700) },
  sugSub: { fontSize: 12, lineHeight: 16, color: tw.zinc500, marginTop: 2, ...poppins(400) },
  searching: { marginHorizontal: 16, marginTop: 8, marginBottom: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: tw.zinc50, borderRadius: 12 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, paddingHorizontal: 24 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 15, lineHeight: 22, ...poppins(700) },
  actionSub: { fontSize: 12, lineHeight: 16, color: tw.zinc400, marginTop: 2, ...poppins(400) },

  savedHead: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.zinc400, marginBottom: 16, ...poppins(700) },
  savedCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderWidth: 1 },
  savedIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  savedLabel: { flexShrink: 1, fontSize: 16, lineHeight: 24, color: tw.gray900, textTransform: 'capitalize', ...poppins(700) },
  savedChev: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  savedLine: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, paddingRight: 8, ...poppins(400) },
  roundBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, alignItems: 'center', justifyContent: 'center' },

  fetching: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  fetchingText: { marginTop: 16, fontSize: 13, letterSpacing: -0.3, color: tw.gray800, ...poppins(700) },

  delPanel: { width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 24, ...shadow('0 25px 50px rgba(0,0,0,0.25)') },
  delIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 8, borderColor: 'rgba(254,242,242,0.6)' },
  delTitle: { fontSize: 20, lineHeight: 28, color: tw.zinc900, marginBottom: 8, ...poppins(700) },
  delBody: { fontSize: 14, lineHeight: 22.75, color: tw.zinc500, textAlign: 'center', ...poppins(400) },
  delPreview: { marginTop: 20, borderRadius: 16, borderWidth: 1, borderColor: tw.zinc100, backgroundColor: tw.zinc50, paddingHorizontal: 16, paddingVertical: 14 },
  delPreviewLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.zinc400, marginBottom: 4, ...poppins(700) },
  delPreviewText: { fontSize: 14, lineHeight: 22.75, color: tw.zinc800, ...poppins(500) },
  delBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  removedToast: { width: '92%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', ...shadow('0 8px 28px rgba(0,0,0,0.14)') },
  removedLogo: { width: 40, height: 40, borderRadius: 12, padding: 2, ...shadow('md') },
  removedText: { fontSize: 13, color: 'rgba(17,24,39,0.9)', paddingRight: 4, ...poppins(600) },
});
