import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image as RNImage, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { ArrowLeft, Briefcase, Building2, ChevronRight, Crosshair, Home, MapPin, Navigation, Pencil, Plus, Search, Trash2, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press, Spinner } from '../../components/ui';
import { Button, Card, EmptyState, IconButton, SegmentedControl } from '../../components/ds';
import { CtaBar, Field } from '../components/cart/parts';
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
import { color, elevation, radii, space, type } from '../../theme';

const ENABLE_LOCATION_REVERSE_GEOCODE = process.env.EXPO_PUBLIC_ENABLE_LOCATION_REVERSE_GEOCODE !== 'false';
const PLUS_CODE = /^[a-z0-9]{2,8}\+[a-z0-9]{0,3}[,\s]*/i;
const cleanAddr = (s) => String(s || '').replace(PLUS_CODE, '').replace(/,\s*India$/, '');

/*
 * getAddressSelectorTheme(): food and taxi share the heritage look now; only
 * the list title / kicker still differ per module.
 */
const THEMES = {
  food: { listTitle: 'Select Location', listEyebrow: '' },
  taxi: { listTitle: 'Saved Addresses', listEyebrow: 'Profile' },
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

const showAddressRemovedBrandedToast = () => {
  toast.custom(
    () => (
      <View style={styles.removedToast}>
        <View style={styles.removedLogo}>
          <RNImage source={CONSUMER_BRAND_LOGO} style={{ width: '100%', height: '100%', tintColor: color.onPrimary }} resizeMode="contain" />
        </View>
        <Text style={[type.label, { color: color.text, flexShrink: 1 }]}>Address Removed Successfully</Text>
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
  const { height } = useWindowDimensions();
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
    <View style={styles.header}>
      <IconButton icon={ArrowLeft} label="Back" onPress={onBack} />
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? <Text style={[type.overline, { color: color.goldText }]}>{eyebrow}</Text> : null}
        <Text style={[type.heading, { color: color.text }]} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      </View>
    </View>
  );

  const renderSearch = (placeholder) => (
    <View style={styles.searchWrap}>
      <Search size={20} color={color.textMuted} style={styles.searchIcon} />
      <Field
        value={addressAutocompleteValue}
        onChangeText={setAddressAutocompleteValue}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        style={{ flex: 1 }}
        inputStyle={styles.searchInput}
      />
      {addressAutocompleteValue ? (
        <IconButton icon={X} label="Clear search" size={40} iconSize={18} iconColor={color.textMuted} onPress={() => setAddressAutocompleteValue('')} style={styles.searchClear} />
      ) : null}
    </View>
  );

  if (showAddressForm) {
    const mapHeight = Math.max(240, Math.min(400, Math.round(height * 0.42)));
    const initialRegion = { latitude: initialMapCenterRef.current[0], longitude: initialMapCenterRef.current[1], latitudeDelta: 0.0025, longitudeDelta: 0.0025 };
    const labels = ['Home', 'Work', 'Other'];
    const setForm = (key) => (v) => setAddressFormData({ ...addressFormData, [key]: v });
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        {renderHeader(handleCancelAddressForm, editingAddressId ? 'Edit Address' : 'Add Address', theme.listEyebrow)}
        <ScrollView keyboardShouldPersistTaps="handled" scrollEventThrottle={16} onScroll={(e) => setFormScrollTop(e.nativeEvent.contentOffset.y)} contentContainerStyle={{ paddingBottom: space.xxl }}>
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
              <View style={{ alignItems: 'center', marginBottom: space.xxxl }}>
                <View style={styles.pinHead}>
                  <View style={styles.pinCore}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.onPrimary }} />
                  </View>
                </View>
                <View style={styles.pinStem} />
                <View style={styles.pinShadow} />
              </View>
            </View>
            <View style={styles.mapSearch}>
              {renderSearch('Search area, street, landmark...')}
              {isKeywordSearching ? (
                <View style={styles.searchSpin}>
                  <Spinner size={16} color={color.primary} />
                </View>
              ) : null}
              {keywordAddressSuggestions.length > 0 ? (
                <View style={styles.mapSuggestions}>
                  <Text style={[type.overline, styles.sugHead]}>Suggestions</Text>
                  {keywordAddressSuggestions.map((s, i) => (
                    <Press key={s.id} scale={0.99} onPress={() => handleSelectMapSuggestion(s)} accessibilityLabel={s.display} style={[styles.mapSug, i < keywordAddressSuggestions.length - 1 ? styles.divider : null]}>
                      <MapPin size={18} color={color.primary} />
                      <Text style={[type.small, { flex: 1, color: color.text }]} numberOfLines={2}>
                        {s.display}
                      </Text>
                    </Press>
                  ))}
                </View>
              ) : null}
            </View>
            <Press scale={0.96} disabled={mapGpsLoading} onPress={handleCenterMapOnMyLocation} accessibilityLabel="Use my location" style={[styles.gpsBtn, mapGpsLoading ? { opacity: 0.7 } : null]}>
              {mapGpsLoading ? <Spinner size={16} color={color.primary} /> : <Navigation size={18} color={color.primary} />}
              <Text style={[type.label, { color: color.primary }]}>{mapGpsLoading ? 'Locating...' : 'Use my location'}</Text>
            </Press>
          </View>

          <View style={styles.formSheet}>
            <View style={styles.pinned}>
              <MapPin size={20} color={color.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.overline, { color: color.primary, marginBottom: space.xs }]}>Pinned location</Text>
                <Text style={[type.small, { color: color.text }]} numberOfLines={3}>
                  {currentAddress || 'Select a location on map'}
                </Text>
              </View>
            </View>

            <Field label="Primary address (street / area / landmark)" placeholder="Search or drag to update street/area" value={addressFormData.street} onChangeText={setForm('street')} />
            <Field label="Secondary address (house no. / flat / floor)" placeholder="E.g. Flat 402, 4th Floor, Dima Hasao Building" value={addressFormData.additionalDetails} onChangeText={setForm('additionalDetails')} />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Field label="City" value={addressFormData.city} onChangeText={setForm('city')} style={{ flex: 1 }} />
              <Field label="State" value={addressFormData.state} onChangeText={setForm('state')} style={{ flex: 1 }} />
            </View>
            <Field label="Pincode / ZIP" placeholder="Pincode" value={addressFormData.zipCode || ''} onChangeText={setForm('zipCode')} keyboardType="number-pad" />

            <View style={{ gap: space.sm }}>
              <Text style={[type.label, { color: color.text }]}>Save address as</Text>
              <SegmentedControl options={labels.map((value) => ({ value, label: value }))} value={addressFormData.label} onChange={(value) => setAddressFormData({ ...addressFormData, label: value })} />
            </View>
          </View>
        </ScrollView>

        <CtaBar>
          <Button
            title={loadingAddress ? (editingAddressId ? 'Updating...' : 'Saving...') : editingAddressId ? 'Update address' : 'Save address & proceed'}
            size="lg"
            loading={loadingAddress}
            disabled={loadingAddress}
            onPress={handleAddressFormSubmit}
            accessibilityLabel="Save address"
          />
        </CtaBar>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.screen}>
      {renderHeader(handleBack, theme.listTitle, theme.listEyebrow)}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxl + insets.bottom }}>
        {renderSearch('Search for area, street name...')}

        {keywordAddressSuggestions.length > 0 ? (
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {keywordAddressSuggestions.map((s, i) => {
              const title = s.display.split(',')[0] || s.display;
              const subtitle = s.display.split(',').slice(1).join(',').trim() || s.display;
              return (
                <Press key={s.id} scale={0.99} onPress={() => handleSelectOuterSuggestion(s)} accessibilityLabel={s.display} style={[styles.sugRow, i < keywordAddressSuggestions.length - 1 ? styles.divider : null]}>
                  <View style={styles.roundIcon}>
                    <MapPin size={18} color={color.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={[type.small, { color: color.textMuted }]} numberOfLines={2}>
                      {subtitle}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={color.textDisabled} />
                </Press>
              );
            })}
          </Card>
        ) : null}

        {isKeywordSearching ? (
          <View style={styles.searching}>
            <Spinner size={16} color={color.primary} />
            <Text style={[type.caption, { color: color.textMuted }]}>Searching location...</Text>
          </View>
        ) : null}

        <Card padded={false} style={{ overflow: 'hidden' }}>
          <Press scale={0.99} onPress={handleUseCurrentLocation} accessibilityLabel="Use current location" style={[styles.actionRow, styles.divider]}>
            <View style={styles.roundIcon}>
              <Crosshair size={20} color={color.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.bodyStrong, { color: color.primary }]}>Use current location</Text>
              <Text style={[type.small, { color: color.textMuted }]} numberOfLines={2}>
                {currentAddress ? cleanAddr(currentAddress) : 'Enable GPS for accuracy'}
              </Text>
            </View>
            <ChevronRight size={20} color={color.textDisabled} />
          </Press>
          <Press scale={0.99} onPress={handleAddAddressClick} accessibilityLabel="Add Address" style={styles.actionRow}>
            <View style={styles.roundIcon}>
              <Plus size={20} color={color.primary} />
            </View>
            <Text style={[type.bodyStrong, { color: color.primary, flex: 1 }]}>Add address</Text>
            <ChevronRight size={20} color={color.textDisabled} />
          </Press>
        </Card>

        <Text style={[type.overline, { color: color.textMuted, marginTop: space.md }]}>Saved addresses</Text>
        {profileLoading && addresses.length === 0 ? (
          [1, 2].map((i) => (
            <Card key={i} style={styles.savedCard}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color.surfaceMuted }} />
              <View style={{ flex: 1, gap: space.sm }}>
                <View style={{ height: 16, width: '25%', borderRadius: 4, backgroundColor: color.surfaceMuted }} />
                <View style={{ height: 12, width: '75%', borderRadius: 4, backgroundColor: color.surfaceMuted }} />
              </View>
            </Card>
          ))
        ) : addresses.length === 0 ? (
          <EmptyState icon={MapPin} title="No addresses saved yet" message="Add an address or use your current location." style={{ paddingVertical: space.xxxl }} />
        ) : (
          addresses.map((addr, idx) => {
            const Icon = getAddressIcon(addr);
            const addressLine = [addr.additionalDetails, addr.street, addr.city, addr.state].filter(Boolean).join(', ').replace(PLUS_CODE, '');
            const name = addr.label || 'Address';
            return (
              <Card key={getAddressId(addr) || idx} padded={false} style={styles.savedCard}>
                <Press scale={0.99} onPress={() => handleSelectSavedAddress(addr)} accessibilityLabel={`Deliver to ${addr.label || 'Address'}`} style={styles.savedMain}>
                  <View style={styles.roundIcon}>
                    <Icon size={20} color={color.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[type.subheading, { color: color.text, textTransform: 'capitalize' }]} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={[type.small, { color: color.textSecondary, marginTop: 2 }]} numberOfLines={3}>
                      {addressLine}
                    </Text>
                    <Text style={[type.label, { color: color.primary, marginTop: space.xs }]}>Deliver here</Text>
                  </View>
                </Press>
                <View style={styles.savedActions}>
                  <IconButton icon={Pencil} label={`Edit ${name} address`} iconSize={18} iconColor={color.textSecondary} onPress={() => handleEditAddressClick(addr)} />
                  <IconButton icon={Trash2} label={`Delete ${name} address`} iconSize={18} iconColor={color.danger} onPress={() => handleDeleteAddressClick(addr)} />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {isFetchingLocationState ? (
        <View style={styles.fetching} accessibilityRole="progressbar" accessibilityLabel="Fetching Location">
          <Spinner size={40} color={color.primary} strokeWidth={3} />
          <Text style={[type.bodyStrong, { color: color.text, marginTop: space.lg }]}>Fetching location...</Text>
        </View>
      ) : null}

      <Dialog visible={!!deleteDialog} onClose={() => !isDeletingAddress && setDeleteDialog(null)} backdrop={color.overlay} panelStyle={styles.delPanel}>
        <View style={{ padding: space.xxl }}>
          <View style={{ alignItems: 'center' }}>
            <View style={styles.delIcon}>
              <Trash2 size={24} color={color.danger} />
            </View>
            <Text style={[type.heading, { color: color.text, marginBottom: space.sm }]} accessibilityRole="header">
              Delete address?
            </Text>
            <Text style={[type.body, { color: color.textSecondary, textAlign: 'center' }]}>This action cannot be undone. You will need to add this address again.</Text>
          </View>
          <View style={styles.delPreview}>
            <Text style={[type.label, { color: color.text, textTransform: 'capitalize', marginBottom: space.xs }]}>{deleteDialog?.address?.label || 'Address'}</Text>
            <Text style={[type.small, { color: color.textSecondary }]} numberOfLines={3}>
              {formatAddressPreview(deleteDialog?.address) || 'Saved delivery address'}
            </Text>
          </View>
          <View style={{ marginTop: space.xxl, gap: space.md }}>
            <Button title={isDeletingAddress ? 'Deleting...' : 'Delete address'} variant="danger" loading={isDeletingAddress} disabled={isDeletingAddress} onPress={confirmDeleteAddress} accessibilityLabel="Delete address" />
            <Button title="Cancel" variant="outline" disabled={isDeletingAddress} onPress={() => setDeleteDialog(null)} accessibilityLabel="Cancel" />
          </View>
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.xs, minHeight: 56, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  divider: { borderBottomWidth: 1, borderBottomColor: color.border },

  searchWrap: { flexDirection: 'row', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: space.md + 2, zIndex: 1 },
  searchInput: { minHeight: 52, paddingLeft: 44, paddingRight: 44, ...elevation.card },
  searchClear: { position: 'absolute', right: space.xs },
  searchSpin: { position: 'absolute', right: 48, top: 18 },

  mapSearch: { position: 'absolute', top: space.lg, left: space.lg, right: space.lg, zIndex: 20 },
  mapSuggestions: { marginTop: space.sm, backgroundColor: color.surface, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.float },
  sugHead: { paddingHorizontal: space.lg, paddingVertical: space.sm, color: color.textMuted, backgroundColor: color.surfaceMuted },
  mapSug: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 48 },
  pinLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  pinHead: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: -6 },
  pinCore: { width: 24, height: 24, borderRadius: 12, backgroundColor: color.primary, borderWidth: 2, borderColor: color.onPrimary, alignItems: 'center', justifyContent: 'center' },
  pinStem: { width: 6, height: 24, backgroundColor: color.primary, borderLeftWidth: 1, borderRightWidth: 1, borderColor: color.onPrimary, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  pinShadow: { position: 'absolute', bottom: -4, width: 18, height: 6, borderRadius: 3, backgroundColor: color.overlay },
  gpsBtn: { position: 'absolute', bottom: space.xxxl + space.sm, right: space.lg, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 48, paddingHorizontal: space.xl, borderRadius: radii.pill, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.float },

  formSheet: { backgroundColor: color.bg, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, marginTop: -space.xxl, zIndex: 10, padding: space.lg, gap: space.lg, ...elevation.sheet },
  pinned: { flexDirection: 'row', gap: space.md, padding: space.lg, borderWidth: 1, borderColor: color.primaryBorder, backgroundColor: color.primarySoft, borderRadius: radii.md },

  sugRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 56 },
  searching: { padding: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: color.surfaceMuted, borderRadius: radii.md },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg, minHeight: 64 },
  roundIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },

  savedCard: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  savedMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg, paddingRight: 0 },
  savedActions: { paddingVertical: space.sm, paddingRight: space.xs },

  fetching: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(253,251,247,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },

  delPanel: { width: '100%', maxWidth: 360, backgroundColor: color.surface, borderRadius: radii.xl, ...elevation.sheet },
  delIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  delPreview: { marginTop: space.xl, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted, padding: space.lg },

  removedToast: { width: '92%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radii.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.float },
  removedLogo: { width: 40, height: 40, borderRadius: radii.md, padding: 2, backgroundColor: color.primary },
});
