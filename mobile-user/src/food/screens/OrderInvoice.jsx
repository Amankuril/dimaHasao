import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { NAV_CLEARANCE, isImmersiveRoute } from '../../components/dh/AppBottomNav';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { AlertCircle, ArrowLeft, Download, FileText, Printer } from 'lucide-react-native';
import Image from '../../components/Img';
import { Spinner } from '../../components/Loader';
import { Button, Card, EmptyState, IconButton, StatusBadge } from '../../components/ds';
import { orderAPI } from '../../api/food';
import { useOrders } from '../context/OrdersContext';
import { useCompanyName } from '../hooks/useCompanyName';
import { useParams, navigateTo } from '../../lib/webRouter';
import { toast } from '../../lib/notify';
import { color, radii, space, type } from '../../theme';
import { BillRow, Divider } from '../components/cart/parts';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/*
 * The web prints the card with window.print(); a raw API order (what the page
 * gets when the order is not in the local context) has its amounts under
 * `pricing`, so the same fields fall back to it instead of throwing.
 */
const money = (v) => Number(v || 0).toFixed(2);

function invoiceHtml(order, companyName) {
  const a = order.address || order.deliveryAddress || {};
  const items = order.items || [];
  const sub = order.subtotal ?? order.pricing?.subtotal;
  const del = order.deliveryFee ?? order.pricing?.deliveryFee;
  const tax = order.tax ?? order.pricing?.tax;
  const pack = order.packagingFee ?? order.pricing?.packagingFee;
  const plat = order.platformFee ?? order.pricing?.platformFee;
  const disc = order.discount ?? order.pricing?.discount;
  const total = order.total ?? order.pricing?.total;
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const rows = items
    .map((i) => `<tr><td>${esc(i.name)}${i.variantName ? `<br/><small>${esc(i.variantName)}</small>` : ''}</td><td>${i.quantity}</td><td style="text-align:right">₹${money(i.price)}</td><td style="text-align:right">₹${money(i.price * i.quantity)}</td></tr>`)
    .join('');
  const line = (l, v) => `<div class="total-row" style="display:flex;justify-content:space-between"><span>${l}</span><span>${v}</span></div>`;
  return `<html><head><meta charset="utf-8"/><style>
    body{font-family:Arial,sans-serif;padding:40px;color:#333}
    .invoice-header{border-bottom:2px solid #0a4d2b;padding-bottom:20px;margin-bottom:30px}
    .invoice-title{font-size:32px;font-weight:bold;color:#0a4d2b;margin-bottom:10px}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th,td{padding:12px;text-align:left;border-bottom:1px solid #ddd}
    th{background-color:#fed7aa}
    .total-row{padding:10px 0;font-size:18px}
    .grand-total{font-size:24px;font-weight:bold;color:#0a4d2b;border-top:2px solid #0a4d2b;padding-top:10px;display:flex;justify-content:space-between}
  </style></head><body>
    <div class="invoice-header"><div class="invoice-title">INVOICE</div>
    <div>${esc(companyName)}<br/>Food Delivery Platform</div>
    <div style="float:right;background:#0a4d2b;color:#fff;padding:6px 14px;border-radius:6px">${esc(String(order.status || '').toUpperCase())}</div></div>
    <div style="display:flex;justify-content:space-between"><div><b>Bill To:</b><br/>${esc(a.street)}<br/>${a.additionalDetails ? `${esc(a.additionalDetails)}<br/>` : ''}${esc(a.city)}, ${esc(a.state)} ${esc(a.zipCode)}</div>
    <div style="text-align:right"><b>Invoice Details:</b><br/><b>Invoice #:</b> ${esc(order.id || order.orderId)}<br/><b>Date:</b> ${esc(formatDate(order.createdAt))}<br/><b>Payment:</b> ${esc(order.paymentMethod?.type?.toUpperCase() || 'Card')}</div></div>
    <h3>Order Items:</h3><table><thead><tr><th>Item</th><th>Quantity</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
    ${line('Subtotal:', `₹${money(sub)}`)}
    ${Number(pack) > 0 ? line('Packaging Fee:', `₹${money(pack)}`) : ''}
    ${Number(plat) > 0 ? line('Platform Fee:', `₹${money(plat)}`) : ''}
    ${line('Delivery Fee:', `₹${money(del)}`)}
    ${line('GST:', `₹${money(tax)}`)}
    ${line('Discount:', `₹${money(Math.abs(Number(disc || 0)))}`)}
    <div class="grand-total"><span>Total:</span><span>₹${money(total)}</span></div>
    <p style="text-align:center;color:#666;margin-top:30px">Thank you for your order!<br/>For any queries, please contact our support team.</p>
  </body></html>`;
}

export default function OrderInvoice() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const bottomPad = (isImmersiveRoute(pathname) ? 0 : NAV_CLEARANCE) + insets.bottom + space.xxl;
  const companyName = useCompanyName();
  const { orderId } = useParams();
  const { getOrderById } = useOrders();
  const [order, setOrder] = useState(() => getOrderById(orderId));
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (order) return;
    (async () => {
      try {
        setLoading(true);
        const response = await orderAPI.getOrderDetails(orderId);
        if (response.data?.success && response.data.data?.order) setOrder(response.data.data.order);
        else setError('Order not found');
      } catch {
        setError('Failed to load invoice details');
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, order]);

  if (loading) {
    return (
      <View style={[styles.page, { alignItems: 'center', paddingTop: 80 }]} accessibilityRole="progressbar">
        <Spinner size={32} />
        <Text style={[type.body, { color: color.textSecondary, marginTop: space.lg }]}>Generating invoice...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.page, { paddingTop: space.xxl }]}>
        <EmptyState icon={AlertCircle} title={error || 'Order not found'} actionLabel="Back to orders" onAction={() => navigateTo('/user/orders')} />
      </View>
    );
  }

  const handlePrint = async () => {
    try {
      await Print.printAsync({ html: invoiceHtml(order, companyName) });
    } catch {
      toast.error('Failed to print invoice');
    }
  };
  const handlePdf = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: invoiceHtml(order, companyName) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch {
      toast.error('Failed to create PDF');
    }
  };

  const items = order.items || [];
  const sub = order.subtotal ?? order.pricing?.subtotal;
  const pack = order.packagingFee ?? order.pricing?.packagingFee;
  const plat = order.platformFee ?? order.pricing?.platformFee;
  const del = order.deliveryFee ?? order.pricing?.deliveryFee;
  const tax = order.tax ?? order.pricing?.tax;
  const disc = order.discount ?? order.pricing?.discount;
  const total = order.total ?? order.pricing?.total;
  const addr = order.address || order.deliveryAddress || {};
  const R = '₹';
  const st = String(order.status || '').toLowerCase();
  const statusTone = st.includes('cancel') || st === 'failed' ? 'danger' : st === 'delivered' || st === 'completed' ? 'success' : st === 'preparing' || st === 'pending' ? 'warning' : 'info';

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Back" onPress={() => navigateTo(`/user/orders/${orderId}`)} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
            Invoice
          </Text>
          <Text style={[type.small, { color: color.textMuted }]} numberOfLines={1}>
            Order {order.id}
          </Text>
        </View>
        <IconButton icon={Printer} label="Print invoice" variant="soft" onPress={handlePrint} />
        <IconButton icon={Download} label="Download PDF" variant="primary" onPress={handlePdf} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: bottomPad }}>
        <Card>
          <View style={styles.top}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.row}>
                <FileText size={22} color={color.primary} />
                <Text style={[type.titleSerif, { color: color.primary }]}>Invoice</Text>
              </View>
              <Text style={[type.small, { color: color.textMuted, marginTop: space.xs }]}>{companyName}</Text>
              <Text style={[type.caption, { color: color.textMuted }]}>Food Delivery Platform</Text>
            </View>
            <StatusBadge tone={statusTone} label={String(order.status || '').replace(/_/g, ' ').replace(/^./, (ch) => ch.toUpperCase())} />
          </View>

          <View style={{ marginTop: space.lg, gap: space.lg }}>
            <View>
              <Text style={[type.label, { color: color.text, marginBottom: space.xs }]}>Bill to</Text>
              <Text style={[type.small, { color: color.textSecondary }]}>{addr.street}</Text>
              {addr.additionalDetails ? <Text style={[type.small, { color: color.textSecondary }]}>{addr.additionalDetails}</Text> : null}
              <Text style={[type.small, { color: color.textSecondary }]}>
                {addr.city}, {addr.state} {addr.zipCode}
              </Text>
            </View>
            <View style={{ gap: space.xs }}>
              <Text style={[type.label, { color: color.text }]}>Invoice details</Text>
              <BillRow label="Invoice #" value={String(order.id || '')} />
              <BillRow label="Date" value={formatDate(order.createdAt)} />
              <BillRow label="Payment" value={order.paymentMethod?.type?.toUpperCase() || 'Card'} />
            </View>
          </View>

          <Divider style={{ marginVertical: space.lg }} />
          <Text style={[type.label, { color: color.text, marginBottom: space.sm }]}>Order items</Text>
          <View style={{ gap: space.md }}>
            {items.map((item, idx) => (
              <View key={item.id || idx} style={styles.itemRow}>
                <Image source={{ uri: item.image }} style={styles.itemImg} resizeMode="cover" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.bodyStrong, { color: color.text }]}>{item.name}</Text>
                  {item.variantName ? <Text style={[type.caption, { color: color.textMuted }]}>{item.variantName}</Text> : null}
                  <Text style={[type.caption, { color: color.textMuted }]}>
                    Qty {item.quantity} × {R}
                    {money(item.price)}
                  </Text>
                </View>
                <Text style={[type.bodyStrong, { color: color.text }]}>
                  {R}
                  {money(item.price * item.quantity)}
                </Text>
              </View>
            ))}
          </View>

          <Divider dashed style={{ marginVertical: space.lg }} />
          <View style={{ gap: space.md }}>
            <BillRow label="Subtotal" value={`${R}${money(sub)}`} />
            {pack > 0 ? <BillRow label="Packaging fee" value={`${R}${money(pack)}`} /> : null}
            {plat > 0 ? <BillRow label="Platform fee" value={`${R}${money(plat)}`} /> : null}
            <BillRow label="Delivery fee" value={`${R}${money(del)}`} />
            <BillRow label="GST" value={`${R}${money(tax)}`} />
            <BillRow label="Discount" tone="success" value={`−${R}${money(Math.abs(Number(disc || 0)))}`} />
            <Divider />
            <BillRow strong label="Total" value={`${R}${money(total)}`} />
          </View>

          <View style={styles.thanks}>
            <Text style={[type.small, { color: color.textMuted, textAlign: 'center' }]}>Thank you for your order!</Text>
            <Text style={[type.caption, { color: color.textMuted, textAlign: 'center' }]}>For any queries, please contact our support team.</Text>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Button title="Back to orders" variant="outline" onPress={() => navigateTo('/user/orders')} style={{ flex: 1 }} />
          <Button title="Track order" variant="secondary" onPress={() => navigateTo(`/user/orders/${orderId}`)} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.xs, minHeight: 56, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingBottom: space.lg, borderBottomWidth: 2, borderBottomColor: color.primary },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  itemImg: { width: 40, height: 40, borderRadius: radii.sm, backgroundColor: color.surfaceMuted },
  thanks: { marginTop: space.xl, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: color.border, gap: 2 },
});
