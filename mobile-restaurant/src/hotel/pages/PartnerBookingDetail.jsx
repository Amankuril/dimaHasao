import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  Calendar, User, Phone, Mail, MapPin,
  CreditCard, CheckCircle,
  AlertTriangle, LogIn, LogOut, FileText, Printer, X,
} from 'lucide-react-native';
import Img from '../../components/Img';
import { Button, Card, IconButton, StatusBadge } from '../../components/ds';
import HeritageHeader from '../../components/HeritageHeader';
import { useNavigate, useParams } from '../../lib/webRouter';
import { confirm, toast } from '../../lib/notify';
import { color, elevation, radii, space, type } from '../../theme';
import { bookingService } from '../services/apiService';
import { BookingStatusBadge, InfoTile, KeyValue, PageLoader, PinnedBar, sentence, ui } from '../components/dashboard/partnerUi';

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
    <View style={{ backgroundColor: color.surface }}>
      <View style={inv.bar}>
        <Text style={inv.barTitle}>Invoice</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Button title="Print / Save PDF" icon={Printer} size="sm" fullWidth={false} onPress={printInvoice} style={{ minHeight: 44 }} />
          {onClose ? <IconButton icon={X} label="Close invoice" onPress={onClose} iconColor={color.textSecondary} /> : null}
        </View>
      </View>

      <View style={{ padding: space.xl }}>
        <View style={inv.head}>
          <View>
            <Text style={inv.kicker}>Tax invoice</Text>
            <Text style={inv.number}>{invoice.invoiceNumber}</Text>
            <Text style={inv.small}>Issued {shortDate(invoice.issuedAt)}</Text>
            <Text style={inv.small}>Booking {invoice.bookingId}</Text>
          </View>
          <View style={{ marginTop: space.lg }}>
            <Text style={inv.seller}>{seller?.name}</Text>
            {seller?.type ? <Text style={inv.kicker}>{seller.type}</Text> : null}
            {addressLine(seller?.address) ? <Text style={[inv.small, { maxWidth: 256 }]}>{addressLine(seller.address)}</Text> : null}
            {seller?.contactNumber ? <Text style={inv.small}>{seller.contactNumber}</Text> : null}
          </View>
        </View>

        <View style={inv.two}>
          <View>
            <Text style={[inv.kicker, { marginBottom: space.xs }]}>Billed to</Text>
            <Text style={inv.bold}>{buyer?.name || 'Guest'}</Text>
            {buyer?.phone ? <Text style={inv.small}>{buyer.phone}</Text> : null}
            {buyer?.email ? <Text style={inv.small}>{buyer.email}</Text> : null}
          </View>
          <View>
            <Text style={[inv.kicker, { marginBottom: space.xs }]}>Stay</Text>
            <Text style={inv.stay}>
              {shortDate(stay?.checkInDate)} — {shortDate(stay?.checkOutDate)}
            </Text>
            <Text style={inv.small}>
              {stay?.totalNights} night{stay?.totalNights === 1 ? '' : 's'}
              {stay?.roomType ? ` · ${stay.roomType}` : ''}
            </Text>
            {stay?.adults != null || stay?.children != null ? (
              <Text style={inv.small}>
                {stay.adults || 0} adult{stay.adults === 1 ? '' : 's'}
                {stay.children ? `, ${stay.children} child${stay.children === 1 ? '' : 'ren'}` : ''}
              </Text>
            ) : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: space.xl }}>
          <View style={{ minWidth: 448 }}>
            <View style={[inv.tr, { borderBottomWidth: 1, borderBottomColor: color.border, paddingBottom: space.sm }]}>
              <Text style={[inv.th, { flex: 2.4 }]}>Description</Text>
              <Text style={[inv.th, { flex: 1.2 }]}>Date</Text>
              <Text style={[inv.th, { flex: 1, textAlign: 'right' }]}>Rate</Text>
              <Text style={[inv.th, { flex: 0.6, textAlign: 'right' }]}>Qty</Text>
              <Text style={[inv.th, { flex: 1.2, textAlign: 'right' }]}>Amount</Text>
            </View>
            {lineItems.map((item, index) => (
              <View key={index} style={[inv.tr, { paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border }]}>
                <Text style={[inv.td, { flex: 2.4, paddingRight: space.md }]}>{item.description}</Text>
                <Text style={[inv.td, { flex: 1.2, ...type.caption, color: color.textMuted }]}>{item.date ? shortDate(item.date) : '—'}</Text>
                <Text style={[inv.td, { flex: 1, textAlign: 'right' }]}>{rupees(item.rate)}</Text>
                <Text style={[inv.td, { flex: 0.6, textAlign: 'right' }]}>{item.units}</Text>
                <Text style={[inv.td, type.bodyStrong, { flex: 1.2, textAlign: 'right' }]}>{rupees(item.amount)}</Text>
              </View>
            ))}
            {lineItems.length === 0 ? <Text style={[inv.small, { paddingVertical: space.xl, textAlign: 'center' }]}>No line items recorded for this booking.</Text> : null}
          </View>
        </ScrollView>

        <View style={{ borderTopWidth: 1, borderTopColor: color.border, paddingTop: space.xl, alignItems: 'flex-end' }}>
          <View style={{ width: '100%', maxWidth: 288, gap: space.sm }}>
            <KeyValue label="Subtotal" value={rupees(totals.subtotal)} />
            {totals.discount > 0 ? (
              <KeyValue
                label={`Discount${totals.couponCode ? ` (${totals.couponCode})` : ''}`}
                labelStyle={{ color: color.success }}
                value={`−${rupees(totals.discount)}`}
                valueStyle={{ color: color.success }}
              />
            ) : null}
            <KeyValue label={`GST @ ${totals.gstRate}%`} value={rupees(totals.taxes)} />
            <KeyValue
              label="Total"
              labelStyle={type.subheading}
              value={rupees(totals.total)}
              valueStyle={type.price}
              style={{ borderTopWidth: 1, borderTopColor: color.border, paddingTop: space.sm }}
            />
            <KeyValue
              label={totals.amountDue > 0 ? 'Amount due' : 'Paid in full'}
              labelStyle={type.small}
              value={totals.amountDue > 0 ? rupees(totals.amountDue) : rupees(0)}
              valueStyle={{ color: totals.amountDue > 0 ? color.warning : color.success }}
            />
          </View>
        </View>

        {settlement ? (
          <View style={inv.settle}>
            <Text style={[type.label, { color: color.textSecondary, marginBottom: space.xs }]}>Settlement (not shown on the guest&apos;s copy)</Text>
            <KeyValue label="Platform commission" value={rupees(settlement.commission)} />
            <KeyValue label="Partner payout" value={rupees(settlement.partnerPayout)} valueStyle={{ color: color.success }} />
          </View>
        ) : null}

        <Text style={[inv.small, { marginTop: space.xxl, textAlign: 'center' }]}>This is a computer-generated invoice and does not require a signature.</Text>
      </View>
    </View>
  );
};

const inv = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingLeft: space.xl, paddingRight: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  barTitle: { ...type.heading, color: color.text },
  head: { paddingBottom: space.xl, borderBottomWidth: 1, borderBottomColor: color.border },
  kicker: { ...type.overline, color: color.textMuted },
  number: { ...type.heading, fontSize: 22, lineHeight: 30, marginTop: space.xs, color: color.text },
  small: { ...type.caption, color: color.textMuted, marginTop: space.xxs },
  seller: { ...type.heading, color: color.text },
  two: { paddingVertical: space.xl, gap: space.xl, borderBottomWidth: 1, borderBottomColor: color.border },
  bold: { ...type.subheading, color: color.text },
  stay: { ...type.bodyStrong, color: color.text },
  tr: { flexDirection: 'row', alignItems: 'center' },
  th: { ...type.overline, color: color.textMuted },
  td: { ...type.body, color: color.text },
  settle: { marginTop: space.xl, padding: space.lg, gap: space.xs, backgroundColor: color.surfaceMuted, borderRadius: radii.md },
});

/* -------------------------- PartnerBookingDetail ------------------------- */

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
      <View style={styles.page}>
        <PageLoader />
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

  const half = canCheckIn || canCheckOut;
  const hasActions = canCheckIn || canCheckOut || canMarkPaid || canMarkNoShow;
  const adults = booking.guests?.adults || 1;
  const children = booking.guests?.children > 0 ? booking.guests.children : 0;
  const location =
    typeof property.address === 'object' && property.address
      ? `${property.address.city || ''}${property.address.city && property.address.area ? ', ' : ''}${property.address.area || ''}`
      : property.address || 'Location';

  return (
    <View style={styles.page}>
      <HeritageHeader title="Booking details" onBack={() => navigate('/hotel/partner/bookings')} />

      <Modal visible={Boolean(invoice)} transparent animationType="fade" onRequestClose={() => setInvoice(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: color.overlay }}>
          {/* A tap on the dim area closes (web: onClick on the overlay); the card swallows its own taps (stopPropagation). */}
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <Pressable
              style={{ flexGrow: 1, padding: space.lg, paddingTop: space.lg + insets.top, paddingBottom: space.lg + insets.bottom }}
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

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: (hasActions ? space.xxl : space.xxxl + insets.bottom) }]} showsVerticalScrollIndicator={false}>
        {/* Status + property */}
        <Card style={{ gap: space.md }}>
          <View style={styles.idRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.caption}>Booking ID</Text>
              <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>
                #{booking.bookingId || booking._id}
              </Text>
            </View>
            <BookingStatusBadge status={booking.bookingStatus} />
          </View>
          <View style={ui.divider} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={styles.propImg}>
              {property.images?.[0] ? (
                <Img source={{ uri: property.images[0] }} accessibilityLabel="property" style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <MapPin size={24} color={color.textDisabled} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.subheading, { color: color.text }]} numberOfLines={2}>
                {property.propertyName || 'Property Name'}
              </Text>
              <Text style={[type.small, { color: color.textMuted }]} numberOfLines={2}>
                {[sentence(pType), location].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Guest Info */}
        <Card style={{ gap: space.md }}>
          <View style={styles.cardHead}>
            <User size={18} color={color.primary} />
            <Text style={styles.cardTitle}>Guest details</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={styles.avatar}>
              <Text style={[type.subheading, { color: color.primary }]}>{user.name?.[0] || 'G'}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.subheading, { color: color.text }]} numberOfLines={1}>
                {user.name || 'Guest'}
              </Text>
              <Text style={[type.small, { color: color.textMuted }]}>Joined via app</Text>
            </View>
            {user.phone ? <IconButton icon={Phone} label={`Call ${user.name || 'guest'}`} variant="primary" onPress={() => Linking.openURL(`tel:${user.phone}`)} /> : null}
          </View>
          <View style={styles.tiles}>
            <Pressable onPress={() => user.phone && Linking.openURL(`tel:${user.phone}`)} accessibilityRole="button" accessibilityLabel={`Phone ${user.phone || 'not available'}`} style={{ flex: 1, minWidth: 0 }}>
              <InfoTile label="Phone" value={user.phone || 'N/A'} icon={Phone} numberOfLines={1} />
            </Pressable>
            <InfoTile label="Email" value={user.email || 'N/A'} icon={Mail} numberOfLines={1} />
          </View>
          <KeyValue
            label="Total guests"
            value={`${adults} adult${adults !== 1 ? 's' : ''}${children ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}`}
          />
        </Card>

        {/* Stay Info */}
        <Card style={{ gap: space.md }}>
          <View style={styles.cardHead}>
            <Calendar size={18} color={color.primary} />
            <Text style={styles.cardTitle}>Stay details</Text>
          </View>
          <View style={styles.tiles}>
            <InfoTile label={checkInLabel} value={booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : 'N/A'} />
            <InfoTile label={checkOutLabel} value={booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString() : 'N/A'} />
          </View>
          <View style={styles.tiles}>
            <InfoTile label="Room type" value={room.name || room.type || 'Standard'} style={{ flex: 1.4 }} />
            <InfoTile label="Stay" value={`${booking.totalNights} ${booking.totalNights === 1 ? 'night' : 'nights'} · ${booking.bookingUnit === 'entire' ? '1 unit' : '1 room'}`} />
          </View>
        </Card>

        {/* Payment/Price Info */}
        <Card style={{ gap: space.sm }}>
          <View style={[styles.cardHead, { marginBottom: space.xs }]}>
            <CreditCard size={18} color={color.primary} />
            <Text style={styles.cardTitle}>Payment & payout</Text>
          </View>
          <KeyValue label="Total amount (collect)" value={`₹${booking.totalAmount}`} valueStyle={type.price} />
          <KeyValue label="Partner payout (earnings)" value={`₹${booking.partnerPayout}`} valueStyle={{ color: color.success }} />
          <KeyValue
            label="Payment status"
            value={<StatusBadge label={booking.paymentStatus === 'paid' ? 'Paid' : 'Pay at hotel'} tone={booking.paymentStatus === 'paid' ? 'success' : 'warning'} />}
          />
          <Button
            title={invoiceLoading ? 'Loading…' : 'View invoice'}
            icon={FileText}
            variant="outline"
            loading={invoiceLoading}
            onPress={handleViewInvoice}
            style={{ marginTop: space.sm }}
          />
        </Card>
      </ScrollView>

      {/* Actions */}
      {hasActions ? (
        <PinnedBar style={styles.actions}>
          {canCheckIn && <Button title={`${checkInLabel} guest`} icon={LogIn} size="lg" onPress={handleCheckIn} style={{ width: '100%' }} />}

          {canCheckOut && <Button title={`${checkOutLabel} guest`} icon={LogOut} size="lg" onPress={handleCheckOut} style={{ width: '100%' }} />}

          {canMarkPaid && (
            <Button
              title="Mark paid"
              icon={CheckCircle}
              variant={half ? 'secondary' : 'primary'}
              onPress={handleMarkPaid}
              style={{ flexGrow: 1, flexBasis: half ? '45%' : '100%' }}
            />
          )}

          {canMarkNoShow && (
            <Button title="No show" icon={AlertTriangle} variant="dangerSoft" onPress={handleNoShow} style={{ flexGrow: 1, flexBasis: half ? '45%' : '100%' }} />
          )}
        </PinnedBar>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, gap: space.md },
  invoiceCard: { width: '100%', maxWidth: 768, alignSelf: 'center', backgroundColor: color.surface, borderRadius: radii.lg, overflow: 'hidden', ...elevation.sheet },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  caption: { ...type.caption, color: color.textMuted },
  propImg: { width: 64, height: 64, backgroundColor: color.surfaceMuted, borderRadius: radii.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardTitle: { ...type.subheading, color: color.text },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: space.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
});

export default PartnerBookingDetail;
