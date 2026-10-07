import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { Banknote, Bike, CircleCheck, Clock, CreditCard, ShoppingBag, StickyNote, Timer, Utensils, UtensilsCrossed, X } from 'lucide-react-native';
import Img from '../../../components/Img';
import { Press } from '../../../components/ui';
import { Button, StatusBadge } from '../../../components/ds';
import { navigateTo } from '../../../lib/webRouter';
import { color, radii, space, type as t, elevation } from '../../../theme';
import ResendNotificationButton from '../../components/ResendNotificationButton';

/* Shared pieces of Food/pages/restaurant/OrdersMain.jsx: the order card every list draws and the closed-store empty state. */

export const BRAND = color.primary;

/** "out_for_delivery" -> "Out for delivery" (sentence case, per the design system). */
export const sentence = (value) => {
  const s = String(value || '').replace(/_/g, ' ').trim().toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
};

/** Order status -> StatusBadge tone (DESIGN_SYSTEM.md state table). */
export function orderStatusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('cancel') || s.includes('reject') || s === 'failed' || s === 'expired') return 'danger';
  if (s === 'delivered' || s === 'completed' || s === 'refunded') return 'success';
  if (s === 'ready' || s === 'ready_for_pickup' || s === 'ready for pickup' || s === 'reached_pickup' || s === 'pending' || s === 'created') return 'warning';
  if (s === 'picked_up' || s === 'picked up' || s === 'reached_drop') return 'info';
  if (s === 'placed' || s === 'new') return 'primary';
  if (s === 'confirmed' || s === 'accepted' || s === 'preparing' || s === 'out_for_delivery' || s === 'out for delivery' || s === 'out-for-delivery') return 'info';
  return 'neutral';
}

/** Order type -> icon + sentence-case label. */
export function orderTypeMeta(type) {
  const s = String(type || '').toLowerCase();
  if (s === 'takeaway') return { icon: ShoppingBag, label: 'Takeaway' };
  if (s === 'dining') return { icon: Utensils, label: 'Dining' };
  return { icon: Bike, label: sentence(type) || 'Delivery' };
}

/** Payment method -> badge, or null when the order does not say. */
export function paymentMeta(method) {
  const m = String(method || '').toLowerCase().trim();
  if (!m) return null;
  if (m === 'cash' || m === 'cod') return { icon: Banknote, label: 'Cash on delivery', tone: 'warning' };
  return { icon: CreditCard, label: 'Paid online', tone: 'success' };
}

/** FSSAI veg / non-veg mark: a square outline with a filled dot (colour + accessible label). */
export function VegMark({ nonVeg, size = 16 }) {
  const c = nonVeg ? color.nonVeg : color.veg;
  return (
    <View accessible accessibilityLabel={nonVeg ? 'Non-veg' : 'Veg'} style={{ width: size, height: size, borderWidth: 1.5, borderColor: c, borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface }}>
      <View style={{ width: size / 2, height: size / 2, borderRadius: size / 4, backgroundColor: c }} />
    </View>
  );
}

export const OrderCard = memo(function OrderCard({
  orderId,
  mongoId,
  status,
  customerName,
  type,
  tableOrToken,
  timePlaced,
  eta,
  itemsSummary,
  paymentMethod,
  photoUrl,
  photoAlt,
  deliveryPartnerId,
  dispatchStatus,
  onSelect,
  onCancel,
  onMarkReady,
  isMarkingReady = false,
  restaurantNote = null,
  onVerifyTakeaway,
  acceptedAt = null,
  adminStatusNote,
}) {
  const normalizedStatus = String(status || '').toLowerCase();
  const normalizedType = String(type || '').toLowerCase();
  const isReady = normalizedStatus === 'ready';
  const isPreparing = normalizedStatus === 'preparing';
  const isWaitingAcceptance = !acceptedAt && (normalizedStatus === 'confirmed' || normalizedStatus === 'pending' || normalizedStatus === 'created');

  const statusLabel =
    normalizedStatus === 'delivered' && normalizedType === 'takeaway'
      ? 'Picked up'
      : normalizedStatus === 'placed'
        ? 'Order placed'
        : isWaitingAcceptance
          ? 'Pending'
          : sentence(status);
  const statusTone = normalizedStatus === 'delivered' && normalizedType === 'takeaway' ? 'success' : isWaitingAcceptance ? 'warning' : orderStatusTone(normalizedStatus);

  const showActions = (!isReady && eta) || isPreparing || isReady || normalizedStatus === 'confirmed';
  const isDeliveryType = normalizedType !== 'takeaway' && normalizedType !== 'dining';
  const typeMeta = orderTypeMeta(type);
  const pay = paymentMeta(paymentMethod);
  const items = String(itemsSummary || '').split(/,\s*/).filter(Boolean);

  return (
    <Press
      scale={1}
      onPress={() => onSelect?.({ orderId, status, customerName, type, tableOrToken, timePlaced, eta, itemsSummary, paymentMethod, restaurantNote })}
      accessibilityLabel={`Order ${orderId}, ${statusLabel}, ${customerName}`}
      style={styles.card}
    >
      <View style={styles.head}>
        <View style={styles.photo}>
          {photoUrl ? (
            <Img source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={photoAlt} />
          ) : (
            <UtensilsCrossed size={22} color={color.textDisabled} accessibilityLabel={photoAlt} />
          )}
        </View>
        <View style={styles.headText}>
          <View style={styles.idRow}>
            <Text style={styles.id} numberOfLines={1} selectable>
              #{orderId}
            </Text>
            <StatusBadge label={statusLabel} tone={statusTone} />
          </View>
          <Text style={styles.customer} numberOfLines={1}>
            {customerName}
          </Text>
          <View style={styles.metaRow}>
            <StatusBadge label={typeMeta.label} tone="neutral" icon={typeMeta.icon} />
            {pay ? <StatusBadge label={pay.label} tone={pay.tone} icon={pay.icon} /> : null}
          </View>
        </View>
      </View>

      {adminStatusNote ? (
        <Text style={styles.adminNote} numberOfLines={2}>
          {adminStatusNote}
        </Text>
      ) : null}

      <View style={styles.items}>
        {items.map((itemStr, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={styles.bullet} />
            <Text style={styles.item}>{itemStr}</Text>
          </View>
        ))}
      </View>

      <View style={styles.timeRow}>
        <Clock size={14} color={color.textMuted} />
        <Text style={styles.time}>{timePlaced}</Text>
      </View>

      {restaurantNote ? (
        <View style={styles.note}>
          <StickyNote size={14} color={color.info} />
          <Text style={styles.noteText} numberOfLines={2}>
            Note: {restaurantNote}
          </Text>
        </View>
      ) : null}

      {showActions ? (
        <View style={styles.actions}>
          <View style={styles.actionsInfo}>
            {!isReady && eta ? (
              <View style={styles.eta} accessibilityLabel={`Estimated time ${eta}`}>
                <Timer size={16} color={color.text} />
                <Text style={styles.etaLabel}>ETA</Text>
                <Text style={styles.etaValue}>{eta}</Text>
              </View>
            ) : null}
            {isPreparing || isReady || normalizedStatus === 'confirmed' ? (
              <>
                {deliveryPartnerId ? <StatusBadge label="Rider assigned" tone="info" icon={CircleCheck} /> : null}
                {dispatchStatus && isDeliveryType && !isWaitingAcceptance ? <StatusBadge label={`Rider: ${sentence(dispatchStatus)}`} tone="neutral" /> : null}
                {(isPreparing || isReady) && isDeliveryType && dispatchStatus !== 'accepted' && !deliveryPartnerId && !isWaitingAcceptance ? (
                  <ResendNotificationButton orderId={orderId} mongoId={mongoId} />
                ) : null}
              </>
            ) : null}
          </View>
          {isPreparing || isReady || normalizedStatus === 'confirmed' ? (
            <View style={styles.buttons}>
              {isPreparing && onCancel ? (
                <Button
                  title="Cancel"
                  icon={X}
                  variant="dangerSoft"
                  size="sm"
                  fullWidth={false}
                  onPress={() => onCancel({ orderId, mongoId, customerName })}
                  accessibilityLabel={`Cancel order ${orderId}`}
                  style={styles.btn}
                />
              ) : null}
              {isPreparing && onMarkReady ? (
                <Button
                  title="Mark ready"
                  size="sm"
                  fullWidth={false}
                  loading={isMarkingReady}
                  onPress={() => onMarkReady({ orderId, mongoId, customerName })}
                  accessibilityLabel={`Mark order ${orderId} ready`}
                  style={[styles.btn, styles.btnMain]}
                />
              ) : null}
              {isReady && normalizedType === 'takeaway' && onVerifyTakeaway ? (
                <Button
                  title="Verify & complete"
                  size="sm"
                  fullWidth={false}
                  onPress={() => onVerifyTakeaway({ orderId, mongoId, customerName, photoUrl, photoAlt, type, itemsSummary })}
                  style={[styles.btn, styles.btnMain]}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </Press>
  );
});

/** The closed-store illustration with "View status". */
export function EmptyState({ message = 'Temporarily closed' }) {
  const line = color.borderStrong;
  return (
    <View style={styles.empty}>
      <Svg width={168} height={168} viewBox="0 0 200 200" fill="none" style={{ marginBottom: space.xl }}>
        <Rect x={40} y={80} width={120} height={80} stroke={line} strokeWidth={2} fill={color.surface} />
        <Path d="M30 80 L100 50 L170 80" stroke={line} strokeWidth={2} fill={color.surface} />
        <Rect x={60} y={100} width={30} height={60} stroke={line} strokeWidth={2} fill={color.surface} />
        <Rect x={110} y={100} width={30} height={60} stroke={line} strokeWidth={2} fill={color.surface} />
        <Rect x={70} y={140} width={40} height={25} stroke={line} strokeWidth={1.5} fill={color.surface} />
        <SvgText x={90} y={156} fontSize={10} fill={color.textMuted} textAnchor="middle">
          CLOSED
        </SvgText>
        <Rect x={80} y={170} width={40} height={20} stroke={line} strokeWidth={1.5} fill={color.surface} />
      </Svg>
      <Text style={styles.emptyText}>{message}</Text>
      <Button title="View status" onPress={() => navigateTo('/food/restaurant/status')} fullWidth={false} style={{ alignSelf: 'center' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, padding: space.lg, marginBottom: space.md, gap: space.md, ...elevation.card },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  photo: { width: 56, height: 56, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, minWidth: 0, gap: space.xs },
  idRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  id: { ...t.subheading, color: color.text, flexShrink: 1 },
  customer: { ...t.small, color: color.textSecondary },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2, marginTop: space.xxs },
  adminNote: { ...t.caption, color: color.textMuted, fontStyle: 'italic' },
  items: { gap: space.xs, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 8, backgroundColor: color.textMuted },
  item: { flex: 1, ...t.bodyStrong, color: color.text },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  time: { ...t.caption, color: color.textMuted },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, padding: space.sm + 2, borderRadius: radii.md, backgroundColor: color.infoSoft },
  noteText: { flex: 1, ...t.small, color: color.info },
  actions: { gap: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  actionsInfo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  eta: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginRight: space.xs },
  etaLabel: { ...t.caption, color: color.textMuted },
  etaValue: { ...t.bodyStrong, color: color.text },
  buttons: { flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end' },
  btn: { height: 44 },
  btnMain: { flexGrow: 1, flexShrink: 1, alignSelf: 'auto' },
  empty: { alignItems: 'center', justifyContent: 'center', minHeight: 400, paddingVertical: space.xxxl + space.lg },
  emptyText: { ...t.subheading, color: color.textSecondary, marginBottom: space.lg, textAlign: 'center' },
});
