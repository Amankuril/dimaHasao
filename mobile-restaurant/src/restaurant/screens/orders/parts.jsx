import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, X } from 'lucide-react-native';
import Img from '../../../components/Img';
import { Press } from '../../../components/ui';
import { navigateTo } from '../../../lib/webRouter';
import { poppins, shadow, tw } from '../../../theme';
import ResendNotificationButton from '../../components/ResendNotificationButton';
import { RT_GRADIENT } from '../../theme';

/* Shared pieces of Food/pages/restaurant/OrdersMain.jsx: the order card every list draws and the closed-store empty state. */

export const BRAND = '#0A4D2B';

const BADGE = {
  done: { bg: tw.emerald50, fg: tw.emerald600, border: tw.emerald100 },
  wait: { bg: tw.amber50, fg: tw.amber600, border: tw.amber100 },
  stop: { bg: tw.rose50, fg: tw.rose600, border: tw.rose100 },
  idle: { bg: tw.slate50, fg: tw.slate500, border: tw.slate100 },
};

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
      ? 'Picked Up'
      : normalizedStatus === 'placed'
        ? 'Order Placed'
        : isWaitingAcceptance
          ? 'Pending'
          : String(status || '')
              .replace(/_/g, '')
              .replace(/\b\w/g, (c) => c.toUpperCase());

  const badge =
    isReady || normalizedStatus === 'delivered' || normalizedStatus === 'completed' || normalizedStatus === 'picked_up'
      ? BADGE.done
      : isWaitingAcceptance || normalizedStatus === 'confirmed'
        ? BADGE.wait
        : normalizedStatus.includes('cancel') || normalizedStatus.includes('reject') || normalizedStatus === 'failed'
          ? BADGE.stop
          : BADGE.idle;

  const showActions = (!isReady && eta) || isPreparing || isReady || normalizedStatus === 'confirmed';
  const isDeliveryType = normalizedType !== 'takeaway' && normalizedType !== 'dining';
  const typeTone =
    normalizedType === 'takeaway'
      ? { bg: tw.amber50, fg: '#D97706', border: 'rgba(253,230,138,0.5)', label: 'Takeaway' }
      : normalizedType === 'dining'
        ? { bg: tw.blue50, fg: tw.blue600, border: 'rgba(191,219,254,0.5)', label: 'Dining' }
        : { bg: tw.slate50, fg: tw.slate500, border: 'rgba(226,232,240,0.5)', label: type };

  return (
    <Press
      scale={1}
      onPress={() => onSelect?.({ orderId, status, customerName, type, tableOrToken, timePlaced, eta, itemsSummary, paymentMethod, restaurantNote })}
      accessibilityLabel={`Order ${orderId}, ${statusLabel}, ${customerName}`}
      style={styles.card}
    >
      <View style={styles.stripe} />
      <View style={styles.photo}>
        {photoUrl ? (
          <Img source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Text style={styles.photoAlt}>{String(photoAlt || '').toUpperCase()}</Text>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.topRow}>
          <Text style={styles.id} numberOfLines={1}>
            #<Text style={{ color: BRAND }}>{orderId}</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Text style={[styles.badge, { backgroundColor: badge.bg, color: badge.fg, borderColor: badge.border }]}>{String(statusLabel).toUpperCase()}</Text>
            {adminStatusNote ? <Text style={styles.adminNote} numberOfLines={1}>{adminStatusNote}</Text> : null}
            {isPreparing && onCancel ? (
              <Press onPress={() => onCancel({ orderId, mongoId, customerName })} accessibilityLabel={`Cancel order ${orderId}`} hitSlop={10} style={styles.cancel}>
                <X size={12} color={tw.rose500} />
              </Press>
            ) : null}
          </View>
        </View>

        <View style={styles.customerRow}>
          <Text style={styles.customer} numberOfLines={1}>{String(customerName || '').toUpperCase()}</Text>
          <Text style={[styles.type, { backgroundColor: typeTone.bg, color: typeTone.fg, borderColor: typeTone.border }]}>{String(typeTone.label || '').toUpperCase()}</Text>
        </View>

        <View style={{ gap: 4, marginBottom: 6 }}>
          {String(itemsSummary || '')
            .split(/,\s*/)
            .filter(Boolean)
            .map((itemStr, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.bullet} />
                <Text style={styles.item}>{itemStr}</Text>
              </View>
            ))}
        </View>

        <Text style={styles.time}>{String(timePlaced || '').toUpperCase()}</Text>

        {restaurantNote ? (
          <View style={styles.note}>
            <Text style={styles.noteText} numberOfLines={1}>Note: {restaurantNote}</Text>
          </View>
        ) : null}

        {showActions ? (
          <View style={styles.actions}>
            <View>
              {!isReady && eta ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.etaLabel}>ETA</Text>
                  <Text style={styles.eta}>{eta}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.actionsRight}>
              {isPreparing || isReady || normalizedStatus === 'confirmed' ? (
                <>
                  {deliveryPartnerId ? (
                    <View style={styles.driver} accessibilityLabel="Driver assigned">
                      <Check size={12} color={tw.emerald600} strokeWidth={3} />
                    </View>
                  ) : null}
                  {dispatchStatus && isDeliveryType && !isWaitingAcceptance ? <Text style={styles.dispatch}>{String(dispatchStatus).toUpperCase()}</Text> : null}
                  {(isPreparing || isReady) && isDeliveryType && dispatchStatus !== 'accepted' && !deliveryPartnerId && !isWaitingAcceptance ? (
                    <ResendNotificationButton orderId={orderId} mongoId={mongoId} />
                  ) : null}
                  {isPreparing && onMarkReady ? (
                    <Press onPress={() => onMarkReady({ orderId, mongoId, customerName })} disabled={isMarkingReady} accessibilityState={{ disabled: isMarkingReady, busy: isMarkingReady }} style={[styles.action, isMarkingReady ? { opacity: 0.7 } : null]}>
                      <Text style={styles.actionText}>MARK READY</Text>
                    </Press>
                  ) : null}
                  {isReady && normalizedType === 'takeaway' && onVerifyTakeaway ? (
                    <Press onPress={() => onVerifyTakeaway({ orderId, mongoId, customerName, photoUrl, photoAlt, type, itemsSummary })} style={styles.action}>
                      <Text style={styles.actionText}>VERIFY & COMPLETE</Text>
                    </Press>
                  ) : null}
                </>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </Press>
  );
});

/** The closed-store illustration with "View status". */
export function EmptyState({ message = 'Temporarily closed' }) {
  return (
    <View style={styles.empty}>
      <Svg width={200} height={200} viewBox="0 0 200 200" fill="none" style={{ marginBottom: 24 }}>
        <Rect x={40} y={80} width={120} height={80} stroke={tw.gray300} strokeWidth={2} fill="white" />
        <Path d="M30 80 L100 50 L170 80" stroke={tw.gray300} strokeWidth={2} fill="white" />
        <Rect x={60} y={100} width={30} height={60} stroke={tw.gray300} strokeWidth={2} fill="white" />
        <Rect x={110} y={100} width={30} height={60} stroke={tw.gray300} strokeWidth={2} fill="white" />
        <Rect x={70} y={140} width={40} height={25} stroke={tw.gray300} strokeWidth={1.5} fill="white" />
        <SvgText x={85} y={155} fontSize={8} fill={tw.gray300} textAnchor="middle">CLOSED</SvgText>
        <Rect x={80} y={170} width={40} height={20} stroke={tw.gray300} strokeWidth={1.5} fill="white" />
      </Svg>
      <Text style={styles.emptyText}>{message}</Text>
      <Press onPress={() => navigateTo('/food/restaurant/status')}>
        <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>View status</Text>
        </LinearGradient>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, paddingLeft: 16, marginBottom: 12, borderWidth: 1, borderColor: tw.slate100, overflow: 'hidden', ...shadow('sm') },
  stripe: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, backgroundColor: BRAND },
  photo: { width: 60, height: 60, borderRadius: 8, overflow: 'hidden', backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  photoAlt: { fontSize: 8, lineHeight: 8, color: tw.slate300, textAlign: 'center', padding: 4, ...poppins(700) },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  id: { flex: 1, fontSize: 11, lineHeight: 16, color: tw.slate900, ...poppins(800) },
  badge: { fontSize: 8, lineHeight: 12, letterSpacing: 0.4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, borderWidth: 1, overflow: 'hidden', ...poppins(800) },
  adminNote: { maxWidth: 150, fontSize: 8, lineHeight: 12, color: tw.slate500, fontStyle: 'italic', ...poppins(500) },
  cancel: { padding: 4, borderRadius: 999, backgroundColor: tw.rose50 },
  customerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  customer: { flexShrink: 1, maxWidth: '65%', fontSize: 9, lineHeight: 14, letterSpacing: -0.2, color: tw.slate500, ...poppins(700) },
  type: { fontSize: 9, lineHeight: 14, letterSpacing: -0.2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, borderWidth: 1, overflow: 'hidden', ...poppins(700) },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND },
  item: { flex: 1, fontSize: 12, lineHeight: 15, color: tw.slate900, ...poppins(800) },
  time: { fontSize: 9, lineHeight: 14, letterSpacing: -0.2, color: tw.slate400, marginBottom: 4, ...poppins(700) },
  note: { marginBottom: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: tw.blue50, borderWidth: 1, borderColor: tw.blue100, borderRadius: 6 },
  noteText: { fontSize: 9, lineHeight: 14, color: tw.blue700, fontStyle: 'italic', ...poppins(700) },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 8, marginTop: 6, borderTopWidth: 1, borderTopColor: tw.slate50 },
  actionsRight: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  etaLabel: { fontSize: 8, lineHeight: 12, color: tw.slate400, ...poppins(700) },
  eta: { fontSize: 11, lineHeight: 16, color: tw.slate800, ...poppins(800) },
  driver: { width: 20, height: 20, borderRadius: 10, backgroundColor: tw.emerald100, alignItems: 'center', justifyContent: 'center' },
  dispatch: { fontSize: 8, lineHeight: 12, letterSpacing: 0.4, color: tw.slate400, borderWidth: 1, borderColor: tw.slate100, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, ...poppins(800) },
  action: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: BRAND, ...shadow('sm') },
  actionText: { fontSize: 9, lineHeight: 14, color: '#fff', ...poppins(800) },
  empty: { alignItems: 'center', justifyContent: 'center', minHeight: 420, paddingVertical: 48 },
  emptyText: { fontSize: 18, lineHeight: 28, color: tw.gray600, marginBottom: 16, textAlign: 'center', ...poppins(600) },
  emptyButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  emptyButtonText: { fontSize: 16, color: '#fff', ...poppins(500) },
});
