import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { AlertCircle, ArrowLeft, Calendar, Check, Copy, CreditCard, Download, FileText, MapPin, Phone, RotateCcw, ShoppingBag, User, X } from 'lucide-react-native';
import Image from '../../components/Img';
import { Press } from '../../components/ui';
import { Button, Card, EmptyState, IconButton, StatusBadge } from '../../components/ds';
import { NAV_CLEARANCE, isImmersiveRoute } from '../../components/dh/AppBottomNav';
import { orderAPI, restaurantAPI } from '../../api/food';
import { useCart } from '../context/CartContext';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { getCompanyNameAsync } from '../utils/businessSettings';
import { shareOrderSummaryPdf } from '../utils/orderPdf';
import { useParams, navigateTo } from '../../lib/webRouter';
import { navigator } from '../../lib/webShim';
import { toast } from '../../lib/notify';
import { color, radii, space, tone as tones, type } from '../../theme';
import { BillRow, CtaBar, Divider, VegMark } from '../components/cart/parts';

const DISH_FALLBACK = require('../../../assets/food/dish_fallback.webp');
const REST_FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80';
function ItemImg({ uri }) {
  const [failed, setFailed] = useState(false);
  return <Image source={uri && !failed ? { uri } : DISH_FALLBACK} onError={() => setFailed(true)} style={styles.itemImg} resizeMode="cover" />;
}

function InfoRow({ icon: Icon, title, children }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
      <View style={styles.infoIcon}>
        <Icon size={18} color={color.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[type.bodyStrong, { color: color.text }]}>{title}</Text>
        {children}
      </View>
    </View>
  );
}

export default function UserOrderDetails() {
  const goBack = useAppBackNavigation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const navClearance = (isImmersiveRoute(pathname) ? 0 : NAV_CLEARANCE) + insets.bottom;
  const { replaceCart } = useCart();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const response = await orderAPI.getOrderDetails(orderId);
        let orderData = null;
        if (response?.data?.success && response.data.data?.order) orderData = response.data.data.order;
        else if (response?.data?.order && typeof response.data.order === 'object') orderData = response.data.order;
        else {
          toast.error('Order not found');
          navigateTo('/user/orders');
          return;
        }
        setOrder(orderData);
        const restaurantId = orderData.restaurantId;
        if (restaurantId && typeof restaurantId === 'string' && !orderData.restaurant) {
          try {
            const rr = await restaurantAPI.getRestaurantById(restaurantId);
            if (rr?.data?.success && rr.data.data?.restaurant) setRestaurant(rr.data.data.restaurant);
            else if (rr?.data?.restaurant) setRestaurant(rr.data.restaurant);
          } catch {}
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to load order details');
        navigateTo('/user/orders');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [orderId]);

  if (loading) {
    return (
      <View style={[styles.page, { alignItems: 'center', justifyContent: 'center' }]} accessibilityRole="progressbar">
        <Text style={[type.body, { color: color.textSecondary }]}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.page, { justifyContent: 'center' }]}>
        <EmptyState icon={AlertCircle} title="Order not found" actionLabel="Back to orders" onAction={() => navigateTo('/user/orders')} />
      </View>
    );
  }

  const orderIdDisplay = order.orderId || order._id || orderId;
  const restaurantObj = restaurant || order.restaurantId || order.restaurant || {};
  const restaurantName =
    order.restaurantName || restaurantObj.restaurantName || restaurantObj.name || (typeof restaurantObj === 'string' ? restaurantObj : '') || 'Restaurant';

  const restaurantLocation = (() => {
    const loc = restaurantObj.location || {};
    if (restaurantObj.address) return restaurantObj.address;
    if (loc.formattedAddress) return loc.formattedAddress;
    if (loc.address) return loc.address;
    if (loc.street || loc.city) {
      const parts = [loc.street, loc.area, loc.city, loc.state, loc.zipCode || loc.pincode || loc.postalCode].filter(Boolean);
      if (parts.length) return parts.join(', ');
    }
    if (loc.addressLine1) {
      const parts = [loc.addressLine1, loc.addressLine2, loc.city, loc.state].filter(Boolean);
      if (parts.length) return parts.join(', ');
    }
    if (order.restaurantAddress) return order.restaurantAddress;
    return 'Address not available';
  })();

  const items = Array.isArray(order.items) ? order.items : [];
  const pricing = order.pricing || {};
  const userName = order.userName || order.customerName || '';
  const userPhone = order.userPhone || order.customerPhone || '';
  const paymentMethod = order.payment?.method || 'Online';
  const paymentDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-IN', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';

  const addressText = (() => {
    const candidates = [order.deliveryAddress, order.address, order.deliveryAddressId, order.userAddress].filter(Boolean);
    for (const addr of candidates) {
      if (typeof addr === 'string' && addr.trim()) return addr.trim();
      if (typeof addr === 'object') {
        if (addr.formattedAddress) return addr.formattedAddress;
        if (addr.address && typeof addr.address === 'string') return addr.address;
        const parts = [
          addr.houseNo || addr.houseNumber,
          addr.buildingName,
          addr.street || addr.streetAddress || addr.addressLine1,
          addr.addressLine2,
          addr.area || addr.locality || addr.neighbourhood,
          addr.landmark,
          addr.city || addr.town,
          addr.state,
          addr.zipCode || addr.pincode || addr.postalCode || addr.zip,
        ].filter(Boolean);
        if (parts.length) return parts.join(', ');
      }
    }
    return '';
  })();

  const savings = (pricing.discount || 0) + (pricing.originalItemTotal || 0) - (pricing.subtotal || 0);
  const restaurantPhone = restaurantObj.primaryContactNumber || restaurantObj.phone || restaurantObj.contactNumber || order.restaurantPhone || '';

  const isCancelled = order.status === 'cancelled' || order.status === 'cancelled_by_restaurant' || order.status === 'restaurant_cancelled' || order.status?.includes('cancel');
  const isDelivered = order.status === 'delivered';
  const method = String(order.payment?.method || order.paymentMethod || 'online').toLowerCase();
  const isCod = method === 'cash' || method === 'cod';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(orderIdDisplay));
      toast.success('Order ID copied');
    } catch {
      toast.error('Failed to copy Order ID');
    }
  };

  const handleCall = () => {
    if (!restaurantPhone) {
      toast.error('Restaurant phone number not available');
      return;
    }
    Linking.openURL(`tel:${restaurantPhone}`).catch(() => {});
  };

  const handleDownloadSummary = async () => {
    try {
      const companyName = await getCompanyNameAsync();
      await shareOrderSummaryPdf({ companyName, orderIdDisplay, paymentDate, userName, addressText, restaurantName, restaurantLocation, items, total: pricing.total });
      toast.success('Summary downloaded successfully!');
    } catch {
      toast.error('Failed to download summary');
    }
  };

  const handleReorder = (currentOrder) => {
    const target =
      restaurantObj.slug ||
      restaurantObj._id ||
      restaurantObj.restaurantId ||
      (typeof currentOrder?.restaurantId === 'string' ? currentOrder.restaurantId : currentOrder?.restaurantId?._id);
    if (!target || !items.length) {
      toast.error('Order items or restaurant information not available');
      return;
    }
    const reorderItems = items
      .map((item, index) => {
        const itemId = item.id || item.itemId || item._id;
        if (!itemId) return null;
        return {
          id: itemId,
          name: item.name || item.foodName || 'Item',
          price: Number(item.price) || 0,
          image: item.image || '',
          restaurant: restaurantName,
          restaurantId: restaurantObj._id || restaurantObj.restaurantId || currentOrder?.restaurantId,
          description: item.description || '',
          isVeg: item.isVeg === true || item.foodType === 'Veg',
          quantity: Math.max(1, Number(item.quantity || item.qty) || 1),
          reorderIndex: index,
        };
      })
      .filter(Boolean);
    if (!reorderItems.length) {
      toast.error('No reorderable items found in this order');
      return;
    }
    replaceCart(reorderItems);
    toast.success('Items added to cart');
    navigateTo(`/food/user/restaurants/${target}`);
  };

  const statusTone = isCancelled ? { tone: 'danger', Icon: X, label: 'Cancelled' } : isDelivered ? { tone: 'success', Icon: Check, label: order.orderType === 'takeaway' ? 'Picked up' : 'Delivered' } : { tone: 'warning', Icon: ShoppingBag, label: 'Processing' };
  const payBadge = (cod) => <StatusBadge tone={cod ? 'neutral' : 'success'} label={cod ? 'COD' : 'Online'} />;

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Back" onPress={goBack} />
        <Text style={[type.heading, { color: color.text, flex: 1 }]} accessibilityRole="header">
          Order details
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxl }}>
        <Card style={styles.rowCard}>
          <View style={[styles.statusIcon, { backgroundColor: tones[statusTone.tone].bg }]}>
            <statusTone.Icon size={22} color={tones[statusTone.tone].fg} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <StatusBadge tone={statusTone.tone} label={statusTone.label} />
            <Text style={[type.subheading, { color: color.text }]}>
              {isDelivered
                ? order.orderType === 'takeaway'
                  ? 'Order picked up'
                  : 'Order was delivered'
                : isCancelled
                  ? 'Order was cancelled'
                  : 'Order status: ' + String(order.status || 'processing').replace(/_/g, ' ')}
            </Text>
            <Text style={[type.small, { color: color.textMuted }]}>{isDelivered ? 'Thank you for ordering' : isCancelled ? 'This order was not fulfilled' : 'We are processing your order'}</Text>
          </View>
        </Card>

        {isCancelled ? (
          <View style={styles.cancelBox}>
            <X size={18} color={color.danger} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
              <Text style={[type.label, { color: color.danger }]}>Cancellation reason</Text>
              <Text style={[type.bodyStrong, { color: color.text }]}>{order.cancellationReason || 'The restaurant was unable to fulfill this order.'}</Text>
              <Text style={[type.caption, { color: color.textSecondary }]}>Refund will be initiated to your source payment method.</Text>
            </View>
          </View>
        ) : null}

        <Card>
          <View style={styles.restRow}>
            <Image
              source={{ uri: restaurantObj.profileImage?.url || restaurantObj.profileImage || order.restaurantImage || (Array.isArray(items) && items[0]?.image) || REST_FALLBACK }}
              style={styles.restImg}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.subheading, { color: color.text }]} numberOfLines={2}>
                {restaurantName}
              </Text>
              <Text style={[type.small, { color: color.textMuted }]} numberOfLines={2}>
                {restaurantLocation}
              </Text>
            </View>
            <IconButton icon={Phone} label="Call restaurant" variant="primary" onPress={handleCall} />
          </View>

          <Press scale={0.98} onPress={handleCopy} accessibilityLabel="Copy order id" style={styles.idRow}>
            <Text style={[type.caption, { color: color.textMuted }]}>Order ID</Text>
            <Text style={[type.label, { color: color.text, flexShrink: 1 }]} numberOfLines={1}>
              #{orderIdDisplay}
            </Text>
            <Copy size={16} color={color.primary} />
          </Press>

          {order.note ? (
            <View style={styles.note}>
              <Text style={[type.small, { color: color.text }]}>
                <Text style={{ color: color.textMuted }}>Note: </Text>
                {order.note}
              </Text>
            </View>
          ) : null}

          <Divider dashed style={{ marginVertical: space.md }} />

          <View style={{ gap: space.md }}>
            {items.map((item, idx) => {
              const veg = item.isVeg === true || item.foodType === 'Veg';
              return (
                <View key={idx} style={styles.itemRow}>
                  <ItemImg uri={item.image} />
                  <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', gap: space.sm }}>
                    <VegMark veg={veg} size={14} style={{ marginTop: 3 }} />
                    <Text style={[type.body, { color: color.text, flex: 1 }]}>
                      {item.quantity || item.qty || 1} × {item.name}
                      {item.variantName ? ` (${item.variantName})` : ''}
                    </Text>
                  </View>
                  <Text style={[type.bodyStrong, { color: color.text }]}>₹{(item.price || 0).toFixed(2)}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {order.status === 'delivered' ? (
          <Button
            title="Restaurant complaint"
            icon={FileText}
            variant="outline"
            onPress={() => {
              const mongoId = order._id || orderId;
              if (!mongoId) {
                toast.error('Order ID not available. Please refresh the page.');
                return;
              }
              navigateTo(`/user/complaints/submit/${encodeURIComponent(String(mongoId))}`);
            }}
          />
        ) : null}

        <Card padded={false} style={{ overflow: 'hidden' }}>
          <View style={styles.billHead}>
            <FileText size={20} color={color.primary} />
            <Text style={[type.subheading, { color: color.text, flex: 1 }]}>Bill summary</Text>
            <IconButton icon={Download} label="Download summary" variant="primary" iconSize={18} onPress={handleDownloadSummary} />
          </View>

          <View style={{ padding: space.lg, gap: space.md }}>
            <View style={styles.line}>
              <Text style={[type.body, { color: color.textSecondary }]}>Item total</Text>
              <Text style={[type.bodyStrong, { color: color.text }]}>
                {pricing.originalItemTotal ? (
                  <Text style={{ color: color.textMuted, textDecorationLine: 'line-through', fontFamily: type.body.fontFamily }}>₹{Number(pricing.originalItemTotal).toFixed(2)} </Text>
                ) : null}
                ₹{Number(pricing.subtotal || pricing.total || 0).toFixed(2)}
              </Text>
            </View>
            <BillRow label="GST (govt. taxes)" value={`₹${Number(pricing.tax || 0).toFixed(2)}`} />
            {order.orderType !== 'takeaway' && order.orderType !== 'dining' ? (
              <BillRow label="Delivery fee" tone={pricing.deliveryFee ? undefined : 'success'} value={pricing.deliveryFee ? `₹${Number(pricing.deliveryFee).toFixed(2)}` : 'Free'} />
            ) : null}
            {Number(pricing.platformFee || 0) > 0 ? <BillRow label="Platform fee" value={`₹${Number(pricing.platformFee || 0).toFixed(2)}`} /> : null}
            {Number(pricing.subscriptionFee || 0) > 0 ? <BillRow label="Subscription / other fees" value={`₹${Number(pricing.subscriptionFee || 0).toFixed(2)}`} /> : null}
            <Divider />
            <View style={styles.line}>
              <View style={styles.row}>
                <Text style={[type.bodyStrong, { color: color.text }]}>Paid</Text>
                {payBadge(isCod)}
              </View>
              <Text style={[type.price, { color: color.text }]}>₹{Number(pricing.total || 0).toFixed(2)}</Text>
            </View>
          </View>

          {savings > 0 ? (
            <View style={styles.savings}>
              <Text style={[type.bodyStrong, { color: color.success, textAlign: 'center' }]}>You saved ₹{Number(savings).toFixed(2)} on this order!</Text>
            </View>
          ) : null}
        </Card>

        <Card style={{ gap: space.lg }}>
          <InfoRow icon={User} title="Customer details">
            <Text style={[type.small, { color: color.textSecondary }]}>{userName || 'Customer'}</Text>
            {userPhone ? <Text style={[type.caption, { color: color.textMuted }]}>{userPhone}</Text> : null}
          </InfoRow>
          <Divider />
          <InfoRow icon={CreditCard} title="Payment method">
            <View style={[styles.row, { marginTop: 2 }]}>
              <Text style={[type.small, { color: color.textSecondary }]}>Paid via</Text>
              <StatusBadge tone={paymentMethod.toLowerCase() === 'cash' || paymentMethod.toLowerCase() === 'cod' ? 'neutral' : 'success'} label={paymentMethod.toUpperCase()} />
            </View>
          </InfoRow>
          <Divider />
          <InfoRow icon={Calendar} title="Payment date">
            <Text style={[type.small, { color: color.textSecondary }]}>{paymentDate}</Text>
          </InfoRow>
          {order.orderType !== 'takeaway' ? (
            <>
              <Divider />
              <InfoRow icon={MapPin} title="Delivery address">
                <Text style={[type.small, { color: color.textSecondary }]}>{addressText || 'Address not available'}</Text>
              </InfoRow>
            </>
          ) : null}
        </Card>
      </ScrollView>

      <CtaBar extraBottom={navClearance} style={{ flexDirection: 'row' }}>
        <Button title="Invoice" icon={Download} variant="outline" onPress={handleDownloadSummary} style={{ flex: 1 }} />
        <Button title="Reorder" icon={RotateCcw} onPress={() => handleReorder(order)} style={{ flex: 1 }} />
      </CtaBar>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.xs, minHeight: 56, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  statusIcon: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  cancelBox: { backgroundColor: color.dangerSoft, borderRadius: radii.lg, padding: space.lg, flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  restImg: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44, marginTop: space.sm },
  note: { backgroundColor: color.surfaceMuted, borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: space.sm, marginTop: space.xs },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  itemImg: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  billHead: { paddingLeft: space.lg, paddingRight: space.sm, paddingVertical: space.xs, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  savings: { backgroundColor: color.successSoft, padding: space.md },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
