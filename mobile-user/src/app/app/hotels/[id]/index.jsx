import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../../../../components/Img';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../../../../components/Fa';
import { IconButton, StatusBadge, fa } from '../../../../components/ds';
import { Header, PatternDivider } from '../../../../components/dh/Header';
import { HotelGallery, RoomCard } from '../../../../components/dh/hotel';
import { GreenButton, Panel, PanelTitle, Pulse, SegTabs, Stars, StateBlock, dhs } from '../../../../components/dh/ui';
import { useBooking } from '../../../../context/BookingContext';
import { fetchHotelById } from '../../../../api/dh/hotelApi';
import { color, elevation, radii, space, type } from '../../../../theme';

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
        <View style={{ padding: space.lg, gap: space.lg }} accessibilityLabel="Loading stay">
          <Pulse style={{ height: 220, borderRadius: radii.lg }} />
          <Panel style={{ gap: space.md }}>
            <Pulse style={{ height: 13, width: '25%' }} />
            <Pulse style={{ height: 20, width: '66%' }} />
            <Pulse style={{ height: 13, width: '50%' }} />
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
        <StateBlock card={false} icon="fa-solid fa-hotel" title="Couldn't load this stay" text={loadError || 'Please try again.'} actionLabel="Back to stays" onAction={() => router.replace('/app/hotels')} />
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

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.xxl }}>
        <HotelGallery images={hotel.images} hotelName={hotel.name} />

        <View style={{ padding: space.lg, gap: space.lg }}>
          <Panel style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm }}>
              <View style={{ flex: 1, minWidth: 0, gap: space.xs + 2 }}>
                <View style={[dhs.row, { gap: space.sm, flexWrap: 'wrap' }]}>
                  <StatusBadge label={hotel.type} tone="primary" />
                  {hotel.badge ? <StatusBadge label={hotel.badge} tone="gold" icon={fa('fa-solid fa-star')} /> : null}
                </View>
                <Text style={styles.name} accessibilityRole="header">
                  {hotel.name}
                </Text>
                <View style={[dhs.row, { gap: space.xs + 2, alignItems: 'flex-start' }]}>
                  <Fa name="fa-solid fa-location-dot" size={14} color={color.primary} style={{ marginTop: 3 }} />
                  <Text style={styles.address} numberOfLines={2}>
                    {hotel.address}
                  </Text>
                </View>
              </View>
              <IconButton
                icon={fa('fa-solid fa-heart')}
                label={isFavorite ? 'Remove from saved' : 'Save hotel'}
                variant="soft"
                iconColor={isFavorite ? color.danger : color.textMuted}
                onPress={() => toggleFavoriteHotel(hotel.id)}
              />
            </View>

            <View style={styles.metrics}>
              <View style={styles.metric}>
                <View style={[dhs.row, { gap: space.xs, justifyContent: 'center' }]}>
                  <Text style={styles.metricValue}>{hotel.rating}</Text>
                  <Fa name="fa-solid fa-star" size={12} color={color.gold} />
                </View>
                <Text style={styles.metricLabel}>{hotel.reviewCount} reviews</Text>
              </View>
              {/* Distance only exists after a geo search, so check-out fills the box otherwise. */}
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{hotel.distanceFromStation || hotel.checkOutTime}</Text>
                <Text style={styles.metricLabel}>{hotel.distanceFromStation ? 'From station' : 'Check-out'}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{hotel.checkInTime}</Text>
                <Text style={styles.metricLabel}>Check-in</Text>
              </View>
            </View>
          </Panel>

          <SegTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

          {activeTab === 'rooms' ? (
            <View style={{ gap: space.md }}>
              <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm }]}>
                <View style={[dhs.row, { gap: space.sm, flexShrink: 1 }]}>
                  <Fa name="fa-solid fa-door-open" size={16} color={color.primary} />
                  <Text style={dhs.h3} accessibilityRole="header">
                    Available room types
                  </Text>
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
            <View style={{ gap: space.lg }}>
              <Panel style={{ gap: space.sm }}>
                <PanelTitle icon="fa-solid fa-circle-info">About the property</PanelTitle>
                <Text style={styles.body}>{hotel.description}</Text>
                <View style={styles.rules}>
                  {hotel.aboutDetails.map((detail, idx) => (
                    <View key={idx} style={styles.rule}>
                      <Fa name="fa-solid fa-circle-check" size={14} color={color.primary} style={{ marginTop: 3 }} />
                      <Text style={styles.ruleText}>{detail}</Text>
                    </View>
                  ))}
                </View>
              </Panel>

              <Panel style={{ gap: space.md }}>
                <PanelTitle icon="fa-solid fa-wand-magic-sparkles">Property amenities</PanelTitle>
                <View style={styles.amenities}>
                  {hotel.amenities.map((am) => (
                    <View key={am.id} style={styles.amenityCell}>
                      <View style={styles.amenity}>
                        <View style={styles.amenityIcon}>
                          <Fa name={am.icon} size={14} color={color.primary} />
                        </View>
                        <Text style={styles.amenityText} numberOfLines={2}>
                          {am.label}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Panel>

              <Panel style={{ gap: space.sm }}>
                <PanelTitle icon="fa-solid fa-clipboard-list">Stay policies</PanelTitle>
                <View>
                  <View style={styles.policyRow}>
                    <Text style={styles.policyLabel}>Check-in time</Text>
                    <Text style={styles.policyValue}>{hotel.checkInTime}</Text>
                  </View>
                  <View style={styles.policyRow}>
                    <Text style={styles.policyLabel}>Check-out time</Text>
                    <Text style={styles.policyValue}>{hotel.checkOutTime}</Text>
                  </View>
                  <View style={styles.cancel}>
                    <Fa name="fa-solid fa-shield-halved" size={14} color={color.success} style={{ marginTop: 3 }} />
                    <Text style={styles.cancelText}>{hotel.cancellationPolicy}</Text>
                  </View>
                </View>
              </Panel>
            </View>
          ) : null}

          {activeTab === 'reviews' ? (
            <View style={{ gap: space.md }}>
              <Panel style={[dhs.row, { justifyContent: 'space-between', gap: space.md, flexWrap: 'wrap' }]}>
                <View style={[dhs.row, { gap: space.md }]}>
                  <Text style={styles.bigRating}>{hotel.rating}</Text>
                  <View style={{ gap: 2 }}>
                    <Stars rating={4.5} />
                    <Text style={styles.totalRatings}>{hotel.reviewCount} total ratings</Text>
                  </View>
                </View>
                <GreenButton size="sm" variant="outline" fullWidth={false} title="Write review" onPress={() => showToast('Review form opens after completed stay')} />
              </Panel>

              {hotel.reviews.map((rev) => (
                <Panel key={rev.id} style={{ gap: space.sm }}>
                  <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm }]}>
                    <View style={[dhs.row, { gap: space.md, flexShrink: 1 }]}>
                      {rev.avatar ? <Image source={{ uri: rev.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: color.surfaceMuted }]} />}
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.author} numberOfLines={1}>
                          {rev.author}
                        </Text>
                        <Text style={styles.revDate}>{rev.date}</Text>
                      </View>
                    </View>
                    <StatusBadge label={String(rev.rating)} tone="gold" icon={fa('fa-solid fa-star')} />
                  </View>
                  <Text style={styles.body}>{rev.comment}</Text>
                </Panel>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: space.md + insets.bottom }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.barLabel} numberOfLines={1}>
            {selectedRoom ? selectedRoom.name : 'Select a room'}
          </Text>
          <View style={[dhs.row, { alignItems: 'baseline', gap: space.xs }]}>
            <Text style={styles.barPrice}>₹{(selectedRoom ? selectedRoom.price * nights : hotel.startingPrice).toLocaleString('en-IN')}</Text>
            <Text style={styles.barNights}>
              / {nights} {nights === 1 ? 'night' : 'nights'}
            </Text>
          </View>
        </View>
        <GreenButton title="Proceed to book" size="lg" fullWidth={false} iconRight="fa-solid fa-arrow-right" onPress={handleProceedToBook} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { ...type.heading, color: color.text },
  address: { flex: 1, ...type.small, color: color.textSecondary },
  metrics: { flexDirection: 'row', gap: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  metric: { flex: 1, alignItems: 'center', backgroundColor: color.surfaceMuted, paddingVertical: space.sm + 2, paddingHorizontal: space.xs, borderRadius: radii.md },
  metricValue: { ...type.bodyStrong, color: color.text, textAlign: 'center' },
  metricLabel: { ...type.caption, color: color.textMuted, marginTop: 2, textAlign: 'center' },
  roomCount: { ...type.caption, color: color.textMuted },
  body: { ...type.body, color: color.textSecondary },
  rules: { gap: space.sm, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  ruleText: { flex: 1, ...type.small, color: color.text },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', margin: -space.xs },
  amenityCell: { width: '50%', padding: space.xs },
  amenity: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, backgroundColor: color.surfaceMuted, borderRadius: radii.md },
  amenityIcon: { width: 32, height: 32, borderRadius: radii.sm, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  amenityText: { flex: 1, ...type.small, color: color.text },
  policyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: space.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  policyLabel: { ...type.small, color: color.textSecondary },
  policyValue: { ...type.bodyStrong, color: color.text },
  cancel: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, backgroundColor: color.successSoft, padding: space.md, borderRadius: radii.md, marginTop: space.md },
  cancelText: { flex: 1, ...type.small, color: color.text },
  bigRating: { ...type.priceLg, color: color.primary },
  totalRatings: { ...type.caption, color: color.textMuted },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: color.border },
  author: { ...type.bodyStrong, color: color.text },
  revDate: { ...type.caption, color: color.textMuted },
  bar: { backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, ...elevation.sheet },
  barLabel: { ...type.caption, color: color.textMuted },
  barPrice: { ...type.price, color: color.text },
  barNights: { ...type.caption, color: color.textMuted },
});
