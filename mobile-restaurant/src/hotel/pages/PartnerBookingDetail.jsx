import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  Calendar, User, Phone, Mail, MapPin,
  CreditCard, CheckCircle,
  ChevronLeft, AlertTriangle, LogIn, LogOut, FileText, Printer, X,
} from 'lucide-react-native';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { useNavigate, useParams } from '../../lib/webRouter';
import { confirm, toast } from '../../lib/notify';
import { poppins, shadow, tw } from '../../theme';
import { bookingService } from '../services/apiService';
import { HT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerBookingDetail.jsx
 * (/hotel/partner/bookings/:id), with components/invoice/BookingInvoice.jsx
 * inlined below. window.confirm becomes the app's confirm dialog; the
 * invoice's "Print / Save PDF" renders the same figures to a PDF with the
 * system print engine and opens the share sheet.
 */

/* ---------------------------- BookingInvoice ---------------------------- */

const rupees = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const addressLine = (address) => {
  if (!address) return null;
  return [address.fullAddress, address.city, address.state, address.pincode].filter(Boolean).join(', ');
};

const esc = (v) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The invoice as printable HTML (what window.print() prints on the web). */
const invoiceHtml = (invoice) => {
  const { seller, buyer, stay, lineItems = [], totals = {}, settlement } = invoice;
  const rows = lineItems.length
    ? lineItems
        .map(
          (item) => `<tr><td>${esc(item.description)}</td><td class="g">${item.date ? shortDate(item.date) : '—'}</td><td class="r">${rupees(item.rate)}</td><td class="r">${esc(item.units)}</td><td class="r b">${rupees(item.amount)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="5" class="c g">No line items recorded for this booking.</td></tr>';
  const guests =
    stay?.adults != null || stay?.children != null
      ? `<p class="g s">${stay.adults || 0} adult${stay.adults === 1 ? '' : 's'}${stay.children ? `, ${stay.children} child${stay.children === 1 ? '' : 'ren'}` : ''}</p>`
      : '';
  return `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>
body{font-family:Helvetica,Arial,sans-serif;color:#111827;padding:24px}
.g{color:#6b7280}.s{font-size:12px;margin:2px 0}.r{text-align:right}.b{font-weight:700}.c{text-align:center}
.h{display:flex;justify-content:space-between;border-bottom:1px solid #e5e7eb;padding-bottom:24px}
.k{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af}
table{width:100%;border-collapse:collapse;font-size:13px;margin:24px 0}th{font-size:10px;text-transform:uppercase;color:#9ca3af;text-align:left;border-bottom:1px solid #f3f4f6;padding-bottom:8px}
td{padding:8px 4px;border-bottom:1px solid #f9fafb}.t{margin-left:auto;width:280px;font-size:14px}.t div{display:flex;justify-content:space-between;margin:6px 0}
</style></head><body>
<div class="h"><div><div class="k">Tax Invoice</div><h2 style="margin:4px 0">${esc(invoice.invoiceNumber)}</h2><p class="g s">Issued ${shortDate(invoice.issuedAt)}</p><p class="g s">Booking ${esc(invoice.bookingId)}</p></div>
<div style="text-align:right"><b>${esc(seller?.name)}</b>${seller?.type ? `<div class="k">${esc(seller.type)}</div>` : ''}${addressLine(seller?.address) ? `<p class="g s">${esc(addressLine(seller.address))}</p>` : ''}${seller?.contactNumber ? `<p class="g s">${esc(seller.contactNumber)}</p>` : ''}</div></div>
<div style="display:flex;justify-content:space-between;padding:24px 0;border-bottom:1px solid #e5e7eb"><div><div class="k">Billed to</div><b>${esc(buyer?.name || 'Guest')}</b>${buyer?.phone ? `<p class="g s">${esc(buyer.phone)}</p>` : ''}${buyer?.email ? `<p class="g s">${esc(buyer.email)}</p>` : ''}</div>
<div style="text-align:right"><div class="k">Stay</div><b>${shortDate(stay?.checkInDate)} — ${shortDate(stay?.checkOutDate)}</b><p class="g s">${esc(stay?.totalNights)} night${stay?.totalNights === 1 ? '' : 's'}${stay?.roomType ? ` · ${esc(stay.roomType)}` : ''}</p>${guests}</div></div>
<table><thead><tr><th>Description</th><th>Date</th><th class="r">Rate</th><th class="r">Qty</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="t"><div><span class="g">Subtotal</span><b>${rupees(totals.subtotal)}</b></div>
${totals.discount > 0 ? `<div style="color:#047857"><span>Discount${totals.couponCode ? ` (${esc(totals.couponCode)})` : ''}</span><b>−${rupees(totals.discount)}</b></div>` : ''}
<div><span class="g">GST @ ${esc(totals.gstRate)}%</span><b>${rupees(totals.taxes)}</b></div>
<div style="border-top:1px solid #e5e7eb;padding-top:8px;font-size:16px"><b>Total</b><b>${rupees(totals.total)}</b></div>
<div style="font-size:12px"><span class="g">${totals.amountDue > 0 ? 'Amount due' : 'Paid in full'}</span><b style="color:${totals.amountDue > 0 ? '#b45309' : '#047857'}">${totals.amountDue > 0 ? rupees(totals.amountDue) : rupees(0)}</b></div></div>
${settlement ? `<div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:12px"><div class="k">Settlement (not shown on the guest's copy)</div><p>Platform commission <b>${rupees(settlement.commission)}</b> &nbsp; Partner payout <b style="color:#047857">${rupees(settlement.partnerPayout)}</b></p></div>` : ''}
<p class="g c" style="font-size:10px;margin-top:32px">This is a computer-generated invoice and does not require a signature.</p>
</body></html>`;
};

const BookingInvoice = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const { seller, buyer, stay, lineItems = [], totals = {}, settlement } = invoice;

  const printInvoice = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: invoiceHtml(invoice) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Invoice ${invoice.invoiceNumber}`, UTI: 'com.adobe.pdf' });
      } else {
        toast.success(`Invoice saved to ${uri}`);
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to load the invoice');
    }
  };

  return (
    <View style={{ backgroundColor: '#fff' }}>
      <View style={inv.bar}>
        <Text style={inv.barTitle}>Invoice</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Press onPress={printInvoice} style={inv.printBtn}>
            <Printer size={14} color="#fff" />
            <Text style={inv.printText}>Print / Save PDF</Text>
          </Press>
          {onClose ? (
            <Press scale={1} onPress={onClose} accessibilityLabel="Close invoice" style={{ padding: 8, borderRadius: 8 }}>
              <X size={16} color={tw.gray500} />
            </Press>
          ) : null}
        </View>
      </View>

      <View style={{ padding: 24 }}>
        <View style={inv.head}>
          <View>
            <Text style={inv.kicker}>Tax Invoice</Text>
            <Text style={inv.number}>{invoice.invoiceNumber}</Text>
            <Text style={inv.small}>Issued {shortDate(invoice.issuedAt)}</Text>
            <Text style={inv.smallNoMt}>Booking {invoice.bookingId}</Text>
          </View>
          <View style={{ marginTop: 16 }}>
            <Text style={inv.seller}>{seller?.name}</Text>
            {seller?.type ? <Text style={[inv.kicker, { letterSpacing: 1 }]}>{seller.type}</Text> : null}
            {addressLine(seller?.address) ? <Text style={[inv.small, { maxWidth: 256 }]}>{addressLine(seller.address)}</Text> : null}
            {seller?.contactNumber ? <Text style={inv.smallNoMt}>{seller.contactNumber}</Text> : null}
          </View>
        </View>

        <View style={inv.two}>
          <View>
            <Text style={[inv.kicker, { marginBottom: 4 }]}>Billed to</Text>
            <Text style={inv.bold}>{buyer?.name || 'Guest'}</Text>
            {buyer?.phone ? <Text style={inv.smallNoMt}>{buyer.phone}</Text> : null}
            {buyer?.email ? <Text style={inv.smallNoMt}>{buyer.email}</Text> : null}
          </View>
          <View>
            <Text style={[inv.kicker, { marginBottom: 4 }]}>Stay</Text>
            <Text style={inv.stay}>
              {shortDate(stay?.checkInDate)} — {shortDate(stay?.checkOutDate)}
            </Text>
            <Text style={inv.smallNoMt}>
              {stay?.totalNights} night{stay?.totalNights === 1 ? '' : 's'}
              {stay?.roomType ? ` · ${stay.roomType}` : ''}
            </Text>
            {stay?.adults != null || stay?.children != null ? (
              <Text style={inv.smallNoMt}>
                {stay.adults || 0} adult{stay.adults === 1 ? '' : 's'}
                {stay.children ? `, ${stay.children} child${stay.children === 1 ? '' : 'ren'}` : ''}
              </Text>
            ) : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 24 }}>
          <View style={{ minWidth: 448 }}>
            <View style={[inv.tr, { borderBottomWidth: 1, borderBottomColor: tw.gray100, paddingBottom: 8 }]}>
              <Text style={[inv.th, { flex: 2.4 }]}>Description</Text>
              <Text style={[inv.th, { flex: 1.2 }]}>Date</Text>
              <Text style={[inv.th, { flex: 1, textAlign: 'right' }]}>Rate</Text>
              <Text style={[inv.th, { flex: 0.6, textAlign: 'right' }]}>Qty</Text>
              <Text style={[inv.th, { flex: 1.2, textAlign: 'right' }]}>Amount</Text>
            </View>
            {lineItems.map((item, index) => (
              <View key={index} style={[inv.tr, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: tw.gray50 }]}>
                <Text style={[inv.td, { flex: 2.4, paddingRight: 12 }]}>{item.description}</Text>
                <Text style={[inv.td, { flex: 1.2, fontSize: 12, color: tw.gray500 }]}>{item.date ? shortDate(item.date) : '—'}</Text>
                <Text style={[inv.td, { flex: 1, textAlign: 'right' }]}>{rupees(item.rate)}</Text>
                <Text style={[inv.td, { flex: 0.6, textAlign: 'right' }]}>{item.units}</Text>
                <Text style={[inv.td, { flex: 1.2, textAlign: 'right', ...poppins(600) }]}>{rupees(item.amount)}</Text>
              </View>
            ))}
            {lineItems.length === 0 ? (
              <Text style={{ paddingVertical: 24, textAlign: 'center', color: tw.gray400, fontSize: 12, ...poppins(400) }}>
                No line items recorded for this booking.
              </Text>
            ) : null}
          </View>
        </ScrollView>

        <View style={{ borderTopWidth: 1, borderTopColor: tw.gray200, paddingTop: 24, alignItems: 'flex-end' }}>
          <View style={{ width: '100%', maxWidth: 288, gap: 8 }}>
            <View style={inv.line}>
              <Text style={inv.lineLabel}>Subtotal</Text>
              <Text style={inv.lineValue}>{rupees(totals.subtotal)}</Text>
            </View>
            {totals.discount > 0 ? (
              <View style={inv.line}>
                <Text style={[inv.lineText, { color: tw.emerald700 }]}>Discount{totals.couponCode ? ` (${totals.couponCode})` : ''}</Text>
                <Text style={[inv.lineValue, { color: tw.emerald700 }]}>−{rupees(totals.discount)}</Text>
              </View>
            ) : null}
            <View style={inv.line}>
              <Text style={inv.lineLabel}>GST @ {totals.gstRate}%</Text>
              <Text style={inv.lineValue}>{rupees(totals.taxes)}</Text>
            </View>
            <View style={[inv.line, { borderTopWidth: 1, borderTopColor: tw.gray200, paddingTop: 8 }]}>
              <Text style={{ fontSize: 16, color: tw.gray900, ...poppins(700) }}>Total</Text>
              <Text style={{ fontSize: 16, color: tw.gray900, ...poppins(900) }}>{rupees(totals.total)}</Text>
            </View>
            <View style={inv.line}>
              <Text style={{ fontSize: 12, color: tw.gray500, ...poppins(400) }}>
                {totals.amountDue > 0 ? 'Amount due' : 'Paid in full'}
              </Text>
              <Text style={{ fontSize: 12, color: totals.amountDue > 0 ? tw.amber700 : tw.emerald700, ...poppins(700) }}>
                {totals.amountDue > 0 ? rupees(totals.amountDue) : rupees(0)}
              </Text>
            </View>
          </View>
        </View>

        {settlement ? (
          <View style={inv.settle}>
            <Text style={[inv.kicker, { marginBottom: 8 }]}>Settlement (not shown on the guest&apos;s copy)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 24, rowGap: 4 }}>
              <Text style={inv.settleText}>
                Platform commission <Text style={{ color: tw.gray900, ...poppins(700) }}>{rupees(settlement.commission)}</Text>
              </Text>
              <Text style={inv.settleText}>
                Partner payout <Text style={{ color: tw.emerald700, ...poppins(700) }}>{rupees(settlement.partnerPayout)}</Text>
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={{ marginTop: 32, fontSize: 10, color: tw.gray400, textAlign: 'center', ...poppins(400) }}>
          This is a computer-generated invoice and does not require a signature.
        </Text>
      </View>
    </View>
  );
};

const inv = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  barTitle: { fontSize: 16, color: tw.gray900, ...poppins(700) },
  printBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#0a0a0a', borderRadius: 8 },
  printText: { fontSize: 12, color: '#fff', ...poppins(700) },
  head: { paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  kicker: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
  number: { fontSize: 24, lineHeight: 32, marginTop: 4, color: tw.gray900, ...poppins(900) },
  small: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(400) },
  smallNoMt: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  seller: { fontSize: 18, lineHeight: 22, color: tw.gray900, ...poppins(700) },
  two: { paddingVertical: 24, gap: 24, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  bold: { fontSize: 16, color: tw.gray900, ...poppins(700) },
  stay: { fontSize: 14, color: tw.gray900, ...poppins(600) },
  tr: { flexDirection: 'row', alignItems: 'center' },
  th: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
  td: { fontSize: 14, color: tw.gray900, ...poppins(400) },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  lineLabel: { fontSize: 14, color: tw.gray500, ...poppins(400) },
  lineText: { fontSize: 14, ...poppins(400) },
  lineValue: { fontSize: 14, color: tw.gray900, ...poppins(600) },
  settle: { marginTop: 24, padding: 16, backgroundColor: tw.gray50, borderRadius: 12, borderWidth: 1, borderColor: tw.gray100 },
  settleText: { fontSize: 14, color: tw.gray900, ...poppins(400) },
});

/* -------------------------- PartnerBookingDetail ------------------------- */

const label = (text) => ({ fontSize: 9, lineHeight: 13.5, color: tw.gray400, textTransform: 'uppercase', marginBottom: 2, ...poppins(700), ...(text || {}) });

const PartnerBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const data = await bookingService.getPartnerBookingDetail(id);
      setBooking(data);
    } catch (error) {
      toast.error('Failed to load booking details');
      navigate('/hotel/partner/bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleViewInvoice = async () => {
    try {
      setInvoiceLoading(true);
      const data = await bookingService.getInvoice(id);
      setInvoice(data.invoice);
    } catch (error) {
      toast.error(error?.message || 'Failed to load the invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const ok = (title, message) => confirm(title, message, { confirmText: 'OK' });

  const handleMarkPaid = async () => {
    if (!(await ok('Confirm: Guest has paid the full amount at the hotel?'))) return;
    try {
      await bookingService.markAsPaid(id);
      toast.success('Marked as Paid Successfully');
      fetchBooking(); // Refresh
    } catch (error) {
      toast.error(error.message || 'Action Failed');
    }
  };

  const handleNoShow = async () => {
    if (!(await ok('Confirm: Guest did NOT arrive? This will cancel the booking and release inventory.'))) return;
    try {
      await bookingService.markNoShow(id);
      toast.success('Marked as No Show');
      fetchBooking();
    } catch (error) {
      toast.error(error.message || 'Action Failed');
    }
  };

  const handleCheckIn = async () => {
    if (!(await ok('Confirm Guest Check-In?'))) return;
    try {
      await bookingService.checkIn(id);
      toast.success('Checked In Successfully');
      fetchBooking();
    } catch (error) {
      toast.error(error.message || 'Action Failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      if (!(await ok('Confirm Guest Check-Out?'))) return;
      await bookingService.checkOut(id);
      toast.success('Checked Out Successfully');
      fetchBooking();
    } catch (error) {
      if (error.requirePayment) {
        if (await ok(String(error.message || ''), 'Do you want to FORCE check-out anyway?')) {
          try {
            await bookingService.checkOut(id, true);
            toast.success('Checked Out (Forced)');
            fetchBooking();
          } catch (e) {
            toast.error(e.message || 'Force Check-out Failed');
          }
        }
      } else {
        toast.error(error.message || 'Action Failed');
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.page, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="small" color={tw.gray900} />
      </View>
    );
  }
  if (!booking) return null;

  const user = booking.userId || {};
  const property = booking.propertyId || {};
  const room = booking.roomTypeId || {};

  const isPayAtHotel = booking.paymentStatus !== 'paid';
  const canMarkPaid = isPayAtHotel && ['confirmed', 'checked_in'].includes(booking.bookingStatus);
  const canMarkNoShow = ['confirmed'].includes(booking.bookingStatus);
  const canCheckIn = booking.bookingStatus === 'confirmed';
  const canCheckOut = booking.bookingStatus === 'checked_in';

  const pType = (property?.propertyType || '').toLowerCase();

  const checkInLabel = 'Check-in';
  const checkOutLabel = 'Check-out';
  const durationLabel = 'Nights';

  const statusTone =
    booking.bookingStatus === 'confirmed'
      ? { bg: tw.green50, fg: tw.green700, border: tw.green100 }
      : booking.bookingStatus === 'cancelled'
        ? { bg: tw.red50, fg: tw.red700, border: tw.red100 }
        : booking.bookingStatus === 'no_show'
          ? { bg: tw.gray100, fg: tw.gray600, border: tw.gray200 }
          : { bg: tw.yellow50, fg: tw.yellow700, border: tw.yellow100 };

  const half = canCheckIn || canCheckOut;

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Press scale={1} onPress={() => navigate('/hotel/partner/bookings')} accessibilityLabel="Back" style={{ padding: 8, borderRadius: 999 }}>
          <ChevronLeft size={20} color={tw.gray900} />
        </Press>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <Press scale={1} onPress={handleViewInvoice} disabled={invoiceLoading} style={[styles.invoiceBtn, invoiceLoading && { opacity: 0.6 }]}>
          <FileText size={14} color="#fff" />
          <Text style={styles.invoiceText}>{invoiceLoading ? 'Loading…' : 'Invoice'}</Text>
        </Press>
      </View>

      <Modal visible={Boolean(invoice)} transparent animationType="fade" onRequestClose={() => setInvoice(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          {/* A tap on the dim area closes (web: onClick on the overlay); the card swallows its own taps (stopPropagation). */}
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <Pressable
              style={{ flexGrow: 1, padding: 16, paddingTop: 16 + insets.top }}
              onPress={() => setInvoice(null)}
              accessibilityLabel="Close invoice"
            >
              <View style={styles.invoiceCard} onStartShouldSetResponder={() => true}>
                <BookingInvoice invoice={invoice} onClose={() => setInvoice(null)} />
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 24, gap: 24 }}>
          {/* Status Card - Compact */}
          <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[label(), { fontSize: 10, lineHeight: 15, letterSpacing: 1.5, marginBottom: 2 }]}>Booking ID</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(900) }}>#{booking.bookingId || booking._id}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}>
              <Text style={[styles.statusText, { color: statusTone.fg }]}>{booking.bookingStatus.replace('_', ' ')}</Text>
            </View>
          </View>

          {/* Property Info */}
          <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
            <View style={styles.propImg}>
              {property.images?.[0] ? (
                <Img source={{ uri: property.images[0] }} accessibilityLabel="property" style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <MapPin size={24} color={tw.gray300} style={{ margin: 20 }} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.propName}>{(property.propertyName || 'Property Name').toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <View style={styles.typeChip}>
                  <Text style={styles.typeText}>{pType.toUpperCase()}</Text>
                </View>
                <Text style={styles.loc} numberOfLines={1}>
                  {typeof property.address === 'object' && property.address
                    ? `${property.address.city || ''}${property.address.city && property.address.area ? ', ' : ''}${property.address.area || ''}`
                    : (property.address || 'Location')}
                </Text>
              </View>
            </View>
          </View>

          {/* Guest Info - Compact */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <User size={16} color={tw.gray400} />
              <Text style={styles.cardTitle}>Guest Details</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <View style={styles.avatar}>
                <Text style={{ fontSize: 16, color: tw.gray500, ...poppins(700) }}>{user.name?.[0] || 'G'}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 14, color: tw.gray900, ...poppins(700) }}>{user.name || 'Guest'}</Text>
                <Text style={{ fontSize: 12, color: tw.gray500, ...poppins(400) }}>Joined via App</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => user.phone && Linking.openURL(`tel:${user.phone}`)}
                style={[styles.tile, { flex: 1 }]}
              >
                <Text style={label()}>Phone</Text>
                <View style={styles.tileRow}>
                  <Phone size={12} color={tw.gray400} />
                  <Text style={styles.tileText}>{user.phone || 'N/A'}</Text>
                </View>
              </Pressable>
              <View style={[styles.tile, { flex: 1 }]}>
                <Text style={label()}>Email</Text>
                <View style={styles.tileRow}>
                  <Mail size={12} color={tw.gray400} />
                  <Text style={[styles.tileText, { flexShrink: 1 }]} numberOfLines={1}>{user.email || 'N/A'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.guests}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <User size={14} color={tw.gray400} />
                <Text style={{ fontSize: 10, color: tw.gray500, textTransform: 'uppercase', ...poppins(700) }}>Total Guests</Text>
              </View>
              <Text style={{ fontSize: 14, color: tw.gray900, flexShrink: 1, textAlign: 'right', ...poppins(700) }}>
                {booking.guests?.adults || 1} Adult{(booking.guests?.adults || 1) !== 1 ? 's' : ''}
                {booking.guests?.children > 0 ? `, ${booking.guests.children} Child${booking.guests.children !== 1 ? 'ren' : ''}` : ''}
              </Text>
            </View>
          </View>

          {/* Stay Info - Compact */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Calendar size={16} color={tw.gray400} />
              <Text style={styles.cardTitle}>Stay Details</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={[styles.tile, { flex: 1 }]}>
                <Text style={label()}>{checkInLabel}</Text>
                <Text style={styles.dateText}>{booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : 'N/A'}</Text>
              </View>
              <View style={[styles.tile, { flex: 1 }]}>
                <Text style={label()}>{checkOutLabel}</Text>
                <Text style={styles.dateText}>{booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString() : 'N/A'}</Text>
              </View>
            </View>
            <View style={[styles.tile, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[label(), { marginBottom: 0 }]}>Room Type</Text>
                <Text style={styles.dateText}>{room.name || room.type || 'Standard'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: tw.gray900, ...poppins(700) }}>
                  {booking.bookingUnit === 'entire' ? '1 Unit' : '1 Room'}
                </Text>
                <Text style={{ fontSize: 10, color: tw.gray500, ...poppins(500) }}>
                  {booking.totalNights} {durationLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment/Price Info - Compact */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <CreditCard size={16} color={tw.gray400} />
              <Text style={styles.cardTitle}>Payment & Payout</Text>
            </View>
            <View style={{ gap: 8 }}>
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Total Amount (Collect)</Text>
                <Text style={{ fontSize: 16, color: tw.gray900, ...poppins(700) }}>₹{booking.totalAmount}</Text>
              </View>
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Partner Payout (Earnings)</Text>
                <Text style={{ fontSize: 14, color: tw.green700, ...poppins(700) }}>₹{booking.partnerPayout}</Text>
              </View>
              <View style={[styles.payRow, { paddingTop: 4 }]}>
                <Text style={styles.payLabel}>Status</Text>
                <View style={[styles.payPill, { backgroundColor: booking.paymentStatus === 'paid' ? tw.green100 : tw.yellow100 }]}>
                  <Text style={{ fontSize: 10, textTransform: 'uppercase', color: booking.paymentStatus === 'paid' ? tw.green700 : tw.yellow700, ...poppins(700) }}>
                    {booking.paymentStatus === 'paid' ? 'PAID' : 'PAY AT HOTEL'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Actions Grid */}
        <View style={styles.actions}>
          {canCheckIn && (
            <Press onPress={handleCheckIn} style={[styles.bigBtn, { width: '100%' }]}>
              <LogIn size={20} color="#fff" />
              <Text style={styles.bigText}>{checkInLabel} Guest</Text>
            </Press>
          )}

          {canCheckOut && (
            <Press onPress={handleCheckOut} style={[styles.bigBtn, { width: '100%' }]}>
              <LogOut size={20} color="#fff" />
              <Text style={styles.bigText}>{checkOutLabel} Guest</Text>
            </Press>
          )}

          {canMarkPaid && (
            <Press onPress={handleMarkPaid} style={[styles.paidBtn, { flexGrow: 1, flexBasis: half ? '47%' : '100%' }]}>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.smallText}>Mark Paid</Text>
            </Press>
          )}

          {canMarkNoShow && (
            <Press onPress={handleNoShow} style={[styles.noShowBtn, { flexGrow: 1, flexBasis: half ? '47%' : '100%' }]}>
              <AlertTriangle size={18} color={tw.gray700} />
              <Text style={[styles.smallText, { color: tw.gray700 }]}>No Show</Text>
            </Press>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: HT.bg },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { flex: 1, fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  invoiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#0a0a0a' },
  invoiceText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(700) },
  invoiceCard: { width: '100%', maxWidth: 768, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...shadow('2xl') },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  statusPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusText: { fontSize: 10, lineHeight: 15, letterSpacing: 0.25, textTransform: 'uppercase', ...poppins(700) },
  propImg: { width: 64, height: 64, backgroundColor: tw.gray100, borderRadius: 12, overflow: 'hidden' },
  propName: { fontSize: 16, lineHeight: 20, color: tw.slate900, ...poppins(900) },
  typeChip: { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: tw.gray100, borderRadius: 4 },
  typeText: { fontSize: 9, lineHeight: 13.5, color: tw.gray500, ...poppins(700) },
  loc: { flexShrink: 1, maxWidth: 150, fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(500) },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  tile: { padding: 10, backgroundColor: tw.gray50, borderRadius: 12 },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileText: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(600) },
  dateText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  guests: { marginTop: 12, padding: 12, backgroundColor: tw.gray50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: tw.gray100 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payLabel: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  payPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 8 }, // the web's actions grid sits outside the max-w-2xl px-4 wrapper, edge to edge
  bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#000', paddingVertical: 16, borderRadius: 12, ...shadow('lg') },
  bigText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) },
  paidBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: tw.green600, paddingVertical: 12, borderRadius: 12, ...shadow('lg') },
  noShowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, paddingVertical: 12, borderRadius: 12 },
  smallText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) },
});

export default PartnerBookingDetail;
