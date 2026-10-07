import { useRef } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { NAV_CLEARANCE, isImmersiveRoute } from '../../components/dh/AppBottomNav';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, CreditCard, FileText, HelpCircle, Mail, MapPin, MessageCircle, Package, Phone, RefreshCw, Truck, XCircle } from 'lucide-react-native';
import { Button, EmptyState, IconButton, SectionHeader, StatusBadge } from '../../components/ds';
import usePlatformSettings from '../../shared/hooks/usePlatformSettings';
import { useOrders } from '../context/OrdersContext';
import { useParams, navigateTo } from '../../lib/webRouter';
import { alert } from '../../lib/webShim';
import { color, radii, space, type } from '../../theme';
import { Card, HelpPage, HelpRow, helpText } from '../components/helpUi';

const commonIssues = [
  { id: 'late-delivery', title: 'Order is Late', icon: Clock, description: "Your order hasn't arrived within the estimated time",
    solutions: ['Check the order tracking page for real-time updates', 'Contact the delivery driver if contact information is available', 'Wait an additional 15-20 minutes as delays can occur', 'Contact support if the order is more than 30 minutes late'],
    actions: [{ label: 'Track Order', path: 'track' }, { label: 'Contact Support', path: 'support' }] },
  { id: 'missing-items', title: 'Missing Items', icon: Package, description: 'Some items from your order are missing',
    solutions: ['Check your order receipt to verify what was ordered', 'Check if items were delivered separately', 'Contact support immediately with your order number', 'Take photos if possible to help with the investigation'],
    actions: [{ label: 'View Invoice', path: 'invoice' }, { label: 'Report Issue', path: 'support' }] },
  { id: 'wrong-order', title: 'Wrong Order Received', icon: XCircle, description: 'You received items different from what you ordered',
    solutions: ["Keep the incorrect order - you won't be charged for it", 'Contact support immediately with your order number', "We'll arrange a replacement or full refund", 'You may be eligible for a discount on your next order'],
    actions: [{ label: 'View Order Details', path: 'track' }, { label: 'Report Issue', path: 'support' }] },
  { id: 'quality-issue', title: 'Quality Issue', icon: AlertCircle, description: "Food quality doesn't meet expectations",
    solutions: ['Contact support within 24 hours of delivery', 'Describe the issue in detail', 'Take photos if possible', "We'll process a full refund or replacement"],
    actions: [{ label: 'Report Issue', path: 'support' }, { label: 'Request Refund', path: 'refund' }] },
  { id: 'payment-issue', title: 'Payment Problem', icon: CreditCard, description: 'Issues with payment or billing',
    solutions: ['Check your payment method in your profile', 'Verify the charge on your bank statement', 'Contact support if you were charged incorrectly', "We'll investigate and process a refund if needed"],
    actions: [{ label: 'View Invoice', path: 'invoice' }, { label: 'Contact Support', path: 'support' }] },
  { id: 'cancel-order', title: 'Cancel Order', icon: RefreshCw, description: 'Need to cancel your order',
    solutions: ['Orders can be cancelled within 5 minutes of placement', 'After 5 minutes, contact support for cancellation', 'If the order is already being prepared, cancellation may not be possible', 'Refunds are processed automatically for cancelled orders'],
    actions: [{ label: 'Contact Support', path: 'support' }, { label: 'View Order', path: 'track' }] },
];

const formatDate = (s) => {
  if (!s) return 'N/A';
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const statusLabel = (s) => ({ placed: 'Order Placed', confirmed: 'Confirmed', preparing: 'Preparing', outForDelivery: 'Out for Delivery', delivered: 'Delivered' })[s] || s;

export default function OrderHelp() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const bottomPad = (isImmersiveRoute(pathname) ? 0 : NAV_CLEARANCE) + insets.bottom + space.xxl;
  const platform = usePlatformSettings();
  const { orderId } = useParams();
  const { getOrderById } = useOrders();
  const order = getOrderById(orderId);
  const scrollRef = useRef(null);
  const supportY = useRef(0);
  const scrollToSupport = () => scrollRef.current?.scrollTo({ y: supportY.current, animated: true });

  const handleAction = (action) => {
    if (action === 'track') navigateTo(`/user/orders/${orderId}`);
    else if (action === 'invoice') navigateTo(`/user/orders/${orderId}/invoice`);
    else if (action === 'support') scrollToSupport();
    else if (action === 'refund') alert('Refund request would be processed here. Contact support for assistance.');
  };

  if (!order) {
    return (
      <HelpPage>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
          <Card>
            <EmptyState icon={AlertCircle} title="Order not found" message={`We couldn't find an order with ID: ${orderId}`} />
            <View style={{ flexDirection: 'row', gap: space.md, padding: space.lg, paddingTop: 0 }}>
              <Button title="All orders" variant="outline" onPress={() => navigateTo('/user/orders')} style={{ flex: 1 }} />
              <Button title="Help centre" onPress={() => navigateTo('/user/help')} style={{ flex: 1 }} />
            </View>
          </Card>
        </ScrollView>
      </HelpPage>
    );
  }

  const field = (label, value, extra) => (
    <View style={styles.field}>
      <Text style={[type.small, { color: color.textMuted }]}>{label}</Text>
      <Text style={[type.bodyStrong, { color: color.text, textAlign: 'right', flexShrink: 1 }, extra]}>{value}</Text>
    </View>
  );
  const statusTone = { placed: 'info', confirmed: 'info', preparing: 'warning', outForDelivery: 'info', delivered: 'success' }[order.status] || (String(order.status).includes('cancel') ? 'danger' : 'neutral');

  return (
    <HelpPage>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Back" onPress={() => navigateTo('/user/help')} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
            Order help
          </Text>
          <Text style={[type.small, { color: color.textMuted }]} numberOfLines={1}>
            Order {order.id}
          </Text>
        </View>
      </View>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: bottomPad }}>
        <Card style={{ padding: space.lg, gap: space.md }}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <View style={styles.row}>
              <Package size={20} color={color.primary} />
              <Text style={[type.subheading, { color: color.text }]}>Order summary</Text>
            </View>
            <StatusBadge tone={statusTone} label={statusLabel(order.status)} />
          </View>
          {field('Order ID', order.id)}
          {field('Placed on', formatDate(order.createdAt))}
          {field('Items', `${order.items?.length || 0} items`)}
          {field('Total amount', `₹${order.total.toFixed(2)}`, type.price)}
          {order.address ? (
            <View style={[styles.row, { alignItems: 'flex-start', paddingTop: space.md, borderTopWidth: 1, borderTopColor: color.border }]}>
              <MapPin size={18} color={color.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.caption, { color: color.textMuted }]}>Delivery address</Text>
                <Text style={[type.small, { color: color.text }]}>
                  {order.address.street}
                  {order.address.additionalDetails && `, ${order.address.additionalDetails}`}
                  {'\n'}
                  {order.address.city}, {order.address.state} {order.address.zipCode}
                </Text>
              </View>
            </View>
          ) : null}
        </Card>

        <SectionHeader title="What can we help with?" style={{ marginTop: space.lg, marginBottom: 0 }} />
        {commonIssues.map((issue) => {
          const Icon = issue.icon;
          return (
            <Card key={issue.id} style={{ padding: space.lg, gap: space.md }}>
              <View style={[styles.row, { alignItems: 'flex-start', gap: space.md }]}>
                <View style={styles.iconTile}>
                  <Icon size={20} color={color.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.subheading, { color: color.text }]}>{issue.title}</Text>
                  <Text style={helpText.muted}>{issue.description}</Text>
                </View>
              </View>
              <Text style={[type.label, { color: color.text }]}>What to do</Text>
              {issue.solutions.map((sol, i) => (
                <View key={i} style={[styles.row, { alignItems: 'flex-start' }]}>
                  <CheckCircle size={16} color={color.success} style={{ marginTop: 2 }} />
                  <Text style={[type.small, { color: color.textSecondary, flex: 1 }]}>{sol}</Text>
                </View>
              ))}
              <View style={styles.actions}>
                {issue.actions.map((a, idx) => (
                  <Button key={idx} title={a.label} size="sm" variant={idx === 0 ? 'secondary' : 'outline'} fullWidth={false} onPress={() => handleAction(a.path)} style={{ flexGrow: 1, height: 44 }} />
                ))}
              </View>
            </Card>
          );
        })}

        <SectionHeader title="Quick actions" style={{ marginTop: space.lg, marginBottom: 0 }} />
        <Card style={{ overflow: 'hidden' }}>
          {[
            [Truck, 'Track order', 'View real-time status', () => navigateTo(`/user/orders/${orderId}`)],
            [FileText, 'View invoice', 'Download receipt', () => navigateTo(`/user/orders/${orderId}/invoice`)],
            [MessageCircle, 'Contact support', 'Get help now', scrollToSupport],
          ].map(([Icon, t, sub, fn], i) => (
            <HelpRow key={t} icon={Icon} title={t} subtitle={sub} onPress={fn} last={i === 2} />
          ))}
        </Card>

        <View
          onLayout={(e) => {
            supportY.current = e.nativeEvent.layout.y;
          }}
        >
          <Card gold style={{ padding: space.lg, gap: space.md, marginTop: space.lg }}>
            <View style={{ gap: space.xs }}>
              <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
                Contact support for this order
              </Text>
              <Text style={[type.small, { color: color.textSecondary }]}>Our support team is ready to help you with order {order.id}</Text>
            </View>
            <Card style={{ overflow: 'hidden' }}>
              <HelpRow icon={Phone} title="Phone support" subtitle={`Mention order ${order.id} · +1 (800) 123-4567`} onPress={() => Linking.openURL('tel:+1-800-123-4567').catch(() => {})} />
              <HelpRow
                icon={Mail}
                title="Email support"
                subtitle={platform.supportEmail ? `Include order ${order.id} in subject · ${platform.supportEmail}` : `Include order ${order.id} in subject · Not configured yet`}
                onPress={platform.supportEmail ? () => Linking.openURL(`mailto:${platform.supportEmail}?subject=${encodeURIComponent(`Help with Order ${order.id}`)}`).catch(() => {}) : undefined}
                last
              />
            </Card>
            <Button title="Start live chat" icon={MessageCircle} onPress={() => alert('Live chat would open here with order context')} />
          </Card>
        </View>

        <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.sm }}>
          <Button title="All orders" icon={ArrowLeft} variant="outline" onPress={() => navigateTo('/user/orders')} style={{ flex: 1 }} />
          <Button title="Help centre" icon={HelpCircle} variant="outline" onPress={() => navigateTo('/user/help')} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </HelpPage>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.xs, minHeight: 56, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  field: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  iconTile: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: space.sm, paddingTop: space.md, borderTopWidth: 1, borderTopColor: color.border, flexWrap: 'wrap' },
});
