import { useState, useEffect } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, User, Phone, Clock, ChevronRight, BedDouble } from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { bookingService } from '../services/apiService';
import PartnerHeader from '../components/PartnerHeader';
import { HT } from '../theme';

/* Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerBookings.jsx. */

// Status Logic
const getStatusStyle = (s) => {
  if (s === 'confirmed') return { fg: tw.blue600, bg: tw.blue50, label: 'Confirmed' };
  if (s === 'checked_in') return { fg: tw.purple600, bg: tw.purple50, label: 'Ongoing' };
  if (s === 'checked_out' || s === 'completed') return { fg: tw.emerald600, bg: tw.emerald50, label: 'Completed' };
  if (s === 'cancelled') return { fg: tw.red500, bg: tw.red50, label: 'Cancelled' };
  if (s === 'no_show') return { fg: tw.gray500, bg: tw.gray100, label: 'No Show' };
  if (s === 'pending_payment') return { fg: tw.orange600, bg: tw.orange50, label: 'Payment Pending' };

  return { fg: tw.yellow600, bg: tw.yellow50, label: s.replace('_', ' ').toUpperCase() };
};

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
  const status = getStatusStyle(rawStatus);

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
  const durationLabel = `${nights} Nights`;
  const unitLabel = 'Room';

  return (
    <View style={styles.card}>
      {/* Header: ID & Status */}
      <View style={styles.cardTop}>
        <Text style={styles.bookingId}>BOOKING ID: {bookingId}</Text>
        <View style={[styles.pill, { backgroundColor: status.bg }]}>
          <Text style={[styles.pillText, { color: status.fg }]}>{status.label}</Text>
        </View>
      </View>

      {/* Guest & Property Info */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Press
            scale={1}
            onPress={() => navigate(`/hotel/partner/bookings/${booking._id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}
          >
            <Text style={styles.guest} numberOfLines={1}>{guestName}</Text>
            <ChevronRight size={20} color={HT.primary} strokeWidth={3} />
          </Press>
          {booking.userId?.phone ? (
            <Press
              scale={0.95}
              onPress={() => Linking.openURL(`tel:${booking.userId.phone}`)}
              accessibilityLabel="Call guest"
              style={styles.call}
            >
              <Phone size={14} color={HT.primary} />
            </Press>
          ) : null}
        </View>
        <Text style={styles.hotel}>
          {hotelName} • <Text style={{ textTransform: 'uppercase' }}>{pType}</Text>
        </Text>
      </View>

      {/* Details Grid */}
      <View style={styles.details}>
        <View style={styles.detail}>
          <Calendar size={15} strokeWidth={2} color={tw.slate700} />
          <Text style={styles.detailText}>{checkInDate} - {checkOutDate}</Text>
        </View>
        <View style={styles.detail}>
          <Clock size={15} strokeWidth={2} color={tw.slate700} />
          <Text style={styles.detailText}>{durationLabel}</Text>
        </View>
        <View style={styles.detail}>
          <User size={15} strokeWidth={2} color={tw.slate700} />
          <Text style={styles.detailText}>{guestCount} {secondaryLabel}s</Text>
        </View>
        <View style={styles.detail}>
          <BedDouble size={15} strokeWidth={2} color={tw.slate700} />
          <Text style={styles.detailText}>{unitsCount} {unitLabel}</Text>
        </View>
      </View>
    </View>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {TABS.map((tab) => {
            const on = activeTab === tab.id;
            return (
              <Press
                key={tab.id}
                scale={1}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tab, on ? styles.tabOn : styles.tabOff]}
              >
                <Text style={[styles.tabText, { color: on ? '#fff' : tw.gray500 }]}>{tab.label}</Text>
              </Press>
            );
          })}
        </ScrollView>
      </View>

      {/* List Content */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <ActivityIndicator size="small" color={HT.primary} />
          </View>
        ) : Array.isArray(filteredBookings) && filteredBookings.length > 0 ? (
          <View style={{ gap: 12 }}>
            {filteredBookings.map((booking, idx) => (
              <BookingCard key={booking._id || idx} booking={booking} />
            ))}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 64, opacity: 0.5 }}>
            <View style={styles.emptyIcon}>
              <BedDouble size={32} color="#fff" />
            </View>
            <Text style={styles.emptyText}>No {activeTab} enquiries found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: HT.bg },
  tabsWrap: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(243,244,246,0.5)', marginBottom: 8, backgroundColor: 'rgba(249,250,251,0.95)' /* bg-gray-50/95: not a min-h-screen pairing, so partnerTheme.css leaves it grey */ },
  tab: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  tabOn: { backgroundColor: HT.primary, borderColor: HT.primary, ...shadow('sm') },
  tabOff: { backgroundColor: '#fff', borderColor: tw.gray200 },
  tabText: { fontSize: 12, lineHeight: 16, ...poppins(700) },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 16, paddingTop: 14, marginBottom: 4, borderWidth: 1, borderColor: tw.gray50, boxShadow: '0 2px 15px rgba(0,0,0,0.04)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bookingId: { fontSize: 11, lineHeight: 16.5, letterSpacing: 1.65, color: tw.gray400, ...poppins(700) },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: 'uppercase', ...poppins(700) },
  guest: { fontSize: 20, lineHeight: 20, color: tw.slate900, flexShrink: 1, ...poppins(900) },
  call: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F7F7', alignItems: 'center', justifyContent: 'center' },
  hotel: { fontSize: 13, lineHeight: 19.5, letterSpacing: 0.26, color: tw.gray500, marginTop: 4, ...poppins(500) },
  details: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 8, columnGap: 12 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, lineHeight: 16, color: tw.slate700, ...poppins(600) },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: tw.gray200, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyText: { fontSize: 14, lineHeight: 20, color: tw.gray400, ...poppins(700) },
});

export default PartnerBookings;
