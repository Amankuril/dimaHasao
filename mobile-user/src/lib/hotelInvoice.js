import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import apiClient from '../api/client';

/*
 * The guest's copy of a hotel booking's tax invoice, as a PDF on the share
 * sheet. Figures come from GET /hotel/bookings/:id/invoice (the same invoice
 * the partner app prints); the server leaves out the settlement block for the
 * guest.
 */

const rupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const addressLine = (address) =>
  address ? [address.fullAddress, address.city, address.state, address.pincode].filter(Boolean).join(', ') : '';

const invoiceHtml = (invoice) => {
  const { seller, buyer, stay, lineItems = [], totals = {} } = invoice;
  const rows = lineItems.length
    ? lineItems
        .map(
          (item) =>
            `<tr><td>${esc(item.description)}</td><td class="g">${item.date ? shortDate(item.date) : '—'}</td><td class="r">${rupees(item.rate)}</td><td class="r">${esc(item.units)}</td><td class="r b">${rupees(item.amount)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="5" class="c g">No line items recorded for this booking.</td></tr>';
  const guests =
    stay?.adults != null || stay?.children != null
      ? `<p class="g s">${stay.adults || 0} adult${stay.adults === 1 ? '' : 's'}${stay.children ? `, ${stay.children} child${stay.children === 1 ? '' : 'ren'}` : ''}</p>`
      : '';
  const sellerAddress = addressLine(seller?.address);
  return `<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>
body{font-family:Helvetica,Arial,sans-serif;color:#111827;padding:24px}
.g{color:#6b7280}.s{font-size:12px;margin:2px 0}.r{text-align:right}.b{font-weight:700}.c{text-align:center}
.h{display:flex;justify-content:space-between;border-bottom:1px solid #e5e7eb;padding-bottom:24px}
.k{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9ca3af}
table{width:100%;border-collapse:collapse;font-size:13px;margin:24px 0}th{font-size:10px;text-transform:uppercase;color:#9ca3af;text-align:left;border-bottom:1px solid #f3f4f6;padding-bottom:8px}
td{padding:8px 4px;border-bottom:1px solid #f9fafb}.t{margin-left:auto;width:280px;font-size:14px}.t div{display:flex;justify-content:space-between;margin:6px 0}
</style></head><body>
<div class="h"><div><div class="k">Tax Invoice</div><h2 style="margin:4px 0">${esc(invoice.invoiceNumber)}</h2><p class="g s">Issued ${shortDate(invoice.issuedAt)}</p><p class="g s">Booking ${esc(invoice.bookingId)}</p></div>
<div style="text-align:right"><b>${esc(seller?.name)}</b>${seller?.type ? `<div class="k">${esc(seller.type)}</div>` : ''}${sellerAddress ? `<p class="g s">${esc(sellerAddress)}</p>` : ''}${seller?.contactNumber ? `<p class="g s">${esc(seller.contactNumber)}</p>` : ''}</div></div>
<div style="display:flex;justify-content:space-between;padding:24px 0;border-bottom:1px solid #e5e7eb"><div><div class="k">Billed to</div><b>${esc(buyer?.name || 'Guest')}</b>${buyer?.phone ? `<p class="g s">${esc(buyer.phone)}</p>` : ''}${buyer?.email ? `<p class="g s">${esc(buyer.email)}</p>` : ''}</div>
<div style="text-align:right"><div class="k">Stay</div><b>${shortDate(stay?.checkInDate)} — ${shortDate(stay?.checkOutDate)}</b><p class="g s">${esc(stay?.totalNights)} night${stay?.totalNights === 1 ? '' : 's'}${stay?.roomType ? ` · ${esc(stay.roomType)}` : ''}</p>${guests}</div></div>
<table><thead><tr><th>Description</th><th>Date</th><th class="r">Rate</th><th class="r">Qty</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="t"><div><span class="g">Subtotal</span><b>${rupees(totals.subtotal)}</b></div>
${totals.discount > 0 ? `<div style="color:#047857"><span>Discount${totals.couponCode ? ` (${esc(totals.couponCode)})` : ''}</span><b>−${rupees(totals.discount)}</b></div>` : ''}
<div><span class="g">GST @ ${esc(totals.gstRate)}%</span><b>${rupees(totals.taxes)}</b></div>
<div style="border-top:1px solid #e5e7eb;padding-top:8px;font-size:16px"><b>Total</b><b>${rupees(totals.total)}</b></div>
<div style="font-size:12px"><span class="g">${totals.amountDue > 0 ? 'Amount due' : 'Paid in full'}</span><b style="color:${totals.amountDue > 0 ? '#b45309' : '#047857'}">${rupees(totals.amountDue > 0 ? totals.amountDue : 0)}</b></div></div>
<p class="g c" style="font-size:10px;margin-top:32px">This is a computer-generated invoice and does not require a signature.</p>
</body></html>`;
};

/** Fetches the invoice for a booking (its database id) and opens the share sheet with the PDF. */
export async function shareHotelInvoice(bookingRef) {
  const res = await apiClient.get(`/hotel/bookings/${encodeURIComponent(bookingRef)}/invoice`);
  const invoice = res?.data?.invoice || res?.data?.data?.invoice;
  if (!invoice) throw new Error('Invoice not available');
  const { uri } = await Print.printToFileAsync({ html: invoiceHtml(invoice) });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Invoice ${invoice.invoiceNumber || ''}`.trim(), UTI: 'com.adobe.pdf' });
}
