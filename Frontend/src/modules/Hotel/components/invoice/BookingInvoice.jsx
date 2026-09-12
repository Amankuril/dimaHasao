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
import { Printer, X } from 'lucide-react';

const rupees = (value) =>
    `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const shortDate = (value) =>
    value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const addressLine = (address) => {
    if (!address) return null;
    return [address.fullAddress, address.city, address.state, address.pincode]
        .filter(Boolean)
        .join(', ');
};

const BookingInvoice = ({ invoice, onClose }) => {
    if (!invoice) return null;

    const { seller, buyer, stay, lineItems = [], totals = {}, settlement } = invoice;

    return (
        <div className="bg-white">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #hotel-invoice, #hotel-invoice * { visibility: visible; }
                    #hotel-invoice { position: absolute; inset: 0; margin: 0; padding: 24px; }
                    .invoice-no-print { display: none !important; }
                }
            `}</style>

            <div className="invoice-no-print flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Invoice</h3>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors"
                    >
                        <Printer size={14} /> Print / Save PDF
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Close invoice"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div id="hotel-invoice" className="p-6 md:p-8 text-gray-900">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-gray-200">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tax Invoice</p>
                        <h2 className="text-2xl font-black mt-1">{invoice.invoiceNumber}</h2>
                        <p className="text-xs text-gray-500 mt-1">Issued {shortDate(invoice.issuedAt)}</p>
                        <p className="text-xs text-gray-500">Booking {invoice.bookingId}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg leading-tight">{seller?.name}</p>
                        {seller?.type && (
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{seller.type}</p>
                        )}
                        {addressLine(seller?.address) && (
                            <p className="text-xs text-gray-500 mt-1 max-w-[16rem]">{addressLine(seller.address)}</p>
                        )}
                        {seller?.contactNumber && <p className="text-xs text-gray-500">{seller.contactNumber}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-gray-200">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Billed to</p>
                        <p className="font-bold">{buyer?.name || 'Guest'}</p>
                        {buyer?.phone && <p className="text-xs text-gray-500">{buyer.phone}</p>}
                        {buyer?.email && <p className="text-xs text-gray-500">{buyer.email}</p>}
                    </div>
                    <div className="sm:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Stay</p>
                        <p className="text-sm font-semibold">
                            {shortDate(stay?.checkInDate)} — {shortDate(stay?.checkOutDate)}
                        </p>
                        <p className="text-xs text-gray-500">
                            {stay?.totalNights} night{stay?.totalNights === 1 ? '' : 's'}
                            {stay?.roomType ? ` · ${stay.roomType}` : ''}
                        </p>
                        {(stay?.adults != null || stay?.children != null) && (
                            <p className="text-xs text-gray-500">
                                {stay.adults || 0} adult{stay.adults === 1 ? '' : 's'}
                                {stay.children ? `, ${stay.children} child${stay.children === 1 ? '' : 'ren'}` : ''}
                            </p>
                        )}
                    </div>
                </div>

                <div className="py-6 overflow-x-auto">
                    <table className="w-full text-sm min-w-[28rem]">
                        <thead>
                            <tr className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                                <th className="text-left pb-2">Description</th>
                                <th className="text-left pb-2">Date</th>
                                <th className="text-right pb-2">Rate</th>
                                <th className="text-right pb-2">Qty</th>
                                <th className="text-right pb-2">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {lineItems.map((item, index) => (
                                <tr key={index}>
                                    <td className="py-2 pr-3">{item.description}</td>
                                    <td className="py-2 pr-3 text-gray-500 text-xs whitespace-nowrap">
                                        {item.date ? shortDate(item.date) : '—'}
                                    </td>
                                    <td className="py-2 text-right whitespace-nowrap">{rupees(item.rate)}</td>
                                    <td className="py-2 text-right">{item.units}</td>
                                    <td className="py-2 text-right font-semibold whitespace-nowrap">{rupees(item.amount)}</td>
                                </tr>
                            ))}
                            {lineItems.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="py-6 text-center text-gray-400 text-xs">
                                        No line items recorded for this booking.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end border-t border-gray-200 pt-6">
                    <div className="w-full sm:w-72 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-semibold">{rupees(totals.subtotal)}</span>
                        </div>
                        {totals.discount > 0 && (
                            <div className="flex justify-between text-emerald-700">
                                <span>Discount{totals.couponCode ? ` (${totals.couponCode})` : ''}</span>
                                <span className="font-semibold">−{rupees(totals.discount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-500">GST @ {totals.gstRate}%</span>
                            <span className="font-semibold">{rupees(totals.taxes)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
                            <span className="font-bold">Total</span>
                            <span className="font-black">{rupees(totals.total)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">
                                {totals.amountDue > 0 ? 'Amount due' : 'Paid in full'}
                            </span>
                            <span className={`font-bold ${totals.amountDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {totals.amountDue > 0 ? rupees(totals.amountDue) : rupees(0)}
                            </span>
                        </div>
                    </div>
                </div>

                {settlement && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                            Settlement (not shown on the guest's copy)
                        </p>
                        <div className="flex flex-wrap gap-6 text-sm">
                            <span>
                                Platform commission{' '}
                                <strong className="text-gray-900">{rupees(settlement.commission)}</strong>
                            </span>
                            <span>
                                Partner payout{' '}
                                <strong className="text-emerald-700">{rupees(settlement.partnerPayout)}</strong>
                            </span>
                        </div>
                    </div>
                )}

                <p className="mt-8 text-[10px] text-gray-400 text-center">
                    This is a computer-generated invoice and does not require a signature.
                </p>
            </div>
        </div>
    );
};

export default BookingInvoice;
