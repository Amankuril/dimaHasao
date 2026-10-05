import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../Img';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../Fa';
import { Press } from '../ui';
import { useBooking } from '../../context/BookingContext';
import { dh, montserrat, poppins, shadow, tw } from '../../theme';

/** components/hotel/HotelCard.jsx */
export function HotelCard({ hotel }) {
  const { favoriteHotels, toggleFavoriteHotel } = useBooking();
  const isFavorite = favoriteHotels?.includes(hotel.id);
  const open = () => router.push(`/app/hotels/${hotel.id}`);

  return (
    <Press scale={0.99} onPress={open} style={styles.card} accessibilityLabel={`${hotel.name}, ${hotel.location}. View rooms`}>
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: hotel.heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.2)', 'transparent', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFill} />

        <View style={styles.badges}>
          <Text style={styles.typeBadge}>{hotel.type}</Text>
          {hotel.badge ? <Text style={styles.featureBadge}>{hotel.badge}</Text> : null}
        </View>

        <Press scale={0.85} onPress={() => toggleFavoriteHotel(hotel.id)} style={styles.fav} accessibilityLabel={isFavorite ? 'Remove from saved' : 'Save hotel'} hitSlop={6}>
          <Fa name="fa-solid fa-heart" size={12} color={isFavorite ? tw.red500 : tw.gray400} />
        </Press>

        <View style={styles.imageFoot}>
          <View style={[styles.row, { gap: 4, flexShrink: 1 }]}>
            <Fa name="fa-solid fa-location-dot" size={12} color={tw.amber400} />
            <Text style={styles.imageLoc} numberOfLines={1}>{hotel.location}</Text>
          </View>
          {hotel.distanceFromStation ? <Text style={styles.distance}>{hotel.distanceFromStation} from station</Text> : null}
        </View>
      </View>

      <View style={{ padding: 14, gap: 12 }}>
        <View>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
            <View style={[styles.row, { gap: 6 }]}>
              <View style={styles.rating}>
                <Text style={styles.ratingText}>{hotel.rating}</Text>
                <Fa name="fa-solid fa-star" size={9} color={tw.amber300} />
              </View>
              <Text style={styles.reviews}>({hotel.reviewCount} reviews)</Text>
            </View>
            <Text style={styles.freeCancel}>FREE CANCELLATION</Text>
          </View>

          <Text style={styles.name}>{hotel.name}</Text>

          <View style={styles.amenities}>
            {hotel.amenities.slice(0, 3).map((am) => (
              <View key={am.id} style={styles.amenity}>
                <Fa name={am.icon} size={9} color={tw.emerald700} />
                <Text style={styles.amenityText}>{am.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.cardFoot}>
          <View>
            <View style={[styles.row, { alignItems: 'baseline', gap: 6 }]}>
              <Text style={styles.price}>₹{hotel.startingPrice.toLocaleString('en-IN')}</Text>
              {hotel.originalPrice ? <Text style={styles.strike}>₹{hotel.originalPrice.toLocaleString('en-IN')}</Text> : null}
            </View>
            <Text style={styles.priceNote}>per room / night + taxes</Text>
          </View>
          <View style={styles.viewRooms}>
            <Text style={styles.viewRoomsText}>View Rooms</Text>
            <Fa name="fa-solid fa-arrow-right" size={10} color={tw.amber300} />
          </View>
        </View>
      </View>
    </Press>
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
          <Fa name="fa-solid fa-camera" size={10} color={tw.amber300} />
          <Text style={styles.counterText}>
            {activeIndex + 1} / {images.length}
          </Text>
        </View>

        <Press onPress={() => setIsFullscreen(true)} style={styles.expand} accessibilityLabel="View Fullscreen">
          <Fa name="fa-solid fa-expand" size={12} color="#fff" />
        </Press>

        {images.length > 1 ? (
          <>
            <Press onPress={prev} style={[styles.chevron, { left: 8 }]} accessibilityLabel="Previous image">
              <Fa name="fa-solid fa-chevron-left" size={12} color="#fff" />
            </Press>
            <Press onPress={next} style={[styles.chevron, { right: 8 }]} accessibilityLabel="Next image">
              <Fa name="fa-solid fa-chevron-right" size={12} color="#fff" />
            </Press>
          </>
        ) : null}
      </View>

      {images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbStrip} contentContainerStyle={{ gap: 8, padding: 8 }}>
          {images.map((img, idx) => (
            <Press key={idx} scale={0.96} onPress={() => setActiveIndex(idx)} style={[styles.thumb, idx === activeIndex ? { borderColor: tw.emerald700 } : { opacity: 0.7 }]} accessibilityLabel={`Photo ${idx + 1}`}>
              <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </Press>
          ))}
        </ScrollView>
      ) : null}

      <Modal visible={isFullscreen} transparent animationType="fade" onRequestClose={() => setIsFullscreen(false)} statusBarTranslucent>
        <View style={[styles.lightbox, { paddingTop: 16 + insets.top, paddingBottom: 16 + insets.bottom }]}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={styles.lightboxTitle} numberOfLines={1}>
              {hotelName} ({activeIndex + 1} of {images.length})
            </Text>
            <Press onPress={() => setIsFullscreen(false)} style={styles.lightboxClose} accessibilityLabel="Close">
              <Fa name="fa-solid fa-xmark" size={16} color="#fff" />
            </Press>
          </View>

          <View style={styles.lightboxStage}>
            <Image source={{ uri: images[activeIndex] }} style={{ width: '100%', height: '100%', borderRadius: 8 }} resizeMode="contain" />
            {images.length > 1 ? (
              <>
                <Press onPress={prev} style={[styles.lightboxChevron, { left: 8 }]} accessibilityLabel="Previous image">
                  <Fa name="fa-solid fa-chevron-left" size={16} color="#fff" />
                </Press>
                <Press onPress={next} style={[styles.lightboxChevron, { right: 8 }]} accessibilityLabel="Next image">
                  <Fa name="fa-solid fa-chevron-right" size={16} color="#fff" />
                </Press>
              </>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 8, flexGrow: 1, justifyContent: 'center' }}>
            {images.map((img, idx) => (
              <Press key={idx} scale={0.96} onPress={() => setActiveIndex(idx)} style={[styles.lightboxThumb, idx === activeIndex ? { borderColor: tw.amber400 } : { opacity: 0.5 }]}>
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
        <LinearGradient colors={['transparent', 'transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFill} />
        {room.isPopular ? <Text style={styles.popular}>Most Popular</Text> : null}
        <Text style={styles.roomsLeft}>{room.availableRooms} rooms left</Text>
        <Text style={styles.roomSpec}>
          {room.size} • {room.bedType}
        </Text>
      </View>

      <View style={{ padding: 14, gap: 12 }}>
        <View>
          <View style={[styles.row, { justifyContent: 'space-between', gap: 8 }]}>
            <Text style={[styles.name, { flexShrink: 1 }]}>{room.name}</Text>
            <Text style={styles.maxGuests}>Max {room.maxGuests} Guests</Text>
          </View>
          <View style={styles.roomAmenities}>
            {room.amenities.map((am, idx) => (
              <View key={idx} style={styles.roomAmenity}>
                <Fa name="fa-solid fa-circle-check" size={10} color={tw.emerald600} />
                <Text style={styles.roomAmenityText} numberOfLines={1}>{am}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.cardFoot}>
          <View>
            <View style={[styles.row, { alignItems: 'baseline', gap: 6 }]}>
              <Text style={[styles.price, { color: tw.emerald950 }]}>₹{room.price.toLocaleString('en-IN')}</Text>
              {room.originalPrice ? <Text style={styles.strike}>₹{room.originalPrice.toLocaleString('en-IN')}</Text> : null}
            </View>
            <Text style={styles.priceNote}>per night + ₹{Math.round(room.price * 0.12)} tax</Text>
          </View>
          <Press scale={0.94} onPress={() => onSelect(room)} style={[styles.selectBtn, isSelected && { backgroundColor: tw.emerald700 }]} accessibilityState={{ selected: isSelected }}>
            {isSelected ? <Fa name="fa-solid fa-check" size={10} color="#fff" /> : null}
            <Text style={[styles.selectText, isSelected && { color: '#fff' }]}>{isSelected ? 'Selected' : 'Select Room'}</Text>
          </Press>
        </View>
      </View>
    </View>
  );
}

const pill = { fontSize: 10, lineHeight: 15, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' };

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(229,221,195,0.8)', ...shadow('xs') },
  cardImageWrap: { height: 176, backgroundColor: tw.gray200 },
  badges: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: { ...pill, backgroundColor: 'rgba(6,56,30,0.9)', color: tw.amber300, borderWidth: 1, borderColor: 'rgba(255,185,0,0.4)', ...poppins(700) },
  featureBadge: { ...pill, backgroundColor: 'rgba(254,154,0,0.9)', color: '#fff', ...poppins(700) },
  fav: { position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  imageFoot: { position: 'absolute', bottom: 8, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  imageLoc: { fontSize: 11, lineHeight: 16.5, color: '#fff', flexShrink: 1, ...poppins(500) },
  distance: { fontSize: 10, lineHeight: 15, color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', ...poppins(500) },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tw.emerald800, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  ratingText: { fontSize: 11, lineHeight: 16.5, color: '#fff', ...poppins(700) },
  reviews: { fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(500) },
  freeCancel: { fontSize: 10, lineHeight: 15, letterSpacing: 0.25, color: tw.emerald700, backgroundColor: tw.emerald50, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: tw.emerald200, overflow: 'hidden', ...poppins(600) },
  name: { fontSize: 14, lineHeight: 19.25, color: tw.gray900, ...montserrat(700) },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  amenity: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: dh.cream, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(229,221,195,0.6)' },
  amenityText: { fontSize: 10, lineHeight: 15, color: tw.gray600, ...poppins(400) },
  cardFoot: { paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 16, lineHeight: 24, color: tw.emerald900, ...montserrat(800) },
  strike: { fontSize: 11, color: tw.gray400, textDecorationLine: 'line-through', ...poppins(400) },
  priceNote: { fontSize: 9.5, lineHeight: 12, color: tw.gray400, ...poppins(400) },
  viewRooms: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: dh.nav, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  viewRoomsText: { fontSize: 12, lineHeight: 16, color: tw.amber300, ...poppins(700) },

  galleryMain: { height: 256, backgroundColor: '#000' },
  counter: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  counterText: { fontSize: 11, lineHeight: 16.5, color: '#fff', ...poppins(600) },
  expand: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  chevron: { position: 'absolute', top: '50%', marginTop: -16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  thumbStrip: { flexGrow: 0, backgroundColor: dh.cream, borderBottomWidth: 1, borderBottomColor: dh.border },
  thumb: { height: 56, width: 80, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', paddingHorizontal: 16, justifyContent: 'space-between' },
  lightboxTitle: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.amber300, marginRight: 12, ...poppins(600) },
  lightboxClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  lightboxStage: { flex: 1, marginVertical: 16, alignItems: 'center', justifyContent: 'center' },
  lightboxChevron: { position: 'absolute', top: '50%', marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  lightboxThumb: { height: 48, width: 64, borderRadius: 6, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },

  room: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: dh.border, ...shadow('xs') },
  roomSelected: { borderColor: tw.emerald600, borderWidth: 2, ...shadow('md') },
  roomImageWrap: { height: 144, backgroundColor: tw.gray100 },
  popular: { position: 'absolute', top: 8, left: 8, ...pill, borderRadius: 4, backgroundColor: tw.amber500, color: '#fff', ...poppins(700) },
  roomsLeft: { position: 'absolute', top: 8, right: 8, ...pill, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', ...poppins(500) },
  roomSpec: { position: 'absolute', bottom: 8, left: 8, fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(600) },
  maxGuests: { fontSize: 10, lineHeight: 15, color: tw.emerald800, backgroundColor: tw.emerald50, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: tw.emerald200, overflow: 'hidden', ...poppins(600) },
  roomAmenities: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, marginTop: 10 },
  roomAmenity: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 6 },
  roomAmenityText: { flex: 1, fontSize: 11, lineHeight: 16.5, color: tw.gray600, ...poppins(400) },
  selectBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: dh.nav, ...shadow('xs') },
  selectText: { fontSize: 12, lineHeight: 16, color: tw.amber300, ...poppins(700) },
});
