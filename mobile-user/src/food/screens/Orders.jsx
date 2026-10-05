import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeft, ChevronRight, Clock, Copy, Link2, Mail, MessageCircle, MessagesSquare, MoreVertical, RotateCcw, Search, Send, Share2, Star, X } from 'lucide-react-native';
import Image from '../../components/Img';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { orderAPI } from '../../api/food';
import { API_ORIGIN } from '../../api/client';
import { useCart } from '../context/CartContext';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { getCompanyNameAsync } from '../utils/businessSettings';
import { navigateTo } from '../../lib/webRouter';
import { navigator } from '../../lib/webShim';
import { toast } from '../../lib/notify';
import { localStore } from '../../lib/storage';
import { poppins, shadow, tw } from '../../theme';
import { F } from '../components/shell';

const GREEN = '#0a4d2b';
const DARK_GREEN = '#06381e';
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

const BADGE = {
  red: { bg: tw.red50, color: tw.red700, border: tw.red200 },
  amber: { bg: tw.amber50, color: tw.amber700, border: tw.amber200 },
  emerald: { bg: tw.emerald50, color: tw.emerald700, border: tw.emerald200 },
};

function Header({ goBack }) {
  return (
    <View style={styles.header}>
      <Press scale={0.9} onPress={goBack} accessibilityLabel="Back" hitSlop={8}>
        <ArrowLeft size={24} color={tw.gray700} />
      </Press>
      <Text style={styles.headerTitle}>Your Orders</Text>
    </View>
  );
}

function VegMark({ veg }) {
  const c = veg ? tw.green600 : tw.red600;
  return (
    <View style={[styles.veg, { borderColor: c }]}>
      <View style={{ flex: 1, borderRadius: 999, backgroundColor: c }} />
    </View>
  );
}

function Stars({ value, setValue, size = 40 }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (value || 0) >= n;
        return (
          <Press key={n} scale={0.9} onPress={() => setValue(n)} style={{ padding: 8 }} accessibilityLabel={`${n} star`}>
            <Star size={size} color={active ? tw.yellow400 : tw.gray300} fill={active ? tw.yellow400 : 'transparent'} />
          </Press>
        );
      })}
    </View>
  );
}

const SHARE_TARGETS = [
  ['whatsapp', 'WhatsApp', MessageCircle, tw.green600],
  ['telegram', 'Telegram', Send, tw.sky500],
  ['email', 'Email', Mail, tw.rose500],
  ['sms', 'SMS', MessagesSquare, tw.violet500],
  ['facebook', 'Facebook', Share2, tw.blue600],
  ['x', 'X', Link2, tw.gray900],
  ['linkedin', 'LinkedIn', Share2, tw.blue700],
];

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

  if (loading) {
    return (
      <View style={styles.page}>
        <Header goBack={goBack} />
        <View style={{ paddingVertical: 80, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.page}>
        <Header goBack={goBack} />
        <View style={{ paddingHorizontal: 16, paddingVertical: 32, alignItems: 'center' }}>
          <Text style={styles.emptyText}>You haven&apos;t placed any orders yet</Text>
          <Press onPress={() => navigateTo('/user')} style={{ marginTop: 16 }}>
            <Text style={[styles.link, poppins(500)]}>Start Ordering</Text>
          </Press>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }} stickyHeaderIndices={[0]}>
        <Header goBack={goBack} />
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Search size={20} color={GREEN} />
            <TextInput
              placeholder="Search by restaurant or dish"
              placeholderTextColor={tw.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 16 }}>
          {filteredOrders.length === 0 ? (
            <View style={[styles.card, { padding: 32, alignItems: 'center' }]}>
              <Text style={styles.emptyText}>No orders found matching your search</Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const m = order.payment?.method;
              const isCodOrWallet = ['cash', 'cod', 'wallet'].includes(m) || ['cash', 'cod', 'wallet'].includes(order.paymentMethod);
              const isCancelled = order.status === 'cancelled' || order.status === 'restaurant_cancelled';
              const paymentFailed = !isCodOrWallet && !isCancelled && order.payment?.status === 'failed';
              const isDelivered = order.status === 'delivered';
              const isRestaurantCancelled = order.isRestaurantCancelled || order.status === 'restaurant_cancelled';
              const isUserCancelled = order.isUserCancelled || (isCancelled && order.cancelledBy === 'user');
              const restaurantImage = order.restaurantImage || order.items?.[0]?.image || FALLBACK_REST;
              const location = order.restaurantLocation || `${order.address?.city || ''}, ${order.address?.state || ''}`.trim() || 'Location not available';
              const payBadge =
                order.payment?.status === 'completed' || (isDelivered && isCodOrWallet) ? BADGE.emerald : order.payment?.status === 'failed' ? BADGE.red : BADGE.amber;
              const tag = (bg, color, border, label, extra) => (
                <View style={[styles.statusBadge, { backgroundColor: bg, borderColor: border }]}>
                  <Text style={[styles.statusText, { color }, extra]}>{label}</Text>
                </View>
              );
              let statusNode;
              if (isRestaurantCancelled) statusNode = tag(tw.red50, tw.red700, tw.red200, 'CANCELLED');
              else if (paymentFailed) statusNode = tag(tw.red50, tw.red700, tw.red200, 'PAYMENT FAILED');
              else if (isDelivered) statusNode = tag(tw.green600, '#fff', tw.green600, order.orderType === 'takeaway' ? 'PICKED UP' : 'DELIVERED');
              else if (isUserCancelled) statusNode = tag(tw.red50, tw.red700, tw.red200, 'CANCELLED BY YOU');
              else if (isCancelled) statusNode = tag(tw.red50, tw.red700, tw.red200, 'CANCELLED');
              else if (order.orderType === 'takeaway' && (order.status === 'ready' || order.status === 'ready_for_pickup'))
                statusNode = tag(tw.green600, '#fff', tw.green600, 'READY FOR PICKUP');
              else
                statusNode = tag(
                  tw.amber50,
                  tw.amber700,
                  tw.amber200,
                  (order.status === 'preparing' ? 'Preparing' : order.status === 'outForDelivery' ? 'Out for Delivery' : order.status === 'placed' ? 'Order Placed' : 'Confirmed').toUpperCase(),
                );
              const secondary = isRestaurantCancelled ? (
                <View style={{ gap: 2 }}>
                  {order.cancellationReason ? <Text style={styles.reason} numberOfLines={1}>Reason: {order.cancellationReason}</Text> : null}
                  <Text style={styles.refund}>Refund processed in 24-48 hours</Text>
                </View>
              ) : paymentFailed ? (
                <Text style={[styles.reason, { fontStyle: 'normal' }]}>Please try ordering again</Text>
              ) : isDelivered && order.restaurantRating && (!order.deliveryPartnerId || order.deliveryPartnerRating) ? (
                <View style={styles.row}>
                  <Text style={styles.small}>Your rating:</Text>
                  <View style={styles.ratePill}>
                    <Text style={styles.rateText}>Food {order.restaurantRating}</Text>
                    <Star size={10} color="#fff" fill="#fff" />
                  </View>
                  {order.deliveryPartnerId && order.deliveryPartnerRating ? (
                    <View style={styles.ratePill}>
                      <Text style={styles.rateText}>Delivery {order.deliveryPartnerRating}</Text>
                      <Star size={10} color="#fff" fill="#fff" />
                    </View>
                  ) : null}
                </View>
              ) : isDelivered ? (
                <Press onPress={() => handleOpenRating(order)} style={styles.row}>
                  <Star size={14} color={tw.slate400} />
                  <Text style={[styles.rateLink, poppins(700)]}>{order.orderType === 'takeaway' ? 'Rate Restaurant' : 'Rate Restaurant & Delivery'}</Text>
                </Press>
              ) : countdowns[order.id] > 0 ? (
                <View style={styles.row}>
                  <Clock size={12} color={GREEN} />
                  <Text style={[styles.countdown, poppins(600)]}>
                    {countdowns[order.id]} min{countdowns[order.id] !== 1 ? 's' : ''} remaining
                  </Text>
                </View>
              ) : null;

              return (
                <View key={order.id} style={[styles.card, { overflow: 'visible' }]}>
                  <View style={styles.cardTop}>
                    <View style={{ flexDirection: 'row', gap: 12, flex: 1, minWidth: 0 }}>
                      <Image source={{ uri: restaurantImage }} style={styles.restImg} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.nameRow}>
                          <Text style={styles.restName} numberOfLines={1}>{order.restaurant}</Text>
                          {order.orderType === 'takeaway' ? (
                            <View style={[styles.typeBadge, { backgroundColor: '#FEF3C7', borderColor: 'rgba(245,158,11,0.3)' }]}>
                              <Text style={[styles.typeText, { color: '#D97706' }]}>🥡 TAKEAWAY (SELF-PICK)</Text>
                            </View>
                          ) : order.orderType === 'dining' ? (
                            <View style={[styles.typeBadge, { backgroundColor: '#DBEAFE', borderColor: 'rgba(59,130,246,0.3)' }]}>
                              <Text style={[styles.typeText, { color: '#2563EB' }]}>🍽️ DINING IN</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.orderIdText}>
                          Order ID: <Text style={[{ color: tw.gray700 }, poppins(600)]}>{order.orderId || order.id}</Text>
                        </Text>
                        <Text style={styles.locText} numberOfLines={1}>{location}</Text>
                        {order.deliveryPartnerName ? (
                          <Text style={styles.delivery}>
                            <Text style={poppins(500)}>Delivery:</Text> {order.deliveryPartnerName}
                            {order.deliveryPartnerPhone ? ` | ${order.deliveryPartnerPhone}` : ''}
                          </Text>
                        ) : null}
                        {order.restaurantId ? (
                          <Press scale={0.97} onPress={() => navigateTo(`/user/restaurants/${order.restaurantId}`)} style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                            <Text style={[styles.viewMenu, poppins(500)]}>View menu {'>'}</Text>
                          </Press>
                        ) : null}
                      </View>
                    </View>
                    <Press scale={0.9} onPress={() => setActiveMenuOrderId((c) => (c === order.id ? null : order.id))} style={{ padding: 4 }} accessibilityLabel="More">
                      <MoreVertical size={20} color={tw.gray400} />
                    </Press>
                  </View>

                  {activeMenuOrderId === order.id ? (
                    <View style={styles.menu}>
                      <Press scale={0.98} onPress={() => handleShareRestaurant(order)} style={styles.menuItem}>
                        <Text style={styles.menuText}>Share restaurant</Text>
                      </Press>
                      <Press scale={0.98} onPress={() => handleViewOrderDetails(order)} style={styles.menuItem}>
                        <Text style={styles.menuText}>Order details</Text>
                      </Press>
                    </View>
                  ) : null}

                  <View style={styles.dashed} />

                  <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => {
                        const total = (item.quantity || 1) * (item.price || 0);
                        return (
                          <View key={item._id || item.id || item.itemId || idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                            <VegMark veg={item.isVeg} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.itemName}>{item.quantity || 1} x {item.name}</Text>
                              {item.variantName ? <Text style={styles.itemSub}>{item.variantName}</Text> : null}
                              {item.description ? <Text style={styles.itemSub} numberOfLines={1}>{item.description}</Text> : null}
                            </View>
                            <Text style={styles.itemPrice}>{RUPEE}{total.toFixed(2)}</Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={{ fontSize: 14, color: tw.gray500, ...poppins(400) }}>No items found</Text>
                    )}
                  </View>

                  <View style={styles.summary}>
                    {order.pricing?.discount > 0 ? (
                      <View style={styles.sumRow}>
                        <Text style={{ color: tw.green600, fontSize: 11, ...poppins(400) }}>Discount Applied</Text>
                        <Text style={{ color: tw.green600, fontSize: 11, ...poppins(500) }}>-{RUPEE}{order.pricing.discount.toFixed(2)}</Text>
                      </View>
                    ) : null}
                    <View style={styles.sumRow}>
                      <Text style={{ fontSize: 12, color: tw.gray800, ...poppins(600) }}>Total Bill</Text>
                      <Text style={{ fontSize: 16, color: tw.gray900, ...poppins(700) }}>{RUPEE}{order.total.toFixed(2)}</Text>
                    </View>
                  </View>

                  <View style={styles.sep} />

                  <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, gap: 12 }}>
                    <View style={{ gap: 12 }}>
                      <View style={[styles.row, { flexWrap: 'wrap', gap: 8 }]}>
                        <View style={styles.placed}>
                          <Text style={styles.placedText}>Placed: {formatDate(order.createdAt)}</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: tw.gray700, ...poppins(600) }}>
                          {order.payment?.method === 'cash' || order.payment?.method === 'cod' ? 'Cash on Delivery' : order.payment?.method === 'wallet' ? 'Wallet' : 'Online'}
                        </Text>
                        {order.payment?.status ? (
                          <View style={[styles.payBadge, { backgroundColor: payBadge.bg, borderColor: payBadge.border }]}>
                            <Text style={[styles.payBadgeText, { color: payBadge.color }]}>{isDelivered && isCodOrWallet ? 'PAID' : String(order.payment.status).toUpperCase()}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: 'row' }}>{statusNode}</View>
                    </View>

                    <View style={[styles.row, { justifyContent: 'space-between', paddingTop: 4 }]}>
                      <View style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>{secondary}</View>
                      <View style={[styles.row, { gap: 12, flexShrink: 0 }]}>
                        <Press scale={0.97} onPress={() => navigateTo(isDelivered || isCancelled ? `/user/orders/${order.id}/details` : `/user/orders/${order.id}`)} style={styles.row}>
                          <Text style={{ fontSize: 12, color: tw.gray600, ...poppins(700) }}>View Details</Text>
                          <ChevronRight size={14} color={tw.gray600} />
                        </Press>
                        {isDelivered && !paymentFailed ? (
                          <Press onPress={() => handleReorder(order)} style={styles.reorder}>
                            <RotateCcw size={12} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 12, ...poppins(700) }}>Reorder</Text>
                          </Press>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 16 }}>
          <Text style={styles.brand}>DIMA HASAO FOOD</Text>
        </View>
      </ScrollView>

      <Dialog visible={ratingModal.open && !!ratingModal.order} onClose={handleCloseRating} backdrop="rgba(0,0,0,0.6)" blur={8} panelStyle={styles.rateDialog}>
        <LinearGradient colors={[GREEN, DARK_GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingHorizontal: 24, paddingVertical: 20 }}>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
            <View style={styles.row}>
              <Star size={20} color="#fff" fill="#fff" />
              <Text style={{ fontSize: 20, color: '#fff', ...poppins(700) }}>Rate Your Delivery</Text>
            </View>
            <Press scale={0.9} onPress={handleCloseRating} hitSlop={8}>
              <X size={20} color="rgba(255,255,255,0.8)" />
            </Press>
          </View>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', ...poppins(400) }}>{ratingModal.order?.restaurant}</Text>
        </LinearGradient>
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.rateLabel}>Restaurant rating (out of 5)</Text>
          <Stars value={restRating} setValue={setRestRating} />
          <TextInput multiline numberOfLines={2} value={restText} onChangeText={setRestText} placeholder="Restaurant feedback (optional)" placeholderTextColor={tw.gray400} style={styles.textarea} textAlignVertical="top" />
          {modalHasDelivery ? (
            <View style={{ marginTop: 24 }}>
              <Text style={styles.rateLabel}>Delivery partner rating (out of 5)</Text>
              <Stars value={delRating} setValue={setDelRating} />
              <TextInput multiline numberOfLines={2} value={delText} onChangeText={setDelText} placeholder="Delivery partner feedback (optional)" placeholderTextColor={tw.gray400} style={styles.textarea} textAlignVertical="top" />
            </View>
          ) : null}
          <Press onPress={handleSubmitRating} disabled={submitDisabled} style={[{ marginTop: 24, opacity: submitDisabled ? 0.5 : 1 }, shadow('0 10px 15px -3px rgba(10,77,43,0.3)')]}>
            <LinearGradient colors={[GREEN, DARK_GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.submitText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <Star size={20} color="#fff" fill="#fff" />
                  <Text style={styles.submitText}>Submit Ratings</Text>
                </>
              )}
            </LinearGradient>
          </Press>
          {submitDisabled ? <Text style={{ fontSize: 12, color: tw.red500, textAlign: 'center', marginTop: 8, ...poppins(400) }}>Please select all required ratings to continue</Text> : null}
        </ScrollView>
      </Dialog>

      <Dialog visible={showShareModal && !!sharePayload} onClose={() => setShowShareModal(false)} backdrop="rgba(0,0,0,0.5)" blur={8} panelStyle={styles.shareDialog}>
        <View style={styles.shareHead}>
          <View>
            <Text style={{ fontSize: 16, color: tw.gray900, ...poppins(600) }}>Share restaurant</Text>
            <Text style={{ fontSize: 12, color: tw.gray500, marginTop: 2, ...poppins(400) }}>Choose an app to share this restaurant</Text>
          </View>
          <Press scale={0.9} onPress={() => setShowShareModal(false)} accessibilityLabel="Close share modal" style={{ padding: 8 }}>
            <X size={16} color={tw.gray500} />
          </Press>
        </View>
        <View style={{ padding: 20, gap: 12 }}>
          <Press onPress={async () => {
            if (!sharePayload) return;
            if (await tryNativeShare(sharePayload)) {
              setShowShareModal(false);
              toast.success('Shared successfully');
            }
          }} style={styles.systemShare}>
            <Share2 size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 14, ...poppins(600) }}>Share via apps</Text>
          </Press>
          <View style={styles.grid}>
            {SHARE_TARGETS.map(([key, label, Icon, color]) => (
              <Press key={key} scale={0.97} onPress={() => openShareTarget(key)} style={styles.gridItem}>
                <Icon size={20} color={color} />
                <Text style={styles.gridText}>{label}</Text>
              </Press>
            ))}
            <Press scale={0.97} onPress={copyShareLink} style={styles.gridItem}>
              <Copy size={20} color={tw.gray600} />
              <Text style={styles.gridText}>Copy link</Text>
            </Press>
          </View>
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tw.gray50 },
  header: { backgroundColor: '#fff', padding: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: tw.gray200, ...shadow('xs') },
  headerTitle: { marginLeft: 16, fontSize: 20, color: tw.gray800, ...poppins(600) },
  searchWrap: { padding: 16, backgroundColor: '#fff', marginTop: 4, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, ...shadow('xs') },
  searchInput: { flex: 1, marginLeft: 12, padding: 0, fontSize: 16, color: tw.gray600, ...poppins(400) },
  emptyText: { fontSize: 16, color: tw.gray600, ...poppins(400) },
  link: { color: GREEN, fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray100, overflow: 'hidden', ...shadow('xs') },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  restImg: { width: 48, height: 48, borderRadius: 8, backgroundColor: tw.gray200 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  restName: { fontSize: 16, color: tw.gray800, lineHeight: 20, flexShrink: 1, ...poppins(600) },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  typeText: { fontSize: 9, letterSpacing: 0.9, ...poppins(800) },
  orderIdText: { fontSize: 10, color: tw.gray500, marginTop: 2, ...poppins(400) },
  locText: { fontSize: 11, color: tw.gray500, marginTop: 2, ...poppins(400) },
  delivery: { fontSize: 12, color: tw.gray600, marginTop: 4, ...poppins(400) },
  viewMenu: { fontSize: 12, color: GREEN },
  menu: { position: 'absolute', right: 12, top: 40, width: 160, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray100, paddingVertical: 4, zIndex: 20, elevation: 8, ...shadow('lg') },
  menuItem: { paddingHorizontal: 12, paddingVertical: 8 },
  menuText: { fontSize: 12, color: tw.gray800, ...poppins(400) },
  dashed: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200, marginHorizontal: 16, marginVertical: 4 },
  veg: { width: 16, height: 16, borderWidth: 1, padding: 2, marginTop: 2 },
  itemName: { fontSize: 14, color: tw.gray800, ...poppins(500) },
  itemSub: { fontSize: 12, color: tw.gray500, marginTop: 2, ...poppins(400) },
  itemPrice: { fontSize: 12, color: tw.gray800, ...poppins(600) },
  summary: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: tw.gray50, borderRadius: 8, marginHorizontal: 12, marginBottom: 8, gap: 4 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sep: { borderTopWidth: 1, borderColor: tw.gray100, marginHorizontal: 16, marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  placed: { backgroundColor: tw.gray100, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(229,231,235,0.5)' },
  placedText: { fontSize: 12, color: tw.gray700, ...poppins(600) },
  payBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  payBadgeText: { fontSize: 10, letterSpacing: 0.5, ...poppins(700) },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusText: { fontSize: 10, letterSpacing: 0.6, ...poppins(800) },
  reason: { fontSize: 12, color: tw.red500, fontStyle: 'italic', ...poppins(500) },
  refund: { fontSize: 10, color: tw.gray400, ...poppins(400) },
  small: { fontSize: 12, color: tw.gray500, ...poppins(400) },
  ratePill: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: tw.green600, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  rateText: { fontSize: 10, color: '#fff', ...poppins(700) },
  rateLink: { fontSize: 12, color: tw.slate500 },
  countdown: { fontSize: 12, color: GREEN },
  reorder: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GREEN, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, ...shadow('xs') },
  brand: { fontSize: 36, color: tw.gray200, fontStyle: 'italic', letterSpacing: -1.8, ...poppins(800) },
  rateDialog: { width: '100%', maxWidth: 448, borderRadius: 24, backgroundColor: '#fff', overflow: 'hidden', ...shadow('2xl') },
  rateLabel: { fontSize: 14, color: tw.gray900, marginBottom: 12, ...poppins(600) },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  textarea: { minHeight: 64, borderRadius: 12, borderWidth: 2, borderColor: tw.gray200, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, color: tw.gray800, ...poppins(400) },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  submitText: { color: '#fff', fontSize: 16, ...poppins(700) },
  shareDialog: { width: '100%', maxWidth: 384, borderRadius: 24, backgroundColor: '#fff', overflow: 'hidden', ...shadow('2xl') },
  shareHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: tw.gray100, paddingHorizontal: 20, paddingVertical: 16 },
  systemShare: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: GREEN, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '30.5%', flexGrow: 1, borderRadius: 16, borderWidth: 1, borderColor: tw.gray200, paddingHorizontal: 12, paddingVertical: 16, alignItems: 'center', gap: 8 },
  gridText: { fontSize: 12, color: tw.gray700, ...poppins(500) },
});
