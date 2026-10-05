import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeft, Calendar, ChevronRight, Edit2, Info, MapPin, Users } from 'lucide-react-native';
import { authAPI, diningAPI } from '../../api/food';
import Loader from '../../components/Loader';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { readJson, sessionStore } from '../../lib/storage';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { poppins, shadow, tw } from '../../theme';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { F } from '../components/shell';
import { BOOKING_DRAFT_KEY, formatBookingAddress, formatShortDate, useNavClearance } from '../components/dining/TableShared';

const TERMS = [
  'Please arrive 15 minutes prior to your reservation time.',
  'Booking valid for the specified number of guests entered during reservation',
  'Cover charges upon entry are subject to the discretion of the restaurant',
  'House rules are to be observed at all times',
  "Special requests will be accommodated at the restaurant's discretion",
  "Additional service charges on the bill are at the restaurant's discretion",
];

function SectionRule({ label }) {
  return (
    <View style={styles.rule}>
      <View style={styles.ruleLine} />
      <Text style={styles.ruleLabel}>{label.toUpperCase()}</Text>
      <View style={styles.ruleLine} />
    </View>
  );
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
        <Press scale={0.95} onPress={goBack} accessibilityLabel="Back" style={styles.headerBack} hitSlop={6}>
          <ArrowLeft size={24} color="#fff" />
        </Press>
        <Text style={styles.headerText}>Reach the restaurant 15 minutes before your booking time for a hassle-free experience</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 + clearance, gap: 16 }}>
        <View style={styles.card}>
          <View style={{ padding: 16, gap: 16 }}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: F.cream }]}>
                <Calendar size={20} color={F.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.strong}>
                  {formattedDate} at {timeSlot}
                </Text>
                <View style={[styles.row, { gap: 8, marginTop: 2 }]}>
                  <Users size={16} color={tw.gray500} />
                  <Text style={styles.muted14}>{guests} guests</Text>
                </View>
              </View>
            </View>
            <View style={[styles.row, styles.dashed]}>
              <View style={[styles.iconBox, { backgroundColor: tw.red50 }]}>
                <MapPin size={20} color={tw.red500} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.strong}>{restaurant?.name}</Text>
                <Text style={styles.addr} numberOfLines={1}>
                  {formatBookingAddress(restaurant?.location)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Press
          scale={1}
          onPress={() => {
            setTempRequest(specialRequest);
            setShowRequestModal(true);
          }}
          style={[styles.card, styles.reqRow]}
        >
          <View style={[styles.row, { flex: 1 }]}>
            <View style={[styles.iconBox, { backgroundColor: specialRequest ? tw.purple50 : tw.slate100 }]}>
              <Info size={20} color={specialRequest ? F.green : tw.slate600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reqTitle}>{specialRequest ? 'Special Request Added' : 'Add special request'}</Text>
              {specialRequest ? (
                <Text style={styles.reqSub} numberOfLines={1}>
                  {specialRequest}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.row, { gap: 8 }]}>
            {specialRequest ? <Text style={styles.edit}>EDIT</Text> : null}
            <ChevronRight size={20} color={tw.slate400} />
          </View>
        </Press>

        <View style={{ paddingTop: 16 }}>
          <SectionRule label="Guest Preferences" />
          <Press
            scale={0.98}
            onPress={() => {
              const targetSlug = restaurant?.slug || restaurant?._id || restaurant?.id || 'restaurant';
              navigate(`/food/user/dining/book/${targetSlug}`, {
                state: toBooking({ guestCount: guests, selectedDate: date, selectedTime: timeSlot, isModifying: true, backTo: '/food/user/dining/book-confirmation' }),
              });
            }}
            style={[styles.card, styles.reqRow, { marginTop: 8 }]}
          >
            <View style={[styles.row, { alignItems: 'flex-start', flex: 1 }]}>
              <View style={{ marginTop: 4 }}>
                <Edit2 size={20} color={F.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modTitle}>Modification available</Text>
                <Text style={styles.modSub}>Valid till {timeSlot}, today</Text>
              </View>
            </View>
            <ChevronRight size={16} color={tw.slate300} />
          </Press>
        </View>

        <View style={{ paddingTop: 16, gap: 12 }}>
          <SectionRule label="Your Details" />
          <View style={[styles.card, styles.detailsRow]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.strong}>{user?.name || 'Shailu'}</Text>
              <Text style={styles.detailSub}>{user?.phone || user?.email || '8090512291'}</Text>
            </View>
            <Press scale={1} onPress={() => navigate('/food/user/dining/edit-user', { state: toBooking({ specialRequest, user }) })} hitSlop={8}>
              <Text style={styles.editLink}>Edit</Text>
            </Press>
          </View>
        </View>

        <View style={{ paddingTop: 16 }}>
          <SectionRule label="Terms and Conditions" />
          <View style={[styles.card, { padding: 20, marginTop: 12, gap: 16 }]}>
            {TERMS.map((term) => (
              <View key={term} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={styles.bullet} />
                <Text style={styles.term}>{term}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + clearance }]}>
        <Press scale={0.98} onPress={handleBooking} disabled={bookingInProgress} accessibilityLabel="Confirm your seat" style={[styles.cta, bookingInProgress ? { opacity: 0.6 } : null]}>
          <Text style={styles.ctaText}>{bookingInProgress ? 'Confirming...' : 'Confirm your seat'}</Text>
        </Press>
      </View>

      <Dialog visible={showRequestModal} onClose={() => setShowRequestModal(false)} backdrop="rgba(0,0,0,0.5)" blur={8} panelStyle={styles.modalPanel}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>SPECIAL REQUEST</Text>
            <Press scale={0.95} onPress={() => setShowRequestModal(false)} accessibilityLabel="Close" style={styles.modalClose}>
              <ArrowLeft size={16} color={tw.slate500} style={{ transform: [{ rotate: '90deg' }] }} />
            </Press>
          </View>
          <Text style={styles.modalBody}>Let the restaurant know if you have any allergies or special requirements (e.g. Birthday, Anniversary).</Text>
          <TextInput
            value={tempRequest}
            onChangeText={setTempRequest}
            placeholder="E.g. I have a peanut allergy, or we are celebrating a birthday..."
            placeholderTextColor={tw.slate400}
            multiline
            autoFocus
            textAlignVertical="top"
            style={styles.textarea}
          />
          <View style={styles.modalBtns}>
            <Press scale={0.95} onPress={() => setShowRequestModal(false)} style={[styles.modalBtn, { backgroundColor: tw.slate100 }]}>
              <Text style={[styles.modalBtnText, { color: tw.slate600 }]}>CANCEL</Text>
            </Press>
            <Press
              scale={0.95}
              onPress={() => {
                setSpecialRequest(tempRequest);
                setShowRequestModal(false);
              }}
              style={[styles.modalBtn, { backgroundColor: F.green }, shadow('0 10px 15px -3px #FFC9C9, 0 4px 6px -4px #FFC9C9')]}
            >
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>SAVE</Text>
            </Press>
          </View>
        </KeyboardAvoidingView>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tw.slate50 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  header: { backgroundColor: F.green, paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow('md') },
  headerBack: { padding: 4, borderRadius: 999 },
  headerText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, overflow: 'hidden', ...shadow('sm') },
  iconBox: { padding: 8, borderRadius: 12 },
  strong: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  muted14: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  addr: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 2, ...poppins(400) },
  dashed: { alignItems: 'flex-start', paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.slate100, borderStyle: 'dashed' },
  reqRow: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reqTitle: { fontSize: 16, lineHeight: 24, color: tw.gray700, ...poppins(700) },
  reqSub: { fontSize: 12, lineHeight: 16, color: tw.slate500, marginTop: 2, ...poppins(500) },
  edit: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: 'rgba(10,77,43,0.4)', ...poppins(900) },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  ruleLine: { flex: 1, height: 1, backgroundColor: tw.slate200 },
  ruleLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate400, ...poppins(700) },
  modTitle: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...poppins(700) },
  modSub: { fontSize: 12, lineHeight: 16, color: tw.slate400, ...poppins(400) },
  detailsRow: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailSub: { fontSize: 14, lineHeight: 20, color: tw.slate400, marginTop: 4, ...poppins(400) },
  editLink: { fontSize: 14, lineHeight: 20, color: tw.red500, ...poppins(700) },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: tw.slate300, marginTop: 8 },
  term: { flex: 1, fontSize: 12, lineHeight: 19.5, color: tw.slate600, ...poppins(500) },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.slate100, paddingHorizontal: 16, paddingTop: 16 },
  cta: { height: 56, borderRadius: 16, backgroundColor: F.green, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 18, lineHeight: 28, color: '#fff', ...poppins(700) },
  modalPanel: { width: 340, maxWidth: '92%', backgroundColor: '#fff', borderRadius: 24, padding: 24, ...shadow('2xl') },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, lineHeight: 28, letterSpacing: -0.45, color: tw.gray900, ...poppins(900) },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  modalBody: { fontSize: 14, lineHeight: 22.75, color: tw.slate500, marginBottom: 16, ...poppins(400) },
  textarea: { height: 128, padding: 16, borderRadius: 16, backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate200, fontSize: 14, color: tw.gray900, ...poppins(500) },
  modalBtns: { flexDirection: 'row', gap: 12, paddingTop: 20 },
  modalBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 14, letterSpacing: 1.4, ...poppins(700) },
});
