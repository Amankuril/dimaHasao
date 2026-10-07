import { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { ArrowLeft, Check, ChevronRight, LocateFixed, MapPin, MapPinned, Search, ShieldCheck, X } from 'lucide-react-native';
import { Press, Spinner } from '../../components/ui';
import { Button, IconButton, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
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
          <Spinner size={16} color={color.primary} />
          <Text style={styles.searchingText}>Searching suggestions...</Text>
        </View>
      ) : null}
      {results.map((result) => (
        <Press key={keyOf(result)} onPress={() => onSelect(result)} accessibilityLabel={`${result.title}, ${result.address}`} style={styles.suggestion}>
          <MapPin size={18} color={color.primary} style={{ marginTop: 2 }} />
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
  // iOS keyboard: this screen sits under the module header, so the avoiding view needs its window offset.
  const kavRef = useRef(null);
  const [kavOffset, setKavOffset] = useState(0);
  const measureKav = () => kavRef.current?.measureInWindow?.((_x, y) => setKavOffset(Number(y) || 0));

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
    const accent = isPickup ? color.primary : color.danger;
    return (
      <View>
        <Text style={[styles.fieldLabel, { color: accent }]}>{`${isPickup ? 'Pickup' : 'Drop'} in ${isPickup ? fromCity : toCity}`}</Text>
        <View style={styles.fieldRow}>
          <View style={[styles.dot, isPickup ? null : styles.dotDrop]}>
            {isPickup ? <View style={styles.dotInner} /> : <View style={styles.dropInner} />}
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
            placeholderTextColor={color.textDisabled}
            accessibilityLabel={isPickup ? 'Pickup address' : 'Drop address'}
            style={[styles.input, focused === field && { borderColor: color.primary, backgroundColor: color.surface }]}
          />
        </View>
        {focused === field ? (
          <View style={{ marginLeft: 32 + space.md }}>
            <Suggestions results={fieldSuggest.results} searching={fieldSuggest.searching} keyOf={normalizeSuggestionKey} onSelect={(result) => selectFieldSuggestion(field, result)} />
          </View>
        ) : null}
        <Button
          title="Select on map"
          icon={MapPinned}
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={() => { Keyboard.dismiss(); openMapPicker(field); }}
          accessibilityLabel={`Select ${isPickup ? 'pickup' : 'drop'} on map`}
          style={styles.mapBtn}
        />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: space.sm + insets.top }]}>
        <IconButton icon={ArrowLeft} label="Go back" onPress={() => navigate(-1)} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} accessibilityRole="header">Location details</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{`${fromCity} → ${toCity}`}</Text>
        </View>
      </View>

      <KeyboardAvoidingView ref={kavRef} onLayout={measureKav} keyboardVerticalOffset={kavOffset} style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.card}>
            {addressField('pickup')}
            <View style={styles.cardDivider} />
            {addressField('drop')}
          </View>

          <View style={styles.tip}>
            <View style={styles.tipIcon}>
              <ShieldCheck size={26} color={color.goldOnDark} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.tipTitle}>Doorstep service</Text>
              <Text style={styles.tipBody}>Exact locations help drivers navigate directly to you.</Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
          <View style={styles.live}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.liveLabel}>Live fetching</Text>
              <Text style={styles.liveValue}>{isFetchingDrivers ? 'Checking nearby drivers...' : `${liveDriverCount} drivers nearby`}</Text>
            </View>
            {isFetchingDrivers ? <Spinner size={18} color={color.primary} /> : <StatusBadge label="Live" tone="success" style={{ alignSelf: 'center' }} />}
          </View>
          {validationError ? <Text style={styles.validation} accessibilityRole="alert">{validationError}</Text> : null}
          {driverFetchError ? <Text style={styles.validation}>{driverFetchError}</Text> : null}
          <Button
            title={isProceeding ? 'Fetching drivers...' : 'Proceed to live tracking'}
            iconRight={isProceeding ? undefined : ChevronRight}
            size="lg"
            loading={isProceeding}
            disabled={isProceeding}
            onPress={handleContinue}
          />
        </View>
      </KeyboardAvoidingView>

      {showMapPicker ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: color.surface, zIndex: 100 }]}>
          <View style={{ flex: 1, backgroundColor: color.surfaceMuted }}>
            {!HAS_VALID_GOOGLE_MAPS_KEY ? (
              <View style={styles.mapMsgWrap}>
                <View style={styles.mapMsg}>
                  <View style={styles.mapMsgIcon}>
                    <X size={28} color={color.danger} />
                  </View>
                  <Text style={styles.mapMsgTitle}>Map key missing</Text>
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
                <View style={[styles.pinHead, activeMapField === 'pickup' ? null : { backgroundColor: color.danger }]}>
                  <MapPin size={20} color={color.textInverse} />
                </View>
                <View style={[styles.pinStick, activeMapField === 'pickup' ? null : { backgroundColor: color.danger }]} />
              </View>
            </View>

            <Press scale={0.9} disabled={isLocating} onPress={handleUseCurrentLocation} accessibilityLabel="Use current location" accessibilityState={{ busy: isLocating }} style={styles.locate}>
              {isLocating ? <Spinner size={22} color={color.primary} /> : <LocateFixed size={24} color={color.primary} />}
            </Press>
          </View>

          <View style={[styles.pickerTop, { paddingTop: space.md + insets.top }]}>
            <View style={styles.pickerHead}>
              <IconButton icon={ArrowLeft} label="Close map" onPress={() => setShowMapPicker(false)} style={styles.pickBack} />
              <View style={styles.pickedCard}>
                <Text style={[styles.pickedLabel, { color: activeMapField === 'pickup' ? color.primary : color.danger }]}>{activeMapField === 'pickup' ? `Pickup in ${fromCity}` : `Drop in ${toCity}`}</Text>
                <Text style={styles.pickedText} numberOfLines={1}>{isGeocoding ? 'Finding exact address...' : pickedAddress}</Text>
              </View>
            </View>
            <Text style={styles.editLabel}>Edit location manually</Text>
            <View style={styles.searchCard}>
              <View style={styles.searchRow}>
                <Search size={18} color={color.textMuted} />
                <TextInput
                  value={mapSearchInput}
                  onChangeText={setMapSearchInput}
                  placeholder={activeMapField === 'pickup' ? 'Search pickup address' : 'Search drop address'}
                  placeholderTextColor={color.textDisabled}
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
                <Text style={styles.destinationLabel}>Initial destination</Text>
                <Text style={styles.destinationText} numberOfLines={1}>{toCity}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.pickerBottom, { paddingBottom: space.lg + insets.bottom }]}>
            <View style={styles.confirmRow}>
              <View style={[styles.confirmIcon, activeMapField === 'pickup' ? null : { backgroundColor: color.dangerSoft }]}>
                <MapPin size={22} color={activeMapField === 'pickup' ? color.primary : color.danger} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.confirmTitle}>Confirm spot</Text>
                <Text style={styles.confirmText} numberOfLines={2}>{pickedAddress}</Text>
              </View>
            </View>
            <Button title="Confirm location" icon={Check} size="lg" disabled={isGeocoding} onPress={handleConfirmMapLocation} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, paddingBottom: space.sm, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  title: { ...type.heading, color: color.text },
  subtitle: { ...type.small, color: color.textMuted },
  content: { padding: space.lg, gap: space.lg },
  card: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.lg, borderWidth: 1, borderColor: color.border, ...elevation.card },
  cardDivider: { height: 1, backgroundColor: color.border, marginVertical: space.lg },
  fieldLabel: { ...type.label, marginLeft: 32 + space.md, marginBottom: space.sm },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dotDrop: { backgroundColor: color.dangerSoft },
  dotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.primary },
  dropInner: { width: 12, height: 12, borderRadius: 2, backgroundColor: color.danger },
  input: { flex: 1, minWidth: 0, height: 52, backgroundColor: color.surfaceMuted, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, paddingHorizontal: space.lg, ...type.body, fontSize: 15, color: color.text, outlineStyle: 'none' },
  mapBtn: { marginLeft: 32 + space.md, marginTop: space.md, minHeight: 40 },
  searching: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xs, paddingVertical: space.sm },
  searchingText: { ...type.small, color: color.textMuted },
  suggestion: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingHorizontal: space.xs, paddingVertical: space.md, minHeight: 52 },
  suggestionTitle: { ...type.bodyStrong, color: color.text },
  suggestionAddress: { ...type.small, color: color.textMuted },
  tip: { flexDirection: 'row', alignItems: 'center', gap: space.lg, backgroundColor: color.primaryDeep, borderRadius: radii.lg, padding: space.xl },
  tipIcon: { width: 52, height: 52, borderRadius: radii.md, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: color.gold, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { ...type.subheading, color: color.goldOnDark },
  tipBody: { ...type.small, color: color.textOnDarkMuted, marginTop: space.xxs },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, gap: space.md, ...elevation.sheet },
  live: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, borderRadius: radii.md, backgroundColor: color.bg, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.lg, paddingVertical: space.md },
  liveLabel: { ...type.caption, color: color.textMuted },
  liveValue: { ...type.bodyStrong, color: color.text },
  validation: { borderRadius: radii.md, backgroundColor: color.dangerSoft, paddingHorizontal: space.lg, paddingVertical: space.md, ...type.small, color: color.danger, overflow: 'hidden' },

  mapMsgWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl },
  mapMsg: { maxWidth: 300, borderRadius: radii.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.xxxl, paddingVertical: space.xxxl, alignItems: 'center', ...elevation.card },
  mapMsgIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  mapMsgTitle: { ...type.subheading, color: color.text },
  mapMsgBody: { ...type.small, color: color.textMuted, marginTop: space.sm, textAlign: 'center' },
  pinWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingBottom: 64 },
  pinHead: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.primary, borderWidth: 3, borderColor: color.surface, alignItems: 'center', justifyContent: 'center', ...elevation.float },
  pinStick: { width: 4, height: 20, backgroundColor: color.primary, marginTop: -2, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  locate: { position: 'absolute', right: space.lg, bottom: space.xl, width: 52, height: 52, borderRadius: 26, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center', ...elevation.float },
  pickerTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: space.lg, paddingBottom: space.lg, backgroundColor: color.bg, borderBottomWidth: 1, borderBottomColor: color.border },
  pickerHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pickBack: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border },
  pickedCard: { flex: 1, minWidth: 0, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.lg, paddingVertical: space.sm },
  pickedLabel: { ...type.caption, fontFamily: 'Poppins_600SemiBold' },
  pickedText: { ...type.bodyStrong, color: color.text },
  editLabel: { ...type.label, color: color.textSecondary, marginTop: space.lg, marginBottom: space.sm },
  searchCard: { borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.lg, paddingVertical: space.xs },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  searchInput: { flex: 1, minWidth: 0, ...type.body, color: color.text, paddingVertical: space.sm, outlineStyle: 'none' },
  searchResults: { borderTopWidth: 1, borderTopColor: color.border, paddingTop: space.xs },
  destination: { marginTop: space.md, marginLeft: 44 + space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.lg, paddingVertical: space.sm },
  destinationLabel: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.danger },
  destinationText: { ...type.bodyStrong, color: color.text },
  pickerBottom: { paddingHorizontal: space.lg, paddingTop: space.lg, backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, marginTop: -space.xl, gap: space.lg, ...elevation.sheet },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  confirmIcon: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { ...type.subheading, color: color.text },
  confirmText: { ...type.small, color: color.textMuted },
});
