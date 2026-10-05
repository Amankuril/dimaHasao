/* eslint-disable react-hooks/static-components -- small stateless row helpers declared next to the data they read */
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ArrowLeft, Download, FileText, Printer } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Image from '../../components/Img';
import { Press } from '../../components/ui';
import { Spinner } from '../../components/Loader';
import { orderAPI } from '../../api/food';
import { useOrders } from '../context/OrdersContext';
import { useCompanyName } from '../hooks/useCompanyName';
import { useParams, navigateTo } from '../../lib/webRouter';
import { toast } from '../../lib/notify';
import { poppins, shadow, tw } from '../../theme';
import { F } from '../components/shell';

const GREEN = '#0a4d2b';
const MUTED = '#78665a';
const BORDER = '#e6e1d3';

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

function Btn({ children, onPress, primary, style }) {
  return (
    <Press onPress={onPress} style={[styles.btn, primary ? { backgroundColor: GREEN, borderColor: GREEN } : null, style]}>
      {children}
    </Press>
  );
}

export default function OrderInvoice() {
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
      <View style={[styles.page, { alignItems: 'center', paddingTop: 80 }]}>
        <Spinner size={32} />
        <Text style={[styles.muted, { marginTop: 16 }]}>Generating invoice...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[styles.page, { alignItems: 'center', paddingTop: 80, paddingHorizontal: 16 }]}>
        <Text style={{ fontSize: 18, color: tw.gray900, marginBottom: 16, ...poppins(700) }}>{error || 'Order Not Found'}</Text>
        <Btn primary onPress={() => navigateTo('/user/orders')}>
          <Text style={[styles.btnText, { color: '#fff' }]}>Back to Orders</Text>
        </Btn>
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
  const TotalLine = ({ label, value, color }) => (
    <View style={styles.totalLine}>
      <Text style={[styles.totalText, color ? { color } : null]}>{label}</Text>
      <Text style={[styles.totalText, color ? { color } : null]}>{value}</Text>
    </View>
  );

  return (
    <LinearGradient colors={['rgba(254,252,232,0.3)', '#ffffff', 'rgba(255,247,237,0.2)']} style={styles.page}>
      <ScrollView contentContainerStyle={{ padding: 12, gap: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <Press scale={0.9} onPress={() => navigateTo(`/user/orders/${orderId}`)} style={styles.back} accessibilityLabel="Back">
              <ArrowLeft size={16} color={tw.gray900} />
            </Press>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, color: tw.gray900, ...poppins(700) }}>Invoice</Text>
              <Text style={[styles.muted, { fontSize: 14 }]} numberOfLines={1}>Order {order.id}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn onPress={handlePrint} style={{ height: 36, paddingHorizontal: 12 }}>
              <Printer size={12} color={tw.gray900} />
            </Btn>
            <Btn primary onPress={handlePdf} style={{ height: 36, paddingHorizontal: 12 }}>
              <Download size={12} color="#fff" />
              <Text style={[styles.btnText, { color: '#fff', fontSize: 12 }]}>PDF</Text>
            </Btn>
          </View>
        </View>

        <View style={styles.card}>
          <View style={{ borderBottomWidth: 2, borderBottomColor: GREEN, paddingBottom: 20, marginBottom: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <FileText size={24} color={GREEN} />
              <Text style={{ fontSize: 20, color: GREEN, ...poppins(700) }}>INVOICE</Text>
            </View>
            <View style={{ gap: 12 }}>
              <View>
                <Text style={[styles.muted, { fontSize: 12 }]}>{companyName}</Text>
                <Text style={[styles.muted, { fontSize: 12 }]}>Food Delivery Platform</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={{ color: '#fff', fontSize: 14, ...poppins(600) }}>{String(order.status || '').toUpperCase()}</Text>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 16, gap: 16 }}>
            <View>
              <Text style={styles.h3}>Bill To:</Text>
              <Text style={styles.small}>{addr.street}</Text>
              {addr.additionalDetails ? <Text style={styles.small}>{addr.additionalDetails}</Text> : null}
              <Text style={styles.small}>
                {addr.city}, {addr.state} {addr.zipCode}
              </Text>
            </View>
            <View>
              <Text style={styles.h3}>Invoice Details:</Text>
              <Text style={styles.small}><Text style={poppins(700)}>Invoice #:</Text> {order.id}</Text>
              <Text style={styles.small}><Text style={poppins(700)}>Date:</Text> {formatDate(order.createdAt)}</Text>
              <Text style={styles.small}><Text style={poppins(700)}>Payment:</Text> {order.paymentMethod?.type?.toUpperCase() || 'Card'}</Text>
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={[styles.h3, { marginBottom: 12 }]}>Order Items:</Text>
            <View style={[styles.tr, { borderBottomColor: BORDER }]}>
              <Text style={[styles.th, { flex: 1 }]}>Item</Text>
              <Text style={[styles.th, { textAlign: 'right' }]}>Total</Text>
            </View>
            {items.map((item, idx) => (
              <View key={item.id || idx} style={[styles.tr, { paddingVertical: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Image source={{ uri: item.image }} style={{ width: 32, height: 32, borderRadius: 4 }} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: tw.gray900, ...poppins(500) }}>{item.name}</Text>
                    {item.variantName ? <Text style={{ fontSize: 12, color: tw.gray500, ...poppins(400) }}>{item.variantName}</Text> : null}
                    <Text style={[styles.muted, { fontSize: 12 }]}>Qty: {item.quantity} × {R}{money(item.price)}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: tw.gray900, ...poppins(500) }}>{R}{money(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: 16 }}>
            <TotalLine label="Subtotal:" value={`${R}${money(sub)}`} />
            {pack > 0 ? <TotalLine label="Packaging Fee:" value={`${R}${money(pack)}`} /> : null}
            {plat > 0 ? <TotalLine label="Platform Fee:" value={`${R}${money(plat)}`} /> : null}
            <TotalLine label="Delivery Fee:" value={`${R}${money(del)}`} />
            <TotalLine label="GST:" value={`${R}${money(tax)}`} />
            <TotalLine label="Discount:" value={`${R}${money(Math.abs(Number(disc || 0)))}`} color={tw.green600} />
            <View style={styles.grand}>
              <Text style={styles.grandText}>Total:</Text>
              <Text style={styles.grandText}>{R}{money(total)}</Text>
            </View>
          </View>

          <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER, alignItems: 'center' }}>
            <Text style={[styles.muted, { fontSize: 12 }]}>Thank you for your order!</Text>
            <Text style={[styles.muted, { fontSize: 12, marginTop: 4, textAlign: 'center' }]}>For any queries, please contact our support team.</Text>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Btn onPress={() => navigateTo(`/user/orders/${orderId}`)} style={{ height: 40 }}>
            <Text style={styles.btnText}>Track Order</Text>
          </Btn>
          <Btn onPress={() => navigateTo('/user/orders')} style={{ height: 40 }}>
            <Text style={styles.btnText}>Back to Orders</Text>
          </Btn>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: F.cream },
  muted: { color: MUTED, fontSize: 14, ...poppins(400) },
  back: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 36, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', ...shadow('xs') },
  btnText: { fontSize: 14, color: tw.gray900, ...poppins(500) },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, ...shadow('sm') },
  statusBadge: { alignSelf: 'flex-start', backgroundColor: GREEN, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  h3: { fontSize: 14, color: tw.gray900, marginBottom: 8, ...poppins(700) },
  small: { fontSize: 12, color: tw.gray900, ...poppins(400) },
  tr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 8, paddingVertical: 4 },
  th: { fontSize: 12, color: tw.gray900, ...poppins(600) },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalText: { fontSize: 12, color: tw.gray700, ...poppins(400) },
  grand: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 8, borderTopWidth: 2, borderTopColor: GREEN },
  grandText: { fontSize: 16, color: tw.gray900, ...poppins(700) },
});
