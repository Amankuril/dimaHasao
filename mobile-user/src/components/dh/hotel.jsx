import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../Img';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../Fa';
import { Press } from '../ui';
import { useBooking } from '../../context/BookingContext';
import { Button, IconButton, StatusBadge, fa } from '../ds';
import { color, elevation, radii, space, type } from '../../theme';

/** components/hotel/HotelCard.jsx */
export function HotelCard({ hotel }) {
  const { favoriteHotels, toggleFavoriteHotel } = useBooking();
  const isFavorite = favoriteHotels?.includes(hotel.id);
  const open = () => router.push(`/app/hotels/${hotel.id}`);
  const label = `${hotel.name}, ${hotel.location}. Rated ${hotel.rating}. From ₹${hotel.startingPrice.toLocaleString('en-IN')} per night. View rooms`;

  // The photo and the body are sibling buttons so the heart is never nested inside one.
  return (
    <View style={styles.card}>
      <View style={styles.cardImageWrap}>
        <Press scale={1} onPress={open} style={StyleSheet.absoluteFill} accessibilityLabel={label}>
          <Image source={{ uri: hotel.heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(6,28,14,0.75)']} style={StyleSheet.absoluteFill} />
        </Press>

        <View style={styles.badges} pointerEvents="none">
          <StatusBadge label={hotel.type} tone="primary" style={styles.typeBadge} />
          {hotel.badge ? <StatusBadge label={hotel.badge} tone="gold" icon={fa('fa-solid fa-star')} /> : null}
        </View>

        <IconButton
          icon={fa('fa-solid fa-heart')}
          label={isFavorite ? 'Remove from saved' : 'Save hotel'}
          onPress={() => toggleFavoriteHotel(hotel.id)}
          variant="soft"
          iconSize={18}
          iconColor={isFavorite ? color.danger : color.textMuted}
          style={styles.fav}
        />

        <View style={styles.imageFoot} pointerEvents="none">
          <View style={[styles.row, { gap: space.xs + 2, flexShrink: 1 }]}>
            <Fa name="fa-solid fa-location-dot" size={14} color={color.goldOnDark} />
            <Text style={styles.imageLoc} numberOfLines={1}>
              {hotel.location}
            </Text>
          </View>
          {hotel.distanceFromStation ? <Text style={styles.distance}>{hotel.distanceFromStation} from station</Text> : null}
        </View>
      </View>

      <Press scale={0.99} onPress={open} style={styles.cardBody} accessibilityLabel={label}>
        <View style={{ gap: space.xs + 2 }}>
          <View style={[styles.row, { justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' }]}>
            <View style={[styles.row, { gap: space.sm }]}>
              <View style={styles.rating}>
                <Text style={styles.ratingText}>{hotel.rating}</Text>
                <Fa name="fa-solid fa-star" size={12} color={color.goldOnDark} />
              </View>
              <Text style={styles.reviews}>({hotel.reviewCount} reviews)</Text>
            </View>
            <StatusBadge label="Free cancellation" tone="success" icon={fa('fa-solid fa-circle-check')} />
          </View>

          <Text style={styles.name} numberOfLines={2}>
            {hotel.name}
          </Text>

          <View style={styles.amenities}>
            {hotel.amenities.slice(0, 3).map((am) => (
              <View key={am.id} style={styles.amenity}>
                <Fa name={am.icon} size={12} color={color.primary} />
                <Text style={styles.amenityText}>{am.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.cardFoot}>
          <View style={{ flexShrink: 1 }}>
            <View style={[styles.row, { alignItems: 'baseline', gap: space.sm }]}>
              <Text style={styles.price}>₹{hotel.startingPrice.toLocaleString('en-IN')}</Text>
              {hotel.originalPrice ? <Text style={styles.strike}>₹{hotel.originalPrice.toLocaleString('en-IN')}</Text> : null}
            </View>
            <Text style={styles.priceNote}>per room / night + taxes</Text>
          </View>
          <View style={styles.viewRooms}>
            <Text style={styles.viewRoomsText}>View rooms</Text>
            <Fa name="fa-solid fa-arrow-right" size={14} color={color.onPrimary} />
          </View>
        </View>
      </Press>
    </View>
  );
}

/** components/hotel/HotelGallery.jsx */
export function HotelGallery({ images = [], hotelName = 'Hotel' }) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  if (!images || images.length === 0) return null;

  const prev = () => setActiveIndex((p) => (p === 0 ? images.length - 1 : p - 1));
  const next = () => setActiveIndex((p) => (p === images.length - 1 ? 0 : p + 1));

  return (
    <View>
      <View style={styles.galleryMain}>
        <Press scale={1} onPress={() => setIsFullscreen(true)} style={StyleSheet.absoluteFill} accessibilityLabel={`${hotelName} photo ${activeIndex + 1}. View fullscreen`}>
          <Image source={{ uri: images[activeIndex] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFill} />
        </Press>

        <View style={styles.counter} pointerEvents="none">
          <Fa name="fa-solid fa-camera" size={12} color={color.goldOnDark} />
          <Text style={styles.counterText}>
            {activeIndex + 1} / {images.length}
          </Text>
        </View>

        <Press onPress={() => setIsFullscreen(true)} style={styles.expand} accessibilityLabel="View Fullscreen">
          <Fa name="fa-solid fa-expand" size={16} color={color.textInverse} />
        </Press>

        {images.length > 1 ? (
          <>
            <Press onPress={prev} style={[styles.chevron, { left: space.sm }]} accessibilityLabel="Previous image">
              <Fa name="fa-solid fa-chevron-left" size={16} color={color.textInverse} />
            </Press>
            <Press onPress={next} style={[styles.chevron, { right: space.sm }]} accessibilityLabel="Next image">
              <Fa name="fa-solid fa-chevron-right" size={16} color={color.textInverse} />
            </Press>
          </>
        ) : null}
      </View>

      {images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbStrip} contentContainerStyle={{ gap: space.sm, padding: space.sm, paddingHorizontal: space.lg }}>
          {images.map((img, idx) => (
            <Press key={idx} scale={0.96} onPress={() => setActiveIndex(idx)} style={[styles.thumb, idx === activeIndex ? { borderColor: color.gold } : { opacity: 0.75 }]} accessibilityLabel={`Photo ${idx + 1} of ${images.length}`} accessibilityState={{ selected: idx === activeIndex }}>
              <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </Press>
          ))}
        </ScrollView>
      ) : null}

      <Modal visible={isFullscreen} transparent animationType="fade" onRequestClose={() => setIsFullscreen(false)} statusBarTranslucent>
        <View style={[styles.lightbox, { paddingTop: space.lg + insets.top, paddingBottom: space.lg + insets.bottom }]}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={styles.lightboxTitle} numberOfLines={1}>
              {hotelName} ({activeIndex + 1} of {images.length})
            </Text>
            <IconButton icon={fa('fa-solid fa-xmark')} label="Close" variant="inverse" onPress={() => setIsFullscreen(false)} />
          </View>

          <View style={styles.lightboxStage}>
            <Image source={{ uri: images[activeIndex] }} style={{ width: '100%', height: '100%', borderRadius: radii.sm }} resizeMode="contain" />
            {images.length > 1 ? (
              <>
                <Press onPress={prev} style={[styles.lightboxChevron, { left: space.sm }]} accessibilityLabel="Previous image">
                  <Fa name="fa-solid fa-chevron-left" size={18} color={color.textInverse} />
                </Press>
                <Press onPress={next} style={[styles.lightboxChevron, { right: space.sm }]} accessibilityLabel="Next image">
                  <Fa name="fa-solid fa-chevron-right" size={18} color={color.textInverse} />
                </Press>
              </>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.sm, paddingVertical: space.sm, flexGrow: 1, justifyContent: 'center' }}>
            {images.map((img, idx) => (
              <Press key={idx} scale={0.96} onPress={() => setActiveIndex(idx)} style={[styles.lightboxThumb, idx === activeIndex ? { borderColor: color.gold } : { opacity: 0.5 }]} accessibilityLabel={`Photo ${idx + 1} of ${images.length}`} accessibilityState={{ selected: idx === activeIndex }}>
                <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </Press>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/** components/hotel/RoomCard.jsx */
export function RoomCard({ room, isSelected = false, onSelect }) {
  return (
    <View style={[styles.room, isSelected ? styles.roomSelected : null]}>
      <View style={styles.roomImageWrap}>
        <Image source={{ uri: room.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.2)', 'transparent', 'rgba(6,28,14,0.7)']} style={StyleSheet.absoluteFill} />
        <View style={styles.roomBadges}>
          {room.isPopular ? <StatusBadge label="Most popular" tone="gold" icon={fa('fa-solid fa-star')} /> : <View />}
          <StatusBadge label={`${room.availableRooms} rooms left`} tone={room.availableRooms <= 2 ? 'warning' : 'neutral'} />
        </View>
        <Text style={styles.roomSpec} numberOfLines={1}>
          {room.size} • {room.bedType}
        </Text>
      </View>

      <View style={{ padding: space.lg, gap: space.md }}>
        <View style={{ gap: space.sm }}>
          <View style={[styles.row, { justifyContent: 'space-between', gap: space.sm, alignItems: 'flex-start' }]}>
            <Text style={[styles.name, { flex: 1, minWidth: 0 }]}>{room.name}</Text>
            <StatusBadge label={`Max ${room.maxGuests} guests`} tone="primary" icon={fa('fa-solid fa-user-group')} />
          </View>
          <View style={styles.roomAmenities}>
            {room.amenities.map((am, idx) => (
              <View key={idx} style={styles.roomAmenity}>
                <Fa name="fa-solid fa-circle-check" size={12} color={color.primary} />
                <Text style={styles.roomAmenityText} numberOfLines={1}>
                  {am}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.cardFoot}>
          <View style={{ flexShrink: 1 }}>
            <View style={[styles.row, { alignItems: 'baseline', gap: space.sm }]}>
              <Text style={styles.price}>₹{room.price.toLocaleString('en-IN')}</Text>
              {room.originalPrice ? <Text style={styles.strike}>₹{room.originalPrice.toLocaleString('en-IN')}</Text> : null}
            </View>
            <Text style={styles.priceNote}>per night + ₹{Math.round(room.price * 0.12)} tax</Text>
          </View>
          <Button
            title={isSelected ? 'Selected' : 'Select room'}
            variant={isSelected ? 'primary' : 'secondary'}
            icon={isSelected ? fa('fa-solid fa-check') : undefined}
            fullWidth={false}
            onPress={() => onSelect(room)}
            accessibilityLabel={`${isSelected ? 'Selected' : 'Select'} ${room.name}`}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { backgroundColor: color.surface, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: color.border, ...elevation.card },
  cardImageWrap: { aspectRatio: 16 / 9, backgroundColor: color.surfaceMuted },
  cardBody: { padding: space.lg, gap: space.md },
  badges: { position: 'absolute', top: space.md, left: space.md, right: 64, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, flexWrap: 'wrap' },
  typeBadge: { backgroundColor: color.surface },
  fav: { position: 'absolute', top: space.sm, right: space.sm, backgroundColor: 'rgba(255,255,255,0.92)' },
  imageFoot: { position: 'absolute', bottom: space.sm, left: space.md, right: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  imageLoc: { ...type.label, color: color.textInverse, flexShrink: 1 },
  distance: { ...type.caption, color: color.textInverse, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radii.sm, overflow: 'hidden' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: color.primary, paddingHorizontal: space.sm, height: 24, borderRadius: radii.sm },
  ratingText: { ...type.label, color: color.onPrimary },
  reviews: { ...type.caption, color: color.textMuted },
  name: { ...type.subheading, color: color.text },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  amenity: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, backgroundColor: color.surfaceMuted, paddingHorizontal: space.sm + 2, height: 28, borderRadius: radii.pill },
  amenityText: { ...type.caption, color: color.text },
  cardFoot: { paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  price: { ...type.price, color: color.text },
  strike: { ...type.small, color: color.textMuted, textDecorationLine: 'line-through' },
  priceNote: { ...type.caption, color: color.textMuted },
  viewRooms: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.primary, paddingHorizontal: space.lg, height: 44, borderRadius: radii.md },
  viewRoomsText: { ...type.buttonSm, color: color.onPrimary },

  galleryMain: { aspectRatio: 4 / 3, maxHeight: 300, backgroundColor: color.primaryDeep },
  counter: { position: 'absolute', bottom: space.md, right: space.md, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: space.sm + 2, height: 28, borderRadius: radii.pill },
  counterText: { ...type.caption, color: color.textInverse },
  expand: { position: 'absolute', top: space.sm, right: space.sm, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  chevron: { position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  thumbStrip: { flexGrow: 0, backgroundColor: color.bg, borderBottomWidth: 1, borderBottomColor: color.border },
  thumb: { height: 56, width: 80, borderRadius: radii.sm, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', backgroundColor: color.surfaceMuted },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', paddingHorizontal: space.lg, justifyContent: 'space-between' },
  lightboxTitle: { flex: 1, ...type.bodyStrong, color: color.goldOnDark, marginRight: space.md },
  lightboxStage: { flex: 1, marginVertical: space.lg, alignItems: 'center', justifyContent: 'center' },
  lightboxChevron: { position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  lightboxThumb: { height: 48, width: 64, borderRadius: radii.sm, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },

  room: { backgroundColor: color.surface, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: color.border, ...elevation.card },
  roomSelected: { borderColor: color.primary, borderWidth: 2 },
  roomImageWrap: { aspectRatio: 2, backgroundColor: color.surfaceMuted },
  roomBadges: { position: 'absolute', top: space.sm, left: space.sm, right: space.sm, flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  roomSpec: { position: 'absolute', bottom: space.sm, left: space.md, right: space.md, ...type.label, color: color.textInverse },
  roomAmenities: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.xs + 2 },
  roomAmenity: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingRight: space.xs + 2 },
  roomAmenityText: { flex: 1, ...type.small, color: color.textSecondary },
});
