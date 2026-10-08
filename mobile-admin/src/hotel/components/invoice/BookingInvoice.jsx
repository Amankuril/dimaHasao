/* Ported from Frontend/src/modules/Hotel/components/invoice/BookingInvoice.jsx (tools/port.js first pass). */
/**
 * Printable booking invoice.
 *
 * The scope of work asks for a digital invoice on every hotel booking. The
 * server builds the figures (see services/invoiceService.js) — this only lays
 * them out and adds a print action, which is also how a guest saves a PDF:
 * the browser's print dialog does it without shipping a PDF library.
 *
 * `settlement` is only present on the partner's and admin's copy, so the
 * commission block simply renders when it exists.
 */
import React from 'react';
import { Printer, X } from 'lucide-react-native';
import { Button, Div, H2, H3, P, Span, Strong, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../components/web';
import { printHtml } from '../../../lib/files';
const rupees = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const addressLine = (address) => {
  if (!address) return null;
  return [address.fullAddress, address.city, address.state, address.pincode].filter(Boolean).join(', ');
};
/**
 * The web prints the page with `window.print()`, and its @media print rules keep
 * only `#hotel-invoice` visible. There is no document to print here, so the same
 * block is rebuilt as HTML — same fields, same order, same formatting — and
 * handed to the system print / save-as-PDF sheet.
 */
const invoiceHtml = (invoice) => {
  const { seller, buyer, stay, lineItems = [], totals = {}, settlement } = invoice;
  const guests =
    stay?.adults != null || stay?.children != null
      ? `${stay.adults || 0} adult${stay.adults === 1 ? '' : 's'}${stay.children ? `, ${stay.children} child${stay.children === 1 ? '' : 'ren'}` : ''}`
      : '';
  const rows = lineItems.length
    ? lineItems
        .map(
          (item) => `<tr>
            <td>${escapeHtml(item.description)}</td>
            <td class="muted">${escapeHtml(item.date ? shortDate(item.date) : '—')}</td>
            <td class="right">${escapeHtml(rupees(item.rate))}</td>
            <td class="right">${escapeHtml(item.units)}</td>
            <td class="right bold">${escapeHtml(rupees(item.amount))}</td>
          </tr>`,
        )
        .join('')
    : '<tr><td colspan="5" class="center muted">No line items recorded for this booking.</td></tr>';
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    body { font-family: -apple-system, Roboto, sans-serif; color: #111827; padding: 24px; }
    .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; }
    .num { font-size: 22px; font-weight: 800; margin: 4px 0; }
    .muted { color: #6b7280; font-size: 11px; }
    .row { display: flex; justify-content: space-between; gap: 16px; }
    .block { border-bottom: 1px solid #e5e7eb; padding: 16px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 16px 0; }
    th { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; text-align: left; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px; }
    td { padding: 6px 8px 6px 0; border-bottom: 1px solid #f9fafb; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .totals { margin-left: auto; width: 260px; font-size: 12px; }
    .totals div { display: flex; justify-content: space-between; padding: 3px 0; }
    .grand { border-top: 1px solid #e5e7eb; font-size: 14px; font-weight: 800; }
    .settle { margin-top: 20px; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 14px; font-size: 12px; }
    .foot { margin-top: 28px; font-size: 9px; color: #9ca3af; text-align: center; }
  </style></head><body>
    <div class="row block">
      <div>
        <div class="label">Tax Invoice</div>
        <div class="num">${escapeHtml(invoice.invoiceNumber)}</div>
        <div class="muted">Issued ${escapeHtml(shortDate(invoice.issuedAt))}</div>
        <div class="muted">Booking ${escapeHtml(invoice.bookingId)}</div>
      </div>
      <div class="right">
        <div class="bold">${escapeHtml(seller?.name)}</div>
        ${seller?.type ? `<div class="label">${escapeHtml(seller.type)}</div>` : ''}
        ${addressLine(seller?.address) ? `<div class="muted">${escapeHtml(addressLine(seller.address))}</div>` : ''}
        ${seller?.contactNumber ? `<div class="muted">${escapeHtml(seller.contactNumber)}</div>` : ''}
      </div>
    </div>
    <div class="row block">
      <div>
        <div class="label">Billed to</div>
        <div class="bold">${escapeHtml(buyer?.name || 'Guest')}</div>
        ${buyer?.phone ? `<div class="muted">${escapeHtml(buyer.phone)}</div>` : ''}
        ${buyer?.email ? `<div class="muted">${escapeHtml(buyer.email)}</div>` : ''}
      </div>
      <div class="right">
        <div class="label">Stay</div>
        <div class="bold">${escapeHtml(shortDate(stay?.checkInDate))} — ${escapeHtml(shortDate(stay?.checkOutDate))}</div>
        <div class="muted">${escapeHtml(`${stay?.totalNights} night${stay?.totalNights === 1 ? '' : 's'}${stay?.roomType ? ` · ${stay.roomType}` : ''}`)}</div>
        ${guests ? `<div class="muted">${escapeHtml(guests)}</div>` : ''}
      </div>
    </div>
    <table>
      <thead><tr><th>Description</th><th>Date</th><th class="right">Rate</th><th class="right">Qty</th><th class="right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div><span class="muted">Subtotal</span><span class="bold">${escapeHtml(rupees(totals.subtotal))}</span></div>
      ${totals.discount > 0 ? `<div><span>Discount${totals.couponCode ? ` (${escapeHtml(totals.couponCode)})` : ''}</span><span class="bold">−${escapeHtml(rupees(totals.discount))}</span></div>` : ''}
      <div><span class="muted">GST @ ${escapeHtml(totals.gstRate)}%</span><span class="bold">${escapeHtml(rupees(totals.taxes))}</span></div>
      <div class="grand"><span>Total</span><span>${escapeHtml(rupees(totals.total))}</span></div>
      <div><span class="muted">${totals.amountDue > 0 ? 'Amount due' : 'Paid in full'}</span><span class="bold">${escapeHtml(totals.amountDue > 0 ? rupees(totals.amountDue) : rupees(0))}</span></div>
    </div>
    ${
      settlement
        ? `<div class="settle">
            <div class="label">Settlement (not shown on the guest's copy)</div>
            <div>Platform commission <span class="bold">${escapeHtml(rupees(settlement.commission))}</span></div>
            <div>Partner payout <span class="bold">${escapeHtml(rupees(settlement.partnerPayout))}</span></div>
          </div>`
        : ''
    }
    <div class="foot">This is a computer-generated invoice and does not require a signature.</div>
  </body></html>`;
};
const BookingInvoice = ({ invoice, onClose }) => {
  if (!invoice) return null;
  const { seller, buyer, stay, lineItems = [], totals = {}, settlement } = invoice;
  return (
    <Div className="bg-white">
      <Div className="invoice-no-print flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
        <H3 className="font-bold text-gray-900">Invoice</H3>
        <Div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => printHtml(invoiceHtml(invoice))}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors"
          >
            <UiIcon as={Printer} size={14} /> Print / Save PDF
          </Button>
          {onClose && (
            <Button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              accessibilityLabel="Close invoice"
            >
              <UiIcon as={X} size={16} />
            </Button>
          )}
        </Div>
      </Div>

      <Div nativeID="hotel-invoice" className="p-6 md:p-8 text-gray-900">
        <Div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-gray-200">
          <Div>
            <P className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tax Invoice</P>
            <H2 className="text-2xl font-black mt-1">{invoice.invoiceNumber}</H2>
            <P className="text-xs text-gray-500 mt-1">Issued {shortDate(invoice.issuedAt)}</P>
            <P className="text-xs text-gray-500">Booking {invoice.bookingId}</P>
          </Div>
          <Div className="text-right">
            <P className="font-bold text-lg leading-tight">{seller?.name}</P>
            {seller?.type && <P className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{seller.type}</P>}
            {addressLine(seller?.address) && <P className="text-xs text-gray-500 mt-1 max-w-[16rem]">{addressLine(seller.address)}</P>}
            {seller?.contactNumber && <P className="text-xs text-gray-500">{seller.contactNumber}</P>}
          </Div>
        </Div>

        <Div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-gray-200">
          <Div>
            <P className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Billed to</P>
            <P className="font-bold">{buyer?.name || 'Guest'}</P>
            {buyer?.phone && <P className="text-xs text-gray-500">{buyer.phone}</P>}
            {buyer?.email && <P className="text-xs text-gray-500">{buyer.email}</P>}
          </Div>
          <Div className="sm:text-right">
            <P className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Stay</P>
            <P className="text-sm font-semibold">
              {shortDate(stay?.checkInDate)} — {shortDate(stay?.checkOutDate)}
            </P>
            <P className="text-xs text-gray-500">
              {stay?.totalNights} night{stay?.totalNights === 1 ? '' : 's'}
              {stay?.roomType ? ` · ${stay.roomType}` : ''}
            </P>
            {(stay?.adults != null || stay?.children != null) && (
              <P className="text-xs text-gray-500">
                {stay.adults || 0} adult{stay.adults === 1 ? '' : 's'}
                {stay.children ? `, ${stay.children} child${stay.children === 1 ? '' : 'ren'}` : ''}
              </P>
            )}
          </Div>
        </Div>

        <Div className="py-6">
          <Table cols={[200, 110, 100, 60, 110]} className="w-full text-sm">
            <Thead>
              <Tr className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <Th className="text-left pb-2">Description</Th>
                <Th className="text-left pb-2">Date</Th>
                <Th className="text-right pb-2">Rate</Th>
                <Th className="text-right pb-2">Qty</Th>
                <Th className="text-right pb-2">Amount</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-gray-50">
              {lineItems.map((item, index) => (
                <Tr key={index}>
                  <Td className="py-2 pr-3">{item.description}</Td>
                  <Td className="py-2 pr-3 text-gray-500 text-xs whitespace-nowrap">{item.date ? shortDate(item.date) : '—'}</Td>
                  <Td className="py-2 text-right whitespace-nowrap">{rupees(item.rate)}</Td>
                  <Td className="py-2 text-right">{item.units}</Td>
                  <Td className="py-2 text-right font-semibold whitespace-nowrap">{rupees(item.amount)}</Td>
                </Tr>
              ))}
              {lineItems.length === 0 && (
                <Tr>
                  <Td colSpan="5" className="py-6 text-center text-gray-400 text-xs">
                    No line items recorded for this booking.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Div>

        <Div className="flex justify-end border-t border-gray-200 pt-6">
          <Div className="w-full sm:w-72 space-y-2 text-sm">
            <Div className="flex justify-between">
              <Span className="text-gray-500">Subtotal</Span>
              <Span className="font-semibold">{rupees(totals.subtotal)}</Span>
            </Div>
            {totals.discount > 0 && (
              <Div className="flex justify-between text-emerald-700">
                <Span>Discount{totals.couponCode ? ` (${totals.couponCode})` : ''}</Span>
                <Span className="font-semibold">−{rupees(totals.discount)}</Span>
              </Div>
            )}
            <Div className="flex justify-between">
              <Span className="text-gray-500">GST @ {totals.gstRate}%</Span>
              <Span className="font-semibold">{rupees(totals.taxes)}</Span>
            </Div>
            <Div className="flex justify-between border-t border-gray-200 pt-2 text-base">
              <Span className="font-bold">Total</Span>
              <Span className="font-black">{rupees(totals.total)}</Span>
            </Div>
            <Div className="flex justify-between text-xs">
              <Span className="text-gray-500">{totals.amountDue > 0 ? 'Amount due' : 'Paid in full'}</Span>
              <Span className={`font-bold ${totals.amountDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {totals.amountDue > 0 ? rupees(totals.amountDue) : rupees(0)}
              </Span>
            </Div>
          </Div>
        </Div>

        {settlement && (
          <Div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <P className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{"Settlement (not shown on the guest's copy)"}</P>
            <Div className="flex flex-wrap gap-6 text-sm">
              <Span>
                Platform commission <Strong className="text-gray-900">{rupees(settlement.commission)}</Strong>
              </Span>
              <Span>
                Partner payout <Strong className="text-emerald-700">{rupees(settlement.partnerPayout)}</Strong>
              </Span>
            </Div>
          </Div>
        )}

        <P className="mt-8 text-[10px] text-gray-400 text-center">This is a computer-generated invoice and does not require a signature.</P>
      </Div>
    </Div>
  );
};
export default BookingInvoice;
