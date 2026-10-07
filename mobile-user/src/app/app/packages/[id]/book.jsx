import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Image from '../../../../components/Img';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Fa from '../../../../components/Fa';
import { Press } from '../../../../components/ui';
import { SelectField } from '../../../../components/kit';
import { StatusBadge } from '../../../../components/ds';
import { Header, PatternDivider } from '../../../../components/dh/Header';
import { ConfirmedDialog, FareLine, FareTotal, InvoiceTotalRow, QuoteError } from '../../../../components/dh/booking';
import { Field, FormScroll, GreenButton, Panel, PanelTitle, Pulse, StateBlock, Stepper, dhs, fromIso, rupees, toIso } from '../../../../components/dh/ui';
import { useBooking } from '../../../../context/BookingContext';
import { createBooking, createPaymentOrder, fetchPackageById, fetchTourOffers, quoteBooking, settleWithoutGateway, verifyPayment } from '../../../../api/dh/toursApi';
import { initRazorpayPayment } from '../../../../lib/razorpay';
import { color, elevation, radii, space, type } from '../../../../theme';

// Web: DimaHasao/pages/TourBookingScreen.jsx (/app/packages/:id/book)
// Every figure comes from POST /tours/bookings/quote; the advance is paid online.

/** yyyy-mm-dd, `days` from today. */
const isoDate = (days = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIso(date);
};

export default function TourBookingScreen() {
  const { id } = useLocalSearchParams();
  const { user, showToast, refreshTourBookings } = useBooking();
  const insets = useSafeAreaInsets();

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);

  const [travelDate, setTravelDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [pickupPoint, setPickupPoint] = useState('');

  const [travelerName, setTravelerName] = useState('');
  const [travelerPhone, setTravelerPhone] = useState('');
  const [travelerEmail, setTravelerEmail] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoting, setQuoting] = useState(false);

  // `promoInput` is what is being typed; `couponCode` is what has been applied
  // and therefore what the quote is priced with.
  const [promoInput, setPromoInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [offers, setOffers] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdTourData, setCreatedTourData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPackageById(id)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setPkg(null);
          return;
        }
        setPkg(found);
        // Respect the operator's lead time rather than offering a date the server refuses.
        setTravelDate(isoDate(Math.max(found.leadTimeDays, 1)));
        setAdults(Math.max(found.groupSizeMin || 1, 1));
        setPickupPoint(found.pickupPoints[0] || '');
      })
      .catch(() => {
        if (!cancelled) setPkg(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    fetchTourOffers(id)
      .then((list) => {
        if (!cancelled) setOffers(list);
      })
      .catch(() => {
        if (!cancelled) setOffers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!user?.isLoggedIn) return;
    setTravelerName((current) => current || (user.name !== 'Guest' ? user.name : ''));
    setTravelerPhone((current) => current || user.phone || '');
  }, [user]);

  // Guards against a slow earlier quote landing after a newer one.
  const quoteSequence = useRef(0);

  useEffect(() => {
    if (!pkg || !travelDate) return undefined;
    const sequence = ++quoteSequence.current;
    setQuoting(true);
    // Debounced: each +/- tap would otherwise be its own request.
    const timer = setTimeout(() => {
      quoteBooking({ packageId: pkg.id, travelDate, adults, children, couponCode })
        .then((result) => {
          if (sequence !== quoteSequence.current) return;
          setQuote(result);
          setQuoteError('');
        })
        .catch((error) => {
          if (sequence !== quoteSequence.current) return;
          setQuote(null);
          setQuoteError(error?.response?.data?.message || 'We could not price this trip. Try another date or party size.');
        })
        .finally(() => {
          if (sequence === quoteSequence.current) setQuoting(false);
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [pkg, travelDate, adults, children, couponCode]);

  const finish = useCallback(
    async (booking) => {
      await refreshTourBookings();
      setCreatedTourData({
        id: booking.bookingId,
        packageTitle: pkg.title,
        duration: pkg.duration,
        travelDate: fromIso(travelDate).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
        travelers: `${adults} Adult${adults === 1 ? '' : 's'}${children > 0 ? `, ${children} Children` : ''}`,
        operatorName: pkg.operator?.name || 'Your operator',
        operatorPhone: pkg.operator?.phone || '',
        amountPaid: booking.advanceAmount,
        balanceDue: booking.balanceDue,
        totalAmount: booking.totalAmount,
      });
      setIsSuccessModalOpen(true);
    },
    [pkg, travelDate, adults, children, refreshTourBookings],
  );

  const handleConfirmTour = async () => {
    if (submitting) return undefined;
    if (!user?.isLoggedIn) {
      showToast('Please sign in to book this tour');
      return router.push('/app/login');
    }
    // The web form's `required` fields.
    if (!travelerName.trim()) return showToast('Please enter the lead traveller name');
    if (!travelerPhone.trim()) return showToast('Please enter a phone number');
    if (!quote) return showToast(quoteError || 'Please wait for the price to load');

    let booking;
    try {
      setSubmitting(true);
      const created = await createBooking({
        packageId: pkg.id,
        travelDate,
        adults,
        children,
        pickupPoint,
        travellerContact: { name: travelerName, phone: travelerPhone, email: travelerEmail },
        specialRequest,
        couponCode,
      });
      booking = created.booking;
    } catch (error) {
      setSubmitting(false);
      return showToast(error?.response?.data?.message || 'We could not create this booking');
    }

    // The booking now exists but is unpaid. Everything below confirms it.
    try {
      const order = await createPaymentOrder(booking._id);
      await initRazorpayPayment({
        key: order.razorpayKeyId,
        amount: order.order.amount,
        currency: order.order.currency,
        order_id: order.order.id,
        name: 'Dima Hasao Tours',
        description: pkg.title,
        themeColor: '#0a4d2b',
        prefill: { name: travelerName, email: travelerEmail, contact: travelerPhone },
        notes: { bookingId: booking.bookingId },
        handler: async (response) => {
          try {
            const confirmed = await verifyPayment(booking._id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await finish(confirmed.booking);
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
      // 503: this server has no Razorpay keys. The backend refuses the
      // no-gateway settle whenever they are configured.
      if (error?.response?.status === 503) {
        try {
          const settled = await settleWithoutGateway(booking._id);
          await finish(settled.booking);
        } catch (settleError) {
          showToast(settleError?.response?.data?.message || 'Could not confirm this booking');
        } finally {
          setSubmitting(false);
        }
        return undefined;
      }
      setSubmitting(false);
      showToast(error?.response?.data?.message || 'Could not start the payment');
    }
    return undefined;
  };

  if (loading) {
    return (
      <View style={dhs.page}>
        <Header title="BOOK TOUR PACKAGE" subtitle="Loading package" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <View style={{ padding: space.lg, gap: space.md }} accessibilityLabel="Loading package">
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

  if (!pkg) {
    return (
      <View style={dhs.page}>
        <Header title="Package unavailable" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <StateBlock card={false} icon="fa-solid fa-suitcase-rolling" title="This tour is no longer available" actionLabel="See all packages" onAction={() => router.replace('/app/packages')} />
      </View>
    );
  }

  // The server is the only judge of a code: applying one simply re-quotes.
  const appliedCoupon = quote?.coupon?.code || '';
  const couponProblem = quote?.coupon?.reason || '';

  const applyPromo = () => {
    const next = promoInput.trim().toUpperCase();
    if (!next) return;
    setPromoInput(next);
    setCouponCode(next);
  };

  const clearPromo = () => {
    setPromoInput('');
    setCouponCode('');
  };

  const openDate = () => {
    if (Platform.OS !== 'android') return;
    DateTimePickerAndroid.open({
      value: travelDate ? fromIso(travelDate) : new Date(),
      mode: 'date',
      minimumDate: fromIso(isoDate(pkg.leadTimeDays)),
      onChange: (event, date) => {
        if (event.type === 'set' && date) setTravelDate(toIso(date));
      },
    });
  };

  const payableNow = quote ? quote.advanceAmount : 0;
  const canSubmit = Boolean(quote) && !quoting;
  const dateShown = travelDate ? fromIso(travelDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const ctaFull = quote ? `Confirm & Pay (${rupees(payableNow)})` : 'Loading price…';

  return (
    <View style={dhs.page}>
      <Header title="BOOK TOUR PACKAGE" subtitle={pkg.title} showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <FormScroll contentContainerStyle={{ padding: space.lg, gap: space.lg }} bottomSpace={space.xxl}>
        <Panel style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Image source={{ uri: pkg.heroImage }} style={styles.thumb} />
            <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 2 }}>
              <StatusBadge label={`${pkg.type} • ${pkg.duration}`} tone="gold" style={{ maxWidth: '100%' }} />
              <Text style={[dhs.h3, { marginTop: space.xs }]} numberOfLines={2}>
                {pkg.title}
              </Text>
              {pkg.destinations.length > 0 ? (
                <View style={[dhs.row, { gap: space.xs + 2 }]}>
                  <Fa name="fa-solid fa-map-pin" size={12} color={color.primary} />
                  <Text style={styles.dest} numberOfLines={1}>
                    {pkg.destinations.join(' • ')}
                  </Text>
                </View>
              ) : null}
              {pkg.operator?.name ? <Text style={styles.operator}>Operated by {pkg.operator.name}</Text> : null}
            </View>
          </View>

          <View style={styles.counters}>
            <View>
              <Text style={dhs.label}>Start date</Text>
              <Press scale={0.99} onPress={openDate} style={[dhs.input, dhs.row, { justifyContent: 'space-between' }]} accessibilityRole="button" accessibilityLabel={`Start Date: ${dateShown}`}>
                <Text style={styles.dateText}>{dateShown}</Text>
                <Fa name="fa-regular fa-calendar" size={16} color={color.primary} />
              </Press>
            </View>
            <View style={styles.counter}>
              <View style={[dhs.row, { gap: space.sm, flexShrink: 1 }]}>
                <Fa name="fa-solid fa-user" size={16} color={color.primary} />
                <Text style={styles.counterLabel}>Adults</Text>
              </View>
              <Stepper value={adults} onChange={setAdults} min={1} label="adults" />
            </View>
            <View style={styles.counter}>
              <View style={[dhs.row, { gap: space.sm, flexShrink: 1 }]}>
                <Fa name="fa-solid fa-child" size={16} color={color.primary} />
                <Text style={styles.counterLabel}>Children</Text>
              </View>
              <Stepper value={children} onChange={setChildren} min={0} label="children" />
            </View>
          </View>

          <Text style={styles.groupNote}>
            {pkg.groupSize}
            {pkg.leadTimeDays > 0 ? ` • book at least ${pkg.leadTimeDays} day${pkg.leadTimeDays > 1 ? 's' : ''} ahead` : ''}
          </Text>
        </Panel>

        {pkg.pickupPoints.length > 0 ? (
          <Panel style={{ gap: space.sm }}>
            <PanelTitle icon="fa-solid fa-location-dot">Pickup point in Dima Hasao</PanelTitle>
            <SelectField
              value={pickupPoint}
              options={pkg.pickupPoints.map((point) => ({ value: point, label: point }))}
              onChange={setPickupPoint}
              accessibilityLabel="Pickup Point"
              style={[dhs.input, { gap: space.sm }]}
              textStyle={styles.pickupText}
              chevronColor={color.text}
            />
          </Panel>
        ) : null}

        <Panel style={{ gap: space.md }}>
          <PanelTitle icon="fa-solid fa-id-card">Lead traveller details</PanelTitle>
          <View style={{ gap: space.md }}>
            <Field label="Full name" value={travelerName} onChangeText={setTravelerName} placeholder="Name on the booking" autoCapitalize="words" autoComplete="name" />
            <Field label="Phone number" value={travelerPhone} onChangeText={setTravelerPhone} placeholder="10-digit mobile" keyboardType="phone-pad" autoComplete="tel" />
            <Field label="Email ID" value={travelerEmail} onChangeText={setTravelerEmail} placeholder="For your invoice" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Field label="Anything the operator should know?" value={specialRequest} onChangeText={setSpecialRequest} placeholder="Dietary needs, window seats, accessibility…" multiline />
          </View>
        </Panel>

        {/* Razorpay shows its own picker, so this states what happens. */}
        <Panel style={{ gap: space.sm }}>
          <PanelTitle icon="fa-solid fa-credit-card">Payment mode</PanelTitle>
          <Text style={styles.payNote}>You&apos;ll choose UPI, card or net banking in the secure payment window.</Text>
          <View style={[dhs.row, { gap: space.lg, paddingTop: space.xs }]}>
            <Fa name="fa-solid fa-qrcode" size={18} color={color.primary} />
            <Fa name="fa-solid fa-credit-card" size={18} color={color.primary} />
            <Fa name="fa-solid fa-building-columns" size={18} color={color.primary} />
          </View>
        </Panel>

        <Panel style={{ gap: space.md }}>
          <PanelTitle icon="fa-solid fa-tag">Promo code</PanelTitle>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Field
              style={{ flex: 1 }}
              value={promoInput}
              onChangeText={(v) => setPromoInput(v.toUpperCase())}
              onSubmitEditing={applyPromo}
              returnKeyType="done"
              placeholder="Enter code"
              autoCapitalize="characters"
              inputStyle={type.bodyStrong}
            />
            {appliedCoupon ? (
              <GreenButton title="Remove" variant="outline" fullWidth={false} onPress={clearPromo} />
            ) : (
              <GreenButton title="Apply" variant="secondary" fullWidth={false} onPress={applyPromo} disabled={!promoInput.trim() || quoting} />
            )}
          </View>

          {appliedCoupon && quote?.discount > 0 ? (
            <View style={[dhs.row, { gap: space.sm }]}>
              <Fa name="fa-solid fa-circle-check" size={14} color={color.success} />
              <Text style={styles.couponOk}>
                {appliedCoupon} applied — you saved {rupees(quote.discount)}
              </Text>
            </View>
          ) : null}
          {couponProblem ? (
            <View style={[dhs.row, { gap: space.sm }]}>
              <Fa name="fa-solid fa-circle-exclamation" size={14} color={color.danger} />
              <Text style={styles.couponBad}>{couponProblem}</Text>
            </View>
          ) : null}

          {offers.length > 0 && !appliedCoupon ? (
            <View style={{ gap: space.sm }}>
              {offers.map((offer) => (
                <Press
                  key={offer._id}
                  scale={0.98}
                  onPress={() => {
                    setPromoInput(offer.code);
                    setCouponCode(offer.code);
                  }}
                  style={styles.offer}
                  accessibilityLabel={`Apply ${offer.code}: ${offer.title}`}
                >
                  <Fa name="fa-solid fa-ticket" size={16} color={color.goldText} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.offerCode}>{offer.code}</Text>
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                  </View>
                  <Text style={styles.offerApply}>Apply</Text>
                </Press>
              ))}
            </View>
          ) : null}
        </Panel>

        <Panel style={{ gap: space.md }}>
          <PanelTitle icon="fa-solid fa-receipt">Price breakdown</PanelTitle>
          {quoteError ? (
            <QuoteError>{quoteError}</QuoteError>
          ) : !quote ? (
            <View style={{ gap: space.sm, paddingVertical: space.xs }} accessibilityLabel="Loading price">
              <Pulse tone={100} style={{ height: 13 }} />
              <Pulse tone={100} style={{ height: 13, width: '66%' }} />
              <Pulse style={{ height: 18, width: '50%' }} />
            </View>
          ) : (
            <View style={[{ gap: space.sm }, quoting && { opacity: 0.5 }]}>
              <FareLine
                label={`Package base price (${quote.adults} adult${quote.adults === 1 ? '' : 's'}${quote.children > 0 ? `, ${quote.children} children` : ''})`}
                value={rupees(quote.baseAmount)}
              />
              {quote.discount > 0 ? <FareLine green label="Discount" value={`- ${rupees(quote.discount)}`} /> : null}
              <FareLine label={`Tourism GST & permits (${quote.taxRate}%)`} value={rupees(quote.taxes)} />
              <FareTotal label="Total package fare" value={rupees(quote.totalAmount)} />
              {quote.balanceDue > 0 ? (
                <View style={styles.split}>
                  <View style={styles.splitRow}>
                    <Text style={styles.splitStrong}>Pay now ({quote.advancePercent}% advance)</Text>
                    <Text style={styles.splitStrong}>{rupees(quote.advanceAmount)}</Text>
                  </View>
                  <View style={styles.splitRow}>
                    <Text style={styles.splitText}>Pay the operator on the day</Text>
                    <Text style={[styles.splitText, { color: color.text }]}>{rupees(quote.balanceDue)}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </Panel>
      </FormScroll>

      <View style={[styles.bar, { paddingBottom: space.md + insets.bottom }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.barLabel} numberOfLines={1}>
            {quote && quote.balanceDue > 0 ? 'Advance payable now' : 'Total payable'}
          </Text>
          {quote ? <Text style={[styles.barPrice, quoting && { opacity: 0.5 }]}>{rupees(payableNow)}</Text> : <Pulse style={{ height: 20, width: 88, marginTop: 4 }} />}
        </View>
        <GreenButton size="lg" fullWidth={false} icon="fa-solid fa-lock" title={quote ? 'Confirm & pay' : 'Loading…'} accessibilityLabel={ctaFull} onPress={handleConfirmTour} disabled={!canSubmit} loading={submitting} />
      </View>

      {createdTourData ? (
        <ConfirmedDialog
          visible={isSuccessModalOpen}
          onDone={() => setIsSuccessModalOpen(false)}
          icon="fa-solid fa-compass"
          title="Tour package confirmed!"
          text="Your expedition has been booked successfully"
          id={createdTourData.id}
          kicker="Tour"
          heading={createdTourData.packageTitle}
          sub={createdTourData.duration}
          rows={[
            ['Travel Date:', createdTourData.travelDate],
            ['Travelers:', createdTourData.travelers],
            ['Your Operator:', `${createdTourData.operatorName}${createdTourData.operatorPhone ? ` (${createdTourData.operatorPhone})` : ''}`, { wide: true, green: true }],
          ]}
          footer={
            <>
              <InvoiceTotalRow label="Paid online:" value={rupees(createdTourData.amountPaid)} />
              {createdTourData.balanceDue > 0 ? <InvoiceTotalRow amber label="Due to the operator:" value={rupees(createdTourData.balanceDue)} /> : null}
            </>
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 84, height: 84, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  dest: { flex: 1, ...type.caption, color: color.textMuted },
  operator: { ...type.caption, color: color.textMuted },
  counters: { gap: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  counter: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, backgroundColor: color.surfaceMuted, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radii.md },
  counterLabel: { ...type.bodyStrong, color: color.text },
  dateText: { ...type.bodyStrong, color: color.text },
  groupNote: { ...type.caption, color: color.textMuted, textAlign: 'center' },
  pickupText: { flex: 1, ...type.bodyStrong, color: color.text },
  payNote: { ...type.small, color: color.textSecondary },
  couponOk: { flex: 1, ...type.label, color: color.success },
  couponBad: { flex: 1, ...type.small, color: color.danger },
  offer: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.goldSoft, borderWidth: 1, borderStyle: 'dashed', borderColor: color.gold, borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: space.sm },
  offerCode: { ...type.bodyStrong, letterSpacing: 0.3, color: color.text },
  offerTitle: { ...type.caption, color: color.textSecondary },
  offerApply: { ...type.label, color: color.primary },
  split: { marginTop: space.sm, backgroundColor: color.surfaceMuted, borderRadius: radii.md, padding: space.md, gap: space.xs },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  splitStrong: { ...type.bodyStrong, color: color.text, flexShrink: 1 },
  splitText: { ...type.small, color: color.textSecondary, flexShrink: 1 },
  bar: { backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md, ...elevation.sheet },
  barLabel: { ...type.caption, color: color.textMuted },
  barPrice: { ...type.price, color: color.text },
});
