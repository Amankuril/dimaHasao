import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Image from '../../../../components/Img';
import { router, useLocalSearchParams } from 'expo-router';
import Fa from '../../../../components/Fa';
import { Press } from '../../../../components/ui';
import { Dialog } from '../../../../components/kit';
import { Header, PatternDivider } from '../../../../components/dh/Header';
import { DateField, Field, FormScroll, GreenButton, Panel, PanelTitle, Pulse, StateBlock, Stepper, dhs, rupees, toIso } from '../../../../components/dh/ui';
import { useBooking } from '../../../../context/BookingContext';
import { createHotelBooking as createHotelBookingApi, fetchHotelById, quoteStay, verifyHotelPayment } from '../../../../api/dh/hotelApi';
import { initRazorpayPayment } from '../../../../lib/razorpay';
import { dh, montserrat, poppins, shadow, tw } from '../../../../theme';

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
        <View style={{ padding: 14, gap: 12 }}>
          {[0, 1, 2].map((n) => (
            <Panel key={n} style={{ gap: 8 }}>
              <Pulse style={{ height: 14, width: '50%' }} />
              <Pulse tone={100} style={{ height: 12 }} />
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
        <StateBlock card={false} icon="fa-solid fa-hotel" title="This stay is no longer available" actionLabel="See All Stays" onAction={() => router.replace('/app/hotels')} />
      </View>
    );
  }

  const cta = quote
    ? paymentMethod === 'cash'
      ? `Reserve (${rupees(quote.totalAmount)} at hotel)`
      : `Confirm & Pay (${rupees(quote.totalAmount)})`
    : 'Loading price…';

  return (
    <View style={dhs.page}>
      <Header title="REVIEW & BOOK" subtitle="Confirm your stay details" showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <FormScroll contentContainerStyle={{ padding: 14, gap: 16 }} bottomSpace={40}>
        <Panel style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Image source={{ uri: selectedRoom.image || hotel.heroImage }} style={styles.thumb} />
            <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
              <Text style={styles.typeBadge}>{hotel.type}</Text>
              <Text style={[dhs.h3, { marginTop: 4 }]} numberOfLines={1}>{hotel.name}</Text>
              <Text style={styles.roomName}>{selectedRoom.name}</Text>
              <View style={[dhs.row, { gap: 4, marginTop: 2 }]}>
                <Fa name="fa-solid fa-location-dot" size={11} color={tw.emerald700} />
                <Text style={styles.loc} numberOfLines={1}>{hotel.location}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divided}>
            <DateField label="Check-in" value={checkInDate} min={isoDate(0)} onChange={setCheckInDate} />
            <Text style={styles.checkout}>Checking out {fmt(`${checkOutDate}T00:00:00`, { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, paddingTop: 8 }}>
            {[
              ['Nights', nights, setNights],
              ['Rooms', roomCount, setRoomCount],
              ['Adults', adults, setAdults],
            ].map(([label, value, set]) => (
              <View key={label} style={styles.counter}>
                <Text style={styles.counterLabel}>{label}</Text>
                <View style={{ marginTop: 4 }}>
                  <Stepper value={value} onChange={set} label={label} />
                </View>
              </View>
            ))}
          </View>
        </Panel>

        <Panel style={{ gap: 12 }}>
          <PanelTitle icon="fa-solid fa-user-check">Guest Information</PanelTitle>
          <View style={{ gap: 10 }}>
            <Field label="Full Name" value={guestName} onChangeText={setGuestName} autoCapitalize="words" autoComplete="name" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Field style={{ flex: 1 }} label="Phone Number" value={guestPhone} onChangeText={setGuestPhone} keyboardType="phone-pad" autoComplete="tel" />
              <Field style={{ flex: 1 }} label="Email ID" value={guestEmail} onChangeText={setGuestEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            </View>
            <Field label="Special Requests (Optional)" placeholder="e.g. Early check-in, high floor, quiet room" value={specialRequest} onChangeText={setSpecialRequest} />
          </View>
        </Panel>

        <Panel pad={14}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Field style={{ flex: 1 }} placeholder="Promo code" value={promoCode} onChangeText={setPromoCode} autoCapitalize="characters" inputStyle={poppins(700)} />
            <GreenButton title="Apply" onPress={handleApplyPromo} />
          </View>
          {quote?.couponCode ? (
            <View style={[dhs.row, { gap: 4, marginTop: 8, flexWrap: 'wrap' }]}>
              <Fa name="fa-solid fa-tag" size={11} color={tw.emerald700} />
              <Text style={styles.couponOk}>
                Coupon {quote.couponCode} applied — saving {rupees(quote.discount)}
              </Text>
              <Text onPress={clearPromo} style={styles.remove} accessibilityRole="button">
                remove
              </Text>
            </View>
          ) : null}
          {quote?.couponMessage && !quote?.couponCode ? <Text style={styles.couponWarn}>{quote.couponMessage}</Text> : null}
        </Panel>

        <Panel style={{ gap: 12 }}>
          <PanelTitle icon="fa-solid fa-credit-card">Payment Method</PanelTitle>
          <View style={{ gap: 8 }} accessibilityRole="radiogroup">
            {METHODS.map((method) => {
              const selected = paymentMethod === method.id;
              return (
                <Press
                  key={method.id}
                  scale={0.99}
                  onPress={() => setPaymentMethod(method.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.method, selected && styles.methodSelected]}
                >
                  <View style={[dhs.row, { gap: 12, flex: 1 }]}>
                    <View style={[styles.radio, selected && { borderColor: tw.emerald800 }]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                    <Fa name={method.icon} size={14} color={tw.emerald900} />
                    <Text style={styles.methodLabel}>{method.label}</Text>
                  </View>
                  {method.badge ? <Text style={styles.methodBadge}>{method.badge}</Text> : null}
                </Press>
              );
            })}
          </View>
        </Panel>

        <Panel style={{ gap: 10 }}>
          <Text style={dhs.h3}>Fare Summary</Text>
          {quoteError ? (
            <Text style={styles.quoteError}>{quoteError}</Text>
          ) : !quote ? (
            <View style={{ gap: 8, paddingVertical: 4 }}>
              <Pulse tone={100} style={{ height: 12 }} />
              <Pulse tone={100} style={{ height: 12, width: '66%' }} />
              <Pulse style={{ height: 16, width: '50%' }} />
            </View>
          ) : (
            <View style={[{ gap: 6 }, quoting && { opacity: 0.5 }]}>
              <View style={styles.line}>
                <Text style={styles.lineLabel}>
                  Room Base Fare ({quote.totalNights}N × {quote.rooms} room{quote.rooms > 1 ? 's' : ''})
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
                  <Text style={[styles.lineLabel, styles.discount]}>Promo Discount ({quote.couponCode})</Text>
                  <Text style={[styles.lineValue, styles.discount]}>- {rupees(quote.discount)}</Text>
                </View>
              ) : null}
              <View style={styles.line}>
                <Text style={styles.lineLabel}>GST &amp; Hospitality Taxes ({quote.taxRate}%)</Text>
                <Text style={styles.lineValue}>{rupees(quote.taxes)}</Text>
              </View>
              <View style={[styles.line, styles.total]}>
                <Text style={styles.totalLabel}>Total Amount</Text>
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

        <GreenButton size="lg" icon="fa-solid fa-lock" title={cta} onPress={handleConfirmStay} disabled={!quote || quoting} loading={submitting} style={shadow('md')} />
      </FormScroll>

      <Dialog visible={isSuccessModalOpen && Boolean(createdBookingData)} onClose={() => {}} closeOnBackdrop={false} backdrop="rgba(0,0,0,0.7)" panelStyle={[styles.modal, { maxHeight: height * 0.9 }]}>
        {createdBookingData ? (
          <ScrollView contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={styles.okIcon}>
                <Fa name="fa-solid fa-circle-check" size={24} color={tw.emerald800} />
              </View>
              <Text style={styles.okTitle}>Booking Confirmed!</Text>
              <Text style={styles.okText}>Your stay has been reserved successfully</Text>
              <Text style={styles.okId}>ID: {createdBookingData.id}</Text>
            </View>

            <View style={styles.invoice}>
              <View style={styles.invoiceHead}>
                <Text style={styles.invoiceKicker}>PROPERTY &amp; ROOM</Text>
                <Text style={styles.invoiceHotel}>{createdBookingData.hotelName}</Text>
                <Text style={styles.invoiceRoom}>{createdBookingData.roomName}</Text>
              </View>
              <View style={styles.invoiceGrid}>
                {[
                  ['Check-in:', createdBookingData.checkIn],
                  ['Check-out:', createdBookingData.checkOut],
                  ['Guests:', createdBookingData.guests],
                  ['Payment:', createdBookingData.paymentStatus, true],
                ].map(([label, value, green]) => (
                  <View key={label} style={{ width: '50%', marginBottom: 8 }}>
                    <Text style={styles.invoiceLabel}>{label}</Text>
                    <Text style={[styles.invoiceValue, green && { color: tw.emerald800 }]}>{value}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.invoiceTotal}>
                <Text style={styles.invoiceTotalLabel}>Total Paid/Payable:</Text>
                <Text style={styles.invoiceTotalValue}>₹{Number(createdBookingData.totalAmount || 0).toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <View style={{ gap: 8, paddingTop: 4 }}>
              <GreenButton
                title="View in My Bookings"
                icon="fa-solid fa-calendar-check"
                style={{ paddingVertical: 12, ...shadow('md') }}
                onPress={() => {
                  setIsSuccessModalOpen(false);
                  router.dismissTo('/app');
                  router.navigate('/app/bookings');
                }}
              />
              <GreenButton
                tone="gray"
                title="Back to Home"
                textStyle={poppins(600)}
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
  thumb: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: tw.gray100 },
  typeBadge: { fontSize: 10, lineHeight: 15, color: tw.amber700, backgroundColor: tw.amber50, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: tw.amber200, overflow: 'hidden', ...poppins(700) },
  roomName: { fontSize: 12, lineHeight: 16, color: tw.emerald800, ...poppins(600) },
  loc: { flex: 1, fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(400) },
  divided: { paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100 },
  checkout: { fontSize: 10, lineHeight: 15, color: tw.gray400, marginTop: 4, ...poppins(400) },
  counter: { flex: 1, alignItems: 'center', backgroundColor: dh.cream, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(229,221,195,0.6)' },
  counterLabel: { fontSize: 10, lineHeight: 15, color: tw.gray500, ...poppins(400) },
  couponOk: { fontSize: 11, lineHeight: 16.5, color: tw.emerald700, flexShrink: 1, ...poppins(600) },
  remove: { fontSize: 11, lineHeight: 16.5, color: tw.gray400, textDecorationLine: 'underline', marginLeft: 4, ...poppins(600) },
  couponWarn: { fontSize: 11, lineHeight: 16.5, color: tw.amber700, marginTop: 8, ...poppins(600) },
  method: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: dh.border, backgroundColor: 'rgba(250,246,237,0.4)' },
  methodSelected: { borderColor: tw.emerald700, borderWidth: 2, padding: 11, backgroundColor: 'rgba(236,253,245,0.7)' },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: tw.gray400, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tw.emerald800 },
  methodLabel: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(600) },
  methodBadge: { fontSize: 9.5, lineHeight: 14, color: tw.emerald800, backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: tw.emerald200, overflow: 'hidden', ...poppins(700) },
  quoteError: { fontSize: 12, lineHeight: 16, color: tw.red600, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red100, borderRadius: 12, padding: 10, ...poppins(400) },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  lineLabel: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  lineValue: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(600) },
  discount: { color: tw.emerald700, ...poppins(600) },
  total: { paddingTop: 8, marginTop: 2, borderTopWidth: 1, borderTopColor: tw.gray200, alignItems: 'baseline' },
  totalLabel: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  totalValue: { fontSize: 18, lineHeight: 28, color: tw.emerald950, ...montserrat(900) },
  note: { fontSize: 11, lineHeight: 16.5, color: tw.amber700, paddingTop: 4, ...poppins(600) },
  modal: { width: '100%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: tw.emerald200, ...shadow('2xl') },
  okIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: tw.emerald100, alignItems: 'center', justifyContent: 'center' },
  okTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...montserrat(700) },
  okText: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  okId: { fontSize: 12, lineHeight: 16, color: tw.emerald900, backgroundColor: dh.cream, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: dh.border, overflow: 'hidden', fontFamily: 'monospace', fontWeight: '700' },
  invoice: { backgroundColor: dh.cream, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: dh.border, gap: 8 },
  invoiceHead: { borderBottomWidth: 1, borderBottomColor: dh.border, paddingBottom: 8 },
  invoiceKicker: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(700) },
  invoiceHotel: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  invoiceRoom: { fontSize: 12, lineHeight: 16, color: tw.emerald800, ...poppins(600) },
  invoiceGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  invoiceLabel: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(400) },
  invoiceValue: { fontSize: 11, lineHeight: 16.5, color: tw.gray700, ...poppins(600) },
  invoiceTotal: { paddingTop: 8, borderTopWidth: 1, borderTopColor: dh.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceTotalLabel: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  invoiceTotalValue: { fontSize: 14, lineHeight: 20, color: tw.emerald950, ...montserrat(900) },
});
