import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Button } from '../../components/ds';
import { Press } from '../../components/ui';
import { color, elevation, radii, space, type } from '../../theme';
import LocationSearchInput from '../components/LocationSearchInput';
import { useEditRestaurantAddress } from '../hooks/pages/useEditRestaurantAddress';
import { Radio, ScreenHeader, SheetPanel } from './inventory/partnerKit';

function Info({ label, value, big }) {
  return (
    <View style={{ minWidth: 0 }}>
      <Text style={[type.overline, { color: color.textMuted }]}>{label}</Text>
      <Text style={[big ? type.subheading : type.body, { color: color.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function OptionRow({ title, body, selected, onPress, divider }) {
  return (
    <Press scale={1} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={title} style={[styles.option, selected && styles.optionOn, divider && { marginBottom: space.sm }]}>
      <Radio selected={selected} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[type.bodyStrong, { color: color.text }]}>{title}</Text>
        {body ? <Text style={[type.small, { color: color.textMuted, marginTop: 2 }]}>{body}</Text> : null}
      </View>
    </Press>
  );
}

/** Port of Food/pages/restaurant/EditRestaurantAddress.jsx (/food/restaurant/edit-address). */
export default function EditRestaurantAddress() {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const {
    goBackToEditOwner, mapInstanceRef, restaurantName, selectedLocation, loading, mapLoading, geocoding, showSelectOptionDialog,
    setShowSelectOptionDialog, selectedOption, setSelectedOption, lat, lng, hasMovedPin, handleRegionChangeComplete, handleMapReady,
    zoomToDelta, MAP_ZOOM, handleSearchLocationSelect, handleUpdateClick, handleProceedUpdate, previewText, simplifiedAddress,
  } = useEditRestaurantAddress();

  const [pinH, setPinH] = useState(88);
  // BottomPopup: tapping the handle collapses the sheet to its header
  const [popupCollapsed, setPopupCollapsed] = useState(false);
  const closePopup = () => {
    setShowSelectOptionDialog(false);
    setPopupCollapsed(false);
  };
  const updateOff = loading || mapLoading || geocoding;
  const delta = zoomToDelta(MAP_ZOOM);

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScreenHeader title={restaurantName} subtitle={simplifiedAddress} onBack={goBackToEditOwner} />
      <View style={styles.searchBar}>
        <LocationSearchInput label="" placeholder="Search area, street, landmark" biasLocation={{ latitude: lat, longitude: lng }} onLocationSelect={handleSearchLocationSelect} />
      </View>

      <View style={{ flex: 1 }}>
        {!loading ? (
          <MapView
            ref={mapInstanceRef}
            style={StyleSheet.absoluteFill}
            initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta }}
            onMapReady={handleMapReady}
            onRegionChangeComplete={handleRegionChangeComplete}
            toolbarEnabled={false}
            showsMyLocationButton={false}
            moveOnMarkerPress={false}
            accessibilityLabel="Outlet location map"
          />
        ) : null}

        {mapLoading ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={color.primary} />
            <Text style={[type.body, { color: color.textSecondary, marginTop: space.sm }]}>Loading map…</Text>
          </View>
        ) : null}

        {/* Fixed pin: its tip sits at 36% of the map height, as on the web. */}
        <View pointerEvents="none" style={[styles.pinWrap, { transform: [{ translateY: -pinH }] }]} onLayout={(e) => setPinH(e.nativeEvent.layout.height)}>
          <View style={styles.pinTip}>
            <Text style={[type.label, { color: color.textInverse, textAlign: 'center' }]}>Your outlet location</Text>
            <Text style={[type.caption, { color: color.textOnDarkMuted, textAlign: 'center' }]}>Drag the map or search above</Text>
          </View>
          <View style={styles.pinDot} />
          <View style={{ width: 2, height: 12, backgroundColor: color.primaryDeep }} />
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: space.lg + insets.bottom }]}>
        <View style={styles.handle} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md }}>
          <MapPin size={18} color={color.primary} />
          <Text style={[type.heading, { color: color.text }]}>Selected location</Text>
        </View>

        <ScrollView style={{ maxHeight: Math.min(200, winH * 0.24) }} contentContainerStyle={{ paddingBottom: space.md }}>
          {geocoding && hasMovedPin ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 64 }}>
              <ActivityIndicator size="small" color={color.primary} />
              <Text style={[type.body, { color: color.textMuted }]}>Fetching exact place details…</Text>
            </View>
          ) : selectedLocation ? (
            <View style={{ gap: space.md }}>
              {selectedLocation.placeName || selectedLocation.addressLine1 ? <Info label="Place" value={selectedLocation.placeName || selectedLocation.addressLine1} big /> : null}
              {selectedLocation.addressLine2 ? <Info label="Street" value={selectedLocation.addressLine2} /> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space.md }}>
                <View style={styles.half}><Info label="Area" value={selectedLocation.area || '—'} /></View>
                <View style={styles.half}><Info label="City" value={selectedLocation.city || '—'} /></View>
                <View style={styles.half}><Info label="Pincode" value={selectedLocation.pincode || '—'} /></View>
                <View style={styles.half}><Info label="State" value={selectedLocation.state || '—'} /></View>
              </View>
              {hasMovedPin ? <Text style={[type.caption, { color: color.textMuted }]}>{lat.toFixed(6)}, {lng.toFixed(6)}</Text> : null}
            </View>
          ) : (
            <Text style={[type.body, { color: color.textMuted }]}>Search your outlet or drag the map until the pin is on your exact location.</Text>
          )}
        </ScrollView>

        <Button title="Update address" size="lg" onPress={handleUpdateClick} disabled={updateOff} />
      </View>

      <BottomSheet visible={showSelectOptionDialog} onClose={closePopup} backdrop={color.overlay}>
        <SheetPanel
          title="Select an option"
          onClose={closePopup}
          right={
            <Press scale={0.9} onPress={() => setPopupCollapsed((v) => !v)} accessibilityLabel={popupCollapsed ? 'Expand' : 'Collapse'} style={styles.collapse}>
              {popupCollapsed ? <ChevronUp size={20} color={color.textSecondary} /> : <ChevronDown size={20} color={color.textSecondary} />}
            </Press>
          }
        >
          {popupCollapsed ? null : (
            <View style={{ padding: space.lg, paddingBottom: space.lg + insets.bottom }}>
              <OptionRow divider title="Update outlet address (FSSAI required)" body={previewText} selected={selectedOption === 'update_address'} onPress={() => setSelectedOption('update_address')} />
              <OptionRow title="Make a minor correction to the location pin" body="If the location pin on the map is slightly misplaced" selected={selectedOption === 'minor_correction'} onPress={() => setSelectedOption('minor_correction')} />
              <Button title="Proceed to update" size="lg" onPress={handleProceedUpdate} style={{ marginTop: space.xl }} />
            </View>
          )}
        </SheetPanel>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: { backgroundColor: color.surface, paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, zIndex: 100 },
  mapLoading: { ...StyleSheet.absoluteFill, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  pinWrap: { position: 'absolute', top: '36%', left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  pinTip: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radii.md, marginBottom: space.sm, maxWidth: 240, backgroundColor: color.primaryDeep, ...elevation.float },
  pinDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: color.primary, borderWidth: 3, borderColor: color.surface, ...elevation.float },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: space.lg, paddingTop: space.sm, marginTop: -space.xl, zIndex: 20, ...elevation.sheet },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.border, alignSelf: 'center', marginBottom: space.md },
  half: { width: '50%', paddingRight: space.sm },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border },
  optionOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  collapse: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
