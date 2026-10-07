import { useCallback, useEffect, useState } from 'react';
import { AppState, FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeft, Calendar, Clock, MapPin, Star, Users, Utensils, X } from 'lucide-react-native';
import { diningAPI } from '../../api/food';
import Image from '../../components/Img';
import Loader from '../../components/Loader';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { events } from '../../lib/events';
import { toast } from '../../lib/notify';
import { navigateTo } from '../../lib/webRouter';
import { Button, EmptyState, IconButton, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { formatBookingAddress, formatShortDate, useNavClearance } from '../components/dining/TableShared';

const getStatusLabel = (status) => {
  const key = String(status || '').toLowerCase();
  if (key === 'pending') return 'Awaiting approval';
  if (key === 'accepted' || key === 'confirmed') return 'Confirmed';
  if (key === 'checked-in') return 'Checked-in';
  if (key === 'completed') return 'Completed';
  if (key === 'cancelled') return 'Cancelled';
  return String(status || 'unknown');
};

/** Booking status → design-system tone (DESIGN_SYSTEM.md state table). */
const getStatusTone = (status) => {
  const key = String(status || '').toLowerCase();
  if (key === 'pending') return 'warning';
  if (key === 'accepted' || key === 'confirmed' || key === 'checked-in') return 'info';
  if (key === 'completed') return 'success';
  if (key === 'cancelled') return 'danger';
  return 'neutral';
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
    <Dialog visible onClose={onClose} backdrop={color.overlay} blur={8} panelStyle={styles.modal}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHead}>
          <Text style={styles.modalTitle}>Review your experience</Text>
          <IconButton icon={X} label="Close" onPress={onClose} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.xl, gap: space.xl }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.how}>How was your visit to {booking.restaurant?.name}?</Text>
            <View style={{ flexDirection: 'row', gap: space.xs }} accessibilityRole="radiogroup">
              {[1, 2, 3, 4, 5].map((star) => (
                <Press
                  key={star}
                  scale={0.9}
                  onPress={() => setRating(star)}
                  accessibilityLabel={`${star} star`}
                  accessibilityState={{ selected: star === rating }}
                  style={styles.star}
                >
                  <Star size={36} color={star <= rating ? color.gold : color.borderStrong} fill={star <= rating ? color.gold : 'none'} />
                </Press>
              ))}
            </View>
          </View>
          <View style={{ gap: space.xs }}>
            <Text style={styles.feedback}>Share your feedback</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Write about the food, service, and atmosphere..."
              placeholderTextColor={color.textMuted}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Share your feedback"
              style={styles.textarea}
            />
          </View>
          <Button title={submitting ? 'Submitting...' : 'Submit review'} loading={submitting} onPress={handleSubmit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Dialog>
  );
}

function Chip({ icon: Icon, children }) {
  return (
    <View style={styles.chip}>
      <Icon size={14} color={color.textSecondary} />
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

  const renderBooking = ({ item: booking }) => {
    const image = booking.restaurant?.image || booking.restaurant?.profileImage?.url || '';
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.thumb}>
            {image ? <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Utensils size={24} color={color.textDisabled} />}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
            <Text style={styles.name} numberOfLines={2}>
              {booking.restaurant?.name}
            </Text>
            <StatusBadge label={getStatusLabel(booking.status)} tone={getStatusTone(booking.status)} />
            <View style={[styles.row, { gap: space.xs, alignItems: 'flex-start' }]}>
              <MapPin size={14} color={color.textMuted} style={{ marginTop: 2 }} />
              <Text style={styles.addr} numberOfLines={2}>
                {formatBookingAddress(booking.restaurant?.location)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.row, { gap: space.sm, flexWrap: 'wrap' }]}>
          <Chip icon={Calendar}>{formatShortDate(booking.date) || 'Invalid Date'}</Chip>
          <Chip icon={Clock}>{booking.timeSlot}</Chip>
          <Chip icon={Users}>{booking.guests} Guests</Chip>
        </View>

        {booking.status === 'completed' ? <Button title="Rate & review" icon={Star} variant="secondary" size="sm" onPress={() => setSelectedBooking(booking)} style={{ minHeight: 44 }} /> : null}
      </View>
    );
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Back" variant="soft" onPress={goBack} />
        <Text style={styles.title} accessibilityRole="header">
          My table bookings
        </Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(booking, i) => String(booking._id ?? i)}
        renderItem={renderBooking}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl + clearance, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            icon={Utensils}
            title="No bookings yet"
            message="Book your favorite restaurant for a great dining experience!"
            actionLabel="Book a table"
            onAction={() => navigateTo('/dining')}
          />
        }
      />

      {selectedBooking ? <ReviewModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} onSubmit={handleReviewSubmit} /> : null}
    </View>
  );
}

const Separator = () => <View style={{ height: space.md }} />;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  row: { flexDirection: 'row', alignItems: 'center' },
  header: { backgroundColor: color.surface, paddingHorizontal: space.lg, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  title: { flex: 1, ...type.heading, color: color.text },
  card: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.lg, borderWidth: 1, borderColor: color.border, gap: space.md, ...elevation.card },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  thumb: { width: 72, height: 72, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  name: { ...type.subheading, color: color.text },
  addr: { flex: 1, ...type.small, color: color.textMuted },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: color.surfaceMuted, paddingHorizontal: space.sm + 2, height: 28, borderRadius: radii.pill },
  chipText: { ...type.caption, color: color.textSecondary },
  modal: { width: 380, maxWidth: '92%', maxHeight: '90%', backgroundColor: color.surface, borderRadius: radii.xl, overflow: 'hidden', ...elevation.float },
  modalHead: { paddingLeft: space.xl, paddingRight: space.sm, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  modalTitle: { flex: 1, ...type.heading, color: color.text },
  how: { ...type.body, color: color.textSecondary, marginBottom: space.md, textAlign: 'center' },
  star: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  feedback: { ...type.label, color: color.text },
  textarea: { height: 128, padding: space.md, borderRadius: radii.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...type.body, color: color.text },
});
