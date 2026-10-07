import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, CircleCheck, Copy, MapPin, Printer, User, Volume2, XCircle } from 'lucide-react-native';
import Img from '../../components/Img';
import { Button, Card, IconButton, SectionHeader, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type as t } from '../../theme';
import ResendNotificationButton from '../components/ResendNotificationButton';
import { PageHeader } from '../components/ui';
import { useOrderDetails } from '../hooks/pages/useOrderDetails';
import { VegMark, orderStatusTone, orderTypeMeta, sentence } from './orders/parts';

const dishFallbackImage = require('../assets/dish_fallback.webp');

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
  return <View style={[{ backgroundColor: color.surfaceMuted, borderRadius: radii.sm }, style]} />;
}

function BillRow({ label, value, green }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, green ? { color: color.success } : null]}>{label}</Text>
      <Text style={[styles.billValue, green ? { color: color.success } : null]}>{value}</Text>
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
      <View style={styles.page}>
        <PageHeader title="Order details" onBack={h.goBack} />
        <View style={{ padding: space.lg, gap: space.lg }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <Skeleton style={{ width: 48, height: 48, borderRadius: 24 }} />
              <View style={{ flex: 1, gap: space.sm }}>
                <Skeleton style={{ height: 16, width: '50%' }} />
                <Skeleton style={{ height: 12, width: '33%' }} />
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'center', paddingVertical: space.xxxl, gap: space.md }}>
            <ActivityIndicator size="large" color={color.primary} />
            <Text style={styles.fetching}>Fetching order details…</Text>
          </View>
        </View>
      </View>
    );
  }

  if (h.error && !orderData) {
    return (
      <View style={styles.page}>
        <PageHeader title="Order details" onBack={h.goBack} />
        <View style={styles.center}>
          <Card style={styles.errCard}>
            <View style={styles.errIcon}>
              <XCircle size={32} color={color.danger} />
            </View>
            <Text style={styles.errTitle}>Order not found</Text>
            <Text style={styles.errText}>{h.error || "We couldn't retrieve the details for this order. It might have been removed or the ID is incorrect."}</Text>
            <View style={{ gap: space.md, alignSelf: 'stretch' }}>
              <Button title="Try again" onPress={onReload} />
              <Button title="Back to history" variant="outline" onPress={() => h.navigate('/food/restaurant/orders/all')} />
            </View>
          </Card>
        </View>
      </View>
    );
  }

  if (!orderData) {
    return (
      <View style={styles.page}>
        <PageHeader title="Order details" onBack={h.goBack} />
        <View style={styles.center}>
          <Card style={styles.errCard}>
            <View style={styles.errIcon}>
              <XCircle size={32} color={color.danger} />
            </View>
            <Text style={styles.errTitle}>Order not found</Text>
            <Text style={styles.errText}>{"The order you're looking for doesn't exist."}</Text>
            <Button title="Back to orders" variant="secondary" onPress={() => h.navigate('/restaurant/orders')} />
          </Card>
        </View>
      </View>
    );
  }

  const type = orderData.orderType;
  const typeMeta = type ? orderTypeMeta(type === 'takeaway' ? 'takeaway' : type === 'dining' ? 'dining' : 'Delivery') : null;
  const showResend =
    (orderData.status === 'PREPARING' || orderData.status === 'READY' || orderData.status === 'CONFIRMED') &&
    type !== 'takeaway' &&
    type !== 'dining' &&
    orderData.dispatchStatus !== 'accepted';
  const b = orderData.billing;

  return (
    <View style={styles.page}>
      <PageHeader
        title="Order details"
        subtitle={`ID: ${orderData.id}, ${orderData.restaurant?.substring(0, 20) || 'Restaurant'}...`}
        onBack={h.goBack}
        right={
          h.isGeneratingPDF ? (
            <View style={styles.headerBusy}>
              <ActivityIndicator size="small" color={color.textInverse} />
            </View>
          ) : (
            <IconButton icon={Printer} label="Print" variant="inverse" onPress={h.handlePrintReceipt} disabled={h.isGeneratingPDF} />
          )
        }
      />

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl + insets.bottom }}>
        <Card style={{ gap: space.md }}>
          <View style={styles.statusRow}>
            <StatusBadge label={sentence(orderData.status)} tone={orderStatusTone(orderData.status)} />
            {typeMeta ? <StatusBadge label={typeMeta.label} tone="neutral" icon={typeMeta.icon} /> : null}
            <Text style={styles.small}>
              {orderData.date}, {orderData.time}
            </Text>
          </View>

          <View style={styles.idRow}>
            <Text style={styles.orderId} selectable numberOfLines={1}>
              #{orderData.id}
            </Text>
            <IconButton icon={Copy} iconSize={16} iconColor={color.textMuted} label="Copy order ID" onPress={h.handleCopyOrderId} />
          </View>

          <Text style={styles.body}>
            {orderData.restaurant}, {orderData.address}
          </Text>

          {showResend ? <ResendNotificationButton orderId={h.orderId} onSuccess={onReload} /> : null}

          {orderData.reason ? (
            <View style={styles.reasonBox}>
              <Text style={[styles.body, { color: color.danger }]}>{orderData.reason}</Text>
            </View>
          ) : null}

          {orderData.restaurantNote ? (
            <View style={styles.note}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Volume2 size={16} color={color.info} />
                <Text style={styles.noteLabel}>Note for restaurant</Text>
              </View>
              <Text style={styles.noteText}>{orderData.restaurantNote}</Text>
            </View>
          ) : null}
        </Card>

        <View>
          <SectionHeader title="Customer details" />
          <Card style={{ gap: space.lg }}>
            <View style={styles.custRow}>
              <View style={styles.avatar}>
                <User size={20} color={color.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.custName}>{orderData.customer.name}</Text>
                <Text style={styles.custSub}>{orderData.customer.orderCount} order with you</Text>
              </View>
            </View>
            {type !== 'takeaway' ? (
              <View style={styles.custRow}>
                <View style={[styles.avatar, { backgroundColor: color.surfaceMuted }]}>
                  <MapPin size={20} color={color.textSecondary} />
                </View>
                <Text style={[styles.body, { flex: 1 }]} numberOfLines={3}>
                  {orderData.customer.location}
                </Text>
                <Text style={styles.distance}>{orderData.customer.distance}</Text>
              </View>
            ) : null}
          </Card>
        </View>

        <View>
          <SectionHeader title="Item details" />
          <Card padded={false}>
            {orderData.items.map((item, index) => {
              const nonVeg = String(item.type).toLowerCase().includes('non');
              return (
                <View key={index} style={[styles.itemRow, index > 0 ? styles.itemDivider : null]}>
                  <View style={styles.thumb}>
                    <ItemImage uri={item.image} name={item.name} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
                      <View style={{ paddingTop: 3 }}>
                        <VegMark nonVeg={nonVeg} size={14} />
                      </View>
                      <Text style={[styles.itemName, { flex: 1 }]}>
                        {item.quantity} x {item.name}
                      </Text>
                    </View>
                    {item.variantName ? <Text style={styles.variant}>{item.variantName}</Text> : null}
                    {item.type ? <Text style={styles.small}>{item.type}</Text> : null}
                  </View>
                  <Text style={styles.itemName}>{formatMoney(item.price)}</Text>
                </View>
              );
            })}
          </Card>
        </View>

        <View>
          <SectionHeader title="Bill details" />
          <Card>
            <BillRow label="Item subtotal" value={formatMoney(b.itemSubtotal)} />
            <BillRow label="Taxes" value={formatMoney(b.taxes)} />
            {Number(b.packagingFee) > 0 ? <BillRow label="Packaging fee" value={formatMoney(b.packagingFee)} /> : null}
            {Number(b.deliveryFee) > 0 ? <BillRow label="Delivery fee" value={formatMoney(b.deliveryFee)} /> : null}
            {Number(b.platformFee) > 0 ? <BillRow label="Platform fee" value={formatMoney(b.platformFee)} /> : null}
            {Number(b.discount) > 0 ? <BillRow green label="Discount" value={formatDiscount(b.discount)} /> : null}
            {Number(b.couponDiscount) > 0 ? <BillRow green label="Coupon discount" value={formatDiscount(b.couponDiscount)} /> : null}
            {Number(b.referralDiscount) > 0 ? <BillRow green label="Referral discount" value={formatDiscount(b.referralDiscount)} /> : null}
            <View style={styles.totalRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 }}>
                <Text style={styles.totalLabel}>Total bill</Text>
                {b.paymentStatus ? <StatusBadge label={/^cod$/i.test(String(b.paymentStatus)) ? 'COD' : sentence(b.paymentStatus)} tone={/paid|success|captured/i.test(String(b.paymentStatus)) ? 'success' : 'neutral'} /> : null}
              </View>
              <Text style={styles.totalValue}>{formatMoney(b.total)}</Text>
            </View>
            {Number(b.paidAmount) > 0 ? (
              <View style={[styles.billRow, { marginTop: space.sm, marginBottom: 0 }]}>
                <Text style={styles.billLabel}>Amount paid</Text>
                <Text style={styles.billValue}>{formatMoney(b.paidAmount)}</Text>
              </View>
            ) : null}
          </Card>
        </View>

        <View>
          <SectionHeader title="Order timeline" />
          <Card>
            <View>
              <View style={styles.line} />
              <View style={{ gap: space.lg }}>
                {orderData.timeline.map((event, index) => {
                  const done = event.status === 'completed';
                  const bad = event.status === 'rejected';
                  const Icon = done ? CheckCircle : XCircle;
                  return (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
                      <View style={[styles.tlIcon, { backgroundColor: done ? color.success : bad ? color.danger : color.textDisabled }]}>
                        <Icon size={16} color={color.textInverse} />
                      </View>
                      <View style={{ flex: 1, paddingTop: space.xs }}>
                        <Text style={styles.bodyStrong}>{event.event}</Text>
                        <Text style={[styles.small, { marginTop: 2 }]}>{event.timestamp}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {h.showToast ? (
        <View style={[styles.toastWrap, { bottom: space.xxxl + insets.bottom }]} pointerEvents="none">
          <View style={styles.toast} accessibilityLiveRegion="polite">
            {h.isGeneratingPDF ? <ActivityIndicator size="small" color={color.textInverse} /> : <CircleCheck size={20} color={color.goldOnDark} />}
            <Text style={styles.toastText}>{h.toastMessage}</Text>
          </View>
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
  page: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  skCard: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.xxl, gap: space.lg, borderWidth: 1, borderColor: color.border },
  fetching: { ...t.body, color: color.textMuted },
  headerBusy: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  errCard: { width: '100%', maxWidth: 400, padding: space.xxl, alignItems: 'center', gap: space.md },
  errIcon: { width: 64, height: 64, borderRadius: radii.lg, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  errTitle: { ...t.heading, color: color.text },
  errText: { ...t.body, color: color.textSecondary, textAlign: 'center', marginBottom: space.sm },

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginRight: -space.sm },
  orderId: { flex: 1, ...t.heading, color: color.text },
  small: { ...t.caption, color: color.textMuted },
  body: { ...t.body, color: color.text },
  bodyStrong: { ...t.bodyStrong, color: color.text },
  reasonBox: { padding: space.md, borderRadius: radii.md, backgroundColor: color.dangerSoft },
  note: { padding: space.md, gap: space.xs, backgroundColor: color.infoSoft, borderRadius: radii.md },
  noteLabel: { ...t.label, color: color.info },
  noteText: { ...t.body, color: color.text },

  custRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  custName: { ...t.subheading, color: color.text },
  custSub: { ...t.caption, color: color.textMuted, marginTop: 2 },
  distance: { ...t.label, color: color.textSecondary },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg },
  itemDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  thumb: { width: 56, height: 56, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  itemName: { ...t.bodyStrong, color: color.text },
  variant: { ...t.caption, color: color.textSecondary },

  billRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: space.md },
  billLabel: { ...t.body, color: color.textSecondary },
  billValue: { ...t.body, color: color.text },
  totalRow: { marginTop: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  totalLabel: { ...t.bodyStrong, color: color.text },
  totalValue: { ...t.price, color: color.text },

  line: { position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, backgroundColor: color.border },
  tlIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  toastWrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radii.md, maxWidth: 400, backgroundColor: color.primaryDeep, ...elevation.float },
  toastText: { flexShrink: 1, ...t.bodyStrong, color: color.textInverse },
});
