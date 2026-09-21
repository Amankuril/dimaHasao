/**
 * One festival, from the admin side.
 *
 * What each category was configured with, where those seats went, and every
 * booking behind the numbers — including for festivals that have already
 * ended, which is exactly when someone needs the attendee list.
 *
 * "Booked" and "paid" are shown separately on purpose. A booking that exists
 * but has not been paid is holding a seat without having sold it, and an admin
 * deciding whether to release stock needs to see that gap rather than one
 * blended number.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

import festivalService from '../../../services/festivalService';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const when = (value) => (value
  ? new Date(value).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  : '—');

const STATUS_TONE = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  used: 'bg-sky-100 text-sky-700',
  cancelled: 'bg-gray-200 text-gray-600',
};

const LIFECYCLE_TONE = {
  live: 'bg-emerald-100 text-emerald-700',
  upcoming: 'bg-sky-100 text-sky-700',
  ended: 'bg-gray-200 text-gray-600',
  scheduled: 'bg-gray-100 text-gray-500',
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Unpaid' },
  { value: 'used', label: 'Checked in' },
  { value: 'cancelled', label: 'Cancelled' },
];

const FestivalDetail = ({ festivalId, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await festivalService.getFestivalSummary(festivalId, { status }));
    } catch (error) {
      toast.error(error.message || 'Could not load this festival');
    } finally {
      setLoading(false);
    }
  }, [festivalId, status]);

  useEffect(() => { load(); }, [load]);

  // Filtered in the browser: the list is one festival's bookings, so this is a
  // small array and a round trip per keystroke would be worse than useless.
  const query = search.trim().toLowerCase();
  /*
   * Cancelling a pass on the attendee's behalf — someone who cannot make it
   * rings the office rather than using the app. The endpoint releases the
   * seats it held, so the festival's remaining count corrects itself.
   */
  const cancelBooking = async (booking) => {
    const reason = window.prompt(`Why is ${booking.bookingId} being cancelled?`);
    if (!String(reason || '').trim()) return;

    try {
      setCancellingId(booking._id);
      await festivalService.cancelFestivalBooking(booking._id, reason.trim());
      toast.success('Pass cancelled and seats released');
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not cancel this pass');
    } finally {
      setCancellingId(null);
    }
  };

  const bookings = (data?.bookings || []).filter((b) => {
    if (!query) return true;
    const user = b.userId || {};
    return [b.bookingId, b.qrCode, b.ticketCategoryName, user.name, user.phone,
      b.attendee?.name, b.attendee?.phone]
      .some((v) => String(v || '').toLowerCase().includes(query));
  });

  if (loading && !data) {
    return <div className="py-20 grid place-items-center"><Loader2 className="animate-spin text-gray-400" /></div>;
  }
  if (!data) return null;

  const { festival, categories, totals } = data;

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft size={15} /> All festivals
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-wrap items-start gap-5">
        <img
          src={festival.heroImage}
          alt=""
          className="w-28 h-24 rounded-xl object-cover bg-gray-100 shrink-0"
          onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
        />

        <div className="flex-1 basis-64 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">{festival.name}</h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${LIFECYCLE_TONE[festival.status] || ''}`}>
              {festival.status}
            </span>
            {!festival.isActive && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700">hidden</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{festival.dates}{festival.venue ? ` · ${festival.venue}` : ''}</p>

          <p className={`mt-2.5 inline-block text-xs font-semibold rounded-lg px-2.5 py-1.5 ${
            festival.bookingOpen ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
          }`}>
            {festival.bookingOpen
              ? `Booking open${festival.bookingClosesAt ? ` until ${when(festival.bookingClosesAt)}` : ''}`
              : festival.bookingClosedReason}
          </p>
        </div>
      </div>

      {/* Seats at a glance */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Seats configured', value: totals.configuredSeats },
          { label: 'Available', value: totals.availableSeats },
          { label: 'Paid', value: totals.paidSeats },
          { label: 'Held (unpaid)', value: totals.heldSeats },
          { label: 'Revenue', value: currency(totals.revenue) },
        ].map((card) => (
          <div key={card.label} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">{card.label}</p>
            <p className="text-xl font-black text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Per category */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <h3 className="font-bold text-gray-900 text-sm p-4 pb-3 border-b border-gray-100">Seats by category</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {['Category', 'Price', 'Seats', 'Booked', 'Paid', 'Held', 'Available', 'Revenue'].map((h, i) => (
                  <th key={h} className={`px-4 py-2.5 text-xs font-bold ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((c) => {
                const soldOut = c.availableSeats === 0;
                return (
                  <tr key={c._id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800">{c.name}</span>
                      {!c.isActive && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-gray-200 text-gray-600">closed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{currency(c.price)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{c.configuredSeats}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{c.bookedSeats}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{c.paidSeats}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{c.heldSeats || '—'}</td>
                    <td className={`px-4 py-3 text-right font-bold ${soldOut ? 'text-red-600' : 'text-gray-900'}`}>
                      {soldOut ? 'Sold out' : c.availableSeats}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{currency(c.revenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bookings */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">
            Bookings <span className="text-gray-400 font-semibold">({totals.bookings})</span>
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Booking ID, name or phone"
                className="pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] focus:ring-4 focus:ring-[#0a4d2b]/10 w-56"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b]"
            >
              {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>

        {bookings.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            {query || status !== 'all' ? 'No bookings match this filter.' : 'Nobody has booked yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[880px]">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {['Booking ID', 'Attendee', 'Category', 'Seats', 'Amount', 'Status', 'Pass', 'Booked on', ''].map((h, i) => (
                    <th key={h} className={`px-4 py-2.5 text-xs font-bold ${
                      ['Seats', 'Amount'].includes(h) ? 'text-right' : 'text-left'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => {
                  // The account that booked; the attendee named on the pass may
                  // differ when someone books for a friend.
                  const user = b.userId || {};
                  return (
                    <tr key={b._id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-gray-800">{b.bookingId}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">
                          {b.attendee?.name || user.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {b.attendee?.phone || user.phone || ''}
                          {user.name && b.attendee?.name && user.name !== b.attendee.name
                            ? ` · booked by ${user.name}`
                            : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{b.ticketCategoryName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{b.ticketCount}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{currency(b.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_TONE[b.bookingStatus] || ''}`}>
                          {b.bookingStatus}
                        </span>
                        {b.paymentStatus !== 'paid' && b.bookingStatus !== 'cancelled' && (
                          <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">
                            unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{b.qrCode || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{when(b.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {b.bookingStatus === 'cancelled' ? (
                          <span className="text-[11px] text-gray-300">—</span>
                        ) : (
                          <button
                            type="button"
                            disabled={cancellingId === b._id}
                            onClick={() => cancelBooking(b)}
                            className="rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FestivalDetail;
