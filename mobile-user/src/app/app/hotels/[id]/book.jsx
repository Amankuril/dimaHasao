import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Image from '../../../../components/Img';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../../../../components/Fa';
import { Press } from '../../../../components/ui';
import { Dialog } from '../../../../components/kit';
import { StatusBadge } from '../../../../components/ds';
import { Header, PatternDivider } from '../../../../components/dh/Header';
import { DateField, Field, FormScroll, GreenButton, Panel, PanelTitle, Pulse, StateBlock, Stepper, dhs, rupees, toIso } from '../../../../components/dh/ui';
import { useBooking } from '../../../../context/BookingContext';
import { createHotelBooking as createHotelBookingApi, fetchHotelById, quoteStay, verifyHotelPayment } from '../../../../api/dh/hotelApi';
import { initRazorpayPayment } from '../../../../lib/razorpay';
import { color, elevation, radii, space, type } from '../../../../theme';

// Web: DimaHasao/pages/HotelBookingScreen.jsx (/app/hotels/:id/book?roomId=&nights=)
// Every amount comes from POST /hotel/bookings/quote.

/** yyyy-mm-dd, `days` from today. */
const isoDate = (days = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIso(date);
};

/** checkIn + nights, as yyyy-mm-dd. */
const addNights = (checkIn, nights) => {
  const [y, m, d] = checkIn.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + Math.max(1, Number(nights) || 1));
  return toIso(date);
};

const fmt = (value, opts) => new Date(value).toLocaleDateString('en-IN', opts);

const METHODS = [
  { id: 'upi', label: 'UPI / QR (Google Pay, PhonePe, Paytm)', icon: 'fa-solid fa-qrcode', badge: 'Instant & Fast' },
  { id: 'card', label: 'Credit / Debit Cards', icon: 'fa-solid fa-credit-card', badge: 'Visa, MC, RuPay' },
  { id: 'netbanking', label: 'Net Banking (All Indian Banks)', icon: 'fa-solid fa-building-columns', badge: null },
  { id: 'cash', label: 'Pay at Hotel (Cash / Card on Arrival)', icon: 'fa-solid fa-hand-holding-dollar', badge: 'No Prepayment' },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function HotelBookingScreen() {
  const params = useLocalSearchParams();
  const { id } = params;
  const roomId = params.roomId ? String(params.roomId) : null;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user, showToast, refreshHotelBookings } = useBooking();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [checkInDate, setCheckInDate] = useState(isoDate(1));
  const [nights, setNights] = useState(parseInt(params.nights || '1', 10) || 1);
  const [roomCount, setRoomCount] = useState(1);
  const [adults, setAdults] = useState(2);
  const children = 0;

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('upi'); // upi | card | netbanking | cash
  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');

  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdBookingData, setCreatedBookingData] = useState(null);

  const checkOutDate = addNights(checkInDate, nights);

  useEffect(() => {
    let cancelled = false;
    fetchHotelById(id)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setHotel(null);
          return;
        }
        setHotel(found);
        setSelectedRoom(found.rooms.find((r) => r.id === roomId) || found.rooms[0] || null);
      })
      .catch(() => {
        if (!cancelled) setHotel(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, roomId]);

  useEffect(() => {
    if (!user?.isLoggedIn) return;
    setGuestName((c) => c || (user.name !== 'Guest' ? user.name : ''));
    setGuestPhone((c) => c || user.phone || '');
  }, [user]);

  // Guards a slow earlier quote from landing after a newer one.
  const quoteSequence = useRef(0);

  useEffect(() => {
    if (!hotel || !selectedRoom || !user?.isLoggedIn) return undefined;
    const sequence = ++quoteSequence.current;
    setQuoting(true);
    // Debounced: the guest taps the counters repeatedly.
    const timer = setTimeout(() => {
      quoteStay({
        propertyId: hotel.id,
        roomTypeId: selectedRoom.id,
        checkInDate,
        checkOutDate,
        guests: { adults, children, rooms: roomCount },
        couponCode: appliedCoupon || undefined,
      })
        .then((result) => {
          if (sequence !== quoteSequence.current) return;
          setQuote(result);
          setQuoteError('');
          if (appliedCoupon && !result.couponCode && result.couponMessage) {
            showToast(result.couponMessage);
            setAppliedCoupon('');
          }
        })
        .catch((error) => {
          if (sequence !== quoteSequence.current) return;
          setQuote(null);
          setQuoteError(error?.response?.data?.message || 'We could not price this stay.');
        })
        .finally(() => {
          if (sequence === quoteSequence.current) setQuoting(false);
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [hotel, selectedRoom, checkInDate, checkOutDate, adults, children, roomCount, appliedCoupon, user, showToast]);

  /** The server decides whether a code applies; this just re-quotes with it. */
  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return showToast('Enter a promo code first');
    setAppliedCoupon(code);
    return undefined;
  };

  const clearPromo = () => {
    setAppliedCoupon('');
    setPromoCode('');
  };

  const finish = useCallback(
    async (booking) => {
      await refreshHotelBookings();
      const dateOpts = { day: 'numeric', month: 'short', year: 'numeric' };
      setCreatedBookingData({
        id: booking.bookingId || booking._id,
        hotelName: hotel.name,
        roomName: selectedRoom.name,
        checkIn: fmt(booking.checkInDate, dateOpts),
        checkOut: fmt(booking.checkOutDate, dateOpts),
        guests: `${adults} Adults${children > 0 ? `, ${children} Children` : ''}`,
        totalAmount: booking.totalAmount,
        paymentStatus: booking.paymentStatus === 'paid' ? 'Paid Online' : 'Pay at Property',
      });
      setIsSuccessModalOpen(true);
    },
    [hotel, selectedRoom, adults, children, refreshHotelBookings],
  );

  const handleConfirmStay = async () => {
    if (submitting) return undefined;
    if (!user?.isLoggedIn) {
      showToast('Please sign in to book this stay');
      return router.push('/app/login');
    }
    // The web form's `required` fields.
    if (!guestName.trim()) return showToast('Please enter the guest name');
    if (!guestPhone.trim()) return showToast('Please enter a phone number');
    if (!EMAIL.test(guestEmail.trim())) return showToast('Please enter a valid email address');
    if (!quote) return showToast(quoteError || 'Please wait for the price to load');

    // The picker chooses between paying now and paying at the property;
    // Razorpay shows its own UPI / card / netbanking list inside the checkout.
    const payAtHotel = paymentMethod === 'cash';

    let created;
    try {
      setSubmitting(true);
      created = await createHotelBookingApi({
        propertyId: hotel.id,
        roomTypeId: selectedRoom.id,
        checkInDate,
        checkOutDate,
        guests: { adults, children, rooms: roomCount },
        paymentMethod: payAtHotel ? 'pay_at_hotel' : 'razorpay',
        couponCode: appliedCoupon || undefined,
        specialRequest,
        guestContact: { name: guestName, phone: guestPhone, email: guestEmail },
      });
    } catch (error) {
      setSubmitting(false);
      return showToast(error?.response?.data?.message || 'We could not create this booking');
    }

    const booking = created.booking;

    if (payAtHotel || !created.paymentRequired) {
      setSubmitting(false);
      return finish(booking);
    }

    try {
      await initRazorpayPayment({
        key: created.key,
        amount: created.order.amount,
        currency: created.order.currency || 'INR',
        order_id: created.order.id,
        name: 'Dima Hasao Stays',
        description: `${hotel.name} — ${selectedRoom.name}`,
        themeColor: '#0a4d2b',
        prefill: { name: guestName, email: guestEmail, contact: guestPhone },
        notes: { bookingId: booking.bookingId },
        handler: async (response) => {
          try {
            const confirmed = await verifyHotelPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking._id,
            });
            await finish(confirmed.booking || { ...booking, paymentStatus: 'paid' });
          } catch (error) {
            showToast(error?.response?.data?.message || 'Payment taken but not confirmed — contact support');
          } finally {
            setSubmitting(false);
          }
        },
        onError: (error) => {
          setSubmitting(false);
          showToast(error?.description || 'Payment failed. Your booking is saved as unpaid.');
        },
        onClose: () => {
          setSubmitting(false);
          showToast('Payment cancelled. Your booking is saved as unpaid.');
        },
      });
    } catch (error) {
      setSubmitting(false);
      showToast(error?.message || 'Could not open the payment window');
    }
    return undefined;
  };

  if (loading) {
    return (
      <View style={dhs.page}>
        <Header title="REVIEW & BOOK" subtitle="Loading your stay" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <View style={{ padding: space.lg, gap: space.md }} accessibilityLabel="Loading your stay">
          {[0, 1, 2].map((n) => (
            <Panel key={n} style={{ gap: space.sm }}>
              <Pulse style={{ height: 16, width: '50%' }} />
              <Pulse tone={100} style={{ height: 13 }} />
            </Panel>
          ))}
        </View>
      </View>
    );
  }

  if (!hotel || !selectedRoom) {
    return (
      <View style={dhs.page}>
        <Header title="REVIEW & BOOK" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <StateBlock card={false} icon="fa-solid fa-hotel" title="This stay is no longer available" actionLabel="See all stays" onAction={() => router.replace('/app/hotels')} />
      </View>
    );
  }

  const cta = quote
    ? paymentMethod === 'cash'
      ? `Reserve (${rupees(quote.totalAmount)} at hotel)`
      : `Confirm & Pay (${rupees(quote.totalAmount)})`
    : 'Loading price…';
  const ctaShort = quote ? (paymentMethod === 'cash' ? 'Reserve' : 'Confirm & pay') : 'Loading…';

  return (
    <View style={dhs.page}>
      <Header title="REVIEW & BOOK" subtitle="Confirm your stay details" showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <FormScroll contentContainerStyle={{ padding: space.lg, gap: space.lg }} bottomSpace={space.xxl}>
        <Panel style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Image source={{ uri: selectedRoom.image || hotel.heroImage }} style={styles.thumb} />
            <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 2 }}>
              <StatusBadge label={hotel.type} tone="gold" />
              <Text style={[dhs.h3, { marginTop: space.xs }]} numberOfLines={2}>
                {hotel.name}
              </Text>
              <Text style={styles.roomName} numberOfLines={1}>
                {selectedRoom.name}
              </Text>
              <View style={[dhs.row, { gap: space.xs + 2 }]}>
                <Fa name="fa-solid fa-location-dot" size={12} color={color.primary} />
                <Text style={styles.loc} numberOfLines={1}>
                  {hotel.location}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divided}>
            <DateField label="Check-in" value={checkInDate} min={isoDate(0)} onChange={setCheckInDate} />
            <Text style={styles.checkout}>Checking out {fmt(`${checkOutDate}T00:00:00`, { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
          </View>

          <View style={{ gap: space.sm }}>
            {[
              ['Nights', nights, setNights, 'fa-regular fa-moon'],
              ['Rooms', roomCount, setRoomCount, 'fa-solid fa-door-closed'],
              ['Adults', adults, setAdults, 'fa-solid fa-user'],
            ].map(([label, value, set, icon]) => (
              <View key={label} style={styles.counter}>
                <View style={[dhs.row, { gap: space.sm, flexShrink: 1 }]}>
                  <Fa name={icon} size={16} color={color.primary} />
                  <Text style={styles.counterLabel}>{label}</Text>
                </View>
                <Stepper value={value} onChange={set} label={label} />
              </View>
            ))}
          </View>
        </Panel>

        <Panel style={{ gap: space.md }}>
          <PanelTitle icon="fa-solid fa-user-check">Guest information</PanelTitle>
          <View style={{ gap: space.md }}>
            <Field label="Full name" value={guestName} onChangeText={setGuestName} autoCapitalize="words" autoComplete="name" />
            <Field label="Phone number" value={guestPhone} onChangeText={setGuestPhone} keyboardType="phone-pad" autoComplete="tel" />
            <Field label="Email ID" value={guestEmail} onChangeText={setGuestEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Field label="Special requests (optional)" placeholder="e.g. Early check-in, high floor, quiet room" value={specialRequest} onChangeText={setSpecialRequest} />
          </View>
        </Panel>

        <Panel style={{ gap: space.sm }}>
          <PanelTitle icon="fa-solid fa-tag">Promo code</PanelTitle>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Field style={{ flex: 1 }} placeholder="Promo code" value={promoCode} onChangeText={setPromoCode} autoCapitalize="characters" inputStyle={type.bodyStrong} />
            <GreenButton title="Apply" variant="secondary" fullWidth={false} onPress={handleApplyPromo} />
          </View>
          {quote?.couponCode ? (
            <View style={[dhs.row, { gap: space.sm, flexWrap: 'wrap' }]}>
              <Fa name="fa-solid fa-circle-check" size={14} color={color.success} />
              <Text style={styles.couponOk}>
                Coupon {quote.couponCode} applied — saving {rupees(quote.discount)}
              </Text>
              <Press onPress={clearPromo} accessibilityLabel="Remove coupon" style={styles.remove}>
                <Text style={styles.removeText}>Remove</Text>
              </Press>
            </View>
          ) : null}
          {quote?.couponMessage && !quote?.couponCode ? <Text style={styles.couponWarn}>{quote.couponMessage}</Text> : null}
        </Panel>

        <Panel style={{ gap: space.md }}>
          <PanelTitle icon="fa-solid fa-credit-card">Payment method</PanelTitle>
          <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
            {METHODS.map((method) => {
              const selected = paymentMethod === method.id;
              return (
                <Press
                  key={method.id}
                  scale={0.99}
                  onPress={() => setPaymentMethod(method.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={method.badge ? `${method.label}, ${method.badge}` : method.label}
                  style={[styles.method, selected && styles.methodSelected]}
                >
                  <View style={[styles.radio, selected && { borderColor: color.primary }]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                  <Fa name={method.icon} size={18} color={color.primary} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.methodLabel}>{method.label}</Text>
                    {method.badge ? <Text style={styles.methodBadge}>{method.badge}</Text> : null}
                  </View>
                </Press>
              );
            })}
          </View>
        </Panel>

        <Panel style={{ gap: space.md }}>
          <PanelTitle icon="fa-solid fa-receipt">Fare summary</PanelTitle>
          {quoteError ? (
            <Text style={styles.quoteError}>{quoteError}</Text>
          ) : !quote ? (
            <View style={{ gap: space.sm, paddingVertical: space.xs }} accessibilityLabel="Loading price">
              <Pulse tone={100} style={{ height: 13 }} />
              <Pulse tone={100} style={{ height: 13, width: '66%' }} />
              <Pulse style={{ height: 18, width: '50%' }} />
            </View>
          ) : (
            <View style={[{ gap: space.sm }, quoting && { opacity: 0.5 }]}>
              <View style={styles.line}>
                <Text style={styles.lineLabel}>
                  Room base fare ({quote.totalNights}N × {quote.rooms} room{quote.rooms > 1 ? 's' : ''})
                </Text>
                <Text style={styles.lineValue}>{rupees(quote.baseAmount)}</Text>
              </View>
              {quote.extraCharges > 0 ? (
                <View style={styles.line}>
                  <Text style={styles.lineLabel}>Extra guest charges</Text>
                  <Text style={styles.lineValue}>{rupees(quote.extraCharges)}</Text>
                </View>
              ) : null}
              {quote.discount > 0 ? (
                <View style={styles.line}>
                  <Text style={[styles.lineLabel, styles.discount]}>Promo discount ({quote.couponCode})</Text>
                  <Text style={[styles.lineValue, styles.discount]}>- {rupees(quote.discount)}</Text>
                </View>
              ) : null}
              <View style={styles.line}>
                <Text style={styles.lineLabel}>GST &amp; hospitality taxes ({quote.taxRate}%)</Text>
                <Text style={styles.lineValue}>{rupees(quote.taxes)}</Text>
              </View>
              <View style={[styles.line, styles.total]}>
                <Text style={styles.totalLabel}>Total amount</Text>
                <Text style={styles.totalValue}>{rupees(quote.totalAmount)}</Text>
              </View>
              {paymentMethod === 'cash' ? <Text style={styles.note}>You&apos;ll pay this at the property on arrival.</Text> : null}
              {quote.availableUnits <= 3 ? (
                <Text style={styles.note}>
                  Only {quote.availableUnits} room{quote.availableUnits === 1 ? '' : 's'} left for these dates.
                </Text>
              ) : null}
            </View>
          )}
        </Panel>
      </FormScroll>

      <View style={[styles.bar, { paddingBottom: space.md + insets.bottom }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.barLabel} numberOfLines={1}>
            {paymentMethod === 'cash' ? 'Pay at hotel' : 'Total payable'}
          </Text>
          {quote ? <Text style={[styles.barPrice, quoting && { opacity: 0.5 }]}>{rupees(quote.totalAmount)}</Text> : <Pulse style={{ height: 20, width: 88, marginTop: 4 }} />}
        </View>
        <GreenButton size="lg" fullWidth={false} icon="fa-solid fa-lock" title={ctaShort} loadingTitle="Processing…" accessibilityLabel={cta} onPress={handleConfirmStay} disabled={!quote || quoting} loading={submitting} />
      </View>

      <Dialog visible={isSuccessModalOpen && Boolean(createdBookingData)} onClose={() => {}} closeOnBackdrop={false} backdrop={color.overlay} panelStyle={[styles.modal, { maxHeight: height * 0.9 }]}>
        {createdBookingData ? (
          <ScrollView contentContainerStyle={{ gap: space.lg }} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', gap: space.xs }}>
              <View style={styles.okIcon}>
                <Fa name="fa-solid fa-circle-check" size={28} color={color.success} />
              </View>
              <Text style={styles.okTitle} accessibilityRole="header">
                Booking confirmed!
              </Text>
              <Text style={styles.okText}>Your stay has been reserved successfully</Text>
              <Text style={styles.okId} selectable>
                ID: {createdBookingData.id}
              </Text>
            </View>

            <View style={styles.invoice}>
              <View style={styles.invoiceHead}>
                <Text style={styles.invoiceKicker}>Property &amp; room</Text>
                <Text style={styles.invoiceHotel}>{createdBookingData.hotelName}</Text>
                <Text style={styles.invoiceRoom}>{createdBookingData.roomName}</Text>
              </View>
              <View style={styles.invoiceGrid}>
                {[
                  ['Check-in', createdBookingData.checkIn],
                  ['Check-out', createdBookingData.checkOut],
                  ['Guests', createdBookingData.guests],
                  ['Payment', createdBookingData.paymentStatus, true],
                ].map(([label, value, green]) => (
                  <View key={label} style={{ width: '50%', marginBottom: space.sm, paddingRight: space.sm }}>
                    <Text style={styles.invoiceLabel}>{label}</Text>
                    <Text style={[styles.invoiceValue, green && { color: color.success }]}>{value}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.invoiceTotal}>
                <Text style={styles.invoiceTotalLabel}>Total paid/payable</Text>
                <Text style={styles.invoiceTotalValue}>₹{Number(createdBookingData.totalAmount || 0).toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <View style={{ gap: space.sm }}>
              <GreenButton
                title="View in My Bookings"
                icon="fa-solid fa-calendar-check"
                onPress={() => {
                  setIsSuccessModalOpen(false);
                  router.dismissTo('/app');
                  router.navigate('/app/bookings');
                }}
              />
              <GreenButton
                tone="gray"
                title="Back to home"
                onPress={() => {
                  setIsSuccessModalOpen(false);
                  router.dismissTo('/app');
                }}
              />
            </View>
          </ScrollView>
        ) : null}
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 84, height: 84, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  roomName: { ...type.label, color: color.primary },
  loc: { flex: 1, ...type.caption, color: color.textMuted },
  divided: { paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  checkout: { ...type.caption, color: color.textMuted, marginTop: space.xs + 2 },
  counter: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, backgroundColor: color.surfaceMuted, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radii.md },
  counterLabel: { ...type.bodyStrong, color: color.text },
  couponOk: { ...type.label, color: color.success, flexShrink: 1 },
  remove: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs },
  removeText: { ...type.label, color: color.danger, textDecorationLine: 'underline' },
  couponWarn: { ...type.small, color: color.warning },
  method: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  methodSelected: { borderColor: color.primary, borderWidth: 2, paddingHorizontal: space.md - 1, backgroundColor: color.primarySoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary },
  methodLabel: { ...type.bodyStrong, color: color.text },
  methodBadge: { ...type.caption, color: color.primary },
  quoteError: { ...type.small, color: color.danger, backgroundColor: color.dangerSoft, borderRadius: radii.md, padding: space.md },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  lineLabel: { flex: 1, ...type.small, color: color.textSecondary },
  lineValue: { ...type.bodyStrong, color: color.text },
  discount: { color: color.success },
  total: { paddingTop: space.sm, marginTop: 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borderStrong, alignItems: 'baseline' },
  totalLabel: { ...type.subheading, color: color.text },
  totalValue: { ...type.price, color: color.text },
  note: { ...type.small, color: color.warning },
  bar: { backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md, ...elevation.sheet },
  barLabel: { ...type.caption, color: color.textMuted },
  barPrice: { ...type.price, color: color.text },
  modal: { width: '100%', maxWidth: 400, backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xl, borderWidth: 1, borderColor: color.border, ...elevation.float },
  okIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  okTitle: { ...type.heading, color: color.text },
  okText: { ...type.small, color: color.textMuted, textAlign: 'center' },
  okId: { ...type.label, color: color.primary, backgroundColor: color.surfaceMuted, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radii.pill, overflow: 'hidden', marginTop: space.xs },
  invoice: { backgroundColor: color.surfaceMuted, borderRadius: radii.lg, padding: space.lg, gap: space.sm },
  invoiceHead: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.borderStrong, paddingBottom: space.sm, gap: 2 },
  invoiceKicker: { ...type.overline, color: color.textMuted },
  invoiceHotel: { ...type.bodyStrong, color: color.text },
  invoiceRoom: { ...type.label, color: color.primary },
  invoiceGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  invoiceLabel: { ...type.caption, color: color.textMuted },
  invoiceValue: { ...type.label, color: color.text },
  invoiceTotal: { paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borderStrong, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  invoiceTotalLabel: { ...type.bodyStrong, color: color.text },
  invoiceTotalValue: { ...type.price, color: color.text },
});
