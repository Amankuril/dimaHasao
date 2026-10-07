import { useRef, useState } from 'react';
import { ActivityIndicator, PanResponder, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, ChevronDown, ChevronUp, FileText, MapPin, Minus, Plus, ReceiptText, ShoppingBag, Users, Volume2, VolumeX } from 'lucide-react-native';
import { Dialog } from '../../../components/kit';
import Img from '../../../components/Img';
import { Press } from '../../../components/ui';
import { poppins, shadow, tw } from '../../../theme';
import ResendNotificationButton from '../../components/ResendNotificationButton';
import { RT, RT_GRADIENT } from '../../theme';
import { getCustomerFacingOrderTotal, getMenuItemLevelMarkupTotal, getOrderMarkupTotal } from '../../utils/restaurantOrderPricing';
import { BRAND } from './parts';

/* The dialogs of Food/pages/restaurant/OrdersMain.jsx: new order, reject, cancel, verify takeaway and the order summary. `h` is useOrdersMain(). */

const PANEL = { width: '100%', maxWidth: 448, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...shadow('2xl') };
const lower = (v) => String(v ?? '').toLowerCase().trim();

const variantOf = (item) => {
  const str = (v) => (typeof v === 'string' && v.trim()) || '';
  const named = (v) => (v && typeof v === 'object' && v.name) || '';
  return (
    str(item.variantName) || str(item.variant) || named(item.variant) || str(item.selectedVariant) || named(item.selectedVariant) || str(item.variant_name) ||
    str(item.variation) || named(item.variation) || str(item.size) || str(item.portion) || str(item.option) || str(item.choice) || ''
  );
};

function OrderTypeBanner({ order }) {
  const type = lower(order.orderType || order.type);
  if (type === 'takeaway') {
    // orange-* utilities are repainted by the restaurant theme
    return (
      <View style={[styles.banner, { backgroundColor: RT.primarySoft, borderColor: RT.accentBorder }]}>
        <View style={[styles.bannerIcon, { backgroundColor: tw.orange100 }]}>
          <ShoppingBag size={16} color={RT.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerKicker, { color: tw.orange800 }]}>TAKEAWAY ORDER</Text>
          <Text style={[styles.bannerText, { color: tw.orange950 || '#431407' }]}>Customer will pick up from restaurant.</Text>
        </View>
      </View>
    );
  }
  if (type === 'dining') {
    return (
      <View style={[styles.banner, { backgroundColor: tw.blue50, borderColor: tw.blue200 }]}>
        <View style={[styles.bannerIcon, { backgroundColor: tw.blue100 }]}>
          <Users size={16} color={tw.blue600} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerKicker, { color: tw.blue800 }]}>DINING ORDER</Text>
          <Text style={[styles.bannerText, { color: '#172554' }]}>For in-restaurant dining. Table service.</Text>
        </View>
      </View>
    );
  }
  const addr = order.customerAddress || order.deliveryAddress || order.address;
  const display = !addr ? '' : typeof addr === 'string' ? addr : [addr.street || addr.addressLine1 || addr.label, addr.addressLine2, addr.city, addr.pincode || addr.zipCode].filter(Boolean).join(', ');
  return (
    <View style={[styles.banner, { backgroundColor: tw.green50, borderColor: tw.green200 }]}>
      <View style={[styles.bannerIcon, { backgroundColor: tw.green100 }]}>
        <MapPin size={16} color={tw.green600} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.bannerKicker, { color: tw.green800 }]}>HOME DELIVERY ORDER</Text>
        <Text style={[styles.bannerText, { color: '#052e16' }]}>{display ? `Deliver to: ${display}` : 'Deliver to customer address.'}</Text>
      </View>
    </View>
  );
}

function PopupItem({ item, amount }) {
  const isVeg = item.isVeg !== false && item.veg !== false && !lower(item.type).includes('non');
  const variantText = variantOf(item);
  const addons = Array.isArray(item.addons) ? item.addons : Array.isArray(item.selectedAddons) ? item.selectedAddons : [];
  const markup = getMenuItemLevelMarkupTotal(item);
  return (
    <View style={styles.item}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
        <View style={[styles.vegBox, { borderColor: isVeg ? tw.emerald600 : tw.rose600, backgroundColor: isVeg ? 'rgba(236,253,245,0.8)' : 'rgba(255,241,242,0.8)' }]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isVeg ? tw.emerald600 : tw.rose600 }} />
        </View>
        <Text style={styles.qty}>{item.quantity}×</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.itemName}>{item.name}</Text>
          {variantText ? (
            <View style={styles.variant}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tw.rose600 }} />
              <Text style={styles.variantText}>{variantText}</Text>
            </View>
          ) : null}
          {addons.length > 0 ? (
            <View style={{ marginTop: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {addons.map((addon, i) => (
                <Text key={i} style={styles.addon}>+ {typeof addon === 'string' ? addon : addon.name}</Text>
              ))}
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ marginLeft: 8, alignItems: 'flex-end' }}>
        <Text style={styles.price}>₹{amount}</Text>
        {markup > 0 ? (
          <View style={{ marginTop: 4, alignItems: 'flex-end' }}>
            <Text style={[styles.markup, { color: tw.rose700 }]}>+ ₹{markup} admin</Text>
            <Text style={[styles.markup, { color: tw.gray900, ...poppins(700) }]}>Total ₹{Math.round((amount + markup) * 100) / 100}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

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

  const maxTravel = Math.max(width - 40 - 16, 0);
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
      <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { right: undefined, width: `${fill * 100}%` }]} />
      <Text style={styles.sliderText}>{h.isAcceptingOrder ? 'Accepting order...' : `Slide to accept (${h.formatTime(h.countdown)})`}</Text>
      <View
        {...(h.isAcceptingOrder ? {} : pan.panHandlers)}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Accept order"
        accessibilityState={{ disabled: h.isAcceptingOrder }}
        style={[styles.handle, { transform: [{ translateX: h.acceptSwipeProgress * maxTravel }] }]}
      >
        <Text style={styles.handleArrow}>›</Text>
      </View>
    </View>
  );
}

export function NewOrderPopup({ h }) {
  const order = h.popupOrder || h.newOrder;
  const visible = h.showNewOrderPopup && Boolean(order);
  if (!visible) return null;
  const type = lower(order.orderType || order.type);
  const tag =
    type === 'takeaway'
      ? { label: 'TAKEAWAY', bg: tw.orange100, fg: RT.primaryStrong }
      : type === 'dining'
        ? { label: 'DINING', bg: tw.blue100, fg: tw.blue700 }
        : { label: 'HOME DELIVERY', bg: tw.green100, fg: RT.primaryStrong };
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
    <Dialog visible onClose={() => {}} closeOnBackdrop={false} panelStyle={[PANEL, { maxHeight: '85%' }]}>
      <View style={styles.popupHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <Text style={styles.popupId} numberOfLines={1}>{order.orderId || '#Order'}</Text>
            <Text style={[styles.popupTag, { backgroundColor: tag.bg, color: tag.fg }]}>{tag.label}</Text>
          </View>
          <Text style={styles.popupRestaurant}>{order.restaurantName || 'Restaurant'}</Text>
        </View>
        <Press onPress={h.toggleMute} accessibilityLabel={h.isCurrentOrderMuted ? 'Unmute' : 'Mute'} style={{ padding: 8 }}>
          {h.isCurrentOrderMuted ? <VolumeX size={20} color={tw.gray700} /> : <Volume2 size={20} color={tw.gray700} />}
        </Press>
      </View>

      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16 }}>
        <OrderTypeBanner order={order} />

        {order.restaurantNote ? (
          <View style={styles.noteBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <FileText size={16} color={BRAND} />
              <Text style={[styles.bannerKicker, { color: tw.blue800 }]}>NOTE FOR RESTAURANT</Text>
            </View>
            <Text style={styles.noteText}>{order.restaurantNote}</Text>
          </View>
        ) : null}

        <View style={{ marginBottom: 16 }}>
          <View style={styles.detailsHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FileText size={20} color={tw.gray700} />
              <Text style={styles.detailsTitle}>Details</Text>
              <Text style={styles.detailsCount}>({items.length} item{items.length !== 1 ? 's' : ''})</Text>
            </View>
            <Text style={[styles.detailsCount, poppins(600)]}>{formattedTime}</Text>
          </View>
          <View style={{ gap: 12 }}>
            {items.slice(0, ALWAYS_SHOW).map((item, i) => <PopupItem key={i} item={item} amount={h.getRestaurantItemAmount(item)} />)}
            {h.isDetailsExpanded ? extra.map((item, i) => <PopupItem key={ALWAYS_SHOW + i} item={item} amount={h.getRestaurantItemAmount(item)} />) : null}
          </View>
          {extra.length > 0 ? (
            <Press scale={0.99} onPress={() => h.setIsDetailsExpanded(!h.isDetailsExpanded)} style={styles.more}>
              {h.isDetailsExpanded ? <ChevronUp size={16} color={tw.gray500} /> : <ChevronDown size={16} color={tw.gray500} />}
              <Text style={styles.moreText}>{h.isDetailsExpanded ? 'Show less' : `+${extra.length} more item${extra.length !== 1 ? 's' : ''}`}</Text>
            </Press>
          ) : null}
        </View>

        <View style={styles.bill}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ReceiptText size={20} color={tw.gray700} />
            <Text style={styles.detailsTitle}>Total bill</Text>
          </View>
          {adminMarkup > 0 ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.billValue}>
                ₹{restaurantBill} <Text style={{ color: tw.rose700, ...poppins(600) }}>+ ₹{adminMarkup}</Text>
              </Text>
              <Text style={styles.customerTotal}>Customer total ₹{getCustomerFacingOrderTotal(order)}</Text>
            </View>
          ) : (
            <Text style={styles.billValue}>₹{restaurantBill}</Text>
          )}
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Payment</Text>
          <Text style={[styles.rowValue, { color: isCod ? RT.accent : tw.green600 }]}>{isCod ? 'Cash on Delivery' : 'Paid'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Preparation time</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Press onPress={() => h.setPrepTime(Math.max(1, h.prepTime - 1))} accessibilityLabel="Less preparation time" style={styles.step}>
              <Minus size={16} color={tw.gray700} />
            </Press>
            <Text style={styles.prep}>{h.prepTime} mins</Text>
            <Press onPress={() => h.setPrepTime(h.prepTime + 1)} accessibilityLabel="More preparation time" style={styles.step}>
              <Plus size={16} color={tw.gray700} />
            </Press>
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
          <View style={{ gap: 12 }}>
            <AcceptSlider h={h} timeoutSeconds={timeoutSeconds} />
            <Press scale={0.99} onPress={h.handleRejectClick} disabled={h.isAcceptingOrder} accessibilityState={{ disabled: h.isAcceptingOrder }} style={[styles.reject, h.isAcceptingOrder ? { opacity: 0.6 } : null]}>
              <Text style={styles.rejectText}>Reject Order</Text>
            </Press>
          </View>
        )}
      </View>
    </Dialog>
  );
}

/** Reject and Cancel share one layout; only the selected-row styling differs, as on the web. */
function ReasonDialog({ visible, title, subtitle, reasons, value, onChange, onClose, onConfirm, busy, confirmLabel, radioFirst }) {
  const disabled = !value || busy;
  return (
    <Dialog visible={visible} onClose={onClose} panelStyle={[PANEL, { maxHeight: '92%' }]}>
      <View style={styles.reasonHead}>
        <Text style={styles.reasonTitle}>{title}</Text>
        <Text style={styles.reasonSub}>{subtitle}</Text>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
        {reasons.map((reason) => {
          const on = value === reason;
          const tick = (
            <LinearGradient colors={on ? RT_GRADIENT : ['transparent', 'transparent']} style={[styles.tick, radioFirst ? { borderWidth: 2, borderColor: on ? tw.red500 : tw.gray300 } : null]}>
              {on ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
            </LinearGradient>
          );
          return (
            <Press key={reason} scale={0.99} onPress={() => onChange(reason)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.reason, on ? { borderColor: radioFirst ? tw.red500 : BRAND, backgroundColor: tw.red50 } : null]}>
              {radioFirst ? tick : null}
              <Text style={[styles.reasonText, { color: on ? (radioFirst ? tw.red700 : BRAND) : radioFirst ? tw.gray700 : tw.gray900 }]}>{reason}</Text>
              {!radioFirst && on ? tick : null}
            </Press>
          );
        })}
      </ScrollView>
      <View style={styles.reasonFoot}>
        <Press scale={0.99} onPress={onClose} disabled={busy} style={[styles.reasonCancel, busy ? { opacity: 0.5 } : null]}>
          <Text style={styles.reasonCancelText}>Cancel</Text>
        </Press>
        <Press scale={0.98} onPress={onConfirm} disabled={disabled} accessibilityState={{ disabled, busy }} style={{ flex: 1 }}>
          <LinearGradient colors={value ? RT_GRADIENT : [tw.gray200, tw.gray200]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.reasonConfirm}>
            {busy ? <ActivityIndicator size="small" color="#fff" /> : null}
            <Text style={[styles.reasonConfirmText, { color: value ? '#fff' : tw.gray400 }]}>{busy ? 'Confirming...' : confirmLabel}</Text>
          </LinearGradient>
        </Press>
      </View>
    </Dialog>
  );
}

export function RejectPopup({ h }) {
  return (
    <ReasonDialog
      visible={h.showRejectPopup}
      title={`Reject Order ${(h.popupOrder || h.newOrder)?.orderId || '#Order'}`}
      subtitle="Please select a reason for rejecting this order"
      reasons={h.rejectReasons}
      value={h.rejectReason}
      onChange={h.setRejectReason}
      onClose={h.handleRejectCancel}
      onConfirm={h.handleRejectConfirm}
      busy={h.isRejectingOrder}
      confirmLabel="Confirm Rejection"
    />
  );
}

export function CancelPopup({ h }) {
  return (
    <ReasonDialog
      visible={h.showCancelPopup && Boolean(h.orderToCancel)}
      title={`Cancel Order ${h.orderToCancel?.orderId || '#Order'}`}
      subtitle="Please provide a reason for cancelling this order"
      reasons={h.rejectReasons}
      value={h.cancelReason}
      onChange={h.setCancelReason}
      onClose={h.handleCancelPopupClose}
      onConfirm={h.handleCancelConfirm}
      busy={h.isCancellingOrder}
      confirmLabel="Confirm Cancellation"
      radioFirst
    />
  );
}

export function VerifyTakeawayPopup({ h }) {
  const order = h.verifyingOrder;
  const visible = h.showVerifyTakeawayPopup && Boolean(order);
  if (!visible) return null;
  const short = h.takeawayOtpInput.length < 4;
  const disabled = h.isSubmittingVerifyTakeaway || short;
  return (
    <Dialog visible onClose={h.handleVerifyTakeawayClose} backdrop="rgba(0,0,0,0.7)" panelStyle={[PANEL, { maxWidth: 384, borderRadius: 24 }]}>
      <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.verifyHead}>
        <View style={styles.verifyCircleA} />
        <View style={styles.verifyCircleB} />
        <View style={styles.verifyIcon}>
          <ShoppingBag size={28} color="#fff" />
        </View>
        <Text style={styles.verifyTitle}>Verify Takeaway</Text>
        <Text style={styles.verifyKicker}>SELF-PICKUP VERIFICATION</Text>
      </LinearGradient>

      <View style={{ paddingHorizontal: 20, marginTop: -20 }}>
        <View style={styles.verifyCard}>
          <View style={styles.verifyPhoto}>
            {order.photoUrl ? <Img source={{ uri: order.photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <ShoppingBag size={24} color={tw.slate300} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.verifyOrder}>
              <Text style={styles.verifyOrderLabel}>ORDER </Text>#{order.orderId}
            </Text>
            <Text style={styles.verifyCustomer} numberOfLines={1}>{order.customerName}</Text>
            <Text style={styles.verifyItems} numberOfLines={1}>{order.itemsSummary}</Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
        <Text style={styles.otpLabel}>ENTER 4-DIGIT CUSTOMER OTP</Text>
        <TextInput
          ref={h.otpInputRef}
          value={h.takeawayOtpInput}
          onChangeText={(text) => h.setTakeawayOtpInput(text.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="••••"
          placeholderTextColor={tw.slate300}
          accessibilityLabel="Customer OTP"
          style={styles.otp}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}>
        <Press onPress={h.handleVerifyTakeawayClose} style={styles.verifyCancel}>
          <Text style={[styles.verifyButtonText, { color: tw.slate500 }]}>CANCEL</Text>
        </Press>
        <Press onPress={h.handleVerifyTakeawayConfirm} disabled={disabled} accessibilityState={{ disabled, busy: h.isSubmittingVerifyTakeaway }} style={[{ flex: 1 }, disabled ? { opacity: 0.4 } : null]}>
          <LinearGradient colors={short ? ['#94a3b8', '#94a3b8'] : RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.verifyConfirm}>
            <Text style={[styles.verifyButtonText, { color: '#fff' }]}>{h.isSubmittingVerifyTakeaway ? 'VERIFYING…' : 'COMPLETE ORDER'}</Text>
          </LinearGradient>
        </Press>
      </View>
    </Dialog>
  );
}

const DONE = ['ready', 'delivered', 'completed', 'picked_up'];

/** The summary shown when an order card is tapped. */
export function OrderSheet({ h }) {
  const order = h.selectedOrder;
  const visible = h.isSheetOpen && Boolean(order);
  if (!visible) return null;
  const status = lower(order.status);
  const tone = DONE.includes(status)
    ? { border: tw.emerald500, fg: tw.emerald600, bg: tw.emerald50, dot: tw.emerald500 }
    : status === 'cancelled' || status === 'rejected'
      ? { border: tw.rose500, fg: tw.rose600, bg: tw.rose50, dot: tw.rose500 }
      : { border: tw.slate800, fg: tw.slate900, bg: tw.slate50, dot: tw.slate800 };
  const method = lower(order.paymentMethod);
  const isCod = method === 'cash' || method === 'cod';
  const close = () => h.setIsSheetOpen(false);
  return (
    <Dialog visible onClose={close} blur={8} panelStyle={[PANEL, { maxWidth: 384, maxHeight: '85%', borderRadius: 24, borderWidth: 1, borderColor: tw.gray100 }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.grab} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.sheetId}>Order #{order.orderId}</Text>
            <Text style={styles.sheetCustomer}>{order.customerName}</Text>
            <Text style={styles.sheetType}>{order.type}{order.tableOrToken ? ` • ${order.tableOrToken}` : ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={[styles.sheetBadge, { borderColor: tone.border, backgroundColor: tone.bg }]}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone.dot }} />
              <Text style={[styles.sheetBadgeText, { color: tone.fg }]}>{String(status === 'delivered' && order.type === 'Takeaway' ? 'Picked Up' : order.status).toUpperCase()}</Text>
            </View>
            <Text style={styles.sheetTime}>{order.timePlaced}</Text>
            {order.type !== 'Takeaway' && order.type !== 'Dining' && (status === 'preparing' || status === 'ready') && !order.deliveryPartnerId ? (
              <ResendNotificationButton orderId={order.orderId} mongoId={order.mongoId} onSuccess={close} />
            ) : null}
          </View>
        </View>

        <View style={styles.rule} />

        <Text style={styles.sheetSection}>ITEMS</Text>
        <View style={{ gap: 8, marginBottom: 16 }}>
          {String(order.itemsSummary || '')
            .split(/,\s*/)
            .filter(Boolean)
            .map((itemStr, idx) => (
              <View key={idx} style={styles.sheetItem}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND }} />
                <Text style={styles.sheetItemText}>{itemStr}</Text>
              </View>
            ))}
        </View>

        <View style={styles.sheetMeta}>
          {order.status !== 'ready' && order.eta ? (
            <Text style={styles.sheetMetaText}>ETA: <Text style={{ color: '#000', ...poppins(700) }}>{order.eta}</Text></Text>
          ) : null}
          <Text style={styles.sheetMetaText}>
            Payment: <Text style={{ color: isCod ? RT.primaryStrong : '#000', ...poppins(700) }}>{isCod ? 'Cash on Delivery' : 'Paid online'}</Text>
          </Text>
        </View>

        {order.status === 'cancelled' && order.cancellationReason ? (
          <View style={[styles.sheetNote, { backgroundColor: tw.red50, borderColor: tw.red100 }]}>
            <Text style={[styles.sheetNoteLabel, { color: BRAND }]}>CANCELLATION REASON</Text>
            <Text style={[styles.sheetNoteText, { color: tw.red700 }]}>{order.cancellationReason}</Text>
          </View>
        ) : null}
        {order.status === 'rejected' && order.rejectionReason ? (
          <View style={[styles.sheetNote, { backgroundColor: RT.primarySoft, borderColor: tw.amber100 }]}>
            <Text style={[styles.sheetNoteLabel, { color: RT.accent }]}>REJECTION REASON</Text>
            <Text style={[styles.sheetNoteText, { color: RT.primaryStrong }]}>{order.rejectionReason}</Text>
          </View>
        ) : null}
        {order.restaurantNote ? (
          <View style={[styles.sheetNote, { backgroundColor: tw.blue50, borderColor: tw.blue100 }]}>
            <Text style={[styles.sheetNoteLabel, { color: BRAND }]}>NOTE FOR RESTAURANT</Text>
            <Text style={[styles.sheetNoteText, { color: tw.blue700 }]}>{order.restaurantNote}</Text>
          </View>
        ) : null}

        <Press scale={0.98} onPress={close}>
          <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </LinearGradient>
        </Press>
      </ScrollView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  banner: { marginBottom: 16, borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bannerIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bannerKicker: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, ...poppins(700) },
  bannerText: { fontSize: 12, lineHeight: 16, marginTop: 2, ...poppins(600) },
  noteBox: { marginBottom: 16, backgroundColor: tw.blue50, borderWidth: 1, borderColor: tw.blue200, borderRadius: 8, padding: 12 },
  noteText: { fontSize: 14, lineHeight: 20, color: tw.blue900, ...poppins(500) },
  item: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, backgroundColor: tw.slate50, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.slate200 },
  vegBox: { width: 16, height: 16, borderWidth: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  qty: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: tw.gray900, color: tw.amber400, borderWidth: 1, borderColor: tw.gray800, overflow: 'hidden', fontSize: 12, lineHeight: 16, letterSpacing: 0.6, ...poppins(800) },
  itemName: { fontSize: 14, lineHeight: 19, color: '#030712', ...poppins(800) },
  variant: { marginTop: 4, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tw.rose100, borderWidth: 2, borderColor: tw.rose300 || '#fda4af', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8 },
  variantText: { fontSize: 12, lineHeight: 16, color: tw.rose900 || '#881337', ...poppins(800) },
  addon: { fontSize: 12, lineHeight: 16, color: tw.slate800, backgroundColor: tw.slate100, borderWidth: 1, borderColor: tw.slate300, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 6, overflow: 'hidden', ...poppins(700) },
  price: { fontSize: 14, lineHeight: 20, color: tw.gray900, backgroundColor: tw.gray100, borderWidth: 1, borderColor: tw.gray200, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', ...poppins(800) },
  markup: { fontSize: 10, lineHeight: 13, ...poppins(600) },
  detailsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: tw.gray200, marginBottom: 12 },
  detailsTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  detailsCount: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  more: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.gray300 },
  moreText: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(600) },
  bill: { marginBottom: 16, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: tw.gray200, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  billValue: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  customerTotal: { fontSize: 12, lineHeight: 16, color: tw.slate600, ...poppins(600) },
  row: { marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) },
  rowValue: { fontSize: 14, lineHeight: 20, ...poppins(600) },
  step: { padding: 6, backgroundColor: tw.gray100, borderRadius: 999 },
  prep: { minWidth: 60, textAlign: 'center', fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) },
  popupHeader: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  popupId: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  popupTag: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', ...poppins(700) },
  popupRestaurant: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 2, ...poppins(400) },
  popupFooter: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: tw.gray200, backgroundColor: '#fff' },
  cancelledBox: { borderRadius: 12, borderWidth: 1, borderColor: tw.red200, backgroundColor: tw.red50, paddingHorizontal: 16, paddingVertical: 12 },
  cancelledTitle: { fontSize: 14, lineHeight: 20, color: tw.red700, ...poppins(600) },
  cancelledBody: { marginTop: 4, fontSize: 12, lineHeight: 16, color: BRAND, ...poppins(400) },
  slider: { height: 56, borderRadius: 16, backgroundColor: RT.primaryStrong, overflow: 'hidden', justifyContent: 'center' },
  sliderText: { paddingHorizontal: 48, textAlign: 'center', fontSize: 12, lineHeight: 15, color: '#fff', ...poppins(600) },
  handle: { position: 'absolute', left: 8, top: 8, width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('md') },
  handleArrow: { fontSize: 18, lineHeight: 22, color: tw.gray900, ...poppins(700) },
  reject: { backgroundColor: '#fff', borderWidth: 2, borderColor: tw.red500, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  rejectText: { fontSize: 14, lineHeight: 20, color: BRAND, ...poppins(600) },
  reasonHead: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  reasonTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  reasonSub: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(400) },
  reason: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 8, borderWidth: 2, borderColor: tw.gray200, backgroundColor: '#fff' },
  reasonText: { flex: 1, fontSize: 14, lineHeight: 20, ...poppins(500) },
  tick: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reasonFoot: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: tw.gray50, borderTopWidth: 1, borderTopColor: tw.gray200, flexDirection: 'row', gap: 8 },
  reasonCancel: { flex: 1, backgroundColor: '#fff', borderWidth: 2, borderColor: tw.gray300, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  reasonCancelText: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(600) },
  reasonConfirm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8 },
  reasonConfirmText: { fontSize: 14, lineHeight: 20, ...poppins(600) },
  verifyHead: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, alignItems: 'center', overflow: 'hidden' },
  verifyCircleA: { position: 'absolute', top: -24, right: -24, width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.1)' },
  verifyCircleB: { position: 'absolute', bottom: -16, left: -16, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' },
  verifyIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  verifyTitle: { fontSize: 18, lineHeight: 28, letterSpacing: -0.45, color: '#fff', ...poppins(800) },
  verifyKicker: { fontSize: 11, lineHeight: 16, letterSpacing: 1.1, color: 'rgba(255,255,255,0.7)', marginTop: 2, ...poppins(600) },
  verifyCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow('lg') },
  verifyPhoto: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  verifyOrder: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(800) },
  verifyOrderLabel: { fontSize: 10, letterSpacing: 0.5, color: tw.slate400, ...poppins(700) },
  verifyCustomer: { fontSize: 14, lineHeight: 20, color: tw.slate700, marginTop: 2, ...poppins(700) },
  verifyItems: { fontSize: 12, lineHeight: 16, color: tw.slate400, fontStyle: 'italic', ...poppins(400) },
  otpLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate400, marginBottom: 12, textAlign: 'center', ...poppins(800) },
  otp: { textAlign: 'center', fontSize: 48, letterSpacing: 24, paddingLeft: 12, paddingVertical: 12, borderWidth: 2, borderColor: tw.slate200, borderRadius: 16, backgroundColor: tw.slate50, color: tw.slate800, ...poppins(800) },
  verifyCancel: { flex: 1, backgroundColor: '#fff', borderWidth: 2, borderColor: tw.slate200, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  verifyConfirm: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  verifyButtonText: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, ...poppins(800) },
  grab: { alignSelf: 'center', height: 4, width: 40, borderRadius: 2, backgroundColor: tw.gray200, marginBottom: 8 },
  sheetId: { fontSize: 16, lineHeight: 24, color: '#000', ...poppins(800) },
  sheetCustomer: { fontSize: 12, lineHeight: 16, color: tw.gray600, marginTop: 2, ...poppins(600) },
  sheetType: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 2, ...poppins(500) },
  sheetBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  sheetBadgeText: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, ...poppins(800) },
  sheetTime: { fontSize: 11, lineHeight: 16, color: tw.gray400, ...poppins(500) },
  rule: { borderTopWidth: 1, borderTopColor: tw.gray100, marginVertical: 12 },
  sheetSection: { fontSize: 12, lineHeight: 16, letterSpacing: 0.3, color: tw.gray900, marginBottom: 8, ...poppins(800) },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: tw.slate50, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: tw.slate200, ...shadow('sm') },
  sheetItemText: { flex: 1, fontSize: 14, lineHeight: 19, color: tw.slate900, ...poppins(700) },
  sheetMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, backgroundColor: tw.gray50, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  sheetMetaText: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  sheetNote: { marginBottom: 16, padding: 12, borderWidth: 1, borderRadius: 12 },
  sheetNoteLabel: { fontSize: 10, lineHeight: 15, marginBottom: 4, ...poppins(700) },
  sheetNoteText: { fontSize: 12, lineHeight: 16, ...poppins(500) },
  close: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', ...shadow('md') },
  closeText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
});
