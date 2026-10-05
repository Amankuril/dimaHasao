import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ArrowLeft, Calendar, Check, Copy, CreditCard, Download, FileText, MapPin, Phone, RotateCcw, ShoppingBag, User, X } from 'lucide-react-native';
import Image from '../../components/Img';
import { Press } from '../../components/ui';
import { orderAPI, restaurantAPI } from '../../api/food';
import { useCart } from '../context/CartContext';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { getCompanyNameAsync } from '../utils/businessSettings';
import { shareOrderSummaryPdf } from '../utils/orderPdf';
import { useParams, navigateTo } from '../../lib/webRouter';
import { navigator } from '../../lib/webShim';
import { toast } from '../../lib/notify';
import { poppins, shadow, tw } from '../../theme';

const GREEN = '#0a4d2b';
const DISH_FALLBACK = require('../../../assets/food/dish_fallback.webp');
const REST_FALLBACK = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=100&q=80';
const SCALLOP =
  'M0,0V46.29c47,0,47,69.5,94,69.5s47-69.5,94-69.5,47,69.5,94,69.5,47-69.5,94-69.5,47,69.5,94,69.5,47-69.5,94-69.5,47,69.5,94,69.5,47-69.5,94-69.5,47,69.5,94,69.5V0Z';

function ItemImg({ uri }) {
  const [failed, setFailed] = useState(false);
  return <Image source={uri && !failed ? { uri } : DISH_FALLBACK} onError={() => setFailed(true)} style={styles.itemImg} resizeMode="cover" />;
}

function InfoRow({ icon: Icon, title, children }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={styles.infoIcon}>
        <Icon size={16} color={tw.gray600} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoTitle}>{title}</Text>
        {children}
      </View>
    </View>
  );
}

export default function UserOrderDetails() {
  const goBack = useAppBackNavigation();
  const insets = useSafeAreaInsets();
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
      <View style={[styles.page, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 14, color: tw.gray600, ...poppins(400) }}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.page, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        <Text style={{ fontSize: 14, color: tw.gray700, ...poppins(500) }}>Order not found</Text>
        <Press onPress={() => navigateTo('/user/orders')} style={[styles.notFoundBtn, shadow('md')]}>
          <Text style={{ color: '#fff', fontSize: 14, ...poppins(600) }}>Back to Orders</Text>
        </Press>
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

  const statusTone = isCancelled
    ? { bg: tw.red50, fg: tw.red600, Icon: X }
    : isDelivered
      ? { bg: tw.green50, fg: tw.green600, Icon: Check }
      : { bg: tw.amber50, fg: tw.amber600, Icon: ShoppingBag };

  const badge = (cod) => (
    <View style={[styles.badge, cod ? { backgroundColor: tw.gray100, borderColor: tw.gray200 } : { backgroundColor: tw.green100, borderColor: tw.green200 }]}>
      <Text style={[styles.badgeText, { color: tw.gray800 }, !cod && { color: tw.green800 }]}>{cod ? 'COD' : 'ONLINE'}</Text>
    </View>
  );

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Press scale={0.9} onPress={goBack} accessibilityLabel="Back" style={{ padding: 4 }}>
          <ArrowLeft size={24} color={tw.gray700} />
        </Press>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 96 + insets.bottom }}>
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }]}>
          <View style={[styles.statusIcon, { backgroundColor: statusTone.bg }]}>
            <statusTone.Icon size={20} color={statusTone.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, color: tw.gray800, lineHeight: 20, ...poppins(700) }}>
              {isDelivered
                ? order.orderType === 'takeaway'
                  ? 'Order Picked UP'
                  : 'Order was delivered'
                : isCancelled
                  ? 'Order was cancelled'
                  : 'Order Status: ' + (order.status?.toUpperCase() || 'PROCESSING')}
            </Text>
            <Text style={{ fontSize: 12, color: tw.gray500, marginTop: 4, ...poppins(400) }}>
              {isDelivered ? 'Thank you for ordering' : isCancelled ? 'This order was not fulfilled' : 'We are processing your order'}
            </Text>
          </View>
        </View>

        {isCancelled ? (
          <View style={styles.cancelBox}>
            <View style={styles.cancelDot} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 10, color: tw.red800, letterSpacing: 1.5, ...poppins(700) }}>CANCELLATION REASON</Text>
              <Text style={{ fontSize: 14, color: tw.gray900, lineHeight: 20, ...poppins(600) }}>{order.cancellationReason || 'The restaurant was unable to fulfill this order.'}</Text>
              <Text style={{ fontSize: 11, color: tw.gray500, paddingTop: 2, ...poppins(400) }}>Refund will be initiated to your source payment method.</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.card, { padding: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <Image
                source={{ uri: restaurantObj.profileImage?.url || restaurantObj.profileImage || order.restaurantImage || (Array.isArray(items) && items[0]?.image) || REST_FALLBACK }}
                style={{ width: 40, height: 40, borderRadius: 8 }}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 16, color: tw.gray800, ...poppins(600) }}>{restaurantName}</Text>
                <Text style={{ fontSize: 12, color: tw.gray500, ...poppins(400) }}>{restaurantLocation}</Text>
              </View>
            </View>
            <Press scale={0.9} onPress={handleCall} accessibilityLabel="Call restaurant" style={styles.callBtn}>
              <Phone size={16} color={GREEN} />
            </Press>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: tw.gray500, letterSpacing: 0.6, ...poppins(500) }}>ORDER ID: #{orderIdDisplay}</Text>
            <Press scale={0.9} onPress={handleCopy} accessibilityLabel="Copy order id" hitSlop={8}>
              <Copy size={12} color={tw.gray400} />
            </Press>
          </View>

          {order.note ? (
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <View style={styles.noteChip}>
                <Text style={{ fontSize: 12, color: tw.blue700, ...poppins(600) }}>Note: {order.note}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.dashed} />

          {items.map((item, idx) => {
            const veg = item.isVeg === true || item.foodType === 'Veg';
            const c = veg ? tw.green600 : tw.red600;
            return (
              <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: idx === 0 ? 0 : 16, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <ItemImg uri={item.image} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={[styles.veg, { borderColor: c }]}>
                      <View style={{ flex: 1, borderRadius: 999, backgroundColor: c }} />
                    </View>
                    <Text style={{ fontSize: 14, color: tw.gray700, flex: 1, ...poppins(500) }}>
                      {item.quantity || item.qty || 1} x {item.name}
                      {item.variantName ? ` (${item.variantName})` : ''}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, color: tw.gray800, ...poppins(500) }}>₹{(item.price || 0).toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        {order.status === 'delivered' ? (
          <Press
            onPress={() => {
              const mongoId = order._id || orderId;
              if (!mongoId) {
                toast.error('Order ID not available. Please refresh the page.');
                return;
              }
              navigateTo(`/user/complaints/submit/${encodeURIComponent(String(mongoId))}`);
            }}
            style={styles.complaintBtn}
          >
            <FileText size={16} color={GREEN} />
            <Text style={{ color: GREEN, fontSize: 16, ...poppins(600) }}>Restaurant Complaint</Text>
          </Press>
        ) : null}

        <View style={[styles.card, { overflow: 'hidden' }]}>
          <View style={styles.billHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <FileText size={20} color={tw.gray600} />
              <Text style={{ fontSize: 16, color: tw.gray800, ...poppins(600) }}>Bill Summary</Text>
            </View>
            <Press scale={0.9} onPress={handleDownloadSummary} accessibilityLabel="Download summary" style={styles.dlBtn}>
              <Download size={16} color={GREEN} />
            </Press>
          </View>

          <View style={{ padding: 16, gap: 8 }}>
            <View style={styles.line}>
              <Text style={styles.lblMuted}>Item total</Text>
              <Text style={styles.val}>
                {pricing.originalItemTotal ? <Text style={{ color: tw.gray400, textDecorationLine: 'line-through' }}>₹{Number(pricing.originalItemTotal).toFixed(2)} </Text> : null}₹{Number(pricing.subtotal || pricing.total || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.line}>
              <Text style={styles.lblMuted}>GST (govt. taxes)</Text>
              <Text style={styles.val}>₹{Number(pricing.tax || 0).toFixed(2)}</Text>
            </View>
            {order.orderType !== 'takeaway' && order.orderType !== 'dining' ? (
              <View style={styles.line}>
                <Text style={[{ color: tw.gray400, fontSize: 14 }, poppins(500)]}>Delivery fee</Text>
                {pricing.deliveryFee === 0 ? (
                  <View style={styles.free}>
                    <Text style={{ color: GREEN, fontSize: 10, ...poppins(700) }}>FREE</Text>
                  </View>
                ) : null}
                <Text style={{ color: GREEN, fontSize: 14, ...poppins(500) }}>{pricing.deliveryFee ? `₹${Number(pricing.deliveryFee).toFixed(2)}` : 'FREE'}</Text>
              </View>
            ) : null}
            {Number(pricing.platformFee || 0) > 0 ? (
              <View style={styles.line}>
                <Text style={styles.lblMuted}>Platform fee</Text>
                <Text style={styles.val}>₹{Number(pricing.platformFee || 0).toFixed(2)}</Text>
              </View>
            ) : null}
            {Number(pricing.subscriptionFee || 0) > 0 ? (
              <View style={styles.line}>
                <Text style={styles.lblMuted}>Subscription / other fees</Text>
                <Text style={styles.val}>₹{Number(pricing.subscriptionFee || 0).toFixed(2)}</Text>
              </View>
            ) : null}
            <View style={[styles.line, { borderTopWidth: 1, borderTopColor: tw.gray100, marginTop: 8, paddingTop: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 14, color: tw.gray800, ...poppins(700) }}>Paid</Text>
                {badge(isCod)}
              </View>
              <Text style={{ fontSize: 14, color: tw.gray800, ...poppins(700) }}>₹{Number(pricing.total || 0).toFixed(2)}</Text>
            </View>
          </View>

          {savings > 0 ? (
            <View style={styles.savings}>
              <View style={{ position: 'absolute', top: -6, left: 0, right: 0, height: 8 }}>
                <Svg width="100%" height={8} viewBox="0 0 1200 120" preserveAspectRatio="none">
                  <Path d={SCALLOP} fill="#ffffff" />
                </Svg>
              </View>
              <Text style={{ textAlign: 'center', color: GREEN, fontSize: 14, paddingTop: 4, ...poppins(700) }}>You saved ₹{Number(savings).toFixed(2)} on this order!</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { padding: 16, gap: 16 }]}>
          <InfoRow icon={User} title="Customer Details">
            <Text style={{ fontSize: 12, color: tw.gray600, marginTop: 2, ...poppins(500) }}>{userName || 'Customer'}</Text>
            <Text style={{ fontSize: 11, color: tw.gray400, marginTop: 2, ...poppins(400) }}>{userPhone}</Text>
          </InfoRow>
          <View style={styles.hr} />
          <InfoRow icon={CreditCard} title="Payment Method">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={{ fontSize: 12, color: tw.gray500, ...poppins(400) }}>Paid via</Text>
              <View style={[styles.badge, paymentMethod.toLowerCase() === 'cash' || paymentMethod.toLowerCase() === 'cod' ? { backgroundColor: tw.gray100, borderColor: tw.gray200 } : { backgroundColor: tw.green100, borderColor: tw.green200 }]}>
                <Text style={[styles.badgeText, { fontSize: 9, color: paymentMethod.toLowerCase() === 'cash' || paymentMethod.toLowerCase() === 'cod' ? tw.gray800 : tw.green800 }]}>{paymentMethod.toUpperCase()}</Text>
              </View>
            </View>
          </InfoRow>
          <View style={styles.hr} />
          <InfoRow icon={Calendar} title="Payment Date">
            <Text style={{ fontSize: 12, color: tw.gray600, marginTop: 2, ...poppins(500) }}>{paymentDate}</Text>
          </InfoRow>
          {order.orderType !== 'takeaway' ? (
            <>
              <View style={styles.hr} />
              <InfoRow icon={MapPin} title="Delivery Address">
                <Text style={{ fontSize: 12, color: tw.gray600, marginTop: 2, lineHeight: 19, ...poppins(500) }}>{addressText || 'Address not available'}</Text>
              </InfoRow>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: 16 + insets.bottom }]}>
        <Press onPress={() => handleReorder(order)} style={[styles.reorder, shadow('md')]}>
          <RotateCcw size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 16, ...poppins(600) }}>Reorder</Text>
        </Press>
        <Press onPress={handleDownloadSummary} style={styles.invoice}>
          <Download size={16} color={GREEN} />
          <Text style={{ color: GREEN, fontSize: 16, ...poppins(600) }}>Invoice</Text>
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tw.gray50 },
  header: { backgroundColor: '#fff', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200, ...shadow('xs') },
  headerTitle: { fontSize: 18, color: tw.gray800, ...poppins(600) },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, ...shadow('xs') },
  statusIcon: { padding: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  notFoundBtn: { backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  cancelBox: { backgroundColor: 'rgba(254,242,242,0.6)', borderWidth: 1, borderColor: 'rgba(255,226,226,0.6)', borderRadius: 12, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start', ...shadow('xs') },
  cancelDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tw.red500, marginTop: 6 },
  callBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(10,77,43,0.2)', alignItems: 'center', justifyContent: 'center' },
  noteChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: tw.blue50, borderWidth: 1, borderColor: tw.blue200 },
  dashed: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200, marginVertical: 12 },
  itemImg: { width: 64, height: 64, borderRadius: 12, borderWidth: 1, borderColor: tw.gray100 },
  veg: { width: 12, height: 12, borderWidth: 1, padding: 1 },
  complaintBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(10,77,43,0.05)', borderWidth: 1, borderColor: 'rgba(10,77,43,0.2)', paddingVertical: 12, borderRadius: 8 },
  billHead: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  dlBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(10,77,43,0.1)', alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lblMuted: { fontSize: 14, color: tw.gray500, ...poppins(400) },
  val: { fontSize: 14, color: tw.gray800, ...poppins(400) },
  free: { borderWidth: 1, borderColor: GREEN, paddingHorizontal: 4, borderRadius: 4, marginLeft: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  badgeText: { fontSize: 10, letterSpacing: 0.5, ...poppins(700) },
  savings: { backgroundColor: 'rgba(10,77,43,0.05)', padding: 12, paddingBottom: 16, marginTop: 8 },
  infoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontSize: 14, color: tw.gray800, ...poppins(700) },
  hr: { borderTopWidth: 1, borderTopColor: tw.gray100 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.gray200, padding: 16, flexDirection: 'row', gap: 12 },
  reorder: { flex: 1, backgroundColor: GREEN, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  invoice: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: GREEN, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
