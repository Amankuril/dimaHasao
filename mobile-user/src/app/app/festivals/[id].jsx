import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Image from '../../../components/Img';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../../components/Fa';
import { Press } from '../../../components/ui';
import { Dialog } from '../../../components/kit';
import { StatusBadge, fa } from '../../../components/ds';
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
import { color, elevation, radii, space, type } from '../../../theme';

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
        <Pulse style={{ height: 220, borderRadius: 0 }} />
        <View style={{ padding: space.lg, gap: space.md }} accessibilityLabel="Loading festival">
          {[0, 1].map((n) => (
            <Panel key={n} style={{ gap: space.sm }}>
              <Pulse style={{ height: 16, width: '50%' }} />
              <Pulse tone={100} style={{ height: 13 }} />
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
        <StateBlock card={false} icon="fa-solid fa-ticket" title="This festival is no longer on sale" actionLabel="See all festivals" onAction={() => router.replace('/app/festivals')} />
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

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.xxl }}>
        <View style={styles.hero}>
          <Image source={{ uri: festival.heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(6,28,14,0.4)', 'rgba(6,28,14,0.92)']} style={StyleSheet.absoluteFill} />
          <View style={styles.heroBody}>
            <StatusBadge label={festival.dates} tone="gold" icon={fa('fa-regular fa-calendar')} />
            <Text style={styles.heroTitle} accessibilityRole="header">
              {festival.name}
            </Text>
            <View style={[dhs.row, { gap: space.xs + 2 }]}>
              <Fa name="fa-solid fa-location-dot" size={14} color={color.goldOnDark} />
              <Text style={styles.venue} numberOfLines={2}>
                {festival.venue}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ padding: space.lg, gap: space.lg }}>
          <Panel style={{ gap: space.sm }}>
            <View style={[dhs.row, { gap: space.sm, alignItems: 'flex-start' }]}>
              <Fa name="fa-solid fa-building-columns" size={14} color={color.primary} style={{ marginTop: 3 }} />
              <Text style={styles.organizer}>Organised by {festival.organizer}</Text>
            </View>
            <Text style={styles.desc}>{festival.description}</Text>
          </Panel>

          <Panel style={{ gap: space.md }}>
            <PanelTitle icon="fa-solid fa-star">Festival attractions &amp; lineup</PanelTitle>
            <View style={{ gap: space.sm }}>
              {festival.highlights.map((hl, idx) => (
                <View key={idx} style={styles.highlight}>
                  <Fa name="fa-solid fa-circle-check" size={14} color={color.primary} style={{ marginTop: 3 }} />
                  <Text style={styles.highlightText}>{hl}</Text>
                </View>
              ))}
            </View>
          </Panel>

          <View style={{ gap: space.md }}>
            <PanelTitle icon="fa-solid fa-ticket" right={<StatusBadge label="Live availability" tone="success" icon={fa('fa-solid fa-circle')} />}>
              Select ticket category
            </PanelTitle>

            {categories.map((cat) => {
              const qty = ticketQuantities[cat.id] || 0;
              return (
                <View key={cat.id} style={[styles.cat, cat.isSoldOut ? styles.catSoldOut : qty > 0 ? styles.catSelected : null]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md }}>
                    <View style={{ flex: 1, minWidth: 0, gap: space.xs + 2 }}>
                      <Text style={dhs.h3}>{cat.name}</Text>
                      {cat.isSoldOut ? (
                        <StatusBadge label="Sold out" tone="danger" icon={fa('fa-solid fa-ban')} />
                      ) : (
                        <StatusBadge label={`${cat.remainingTickets} of ${cat.totalTickets} seats left`} tone={cat.remainingTickets <= 10 ? 'warning' : 'success'} />
                      )}
                      <View style={[dhs.row, { alignItems: 'baseline', gap: space.sm }]}>
                        <Text style={styles.catPrice}>₹{cat.price}</Text>
                        {cat.originalPrice ? <Text style={styles.strike}>₹{cat.originalPrice}</Text> : null}
                      </View>
                    </View>

                    {!cat.isSoldOut ? (
                      <View style={styles.stepper}>
                        <Press onPress={() => handleUpdateQty(cat.id, -1)} hitSlop={4} style={[styles.stepBtn, qty === 0 && { opacity: 0.4 }]} accessibilityLabel={`Fewer ${cat.name} passes`}>
                          <Fa name="fa-solid fa-minus" size={13} color={color.primary} />
                        </Press>
                        <Text style={styles.stepQty} accessibilityLabel={`${qty} ${cat.name} passes`}>
                          {qty}
                        </Text>
                        <Press onPress={() => handleUpdateQty(cat.id, 1)} hitSlop={4} style={styles.stepBtn} accessibilityLabel={`More ${cat.name} passes`}>
                          <Fa name="fa-solid fa-plus" size={13} color={color.primary} />
                        </Press>
                      </View>
                    ) : null}
                  </View>

                  {cat.perks.length ? (
                    <View style={styles.perks}>
                      {cat.perks.map((perk, idx) => (
                        <View key={idx} style={[dhs.row, { gap: space.sm, alignItems: 'flex-start' }]}>
                          <Fa name="fa-solid fa-check" size={12} color={color.success} style={{ marginTop: 4 }} />
                          <Text style={styles.perk}>{perk}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: space.md + insets.bottom }]}>
        {!festival.bookingOpen ? (
          // The server refuses a sale outside the window, so the bar says why.
          <View style={[dhs.row, { flex: 1, justifyContent: 'center', gap: space.sm, minHeight: 48 }]}>
            <Fa name="fa-solid fa-lock" size={14} color={color.textMuted} />
            <Text style={styles.closed}>{festival.bookingClosedReason || 'Booking is closed for this festival'}</Text>
          </View>
        ) : (
          <>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.barLabel}>
                {totalTickets} {totalTickets === 1 ? 'pass' : 'passes'} selected
              </Text>
              <View style={[dhs.row, { alignItems: 'baseline', gap: space.xs }]}>
                <Text style={styles.barPrice}>₹{totalAmount.toLocaleString('en-IN')}</Text>
                <Text style={styles.barTotal}>total</Text>
              </View>
            </View>
            <GreenButton title="Book passes" size="lg" fullWidth={false} icon="fa-solid fa-ticket" onPress={handleBookTickets} disabled={totalTickets === 0} loading={submitting} />
          </>
        )}
      </View>

      <Dialog visible={isSuccessModalOpen && Boolean(createdPassData)} onClose={() => {}} closeOnBackdrop={false} backdrop={color.overlay} panelStyle={[styles.modal, { maxHeight: height * 0.9 }]}>
        {createdPassData ? (
          <ScrollView contentContainerStyle={{ gap: space.lg }} showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', gap: space.xs }}>
              <View style={styles.okIcon}>
                <Fa name="fa-solid fa-ticket" size={26} color={color.success} />
              </View>
              <Text style={styles.okTitle} accessibilityRole="header">
                Festival pass confirmed!
              </Text>
              <Text style={styles.okText}>Official Government Tourism e-ticket</Text>
              <Text style={styles.okId} selectable>
                Pass ID: {createdPassData.id}
              </Text>
            </View>

            <View style={styles.pass}>
              {/* One pass code per category: they are scanned separately at the gate. */}
              <View style={{ gap: space.sm }}>
                {createdPassData.passes.map((pass) => (
                  <View key={pass.bookingId} style={styles.passRow}>
                    <Fa name="fa-solid fa-qrcode" size={32} color={color.text} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.passName} numberOfLines={1}>
                        {pass.count} × {pass.category}
                      </Text>
                      <Text style={styles.passCode} selectable>
                        {pass.qrCode}
                      </Text>
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
                  <Text style={styles.gridLabel}>Pass count</Text>
                  <Text style={styles.gridValue}>{createdPassData.ticketCount} tickets</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gridLabel}>Total amount</Text>
                  <Text style={[styles.gridValue, { ...type.bodyStrong, color: color.text }]}>₹{createdPassData.totalAmount.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </View>

            <View style={{ gap: space.sm }}>
              <GreenButton title="View in My Bookings" icon="fa-solid fa-calendar-check" onPress={() => leave('/app/bookings')} />
              <GreenButton tone="gray" title="Back to home" onPress={() => leave(null)} />
            </View>
          </ScrollView>
        ) : null}
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { aspectRatio: 4 / 3, maxHeight: 300, backgroundColor: color.primaryDeep },
  heroBody: { position: 'absolute', bottom: space.lg, left: space.lg, right: space.lg, gap: space.xs + 2, alignItems: 'flex-start' },
  heroTitle: { ...type.heading, fontSize: 20, lineHeight: 28, color: color.textInverse },
  venue: { flex: 1, ...type.small, color: 'rgba(255,255,255,0.88)' },
  organizer: { flex: 1, ...type.label, color: color.primary },
  desc: { ...type.body, color: color.textSecondary },
  highlight: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm + 2 },
  highlightText: { flex: 1, ...type.body, color: color.textSecondary },
  cat: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.lg, borderWidth: 1, borderColor: color.border, ...elevation.card },
  catSoldOut: { backgroundColor: color.surfaceMuted, opacity: 0.75 },
  catSelected: { borderColor: color.primary, borderWidth: 2, padding: space.lg - 1 },
  catPrice: { ...type.price, color: color.text },
  strike: { ...type.small, color: color.textMuted, textDecorationLine: 'line-through' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: color.surfaceMuted, borderRadius: radii.pill, padding: space.xs },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  stepQty: { minWidth: 24, textAlign: 'center', ...type.subheading, color: color.text },
  perks: { marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, gap: space.xs + 2 },
  perk: { flex: 1, ...type.small, color: color.textSecondary },
  bar: { backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, ...elevation.sheet },
  closed: { flexShrink: 1, ...type.bodyStrong, color: color.textSecondary, textAlign: 'center' },
  barLabel: { ...type.caption, color: color.textMuted },
  barPrice: { ...type.price, color: color.text },
  barTotal: { ...type.caption, color: color.textMuted },
  modal: { width: '100%', maxWidth: 400, backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xl, borderWidth: 1, borderColor: color.border, ...elevation.float },
  okIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  okTitle: { ...type.heading, color: color.text, textAlign: 'center' },
  okText: { ...type.small, color: color.textMuted, textAlign: 'center' },
  okId: { ...type.label, color: color.primary, backgroundColor: color.surfaceMuted, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radii.pill, overflow: 'hidden', marginTop: space.xs },
  pass: { backgroundColor: color.surfaceMuted, borderRadius: radii.lg, padding: space.lg, gap: space.md },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.surface, padding: space.md, borderRadius: radii.md },
  passName: { ...type.bodyStrong, color: color.text },
  passCode: { ...type.caption, color: color.textSecondary, marginTop: 2, fontFamily: Platform.select({ android: 'monospace', ios: 'Courier', default: 'monospace' }) },
  passFest: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borderStrong, paddingTop: space.sm, alignItems: 'center' },
  passFestName: { ...type.subheading, color: color.text, textAlign: 'center' },
  passFestDates: { ...type.caption, color: color.textMuted, marginTop: 2 },
  passGrid: { flexDirection: 'row', gap: space.sm, backgroundColor: color.surface, padding: space.md, borderRadius: radii.md },
  gridLabel: { ...type.caption, color: color.textMuted },
  gridValue: { ...type.label, color: color.text },
});
