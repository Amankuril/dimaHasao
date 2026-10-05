import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { diningAPI, restaurantAPI } from '../../api/food';
import Loader from '../../components/Loader';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { sessionStore } from '../../lib/storage';
import { useLocation, useNavigate, useParams } from '../../lib/webRouter';
import { poppins, shadow, tw } from '../../theme';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { F } from '../components/shell';
import { BOOKING_DRAFT_KEY, gridCell, useNavClearance } from '../components/dining/TableShared';

const buildDates = (count = 7) =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });

const formatTimeValue = (value) => {
  if (!value) return null;
  if (/[ap]m/i.test(value)) return value.toUpperCase();
  const date = new Date(`2000-01-01T${String(value).padStart(5, '0')}`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const parseTimeToMinutes = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  const hhmmMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) return Number(hhmmMatch[1]) * 60 + Number(hhmmMatch[2]);
  const meridiemMatch = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!meridiemMatch) return null;
  let hour = Number(meridiemMatch[1]);
  const minute = Number(meridiemMatch[2] || 0);
  const meridiem = meridiemMatch[3].toUpperCase();
  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
};

const getDayName = (date) => date.toLocaleDateString('en-US', { weekday: 'long' });

const buildSlots = (timing) => {
  if (!timing || timing.isOpen === false) return [];
  const opening = parseTimeToMinutes(timing.openingTime);
  let closing = parseTimeToMinutes(timing.closingTime);
  if (opening === null || closing === null) return [];
  // Closing earlier than opening means it runs past midnight.
  if (closing <= opening) closing += 24 * 60;
  const slots = [];
  let cursor = opening;
  while (cursor <= closing) {
    const hours = Math.floor((cursor % (24 * 60)) / 60);
    const minutes = cursor % 60;
    slots.push(formatTimeValue(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`));
    cursor += 30;
  }
  return slots;
};

const buildFallbackTiming = (restaurant) => ({
  isOpen: true,
  openingTime: String(restaurant?.openingTime || restaurant?.diningSettings?.openingTime || '12:00').trim(),
  closingTime: String(restaurant?.closingTime || restaurant?.diningSettings?.closingTime || '23:00').trim(),
});

const getMealPeriod = (slot) => {
  if (!slot) return 'all';
  const match = String(slot).toUpperCase().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
  if (!match) return 'all';
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (match[3] === 'PM' && hour !== 12) hour += 12;
  if (match[3] === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute < 17 * 60 ? 'lunch' : 'dinner';
};

const getOfferLabel = (slot) => (getMealPeriod(slot) === 'lunch' ? 'Lunch' : 'Carnival');

const PINK = '#ef8f98';
const CORAL = '#d64f63';

export default function TableBooking() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const goBack = useAppBackNavigation();
  const { width } = useWindowDimensions();
  const clearance = useNavClearance();
  const routeRestaurant = location.state?.restaurant || null;

  const [restaurant, setRestaurant] = useState(routeRestaurant);
  const [loading, setLoading] = useState(!routeRestaurant);
  const [outletTimings, setOutletTimings] = useState({});
  const [selectedGuests, setSelectedGuests] = useState(location.state?.guestCount || 2);
  const [selectedDate, setSelectedDate] = useState(() => {
    const initial = location.state?.selectedDate ? new Date(location.state.selectedDate) : new Date();
    return Number.isNaN(initial.getTime()) ? new Date() : initial;
  });
  const [selectedSlot, setSelectedSlot] = useState(location.state?.selectedTime || null);
  const [selectedMealPeriod, setSelectedMealPeriod] = useState('lunch');
  const [currentBookings, setCurrentBookings] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time update for slots filtering
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchRestaurant = async () => {
      try {
        setLoading(true);
        const response = await diningAPI.getRestaurantBySlug(slug);
        if (response?.data?.success) {
          const apiRestaurant = response?.data?.data?.restaurant || response?.data?.data;
          if (cancelled) return;
          setRestaurant(apiRestaurant || null);
          const restaurantId = apiRestaurant?._id || apiRestaurant?.id || slug;
          try {
            const bookingsRes = await diningAPI.getRestaurantBookings(apiRestaurant);
            if (!cancelled && bookingsRes.data.success) setCurrentBookings(Array.isArray(bookingsRes.data.data) ? bookingsRes.data.data : []);
          } catch {
            // availability stays unknown
          }
          const timingsResponse = await restaurantAPI.getOutletTimingsByRestaurantId(restaurantId);
          if (!cancelled) setOutletTimings(timingsResponse?.data?.data?.outletTimings || {});
        }
      } catch {
        if (!cancelled) setRestaurant(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (routeRestaurant) {
      const restaurantId = routeRestaurant?._id || routeRestaurant?.id || slug;
      restaurantAPI
        .getOutletTimingsByRestaurantId(restaurantId)
        .then((response) => !cancelled && setOutletTimings(response?.data?.data?.outletTimings || {}))
        .catch(() => !cancelled && setOutletTimings({}));
      // Still fetch bookings even if restaurant is in state
      diningAPI
        .getRestaurantBookings(routeRestaurant)
        .then((res) => {
          if (!cancelled && res.data.success) setCurrentBookings(Array.isArray(res.data.data) ? res.data.data : []);
        })
        .catch(() => {});
      setLoading(false);
    } else {
      fetchRestaurant();
    }
    return () => {
      cancelled = true;
    };
  }, [routeRestaurant, slug]);

  const occupiedSeats = useMemo(() => {
    const now = new Date();
    const THIRTY_MINUTES = 30 * 60 * 1000;
    return currentBookings
      .filter((b) => {
        const isApproved = b.status === 'approved' || b.status === 'accepted' || b.status === 'confirmed';
        if (isApproved) return true;
        if (b.status === 'pending') return now - new Date(b.createdAt || b.date) < THIRTY_MINUTES;
        return false;
      })
      .reduce((sum, b) => sum + (Number(b.guests) || 0), 0);
  }, [currentBookings]);

  const maxCapacity = restaurant?.diningSettings?.maxGuests || 10;
  const remainingSeats = Math.max(0, maxCapacity - occupiedSeats);

  const dates = useMemo(() => buildDates(7), []);
  const selectedDayTiming = useMemo(() => {
    const fromOutletTimings = outletTimings?.[getDayName(selectedDate)] || null;
    if (fromOutletTimings && fromOutletTimings.isOpen !== false) return fromOutletTimings;
    return buildFallbackTiming(restaurant);
  }, [outletTimings, selectedDate, restaurant]);
  const allSlots = useMemo(() => buildSlots(selectedDayTiming), [selectedDayTiming]);

  const availableSlots = useMemo(() => {
    const isToday = selectedDate.toDateString() === currentTime.toDateString();
    if (!isToday) return allSlots;
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const buffer = 15; // at least 15 minutes ahead
    return allSlots.filter((slot) => parseTimeToMinutes(slot) > currentMinutes + buffer);
  }, [allSlots, selectedDate, currentTime]);

  const filteredSlots = useMemo(() => availableSlots.filter((slot) => getMealPeriod(slot) === selectedMealPeriod), [availableSlots, selectedMealPeriod]);

  useEffect(() => {
    if (!selectedSlot && filteredSlots.length > 0) {
      setSelectedSlot(filteredSlots[0]);
      return;
    }
    if (selectedSlot && filteredSlots.length > 0 && !filteredSlots.includes(selectedSlot)) {
      setSelectedSlot(filteredSlots[0]);
      return;
    }
    if (filteredSlots.length === 0) setSelectedSlot(null);
  }, [filteredSlots, selectedSlot]);

  useEffect(() => {
    if (availableSlots.length === 0) return;
    const hasLunch = availableSlots.some((slot) => getMealPeriod(slot) === 'lunch');
    const hasDinner = availableSlots.some((slot) => getMealPeriod(slot) === 'dinner');
    if (selectedMealPeriod === 'lunch' && !hasLunch && hasDinner) setSelectedMealPeriod('dinner');
    if (selectedMealPeriod === 'dinner' && !hasDinner && hasLunch) setSelectedMealPeriod('lunch');
  }, [availableSlots, selectedMealPeriod]);

  if (loading) return <Loader />;
  if (!restaurant) return <Text style={styles.notFound}>Restaurant not found</Text>;

  const isDiningEnabled = restaurant?.diningSettings?.isEnabled !== false;
  const canProceed = Boolean(isDiningEnabled && restaurant && selectedSlot && selectedDate && selectedGuests);

  const handleProceed = () => {
    if (!isDiningEnabled) {
      toast.error('Dining bookings are currently paused for this restaurant.');
      return;
    }
    if (!canProceed) {
      toast.error('Please select date, time, and guests to continue.');
      return;
    }
    const bookingDraft = {
      restaurant: {
        _id: restaurant?._id || restaurant?.id || restaurant?.restaurant?._id || restaurant?.restaurant?.id || null,
        id: restaurant?.id || restaurant?._id || restaurant?.restaurant?.id || restaurant?.restaurant?._id || null,
        name: restaurant?.name || restaurant?.restaurantName || 'Restaurant',
        restaurantName: restaurant?.restaurantName || restaurant?.name || 'Restaurant',
        profileImage: restaurant?.profileImage || restaurant?.restaurant?.profileImage || null,
        image: restaurant?.image || restaurant?.restaurant?.image || restaurant?.profileImage?.url || '',
        location: restaurant?.location || restaurant?.restaurant?.location || null,
        slug: restaurant?.slug || slug || '',
        diningSettings: restaurant?.diningSettings || restaurant?.restaurant?.diningSettings || null,
      },
      guests: selectedGuests,
      date: selectedDate,
      timeSlot: selectedSlot,
      discount: selectedSlot,
    };
    try {
      sessionStore.setItem(BOOKING_DRAFT_KEY, JSON.stringify(bookingDraft));
    } catch {
      // draft is a convenience
    }
    navigate('/food/user/dining/book-confirmation', { state: bookingDraft });
  };

  const inner = Math.min(width, 448) - 32; // max-w-md px-4
  const cardInner = inner - 32; // p-4
  const guestCell = gridCell(cardInner, 5, 8);
  const dateCell = gridCell(cardInner, 3, 12);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 + clearance }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#ffe7c6', '#fff1d7', '#f5f6fb']} style={styles.hero}>
          <LinearGradient colors={['rgba(255,255,255,0.65)', 'rgba(255,255,255,0)']} style={styles.heroGlow} pointerEvents="none" />
          <Press scale={0.95} onPress={goBack} accessibilityLabel="Back" style={styles.back}>
            <ArrowLeft size={20} color="#383838" />
          </Press>
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={styles.h1}>Book a table</Text>
            <Text style={styles.sub}>{restaurant.name || restaurant.restaurantName}</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {!isDiningEnabled ? (
            <View style={[styles.card, styles.paused]}>
              <Text style={styles.pausedTitle}>Dining bookings are paused by this restaurant.</Text>
              <Text style={styles.pausedBody}>You can still view details, but new table bookings are disabled right now.</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Select number of guests</Text>
              <Text style={styles.left}>{remainingSeats} left</Text>
            </View>
            <View style={styles.grid}>
              {Array.from({ length: maxCapacity }, (_, index) => {
                const count = index + 1;
                const isBooked = count <= occupiedSeats;
                const isTooLarge = count > remainingSeats && !isBooked;
                const selected = selectedGuests === count;
                return (
                  <Press
                    key={count}
                    scale={1}
                    disabled={isBooked || isTooLarge}
                    onPress={() => setSelectedGuests(count)}
                    style={[
                      styles.guest,
                      { width: guestCell },
                      selected ? styles.guestOn : isBooked ? styles.guestBooked : isTooLarge ? styles.guestLarge : null,
                    ]}
                  >
                    <Text style={[styles.guestText, selected ? { color: CORAL } : isBooked ? { color: 'rgba(185,28,28,0.3)' } : isTooLarge ? { color: 'rgba(55,65,81,0.2)' } : null]}>
                      {isBooked ? 'X' : count}
                    </Text>
                  </Press>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select date</Text>
            <View style={[styles.grid, { marginTop: 16, gap: 12 }]}>
              {dates.slice(0, 3).map((date, index) => {
                const active = sameDay(selectedDate, date);
                return (
                  <Press key={date.toISOString()} scale={1} onPress={() => setSelectedDate(date)} style={[styles.dateBtn, { width: dateCell }, active ? styles.pinkOn : null]}>
                    <Text style={styles.dateTop} numberOfLines={1}>
                      {index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : date.toLocaleDateString('en-IN', { weekday: 'long' })}
                    </Text>
                    <Text style={styles.dateSub}>{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                  </Press>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select time of day</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              {[
                { id: 'lunch', label: 'Lunch' },
                { id: 'dinner', label: 'Dinner' },
              ].map((period) => {
                const active = selectedMealPeriod === period.id;
                return (
                  <Press key={period.id} scale={1} onPress={() => setSelectedMealPeriod(period.id)} style={[styles.period, active ? { borderColor: PINK, backgroundColor: '#fff' } : null]}>
                    <Text style={[styles.periodText, active ? { color: CORAL } : null]}>{period.label}</Text>
                  </Press>
                );
              })}
            </View>

            <View style={[styles.grid, { marginTop: 16, gap: 12 }]}>
              {filteredSlots.length === 0 ? (
                <View style={styles.noSlots}>
                  <Text style={styles.noSlotsText}>No {selectedMealPeriod} slots available for the selected date.</Text>
                </View>
              ) : (
                filteredSlots.map((slot) => {
                  const active = selectedSlot === slot;
                  return (
                    <Press key={slot} scale={1} onPress={() => setSelectedSlot(slot)} style={[styles.slot, { width: dateCell }, active ? styles.pinkOn : null]}>
                      <Text style={styles.slotTop}>{slot}</Text>
                      <Text style={styles.slotSub}>{getOfferLabel(slot)}</Text>
                    </Press>
                  );
                })
              )}
            </View>
          </View>

          <View style={[styles.card, { borderRadius: 18, paddingVertical: 20, alignItems: 'center' }]}>
            <Text style={styles.hint}>Select your preferred time slot to view available booking options</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + clearance }]}>
        <View style={{ width: '100%', maxWidth: 448, alignSelf: 'center' }}>
          <Press scale={0.98} disabled={!canProceed} onPress={handleProceed} accessibilityLabel="Proceed" style={styles.ctaWrap}>
            {canProceed ? (
              <LinearGradient colors={[F.green, '#7f1010']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
                <Text style={styles.ctaText}>Proceed to confirmation</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.cta, { backgroundColor: '#a4abba' }]}>
                <Text style={[styles.ctaText, { opacity: 0.95 }]}>{!isDiningEnabled ? 'Dining paused' : 'Select a time slot to proceed'}</Text>
              </View>
            )}
          </Press>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f5f6fb' },
  notFound: { padding: 24, textAlign: 'center', fontSize: 16, color: tw.gray900, ...poppins(400) },
  hero: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40, overflow: 'hidden' },
  heroGlow: { position: 'absolute', left: 0, right: 0, top: 0, height: 96 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  h1: { fontSize: 30, lineHeight: 36, letterSpacing: -0.75, color: '#25314a', ...poppins(900) },
  sub: { marginTop: 4, fontSize: 14, lineHeight: 20, color: '#636363', ...poppins(500) },
  body: { width: '100%', maxWidth: 448, alignSelf: 'center', marginTop: -16, paddingHorizontal: 16, gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 16, ...shadow('0 8px 24px rgba(15,23,42,0.06)') },
  paused: { backgroundColor: tw.amber50, borderWidth: 1, borderColor: tw.amber200 },
  pausedTitle: { fontSize: 14, lineHeight: 20, color: tw.amber900, ...poppins(600) },
  pausedBody: { marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.amber800, ...poppins(400) },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  cardTitle: { fontSize: 14, lineHeight: 20, color: '#2f3545', ...poppins(500) },
  left: { fontSize: 12, lineHeight: 16, color: F.green, backgroundColor: '#fdfafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', ...poppins(700) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  guest: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#ececf2', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  guestOn: { borderColor: PINK, backgroundColor: '#fffaf9', ...shadow('sm') },
  guestBooked: { borderColor: 'rgba(127,29,29,0.2)', backgroundColor: 'rgba(127,29,29,0.1)' },
  guestLarge: { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.05)' },
  guestText: { fontSize: 14, lineHeight: 20, color: '#444b5f', ...poppins(700) },
  dateBtn: { borderRadius: 18, borderWidth: 1, borderColor: '#ececf2', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 16, alignItems: 'center' },
  pinkOn: { borderColor: PINK, backgroundColor: '#fffaf9' },
  dateTop: { fontSize: 14, lineHeight: 20, color: '#444b5f', ...poppins(500) },
  dateSub: { marginTop: 4, fontSize: 14, lineHeight: 20, color: '#7b8191', ...poppins(400) },
  period: { borderRadius: 999, borderWidth: 1, borderColor: '#ececf2', backgroundColor: '#fafafc', paddingHorizontal: 16, paddingVertical: 8 },
  periodText: { fontSize: 14, lineHeight: 20, color: '#666f82', ...poppins(500) },
  slot: { borderRadius: 16, borderWidth: 1, borderColor: '#ececf2', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 16, alignItems: 'center' },
  slotTop: { fontSize: 14, lineHeight: 20, color: '#334155', ...poppins(500) },
  slotSub: { marginTop: 4, fontSize: 12, lineHeight: 16, color: '#2d5ea8', ...poppins(500) },
  noSlots: { width: '100%', borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: '#e5e7ef', paddingHorizontal: 16, paddingVertical: 32 },
  noSlotsText: { textAlign: 'center', fontSize: 14, lineHeight: 20, color: '#7c8394', ...poppins(400) },
  hint: { textAlign: 'center', fontSize: 14, lineHeight: 20, color: '#6f7687', ...poppins(400) },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 70, backgroundColor: '#f5f6fb', borderTopWidth: 1, borderTopColor: '#e6e7ef', paddingHorizontal: 16, paddingTop: 16 },
  ctaWrap: { borderRadius: 16, overflow: 'hidden' },
  cta: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 18, lineHeight: 28, color: '#fff', ...poppins(700) },
});
