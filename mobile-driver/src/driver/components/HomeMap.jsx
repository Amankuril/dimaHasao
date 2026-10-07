import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MAP_STYLE } from '../shared/live/mapStyle';
import { BACKEND_ORIGIN } from '../api/runtimeConfig';

/*
 * The map behind DriverHome (web: <GoogleMap center zoom=15 options={styles, disableDefaultUI, zoomControl:false,
 * clickableIcons:false}> with one 40x40 vehicle <Marker>). `panTo({ lat, lng })` is exposed through the ref.
 */
const ICONS = {
  bike: require('../../../assets/taxi/icons/bike.webp'),
  car: require('../../../assets/taxi/icons/car.webp'),
  auto: require('../../../assets/taxi/icons/auto.webp'),
  truck: require('../../../assets/taxi/icons/truck.webp'),
  ehcv: require('../../../assets/taxi/icons/ehcv.webp'),
  hcv: require('../../../assets/taxi/icons/hcv.webp'),
  lcv: require('../../../assets/taxi/icons/LCV.webp'),
  mcv: require('../../../assets/taxi/icons/mcv.webp'),
  luxury: require('../../../assets/taxi/icons/Luxury.webp'),
  premium: require('../../../assets/taxi/icons/Premium.webp'),
  suv: require('../../../assets/taxi/icons/SUV.webp'),
};

/** Web getMapIconForVehicle: an uploaded icon URL, else the bundled icon for the vehicle type. Returns an Image source. */
export const getMapIconForVehicle = (iconType = '') => {
  const raw = String(iconType || '').trim();
  if (/^(https?:|data:image\/|blob:)/.test(raw)) {
    return { uri: raw };
  }
  if (raw.startsWith('/')) {
    return { uri: `${BACKEND_ORIGIN}${raw}` };
  }
  if (/^(uploads\/|images\/)/.test(raw)) {
    return { uri: `${BACKEND_ORIGIN}/${raw}` };
  }

  const value = raw.toLowerCase();

  if (value.includes('bike')) return ICONS.bike;
  if (value.includes('auto')) return ICONS.auto;
  if (value.includes('ehc')) return ICONS.ehcv;
  if (value.includes('hcv')) return ICONS.hcv;
  if (value.includes('lcv')) return ICONS.lcv;
  if (value.includes('mcv')) return ICONS.mcv;
  if (value.includes('truck')) return ICONS.truck;
  if (value.includes('lux')) return ICONS.luxury;
  if (value.includes('premium')) return ICONS.premium;
  if (value.includes('suv')) return ICONS.suv;

  return ICONS.car;
};

/** react-native-maps draws a marker's children to a bitmap; stop re-rendering it once the icon has loaded (remounted per icon). */
function VehicleMarker({ position, iconSource }) {
  const [tracking, setTracking] = useState(true);
  const settle = () => setTimeout(() => setTracking(false), 200);
  return (
    <Marker coordinate={{ latitude: position.lat, longitude: position.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={tracking} tracksInfoWindowChanges={false}>
      <View style={styles.marker}>
        <Image source={iconSource} style={styles.markerImage} resizeMode="contain" onLoad={settle} onError={settle} />
      </View>
    </Marker>
  );
}

const HomeMap = forwardRef(function HomeMap({ position, iconSource }, ref) {
  const mapRef = useRef(null);

  useImperativeHandle(ref, () => ({
    panTo: (target) => {
      if (!target) return;
      mapRef.current?.animateCamera({ center: { latitude: target.lat, longitude: target.lng } }, { duration: 300 });
    },
  }), []);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFill}
      customMapStyle={MAP_STYLE}
      initialCamera={{ center: { latitude: position.lat, longitude: position.lng }, zoom: 15, heading: 0, pitch: 0 }}
      toolbarEnabled={false}
      zoomControlEnabled={false}
      showsCompass={false}
      showsMyLocationButton={false}
      rotateEnabled={false}
      pitchEnabled={false}
      moveOnMarkerPress={false}
    >
      <VehicleMarker key={JSON.stringify(iconSource)} position={position} iconSource={iconSource} />
    </MapView>
  );
});

const styles = StyleSheet.create({
  marker: { width: 40, height: 40 },
  markerImage: { width: 40, height: 40 },
});

export default HomeMap;
