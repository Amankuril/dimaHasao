import { useRef, useState } from 'react';
import { PanResponder, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Banknote, Check, ChevronDown, ChevronRight, ChevronUp, Clock, FileText, MapPin, Minus, Plus, ReceiptText, ShoppingBag, StickyNote, Timer, Users, Volume2, VolumeX } from 'lucide-react-native';
import { Dialog } from '../../../components/kit';
import Img from '../../../components/Img';
import { Press } from '../../../components/ui';
import { Button, IconButton, Money, StatusBadge } from '../../../components/ds';
import { color, elevation, radii, space, type as t } from '../../../theme';
import ResendNotificationButton from '../../components/ResendNotificationButton';
import { getCustomerFacingOrderTotal, getMenuItemLevelMarkupTotal, getOrderMarkupTotal } from '../../utils/restaurantOrderPricing';
import { VegMark, orderStatusTone, orderTypeMeta, paymentMeta, sentence } from './parts';

/* The dialogs of Food/pages/restaurant/OrdersMain.jsx: new order, reject, cancel, verify takeaway and the order summary. `h` is useOrdersMain(). */

const PANEL = { width: '100%', maxWidth: 448, alignSelf: 'center', backgroundColor: color.surface, borderRadius: radii.xl, overflow: 'hidden', ...elevation.sheet };
const lower = (v) => String(v ?? '').toLowerCase().trim();

const variantOf = (item) => {
  const str = (v) => (typeof v === 'string' && v.trim()) || '';
  const named = (v) => (v && typeof v === 'object' && v.name) || '';
  return (
    str(item.variantName) || str(item.variant) || named(item.variant) || str(item.selectedVariant) || named(item.selectedVariant) || str(item.variant_name) ||
    str(item.variation) || named(item.variation) || str(item.size) || str(item.portion) || str(item.option) || str(item.choice) || ''
  );
};

function InfoBox({ icon: Icon, tone = 'neutral', kicker, text }) {
  const box = tone === 'info' ? { bg: color.infoSoft, fg: color.info } : { bg: color.surfaceMuted, fg: color.primary };
  return (
    <View style={[styles.infoBox, { backgroundColor: box.bg }]}>
      <View style={styles.infoIcon}>
        <Icon size={18} color={box.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.infoKicker, { color: box.fg }]}>{kicker}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>
    </View>
  );
}

function OrderTypeBanner({ order }) {
  const type = lower(order.orderType || order.type);
  if (type === 'takeaway') return <InfoBox icon={ShoppingBag} kicker="Takeaway order" text="Customer will pick up from restaurant." />;
  if (type === 'dining') return <InfoBox icon={Users} kicker="Dining order" text="For in-restaurant dining. Table service." />;
  const addr = order.customerAddress || order.deliveryAddress || order.address;
  const display = !addr ? '' : typeof addr === 'string' ? addr : [addr.street || addr.addressLine1 || addr.label, addr.addressLine2, addr.city, addr.pincode || addr.zipCode].filter(Boolean).join(', ');
  return <InfoBox icon={MapPin} kicker="Home delivery order" text={display ? `Deliver to: ${display}` : 'Deliver to customer address.'} />;
}

function PopupItem({ item, amount }) {
  const isVeg = item.isVeg !== false && item.veg !== false && !lower(item.type).includes('non');
  const variantText = variantOf(item);
  const addons = Array.isArray(item.addons) ? item.addons : Array.isArray(item.selectedAddons) ? item.selectedAddons : [];
  const markup = getMenuItemLevelMarkupTotal(item);
  return (
    <View style={styles.item}>
      <View style={{ paddingTop: 3 }}>
        <VegMark nonVeg={!isVeg} />
      </View>
      <Text style={styles.qty}>{item.quantity}×</Text>
      <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
        <Text style={styles.itemName}>{item.name}</Text>
        {variantText ? <Text style={styles.variant}>{variantText}</Text> : null}
        {addons.length > 0 ? (
          <View style={styles.addons}>
            {addons.map((addon, i) => (
              <Text key={i} style={styles.addon}>
                + {typeof addon === 'string' ? addon : addon.name}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={styles.price}>₹{amount}</Text>
        {markup > 0 ? (
          <>
            <Text style={styles.markup}>+ ₹{markup} admin</Text>
            <Text style={[styles.markup, { color: color.text, fontFamily: 'Poppins_600SemiBold' }]}>Total ₹{Math.round((amount + markup) * 100) / 100}</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const HANDLE = 44;
const INSET = 6;

/** "Slide to accept": the countdown drains behind the label; dragging (or tapping) the handle accepts. */
function AcceptSlider({ h, timeoutSeconds }) {
  const [width, setWidth] = useState(320);
  const latest = useRef(h);
  latest.current = h;
  const moved = useRef(false);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        moved.current = false;
        latest.current.handleAcceptSwipeStart(e.nativeEvent.pageX);
      },
      onPanResponderMove: (e, g) => {
        if (Math.abs(g.dx) > 4) moved.current = true;
        latest.current.handleAcceptSwipeMove(e.nativeEvent.pageX);
      },
      onPanResponderRelease: () => {
        // The web handle is also a button: a plain tap accepts.
        if (!moved.current) latest.current.triggerSwipeAccept();
        else latest.current.handleAcceptSwipeEnd();
      },
      onPanResponderTerminate: () => latest.current.handleAcceptSwipeEnd(),
    }),
  ).current;

  const maxTravel = Math.max(width - HANDLE - INSET * 2, 0);
  const fill = timeoutSeconds > 0 ? Math.max(0, Math.min(1, h.countdown / timeoutSeconds)) : 0;
  return (
    <View
      style={styles.slider}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setWidth(w);
        // The hook measures the slider through this ref.
        h.acceptSliderRef.current = { offsetWidth: w };
      }}
    >
      <View style={[StyleSheet.absoluteFill, styles.sliderFill, { right: undefined, width: `${fill * 100}%` }]} />
      <View style={styles.sliderLabel} pointerEvents="none">
        {h.isAcceptingOrder ? null : <Timer size={16} color={color.goldOnDark} />}
        <Text style={styles.sliderText} numberOfLines={1}>
          {h.isAcceptingOrder ? 'Accepting order…' : `Slide to accept (${h.formatTime(h.countdown)})`}
        </Text>
      </View>
      <View
        {...(h.isAcceptingOrder ? {} : pan.panHandlers)}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Accept order"
        accessibilityState={{ disabled: h.isAcceptingOrder }}
        style={[styles.handle, { transform: [{ translateX: h.acceptSwipeProgress * maxTravel }] }]}
      >
        <ChevronRight size={24} color={color.primary} strokeWidth={3} />
      </View>
    </View>
  );
}

export function NewOrderPopup({ h }) {
  const order = h.popupOrder || h.newOrder;
  const visible = h.showNewOrderPopup && Boolean(order);
  if (!visible) return null;
  const typeMeta = orderTypeMeta(lower(order.orderType || order.type) === 'takeaway' ? 'takeaway' : lower(order.orderType || order.type) === 'dining' ? 'dining' : 'Home delivery');
  const items = order.items || [];
  const ALWAYS_SHOW = 4;
  const extra = items.slice(ALWAYS_SHOW);
  const formattedTime = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/ am/i, ' AM').replace(/ pm/i, ' PM')
    : 'Just now';
  const restaurantBill = h.getPopupOrderTotal(order);
  const adminMarkup = getOrderMarkupTotal(order);
  const method = lower(order.paymentMethod || order.payment?.method);
  const isCod = method === 'cash' || method === 'cod';
  const status = order.orderStatus || order.status;
  const anyCancelled = h.isAnyCancelledStatus(status);
  const timeoutSeconds = h.resolveAcceptOrderTimeoutSeconds(order, h.deliveryAcceptOrderTimeoutSeconds, h.takeawayAcceptOrderTimeoutSeconds);

  return (
    // A new order must be answered: the backdrop does not dismiss it, as on the web.
    <Dialog visible onClose={() => {}} closeOnBackdrop={false} panelStyle={[PANEL, { maxHeight: '90%' }]}>
      <View style={styles.popupHeader}>
        <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
          <Text style={styles.popupKicker}>New order</Text>
          <Text style={styles.popupId} numberOfLines={1}>
            {order.orderId || '#Order'}
          </Text>
          <View style={styles.badgeRow}>
            <StatusBadge label={typeMeta.label} tone="neutral" icon={typeMeta.icon} />
            <Text style={styles.popupRestaurant} numberOfLines={1}>
              {order.restaurantName || 'Restaurant'}
            </Text>
          </View>
        </View>
        <IconButton
          icon={h.isCurrentOrderMuted ? VolumeX : Volume2}
          label={h.isCurrentOrderMuted ? 'Unmute' : 'Mute'}
          onPress={h.toggleMute}
          variant="inverse"
        />
      </View>

      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.popupBody}>
        <OrderTypeBanner order={order} />

        {order.restaurantNote ? <InfoBox icon={StickyNote} tone="info" kicker="Note for restaurant" text={order.restaurantNote} /> : null}

        <View>
          <View style={styles.detailsHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 }}>
              <FileText size={18} color={color.textSecondary} />
              <Text style={styles.detailsTitle}>
                Items <Text style={styles.detailsCount}>({items.length})</Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Clock size={14} color={color.textMuted} />
              <Text style={styles.detailsCount}>{formattedTime}</Text>
            </View>
          </View>
          <View style={styles.itemList}>
            {items.slice(0, ALWAYS_SHOW).map((item, i) => (
              <PopupItem key={i} item={item} amount={h.getRestaurantItemAmount(item)} />
            ))}
            {h.isDetailsExpanded ? extra.map((item, i) => <PopupItem key={ALWAYS_SHOW + i} item={item} amount={h.getRestaurantItemAmount(item)} />) : null}
          </View>
          {extra.length > 0 ? (
            <Button
              title={h.isDetailsExpanded ? 'Show less' : `+${extra.length} more item${extra.length !== 1 ? 's' : ''}`}
              icon={h.isDetailsExpanded ? ChevronUp : ChevronDown}
              variant="ghost"
              size="sm"
              onPress={() => h.setIsDetailsExpanded(!h.isDetailsExpanded)}
              style={{ height: 44, marginTop: space.xs }}
            />
          ) : null}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <ReceiptText size={18} color={color.textSecondary} />
              <Text style={styles.detailsTitle}>Total bill</Text>
            </View>
            {adminMarkup > 0 ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={t.price}>
                  ₹{restaurantBill} <Text style={[t.bodyStrong, { color: color.textSecondary }]}>+ ₹{adminMarkup}</Text>
                </Text>
                <Text style={styles.customerTotal}>Customer total ₹{getCustomerFacingOrderTotal(order)}</Text>
              </View>
            ) : (
              <Money value={`₹${restaurantBill}`} />
            )}
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.rowLabel}>Payment</Text>
            {isCod ? <StatusBadge label="Cash on delivery" tone="warning" icon={Banknote} style={styles.badgeMid} /> : <StatusBadge label="Paid" tone="success" icon={Check} style={styles.badgeMid} />}
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.rowLabel}>Preparation time</Text>
            <View style={styles.stepper}>
              <IconButton icon={Minus} label="Less preparation time" variant="soft" onPress={() => h.setPrepTime(Math.max(1, h.prepTime - 1))} />
              <Text style={styles.prep}>{h.prepTime} mins</Text>
              <IconButton icon={Plus} label="More preparation time" variant="soft" onPress={() => h.setPrepTime(h.prepTime + 1)} />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.popupFooter}>
        {anyCancelled ? (
          <View style={styles.cancelledBox}>
            <Text style={styles.cancelledTitle}>{h.isUserCancelledStatus(status) ? 'Order canceled by user' : 'Order cancelled'}</Text>
            <Text style={styles.cancelledBody}>This order is no longer available for acceptance.</Text>
          </View>
        ) : (
          <View style={{ gap: space.sm }}>
            <AcceptSlider h={h} timeoutSeconds={timeoutSeconds} />
            <Button title="Reject order" variant="dangerSoft" onPress={h.handleRejectClick} disabled={h.isAcceptingOrder} />
          </View>
        )}
      </View>
    </Dialog>
  );
}

/** Reject and Cancel share one layout; a radio list of reasons and a destructive confirm. */
function ReasonDialog({ visible, title, subtitle, reasons, value, onChange, onClose, onConfirm, busy, confirmLabel }) {
  const disabled = !value || busy;
  return (
    <Dialog visible={visible} onClose={onClose} panelStyle={[PANEL, { maxHeight: '92%' }]}>
      <View style={styles.reasonHead}>
        <Text style={styles.reasonTitle}>{title}</Text>
        <Text style={styles.reasonSub}>{subtitle}</Text>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.reasonList} accessibilityRole="radiogroup">
        {reasons.map((reason) => {
          const on = value === reason;
          return (
            <Press key={reason} scale={0.99} onPress={() => onChange(reason)} accessibilityRole="radio" accessibilityState={{ selected: on, checked: on }} accessibilityLabel={reason} style={[styles.reason, on ? styles.reasonOn : null]}>
              <View style={[styles.radio, on ? styles.radioOn : null]}>{on ? <View style={styles.radioDot} /> : null}</View>
              <Text style={[styles.reasonText, on ? { color: color.text, fontFamily: 'Poppins_600SemiBold' } : null]}>{reason}</Text>
            </Press>
          );
        })}
      </ScrollView>
      <View style={styles.reasonFoot}>
        <Button title={busy ? 'Confirming…' : confirmLabel} variant="danger" onPress={onConfirm} disabled={disabled} loading={busy} />
        <Button title="Go back" variant="outline" onPress={onClose} disabled={busy} accessibilityLabel="Cancel" />
      </View>
    </Dialog>
  );
}

export function RejectPopup({ h }) {
  return (
    <ReasonDialog
      visible={h.showRejectPopup}
      title={`Reject order ${(h.popupOrder || h.newOrder)?.orderId || '#Order'}`}
      subtitle="Please select a reason for rejecting this order"
      reasons={h.rejectReasons}
      value={h.rejectReason}
      onChange={h.setRejectReason}
      onClose={h.handleRejectCancel}
      onConfirm={h.handleRejectConfirm}
      busy={h.isRejectingOrder}
      confirmLabel="Confirm rejection"
    />
  );
}

export function CancelPopup({ h }) {
  return (
    <ReasonDialog
      visible={h.showCancelPopup && Boolean(h.orderToCancel)}
      title={`Cancel order ${h.orderToCancel?.orderId || '#Order'}`}
      subtitle="Please provide a reason for cancelling this order"
      reasons={h.rejectReasons}
      value={h.cancelReason}
      onChange={h.setCancelReason}
      onClose={h.handleCancelPopupClose}
      onConfirm={h.handleCancelConfirm}
      busy={h.isCancellingOrder}
      confirmLabel="Confirm cancellation"
    />
  );
}

export function VerifyTakeawayPopup({ h }) {
  const [focused, setFocused] = useState(false);
  const order = h.verifyingOrder;
  const visible = h.showVerifyTakeawayPopup && Boolean(order);
  if (!visible) return null;
  const short = h.takeawayOtpInput.length < 4;
  const disabled = h.isSubmittingVerifyTakeaway || short;
  return (
    <Dialog visible onClose={h.handleVerifyTakeawayClose} backdrop={color.overlay} panelStyle={[PANEL, { maxWidth: 400 }]}>
      <View style={styles.verifyHead}>
        <View style={styles.verifyIcon}>
          <ShoppingBag size={26} color={color.goldOnDark} />
        </View>
        <Text style={styles.verifyTitle}>Verify takeaway</Text>
        <Text style={styles.verifyKicker}>Self-pickup verification</Text>
      </View>

      <View style={styles.verifyBody}>
        <View style={styles.verifyCard}>
          <View style={styles.verifyPhoto}>
            {order.photoUrl ? <Img source={{ uri: order.photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <ShoppingBag size={22} color={color.textDisabled} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.verifyOrder} numberOfLines={1}>
              Order #{order.orderId}
            </Text>
            <Text style={styles.verifyCustomer} numberOfLines={1}>
              {order.customerName}
            </Text>
            <Text style={styles.verifyItems} numberOfLines={2}>
              {order.itemsSummary}
            </Text>
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <Text style={styles.otpLabel}>Enter the customer&apos;s 4-digit OTP</Text>
          <TextInput
            ref={h.otpInputRef}
            value={h.takeawayOtpInput}
            onChangeText={(text) => h.setTakeawayOtpInput(text.replace(/\D/g, '').slice(0, 4))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="••••"
            placeholderTextColor={color.textDisabled}
            accessibilityLabel="Customer OTP"
            style={[styles.otp, focused ? { borderColor: color.primary } : null]}
          />
        </View>

        <View style={styles.verifyFoot}>
          <Button title="Cancel" variant="outline" onPress={h.handleVerifyTakeawayClose} style={{ flex: 1 }} />
          <Button title={h.isSubmittingVerifyTakeaway ? 'Verifying…' : 'Complete order'} onPress={h.handleVerifyTakeawayConfirm} disabled={disabled} loading={h.isSubmittingVerifyTakeaway} style={{ flex: 1.4 }} />
        </View>
      </View>
    </Dialog>
  );
}

/** The summary shown when an order card is tapped. */
export function OrderSheet({ h }) {
  const order = h.selectedOrder;
  const visible = h.isSheetOpen && Boolean(order);
  if (!visible) return null;
  const status = lower(order.status);
  const pickedUp = status === 'delivered' && order.type === 'Takeaway';
  const pay = paymentMeta(order.paymentMethod) || { label: 'Paid online', tone: 'success' };
  const close = () => h.setIsSheetOpen(false);
  const typeMeta = orderTypeMeta(order.type);
  return (
    <Dialog visible onClose={close} blur={8} panelStyle={[PANEL, { maxWidth: 400, maxHeight: '85%' }]}>
      <ScrollView contentContainerStyle={styles.sheetBody}>
        <View style={styles.sheetTop}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={styles.sheetId} selectable>
              Order #{order.orderId}
            </Text>
            <Text style={styles.sheetCustomer} numberOfLines={1}>
              {order.customerName}
            </Text>
            <Text style={styles.sheetMeta} numberOfLines={1}>
              {typeMeta.label}
              {order.tableOrToken ? ` • ${order.tableOrToken}` : ''} · {order.timePlaced}
            </Text>
          </View>
          <StatusBadge label={pickedUp ? 'Picked up' : sentence(order.status)} tone={pickedUp ? 'success' : orderStatusTone(status)} />
        </View>

        {order.type !== 'Takeaway' && order.type !== 'Dining' && (status === 'preparing' || status === 'ready') && !order.deliveryPartnerId ? (
          <ResendNotificationButton orderId={order.orderId} mongoId={order.mongoId} onSuccess={close} />
        ) : null}

        <View style={styles.sheetFacts}>
          {order.status !== 'ready' && order.eta ? (
            <View style={styles.sheetFact}>
              <Timer size={16} color={color.textSecondary} />
              <Text style={styles.sheetFactLabel}>ETA</Text>
              <Text style={styles.sheetFactValue}>{order.eta}</Text>
            </View>
          ) : null}
          <View style={styles.sheetFact}>
            <Text style={styles.sheetFactLabel}>Payment</Text>
            <StatusBadge label={pay.label} tone={pay.tone} icon={pay.icon} style={styles.badgeMid} />
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <Text style={styles.sheetSection}>Items</Text>
          {String(order.itemsSummary || '')
            .split(/,\s*/)
            .filter(Boolean)
            .map((itemStr, idx) => (
              <View key={idx} style={styles.sheetItem}>
                <Text style={styles.sheetItemText}>{itemStr}</Text>
              </View>
            ))}
        </View>

        {order.status === 'cancelled' && order.cancellationReason ? (
          <View style={[styles.sheetNote, { backgroundColor: color.dangerSoft }]}>
            <Text style={[styles.sheetNoteLabel, { color: color.danger }]}>Cancellation reason</Text>
            <Text style={styles.sheetNoteText}>{order.cancellationReason}</Text>
          </View>
        ) : null}
        {order.status === 'rejected' && order.rejectionReason ? (
          <View style={[styles.sheetNote, { backgroundColor: color.dangerSoft }]}>
            <Text style={[styles.sheetNoteLabel, { color: color.danger }]}>Rejection reason</Text>
            <Text style={styles.sheetNoteText}>{order.rejectionReason}</Text>
          </View>
        ) : null}
        {order.restaurantNote ? (
          <View style={[styles.sheetNote, { backgroundColor: color.infoSoft }]}>
            <Text style={[styles.sheetNoteLabel, { color: color.info }]}>Note for restaurant</Text>
            <Text style={styles.sheetNoteText}>{order.restaurantNote}</Text>
          </View>
        ) : null}

        <Button title="Close" variant="secondary" onPress={close} />
      </ScrollView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  infoBox: { borderRadius: radii.md, padding: space.md, flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  infoIcon: { width: 32, height: 32, borderRadius: radii.sm, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  infoKicker: { ...t.label },
  infoText: { ...t.small, color: color.text, marginTop: 2 },

  item: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm + 2, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  qty: { minWidth: 32, textAlign: 'center', paddingHorizontal: space.xs + 2, paddingVertical: 1, borderRadius: radii.sm, overflow: 'hidden', backgroundColor: color.surfaceMuted, ...t.bodyStrong, color: color.text },
  itemName: { ...t.bodyStrong, color: color.text },
  variant: { alignSelf: 'flex-start', ...t.caption, color: color.textSecondary, backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radii.sm, overflow: 'hidden' },
  addons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  addon: { ...t.caption, color: color.textSecondary, backgroundColor: color.surfaceMuted, paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radii.sm, overflow: 'hidden' },
  price: { ...t.bodyStrong, color: color.text },
  markup: { ...t.caption, color: color.textMuted },

  popupHeader: { paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: color.primaryDeep, flexDirection: 'row', alignItems: 'center', gap: space.md },
  popupKicker: { ...t.overline, color: color.goldOnDark },
  popupId: { ...t.heading, color: color.textInverse },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  popupRestaurant: { flex: 1, ...t.caption, color: color.textOnDarkMuted },
  popupBody: { padding: space.lg, gap: space.lg },
  detailsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingBottom: space.xs },
  detailsTitle: { ...t.bodyStrong, color: color.text },
  detailsCount: { ...t.caption, color: color.textMuted },
  itemList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  summary: { backgroundColor: color.surfaceMuted, borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: space.xs },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, minHeight: 52, paddingVertical: space.xs },
  badgeMid: { alignSelf: 'center' },
  customerTotal: { ...t.caption, color: color.textSecondary },
  rowLabel: { ...t.body, color: color.textSecondary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  prep: { minWidth: 72, textAlign: 'center', ...t.subheading, color: color.text },
  popupFooter: { padding: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, backgroundColor: color.surface },
  cancelledBox: { borderRadius: radii.md, backgroundColor: color.dangerSoft, padding: space.md, gap: space.xs },
  cancelledTitle: { ...t.bodyStrong, color: color.danger },
  cancelledBody: { ...t.small, color: color.text },

  slider: { height: 56, borderRadius: radii.md, backgroundColor: color.primaryDeep, overflow: 'hidden', justifyContent: 'center' },
  sliderFill: { backgroundColor: color.primary },
  sliderLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs + 2, paddingLeft: HANDLE + INSET * 2, paddingRight: space.md },
  sliderText: { flexShrink: 1, ...t.button, color: color.textInverse },
  handle: { position: 'absolute', left: INSET, top: INSET, width: HANDLE, height: HANDLE, borderRadius: radii.sm + 2, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', ...elevation.float },

  reasonHead: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, gap: space.xs },
  reasonTitle: { ...t.heading, color: color.text },
  reasonSub: { ...t.small, color: color.textMuted },
  reasonList: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  reason: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface },
  reasonOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: color.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary },
  reasonText: { flex: 1, ...t.body, color: color.textSecondary },
  reasonFoot: { padding: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, gap: space.sm },

  verifyHead: { paddingHorizontal: space.xxl, paddingTop: space.xxl, paddingBottom: space.xl, alignItems: 'center', backgroundColor: color.primaryDeep, gap: space.xs },
  verifyIcon: { width: 52, height: 52, borderRadius: radii.lg, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  verifyTitle: { ...t.heading, color: color.textInverse },
  verifyKicker: { ...t.overline, color: color.goldOnDark },
  verifyBody: { padding: space.xl, gap: space.xl },
  verifyCard: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md, ...elevation.card },
  verifyPhoto: { width: 52, height: 52, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  verifyOrder: { ...t.bodyStrong, color: color.text },
  verifyCustomer: { ...t.small, color: color.textSecondary },
  verifyItems: { ...t.caption, color: color.textMuted },
  otpLabel: { ...t.label, color: color.textSecondary, textAlign: 'center' },
  otp: { height: 64, textAlign: 'center', fontSize: 32, letterSpacing: 16, paddingLeft: 16, paddingVertical: 0, borderWidth: 1.5, borderColor: color.border, borderRadius: radii.md, backgroundColor: color.surfaceMuted, color: color.text, fontFamily: 'Poppins_700Bold' },
  verifyFoot: { flexDirection: 'row', gap: space.sm },

  sheetBody: { padding: space.xl, gap: space.lg },
  sheetTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm },
  sheetId: { ...t.heading, color: color.text },
  sheetCustomer: { ...t.bodyStrong, color: color.textSecondary },
  sheetMeta: { ...t.caption, color: color.textMuted },
  sheetFacts: { backgroundColor: color.surfaceMuted, borderRadius: radii.md, padding: space.md, gap: space.sm },
  sheetFact: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sheetFactLabel: { ...t.small, color: color.textSecondary, minWidth: 64 },
  sheetFactValue: { ...t.bodyStrong, color: color.text },
  sheetSection: { ...t.overline, color: color.textSecondary },
  sheetItem: { paddingHorizontal: space.md, paddingVertical: space.sm + 2, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  sheetItemText: { ...t.bodyStrong, color: color.text },
  sheetNote: { padding: space.md, borderRadius: radii.md, gap: space.xs },
  sheetNoteLabel: { ...t.label },
  sheetNoteText: { ...t.small, color: color.text },
});
