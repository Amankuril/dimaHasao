import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { ArrowLeft, Check, ChevronRight, MapPin, MapPinned, Navigation, Search, ShieldCheck, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { shadow, tw } from '../../theme';
import { fo } from '../account/ui';
import { useIntercityDetails } from '../hooks/useIntercityDetails';
import { HAS_VALID_GOOGLE_MAPS_KEY } from '../utils/googleMaps';
import { getDevicePosition, reverseGeocodeAddress, searchPlaces } from '../utils/places';

const toRegion = (center, delta = 0.01) => ({ latitude: center.lat, longitude: center.lng, latitudeDelta: delta, longitudeDelta: delta });

/** Debounced place search for a text box. The web gets this from Google's Autocomplete widget. */
function usePlaceSuggestions(query, center, enabled) {
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const latest = useRef(0);
  const lat = center?.lat;
  const lng = center?.lng;

  useEffect(() => {
    const text = String(query || '').trim();
    const requestId = latest.current + 1;
    latest.current = requestId;
    if (!enabled || text.length < 3) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      let next = [];
      try {
        next = await searchPlaces(text, Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null);
      } catch {
        next = [];
      }
      if (latest.current !== requestId) return;
      setResults(next);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, lat, lng, enabled]);

  return { results, searching };
}

function Suggestions({ results, searching, onSelect, keyOf }) {
  if (!searching && results.length === 0) return null;
  return (
    <View>
      {searching ? (
        <View style={styles.searching}>
          <ActivityIndicator size="small" color={tw.blue500} />
          <Text style={styles.searchingText}>Searching suggestions...</Text>
        </View>
      ) : null}
      {results.map((result) => (
        <Press key={keyOf(result)} onPress={() => onSelect(result)} style={styles.suggestion}>
          <MapPin size={15} color={tw.blue500} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.suggestionTitle} numberOfLines={1}>{result.title}</Text>
            <Text style={styles.suggestionAddress} numberOfLines={2}>{result.address}</Text>
          </View>
        </Press>
      ))}
    </View>
  );
}

/** Port of Taxi/modules/user/pages/intercity/IntercityDetails.jsx (/taxi/user/intercity/details). */
export default function IntercityDetails() {
  const h = useIntercityDetails();
  if (h.__guard) return null;
  return <Details h={h} />;
}

function Details({ h }) {
  const insets = useSafeAreaInsets();
  const {
    navigate, fromCity, toCity, pickup, setPickup, drop, setDrop, setPickupCoords, setDropCoords, showMapPicker, setShowMapPicker,
    activeMapField, mapCenter, pickedAddress, setPickedAddress, isGeocoding, setIsGeocoding, isDragging, setIsDragging, isLocating, setIsLocating,
    mapSearchInput, setMapSearchInput, lastCenterRef, reverseGeocodeTimerRef, reverseGeocodeCacheRef, liveDriverCount, isFetchingDrivers,
    driverFetchError, validationError, setValidationError, isProceeding, handleContinue, openMapPicker, handleConfirmMapLocation,
    getCityCenter, normalizeSuggestionKey, MAP_REVERSE_GEOCODE_DEBOUNCE_MS, getLatLngCacheKey,
  } = h;

  const mapRef = useRef(null);
  const [focused, setFocused] = useState(null); // 'pickup' | 'drop' — which address box shows suggestions
  const [typed, setTyped] = useState(false);

  const fieldQuery = focused === 'pickup' ? pickup : focused === 'drop' ? drop : '';
  const fieldSuggest = usePlaceSuggestions(fieldQuery, getCityCenter(focused === 'drop' ? toCity : fromCity), !!focused && typed && !showMapPicker);
  // The picker's box is prefilled with the picked address; only search what the user typed.
  const mapSuggest = usePlaceSuggestions(mapSearchInput, getCityCenter(activeMapField === 'pickup' ? fromCity : toCity), showMapPicker && mapSearchInput.trim() !== String(pickedAddress || '').trim());

  // Android back closes the map picker first, as the picker's own back arrow does.
  useEffect(() => {
    if (!showMapPicker) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowMapPicker(false);
      return true;
    });
    return () => sub.remove();
  }, [showMapPicker, setShowMapPicker]);

  const selectFieldSuggestion = (field, result) => {
    if (field === 'pickup') {
      setPickup(result.address);
      setPickupCoords(result.coords);
    } else {
      setDrop(result.address);
      setDropCoords(result.coords);
    }
    setValidationError('');
    setTyped(false);
    Keyboard.dismiss();
  };

  const handleMapIdle = (region) => {
    const lat = region.latitude;
    const lng = region.longitude;
    const diff = Math.abs(lat - lastCenterRef.current.lat) + Math.abs(lng - lastCenterRef.current.lng);
    setIsDragging(false);
    if (diff < 0.00001) return;
    lastCenterRef.current = { lat, lng };
    const cacheKey = getLatLngCacheKey({ lat, lng });
    const cached = reverseGeocodeCacheRef.current.get(cacheKey);
    if (cached) {
      setPickedAddress(cached);
      return;
    }
    if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
    reverseGeocodeTimerRef.current = setTimeout(async () => {
      setIsGeocoding(true);
      const address = await reverseGeocodeAddress(lat, lng);
      setIsGeocoding(false);
      if (address) {
        reverseGeocodeCacheRef.current.set(cacheKey, address);
        setPickedAddress(address);
        return;
      }
      setPickedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }, MAP_REVERSE_GEOCODE_DEBOUNCE_MS);
  };

  const handleUseCurrentLocation = async () => {
    if (isLocating) return;
    setIsLocating(true);
    try {
      const pos = await getDevicePosition();
      mapRef.current?.animateToRegion(toRegion({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 0.003), 400);
    } catch {
      // permission denied or no fix: the map stays where it is, as on the web
    } finally {
      setIsLocating(false);
    }
  };

  const handleMapSearchSuggestionSelect = (result) => {
    const [lng, lat] = result.coords;
    lastCenterRef.current = { lat, lng };
    reverseGeocodeCacheRef.current.set(getLatLngCacheKey({ lat, lng }), result.address);
    setPickedAddress(result.address);
    setMapSearchInput(result.address);
    Keyboard.dismiss();
    mapRef.current?.animateToRegion(toRegion({ lat, lng }, 0.003), 400);
  };

  const addressField = (field) => {
    const isPickup = field === 'pickup';
    const value = isPickup ? pickup : drop;
    return (
      <View>
        <Text style={[styles.fieldLabel, { color: isPickup ? tw.blue600 : tw.indigo600 }]}>{`${isPickup ? 'Pickup' : 'Drop'} in ${isPickup ? fromCity : toCity}`.toUpperCase()}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={[styles.dot, isPickup ? null : { backgroundColor: tw.indigo50, borderColor: tw.indigo100 }]}>
            {isPickup ? <View style={styles.dotInner} /> : <MapPin size={14} color={tw.indigo600} strokeWidth={3} />}
          </View>
          <TextInput
            value={value}
            onChangeText={(text) => {
              (isPickup ? setPickup : setDrop)(text);
              (isPickup ? setPickupCoords : setDropCoords)(null);
              setValidationError('');
              setTyped(true);
            }}
            onFocus={() => {
              setFocused(field);
              setTyped(false);
            }}
            placeholder={isPickup ? 'Building, street name, etc.' : 'Station, mall, hotel name...'}
            placeholderTextColor={tw.slate400}
            accessibilityLabel={isPickup ? 'Pickup address' : 'Drop address'}
            style={styles.input}
          />
        </View>
        {focused === field ? (
          <View style={{ marginLeft: 48 }}>
            <Suggestions results={fieldSuggest.results} searching={fieldSuggest.searching} keyOf={normalizeSuggestionKey} onSelect={(result) => selectFieldSuggestion(field, result)} />
          </View>
        ) : null}
        <Press scale={0.95} onPress={() => { Keyboard.dismiss(); openMapPicker(field); }} style={[styles.mapBtn, isPickup ? null : { backgroundColor: tw.indigo50, borderColor: tw.indigo100 }]}>
          <MapPinned size={14} color={isPickup ? tw.blue700 : tw.indigo700} />
          <Text style={[styles.mapBtnText, { color: isPickup ? tw.blue700 : tw.indigo700 }]}>Map Selection</Text>
        </Press>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFBFF' }}>
      <View style={[styles.header, { paddingTop: 48 + insets.top }]}>
        <Press scale={0.9} onPress={() => navigate(-1)} accessibilityLabel="Go back" style={styles.back} hitSlop={6}>
          <ArrowLeft size={20} color={tw.slate900} strokeWidth={2.5} />
        </Press>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} accessibilityRole="header">Location Details</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{`${fromCity} → ${toCity}`.toUpperCase()}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 24 }}>
          <View style={styles.card}>
            {addressField('pickup')}
            <View style={{ height: 40 }} />
            {addressField('drop')}
          </View>

          <View style={styles.tip}>
            <View style={styles.tipIcon}>
              <ShieldCheck size={28} color={tw.blue400} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Doorstep Service</Text>
              <Text style={styles.tipBody}>EXACT LOCATIONS HELP DRIVERS NAVIGATE DIRECTLY TO YOU.</Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 24 + insets.bottom }]}>
          <View style={styles.live}>
            <View style={{ flex: 1 }}>
              <Text style={styles.liveLabel}>LIVE FETCHING</Text>
              <Text style={styles.liveValue}>{isFetchingDrivers ? 'Checking nearby drivers...' : `${liveDriverCount} drivers nearby`}</Text>
            </View>
            {isFetchingDrivers ? <ActivityIndicator size="small" color={tw.blue500} /> : <Text style={styles.liveBadge}>Live</Text>}
          </View>
          {validationError ? <Text style={styles.validation} accessibilityRole="alert">{validationError}</Text> : null}
          {driverFetchError ? <Text style={[styles.validation, styles.driverError]}>{driverFetchError}</Text> : null}
          <Press scale={0.97} disabled={isProceeding} onPress={handleContinue} accessibilityState={{ disabled: isProceeding, busy: isProceeding }} style={styles.cta}>
            {isProceeding ? <ActivityIndicator size="small" color="#fff" /> : null}
            <Text style={styles.ctaText} numberOfLines={1} adjustsFontSizeToFit>{isProceeding ? 'FETCHING DRIVERS...' : 'PROCEED TO LIVE TRACKING'}</Text>
            {isProceeding ? null : <ChevronRight size={20} color="#fff" strokeWidth={3} />}
          </Press>
        </View>
      </KeyboardAvoidingView>

      {showMapPicker ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', zIndex: 100 }]}>
          <View style={{ flex: 1, backgroundColor: tw.slate100 }}>
            {!HAS_VALID_GOOGLE_MAPS_KEY ? (
              <View style={styles.mapMsgWrap}>
                <View style={styles.mapMsg}>
                  <View style={styles.mapMsgIcon}>
                    <X size={32} color={tw.rose400} />
                  </View>
                  <Text style={styles.mapMsgTitle}>Map Key Missing</Text>
                  <Text style={styles.mapMsgBody}>Add a valid maps key to select locations on the map.</Text>
                </View>
              </View>
            ) : (
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFill}
                initialRegion={toRegion(mapCenter)}
                toolbarEnabled={false}
                showsMyLocationButton={false}
                showsCompass={false}
                onPanDrag={() => setIsDragging(true)}
                onRegionChangeComplete={handleMapIdle}
              />
            )}

            <View style={styles.pinWrap} pointerEvents="none">
              <View style={{ alignItems: 'center', transform: [{ translateY: isDragging || isGeocoding ? -15 : 0 }] }}>
                <View style={styles.pinHead}>
                  <MapPinned size={20} color="#fff" />
                </View>
                <View style={styles.pinStick} />
              </View>
            </View>

            <Press scale={0.9} disabled={isLocating} onPress={handleUseCurrentLocation} accessibilityLabel="Use current location" style={[styles.locate, isLocating ? { opacity: 0.7 } : null]}>
              {isLocating ? <ActivityIndicator size="small" color={tw.blue500} /> : <Navigation size={24} color={tw.slate900} />}
            </Press>
          </View>

          <View style={[styles.pickerTop, { paddingTop: 48 + insets.top }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Press scale={0.9} onPress={() => setShowMapPicker(false)} accessibilityLabel="Close map" style={styles.back}>
                <ArrowLeft size={20} color={tw.slate900} strokeWidth={2.5} />
              </Press>
              <View style={styles.pickedCard}>
                <Text style={styles.pickedLabel}>{(activeMapField === 'pickup' ? `Pickup in ${fromCity}` : `Drop in ${toCity}`).toUpperCase()}</Text>
                <Text style={styles.pickedText} numberOfLines={1}>{isGeocoding ? 'Finding exact address...' : pickedAddress}</Text>
              </View>
            </View>
            <Text style={styles.editLabel}>EDIT LOCATION MANUALLY</Text>
            <View style={styles.searchCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Search size={16} color={tw.slate400} />
                <TextInput
                  value={mapSearchInput}
                  onChangeText={setMapSearchInput}
                  placeholder={activeMapField === 'pickup' ? 'Search pickup address' : 'Search drop address'}
                  placeholderTextColor={tw.slate400}
                  accessibilityLabel="Search address"
                  style={styles.searchInput}
                />
              </View>
              {mapSuggest.searching || mapSuggest.results.length > 0 ? (
                <View style={styles.searchResults}>
                  <Suggestions results={mapSuggest.results} searching={mapSuggest.searching} keyOf={normalizeSuggestionKey} onSelect={handleMapSearchSuggestionSelect} />
                </View>
              ) : null}
            </View>
            {activeMapField === 'drop' ? (
              <View style={styles.destination}>
                <Text style={styles.destinationLabel}>INITIAL DESTINATION</Text>
                <Text style={styles.destinationText} numberOfLines={1}>{toCity}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.pickerBottom, { paddingBottom: 32 + insets.bottom }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={styles.confirmIcon}>
                <MapPin size={24} color={tw.blue600} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.confirmTitle}>Confirm Spot</Text>
                <Text style={styles.confirmText} numberOfLines={1}>{pickedAddress}</Text>
              </View>
            </View>
            <Press scale={0.98} disabled={isGeocoding} onPress={handleConfirmMapLocation} accessibilityState={{ disabled: isGeocoding }} style={[styles.confirmBtn, isGeocoding ? { opacity: 0.4 } : null]}>
              <Check size={20} color="#fff" strokeWidth={3} />
              <Text style={styles.confirmBtnText}>CONFIRM LOCATION</Text>
            </Press>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingBottom: 24, backgroundColor: 'rgba(255,255,255,0.92)', borderBottomWidth: 1, borderBottomColor: tw.indigo50 },
  back: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  title: { fontSize: 20, lineHeight: 22, letterSpacing: -0.5, color: tw.slate900, ...fo(900) },
  subtitle: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: tw.slate400, marginTop: 4, ...fo(700) },
  card: { backgroundColor: '#fff', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: tw.indigo50, ...shadow('0 10px 40px rgba(0,0,0,0.03)') },
  fieldLabel: { fontSize: 11, lineHeight: 16, letterSpacing: 1.65, marginLeft: 44, marginBottom: 8, ...fo(900) },
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.blue50, borderWidth: 2, borderColor: tw.blue100, alignItems: 'center', justifyContent: 'center' },
  dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: tw.blue500 },
  input: { flex: 1, height: 56, backgroundColor: tw.slate50, borderRadius: 16, paddingHorizontal: 20, fontSize: 15, color: tw.slate900, ...fo(700) },
  mapBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 48, marginTop: 12, borderRadius: 12, backgroundColor: tw.blue50, borderWidth: 1, borderColor: tw.blue100, paddingHorizontal: 16, paddingVertical: 8 },
  mapBtnText: { fontSize: 12, lineHeight: 16, ...fo(900) },
  searching: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingVertical: 8 },
  searchingText: { fontSize: 12, lineHeight: 16, color: tw.slate500, ...fo(700) },
  suggestion: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 4, paddingVertical: 12 },
  suggestionTitle: { fontSize: 13, lineHeight: 18, color: tw.slate900, ...fo(900) },
  suggestionAddress: { fontSize: 12, lineHeight: 20, color: tw.slate500, marginTop: 2, ...fo(700) },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 20, backgroundColor: tw.slate900, borderRadius: 32, padding: 24, ...shadow('xl') },
  tipIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 15, lineHeight: 19, color: '#fff', ...fo(900) },
  tipBody: { fontSize: 11, lineHeight: 18, letterSpacing: 1.1, color: 'rgba(255,255,255,0.5)', marginTop: 4, ...fo(700) },
  footer: { paddingHorizontal: 24, paddingTop: 16, backgroundColor: '#FAFBFF' },
  live: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: tw.slate100, paddingHorizontal: 16, paddingVertical: 12, ...shadow('lg') },
  liveLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1.5, color: tw.slate400, ...fo(900) },
  liveValue: { fontSize: 15, lineHeight: 22, color: tw.slate900, marginTop: 4, ...fo(900) },
  liveBadge: { fontSize: 11, lineHeight: 16, color: tw.blue700, backgroundColor: tw.blue50, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, overflow: 'hidden', ...fo(900) },
  validation: { marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: tw.rose200, backgroundColor: tw.rose50, paddingHorizontal: 16, paddingVertical: 12, fontSize: 12, lineHeight: 16, color: tw.rose600, overflow: 'hidden', ...fo(700) },
  driverError: { borderColor: tw.rose100, color: tw.rose500, fontSize: 11 },
  cta: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 22, backgroundColor: tw.blue600, paddingHorizontal: 16, ...shadow('0 25px 50px -12px rgba(59,130,246,0.2)') },
  ctaText: { flexShrink: 1, fontSize: 16, letterSpacing: 3.2, color: '#fff', ...fo(900) },

  mapMsgWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  mapMsg: { maxWidth: 300, borderRadius: 32, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate100, paddingHorizontal: 32, paddingVertical: 40, alignItems: 'center', ...shadow('xl') },
  mapMsgIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: tw.rose50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  mapMsgTitle: { fontSize: 16, lineHeight: 24, color: tw.slate900, ...fo(900) },
  mapMsgBody: { fontSize: 13, lineHeight: 19, color: tw.slate500, marginTop: 8, textAlign: 'center', ...fo(700) },
  pinWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingBottom: 64 },
  pinHead: { width: 48, height: 48, borderRadius: 18, backgroundColor: tw.blue600, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('2xl') },
  pinStick: { width: 4, height: 24, backgroundColor: tw.blue600, marginTop: -8 },
  locate: { position: 'absolute', right: 24, bottom: 40, width: 56, height: 56, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center', ...shadow('xl') },
  pickerTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.95)' },
  pickedCard: { flex: 1, minWidth: 0, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: tw.indigo50, paddingHorizontal: 20, paddingVertical: 16, ...shadow('lg') },
  pickedLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 2, color: tw.blue600, marginBottom: 4, ...fo(900) },
  pickedText: { fontSize: 14, lineHeight: 18, color: tw.slate900, ...fo(700) },
  editLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1.8, color: tw.slate400, marginTop: 16, marginBottom: 8, ...fo(900) },
  searchCard: { borderRadius: 24, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, ...shadow('sm') },
  searchInput: { flex: 1, padding: 0, fontSize: 14, color: tw.slate900, ...fo(700) },
  searchResults: { marginTop: 12, borderTopWidth: 1, borderTopColor: tw.slate100, paddingTop: 12 },
  destination: { marginTop: 12, marginLeft: 52, borderRadius: 16, borderWidth: 1, borderColor: tw.indigo100, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 12, ...shadow('sm') },
  destinationLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1.8, color: tw.indigo600, ...fo(900) },
  destinationText: { fontSize: 13, lineHeight: 18, color: tw.slate900, marginTop: 4, ...fo(700) },
  pickerBottom: { paddingHorizontal: 24, paddingTop: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.indigo50, gap: 20 },
  confirmIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: tw.blue50, borderWidth: 1, borderColor: tw.blue100, alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { fontSize: 16, lineHeight: 18, color: tw.slate900, ...fo(900) },
  confirmText: { fontSize: 13, lineHeight: 18, color: tw.slate400, marginTop: 6, ...fo(700) },
  confirmBtn: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 22, backgroundColor: tw.blue600, ...shadow('0 20px 25px -5px rgba(59,130,246,0.2)') },
  confirmBtnText: { fontSize: 16, letterSpacing: 1.6, color: '#fff', ...fo(900) },
});
