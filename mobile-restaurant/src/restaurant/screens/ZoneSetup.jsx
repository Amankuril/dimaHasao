import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, Save, Search } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import RestaurantNavbar from '../components/RestaurantNavbar';
import { useZoneSetup } from '../hooks/pages/useZoneSetup';
import { RT, RT_GRADIENT } from '../theme';

/** Port of Food/pages/restaurant/ZoneSetup.jsx (/food/restaurant/zone-setup). */
export default function ZoneSetup() {
  const insets = useSafeAreaInsets();
  const {
    goBack, mapInstanceRef, mapLoading, saving, geocoding, selectedLocation, locationSearch, suggestions, showSuggestions,
    setShowSuggestions, handleSearchChange, handleSelectSuggestion, handleMapReady, handleMapPress, handleMarkerDragEnd,
    markerCoord, markerTitle, handleSaveLocation, selectedAddress,
  } = useZoneSetup();

  const [searchFocused, setSearchFocused] = useState(false);
  // the web map's roadmap / satellite control (top right)
  const [mapType, setMapType] = useState('standard');
  const saveOff = !selectedLocation || saving;

  return (
    <View style={{ flex: 1, backgroundColor: tw.gray50 }}>
      <RestaurantNavbar hideSearch />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Press onPress={goBack} accessibilityLabel="Go back" hitSlop={8} style={{ padding: 8, borderRadius: 999 }}>
            <ArrowLeft size={20} color={tw.gray700} />
          </Press>
          <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
            <MapPin size={20} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1} accessibilityRole="header">Zone Setup</Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) }}>Set your restaurant location on the map</Text>
          </View>
        </View>

        <View style={[styles.box, { padding: 12, marginBottom: 24, zIndex: 10 }]}>
          <View style={{ gap: 12 }}>
            <View>
              <View style={{ justifyContent: 'center' }}>
                <View style={{ position: 'absolute', left: 12, zIndex: 10 }} pointerEvents="none">
                  <Search size={20} color={tw.gray400} />
                </View>
                <TextInput
                  value={locationSearch}
                  onChangeText={handleSearchChange}
                  onFocus={() => {
                    setSearchFocused(true);
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    setSearchFocused(false);
                    setTimeout(() => setShowSuggestions(false), 150);
                  }}
                  placeholder="Search for your restaurant location..."
                  placeholderTextColor={tw.gray400}
                  accessibilityLabel="Search for your restaurant location"
                  style={[styles.search, searchFocused ? { borderColor: '#789d8a' } : null]}
                />
              </View>
              {showSuggestions && suggestions.length > 0 ? (
                <View style={styles.dropdown}>
                  <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ maxHeight: 288 }}>
                    {suggestions.map((prediction, idx) => {
                      const main = prediction.mainText || prediction.display || '';
                      const secondary = prediction.secondaryText || '';
                      return (
                        <Press key={prediction.placeId || idx} scale={1} onPress={() => handleSelectSuggestion(prediction)} style={[styles.sugg, idx < suggestions.length - 1 ? { borderBottomWidth: 1, borderBottomColor: tw.gray100 } : null]}>
                          <MapPin size={16} color={RT.primary} style={{ marginTop: 2 }} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) }}>{main}</Text>
                            {secondary ? <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 2, ...poppins(400) }}>{secondary}</Text> : null}
                          </View>
                        </Press>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <Press scale={0.98} disabled={saveOff} onPress={handleSaveLocation} accessibilityState={{ disabled: saveOff, busy: saving }}>
              {/* disabled:bg-gray-400 sits under the gradient image on the web, so the button keeps the gradient */}
              <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.save}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={20} color="#fff" />}
                <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) }}>{saving ? 'Saving...' : 'Save Location'}</Text>
              </LinearGradient>
            </Press>
          </View>

          {selectedLocation ? (
            <View style={styles.selected}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) }}>
                <Text style={poppins(700)}>Selected Location:</Text> {selectedAddress || 'Resolving address...'}
              </Text>
              <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(400) }}>
                Coordinates: {Number(selectedLocation.latitude).toFixed(6)}, {Number(selectedLocation.longitude).toFixed(6)}
              </Text>
              {geocoding ? <Text style={{ fontSize: 12, lineHeight: 16, color: RT.primary, marginTop: 4, ...poppins(400) }}>Updating address details...</Text> : null}
            </View>
          ) : null}
        </View>

        <View style={styles.info}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: tw.blue900, marginBottom: 8, ...poppins(600) }}>How to set your location:</Text>
          {[
            'Search for your location using the search bar above, or',
            'Click anywhere on the map to place a pin at that location',
            'You can drag the pin to adjust the exact position',
            'Click "Save Location" to save your restaurant location',
          ].map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.blue800 }}>{'•'}</Text>
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: tw.blue800, ...poppins(400) }}>{line}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.box, { overflow: 'hidden', height: 600 }]}>
          <MapView
            ref={mapInstanceRef}
            style={StyleSheet.absoluteFill}
            initialRegion={{ latitude: 20.5937, longitude: 78.9629, latitudeDelta: 17, longitudeDelta: 17 }}
            onMapReady={handleMapReady}
            onPress={handleMapPress}
            toolbarEnabled={false}
            mapType={mapType}
            accessibilityLabel="Restaurant location map"
          >
            {markerCoord ? (
              <Marker coordinate={markerCoord} draggable onDragEnd={handleMarkerDragEnd} title="Restaurant Location" description={markerTitle} />
            ) : null}
          </MapView>
          <View style={styles.mapTypes}>
            {[['standard', 'Map'], ['satellite', 'Satellite']].map(([type, caption], i) => (
              <Press key={type} scale={1} onPress={() => setMapType(type)} accessibilityRole="button" accessibilityState={{ selected: mapType === type }} style={[styles.mapTypeBtn, i === 0 ? { borderRightWidth: 1, borderRightColor: tw.gray200 } : null]}>
                <Text style={{ fontSize: 14, lineHeight: 20, color: mapType === type ? tw.gray900 : tw.gray600, ...poppins(mapType === type ? 500 : 400) }}>{caption}</Text>
              </Press>
            ))}
          </View>
          {mapLoading ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color={RT.primary} />
              <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray600, marginTop: 8, ...poppins(400) }}>Loading map...</Text>
              <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray400, marginTop: 8, ...poppins(400) }}>If this takes too long, please refresh the page</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 24, lineHeight: 32, color: tw.gray900, ...poppins(700) },
  box: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, ...shadow('sm') },
  search: { paddingLeft: 40, paddingRight: 16, paddingVertical: 14, fontSize: 14, color: tw.gray900, borderWidth: 1, borderColor: tw.gray300, borderRadius: 8, ...poppins(400) },
  dropdown: { marginTop: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, overflow: 'hidden', ...shadow('lg') },
  sugg: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 12, paddingVertical: 12 },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8 },
  selected: { marginTop: 12, padding: 12, backgroundColor: tw.green50, borderWidth: 1, borderColor: tw.green200, borderRadius: 8 },
  info: { backgroundColor: tw.blue50, borderWidth: 1, borderColor: tw.blue200, borderRadius: 8, padding: 16, marginBottom: 24 },
  mapTypes: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', backgroundColor: '#fff', borderRadius: 2, overflow: 'hidden', ...shadow('md') },
  mapTypeBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  mapLoading: { ...StyleSheet.absoluteFill, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
});
