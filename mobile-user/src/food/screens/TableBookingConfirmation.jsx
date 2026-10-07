import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeft, Calendar, ChevronRight, Clock, Edit2, MapPin, MessageSquarePlus, Users, X } from 'lucide-react-native';
import { authAPI, diningAPI } from '../../api/food';
import Loader from '../../components/Loader';
import { Dialog } from '../../components/kit';
import { toast } from '../../lib/notify';
import { readJson, sessionStore } from '../../lib/storage';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { Button, Card, IconButton, SectionHeader } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { BOOKING_DRAFT_KEY, formatBookingAddress, formatShortDate, useNavClearance } from '../components/dining/TableShared';

const TERMS = [
  'Please arrive 15 minutes prior to your reservation time.',
  'Booking valid for the specified number of guests entered during reservation',
  'Cover charges upon entry are subject to the discretion of the restaurant',
  'House rules are to be observed at all times',
  "Special requests will be accommodated at the restaurant's discretion",
  "Additional service charges on the bill are at the restaurant's discretion",
];

/** Section title above a card (heritage SectionHeader). */
function SectionRule({ label }) {
  return <SectionHeader title={label} style={{ marginBottom: space.sm }} />;
}

export default function TableBookingConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const goBack = useAppBackNavigation();
  const clearance = useNavClearance();

  const fallbackDraft = useMemo(() => readJson(sessionStore, BOOKING_DRAFT_KEY, null), []);
  const resolvedState = location.state || fallbackDraft || {};
  const { restaurant, guests, date, timeSlot, discount } = resolvedState;

  const [specialRequest, setSpecialRequest] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [tempRequest, setTempRequest] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  useEffect(() => {
    if (!restaurant) {
      navigate('/food/user/dining');
      return;
    }
    let cancelled = false;
    const fetchUser = async () => {
      try {
        const response = await authAPI.getCurrentUser();
        if (response.data.success) {
          const userData = response?.data?.data?.user || response?.data?.data || response?.data?.user || null;
          if (!cancelled) setUser(userData);
        }
      } catch {
        // ProtectedRoute handles a signed-out user
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [restaurant, navigate]);

  const handleBooking = async () => {
    try {
      setBookingInProgress(true);
      const restaurantId = restaurant?._id || restaurant?.id || restaurant?.restaurant?._id || restaurant?.restaurant?.id || restaurant?.restaurantId || null;
      if (!restaurantId) {
        toast.error('Unable to proceed. Restaurant ID is missing.');
        return;
      }
      const response = await diningAPI.createBooking({ restaurant: restaurantId, restaurantRef: restaurant, userRef: user, guests, date, timeSlot, specialRequest });
      if (response.data.success) {
        toast.success('Table booked successfully!');
        sessionStore.removeItem(BOOKING_DRAFT_KEY);
        navigate('/food/user/dining/book-success', { state: { booking: response.data.data } });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to confirm booking');
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) return <Loader />;

  const formattedDate = formatShortDate(date) || 'Today';
  const toBooking = (extra) => ({ restaurant, guests, date, timeSlot, discount, ...extra });

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Back" variant="soft" onPress={goBack} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            Confirm booking
          </Text>
        </View>
      </View>
      <View style={styles.notice}>
        <Clock size={18} color={color.info} />
        <Text style={styles.noticeText}>Reach the restaurant 15 minutes before your booking time for a hassle-free experience</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 112 + clearance, gap: space.md }}>
        <Card padded={false}>
          <View style={{ padding: space.lg, gap: space.lg }}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: color.primarySoft }]}>
                <Calendar size={20} color={color.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.strong}>
                  {formattedDate} at {timeSlot}
                </Text>
                <View style={[styles.row, { gap: space.xs, marginTop: space.xxs }]}>
                  <Users size={16} color={color.textMuted} />
                  <Text style={styles.muted14}>{guests} guests</Text>
                </View>
              </View>
            </View>
            <View style={[styles.row, styles.dashed]}>
              <View style={[styles.iconBox, { backgroundColor: color.goldSoft }]}>
                <MapPin size={20} color={color.goldText} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.strong} numberOfLines={2}>
                  {restaurant?.name}
                </Text>
                <Text style={styles.addr} numberOfLines={2}>
                  {formatBookingAddress(restaurant?.location)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <Card
          padded={false}
          onPress={() => {
            setTempRequest(specialRequest);
            setShowRequestModal(true);
          }}
          accessibilityLabel={specialRequest ? 'Edit special request' : 'Add special request'}
          style={styles.reqRow}
        >
          <View style={[styles.iconBox, { backgroundColor: specialRequest ? color.primarySoft : color.surfaceMuted }]}>
            <MessageSquarePlus size={20} color={specialRequest ? color.primary : color.textSecondary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.reqTitle}>{specialRequest ? 'Special request added' : 'Add special request'}</Text>
            {specialRequest ? (
              <Text style={styles.reqSub} numberOfLines={2}>
                {specialRequest}
              </Text>
            ) : null}
          </View>
          {specialRequest ? <Text style={styles.edit}>Edit</Text> : null}
          <ChevronRight size={20} color={color.textDisabled} />
        </Card>

        <View style={{ paddingTop: space.md }}>
          <SectionRule label="Guest preferences" />
          <Card
            padded={false}
            onPress={() => {
              const targetSlug = restaurant?.slug || restaurant?._id || restaurant?.id || 'restaurant';
              navigate(`/food/user/dining/book/${targetSlug}`, {
                state: toBooking({ guestCount: guests, selectedDate: date, selectedTime: timeSlot, isModifying: true, backTo: '/food/user/dining/book-confirmation' }),
              });
            }}
            accessibilityLabel="Modify booking"
            style={styles.reqRow}
          >
            <View style={[styles.iconBox, { backgroundColor: color.primarySoft }]}>
              <Edit2 size={20} color={color.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.modTitle}>Modification available</Text>
              <Text style={styles.modSub}>Valid till {timeSlot}, today</Text>
            </View>
            <ChevronRight size={20} color={color.textDisabled} />
          </Card>
        </View>

        <View style={{ paddingTop: space.md }}>
          <SectionRule label="Your details" />
          <Card style={styles.detailsRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.strong} numberOfLines={1}>
                {user?.name || 'Shailu'}
              </Text>
              <Text style={styles.detailSub} numberOfLines={1}>
                {user?.phone || user?.email || '8090512291'}
              </Text>
            </View>
            <Button
              title="Edit"
              variant="ghost"
              size="sm"
              fullWidth={false}
              accessibilityLabel="Edit your details"
              style={{ minHeight: 44 }}
              onPress={() => navigate('/food/user/dining/edit-user', { state: toBooking({ specialRequest, user }) })}
            />
          </Card>
        </View>

        <View style={{ paddingTop: space.md }}>
          <SectionRule label="Terms and conditions" />
          <Card style={{ gap: space.md }}>
            {TERMS.map((term) => (
              <View key={term} style={{ flexDirection: 'row', gap: space.md }}>
                <View style={styles.bullet} />
                <Text style={styles.term}>{term}</Text>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: space.md + clearance }]}>
        <Button
          title={bookingInProgress ? 'Confirming...' : 'Confirm your seat'}
          size="lg"
          onPress={handleBooking}
          loading={bookingInProgress}
          accessibilityLabel="Confirm your seat"
        />
      </View>

      <Dialog visible={showRequestModal} onClose={() => setShowRequestModal(false)} backdrop={color.overlay} blur={8} panelStyle={styles.modalPanel}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Special request</Text>
            <IconButton icon={X} label="Close" variant="soft" size={40} iconSize={18} onPress={() => setShowRequestModal(false)} />
          </View>
          <Text style={styles.modalBody}>Let the restaurant know if you have any allergies or special requirements (e.g. Birthday, Anniversary).</Text>
          <Text style={styles.label}>Your request</Text>
          <TextInput
            value={tempRequest}
            onChangeText={setTempRequest}
            placeholder="E.g. I have a peanut allergy, or we are celebrating a birthday..."
            placeholderTextColor={color.textMuted}
            multiline
            autoFocus
            textAlignVertical="top"
            accessibilityLabel="Special request"
            style={styles.textarea}
          />
          <View style={styles.modalBtns}>
            <Button title="Cancel" variant="outline" onPress={() => setShowRequestModal(false)} style={{ flex: 1 }} />
            <Button
              title="Save"
              onPress={() => {
                setSpecialRequest(tempRequest);
                setShowRequestModal(false);
              }}
              style={{ flex: 1 }}
            />
          </View>
        </KeyboardAvoidingView>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: color.surface },
  headerTitle: { ...type.heading, color: color.text },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: color.infoSoft },
  noticeText: { flex: 1, ...type.small, color: color.info },
  iconBox: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  strong: { ...type.subheading, color: color.text },
  muted14: { ...type.small, color: color.textMuted },
  addr: { ...type.small, color: color.textMuted, marginTop: space.xxs },
  dashed: { alignItems: 'flex-start', paddingTop: space.lg, borderTopWidth: 1, borderTopColor: color.border, borderStyle: 'dashed' },
  reqRow: { minHeight: 64, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  reqTitle: { ...type.bodyStrong, color: color.text },
  reqSub: { ...type.small, color: color.textMuted, marginTop: space.xxs },
  edit: { ...type.label, color: color.primary },
  modTitle: { ...type.bodyStrong, color: color.text },
  modSub: { ...type.caption, color: color.textMuted },
  detailsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  detailSub: { ...type.small, color: color.textMuted, marginTop: space.xxs },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.gold, marginTop: 8 },
  term: { flex: 1, ...type.small, color: color.textSecondary },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50, backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.md, ...elevation.sheet },
  modalPanel: { width: 360, maxWidth: '92%', backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xl, ...elevation.float },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  modalTitle: { ...type.heading, color: color.text },
  modalBody: { ...type.small, color: color.textSecondary, marginBottom: space.lg },
  label: { ...type.label, color: color.text, marginBottom: space.xs },
  textarea: { height: 128, padding: space.md, borderRadius: radii.md, backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.primary, ...type.body, color: color.text },
  modalBtns: { flexDirection: 'row', gap: space.md, paddingTop: space.xl },
});
