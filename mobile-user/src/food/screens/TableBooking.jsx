import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ArrowLeft, CalendarDays, Clock, Info, Minus, PauseCircle, Plus, UtensilsCrossed, Users } from 'lucide-react-native';
import { diningAPI, restaurantAPI } from '../../api/food';
import Loader from '../../components/Loader';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { sessionStore } from '../../lib/storage';
import { useLocation, useNavigate, useParams } from '../../lib/webRouter';
import { Button, Card, EmptyState, IconButton, SegmentedControl, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
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

function CardTitle({ icon: Icon, title, right }) {
  return (
    <View style={styles.cardHead}>
      <View style={styles.cardHeadLeft}>
        <Icon size={18} color={color.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

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
  if (!restaurant)
    return (
      <View style={[styles.page, { justifyContent: 'center' }]}>
        <EmptyState icon={UtensilsCrossed} title="Restaurant not found" actionLabel="Go back" onAction={goBack} />
      </View>
    );

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

  const inner = Math.min(width, 448) - space.lg * 2;
  const cardInner = inner - space.lg * 2 - 2; // card padding + border
  const dateCell = gridCell(cardInner, 3, space.sm);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();

  // Guest stepper: the same choices the guest grid allowed (not booked, not over the remaining seats).
  const guestAllowed = (count) => count >= 1 && count <= maxCapacity && !(count <= occupiedSeats) && !(count > remainingSeats);
  const guestOptions = Array.from({ length: maxCapacity }, (_, index) => index + 1).filter(guestAllowed);
  const prevGuests = [...guestOptions].reverse().find((count) => count < selectedGuests);
  const nextGuests = guestOptions.find((count) => count > selectedGuests);
  const dateLabel = (date, index) => (index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : date.toLocaleDateString('en-IN', { weekday: 'long' }));
  const selectedDateIndex = dates.slice(0, 3).findIndex((date) => sameDay(selectedDate, date));
  const summary = [
    `${selectedGuests} ${selectedGuests === 1 ? 'guest' : 'guests'}`,
    selectedDateIndex >= 0 ? dateLabel(selectedDate, selectedDateIndex) : selectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    selectedSlot,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <View style={styles.page}>
      <View style={styles.top}>
        <IconButton icon={ArrowLeft} label="Back" variant="soft" onPress={goBack} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.h1} accessibilityRole="header">
            Book a table
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {restaurant.name || restaurant.restaurantName}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 + clearance }} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {!isDiningEnabled ? (
            <View style={styles.paused}>
              <PauseCircle size={20} color={color.warning} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.pausedTitle}>Dining bookings are paused by this restaurant.</Text>
                <Text style={styles.pausedBody}>You can still view details, but new table bookings are disabled right now.</Text>
              </View>
            </View>
          ) : null}

          <Card>
            <CardTitle icon={Users} title="Select number of guests" right={<StatusBadge label={`${remainingSeats} left`} tone={remainingSeats > 0 ? 'primary' : 'danger'} />} />
            <View style={styles.stepper}>
              <IconButton
                icon={Minus}
                label="Fewer guests"
                variant="primary"
                disabled={prevGuests == null}
                onPress={() => prevGuests != null && setSelectedGuests(prevGuests)}
              />
              <View style={{ alignItems: 'center', minWidth: 96 }} accessibilityLiveRegion="polite">
                <Text style={styles.stepValue}>{selectedGuests}</Text>
                <Text style={styles.stepLabel}>{selectedGuests === 1 ? 'guest' : 'guests'}</Text>
              </View>
              <IconButton
                icon={Plus}
                label="More guests"
                variant="primary"
                disabled={nextGuests == null}
                onPress={() => nextGuests != null && setSelectedGuests(nextGuests)}
              />
            </View>
            <Text style={styles.stepHint}>
              {occupiedSeats > 0 ? `${occupiedSeats} of ${maxCapacity} seats are already booked. ` : ''}
              {`Up to ${remainingSeats} ${remainingSeats === 1 ? 'guest' : 'guests'} can book now.`}
            </Text>
          </Card>

          <Card>
            <CardTitle icon={CalendarDays} title="Select date" />
            <View style={styles.grid}>
              {dates.slice(0, 3).map((date, index) => {
                const active = sameDay(selectedDate, date);
                return (
                  <Press
                    key={date.toISOString()}
                    scale={0.97}
                    onPress={() => setSelectedDate(date)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${dateLabel(date, index)}, ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                    style={[styles.tile, { width: dateCell }, active ? styles.tileOn : null]}
                  >
                    <Text style={[styles.tileTop, active ? styles.tileTextOn : null]} numberOfLines={1}>
                      {dateLabel(date, index)}
                    </Text>
                    <Text style={[styles.tileSub, active ? styles.tileTextOn : null]}>{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                  </Press>
                );
              })}
            </View>
          </Card>

          <Card>
            <CardTitle icon={Clock} title="Select time of day" />
            <SegmentedControl
              options={[
                { value: 'lunch', label: 'Lunch' },
                { value: 'dinner', label: 'Dinner' },
              ]}
              value={selectedMealPeriod}
              onChange={setSelectedMealPeriod}
            />

            <View style={[styles.grid, { marginTop: space.lg }]}>
              {filteredSlots.length === 0 ? (
                <View style={styles.noSlots}>
                  <Clock size={22} color={color.textDisabled} />
                  <Text style={styles.noSlotsText}>No {selectedMealPeriod} slots available for the selected date.</Text>
                </View>
              ) : (
                filteredSlots.map((slot) => {
                  const active = selectedSlot === slot;
                  return (
                    <Press
                      key={slot}
                      scale={0.97}
                      onPress={() => setSelectedSlot(slot)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${slot}, ${getOfferLabel(slot)}`}
                      style={[styles.tile, { width: dateCell }, active ? styles.tileOn : null]}
                    >
                      <Text style={[styles.tileTop, active ? styles.tileTextOn : null]}>{slot}</Text>
                      <Text style={[styles.slotSub, active ? styles.tileTextOn : null]}>{getOfferLabel(slot)}</Text>
                    </Press>
                  );
                })
              )}
            </View>
          </Card>

          <View style={styles.hintRow}>
            <Info size={16} color={color.textMuted} />
            <Text style={styles.hint}>Select your preferred time slot to view available booking options</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: space.md + clearance }]}>
        <View style={{ width: '100%', maxWidth: 448, alignSelf: 'center', gap: space.sm }}>
          {canProceed ? (
            <Text style={styles.summary} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
          <Button
            size="lg"
            disabled={!canProceed}
            onPress={handleProceed}
            accessibilityLabel="Proceed"
            title={canProceed ? 'Proceed to confirmation' : !isDiningEnabled ? 'Dining paused' : 'Select a time slot to proceed'}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: color.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  h1: { ...type.heading, color: color.text },
  sub: { ...type.small, color: color.textMuted },
  body: { width: '100%', maxWidth: 448, alignSelf: 'center', padding: space.lg, gap: space.md },
  paused: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', backgroundColor: color.warningSoft, borderRadius: radii.lg, padding: space.lg },
  pausedTitle: { ...type.bodyStrong, color: color.warning },
  pausedBody: { marginTop: space.xxs, ...type.small, color: color.textSecondary },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginBottom: space.lg },
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  cardTitle: { ...type.subheading, color: color.text, flexShrink: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: color.surfaceMuted, borderRadius: radii.md, padding: space.sm },
  stepValue: { ...type.priceLg, color: color.text },
  stepLabel: { ...type.caption, color: color.textMuted },
  stepHint: { marginTop: space.sm, ...type.caption, color: color.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { minHeight: 64, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.sm, paddingVertical: space.sm, alignItems: 'center', justifyContent: 'center' },
  tileOn: { borderColor: color.primary, backgroundColor: color.primary, ...elevation.card },
  tileTop: { ...type.bodyStrong, color: color.text },
  tileSub: { marginTop: space.xxs, ...type.caption, color: color.textMuted },
  tileTextOn: { color: color.onPrimary },
  slotSub: { marginTop: space.xxs, ...type.caption, color: color.goldText },
  noSlots: { width: '100%', alignItems: 'center', gap: space.sm, borderRadius: radii.md, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, paddingHorizontal: space.lg, paddingVertical: space.xxl },
  noSlotsText: { textAlign: 'center', ...type.small, color: color.textMuted },
  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingHorizontal: space.xs },
  hint: { flex: 1, ...type.small, color: color.textMuted },
  summary: { ...type.label, color: color.textSecondary, textAlign: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 70, backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.md, ...elevation.sheet },
});
