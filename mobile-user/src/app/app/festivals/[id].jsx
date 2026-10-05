import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Image from '../../../components/Img';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../../components/Fa';
import { Press } from '../../../components/ui';
import { Dialog } from '../../../components/kit';
import { Header, PatternDivider } from '../../../components/dh/Header';
import { GreenButton, Panel, PanelTitle, Pulse, StateBlock, dhs } from '../../../components/dh/ui';
import { useBooking } from '../../../context/BookingContext';
import {
  checkoutFestivalBasket,
  createGroupPaymentOrder,
  fetchFestivalById,
  releaseCheckout,
  settleGroupWithoutGateway,
  verifyGroupPayment,
} from '../../../api/dh/festivalApi';
import { initRazorpayPayment } from '../../../lib/razorpay';
import { dh, montserrat, poppins, shadow, tw } from '../../../theme';

// Web: DimaHasao/pages/FestivalDetailScreen.jsx (/app/festivals/:id)
// Amounts come from the server; one checkout covers every selected category.

export default function FestivalDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user, showToast, refreshFestivalBookings } = useBooking();

  const [festival, setFestival] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ticketQuantities, setTicketQuantities] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdPassData, setCreatedPassData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchFestivalById(id)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setFestival(null);
          return;
        }
        setFestival(found);
        const first = found.ticketCategories.find((c) => !c.isSoldOut);
        if (first) setTicketQuantities({ [first.id]: 1 });
      })
      .catch(() => {
        if (!cancelled) setFestival(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const categories = festival?.ticketCategories || [];

  const handleUpdateQty = (catId, delta) => {
    const category = categories.find((c) => c.id === catId);
    if (!category) return;
    setTicketQuantities((prev) => {
      const current = prev[catId] || 0;
      // Never past what is left or the per-order cap: the server refuses either.
      const ceiling = Math.min(category.remainingTickets, category.maxPerBooking);
      return { ...prev, [catId]: Math.max(0, Math.min(ceiling, current + delta)) };
    });
  };

  const totalTickets = Object.values(ticketQuantities).reduce((a, b) => a + b, 0);
  // No tax on passes: the server returns taxRate 0.
  const totalAmount = categories.reduce((sum, cat) => sum + cat.price * (ticketQuantities[cat.id] || 0), 0);
  const selections = categories.map((c) => ({ category: c, count: ticketQuantities[c.id] || 0 })).filter((s) => s.count > 0);

  /** Pay for the whole basket at once (one gateway order per order group). */
  const payForGroup = (orderGroupId, passCount) =>
    new Promise((resolve, reject) => {
      createGroupPaymentOrder(orderGroupId)
        .then((order) =>
          initRazorpayPayment({
            key: order.razorpayKeyId,
            amount: order.order.amount,
            currency: order.order.currency || 'INR',
            order_id: order.order.id,
            name: 'Dima Hasao Festivals',
            description: `${festival.name} — ${passCount} ${passCount === 1 ? 'pass' : 'passes'}`,
            themeColor: '#0a4d2b',
            prefill: { name: user?.name || '', contact: user?.phone || '' },
            notes: { orderGroupId },
            handler: async (response) => {
              try {
                const confirmed = await verifyGroupPayment(orderGroupId, {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });
                resolve(confirmed.bookings);
              } catch (error) {
                reject(error);
              }
            },
            // Either way the seats go straight back.
            onError: (error) => {
              releaseCheckout(orderGroupId).catch(() => {});
              reject(new Error(error?.description || 'Payment failed'));
            },
            onClose: () => {
              releaseCheckout(orderGroupId).catch(() => {});
              reject(new Error('Payment cancelled. Your passes are not confirmed.'));
            },
          }),
        )
        .catch(async (error) => {
          // 503: this server has no Razorpay keys.
          if (error?.response?.status === 503) {
            try {
              const settled = await settleGroupWithoutGateway(orderGroupId);
              resolve(settled.bookings);
            } catch (settleError) {
              reject(settleError);
            }
            return;
          }
          reject(error);
        });
    });

  const handleBookTickets = async () => {
    if (submitting) return undefined;
    if (!user?.isLoggedIn) {
      showToast('Please sign in to book passes');
      return router.push('/app/login');
    }
    if (!selections.length) return showToast('Please select at least 1 pass');

    try {
      setSubmitting(true);
      // One call holds every category's seats, or none of them.
      const held = await checkoutFestivalBasket({
        festivalId: festival.id,
        items: selections.map(({ category, count }) => ({ ticketCategoryId: category.id, ticketCount: count })),
      });
      const confirmed = await payForGroup(held.orderGroupId, held.totalTickets);
      await refreshFestivalBookings();

      const first = confirmed[0];
      setCreatedPassData({
        id: first.bookingId,
        orderGroupId: held.orderGroupId,
        festivalName: festival.name,
        dates: festival.dates,
        venue: festival.venue,
        // Each category keeps its own pass code.
        passes: confirmed.map((b) => ({ bookingId: b.bookingId, category: b.ticketCategoryName, count: b.ticketCount, qrCode: b.qrCode })),
        ticketCount: confirmed.reduce((sum, b) => sum + b.ticketCount, 0),
        totalAmount: confirmed.reduce((sum, b) => sum + b.totalAmount, 0),
      });
      setIsSuccessModalOpen(true);
    } catch (error) {
      showToast(error?.response?.data?.message || error.message || 'Could not book these passes');
    } finally {
      setSubmitting(false);
    }
    return undefined;
  };

  if (loading) {
    return (
      <View style={dhs.page}>
        <Header title="Loading festival" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <Pulse style={{ height: 208, borderRadius: 0 }} />
        <View style={{ padding: 14, gap: 12 }}>
          {[0, 1].map((n) => (
            <Panel key={n} style={{ gap: 8 }}>
              <Pulse style={{ height: 14, width: '50%' }} />
              <Pulse tone={100} style={{ height: 12 }} />
            </Panel>
          ))}
        </View>
      </View>
    );
  }

  if (!festival) {
    return (
      <View style={dhs.page}>
        <Header title="Festival unavailable" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <StateBlock card={false} icon="fa-solid fa-ticket" title="This festival is no longer on sale" actionLabel="See All Festivals" onAction={() => router.replace('/app/festivals')} />
      </View>
    );
  }

  const leave = (to) => {
    setIsSuccessModalOpen(false);
    router.dismissTo('/app');
    if (to) router.navigate(to);
  };

  return (
    <View style={dhs.page}>
      <Header title={festival.name} subtitle={festival.dates} showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}>
        <View style={styles.hero}>
          <Image source={{ uri: festival.heroImage }} style={[StyleSheet.absoluteFill, { opacity: 0.85 }]} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
          <View style={styles.heroBody}>
            <Text style={styles.dates}>{festival.dates}</Text>
            <Text style={styles.heroTitle}>{festival.name}</Text>
            <View style={[dhs.row, { gap: 4 }]}>
              <Fa name="fa-solid fa-location-dot" size={12} color={tw.amber400} />
              <Text style={styles.venue} numberOfLines={1}>{festival.venue}</Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 14, gap: 16 }}>
          <Panel style={{ gap: 10 }}>
            <View style={[dhs.row, { gap: 8 }]}>
              <Fa name="fa-solid fa-building-columns" size={11} color={tw.emerald800} />
              <Text style={styles.organizer}>Organized by: {festival.organizer}</Text>
            </View>
            <Text style={styles.desc}>{festival.description}</Text>
          </Panel>

          <Panel style={{ gap: 10 }}>
            <View style={[dhs.row, { gap: 8 }]}>
              <Fa name="fa-solid fa-star" size={14} color={tw.amber400} />
              <Text style={dhs.h3}>Festival Attractions &amp; Lineup</Text>
            </View>
            <View style={{ gap: 8 }}>
              {festival.highlights.map((hl, idx) => (
                <View key={idx} style={styles.highlight}>
                  <Fa name="fa-solid fa-circle-check" size={12} color={tw.emerald600} style={{ marginTop: 3 }} />
                  <Text style={styles.highlightText}>{hl}</Text>
                </View>
              ))}
            </View>
          </Panel>

          <View style={{ gap: 12 }}>
            <PanelTitle style={{ paddingHorizontal: 4 }} right={<Text style={styles.realtime}>Real-Time Available</Text>}>
              Select Ticket Category
            </PanelTitle>

            {categories.map((cat) => {
              const qty = ticketQuantities[cat.id] || 0;
              return (
                <View key={cat.id} style={[styles.cat, cat.isSoldOut ? styles.catSoldOut : qty > 0 ? styles.catSelected : null]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <View style={[dhs.row, { gap: 8, flexWrap: 'wrap' }]}>
                        <Text style={dhs.h3}>{cat.name}</Text>
                        {cat.isSoldOut ? (
                          <Text style={[styles.seats, { backgroundColor: tw.red100, color: tw.red700 }]}>Sold Out</Text>
                        ) : (
                          <Text style={[styles.seats, cat.remainingTickets <= 10 ? { backgroundColor: tw.amber100, color: tw.amber800 } : null]}>
                            {cat.remainingTickets} of {cat.totalTickets} seats left
                          </Text>
                        )}
                      </View>
                      <View style={[dhs.row, { alignItems: 'baseline', gap: 6, marginTop: 4 }]}>
                        <Text style={styles.catPrice}>₹{cat.price}</Text>
                        {cat.originalPrice ? <Text style={styles.strike}>₹{cat.originalPrice}</Text> : null}
                      </View>
                    </View>

                    {!cat.isSoldOut ? (
                      <View style={styles.stepper}>
                        <Press onPress={() => handleUpdateQty(cat.id, -1)} hitSlop={8} style={styles.stepBtn} accessibilityLabel={`Fewer ${cat.name} passes`}>
                          <Text style={styles.stepSign}>-</Text>
                        </Press>
                        <Text style={styles.stepQty}>{qty}</Text>
                        <Press onPress={() => handleUpdateQty(cat.id, 1)} hitSlop={8} style={styles.stepBtn} accessibilityLabel={`More ${cat.name} passes`}>
                          <Text style={styles.stepSign}>+</Text>
                        </Press>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.perks}>
                    {cat.perks.map((perk, idx) => (
                      <View key={idx} style={[dhs.row, { gap: 6 }]}>
                        <Fa name="fa-solid fa-check" size={10} color={tw.emerald600} />
                        <Text style={styles.perk}>{perk}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: 12 + insets.bottom }]}>
        {!festival.bookingOpen ? (
          // The server refuses a sale outside the window, so the bar says why.
          <View style={[dhs.row, { flex: 1, justifyContent: 'center', gap: 6, paddingVertical: 6 }]}>
            <Fa name="fa-solid fa-lock" size={10} color={tw.gray400} />
            <Text style={styles.closed}>{festival.bookingClosedReason || 'Booking is closed for this festival'}</Text>
          </View>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <Text style={styles.barLabel}>
                {totalTickets} {totalTickets === 1 ? 'PASS' : 'PASSES'} SELECTED
              </Text>
              <View style={[dhs.row, { alignItems: 'baseline', gap: 4 }]}>
                <Text style={styles.barPrice}>₹{totalAmount.toLocaleString('en-IN')}</Text>
                <Text style={styles.barTotal}>total</Text>
              </View>
            </View>
            <GreenButton
              title="Book Passes Now"
              icon="fa-solid fa-ticket"
              onPress={handleBookTickets}
              disabled={totalTickets === 0}
              loading={submitting}
              style={{ paddingHorizontal: 20, ...shadow('md') }}
            />
          </>
        )}
      </View>

      <Dialog visible={isSuccessModalOpen && Boolean(createdPassData)} onClose={() => {}} closeOnBackdrop={false} backdrop="rgba(0,0,0,0.75)" panelStyle={[styles.modal, { maxHeight: height * 0.9 }]}>
        {createdPassData ? (
          <ScrollView contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={styles.okIcon}>
                <Fa name="fa-solid fa-ticket" size={24} color={tw.emerald800} />
              </View>
              <Text style={styles.okTitle}>Festival Pass Confirmed!</Text>
              <Text style={styles.okText}>Official Government Tourism E-Ticket</Text>
              <Text style={styles.okId}>Pass ID: {createdPassData.id}</Text>
            </View>

            <View style={styles.pass}>
              {/* One pass code per category: they are scanned separately at the gate. */}
              <View style={{ gap: 8 }}>
                {createdPassData.passes.map((pass) => (
                  <View key={pass.bookingId} style={styles.passRow}>
                    <Fa name="fa-solid fa-qrcode" size={30} color={tw.gray900} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.passName} numberOfLines={1}>
                        {pass.count} × {pass.category}
                      </Text>
                      <Text style={styles.passCode} selectable>{pass.qrCode}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.passFest}>
                <Text style={styles.passFestName}>{createdPassData.festivalName}</Text>
                <Text style={styles.passFestDates}>{createdPassData.dates}</Text>
              </View>
              <View style={styles.passGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gridLabel}>Pass Count:</Text>
                  <Text style={styles.gridValue}>{createdPassData.ticketCount} Tickets</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gridLabel}>Total Amount:</Text>
                  <Text style={[styles.gridValue, { color: tw.emerald900, ...poppins(700) }]}>₹{createdPassData.totalAmount.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>

            <View style={{ gap: 8, paddingTop: 4 }}>
              <GreenButton title="View in My Bookings" icon="fa-solid fa-calendar-check" style={{ paddingVertical: 12, ...shadow('md') }} onPress={() => leave('/app/bookings')} />
              <GreenButton tone="gray" title="Back to Home" textStyle={poppins(600)} onPress={() => leave(null)} />
            </View>
          </ScrollView>
        ) : null}
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 208, backgroundColor: '#000' },
  heroBody: { position: 'absolute', bottom: 12, left: 14, right: 14, gap: 4, alignItems: 'flex-start' },
  dates: { fontSize: 10, lineHeight: 15, color: '#fff', backgroundColor: tw.amber500, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', ...poppins(700) },
  heroTitle: { fontSize: 18, lineHeight: 22.5, color: '#fff', ...montserrat(700) },
  venue: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray200, ...poppins(400) },
  organizer: { flex: 1, fontSize: 11, lineHeight: 16.5, color: tw.emerald800, ...poppins(700) },
  desc: { fontSize: 12, lineHeight: 19.5, color: tw.gray600, ...poppins(400) },
  highlight: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  highlightText: { flex: 1, fontSize: 12, lineHeight: 19.5, color: tw.gray700, ...poppins(400) },
  realtime: { fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(500) },
  cat: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: dh.border, ...shadow('xs') },
  catSoldOut: { borderColor: tw.gray200, opacity: 0.6 },
  catSelected: { borderColor: tw.emerald700, borderWidth: 2, padding: 15, ...shadow('sm') },
  seats: { fontSize: 10, lineHeight: 15, paddingHorizontal: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: tw.emerald100, color: tw.emerald800, ...poppins(700) },
  catPrice: { fontSize: 16, lineHeight: 24, color: tw.emerald950, ...montserrat(800) },
  strike: { fontSize: 12, color: tw.gray400, textDecorationLine: 'line-through', ...poppins(400) },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: dh.cream, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: dh.border },
  stepBtn: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(700) },
  stepQty: { width: 16, textAlign: 'center', fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  perks: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100, gap: 4 },
  perk: { flex: 1, fontSize: 11, lineHeight: 16.5, color: tw.gray600, ...poppins(400) },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderTopColor: dh.border, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, ...shadow('lg') },
  closed: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: tw.gray700, textAlign: 'center', ...poppins(700) },
  barLabel: { fontSize: 10, lineHeight: 15, color: tw.gray500, ...poppins(600) },
  barPrice: { fontSize: 18, lineHeight: 28, color: tw.emerald950, ...montserrat(800) },
  barTotal: { fontSize: 10, color: tw.gray400, ...poppins(400) },
  modal: { width: '100%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: tw.emerald200, ...shadow('2xl') },
  okIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: tw.emerald100, alignItems: 'center', justifyContent: 'center' },
  okTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...montserrat(700) },
  okText: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  okId: { fontSize: 12, lineHeight: 16, color: tw.emerald900, backgroundColor: dh.cream, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: dh.border, overflow: 'hidden', fontFamily: 'monospace', fontWeight: '700' },
  pass: { backgroundColor: dh.cream, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: dh.border, gap: 12 },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200 },
  passName: { fontSize: 11, lineHeight: 16.5, color: tw.gray900, ...poppins(700) },
  passCode: { fontSize: 9, lineHeight: 13.5, color: tw.gray500, marginTop: 2, fontFamily: 'monospace', fontWeight: '700' },
  passFest: { borderTopWidth: 1, borderTopColor: dh.border, paddingTop: 8, alignItems: 'center' },
  passFestName: { fontSize: 14, lineHeight: 20, color: tw.gray900, textAlign: 'center', ...poppins(700) },
  passFestDates: { fontSize: 11, lineHeight: 16.5, color: tw.gray500, marginTop: 2, ...poppins(400) },
  passGrid: { flexDirection: 'row', gap: 8, backgroundColor: '#fff', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: tw.gray100 },
  gridLabel: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(400) },
  gridValue: { fontSize: 11, lineHeight: 16.5, color: tw.gray700, ...poppins(600) },
});
