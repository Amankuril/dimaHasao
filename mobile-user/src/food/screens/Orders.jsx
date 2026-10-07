import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import {
  ArrowLeft, ChevronRight, Clock, Copy, FileText, Link2, Mail, MessageCircle, MessagesSquare, MoreVertical, Receipt, RotateCcw, Search, Send, Share2, ShoppingBag, Star,
  UtensilsCrossed, X,
} from 'lucide-react-native';
import Image from '../../components/Img';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { Button, Card, EmptyState, IconButton, StatusBadge } from '../../components/ds';
import { NAV_CLEARANCE, isImmersiveRoute } from '../../components/dh/AppBottomNav';
import { orderAPI } from '../../api/food';
import { API_ORIGIN } from '../../api/client';
import { useCart } from '../context/CartContext';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { getCompanyNameAsync } from '../utils/businessSettings';
import { navigateTo } from '../../lib/webRouter';
import { navigator } from '../../lib/webShim';
import { toast } from '../../lib/notify';
import { localStore } from '../../lib/storage';
import { color, elevation, radii, space, type } from '../../theme';
import { Divider, Field, VegMark } from '../components/cart/parts';

const RUPEE = '₹';
const FALLBACK_REST = 'https://images.unsplash.com/photo-1604908176997-125188eb3c52?auto=format&fit=crop&w=200&q=80';

const calculateCountdown = (order) => {
  if (!order || order.status === 'delivered' || String(order.status).toLowerCase().includes('cancel')) return null;
  if (order.preparationTime && order.acceptedAt) {
    const elapsed = Math.floor((new Date() - new Date(order.acceptedAt)) / 60000);
    const remaining = Math.max(0, order.preparationTime - elapsed);
    return remaining > 0 ? remaining : null;
  }
  const elapsed = Math.floor((new Date() - new Date(order.createdAt)) / 60000);
  const maxETA = order.eta?.max || order.estimatedDeliveryTime || 30;
  const remaining = Math.max(0, maxETA - elapsed);
  return remaining > 0 ? remaining : null;
};

const getOrderStatus = (order) => {
  const status = order.status;
  if (status === 'delivered' || status === 'completed') return 'delivered';
  if (status === 'out_for_delivery' || status === 'outForDelivery') return 'outForDelivery';
  if (status === 'ready' || status === 'preparing') return 'preparing';
  if (String(status).toLowerCase().includes('cancel')) return 'cancelled';
  return status || 'confirmed';
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return `${day} ${month}, ${hours % 12 || 12}:${minutes}${ampm}`;
};

const pageOrders = (resp) => {
  if (resp?.data?.success && resp?.data?.data?.orders) return resp.data.data.orders || [];
  if (resp?.data?.orders) return resp.data.orders || [];
  if (resp?.data?.data && Array.isArray(resp.data.data)) return resp.data.data || [];
  return [];
};

const fetchAllOrders = async () => {
  const LIMIT = 100;
  const first = await orderAPI.getOrders({ limit: LIMIT, page: 1 });
  let totalPages = 1;
  if (first?.data?.success && first?.data?.data?.orders) totalPages = first.data.data?.pagination?.pages || 1;
  else if (first?.data?.orders) totalPages = first.data?.pagination?.pages || 1;
  const firstPage = pageOrders(first);
  if (totalPages <= 1) return firstPage;
  const rest = await Promise.all(Array.from({ length: totalPages - 1 }, (_, i) => orderAPI.getOrders({ limit: LIMIT, page: i + 2 })));
  return [...firstPage, ...rest.flatMap(pageOrders)];
};

const transform = (order) => {
  const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
  const backendStatus = order.orderStatus || order.status;
  const isCancelled = ['cancelled', 'cancelled_by_user', 'cancelled_by_restaurant', 'cancelled_by_admin'].includes(backendStatus);
  const cancellationReason = order.cancellationReason || '';
  const isRestaurantCancelled =
    isCancelled &&
    (order.cancelledBy === 'restaurant' ||
      /rejected by restaurant|restaurant rejected|restaurant cancelled|restaurant is too busy|item not available|outside delivery area|kitchen closing|technical issue|order not accepted within time limit|restaurant did not respond/i.test(cancellationReason));
  const isUserCancelled = isCancelled && order.cancelledBy === 'user';
  const restaurantRating = order.ratings?.restaurant?.rating || null;
  const deliveryPartnerRating = order.ratings?.deliveryPartner?.rating || null;
  return {
    id: order._id?.toString() || order.orderId || `ORD-${order._id}`,
    mongoId: order._id,
    orderId: order.orderId || order._id?.toString(),
    status: isRestaurantCancelled ? 'restaurant_cancelled' : getOrderStatus({ ...order, status: backendStatus }),
    originalStatus: backendStatus,
    createdAt: createdAt.toISOString(),
    address: order.address || order.deliveryAddress || {},
    items: (order.items || []).map((item) => ({
      itemId: item.itemId || item._id || item.id,
      name: item.name || item.foodName || 'Item',
      variantName: item.variantName || '',
      quantity: item.quantity || 1,
      price: item.price || 0,
      image: item.image || null,
      description: item.description || null,
      isVeg: item.isVeg === true || item.foodType === 'Veg' || item.category === 'veg' || item.type === 'veg',
      _id: item._id || item.id,
      id: item.id || item._id,
    })),
    total: order.pricing?.total || order.total || 0,
    subtotal: order.pricing?.subtotal || 0,
    deliveryFee: order.pricing?.deliveryFee || 0,
    tax: order.pricing?.tax || 0,
    pricing: order.pricing || {},
    payment: order.payment || {},
    paymentMethod: order.payment?.method || order.paymentMethod,
    restaurant: order.restaurantId?.restaurantName || order.restaurantId?.name || order.restaurantName || 'Restaurant',
    restaurantId: order.restaurantId?._id || order.restaurantId,
    restaurantSlug: order.restaurantId?.slug || null,
    restaurantImage: order.restaurantId?.profileImage?.url || order.restaurantId?.profileImage || null,
    restaurantLocation: order.restaurantId?.location?.area || order.restaurantId?.location?.city || order.address?.city || order.deliveryAddress?.city || '',
    restaurantRating,
    deliveryPartnerRating,
    ratings: order.ratings || {},
    rating: restaurantRating || null,
    review: order.review || null,
    tracking: order.tracking || {},
    cancellationReason,
    isRestaurantCancelled,
    isUserCancelled,
    cancelledBy: order.cancelledBy,
    eta: order.eta || { min: order.estimatedDeliveryTime || 30, max: order.estimatedDeliveryTime || 30 },
    estimatedDeliveryTime: order.estimatedDeliveryTime || 30,
    preparationTime: order.preparationTime || 0,
    acceptedAt: order.acceptedAt || null,
    deliveredAt: order.deliveredAt || null,
    deliveryPartnerId: order.deliveryPartnerId?._id || order.deliveryPartnerId || null,
    deliveryPartnerName: order.deliveryPartnerId?.name || order.deliveryPartnerName || null,
    deliveryPartnerPhone: order.deliveryPartnerId?.phone || order.deliveryPartnerPhone || null,
    note: order.note || null,
    orderType: order.orderType || 'delivery',
  };
};

function Header({ goBack }) {
  return (
    <View style={styles.header}>
      <IconButton icon={ArrowLeft} label="Back" onPress={goBack} />
      <Text style={[type.heading, { color: color.text, flex: 1 }]} accessibilityRole="header">
        Your orders
      </Text>
    </View>
  );
}

function Stars({ value, setValue, label }) {
  return (
    <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (value || 0) >= n;
        return (
          <Press key={n} scale={0.9} onPress={() => setValue(n)} style={styles.star} accessibilityRole="radio" accessibilityState={{ checked: value === n }} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
            <Star size={32} color={active ? color.gold : color.borderStrong} fill={active ? color.gold : 'transparent'} />
          </Press>
        );
      })}
    </View>
  );
}

const SHARE_TARGETS = [
  ['whatsapp', 'WhatsApp', MessageCircle],
  ['telegram', 'Telegram', Send],
  ['email', 'Email', Mail],
  ['sms', 'SMS', MessagesSquare],
  ['facebook', 'Facebook', Share2],
  ['x', 'X', Link2],
  ['linkedin', 'LinkedIn', Share2],
];

const sentence = (s) => {
  const t = String(s || '').replace(/_/g, ' ');
  return t ? (t[0].toUpperCase() + t.slice(1).toLowerCase()).replace(/^Cod\b/, 'COD') : t;
};

export default function Orders() {
  const goBack = useAppBackNavigation();
  const { replaceCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingModal, setRatingModal] = useState({ open: false, order: null });
  const [activeMenuOrderId, setActiveMenuOrderId] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePayload, setSharePayload] = useState(null);
  const [restRating, setRestRating] = useState(null);
  const [delRating, setDelRating] = useState(null);
  const [restText, setRestText] = useState('');
  const [delText, setDelText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [countdowns, setCountdowns] = useState({});
  const ordersRef = useRef([]);

  useEffect(() => {
    const update = () => {
      const next = {};
      orders.forEach((o) => {
        const r = calculateCountdown(o);
        if (r !== null) next[o.id] = r;
      });
      setCountdowns(next);
    };
    update();
    const t = setInterval(update, 10000);
    return () => clearInterval(t);
  }, [orders]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        if (!ordersRef.current.length) setLoading(true);
        const data = await fetchAllOrders();
        if (!alive) return;
        const list = data.map(transform).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        ordersRef.current = list;
        setOrders(list);
      } catch (error) {
        if (!alive) return;
        let msg = 'Failed to load orders';
        if (error?.response?.status === 401) msg = 'Please login to view your orders';
        else if (error?.response?.data?.message) msg = error.response.data.message;
        toast.error(msg);
        ordersRef.current = [];
        setOrders([]);
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    const t = setInterval(run, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const q = searchQuery.trim().toLowerCase();
  const filteredOrders = orders.filter((o) => {
    if (!q) return true;
    return o.restaurant?.toLowerCase().includes(q) || o.items.some((i) => (i.name || i.foodName || '').toLowerCase().includes(q));
  });

  const modalHasDelivery = !!(ratingModal.order?.deliveryPartnerId || ratingModal.order?.deliveryPartnerName);
  const submitDisabled = submitting || restRating === null || (modalHasDelivery && delRating === null);

  const handleReorder = (order) => {
    const target = order.restaurantSlug || order.restaurantId;
    if (!target || !order.items?.length) {
      toast.info('Order items or restaurant information not available');
      return;
    }
    const items = order.items
      .map((item, index) => {
        const itemId = item.id || item.itemId || item._id;
        if (!itemId) return null;
        return {
          id: itemId,
          name: item.name || item.foodName || 'Item',
          price: Number(item.price) || 0,
          image: item.image || '',
          restaurant: order.restaurant || 'Restaurant',
          restaurantId: order.restaurantId,
          description: item.description || '',
          isVeg: item.isVeg !== false,
          quantity: Math.max(1, Number(item.quantity) || 1),
          reorderIndex: index,
        };
      })
      .filter(Boolean);
    if (!items.length) {
      toast.error('No reorderable items found in this order');
      return;
    }
    replaceCart(items);
    toast.success('Items added to cart');
    navigateTo(`/food/user/restaurants/${target}`);
  };

  const tryNativeShare = async (payload) => {
    try {
      await navigator.share(payload);
      return true;
    } catch (error) {
      return error?.name === 'AbortError';
    }
  };

  const handleShareRestaurant = async (order) => {
    const companyName = await getCompanyNameAsync();
    const location = order.restaurantLocation || `${order.address?.city || ''}, ${order.address?.state || ''}`.trim();
    const path = order.restaurantSlug || order.restaurantId;
    const url = path ? `${API_ORIGIN}/food/user/restaurants/${path}` : `${API_ORIGIN}/food/user/orders/${order.id}`;
    const text = `Check out ${order.restaurant} on ${companyName}.\nLocation: ${location || 'Location not available'}\nOrder again from this restaurant in the ${companyName} app.`;
    const payload = { title: order.restaurant, text, url };
    try {
      const shared = await tryNativeShare(payload);
      if (shared) {
        toast.success('Restaurant shared successfully');
        return;
      }
      setSharePayload(payload);
      setShowShareModal(true);
    } catch {
      toast.error('Failed to share restaurant');
    } finally {
      setActiveMenuOrderId(null);
    }
  };

  const openShareTarget = (target) => {
    if (!sharePayload?.url) return;
    const text = sharePayload.text || '';
    const url = sharePayload.url;
    const links = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      email: `mailto:?subject=${encodeURIComponent(sharePayload.title || 'Check this out')}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
      sms: `sms:?body=${encodeURIComponent(`${text} ${url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text} ${url}`)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };
    if (links[target]) {
      Linking.openURL(links[target]).catch(() => {});
      setShowShareModal(false);
    }
  };

  const copyShareLink = async () => {
    if (!sharePayload?.url) return;
    try {
      await navigator.clipboard.writeText(sharePayload.url);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
    setShowShareModal(false);
  };

  const handleViewOrderDetails = (order) => {
    setActiveMenuOrderId(null);
    const status = String(order.status || '').toLowerCase();
    const terminal = ['delivered', 'cancelled', 'completed', 'failed'].includes(status) || status.includes('cancelled');
    navigateTo(terminal ? `/user/orders/${order.id}/details` : `/user/orders/${order.id}`);
  };

  const handleOpenRating = (order) => {
    setRatingModal({ open: true, order });
    setRestRating(order.restaurantRating || null);
    setDelRating(order.deliveryPartnerRating || null);
    setRestText(order.ratings?.restaurant?.comment || '');
    setDelText(order.ratings?.deliveryPartner?.comment || '');
  };

  const handleCloseRating = () => {
    setRatingModal({ open: false, order: null });
    setRestRating(null);
    setDelRating(null);
    setRestText('');
    setDelText('');
  };

  const handleSubmitRating = async () => {
    const order = ratingModal.order;
    const hasDel = !!(order?.deliveryPartnerId || order?.deliveryPartnerName);
    if (!order || restRating === null || (hasDel && delRating === null)) {
      toast.error('Please select all required ratings first');
      return;
    }
    try {
      setSubmitting(true);
      const response = await orderAPI.submitOrderRatings(order.id, {
        restaurantRating: restRating,
        deliveryPartnerRating: hasDel ? delRating : undefined,
        restaurantComment: restText || undefined,
        deliveryPartnerComment: hasDel ? delText || undefined : undefined,
      });
      const updated = response?.data?.data?.order || response?.data?.order || null;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                restaurantRating: updated?.ratings?.restaurant?.rating ?? restRating,
                deliveryPartnerRating: updated?.ratings?.deliveryPartner?.rating ?? (hasDel ? delRating : null),
                ratings: updated?.ratings || {
                  restaurant: { rating: restRating, comment: restText || '' },
                  deliveryPartner: hasDel ? { rating: delRating, comment: delText || '' } : undefined,
                },
                rating: updated?.ratings?.restaurant?.rating ?? restRating,
              }
            : o,
        ),
      );
      toast.success('Thanks for rating your order!');
      try {
        const stored = JSON.parse(localStore.getItem('shownRatingForOrders') || '[]');
        localStore.setItem('shownRatingForOrders', JSON.stringify([...new Set([...stored, order.id])]));
      } catch {}
      handleCloseRating();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit ratings. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const bottomPad = (isImmersiveRoute(pathname) ? 0 : NAV_CLEARANCE) + insets.bottom + space.xxl;

  if (loading) {
    return (
      <View style={styles.page}>
        <Header goBack={goBack} />
        <View style={{ paddingVertical: 80, alignItems: 'center' }} accessibilityRole="progressbar" accessibilityLabel="Loading orders">
          <ActivityIndicator size="large" color={color.primary} />
        </View>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.page}>
        <Header goBack={goBack} />
        <EmptyState icon={Receipt} title="No orders yet" message="You haven't placed any orders yet" actionLabel="Start ordering" onAction={() => navigateTo('/user')} />
      </View>
    );
  }

  const renderOrder = ({ item: order }) => {
    const m = order.payment?.method;
    const isCodOrWallet = ['cash', 'cod', 'wallet'].includes(m) || ['cash', 'cod', 'wallet'].includes(order.paymentMethod);
    const isCancelled = order.status === 'cancelled' || order.status === 'restaurant_cancelled';
    const paymentFailed = !isCodOrWallet && !isCancelled && order.payment?.status === 'failed';
    const isDelivered = order.status === 'delivered';
    const isRestaurantCancelled = order.isRestaurantCancelled || order.status === 'restaurant_cancelled';
    const isUserCancelled = order.isUserCancelled || (isCancelled && order.cancelledBy === 'user');
    const restaurantImage = order.restaurantImage || order.items?.[0]?.image || FALLBACK_REST;
    const location = order.restaurantLocation || `${order.address?.city || ''}, ${order.address?.state || ''}`.trim() || 'Location not available';
    const payTone = order.payment?.status === 'completed' || (isDelivered && isCodOrWallet) ? 'success' : order.payment?.status === 'failed' ? 'danger' : 'warning';
    let status;
    if (isRestaurantCancelled) status = { tone: 'danger', label: 'Cancelled' };
    else if (paymentFailed) status = { tone: 'danger', label: 'Payment failed' };
    else if (isDelivered) status = { tone: 'success', label: order.orderType === 'takeaway' ? 'Picked up' : 'Delivered' };
    else if (isUserCancelled) status = { tone: 'danger', label: 'Cancelled by you' };
    else if (isCancelled) status = { tone: 'danger', label: 'Cancelled' };
    else if (order.orderType === 'takeaway' && (order.status === 'ready' || order.status === 'ready_for_pickup')) status = { tone: 'primary', label: 'Ready for pickup' };
    else
      status =
        order.status === 'preparing'
          ? { tone: 'warning', label: 'Preparing' }
          : { tone: 'info', label: order.status === 'outForDelivery' ? 'Out for delivery' : order.status === 'placed' ? 'Order placed' : 'Confirmed' };
    const secondary = isRestaurantCancelled ? (
      <View style={{ gap: 2 }}>
        {order.cancellationReason ? (
          <Text style={[type.small, { color: color.danger }]} numberOfLines={2}>
            Reason: {order.cancellationReason}
          </Text>
        ) : null}
        <Text style={[type.caption, { color: color.textMuted }]}>Refund processed in 24-48 hours</Text>
      </View>
    ) : paymentFailed ? (
      <Text style={[type.small, { color: color.danger }]}>Please try ordering again</Text>
    ) : isDelivered && order.restaurantRating && (!order.deliveryPartnerId || order.deliveryPartnerRating) ? (
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <Text style={[type.caption, { color: color.textMuted }]}>Your rating:</Text>
        <StatusBadge tone="gold" icon={Star} label={`Food ${order.restaurantRating}`} />
        {order.deliveryPartnerId && order.deliveryPartnerRating ? <StatusBadge tone="gold" icon={Star} label={`Delivery ${order.deliveryPartnerRating}`} /> : null}
      </View>
    ) : isDelivered ? (
      <Press onPress={() => handleOpenRating(order)} accessibilityRole="button" style={[styles.row, { minHeight: 44 }]}>
        <Star size={16} color={color.goldText} />
        <Text style={[type.label, { color: color.goldText }]}>{order.orderType === 'takeaway' ? 'Rate restaurant' : 'Rate restaurant & delivery'}</Text>
      </Press>
    ) : countdowns[order.id] > 0 ? (
      <View style={styles.row}>
        <Clock size={14} color={color.primary} />
        <Text style={[type.label, { color: color.primary }]}>
          {countdowns[order.id]} min{countdowns[order.id] !== 1 ? 's' : ''} remaining
        </Text>
      </View>
    ) : null;

    return (
      <Card padded={false}>
        <View style={styles.cardTop}>
          <Image source={{ uri: restaurantImage }} style={styles.restImg} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[type.subheading, { color: color.text }]} numberOfLines={2}>
              {order.restaurant}
            </Text>
            <Text style={[type.caption, { color: color.textMuted }]} numberOfLines={1}>
              {location}
            </Text>
            <Text style={[type.caption, { color: color.textMuted }]} numberOfLines={1}>
              Order ID <Text style={{ color: color.textSecondary }}>{order.orderId || order.id}</Text>
            </Text>
            <View style={[styles.row, { flexWrap: 'wrap', marginTop: space.xs }]}>
              <StatusBadge tone={status.tone} label={status.label} />
              {order.orderType === 'takeaway' ? (
                <StatusBadge tone="neutral" icon={ShoppingBag} label="Takeaway (self-pick)" />
              ) : order.orderType === 'dining' ? (
                <StatusBadge tone="neutral" icon={UtensilsCrossed} label="Dining in" />
              ) : null}
            </View>
            {order.deliveryPartnerName ? (
              <Text style={[type.small, { color: color.textSecondary, marginTop: space.xs }]} numberOfLines={2}>
                Delivery: {order.deliveryPartnerName}
                {order.deliveryPartnerPhone ? ` | ${order.deliveryPartnerPhone}` : ''}
              </Text>
            ) : null}
            {order.restaurantId ? (
              <Press scale={0.97} onPress={() => navigateTo(`/user/restaurants/${order.restaurantId}`)} accessibilityRole="link" style={[styles.row, { minHeight: 36, alignSelf: 'flex-start' }]} hitSlop={4}>
                <Text style={[type.label, { color: color.primary }]}>View menu</Text>
                <ChevronRight size={16} color={color.primary} />
              </Press>
            ) : null}
          </View>
          <IconButton
            icon={MoreVertical}
            label="More"
            iconColor={color.textMuted}
            onPress={() => setActiveMenuOrderId((c) => (c === order.id ? null : order.id))}
            style={{ marginTop: -space.sm, marginRight: -space.sm }}
          />
        </View>

        {activeMenuOrderId === order.id ? (
          <View style={styles.menu}>
            <Button title="Share restaurant" icon={Share2} variant="outline" size="sm" fullWidth={false} onPress={() => handleShareRestaurant(order)} style={{ flex: 1 }} />
            <Button title="Order details" icon={FileText} variant="outline" size="sm" fullWidth={false} onPress={() => handleViewOrderDetails(order)} style={{ flex: 1 }} />
          </View>
        ) : null}

        <Divider dashed style={{ marginHorizontal: space.lg }} />

        <View style={{ paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm }}>
          {order.items && order.items.length > 0 ? (
            order.items.map((item, idx) => {
              const total = (item.quantity || 1) * (item.price || 0);
              return (
                <View key={item._id || item.id || item.itemId || idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
                  <VegMark veg={item.isVeg} size={14} style={{ marginTop: 3 }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[type.body, { color: color.text }]}>
                      {item.quantity || 1} × {item.name}
                    </Text>
                    {item.variantName ? <Text style={[type.caption, { color: color.textMuted }]}>{item.variantName}</Text> : null}
                    {item.description ? (
                      <Text style={[type.caption, { color: color.textMuted }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[type.body, { color: color.text }]}>
                    {RUPEE}
                    {total.toFixed(2)}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={[type.small, { color: color.textMuted }]}>No items found</Text>
          )}
        </View>

        <View style={styles.summary}>
          {order.pricing?.discount > 0 ? (
            <View style={styles.sumRow}>
              <Text style={[type.small, { color: color.success }]}>Discount applied</Text>
              <Text style={[type.label, { color: color.success }]}>
                −{RUPEE}
                {order.pricing.discount.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View style={styles.sumRow}>
            <Text style={[type.bodyStrong, { color: color.text }]}>Total bill</Text>
            <Text style={[type.price, { color: color.text }]}>
              {RUPEE}
              {order.total.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            <Text style={[type.caption, { color: color.textMuted }]}>
              {formatDate(order.createdAt)} ·{' '}
              {order.payment?.method === 'cash' || order.payment?.method === 'cod' ? 'Cash on Delivery' : order.payment?.method === 'wallet' ? 'Wallet' : 'Online'}
            </Text>
            {order.payment?.status ? <StatusBadge tone={payTone} label={isDelivered && isCodOrWallet ? 'Paid' : sentence(order.payment.status)} /> : null}
          </View>
        </View>

        <View style={styles.footer}>
          {secondary ? <View style={{ minWidth: 0 }}>{secondary}</View> : null}
          <View style={[styles.row, { justifyContent: 'flex-end' }]}>
            <Button
              title="Details"
              variant="ghost"
              size="sm"
              fullWidth={false}
              iconRight={ChevronRight}
              onPress={() => navigateTo(isDelivered || isCancelled ? `/user/orders/${order.id}/details` : `/user/orders/${order.id}`)}
              accessibilityLabel="View details"
              style={{ height: 44 }}
            />
            {isDelivered && !paymentFailed ? <Button title="Reorder" icon={RotateCcw} size="sm" fullWidth={false} onPress={() => handleReorder(order)} style={{ height: 40 }} /> : null}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.page}>
      <Header goBack={goBack} />
      <FlatList
        data={filteredOrders}
        keyExtractor={(o) => String(o.id)}
        renderItem={renderOrder}
        extraData={[activeMenuOrderId, countdowns]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: bottomPad }}
        initialNumToRender={6}
        windowSize={7}
        ListHeaderComponent={
          <View style={styles.searchWrap}>
            <Search size={20} color={color.textMuted} style={styles.searchIcon} />
            <Field
              placeholder="Search by restaurant or dish"
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search orders by restaurant or dish"
              returnKeyType="search"
              style={{ flex: 1 }}
              inputStyle={{ paddingLeft: 44 }}
            />
          </View>
        }
        ListEmptyComponent={<EmptyState icon={Search} title="No orders found matching your search" />}
        ListFooterComponent={
          <Text style={styles.brand} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            DIMA HASAO FOOD
          </Text>
        }
      />

      <Dialog visible={ratingModal.open && !!ratingModal.order} onClose={handleCloseRating} backdrop={color.overlay} blur={8} panelStyle={styles.dialog}>
        <View style={styles.rateHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.titleSerif, { color: color.goldOnDark }]} accessibilityRole="header">
              Rate your order
            </Text>
            <Text style={[type.small, { color: color.textOnDarkMuted }]} numberOfLines={1}>
              {ratingModal.order?.restaurant}
            </Text>
          </View>
          <IconButton icon={X} label="Close" variant="inverse" onPress={handleCloseRating} />
        </View>
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: space.xl, gap: space.md }} keyboardShouldPersistTaps="handled">
          <Text style={[type.label, { color: color.text }]}>Restaurant rating (out of 5)</Text>
          <Stars value={restRating} setValue={setRestRating} label="Restaurant rating" />
          <Field multiline value={restText} onChangeText={setRestText} placeholder="Restaurant feedback (optional)" accessibilityLabel="Restaurant feedback" inputStyle={{ minHeight: 72 }} />
          {modalHasDelivery ? (
            <>
              <Text style={[type.label, { color: color.text, marginTop: space.md }]}>Delivery partner rating (out of 5)</Text>
              <Stars value={delRating} setValue={setDelRating} label="Delivery partner rating" />
              <Field multiline value={delText} onChangeText={setDelText} placeholder="Delivery partner feedback (optional)" accessibilityLabel="Delivery partner feedback" inputStyle={{ minHeight: 72 }} />
            </>
          ) : null}
          <Button title={submitting ? 'Submitting...' : 'Submit ratings'} icon={submitting ? undefined : Star} size="lg" loading={submitting} disabled={submitDisabled} onPress={handleSubmitRating} style={{ marginTop: space.md }} />
          {submitDisabled ? <Text style={[type.caption, { color: color.textMuted, textAlign: 'center' }]}>Please select all required ratings to continue</Text> : null}
        </ScrollView>
      </Dialog>

      <Dialog visible={showShareModal && !!sharePayload} onClose={() => setShowShareModal(false)} backdrop={color.overlay} blur={8} panelStyle={styles.dialog}>
        <View style={styles.shareHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
              Share restaurant
            </Text>
            <Text style={[type.small, { color: color.textMuted }]}>Choose an app to share this restaurant</Text>
          </View>
          <IconButton icon={X} label="Close share modal" onPress={() => setShowShareModal(false)} />
        </View>
        <View style={{ padding: space.lg, gap: space.md }}>
          <Button
            title="Share via apps"
            icon={Share2}
            onPress={async () => {
              if (!sharePayload) return;
              if (await tryNativeShare(sharePayload)) {
                setShowShareModal(false);
                toast.success('Shared successfully');
              }
            }}
          />
          <View style={styles.grid}>
            {SHARE_TARGETS.map(([key, label, Icon]) => (
              <Press key={key} scale={0.97} onPress={() => openShareTarget(key)} accessibilityLabel={label} style={styles.gridItem}>
                <Icon size={20} color={color.primary} />
                <Text style={[type.caption, { color: color.text }]}>{label}</Text>
              </Press>
            ))}
            <Press scale={0.97} onPress={copyShareLink} accessibilityLabel="Copy link" style={styles.gridItem}>
              <Copy size={20} color={color.primary} />
              <Text style={[type.caption, { color: color.text }]}>Copy link</Text>
            </Press>
          </View>
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.xs, minHeight: 56, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: space.xs },
  searchIcon: { position: 'absolute', left: space.md + 2, zIndex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg, paddingBottom: space.md },
  restImg: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  menu: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md },
  summary: { marginHorizontal: space.md, marginBottom: space.md, padding: space.md, backgroundColor: color.surfaceMuted, borderRadius: radii.md, gap: space.xs },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  footer: { gap: space.xs, paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: color.border },
  brand: { ...type.heroSerif, color: color.borderStrong, textAlign: 'center', marginTop: space.xxl },
  dialog: { width: '100%', maxWidth: 448, borderRadius: radii.xl, backgroundColor: color.surface, overflow: 'hidden', ...elevation.sheet },
  rateHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.primaryDeep, paddingLeft: space.xl, paddingRight: space.sm, paddingVertical: space.lg },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: space.xs },
  star: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  shareHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderBottomWidth: 1, borderBottomColor: color.border, paddingLeft: space.xl, paddingRight: space.sm, paddingVertical: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  gridItem: { width: '30%', flexGrow: 1, minHeight: 72, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, padding: space.md, alignItems: 'center', justifyContent: 'center', gap: space.xs },
});
