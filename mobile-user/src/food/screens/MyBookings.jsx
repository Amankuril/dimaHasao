import { useCallback, useEffect, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeft, Calendar, Clock, MapPin, Star, Users, Utensils, X } from 'lucide-react-native';
import { diningAPI } from '../../api/food';
import Image from '../../components/Img';
import Loader from '../../components/Loader';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { events } from '../../lib/events';
import { toast } from '../../lib/notify';
import { navigateTo } from '../../lib/webRouter';
import { poppins, shadow, tw } from '../../theme';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { F } from '../components/shell';
import { formatBookingAddress, formatShortDate, useNavClearance } from '../components/dining/TableShared';

const getStatusLabel = (status) => {
  const key = String(status || '').toLowerCase();
  if (key === 'pending') return 'Approval Reqd';
  if (key === 'accepted' || key === 'confirmed') return 'Confirmed';
  if (key === 'checked-in') return 'Checked-in';
  if (key === 'completed') return 'Completed';
  if (key === 'cancelled') return 'Cancelled';
  return String(status || 'unknown');
};

const getStatusBadge = (status) => {
  const key = String(status || '').toLowerCase();
  if (key === 'pending') return { bg: tw.amber100, fg: tw.amber700 };
  if (key === 'accepted' || key === 'confirmed') return { bg: tw.green100, fg: tw.green700, bold: true };
  if (key === 'checked-in') return { bg: F.cream, fg: F.green };
  if (key === 'completed') return { bg: tw.blue100, fg: tw.blue700 };
  if (key === 'cancelled') return { bg: tw.red100, fg: tw.red700 };
  return { bg: tw.slate100, fg: tw.slate700 };
};

function ReviewModal({ booking, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error('Please add a comment');
      return;
    }
    setSubmitting(true);
    await onSubmit({ bookingId: booking._id, rating, comment });
    setSubmitting(false);
  };

  return (
    <Dialog visible onClose={onClose} backdrop="rgba(0,0,0,0.5)" blur={8} panelStyle={styles.modal}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHead}>
          <Text style={styles.modalTitle}>Review your experience</Text>
          <Press scale={0.9} onPress={onClose} accessibilityLabel="Close" style={{ padding: 8, borderRadius: 999 }}>
            <X size={20} color={tw.slate400} />
          </Press>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 24 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.how}>How was your visit to {booking.restaurant?.name}?</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Press key={star} scale={0.9} onPress={() => setRating(star)} accessibilityLabel={`${star} star`} style={{ padding: 4 }}>
                  <Star size={40} color={star <= rating ? tw.yellow400 : tw.slate200} fill={star <= rating ? tw.yellow400 : 'none'} />
                </Press>
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={styles.feedback}>Share your feedback</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Write about the food, service, and atmosphere..."
              placeholderTextColor={tw.gray400}
              multiline
              textAlignVertical="top"
              style={styles.textarea}
            />
          </View>
          <Press scale={0.95} disabled={submitting} onPress={handleSubmit} style={[styles.submit, submitting ? { opacity: 0.5 } : null]}>
            <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Review'}</Text>
          </Press>
        </ScrollView>
      </KeyboardAvoidingView>
    </Dialog>
  );
}

function Chip({ icon, children }) {
  return (
    <View style={styles.chip}>
      {icon}
      <Text style={styles.chipText}>{children}</Text>
    </View>
  );
}

export default function MyBookings() {
  const goBack = useAppBackNavigation();
  const clearance = useNavClearance();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchBookings = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await diningAPI.getBookings();
      if (response.data.success) setBookings(response.data.data);
    } catch {
      // list stays as it was
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    // Poll every 15s for status updates
    const interval = setInterval(() => fetchBookings({ silent: true }), 15000);
    // Refetch when the app comes back to the foreground
    const sub = AppState.addEventListener('change', (s) => s === 'active' && fetchBookings({ silent: true }));
    // Instant update via socket event
    const off = events.on('diningBookingStatusUpdate', (e) => {
      const { bookingId, status } = e.detail || {};
      if (bookingId && status) setBookings((prev) => prev.map((b) => (String(b._id) === String(bookingId) ? { ...b, status } : b)));
      else fetchBookings({ silent: true });
    });
    return () => {
      clearInterval(interval);
      sub.remove();
      off();
    };
  }, [fetchBookings]);

  const handleReviewSubmit = async (reviewData) => {
    try {
      const response = await diningAPI.createReview(reviewData);
      if (response.data.success) {
        toast.success('Review submitted! Thank you for your feedback.');
        setSelectedBooking(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    }
  };

  if (loading) return <Loader />;

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Press scale={1} onPress={goBack} accessibilityLabel="Back" hitSlop={8}>
          <ArrowLeft size={24} color={tw.gray700} />
        </Press>
        <Text style={styles.title}>My Table Bookings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + clearance, gap: 16 }}>
        {bookings.length > 0 ? (
          bookings.map((booking) => {
            const badge = getStatusBadge(booking.status);
            return (
              <View key={booking._id} style={styles.card}>
                <View style={styles.thumb}>
                  <Image source={{ uri: booking.restaurant?.image || booking.restaurant?.profileImage?.url || '' }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {booking.restaurant?.name}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.fg }, badge.bold ? poppins(700) : null]}>{getStatusLabel(booking.status)}</Text>
                    </View>
                  </View>
                  <View style={[styles.row, { gap: 4, marginTop: 2 }]}>
                    <MapPin size={12} color={tw.gray500} />
                    <Text style={styles.addr} numberOfLines={1}>
                      {formatBookingAddress(booking.restaurant?.location)}
                    </Text>
                  </View>

                  <View style={[styles.row, { gap: 16, marginTop: 12, flexWrap: 'wrap' }]}>
                    <Chip icon={<Calendar size={12} color={tw.gray600} />}>{formatShortDate(booking.date) || 'Invalid Date'}</Chip>
                    <Chip icon={<Clock size={12} color={tw.gray600} />}>{booking.timeSlot}</Chip>
                    <Chip icon={<Users size={12} color={tw.gray600} />}>{booking.guests} Guests</Chip>
                  </View>

                  {booking.status === 'completed' ? (
                    <Press scale={1} onPress={() => setSelectedBooking(booking)} style={styles.rate}>
                      <Text style={styles.rateText}>RATE & REVIEW</Text>
                    </Press>
                  ) : null}
                </View>
              </View>
            );
          })
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 80 }}>
            <View style={styles.emptyIcon}>
              <Utensils size={32} color={tw.slate300} />
            </View>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyBody}>Book your favorite restaurant for a great dining experience!</Text>
            <Press scale={1} onPress={() => navigateTo('/dining')} style={[styles.book, shadow('0 10px 15px -3px #FFC9C9, 0 4px 6px -4px #FFC9C9')]}>
              <Text style={styles.bookText}>Book a table</Text>
            </Press>
          </View>
        )}
      </ScrollView>

      {selectedBooking ? <ReviewModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} onSubmit={handleReviewSubmit} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tw.slate50 },
  row: { flexDirection: 'row', alignItems: 'center' },
  header: { backgroundColor: '#fff', padding: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: tw.gray200, ...shadow('sm') },
  title: { marginLeft: 16, fontSize: 20, lineHeight: 28, color: tw.gray800, ...poppins(600) },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tw.slate100, flexDirection: 'row', alignItems: 'flex-start', gap: 16, ...shadow('sm') },
  thumb: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', backgroundColor: tw.slate100 },
  name: { flex: 1, fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 12, lineHeight: 16, ...poppins(500) },
  addr: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tw.slate100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  chipText: { fontSize: 11, lineHeight: 16.5, color: tw.gray600, ...poppins(700) },
  rate: { marginTop: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red100, alignItems: 'center' },
  rateText: { fontSize: 11, lineHeight: 16.5, color: tw.red600, ...poppins(700) },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, lineHeight: 28, color: tw.gray800, ...poppins(700) },
  emptyBody: { marginTop: 8, fontSize: 14, lineHeight: 20, color: tw.gray500, textAlign: 'center', ...poppins(400) },
  book: { marginTop: 24, backgroundColor: tw.red500, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  bookText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) },
  modal: { width: 380, maxWidth: '92%', maxHeight: '90%', backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', ...shadow('2xl') },
  modalHead: { padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: tw.slate100 },
  modalTitle: { fontSize: 20, lineHeight: 28, color: tw.slate900, ...poppins(700) },
  how: { fontSize: 14, lineHeight: 20, color: tw.slate500, marginBottom: 12, textAlign: 'center', ...poppins(500) },
  feedback: { fontSize: 14, lineHeight: 20, color: tw.slate700, ...poppins(700) },
  textarea: { height: 128, padding: 16, borderRadius: 16, backgroundColor: tw.slate50, fontSize: 14, color: tw.slate900, ...poppins(400) },
  submit: { height: 48, borderRadius: 16, backgroundColor: tw.red500, alignItems: 'center', justifyContent: 'center', ...shadow('0 10px 15px -3px #FFC9C9, 0 4px 6px -4px #FFC9C9') },
  submitText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
});
