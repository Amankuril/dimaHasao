import { Component, Fragment, useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../Img';
import { router } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Fa from '../Fa';
import { Press } from '../ui';
import { Dialog } from '../kit';
import { useBooking } from '../../context/BookingContext';
import { TRANSPORTS_DATA } from '../../data/dh/tourismData';
import { openExternal } from '../../lib/links';
import { poppins, shadow, tw, twClass } from '../../theme';

/** components/places/PlaceCard.jsx */
export function PlaceCard({ place }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: place.mainImage }} style={styles.cardImage} resizeMode="cover" accessibilityLabel={place.name} />
      </View>
      {place.insetImage ? (
        <View style={styles.inset}>
          <Image source={{ uri: place.insetImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
      ) : null}

      <View style={{ padding: 16, paddingTop: 40 }}>
        <Text style={styles.cardTitle}>
          {place.number}. {place.name}
        </Text>
        {place.subtitle ? <Text style={styles.cardSubtitle}>{place.subtitle}</Text> : null}
        <View style={styles.locRow}>
          <Fa name="fa-solid fa-location-dot" size={11} color="#CC1B21" />
          <Text style={styles.locText}>{place.location}</Text>
        </View>
        <Text style={styles.cardDesc} numberOfLines={3}>
          {place.description}
        </Text>
        <View style={styles.tags}>
          {place.tags?.map((tag, idx) => (
            <View key={idx} style={styles.tag}>
              <Fa name={tag.icon} size={12} color={twClass(tag.color, tw.emerald600)} />
              <Text style={styles.tagText}>{tag.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <Press scale={0.96} onPress={() => router.push(`/app/places/${place.id}`)} style={styles.explore} accessibilityLabel={`Explore ${place.name}`}>
          <Text style={styles.exploreText}>EXPLORE</Text>
          <Fa name="fa-solid fa-arrow-right" size={10} color="#fff" />
        </Press>
      </View>
    </View>
  );
}

/** components/places/GalleryViewer.jsx (also used with any { name, number, heroImage, gallery }). */
export function GalleryViewer({ place }) {
  const hero = place.heroImage || place.mainImage;
  const [selectedImage, setSelectedImage] = useState(hero);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const images = place.gallery && place.gallery.length > 0 ? [hero, ...place.gallery.filter((g) => g !== hero)] : [hero];

  return (
    <View>
      <View>
        <Press scale={1} onPress={() => setIsLightboxOpen(true)} accessibilityLabel={`${place.name}. View fullscreen`}>
          <Image source={{ uri: selectedImage }} style={styles.hero} resizeMode="cover" />
        </Press>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>
            {place.number}. {place.name}
          </Text>
        </View>
        <Press onPress={() => setIsLightboxOpen(true)} style={styles.expand} accessibilityLabel="View Fullscreen">
          <Fa name="fa-solid fa-expand" size={12} color="#fff" />
        </Press>
      </View>

      {images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10, gap: 10 }}>
          {images.map((img, idx) => {
            const isCurrent = selectedImage === img;
            return (
              <Press key={idx} scale={0.92} onPress={() => setSelectedImage(img)} style={[styles.thumb, isCurrent ? styles.thumbCurrent : { opacity: 0.7 }]} accessibilityLabel={`Thumbnail ${idx + 1}`}>
                <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </Press>
            );
          })}
        </ScrollView>
      ) : null}

      <Modal visible={isLightboxOpen} transparent animationType="fade" onRequestClose={() => setIsLightboxOpen(false)} statusBarTranslucent>
        <View style={styles.lightbox}>
          <Image source={{ uri: selectedImage }} style={styles.lightboxImg} resizeMode="contain" accessibilityLabel={place.name} />
          <Press onPress={() => setIsLightboxOpen(false)} style={styles.lightboxClose} accessibilityLabel="Close">
            <Fa name="fa-solid fa-xmark" size={18} color="#fff" />
          </Press>
        </View>
      </Modal>
    </View>
  );
}

// Same assumption SelectVehicle uses for its fallback ETA.
const AVERAGE_HILL_ROAD_SPEED_KMPH = 24;
const toRad = (deg) => (deg * Math.PI) / 180;
const haversineKm = (from, to) => {
  if (!from || !to || ![from.lat, from.lng, to.lat, to.lng].every(Number.isFinite)) return null;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};
const googleDirectionsUrl = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

class MapBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={[this.props.style, { alignItems: 'center', justifyContent: 'center', backgroundColor: tw.gray100 }]}>
          <Text style={{ fontSize: 12, color: tw.gray500, ...poppins(500) }}>Map unavailable</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/** A pinned, non-interactive map (web: the OpenStreetMap embed iframe). A map failure must not crash the page. */
export function PinMap(props) {
  return (
    <MapBoundary style={props.style}>
      <PinMapView {...props} />
    </MapBoundary>
  );
}

function PinMapView({ lat, lng, delta = 0.012, style, interactive = false }) {
  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={style}
      liteMode={!interactive}
      pointerEvents={interactive ? 'auto' : 'none'}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: delta * 2, longitudeDelta: delta * 2 }}
    >
      <Marker coordinate={{ latitude: lat, longitude: lng }} />
    </MapView>
  );
}

const TRANSPORT_TINT = {
  bike: { bg: tw.green100, fg: tw.green700 },
  auto: { bg: tw.amber100, fg: tw.amber700 },
  cab: { bg: tw.slate100, fg: tw.slate700 },
};

/** components/places/TransportSelector.jsx */
export function TransportSelector({ place }) {
  const { selectedTransportId, setSelectedTransportId, setSelectedPlaceId, pickupLocation } = useBooking();
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [liveCoords, setLiveCoords] = useState(null);
  const dest = place.coordinates;
  const hasDest = dest && Number.isFinite(dest.lat) && Number.isFinite(dest.lng);

  // Anchor "From" to where the visitor is when location is already allowed;
  // otherwise the district hub, exactly as the web falls back. This screen is
  // not the place that asks for the permission.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (!perm.granted) return;
        const pos = (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 })) || (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (!cancelled && pos) setLiveCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        /* keep the station fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const liveDistanceKm = hasDest ? haversineKm(liveCoords, dest) : null;
  const fromLabel = liveDistanceKm != null ? 'Your current location' : pickupLocation || 'Haflong Station';
  const distanceLabel = liveDistanceKm != null ? `${liveDistanceKm < 1 ? '< 1' : liveDistanceKm.toFixed(1)} km` : place.distanceFromStation;
  const travelTimeLabel =
    liveDistanceKm != null ? `${Math.max(1, Math.round((liveDistanceKm / AVERAGE_HILL_ROAD_SPEED_KMPH) * 60))} min (Approx.)` : place.travelTime;

  const handleSelect = (transportId) => {
    setSelectedTransportId(transportId);
    setSelectedPlaceId(place.id);
    router.navigate('/taxi/user');
  };

  return (
    <View style={styles.section}>
      <View style={[styles.rowGap, { marginBottom: 16 }]}>
        <Fa name="fa-solid fa-route" size={12} color={tw.emerald700} />
        <Text style={styles.sectionKicker}>HOW TO REACH</Text>
      </View>

      <View style={{ gap: 16 }}>
        <View style={styles.journey}>
          <View style={styles.pinFrom} />
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.journeyLabel}>FROM</Text>
            <Text style={styles.journeyValue}>{fromLabel}</Text>
          </View>
          <View style={styles.pinTo}>
            <Fa name="fa-solid fa-location-dot" size={12} color={tw.red500} />
          </View>
          <View>
            <Text style={styles.journeyLabel}>TO</Text>
            <Text style={styles.journeyValue}>{place.name}</Text>
            <Text style={styles.journeyMeta}>
              {distanceLabel} away{travelTimeLabel ? ` · ${travelTimeLabel}` : ''}
            </Text>
          </View>
        </View>

        <View>
          <Text style={styles.optionsLabel}>TRANSPORT OPTIONS</Text>
          <View style={{ gap: 8 }}>
            {TRANSPORTS_DATA.map((t, idx) => {
              const isSelected = selectedTransportId === t.id;
              const tint = TRANSPORT_TINT[t.id] || TRANSPORT_TINT.cab;
              return (
                <Fragment key={t.id}>
                  <View style={[styles.option, isSelected && styles.optionSelected]}>
                    <View style={styles.rowGap12}>
                      <View style={[styles.optionIcon, { backgroundColor: tint.bg }]}>
                        <Fa name={t.iconClass} size={16} color={tint.fg} />
                      </View>
                      <View>
                        <Text style={styles.optionName}>{t.name}</Text>
                        <Text style={styles.optionTime}>{t.time}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.mrp}>MRP</Text>
                      <Text style={styles.optionName}>{t.fareFormatted}</Text>
                    </View>
                    <Press scale={0.92} onPress={() => handleSelect(t.id)} style={[styles.selectBtn, isSelected && { backgroundColor: '#0A3A22' }]}>
                      <Text style={styles.selectBtnText}>{isSelected ? 'Book' : 'Select'}</Text>
                    </Press>
                  </View>
                  {idx < TRANSPORTS_DATA.length - 1 ? <View style={styles.hr} /> : null}
                </Fragment>
              );
            })}
          </View>
        </View>

        <View style={{ paddingTop: 8 }}>
          {hasDest ? (
            <Press scale={0.99} onPress={() => setIsMapModalOpen(true)} style={styles.mapThumb} accessibilityLabel="View Route Map">
              <PinMap lat={dest.lat} lng={dest.lng} style={StyleSheet.absoluteFill} />
              <View style={styles.mapOverlay}>
                <View style={styles.mapPill}>
                  <Fa name="fa-solid fa-map-location-dot" size={12} color={tw.emerald700} />
                  <Text style={styles.mapPillText}>View Route Map</Text>
                </View>
              </View>
            </Press>
          ) : (
            <View style={styles.mapEmpty}>
              <Fa name="fa-solid fa-map-location-dot" size={18} color={tw.gray300} />
              <Text style={styles.mapEmptyText}>Location not pinned yet — the admin hasn&apos;t set map coordinates for {place.name}</Text>
            </View>
          )}
        </View>
      </View>

      <Dialog visible={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} backdrop="rgba(0,0,0,0.7)" panelStyle={styles.mapModal}>
        <View style={styles.mapModalHead}>
          <Text style={styles.mapModalTitle}>
            Route Map: {fromLabel} to {place.name}
          </Text>
          <Press onPress={() => setIsMapModalOpen(false)} style={styles.mapModalClose} accessibilityLabel="Close">
            <Fa name="fa-solid fa-xmark" size={12} color={tw.gray600} />
          </Press>
        </View>
        <View style={styles.mapModalMap}>
          {hasDest && isMapModalOpen ? (
            <PinMap lat={dest.lat} lng={dest.lng} delta={0.006} style={StyleSheet.absoluteFill} interactive />
          ) : (
            <Text style={styles.mapUnavailable}>Map unavailable</Text>
          )}
        </View>
        <View style={styles.mapStats}>
          <Text style={styles.mapStat}>
            Distance: <Text style={poppins(700)}>{distanceLabel}</Text>
          </Text>
          <Text style={styles.mapStat}>
            Est. Time: <Text style={poppins(700)}>{travelTimeLabel}</Text>
          </Text>
        </View>
        {hasDest ? (
          <Press onPress={() => openExternal(googleDirectionsUrl(dest.lat, dest.lng))} style={styles.directions}>
            <Fa name="fa-solid fa-diamond-turn-right" size={12} color={tw.emerald800} />
            <Text style={styles.directionsText}>Get Directions</Text>
          </Press>
        ) : null}
        <Press
          onPress={() => {
            setIsMapModalOpen(false);
            router.navigate('/taxi/user');
          }}
          style={styles.proceed}
        >
          <Text style={styles.proceedText}>Proceed to Book Ride</Text>
        </Press>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,214,167,0.8)', paddingBottom: 16, ...shadow('md') },
  cardImageWrap: { height: 240, width: '100%', overflow: 'hidden', backgroundColor: tw.gray100, borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  cardImage: { width: '100%', height: '100%' },
  inset: { position: 'absolute', top: 240 - 80 + 28, right: 16, width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', overflow: 'hidden', backgroundColor: '#fff', zIndex: 10, ...shadow('lg') },
  cardTitle: { fontSize: 16, lineHeight: 24, letterSpacing: 0.4, color: '#0A3A2A', marginBottom: 2, ...poppins(700) },
  cardSubtitle: { fontSize: 12, lineHeight: 16.5, color: '#CC1B21', marginBottom: 6, ...poppins(700) },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  locText: { fontSize: 11, lineHeight: 16.5, color: tw.gray600, ...poppins(500) },
  cardDesc: { fontSize: 12, lineHeight: 19.5, color: tw.gray700, marginBottom: 14, ...poppins(400) },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tw.gray50, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: tw.gray100 },
  tagText: { fontSize: 10, lineHeight: 15, color: tw.gray600, ...poppins(500) },
  explore: { backgroundColor: '#0A3A2A', borderRadius: 999, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow('md') },
  exploreText: { color: '#fff', fontSize: 12, lineHeight: 16, letterSpacing: 0.6, ...poppins(700) },

  hero: { width: '100%', height: 256, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, backgroundColor: tw.gray200 },
  heroBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: tw.amber300, ...shadow('md') },
  heroBadgeText: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  expand: { position: 'absolute', bottom: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', opacity: 0.8 },
  thumb: { width: 72, height: 72, borderRadius: 12, borderWidth: 2, borderColor: '#fff', overflow: 'hidden', ...shadow('xs') },
  thumbCurrent: { borderColor: tw.amber500, transform: [{ scale: 1.05 }] },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  lightboxImg: { width: '100%', height: '85%', borderRadius: 16 },
  lightboxClose: { position: 'absolute', top: 48, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowGap12: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sectionKicker: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.gray800, ...poppins(700) },
  journey: { borderLeftWidth: 2, borderStyle: 'dashed', borderLeftColor: tw.emerald300, marginLeft: 8, paddingLeft: 16, paddingVertical: 4 },
  pinFrom: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: tw.blue500, left: -7, top: 6 },
  pinTo: { position: 'absolute', width: 14, height: 14, left: -8, bottom: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  journeyLabel: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.225, color: tw.gray400, ...poppins(700) },
  journeyValue: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(600) },
  journeyMeta: { fontSize: 10, lineHeight: 15, color: tw.emerald700, ...poppins(500) },
  optionsLabel: { fontSize: 10, lineHeight: 15, color: tw.gray400, marginBottom: 8, ...poppins(700) },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  optionSelected: { backgroundColor: 'rgba(236,253,245,0.9)', borderColor: tw.emerald300 },
  optionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  optionName: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  optionTime: { fontSize: 10, lineHeight: 15, color: tw.gray500, ...poppins(400) },
  mrp: { fontSize: 9, lineHeight: 13.5, color: tw.gray400, ...poppins(600) },
  selectBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#0B2E13' },
  selectBtnText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(600) },
  hr: { height: 1, backgroundColor: tw.gray100, marginVertical: 2 },
  mapThumb: { height: 128, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: tw.gray200, backgroundColor: tw.gray200 },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  mapPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, ...shadow('md') },
  mapPillText: { fontSize: 12, lineHeight: 16, color: tw.gray800, ...poppins(600) },
  mapEmpty: { height: 128, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 16 },
  mapEmptyText: { fontSize: 10, lineHeight: 15, color: tw.gray400, textAlign: 'center', ...poppins(500) },
  mapModal: { width: '100%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: tw.emerald100, ...shadow('2xl') },
  mapModalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 },
  mapModalTitle: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  mapModalClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  mapModalMap: { height: 256, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: tw.gray200, marginBottom: 16, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center' },
  mapUnavailable: { fontSize: 12, color: tw.gray400, ...poppins(400) },
  mapStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: tw.emerald50, padding: 10, borderRadius: 12, marginBottom: 16 },
  mapStat: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(500) },
  directions: { marginBottom: 8, paddingVertical: 10, borderWidth: 1, borderColor: tw.emerald700, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  directionsText: { fontSize: 12, lineHeight: 16, color: tw.emerald800, ...poppins(700) },
  proceed: { paddingVertical: 10, borderRadius: 12, backgroundColor: '#0A3A22', alignItems: 'center', ...shadow('sm') },
  proceedText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(700) },
});
