import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import LocationSearchInput from '../components/LocationSearchInput';
import { useEditRestaurantAddress } from '../hooks/pages/useEditRestaurantAddress';
import { RT, RT_GRADIENT } from '../theme';

const SHEET_HEIGHT = 280;

function Info({ label, value, big }) {
  return (
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={big ? styles.infoBig : styles.infoValue}>{value}</Text>
    </View>
  );
}

function OptionRow({ title, body, selected, onPress, dashed }) {
  return (
    <Press scale={1} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.option, dashed ? { borderBottomWidth: 1, borderBottomColor: tw.gray300, borderStyle: 'dashed' } : null]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 4, ...poppins(600) }}>{title}</Text>
        {body ? <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) }}>{body}</Text> : null}
      </View>
      <LinearGradient colors={selected ? RT_GRADIENT : ['#fff', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.radio, { borderColor: selected ? RT.primary : tw.gray300 }]}>
        {selected ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} /> : null}
      </LinearGradient>
    </Press>
  );
}

/** Port of Food/pages/restaurant/EditRestaurantAddress.jsx (/food/restaurant/edit-address). */
export default function EditRestaurantAddress() {
  const insets = useSafeAreaInsets();
  const {
    goBackToEditOwner, mapInstanceRef, restaurantName, selectedLocation, loading, mapLoading, geocoding, showSelectOptionDialog,
    setShowSelectOptionDialog, selectedOption, setSelectedOption, lat, lng, hasMovedPin, handleRegionChangeComplete, handleMapReady,
    zoomToDelta, MAP_ZOOM, handleSearchLocationSelect, handleUpdateClick, handleProceedUpdate, previewText, simplifiedAddress,
  } = useEditRestaurantAddress();

  const updateOff = loading || mapLoading || geocoding;
  const delta = zoomToDelta(MAP_ZOOM);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Press onPress={goBackToEditOwner} accessibilityLabel="Go back" hitSlop={8} style={{ padding: 6 }}>
            <ArrowLeft size={24} color={RT.primary} />
          </Press>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text numberOfLines={1} style={styles.title} accessibilityRole="header">{restaurantName}</Text>
              <ChevronDown size={16} color={tw.gray900} />
            </View>
            <Text numberOfLines={1} style={{ fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) }}>{simplifiedAddress}</Text>
          </View>
        </View>
        <View style={{ marginTop: 12, zIndex: 110 }}>
          <LocationSearchInput label="" placeholder="Search area, street, landmark..." biasLocation={{ latitude: lat, longitude: lng }} onLocationSelect={handleSearchLocationSelect} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: SHEET_HEIGHT }}>
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
              <ActivityIndicator size="large" color={RT.primary} />
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray600, marginTop: 8, ...poppins(400) }}>Loading map...</Text>
            </View>
          ) : null}

          {/* Fixed pin: its tip sits at 36% of the map height, as on the web. */}
          <View pointerEvents="none" style={styles.pinWrap}>
            <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pinTip}>
              <Text style={{ fontSize: 12, lineHeight: 16, color: '#fff', textAlign: 'center', ...poppins(600) }}>Your outlet location</Text>
              <Text style={{ fontSize: 10, lineHeight: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', ...poppins(400) }}>Drag map or search above</Text>
            </LinearGradient>
            <View style={styles.pinDot} />
            <View style={{ width: 2, height: 12, backgroundColor: RT.primary }} />
          </View>
        </View>

        <View style={[styles.sheet, { height: SHEET_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
          <View style={styles.handle} />
          <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, marginBottom: 12, ...poppins(700) }}>Selected location</Text>

          {geocoding && hasMovedPin ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 16, minHeight: 148 }}>
              <ActivityIndicator size="small" color={RT.primary} />
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) }}>Fetching exact place details...</Text>
            </View>
          ) : selectedLocation ? (
            <View style={{ gap: 8, marginBottom: 16, minHeight: 148 }}>
              {selectedLocation.placeName || selectedLocation.addressLine1 ? <Info label="PLACE" value={selectedLocation.placeName || selectedLocation.addressLine1} big /> : null}
              {selectedLocation.addressLine2 ? <Info label="STREET" value={selectedLocation.addressLine2} /> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
                <View style={{ width: '50%' }}><Info label="AREA" value={selectedLocation.area || '—'} /></View>
                <View style={{ width: '50%' }}><Info label="CITY" value={selectedLocation.city || '—'} /></View>
                <View style={{ width: '50%' }}><Info label="PINCODE" value={selectedLocation.pincode || '—'} /></View>
                <View style={{ width: '50%' }}><Info label="STATE" value={selectedLocation.state || '—'} /></View>
              </View>
              {hasMovedPin ? (
                <Text style={{ fontSize: 11, lineHeight: 16, color: tw.gray400, paddingTop: 4, ...poppins(400) }}>{lat.toFixed(6)}, {lng.toFixed(6)}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, marginBottom: 16, ...poppins(400) }}>
              Search your outlet or drag the map until the pin is on your exact location.
            </Text>
          )}

          <View style={{ paddingBottom: 16 }}>
            <Press scale={0.98} disabled={updateOff} onPress={handleUpdateClick} accessibilityState={{ disabled: updateOff }} style={updateOff ? { opacity: 0.6 } : null}>
              <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cta, shadow('lg')]}>
                <Text style={{ fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) }}>Update Address</Text>
              </LinearGradient>
            </Press>
          </View>
        </View>
      </View>

      <BottomSheet visible={showSelectOptionDialog} onClose={() => setShowSelectOptionDialog(false)} panelStyle={styles.popup}>
        <View style={styles.popupHead}>
          <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(600) }}>Select an option</Text>
          <Press onPress={() => setShowSelectOptionDialog(false)} accessibilityLabel="Close" style={{ padding: 8, borderRadius: 999 }}>
            <ChevronDown size={24} color={tw.gray600} />
          </Press>
        </View>
        <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 + insets.bottom }}>
          <OptionRow dashed title="Update outlet address (FSSAI required)" body={previewText} selected={selectedOption === 'update_address'} onPress={() => setSelectedOption('update_address')} />
          <OptionRow title="Make a minor correction to the location pin" body="If location pin on the map is slightly misplaced" selected={selectedOption === 'minor_correction'} onPress={() => setSelectedOption('minor_correction')} />
          <Press scale={0.98} onPress={handleProceedUpdate} style={{ marginTop: 24 }}>
            <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cta, shadow('lg')]}>
              <Text style={{ fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) }}>Proceed to update</Text>
            </LinearGradient>
          </Press>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200, paddingHorizontal: 16, paddingBottom: 12, zIndex: 100 },
  title: { flexShrink: 1, fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  mapLoading: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  pinWrap: { position: 'absolute', top: '36%', left: 0, right: 0, alignItems: 'center', transform: [{ translateY: -100 }], zIndex: 10 },
  pinTip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 8, maxWidth: 220, ...shadow('lg') },
  pinDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: RT.primary, borderWidth: 3, borderColor: '#fff', ...shadow('lg') },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 20, zIndex: 20, elevation: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 30, shadowOffset: { width: 0, height: -8 } },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: tw.gray200, alignSelf: 'center', marginBottom: 16 },
  infoLabel: { fontSize: 10, lineHeight: 16, letterSpacing: 0.5, color: tw.gray500, ...poppins(700) },
  infoValue: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...poppins(400) },
  infoBig: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) },
  cta: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  popup: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  popupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  option: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 16 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
});
