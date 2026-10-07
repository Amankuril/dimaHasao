import { Component, Fragment, useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../Img';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Fa from '../Fa';
import { Press } from '../ui';
import { Dialog } from '../kit';
import { useBooking } from '../../context/BookingContext';
import { TRANSPORTS_DATA } from '../../data/dh/tourismData';
import { openExternal } from '../../lib/links';
import { Button, IconButton, fa } from '../ds';
import { color, elevation, radii, space, tone, type } from '../../theme';

/** components/places/PlaceCard.jsx */
export function PlaceCard({ place }) {
  const open = () => router.push(`/app/places/${place.id}`);
  return (
    <View style={styles.card}>
      <Press scale={1} onPress={open} accessibilityLabel={`${place.name}, ${place.location}`} style={styles.cardImageWrap}>
        <Image source={{ uri: place.mainImage }} style={styles.cardImage} resizeMode="cover" accessibilityLabel={place.name} />
      </Press>
      <View style={styles.cardBody}>
        {place.insetImage ? (
          <View style={styles.inset} pointerEvents="none">
            <Image source={{ uri: place.insetImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
        ) : null}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {place.number}. {place.name}
        </Text>
        {place.subtitle ? (
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {place.subtitle}
          </Text>
        ) : null}
        <View style={styles.locRow}>
          <Fa name="fa-solid fa-location-dot" size={14} color={color.primary} />
          <Text style={styles.locText} numberOfLines={2}>
            {place.location}
          </Text>
        </View>
        <Text style={styles.cardDesc} numberOfLines={3}>
          {place.description}
        </Text>
        {place.tags?.length ? (
          <View style={styles.tags}>
            {place.tags.map((tag, idx) => (
              <View key={idx} style={styles.tag}>
                <Fa name={tag.icon} size={14} color={color.primary} />
                <Text style={styles.tagText}>{tag.text}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Button title="Explore" variant="secondary" iconRight={fa('fa-solid fa-arrow-right')} onPress={open} accessibilityLabel={`Explore ${place.name}`} />
      </View>
    </View>
  );
}

/** components/places/GalleryViewer.jsx (also used with any { name, number, heroImage, gallery }). */
export function GalleryViewer({ place }) {
  const insets = useSafeAreaInsets();
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
        <View style={styles.heroBadge} pointerEvents="none">
          <Fa name="fa-solid fa-leaf" size={12} color={color.gold} />
          <Text style={styles.heroBadgeText} numberOfLines={1}>
            {place.number}. {place.name}
          </Text>
        </View>
        <Press onPress={() => setIsLightboxOpen(true)} style={styles.expand} accessibilityLabel="View Fullscreen">
          <Fa name="fa-solid fa-expand" size={16} color={color.textInverse} />
        </Press>
      </View>

      {images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xs, gap: space.sm }}>
          {images.map((img, idx) => {
            const isCurrent = selectedImage === img;
            return (
              <Press key={idx} scale={0.92} onPress={() => setSelectedImage(img)} style={[styles.thumb, isCurrent ? styles.thumbCurrent : { opacity: 0.75 }]} accessibilityLabel={`Photo ${idx + 1} of ${images.length}`} accessibilityState={{ selected: isCurrent }}>
                <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </Press>
            );
          })}
        </ScrollView>
      ) : null}

      <Modal visible={isLightboxOpen} transparent animationType="fade" onRequestClose={() => setIsLightboxOpen(false)} statusBarTranslucent>
        <View style={styles.lightbox}>
          <Image source={{ uri: selectedImage }} style={styles.lightboxImg} resizeMode="contain" accessibilityLabel={place.name} />
          <IconButton icon={fa('fa-solid fa-xmark')} label="Close" variant="inverse" onPress={() => setIsLightboxOpen(false)} style={[styles.lightboxClose, { top: insets.top + space.md }]} />
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
        <View style={[this.props.style, { alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceMuted }]}>
          <Text style={{ ...type.caption, color: color.textMuted }}>Map unavailable</Text>
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

const TRANSPORT_TINT = { bike: tone.primary, auto: tone.gold, cab: tone.neutral };

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
      <View style={[styles.rowGap, { marginBottom: space.lg }]}>
        <Fa name="fa-solid fa-route" size={16} color={color.primary} />
        <Text style={styles.sectionTitle} accessibilityRole="header">
          How to reach
        </Text>
      </View>

      <View style={{ gap: space.lg }}>
        <View style={styles.journey}>
          <View style={styles.pinFrom} />
          <View style={{ marginBottom: space.lg }}>
            <Text style={styles.journeyLabel}>From</Text>
            <Text style={styles.journeyValue} numberOfLines={2}>
              {fromLabel}
            </Text>
          </View>
          <View style={styles.pinTo}>
            <Fa name="fa-solid fa-location-dot" size={14} color={color.danger} />
          </View>
          <View>
            <Text style={styles.journeyLabel}>To</Text>
            <Text style={styles.journeyValue} numberOfLines={2}>
              {place.name}
            </Text>
            <Text style={styles.journeyMeta}>
              {distanceLabel} away{travelTimeLabel ? ` · ${travelTimeLabel}` : ''}
            </Text>
          </View>
        </View>

        <View>
          <Text style={styles.optionsLabel}>Transport options</Text>
          <View>
            {TRANSPORTS_DATA.map((t, idx) => {
              const isSelected = selectedTransportId === t.id;
              const tint = TRANSPORT_TINT[t.id] || TRANSPORT_TINT.cab;
              return (
                <Fragment key={t.id}>
                  <View style={[styles.option, isSelected && styles.optionSelected]}>
                    <View style={[styles.optionIcon, { backgroundColor: tint.bg }]}>
                      <Fa name={t.iconClass} size={18} color={tint.fg} />
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionName} numberOfLines={1}>
                        {t.name}
                      </Text>
                      <Text style={styles.optionTime} numberOfLines={1}>
                        {t.time}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.mrp}>MRP</Text>
                      <Text style={styles.optionFare}>{t.fareFormatted}</Text>
                    </View>
                    <Button
                      title={isSelected ? 'Book' : 'Select'}
                      variant={isSelected ? 'primary' : 'secondary'}
                      size="sm"
                      fullWidth={false}
                      onPress={() => handleSelect(t.id)}
                      accessibilityLabel={`${isSelected ? 'Book' : 'Select'} ${t.name}, ${t.fareFormatted}`}
                      style={styles.selectBtn}
                    />
                  </View>
                  {idx < TRANSPORTS_DATA.length - 1 ? <View style={styles.hr} /> : null}
                </Fragment>
              );
            })}
          </View>
        </View>

        <View>
          {hasDest ? (
            <Press scale={0.99} onPress={() => setIsMapModalOpen(true)} style={styles.mapThumb} accessibilityLabel="View Route Map">
              <PinMap lat={dest.lat} lng={dest.lng} style={StyleSheet.absoluteFill} />
              <View style={styles.mapOverlay}>
                <View style={styles.mapPill}>
                  <Fa name="fa-solid fa-map-location-dot" size={14} color={color.primary} />
                  <Text style={styles.mapPillText}>View route map</Text>
                </View>
              </View>
            </Press>
          ) : (
            <View style={styles.mapEmpty}>
              <Fa name="fa-solid fa-map-location-dot" size={22} color={color.textDisabled} />
              <Text style={styles.mapEmptyText}>Location not pinned yet. The admin hasn&apos;t set map coordinates for {place.name}.</Text>
            </View>
          )}
        </View>
      </View>

      <Dialog visible={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} backdrop={color.overlay} panelStyle={styles.mapModal}>
        <View style={styles.mapModalHead}>
          <Text style={styles.mapModalTitle} accessibilityRole="header">
            Route map: {fromLabel} to {place.name}
          </Text>
          <IconButton icon={fa('fa-solid fa-xmark')} label="Close" variant="soft" size={40} iconSize={16} onPress={() => setIsMapModalOpen(false)} />
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
            Distance: <Text style={styles.mapStatStrong}>{distanceLabel}</Text>
          </Text>
          <Text style={styles.mapStat}>
            Est. time: <Text style={styles.mapStatStrong}>{travelTimeLabel}</Text>
          </Text>
        </View>
        <View style={{ gap: space.sm }}>
          {hasDest ? (
            <Button title="Get directions" variant="outline" icon={fa('fa-solid fa-diamond-turn-right')} onPress={() => openExternal(googleDirectionsUrl(dest.lat, dest.lng))} />
          ) : null}
          <Button
            title="Proceed to book ride"
            onPress={() => {
              setIsMapModalOpen(false);
              router.navigate('/taxi/user');
            }}
          />
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, ...elevation.card },
  cardImageWrap: { aspectRatio: 16 / 10, width: '100%', overflow: 'hidden', backgroundColor: color.surfaceMuted, borderTopLeftRadius: radii.lg - 1, borderTopRightRadius: radii.lg - 1 },
  cardImage: { width: '100%', height: '100%' },
  inset: { position: 'absolute', top: -40, right: space.lg, width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: color.surface, overflow: 'hidden', backgroundColor: color.surfaceMuted, zIndex: 10, ...elevation.card },
  cardBody: { padding: space.lg, paddingTop: space.xl, gap: space.xs + 2 },
  cardTitle: { ...type.heading, color: color.primary, paddingRight: 80 },
  cardSubtitle: { ...type.label, color: color.goldText },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  locText: { flex: 1, ...type.small, color: color.textSecondary },
  cardDesc: { ...type.small, color: color.textSecondary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs, marginBottom: space.sm },
  tag: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, backgroundColor: color.surfaceMuted, paddingHorizontal: space.sm + 2, height: 30, borderRadius: radii.pill },
  tagText: { ...type.caption, color: color.text },

  hero: { width: '100%', aspectRatio: 4 / 3, maxHeight: 320, borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl, backgroundColor: color.surfaceMuted },
  heroBadge: {
    position: 'absolute', top: space.lg, left: space.lg, maxWidth: '78%', flexDirection: 'row', alignItems: 'center', gap: space.xs + 2,
    backgroundColor: 'rgba(6,44,22,0.85)', paddingHorizontal: space.md, height: 32, borderRadius: radii.pill, borderWidth: 1, borderColor: color.gold,
  },
  heroBadgeText: { ...type.label, color: color.goldOnDark, flexShrink: 1 },
  expand: { position: 'absolute', bottom: space.md, right: space.md, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(6,28,14,0.6)', alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 72, height: 72, borderRadius: radii.md, borderWidth: 2, borderColor: color.surface, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  thumbCurrent: { borderColor: color.gold },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: space.lg },
  lightboxImg: { width: '100%', height: '85%', borderRadius: radii.lg },
  lightboxClose: { position: 'absolute', right: space.lg },

  section: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.lg, borderWidth: 1, borderColor: color.border, ...elevation.card },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sectionTitle: { ...type.subheading, color: color.text },
  journey: { borderLeftWidth: 2, borderStyle: 'dashed', borderLeftColor: color.primaryBorder, marginLeft: space.sm, paddingLeft: space.lg, paddingVertical: space.xs },
  pinFrom: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: color.info, left: -7, top: 8 },
  pinTo: { position: 'absolute', width: 16, height: 16, left: -9, bottom: 24, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  journeyLabel: { ...type.overline, color: color.textMuted },
  journeyValue: { ...type.bodyStrong, color: color.text },
  journeyMeta: { ...type.caption, color: color.primary },
  optionsLabel: { ...type.overline, color: color.textMuted, marginBottom: space.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radii.md, borderWidth: 1, borderColor: 'transparent' },
  optionSelected: { backgroundColor: color.primarySoft, borderColor: color.primaryBorder },
  optionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, minWidth: 0 },
  optionName: { ...type.bodyStrong, color: color.text },
  optionTime: { ...type.caption, color: color.textMuted },
  optionFare: { ...type.bodyStrong, color: color.text },
  mrp: { ...type.caption, color: color.textMuted },
  selectBtn: { height: 40, minWidth: 72 },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: color.border, marginVertical: 2 },
  mapThumb: { height: 136, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted },
  mapOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  mapPill: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.surface, paddingHorizontal: space.lg, height: 40, borderRadius: radii.pill, ...elevation.float },
  mapPillText: { ...type.label, color: color.text },
  mapEmpty: { minHeight: 128, borderRadius: radii.md, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.lg },
  mapEmptyText: { ...type.small, color: color.textMuted, textAlign: 'center' },
  mapModal: { width: '100%', maxWidth: 400, backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xl, borderWidth: 1, borderColor: color.border, ...elevation.float },
  mapModalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  mapModalTitle: { flex: 1, ...type.subheading, color: color.text },
  mapModalMap: { height: 256, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: color.border, marginBottom: space.lg, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  mapUnavailable: { ...type.small, color: color.textMuted },
  mapStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm, backgroundColor: color.primarySoft, padding: space.md, borderRadius: radii.md, marginBottom: space.lg },
  mapStat: { ...type.small, color: color.textSecondary },
  mapStatStrong: { ...type.bodyStrong, color: color.text },
});
