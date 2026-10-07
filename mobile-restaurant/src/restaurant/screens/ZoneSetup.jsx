import { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { ArrowLeft, Info, MapPin, Save, Search } from 'lucide-react-native';
import { Button, Card, IconButton, SegmentedControl } from '../../components/ds';
import { Press } from '../../components/ui';
import { color, elevation, radii, space, type } from '../../theme';
import RestaurantNavbar from '../components/RestaurantNavbar';
import { useZoneSetup } from '../hooks/pages/useZoneSetup';
import { Notice } from './inventory/partnerKit';

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
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <RestaurantNavbar hideSearch />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl + insets.bottom }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <IconButton icon={ArrowLeft} label="Go back" variant="soft" onPress={goBack} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">Zone setup</Text>
            <Text style={[type.small, { color: color.textMuted }]}>Set your restaurant location on the map</Text>
          </View>
        </View>

        <Card style={{ gap: space.md, zIndex: 10 }}>
          <View>
            <View style={[styles.search, searchFocused ? styles.searchFocus : null]}>
              <Search size={18} color={color.textMuted} />
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
                placeholder="Search for your restaurant location"
                placeholderTextColor={color.textMuted}
                accessibilityLabel="Search for your restaurant location"
                style={styles.searchInput}
              />
            </View>
            {showSuggestions && suggestions.length > 0 ? (
              <View style={styles.dropdown}>
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ maxHeight: 288 }}>
                  {suggestions.map((prediction, idx) => {
                    const main = prediction.mainText || prediction.display || '';
                    const secondary = prediction.secondaryText || '';
                    return (
                      <Press key={prediction.placeId || idx} scale={1} onPress={() => handleSelectSuggestion(prediction)} accessibilityLabel={main} style={[styles.sugg, idx < suggestions.length - 1 ? styles.suggDivider : null]}>
                        <MapPin size={18} color={color.primary} style={{ marginTop: 2 }} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>{main}</Text>
                          {secondary ? <Text style={[type.small, { color: color.textMuted }]} numberOfLines={1}>{secondary}</Text> : null}
                        </View>
                      </Press>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </View>

          {selectedLocation ? (
            <View style={styles.selected}>
              <Text style={[type.overline, { color: color.primary }]}>Selected location</Text>
              <Text style={[type.body, { color: color.text }]}>{selectedAddress || 'Resolving address…'}</Text>
              <Text style={[type.caption, { color: color.textMuted }]}>
                {Number(selectedLocation.latitude).toFixed(6)}, {Number(selectedLocation.longitude).toFixed(6)}
              </Text>
              {geocoding ? <Text style={[type.caption, { color: color.primary }]}>Updating address details…</Text> : null}
            </View>
          ) : null}

          <Button title={saving ? 'Saving…' : 'Save location'} icon={Save} loading={saving} disabled={saveOff} onPress={handleSaveLocation} />
        </Card>

        <Notice tone="info" icon={Info} title="How to set your location">
          {[
            'Search for your location using the search bar above, or',
            'Tap anywhere on the map to place a pin at that location',
            'Drag the pin to adjust the exact position',
            'Tap "Save location" to save your restaurant location',
          ].map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: space.sm }}>
              <Text style={[type.small, { color: color.info }]}>{'•'}</Text>
              <Text style={[type.small, { flex: 1, color: color.text }]}>{line}</Text>
            </View>
          ))}
        </Notice>

        <View style={styles.mapBox}>
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
          <SegmentedControl
            options={[
              { value: 'standard', label: 'Map' },
              { value: 'satellite', label: 'Satellite' },
            ]}
            value={mapType}
            onChange={setMapType}
            style={styles.mapTypes}
          />
          {mapLoading ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color={color.primary} />
              <Text style={[type.body, { color: color.textSecondary, marginTop: space.sm }]}>Loading map…</Text>
              <Text style={[type.caption, { color: color.textMuted, marginTop: space.sm }]}>If this takes too long, please refresh the page</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, backgroundColor: color.surface },
  searchFocus: { borderColor: color.primary, borderWidth: 1.5 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: space.md, ...type.body, color: color.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) },
  dropdown: { marginTop: space.xs, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, overflow: 'hidden', ...elevation.float },
  sugg: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.md, minHeight: 52 },
  suggDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  selected: { gap: 2, padding: space.md, backgroundColor: color.primarySoft, borderRadius: radii.md },
  mapBox: { height: 480, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted },
  mapTypes: { position: 'absolute', top: space.md, right: space.md, width: 200, ...elevation.card },
  mapLoading: { ...StyleSheet.absoluteFill, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: space.lg },
});
