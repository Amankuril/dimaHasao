import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CheckCircle, Copy, MapPin, Printer, User, Volume2, XCircle } from 'lucide-react-native';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import ResendNotificationButton from '../components/ResendNotificationButton';
import { useOrderDetails } from '../hooks/pages/useOrderDetails';
import { RT, RT_GRADIENT } from '../theme';

const dishFallbackImage = require('../assets/dish_fallback.webp');

const STATUS_BG = { REJECTED: tw.red700, CANCELLED: tw.red700, DELIVERED: tw.green600 };
const TYPE_CHIP = {
  takeaway: { bg: tw.orange100, fg: RT.primaryStrong, label: 'Takeaway' },
  dining: { bg: tw.blue100, fg: tw.blue700, label: 'Dining' },
  delivery: { bg: tw.green100, fg: RT.primaryStrong, label: 'Delivery' },
};

const grad = { colors: RT_GRADIENT, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };

function ItemImage({ uri, name }) {
  const [failed, setFailed] = useState(false);
  const style = { width: '100%', height: '100%' };
  return uri && !failed ? (
    <Img source={{ uri }} style={style} resizeMode="cover" accessibilityLabel={name} onError={() => setFailed(true)} />
  ) : (
    <Image source={dishFallbackImage} style={style} resizeMode="cover" accessibilityLabel={name} />
  );
}

function Skeleton({ style }) {
  return <View style={[{ backgroundColor: tw.gray100, borderRadius: 4 }, style]} />;
}

function BillRow({ label, value, green }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, green ? { color: RT.primaryStrong } : null]}>{label}</Text>
      <Text style={[styles.billValue, green ? { color: RT.primaryStrong } : null]}>{value}</Text>
    </View>
  );
}

/** Port of Food/pages/restaurant/OrderDetails.jsx (/food/restaurant/orders/:id). */
function OrderDetailsScreen({ onReload }) {
  const insets = useSafeAreaInsets();
  const h = useOrderDetails();
  const { orderData, formatMoney, formatDiscount } = h;

  if (h.loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tw.gray50 }}>
        <View style={[styles.skHeader, { paddingTop: 16 + insets.top }]}>
          <Skeleton style={{ width: 32, height: 32, borderRadius: 8 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton style={{ height: 16, width: '33%' }} />
            <Skeleton style={{ height: 12, width: '50%' }} />
          </View>
        </View>
        <View style={{ padding: 16, gap: 16 }}>
          <View style={styles.skCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton style={{ height: 24, width: 96 }} />
              <Skeleton style={{ height: 24, width: 80 }} />
            </View>
            <Skeleton style={{ height: 16, width: '75%' }} />
            <Skeleton style={{ height: 16, width: '50%' }} />
          </View>
          <View style={styles.skCard}>
            <Skeleton style={{ height: 20, width: 160 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Skeleton style={{ width: 48, height: 48, borderRadius: 24 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton style={{ height: 16, width: '50%' }} />
                <Skeleton style={{ height: 12, width: '33%' }} />
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <ActivityIndicator size="large" color={RT.text} style={{ marginBottom: 16 }} />
            <Text style={styles.fetching}>Fetching order details...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (h.error && !orderData) {
    return (
      <View style={[styles.center, { backgroundColor: tw.gray50, padding: 24 }]}>
        <View style={styles.errCard}>
          <View style={styles.errIcon}>
            <XCircle size={40} color={RT.primary} />
          </View>
          <Text style={styles.errTitle}>Order Not Found</Text>
          <Text style={styles.errText}>{h.error || "We couldn't retrieve the details for this order. It might have been removed or the ID is incorrect."}</Text>
          <View style={{ gap: 12, alignSelf: 'stretch' }}>
            <Press onPress={onReload} accessibilityLabel="Try Again">
              <LinearGradient {...grad} style={styles.tryBtn}>
                <Text style={styles.tryText}>Try Again</Text>
              </LinearGradient>
            </Press>
            <Press onPress={() => h.navigate('/food/restaurant/orders/all')} accessibilityLabel="Back to History" style={styles.backBtn}>
              <Text style={styles.backText}>Back to History</Text>
            </Press>
          </View>
        </View>
      </View>
    );
  }

  if (!orderData) {
    return (
      <View style={[styles.center, { backgroundColor: tw.gray100 }]}>
        <View style={styles.nfCard}>
          <XCircle size={64} color={RT.primary} style={{ marginBottom: 16 }} />
          <Text style={styles.nfTitle}>Order Not Found</Text>
          <Text style={styles.nfText}>{"The order you're looking for doesn't exist."}</Text>
          <Press onPress={() => h.navigate('/restaurant/orders')} accessibilityLabel="Back to Orders" style={styles.nfBtn}>
            <Text style={styles.nfBtnText}>Back to Orders</Text>
          </Press>
        </View>
      </View>
    );
  }

  const type = orderData.orderType;
  const chip = type ? (type === 'takeaway' ? TYPE_CHIP.takeaway : type === 'dining' ? TYPE_CHIP.dining : TYPE_CHIP.delivery) : null;
  const showResend =
    (orderData.status === 'PREPARING' || orderData.status === 'READY' || orderData.status === 'CONFIRMED') &&
    type !== 'takeaway' &&
    type !== 'dining' &&
    orderData.dispatchStatus !== 'accepted';
  const b = orderData.billing;

  return (
    <View style={{ flex: 1, backgroundColor: tw.gray100 }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Press onPress={h.goBack} accessibilityLabel="Go back" hitSlop={8} style={{ padding: 6 }}>
          <ArrowLeft size={24} color={tw.gray900} />
        </Press>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headTitle} accessibilityRole="header">Order details</Text>
          <Text style={styles.headSub} numberOfLines={1}>ID: {orderData.id}, {orderData.restaurant?.substring(0, 20) || 'Restaurant'}...</Text>
        </View>
        <Press onPress={h.handlePrintReceipt} disabled={h.isGeneratingPDF} accessibilityLabel="Print" style={{ padding: 8, opacity: h.isGeneratingPDF ? 0.5 : 1 }}>
          {h.isGeneratingPDF ? <ActivityIndicator size="small" color={tw.gray900} /> : <Printer size={20} color={tw.gray900} />}
        </Press>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 96 + insets.bottom }}>
        <View style={styles.card}>
          <View style={{ alignItems: 'flex-end', gap: 4, marginBottom: 12 }}>
            <View style={[styles.badge, { backgroundColor: STATUS_BG[orderData.status] || tw.gray600 }]}>
              <Text style={styles.badgeText}>{orderData.status}</Text>
            </View>
            <Text style={styles.small}>{orderData.date}, {orderData.time}</Text>
            {showResend ? (
              <View style={{ marginTop: 8 }}>
                <ResendNotificationButton orderId={h.orderId} onSuccess={onReload} />
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={styles.orderId} selectable>ID: {orderData.id}</Text>
            <Press onPress={h.handleCopyOrderId} accessibilityLabel="Copy order ID" hitSlop={8} style={{ padding: 4 }}>
              <Copy size={16} color={tw.gray500} />
            </Press>
            {chip ? (
              <View style={[styles.pill, { backgroundColor: chip.bg }]}>
                <Text style={[styles.pillText, { color: chip.fg }]}>{chip.label.toUpperCase()}</Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.body, { marginBottom: 12 }]}>{orderData.restaurant}, {orderData.address}</Text>
          <View style={styles.divider} />

          {orderData.reason ? <Text style={[styles.body, { color: RT.primary }]}>{orderData.reason}</Text> : null}

          {orderData.restaurantNote ? (
            <View style={styles.note}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Volume2 size={16} color={tw.blue700} />
                <Text style={styles.noteLabel}>NOTE FOR RESTAURANT</Text>
              </View>
              <Text style={styles.noteText}>{orderData.restaurantNote}</Text>
            </View>
          ) : null}
        </View>

        <View>
          <Text style={styles.h2}>Customer details</Text>
          <View style={[styles.card, { gap: 32, marginBottom: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.avatar}>
                <User size={20} color={tw.gray600} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.custName}>{orderData.customer.name}</Text>
                <Text style={styles.custSub}>{orderData.customer.orderCount} order with you</Text>
              </View>
            </View>
            {type !== 'takeaway' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <MapPin size={20} color={tw.gray600} />
                <Text style={[styles.body, { flex: 1 }]}>{orderData.customer.location}</Text>
                <Text style={styles.distance}>{orderData.customer.distance}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View>
          <Text style={styles.h2}>Item details</Text>
          {orderData.items.map((item, index) => {
            const nonVeg = String(item.type).toLowerCase().includes('non');
            return (
              <View key={index} style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
                  <View style={styles.thumb}>
                    <ItemImage uri={item.image} name={item.name} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.vegMark, { borderColor: nonVeg ? tw.red600 : tw.green600 }]}>
                          {nonVeg ? <LinearGradient {...grad} style={styles.vegDot} /> : <View style={[styles.vegDot, { backgroundColor: tw.green600 }]} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{item.quantity} x {item.name}</Text>
                          {item.variantName ? <Text style={styles.variant}>{item.variantName}</Text> : null}
                        </View>
                      </View>
                      <Text style={styles.itemName}>{formatMoney(item.price)}</Text>
                    </View>
                    {item.type ? <Text style={styles.small}>{item.type}</Text> : null}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View>
          <Text style={styles.h2}>Bill details</Text>
          <View style={styles.card}>
            <BillRow label="Item subtotal" value={formatMoney(b.itemSubtotal)} />
            <BillRow label="Taxes" value={formatMoney(b.taxes)} />
            {Number(b.packagingFee) > 0 ? <BillRow label="Packaging fee" value={formatMoney(b.packagingFee)} /> : null}
            {Number(b.deliveryFee) > 0 ? <BillRow label="Delivery fee" value={formatMoney(b.deliveryFee)} /> : null}
            {Number(b.platformFee) > 0 ? <BillRow label="Platform fee" value={formatMoney(b.platformFee)} /> : null}
            {Number(b.discount) > 0 ? <BillRow green label="Discount" value={formatDiscount(b.discount)} /> : null}
            {Number(b.couponDiscount) > 0 ? <BillRow green label="Coupon discount" value={formatDiscount(b.couponDiscount)} /> : null}
            {Number(b.referralDiscount) > 0 ? <BillRow green label="Referral discount" value={formatDiscount(b.referralDiscount)} /> : null}
            <View style={{ height: 24 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.totalLabel}>Total bill</Text>
                <View style={styles.payChip}>
                  <Text style={styles.payChipText}>{b.paymentStatus}</Text>
                </View>
              </View>
              <Text style={styles.totalLabel}>{formatMoney(b.total)}</Text>
            </View>
            {Number(b.paidAmount) > 0 ? (
              <View style={[styles.billRow, { marginTop: 8, marginBottom: 0 }]}>
                <Text style={styles.billLabel}>Amount paid</Text>
                <Text style={[styles.billValue, poppins(500)]}>{formatMoney(b.paidAmount)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View>
          <Text style={styles.h2}>Order timeline</Text>
          <View style={[styles.card, { borderWidth: 1, borderColor: tw.gray200 }]}>
            <View>
              <View style={styles.line} />
              <View style={{ gap: 16 }}>
                {orderData.timeline.map((event, index) => {
                  const on = event.status === 'completed' || event.status === 'rejected';
                  const Icon = event.status === 'completed' ? CheckCircle : XCircle;
                  return (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      {on ? (
                        <LinearGradient {...grad} style={styles.tlIcon}>
                          <Icon size={16} color="#fff" />
                        </LinearGradient>
                      ) : (
                        <View style={[styles.tlIcon, { backgroundColor: tw.gray400 }]}>
                          <Icon size={16} color="#fff" />
                        </View>
                      )}
                      <View style={{ flex: 1, paddingTop: 4 }}>
                        <Text style={styles.body}>{event.event}</Text>
                        <Text style={[styles.small, { marginTop: 2 }]}>{event.timestamp}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {h.showToast ? (
        <View style={[styles.toastWrap, { bottom: 96 + insets.bottom }]} pointerEvents="none">
          <LinearGradient {...grad} style={styles.toast}>
            {h.isGeneratingPDF ? <ActivityIndicator size="small" color="#fff" /> : <CheckCircle size={20} color={tw.green400} />}
            <Text style={styles.toastText}>{h.toastMessage}</Text>
          </LinearGradient>
        </View>
      ) : null}
    </View>
  );
}

/** `window.location.reload()` on the web: the keyed remount fetches the order again. */
export default function OrderDetails() {
  const [reloadKey, setReloadKey] = useState(0);
  return <OrderDetailsScreen key={reloadKey} onReload={() => setReloadKey((k) => k + 1)} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  skHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  skCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, gap: 16, borderWidth: 1, borderColor: tw.gray50, ...shadow('sm') },
  fetching: { fontSize: 16, lineHeight: 24, color: tw.gray500, ...poppins(500) },

  errCard: { width: '100%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 24, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: tw.gray100, ...shadow('xl') },
  errIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  errTitle: { fontSize: 24, lineHeight: 32, color: tw.gray900, marginBottom: 12, ...poppins(700) },
  errText: { fontSize: 16, lineHeight: 26, color: tw.gray500, textAlign: 'center', marginBottom: 32, ...poppins(400) },
  tryBtn: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', ...shadow('lg') },
  tryText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) },
  backBtn: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', backgroundColor: '#fff', borderWidth: 2, borderColor: tw.gray100 },
  backText: { fontSize: 16, lineHeight: 24, color: tw.gray700, ...poppins(700) },

  nfCard: { width: '100%', maxWidth: 448, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 8, padding: 32, alignItems: 'center', ...shadow('lg') },
  nfTitle: { fontSize: 24, lineHeight: 32, color: tw.gray900, marginBottom: 8, ...poppins(700) },
  nfText: { fontSize: 16, lineHeight: 24, color: tw.gray600, textAlign: 'center', marginBottom: 24, ...poppins(400) },
  nfBtn: { backgroundColor: tw.gray200, paddingVertical: 8, paddingHorizontal: 24, borderRadius: 8 },
  nfBtnText: { fontSize: 16, lineHeight: 24, color: tw.gray800, ...poppins(600) },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#fff' },
  headTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  headSub: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },

  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(700) },
  small: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  orderId: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillText: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, ...poppins(700) },
  body: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) },
  divider: { borderTopWidth: 1, borderTopColor: tw.gray200, marginVertical: 12 },
  note: { marginTop: 12, padding: 12, backgroundColor: tw.blue50, borderWidth: 1, borderColor: tw.blue100, borderRadius: 8 },
  noteLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.blue700, ...poppins(700) },
  noteText: { fontSize: 14, lineHeight: 20, color: tw.blue900, ...poppins(500) },

  h2: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 12, ...poppins(700) },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.gray200, alignItems: 'center', justifyContent: 'center' },
  custName: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  custSub: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 2, ...poppins(400) },
  distance: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },

  thumb: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  vegMark: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 1 },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  itemName: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  variant: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 2, ...poppins(500) },

  billRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  billLabel: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  billValue: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) },
  totalLabel: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  payChip: { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: tw.gray200, borderRadius: 4 },
  payChipText: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(500) },

  line: { position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, backgroundColor: tw.gray300 },
  tlIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, maxWidth: 384, ...shadow('lg') },
  toastText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) },
});
