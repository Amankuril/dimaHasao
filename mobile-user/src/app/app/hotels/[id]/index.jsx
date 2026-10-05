import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../../../../components/Img';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../../../../components/Fa';
import { Press } from '../../../../components/ui';
import { Header, PatternDivider } from '../../../../components/dh/Header';
import { HotelGallery, RoomCard } from '../../../../components/dh/hotel';
import { GreenButton, Panel, Pulse, SegTabs, Stars, StateBlock, dhs } from '../../../../components/dh/ui';
import { useBooking } from '../../../../context/BookingContext';
import { fetchHotelById } from '../../../../api/dh/hotelApi';
import { dh, montserrat, poppins, shadow, tw } from '../../../../theme';

// Web: DimaHasao/pages/HotelDetailScreen.jsx (/app/hotels/:id)

export default function HotelDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { favoriteHotels, toggleFavoriteHotel, showToast } = useBooking();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const nights = 1;
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' | 'about' | 'reviews'

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const result = await fetchHotelById(id);
        if (cancelled) return;
        if (!result) {
          setLoadError('This stay is no longer available.');
          setHotel(null);
          return;
        }
        setHotel(result);
        // Preselect the first bookable room.
        setSelectedRoom(result.rooms?.[0] || null);
      } catch (err) {
        if (!cancelled) {
          setHotel(null);
          setLoadError(err?.response?.data?.message || 'Could not load this stay. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={dhs.page}>
        <Header title="Loading stay…" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <View style={{ padding: 14, gap: 16 }}>
          <Pulse style={{ height: 208, borderRadius: 16 }} />
          <Panel style={{ gap: 12 }}>
            <Pulse style={{ height: 12, width: '25%' }} />
            <Pulse style={{ height: 20, width: '66%' }} />
            <Pulse style={{ height: 12, width: '50%' }} />
          </Panel>
          <View style={[dhs.panel, { height: 112 }]} />
        </View>
      </View>
    );
  }

  if (!hotel) {
    return (
      <View style={dhs.page}>
        <Header title="Stay unavailable" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <StateBlock card={false} icon="fa-solid fa-hotel" title="Couldn't load this stay" text={loadError || 'Please try again.'} actionLabel="Back to Stays" onAction={() => router.replace('/app/hotels')} />
      </View>
    );
  }

  const isFavorite = favoriteHotels?.includes(hotel.id);

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    showToast(`Selected: ${room.name}`);
  };

  const handleProceedToBook = () => {
    if (!selectedRoom) {
      showToast('Please select a room first');
      return;
    }
    router.push({ pathname: '/app/hotels/[id]/book', params: { id: hotel.id, roomId: selectedRoom.id, nights: String(nights) } });
  };

  const tabs = [
    { id: 'rooms', label: 'Rooms', icon: 'fa-solid fa-bed' },
    { id: 'about', label: 'Amenities', icon: 'fa-solid fa-wand-magic-sparkles' },
    { id: 'reviews', label: `Reviews (${hotel.reviews.length})`, icon: 'fa-solid fa-star' },
  ];

  return (
    <View style={dhs.page}>
      <Header title={hotel.name} subtitle={`${hotel.type} • ${hotel.location}`} showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}>
        <HotelGallery images={hotel.images} hotelName={hotel.name} />

        <View style={{ padding: 14, gap: 16 }}>
          <Panel style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <View style={[dhs.row, { gap: 8, marginBottom: 4 }]}>
                  <Text style={styles.typeBadge}>{hotel.type}</Text>
                  {hotel.badge ? <Text style={[styles.typeBadge, { backgroundColor: tw.amber500, color: '#fff' }]}>{hotel.badge}</Text> : null}
                </View>
                <Text style={styles.name}>{hotel.name}</Text>
                <View style={[dhs.row, { gap: 4, marginTop: 4, alignItems: 'flex-start' }]}>
                  <Fa name="fa-solid fa-location-dot" size={12} color={tw.emerald700} style={{ marginTop: 2 }} />
                  <Text style={styles.address}>{hotel.address}</Text>
                </View>
              </View>
              <Press scale={0.85} onPress={() => toggleFavoriteHotel(hotel.id)} style={styles.fav} accessibilityLabel={isFavorite ? 'Remove from saved' : 'Save hotel'}>
                <Fa name="fa-solid fa-heart" size={14} color={isFavorite ? tw.red500 : tw.gray400} />
              </Press>
            </View>

            <View style={styles.metrics}>
              <View style={styles.metric}>
                <View style={[dhs.row, { gap: 4, justifyContent: 'center' }]}>
                  <Text style={[styles.metricValue, { color: tw.emerald900 }]}>{hotel.rating}</Text>
                  <Fa name="fa-solid fa-star" size={10} color={tw.amber400} />
                </View>
                <Text style={styles.metricLabel}>{hotel.reviewCount} Reviews</Text>
              </View>
              {/* Distance only exists after a geo search, so check-out fills the box otherwise. */}
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{hotel.distanceFromStation || hotel.checkOutTime}</Text>
                <Text style={styles.metricLabel}>{hotel.distanceFromStation ? 'From Station' : 'Check-out'}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={[styles.metricValue, { color: tw.emerald800 }]}>{hotel.checkInTime}</Text>
                <Text style={styles.metricLabel}>Check-in</Text>
              </View>
            </View>
          </Panel>

          <SegTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {activeTab === 'rooms' ? (
            <View style={{ gap: 12 }}>
              <View style={[dhs.row, { justifyContent: 'space-between', paddingHorizontal: 4 }]}>
                <View style={[dhs.row, { gap: 6 }]}>
                  <Fa name="fa-solid fa-door-open" size={14} color={tw.emerald800} />
                  <Text style={dhs.h3}>Available Room Types</Text>
                </View>
                <Text style={styles.roomCount}>
                  {hotel.rooms.length} room {hotel.rooms.length === 1 ? 'type' : 'types'}
                </Text>
              </View>
              {hotel.rooms.map((room) => (
                <RoomCard key={room.id} room={room} isSelected={selectedRoom?.id === room.id} onSelect={handleSelectRoom} />
              ))}
            </View>
          ) : null}

          {activeTab === 'about' ? (
            <View style={{ gap: 16 }}>
              <Panel style={{ gap: 10 }}>
                <Text style={dhs.h3}>About the Property</Text>
                <Text style={styles.body}>{hotel.description}</Text>
                <View style={styles.rules}>
                  {hotel.aboutDetails.map((detail, idx) => (
                    <View key={idx} style={styles.rule}>
                      <Fa name="fa-solid fa-circle-check" size={12} color={tw.emerald600} style={{ marginTop: 2 }} />
                      <Text style={styles.ruleText}>{detail}</Text>
                    </View>
                  ))}
                </View>
              </Panel>

              <Panel style={{ gap: 12 }}>
                <Text style={dhs.h3}>Property Amenities</Text>
                <View style={styles.amenities}>
                  {hotel.amenities.map((am) => (
                    <View key={am.id} style={styles.amenityCell}>
                      <View style={styles.amenity}>
                        <View style={styles.amenityIcon}>
                          <Fa name={am.icon} size={12} color={tw.emerald900} />
                        </View>
                        <Text style={styles.amenityText}>{am.label}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Panel>

              <Panel style={{ gap: 10 }}>
                <Text style={dhs.h3}>Stay Policies</Text>
                <View style={{ gap: 8 }}>
                  <View style={styles.policyRow}>
                    <Text style={styles.policyLabel}>Check-in Time:</Text>
                    <Text style={styles.policyValue}>{hotel.checkInTime}</Text>
                  </View>
                  <View style={styles.policyRow}>
                    <Text style={styles.policyLabel}>Check-out Time:</Text>
                    <Text style={styles.policyValue}>{hotel.checkOutTime}</Text>
                  </View>
                  <View style={styles.cancel}>
                    <Fa name="fa-solid fa-shield-halved" size={11} color={tw.emerald800} style={{ marginTop: 2 }} />
                    <Text style={styles.cancelText}>{hotel.cancellationPolicy}</Text>
                  </View>
                </View>
              </Panel>
            </View>
          ) : null}

          {activeTab === 'reviews' ? (
            <View style={{ gap: 12 }}>
              <Panel style={[dhs.row, { justifyContent: 'space-between' }]}>
                <View style={[dhs.row, { gap: 8 }]}>
                  <Text style={styles.bigRating}>{hotel.rating}</Text>
                  <View>
                    <Stars rating={4.5} />
                    <Text style={styles.totalRatings}>{hotel.reviewCount} total ratings</Text>
                  </View>
                </View>
                <GreenButton size="sm" title="Write Review" onPress={() => showToast('Review form opens after completed stay')} />
              </Panel>

              {hotel.reviews.map((rev) => (
                <Panel key={rev.id} pad={14} style={{ gap: 8 }}>
                  <View style={[dhs.row, { justifyContent: 'space-between' }]}>
                    <View style={[dhs.row, { gap: 10, flexShrink: 1 }]}>
                      {rev.avatar ? (
                        <Image source={{ uri: rev.avatar }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, { backgroundColor: tw.gray100 }]} />
                      )}
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.author}>{rev.author}</Text>
                        <Text style={styles.revDate}>{rev.date}</Text>
                      </View>
                    </View>
                    <View style={styles.revRating}>
                      <Text style={styles.revRatingText}>{rev.rating}</Text>
                      <Fa name="fa-solid fa-star" size={9} color={tw.amber500} />
                    </View>
                  </View>
                  <Text style={[styles.body, { paddingLeft: 40, color: tw.gray700 }]}>{rev.comment}</Text>
                </Panel>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: 12 + insets.bottom }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barLabel} numberOfLines={1}>
            {selectedRoom ? selectedRoom.name : 'Select a room'}
          </Text>
          <View style={[dhs.row, { alignItems: 'baseline', gap: 4 }]}>
            <Text style={styles.barPrice}>₹{(selectedRoom ? selectedRoom.price * nights : hotel.startingPrice).toLocaleString('en-IN')}</Text>
            <Text style={styles.barNights}>
              / {nights} {nights === 1 ? 'night' : 'nights'}
            </Text>
          </View>
        </View>
        <GreenButton title="Proceed to Book" iconRight="fa-solid fa-arrow-right" onPress={handleProceedToBook} style={{ paddingHorizontal: 20, ...shadow('md') }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  typeBadge: { fontSize: 10, lineHeight: 15, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden', backgroundColor: dh.nav, color: tw.amber300, ...poppins(700) },
  name: { fontSize: 18, lineHeight: 24.75, color: tw.gray900, ...montserrat(700) },
  address: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  fav: { width: 40, height: 40, borderRadius: 20, backgroundColor: dh.cream, borderWidth: 1, borderColor: dh.border, alignItems: 'center', justifyContent: 'center' },
  metrics: { flexDirection: 'row', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100 },
  metric: { flex: 1, alignItems: 'center', backgroundColor: dh.cream, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(229,221,195,0.6)' },
  metricValue: { fontSize: 12, lineHeight: 16, color: tw.gray900, textAlign: 'center', ...poppins(700) },
  metricLabel: { fontSize: 9.5, lineHeight: 14, color: tw.gray500, marginTop: 2, textAlign: 'center', ...poppins(400) },
  roomCount: { fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(400) },
  body: { fontSize: 12, lineHeight: 19.5, color: tw.gray600, ...poppins(400) },
  rules: { gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100 },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ruleText: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(400) },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', margin: -5 },
  amenityCell: { width: '50%', padding: 5 },
  amenity: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, backgroundColor: dh.cream, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(229,221,195,0.6)' },
  amenityIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(6,56,30,0.1)', alignItems: 'center', justifyContent: 'center' },
  amenityText: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray800, ...poppins(500) },
  policyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  policyLabel: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  policyValue: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  cancel: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: tw.emerald50, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: tw.emerald200, marginTop: 4 },
  cancelText: { flex: 1, fontSize: 11, lineHeight: 16.5, color: tw.emerald800, ...poppins(400) },
  bigRating: { fontSize: 24, lineHeight: 32, color: tw.emerald900, ...montserrat(900) },
  totalRatings: { fontSize: 10, lineHeight: 15, color: tw.gray500, ...poppins(400) },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: tw.amber300 },
  author: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  revDate: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(400) },
  revRating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tw.emerald100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  revRatingText: { fontSize: 10, lineHeight: 15, color: tw.emerald900, ...poppins(700) },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderTopColor: dh.border, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, ...shadow('lg') },
  barLabel: { fontSize: 10, lineHeight: 15, color: tw.gray500, textTransform: 'uppercase', ...poppins(600) },
  barPrice: { fontSize: 18, lineHeight: 28, color: tw.emerald950, ...montserrat(800) },
  barNights: { fontSize: 10, color: tw.gray400, ...poppins(400) },
});
