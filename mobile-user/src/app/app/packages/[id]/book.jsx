import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Image from '../../../../components/Img';
import { router, useLocalSearchParams } from 'expo-router';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Fa from '../../../../components/Fa';
import { Press } from '../../../../components/ui';
import { SelectField } from '../../../../components/kit';
import { Header, PatternDivider } from '../../../../components/dh/Header';
import { ConfirmedDialog, FareLine, FareTotal, InvoiceTotalRow, QuoteError } from '../../../../components/dh/booking';
import { Field, FormScroll, GreenButton, Panel, PanelTitle, Pulse, StateBlock, Stepper, dhs, fromIso, rupees, toIso } from '../../../../components/dh/ui';
import { useBooking } from '../../../../context/BookingContext';
import { createBooking, createPaymentOrder, fetchPackageById, fetchTourOffers, quoteBooking, settleWithoutGateway, verifyPayment } from '../../../../api/dh/toursApi';
import { initRazorpayPayment } from '../../../../lib/razorpay';
import { dh, montserrat, poppins, shadow, tw } from '../../../../theme';

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

  if (!pkg) {
    return (
      <View style={dhs.page}>
        <Header title="Package unavailable" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <StateBlock card={false} icon="fa-solid fa-suitcase-rolling" title="This tour is no longer available" actionLabel="See All Packages" onAction={() => router.replace('/app/packages')} />
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

  return (
    <View style={dhs.page}>
      <Header title="BOOK TOUR PACKAGE" subtitle={pkg.title} showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <FormScroll contentContainerStyle={{ padding: 14, gap: 16 }} bottomSpace={40}>
        <Panel style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Image source={{ uri: pkg.heroImage }} style={styles.thumb} />
            <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
              <Text style={styles.typeBadge} numberOfLines={1}>
                {pkg.type} • {pkg.duration}
              </Text>
              <Text style={[dhs.h3, { marginTop: 4 }]} numberOfLines={1}>{pkg.title}</Text>
              {pkg.destinations.length > 0 ? (
                <View style={[dhs.row, { gap: 4, marginTop: 2 }]}>
                  <Fa name="fa-solid fa-map-pin" size={11} color={tw.emerald700} />
                  <Text style={styles.dest} numberOfLines={1}>{pkg.destinations.join(' • ')}</Text>
                </View>
              ) : null}
              {pkg.operator?.name ? <Text style={styles.operator}>Operated by {pkg.operator.name}</Text> : null}
            </View>
          </View>

          <View style={styles.counters}>
            <Press scale={0.98} onPress={openDate} style={styles.counter} accessibilityRole="button" accessibilityLabel={`Start Date: ${dateShown}`}>
              <Text style={styles.counterLabel}>Start Date</Text>
              <Text style={styles.dateText}>{dateShown}</Text>
            </Press>
            <View style={styles.counter}>
              <Text style={styles.counterLabel}>Adults</Text>
              <View style={{ marginTop: 4 }}>
                <Stepper value={adults} onChange={setAdults} min={1} label="adults" />
              </View>
            </View>
            <View style={styles.counter}>
              <Text style={styles.counterLabel}>Children</Text>
              <View style={{ marginTop: 4 }}>
                <Stepper value={children} onChange={setChildren} min={0} label="children" />
              </View>
            </View>
          </View>

          <Text style={styles.groupNote}>
            {pkg.groupSize}
            {pkg.leadTimeDays > 0 ? ` • book at least ${pkg.leadTimeDays} day${pkg.leadTimeDays > 1 ? 's' : ''} ahead` : ''}
          </Text>
        </Panel>

        {pkg.pickupPoints.length > 0 ? (
          <Panel style={{ gap: 10 }}>
            <Text style={styles.pickupLabel}>Pickup Point in Dima Hasao</Text>
            <SelectField
              value={pickupPoint}
              options={pkg.pickupPoints.map((point) => ({ value: point, label: point }))}
              onChange={setPickupPoint}
              accessibilityLabel="Pickup Point"
              style={[dhs.input, { gap: 8 }]}
              textStyle={styles.pickupText}
            />
          </Panel>
        ) : null}

        <Panel style={{ gap: 12 }}>
          <PanelTitle icon="fa-solid fa-id-card">Lead Traveler Details</PanelTitle>
          <View style={{ gap: 10 }}>
            <Field label="Full Name" value={travelerName} onChangeText={setTravelerName} placeholder="Name on the booking" autoCapitalize="words" autoComplete="name" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Field style={{ flex: 1 }} label="Phone Number" value={travelerPhone} onChangeText={setTravelerPhone} placeholder="10-digit mobile" keyboardType="phone-pad" autoComplete="tel" />
              <Field style={{ flex: 1 }} label="Email ID" value={travelerEmail} onChangeText={setTravelerEmail} placeholder="For your invoice" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            </View>
            <Field label="Anything the operator should know?" value={specialRequest} onChangeText={setSpecialRequest} placeholder="Dietary needs, window seats, accessibility…" multiline inputStyle={{ minHeight: 52 }} />
          </View>
        </Panel>

        {/* Razorpay shows its own picker, so this states what happens. */}
        <Panel style={{ gap: 6 }}>
          <PanelTitle icon="fa-solid fa-credit-card">Payment Mode</PanelTitle>
          <Text style={styles.payNote}>You&apos;ll choose UPI, card or net banking in the secure payment window.</Text>
          <View style={[dhs.row, { gap: 12, paddingTop: 4 }]}>
            <Fa name="fa-solid fa-qrcode" size={14} color={tw.emerald900} />
            <Fa name="fa-solid fa-credit-card" size={14} color={tw.emerald900} />
            <Fa name="fa-solid fa-building-columns" size={14} color={tw.emerald900} />
          </View>
        </Panel>

        <Panel style={{ gap: 10 }}>
          <PanelTitle icon="fa-solid fa-tag">Promo Code</PanelTitle>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Field
              style={{ flex: 1 }}
              value={promoInput}
              onChangeText={(v) => setPromoInput(v.toUpperCase())}
              onSubmitEditing={applyPromo}
              returnKeyType="done"
              placeholder="Enter code"
              autoCapitalize="characters"
              inputStyle={[{ height: 40, backgroundColor: '#fff', letterSpacing: 0.3 }, poppins(600)]}
            />
            {appliedCoupon ? (
              <Press onPress={clearPromo} style={styles.removeBtn}>
                <Text style={styles.removeText}>Remove</Text>
              </Press>
            ) : (
              <GreenButton title="Apply" onPress={applyPromo} disabled={!promoInput.trim() || quoting} style={{ shadowOpacity: 0 }} />
            )}
          </View>

          {appliedCoupon && quote?.discount > 0 ? (
            <View style={[dhs.row, { gap: 6 }]}>
              <Fa name="fa-solid fa-circle-check" size={12} color={tw.emerald700} />
              <Text style={styles.couponOk}>
                {appliedCoupon} applied — you saved {rupees(quote.discount)}
              </Text>
            </View>
          ) : null}
          {couponProblem ? (
            <View style={[dhs.row, { gap: 6 }]}>
              <Fa name="fa-solid fa-circle-exclamation" size={12} color={tw.red600} />
              <Text style={styles.couponBad}>{couponProblem}</Text>
            </View>
          ) : null}

          {offers.length > 0 && !appliedCoupon ? (
            <View style={{ gap: 6, paddingTop: 4 }}>
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
                  <Text style={styles.offerCode}>{offer.code}</Text>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                </Press>
              ))}
            </View>
          ) : null}
        </Panel>

        <Panel style={{ gap: 8 }}>
          <Text style={dhs.h3}>Price Breakdown</Text>
          {quoteError ? (
            <QuoteError>{quoteError}</QuoteError>
          ) : !quote ? (
            <View style={{ gap: 8, paddingVertical: 4 }}>
              <Pulse tone={100} style={{ height: 12 }} />
              <Pulse tone={100} style={{ height: 12, width: '66%' }} />
              <Pulse style={{ height: 16, width: '50%' }} />
            </View>
          ) : (
            <View style={[{ gap: 6 }, quoting && { opacity: 0.5 }]}>
              <FareLine
                label={`Package Base Price (${quote.adults} Adult${quote.adults === 1 ? '' : 's'}${quote.children > 0 ? `, ${quote.children} Children` : ''})`}
                value={rupees(quote.baseAmount)}
              />
              {quote.discount > 0 ? <FareLine green label="Discount" value={`- ${rupees(quote.discount)}`} /> : null}
              <FareLine label={`Tourism GST & Permits (${quote.taxRate}%)`} value={rupees(quote.taxes)} />
              <FareTotal label="Total Package Fare" value={rupees(quote.totalAmount)} />
              {quote.balanceDue > 0 ? (
                <View style={styles.split}>
                  <View style={styles.splitRow}>
                    <Text style={styles.splitStrong}>Pay now ({quote.advancePercent}% advance)</Text>
                    <Text style={styles.splitStrong}>{rupees(quote.advanceAmount)}</Text>
                  </View>
                  <View style={styles.splitRow}>
                    <Text style={styles.splitText}>Pay the operator on the day</Text>
                    <Text style={[styles.splitText, poppins(600)]}>{rupees(quote.balanceDue)}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </Panel>

        <GreenButton
          size="lg"
          icon="fa-solid fa-lock"
          title={quote ? `Confirm & Pay (${rupees(payableNow)})` : 'Loading price…'}
          onPress={handleConfirmTour}
          disabled={!canSubmit}
          loading={submitting}
          style={shadow('md')}
        />
      </FormScroll>

      {createdTourData ? (
        <ConfirmedDialog
          visible={isSuccessModalOpen}
          onDone={() => setIsSuccessModalOpen(false)}
          icon="fa-solid fa-compass"
          title="Tour Package Confirmed!"
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
  thumb: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: tw.gray100 },
  typeBadge: { fontSize: 10, lineHeight: 15, color: tw.amber700, backgroundColor: tw.amber50, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: tw.amber200, overflow: 'hidden', maxWidth: '100%', ...poppins(700) },
  dest: { flex: 1, fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(400) },
  operator: { fontSize: 10, lineHeight: 15, color: tw.gray400, marginTop: 2, ...poppins(400) },
  counters: { flexDirection: 'row', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100 },
  counter: { flex: 1, alignItems: 'center', backgroundColor: dh.cream, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(229,221,195,0.6)' },
  counterLabel: { fontSize: 10, lineHeight: 15, color: tw.gray500, ...poppins(400) },
  dateText: { fontSize: 11, lineHeight: 20, color: tw.gray900, marginTop: 4, ...poppins(700) },
  groupNote: { fontSize: 10, lineHeight: 15, color: tw.gray400, textAlign: 'center', ...poppins(400) },
  pickupLabel: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...montserrat(700) },
  pickupText: { fontSize: 12, color: tw.gray900, ...poppins(600) },
  payNote: { fontSize: 12, lineHeight: 19.5, color: tw.gray600, ...poppins(400) },
  removeBtn: { paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: dh.border, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(700) },
  couponOk: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.emerald700, ...poppins(600) },
  couponBad: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.red600, ...poppins(400) },
  offer: { backgroundColor: dh.cream, borderWidth: 1, borderStyle: 'dashed', borderColor: '#C9B98A', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  offerCode: { fontSize: 12, lineHeight: 16, letterSpacing: 0.3, color: tw.emerald950, ...poppins(900) },
  offerTitle: { fontSize: 11, lineHeight: 15, color: tw.gray600, ...poppins(400) },
  split: { marginTop: 8, backgroundColor: dh.cream, borderWidth: 1, borderColor: dh.border, borderRadius: 12, padding: 10, gap: 4 },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  splitStrong: { fontSize: 12, lineHeight: 16, color: tw.emerald950, ...poppins(700) },
  splitText: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
});
