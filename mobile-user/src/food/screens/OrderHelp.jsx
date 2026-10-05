import { useRef } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, CreditCard, FileText, HelpCircle, Mail, MapPin, MessageCircle, Package, Phone, RefreshCw, Truck, XCircle } from 'lucide-react-native';
import { Press } from '../../components/ui';
import usePlatformSettings from '../../shared/hooks/usePlatformSettings';
import { useOrders } from '../context/OrdersContext';
import { useParams, navigateTo } from '../../lib/webRouter';
import { alert } from '../../lib/webShim';
import { poppins, tw } from '../../theme';
import { Card, HELP, HelpButton, HelpPage, helpText } from '../components/helpUi';

const GREEN = '#0a4d2b';
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
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Card>
            <View style={{ paddingVertical: 48, alignItems: 'center', paddingHorizontal: 16 }}>
              <AlertCircle size={64} color={HELP.muted} />
              <Text style={{ fontSize: 24, color: HELP.fg, marginTop: 16, marginBottom: 8, ...poppins(700) }}>Order Not Found</Text>
              <Text style={[helpText.muted, { marginBottom: 24, textAlign: 'center' }]}>We couldn&apos;t find an order with ID: {orderId}</Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <HelpButton onPress={() => navigateTo('/user/orders')}>
                  <Text style={helpText.btn}>View All Orders</Text>
                </HelpButton>
                <HelpButton variant="default" onPress={() => navigateTo('/user/help')}>
                  <Text style={[helpText.btn, { color: '#fff' }]}>Go to Help Center</Text>
                </HelpButton>
              </View>
            </View>
          </Card>
        </ScrollView>
      </HelpPage>
    );
  }

  const field = (label, value, extra) => (
    <View>
      <Text style={[helpText.muted, { fontSize: 14, marginBottom: 4 }]}>{label}</Text>
      <Text style={[{ color: HELP.fg, ...poppins(600) }, extra]}>{value}</Text>
    </View>
  );

  return (
    <HelpPage>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Press scale={0.9} onPress={() => navigateTo('/user/help')} style={styles.back} accessibilityLabel="Back">
            <ArrowLeft size={16} color={HELP.fg} />
          </Press>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, color: HELP.fg, ...poppins(700) }}>Order Help</Text>
            <Text style={[helpText.muted, { fontSize: 14 }]}>Order {order.id}</Text>
          </View>
        </View>

        <Card>
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Package size={16} color={GREEN} />
              <Text style={{ fontSize: 18, color: HELP.fg, ...poppins(600) }}>Order Summary</Text>
            </View>
            <View style={[styles.badge, ['confirmed', 'preparing', 'outForDelivery', 'delivered'].includes(order.status) ? null : { backgroundColor: tw.gray500 }]}>
              <Text style={{ color: '#fff', fontSize: 12, ...poppins(600) }}>{statusLabel(order.status)}</Text>
            </View>
          </View>
          <View style={{ padding: 16, paddingTop: 0, gap: 16 }}>
            {field('Order ID', order.id)}
            {field('Placed On', formatDate(order.createdAt))}
            {field('Total Amount', `$${order.total.toFixed(2)}`, { color: GREEN, fontSize: 20 })}
            {field('Items', `${order.items?.length || 0} items`)}
            {order.address ? (
              <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: HELP.border, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <MapPin size={16} color={HELP.muted} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[helpText.muted, { fontSize: 14, marginBottom: 4 }]}>Delivery Address</Text>
                  <Text style={{ fontSize: 14, color: HELP.fg, ...poppins(400) }}>
                    {order.address.street}
                    {order.address.additionalDetails && `, ${order.address.additionalDetails}`}
                    {'\n'}
                    {order.address.city}, {order.address.state} {order.address.zipCode}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </Card>

        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 20, color: HELP.fg, ...poppins(700) }}>What can we help you with?</Text>
          {commonIssues.map((issue) => {
            const Icon = issue.icon;
            return (
              <Card key={issue.id} style={{ shadowOpacity: 0 }}>
                <View style={{ padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ padding: 8, backgroundColor: tw.yellow100, borderRadius: 8 }}>
                    <Icon size={16} color={GREEN} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, color: HELP.fg, ...poppins(600) }}>{issue.title}</Text>
                    <Text style={[helpText.muted, { fontSize: 14, marginTop: 4 }]}>{issue.description}</Text>
                  </View>
                </View>
                <View style={{ padding: 16, paddingTop: 0, gap: 12 }}>
                  <Text style={{ fontSize: 14, color: HELP.fg, ...poppins(600) }}>What to do:</Text>
                  {issue.solutions.map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <CheckCircle size={16} color={tw.green600} style={{ marginTop: 2 }} />
                      <Text style={[helpText.muted, { fontSize: 14, flex: 1 }]}>{s}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: HELP.border, flexWrap: 'wrap' }}>
                    {issue.actions.map((a, idx) => (
                      <HelpButton key={idx} variant={idx === 0 ? 'default' : 'outline'} onPress={() => handleAction(a.path)} style={{ minHeight: 32, paddingHorizontal: 12 }}>
                        <Text style={[helpText.btn, { fontSize: 13 }, idx === 0 ? { color: '#fff' } : null]}>{a.label}</Text>
                      </HelpButton>
                    ))}
                  </View>
                </View>
              </Card>
            );
          })}
        </View>

        <Card gold>
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={16} color={GREEN} />
            <Text style={{ fontSize: 18, color: HELP.fg, ...poppins(600) }}>Quick Actions</Text>
          </View>
          <View style={{ padding: 16, paddingTop: 0, gap: 16 }}>
            {[
              [Truck, 'Track Order', 'View real-time status', () => navigateTo(`/user/orders/${orderId}`)],
              [FileText, 'View Invoice', 'Download receipt', () => navigateTo(`/user/orders/${orderId}/invoice`)],
              [MessageCircle, 'Contact Support', 'Get help now', scrollToSupport],
            ].map(([Icon, t, sub, fn]) => (
              <HelpButton key={t} onPress={fn} style={{ justifyContent: 'flex-start', paddingVertical: 12 }}>
                <Icon size={16} color={HELP.fg} />
                <View>
                  <Text style={{ color: HELP.fg, ...poppins(600) }}>{t}</Text>
                  <Text style={[helpText.muted, { fontSize: 12 }]}>{sub}</Text>
                </View>
              </HelpButton>
            ))}
          </View>
        </Card>

        <View onLayout={(e) => { supportY.current = e.nativeEvent.layout.y; }}>
          <Card>
            <View style={{ padding: 16, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={20} color={GREEN} />
                <Text style={{ fontSize: 20, color: HELP.fg, flex: 1, ...poppins(600) }}>Contact Support for This Order</Text>
              </View>
              <Text style={[helpText.muted, { fontSize: 14 }]}>Our support team is ready to help you with order {order.id}</Text>
            </View>
            <View style={{ padding: 16, gap: 16 }}>
              <View style={styles.contact}>
                <View style={styles.contactIcon}><Phone size={20} color={GREEN} /></View>
                <View>
                  <Text style={[helpText.title, { marginBottom: 4 }]}>Phone Support</Text>
                  <Text style={[helpText.muted, { fontSize: 14, marginBottom: 8 }]}>Mention order {order.id}</Text>
                  <Press scale={0.98} onPress={() => Linking.openURL('tel:+1-800-123-4567').catch(() => {})}>
                    <Text style={styles.linkText}>+1 (800) 123-4567</Text>
                  </Press>
                </View>
              </View>
              <View style={styles.contact}>
                <View style={styles.contactIcon}><Mail size={20} color={GREEN} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[helpText.title, { marginBottom: 4 }]}>Email Support</Text>
                  <Text style={[helpText.muted, { fontSize: 14, marginBottom: 8 }]}>Include order {order.id} in subject</Text>
                  {platform.supportEmail ? (
                    <Press scale={0.98} onPress={() => Linking.openURL(`mailto:${platform.supportEmail}?subject=${encodeURIComponent(`Help with Order ${order.id}`)}`).catch(() => {})}>
                      <Text style={styles.linkText}>{platform.supportEmail}</Text>
                    </Press>
                  ) : (
                    <Text style={[helpText.muted, { fontSize: 14 }]}>Not configured yet</Text>
                  )}
                </View>
              </View>
              <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: HELP.border }}>
                <HelpButton variant="default" onPress={() => alert('Live chat would open here with order context')} style={{ width: '100%' }}>
                  <MessageCircle size={16} color="#fff" />
                  <Text style={[helpText.btn, { color: '#fff' }]}>Start Live Chat</Text>
                </HelpButton>
              </View>
            </View>
          </Card>
        </View>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <HelpButton onPress={() => navigateTo('/user/orders')} style={{ flex: 1 }}>
            <ArrowLeft size={16} color={HELP.fg} />
            <Text style={helpText.btn}>Back to All Orders</Text>
          </HelpButton>
          <HelpButton onPress={() => navigateTo('/user/help')} style={{ flex: 1 }}>
            <HelpCircle size={16} color={HELP.fg} />
            <Text style={helpText.btn}>Help Center</Text>
          </HelpButton>
        </View>
      </ScrollView>
    </HelpPage>
  );
}

const styles = StyleSheet.create({
  back: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  badge: { backgroundColor: GREEN, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999 },
  contact: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, backgroundColor: 'rgba(245,243,236,0.5)', borderRadius: 8 },
  contactIcon: { padding: 8, backgroundColor: tw.orange100, borderRadius: 8 },
  linkText: { fontSize: 14, color: HELP.primary, ...poppins(500) },
});
