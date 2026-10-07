import { useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, User, Phone, Clock, ChevronRight, BedDouble } from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import { Card, Chip, ChipRow, EmptyState, IconButton, Money } from '../../components/ds';
import { Press } from '../../components/ui';
import { color, space, type } from '../../theme';
import { bookingService } from '../services/apiService';
import PartnerHeader from '../components/PartnerHeader';
import { BookingStatusBadge, bookingTone, sentence } from '../components/dashboard/partnerUi';
import { formatINR } from '../utils/format';

/* Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerBookings.jsx. */

// Helper to format dates
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// Calculate nights
const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
};

// --- Card Component ---
const BookingCard = ({ booking }) => {
  const navigate = useNavigate();

  const pType = (booking.propertyType || '').toLowerCase();

  const rawStatus = (booking.bookingStatus || booking.status || 'pending').toLowerCase().trim();

  const guestName = booking.userId?.name || 'Guest User';
  const checkInDate = formatDate(booking.checkInDate || booking.checkIn);
  const checkOutDate = formatDate(booking.checkOutDate || booking.checkOut);
  const nights = calculateNights(booking.checkInDate || booking.checkIn, booking.checkOutDate || booking.checkOut);
  const guestCount = (booking.guests?.adults || 1) + (booking.guests?.children || 0);
  const unitsCount = 1;
  const hotelName = booking.propertyId?.propertyName || booking.propertyId?.name || 'Property';
  const bookingId = booking.bookingId || booking._id?.slice(-8).toUpperCase();

  // Labels
  const secondaryLabel = 'Guest';
  const durationLabel = `${nights} night${nights === 1 ? '' : 's'}`;
  const unitLabel = 'Room';
  const openDetail = () => navigate(`/hotel/partner/bookings/${booking._id}`);

  return (
    <Card padded={false}>
      <Press scale={0.99} onPress={openDetail} accessibilityLabel={`Booking ${bookingId} for ${guestName}, ${bookingTone(rawStatus).label}`} style={styles.card}>
        {/* Header: ID & Status */}
        <View style={styles.cardTop}>
          <Text style={styles.bookingId} numberOfLines={1}>
            #{bookingId}
          </Text>
          <BookingStatusBadge status={rawStatus} />
        </View>

        {/* Guest & Property Info */}
        <View>
          <Text style={styles.guest} numberOfLines={1}>
            {guestName}
          </Text>
          <Text style={styles.hotel} numberOfLines={1}>
            {hotelName}
            {pType ? ` · ${sentence(pType)}` : ''}
          </Text>
        </View>

        {/* Details Grid */}
        <View style={styles.details}>
          <View style={styles.detail}>
            <Calendar size={16} color={color.textMuted} />
            <Text style={styles.detailText}>
              {checkInDate} – {checkOutDate}
            </Text>
          </View>
          <View style={styles.detail}>
            <Clock size={16} color={color.textMuted} />
            <Text style={styles.detailText}>{durationLabel}</Text>
          </View>
          <View style={styles.detail}>
            <User size={16} color={color.textMuted} />
            <Text style={styles.detailText}>
              {guestCount} {secondaryLabel}
              {guestCount === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.detail}>
            <BedDouble size={16} color={color.textMuted} />
            <Text style={styles.detailText}>
              {unitsCount} {unitLabel}
            </Text>
          </View>
        </View>
      </Press>

      <View style={styles.cardFoot}>
        {booking.totalAmount != null ? <Money value={formatINR(booking.totalAmount)} style={{ flex: 1 }} /> : <View style={{ flex: 1 }} />}
        {booking.userId?.phone ? (
          <IconButton icon={Phone} label={`Call ${guestName}`} variant="primary" onPress={() => Linking.openURL(`tel:${booking.userId.phone}`)} />
        ) : null}
        <Press scale={1} onPress={openDetail} accessibilityLabel={`View details of booking ${bookingId}`} style={styles.viewLink}>
          <Text style={[type.label, { color: color.primary }]}>Details</Text>
          <ChevronRight size={16} color={color.primary} />
        </Press>
      </View>
    </Card>
  );
};

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'in_house', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

// --- Main Component ---
const PartnerBookings = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        // Fetch with server-side filtering
        const data = await bookingService.getPartnerBookings(activeTab);
        setBookings(data);
      } catch (error) {
        console.error('Failed to fetch partner bookings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [activeTab]);

  // Client-side filtering removed as backend handles it
  const filteredBookings = bookings;

  return (
    <View style={styles.page}>
      <PartnerHeader />

      {/* Filter Tabs */}
      <View style={styles.tabsWrap}>
        <ChipRow>
          {TABS.map((tab) => (
            <Chip key={tab.id} label={tab.label} selected={activeTab === tab.id} onPress={() => setActiveTab(tab.id)} />
          ))}
        </ChipRow>
      </View>

      {/* List Content */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: space.xxxl + space.lg }}>
          <ActivityIndicator size="large" color={color.primary} />
        </View>
      ) : Array.isArray(filteredBookings) && filteredBookings.length > 0 ? (
        <FlatList
          data={filteredBookings}
          keyExtractor={(booking, idx) => String(booking._id || idx)}
          renderItem={({ item }) => <BookingCard booking={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: space.xxxl + insets.bottom }]}
          ItemSeparatorComponent={Gap}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState icon={BedDouble} title={`No ${TABS.find((t) => t.id === activeTab)?.label.toLowerCase() || activeTab} bookings`} message="Bookings in this tab will appear here." />
      )}
    </View>
  );
};

const Gap = () => <View style={{ height: space.md }} />;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  tabsWrap: { paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, backgroundColor: color.surface },
  list: { padding: space.lg },
  card: { padding: space.lg, paddingBottom: space.md, gap: space.md },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  bookingId: { ...type.caption, color: color.textMuted, flex: 1, minWidth: 0 },
  guest: { ...type.subheading, color: color.text },
  hotel: { ...type.small, color: color.textMuted, marginTop: space.xxs },
  details: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: space.sm, columnGap: space.lg },
  detail: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  detailText: { ...type.label, color: color.textSecondary },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginHorizontal: space.lg, paddingVertical: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  viewLink: { flexDirection: 'row', alignItems: 'center', gap: space.xxs, minHeight: 44, paddingLeft: space.sm },
});

export default PartnerBookings;
