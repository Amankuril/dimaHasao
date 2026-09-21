import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, EmptyState, StatusPill, currency, shortDate } from '../components/ui';
import toast from 'react-hot-toast';

const FILTERS = ['all', 'pending', 'confirmed', 'ongoing', 'completed', 'cancelled'];

/**
 * Where a booking may go next, mirroring the server's own table. Kept here so
 * the panel only offers transitions the API will accept, rather than showing
 * buttons that fail.
 */
const NEXT_STATUS = {
  pending: ['cancelled'],
  confirmed: ['ongoing', 'no_show', 'cancelled'],
  ongoing: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

const STATUS_LABEL = {
  ongoing: 'Start trip',
  completed: 'Complete',
  no_show: 'No show',
  cancelled: 'Cancel',
};

const Bookings = () => {
  const [params, setParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const status = params.get('status') || 'all';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getBookings({ status });
      setBookings(data.bookings || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  /*
   * Cancelling asks for a reason, because the traveller is told what it was and
   * "Cancelled" on its own answers nothing. `window.confirm` is deliberately
   * not used anywhere in these panels — it is suppressed in embedded browsers,
   * where it silently returns false and the action looks broken.
   */
  const act = async (booking, next) => {
    const reason =
      next === 'cancelled'
        ? window.prompt(`Why is ${booking.bookingId} being cancelled?`)
        : undefined;
    if (next === 'cancelled' && !String(reason || '').trim()) return;

    try {
      setBusyId(booking._id);
      if (next === 'cancelled') {
        await adminService.cancelBooking(booking._id, reason.trim());
        toast.success('Booking cancelled');
      } else {
        await adminService.updateBookingStatus(booking._id, next);
        toast.success(`Booking marked ${next.replace('_', ' ')}`);
      }
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this booking');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bookings"
        subtitle="Every trip booked across the district."
        action={
          <button type="button" onClick={load} className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50" aria-label="Refresh">
            <RefreshCw size={14} />
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <button key={value} type="button" onClick={() => setParams(value === 'all' ? {} : { status: value })}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors ${
              status === value ? 'bg-neutral-950 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {value}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[64rem]">
            <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="p-4 font-semibold">Booking</th>
                <th className="p-4 font-semibold">Package</th>
                <th className="p-4 font-semibold">Travel</th>
                <th className="p-4 font-semibold text-right">Total</th>
                <th className="p-4 font-semibold text-right">Advance</th>
                <th className="p-4 font-semibold text-right">Balance</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="8"><Spinner /></td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan="8"><EmptyState message="No bookings yet." /></td></tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50/60">
                    <td className="p-4">
                      <p className="font-mono text-[11px] font-bold text-gray-900">{b.bookingId}</p>
                      <p className="text-[10px] text-gray-400">{b.travellerContact?.name || '—'}</p>
                    </td>
                    <td className="p-4 text-xs text-gray-700">{(b.packageId || {}).title || '—'}</td>
                    <td className="p-4 text-xs text-gray-600">
                      <p>{shortDate(b.travelDate)}</p>
                      <p className="text-[10px] text-gray-400">{b.totalTravellers} traveller(s)</p>
                    </td>
                    <td className="p-4 text-right font-bold text-gray-900">{currency(b.totalAmount)}</td>
                    <td className="p-4 text-right text-gray-700">{currency(b.advanceAmount)}</td>
                    <td className="p-4 text-right text-gray-700">
                      {b.balanceDue > 0 ? (
                        <span className={b.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}>
                          {currency(b.balanceDue)}
                          <span className="block text-[9px] uppercase font-bold">
                            {b.paymentStatus === 'paid' ? 'collected' : 'due'}
                          </span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-4">
                      <StatusPill status={b.bookingStatus} />
                      <span className="block mt-1"><StatusPill status={b.paymentStatus} /></span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {(NEXT_STATUS[b.bookingStatus] || []).map((next) => (
                          <button
                            key={next}
                            type="button"
                            disabled={busyId === b._id}
                            onClick={() => act(b, next)}
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                              next === 'cancelled'
                                ? 'border-red-200 text-red-700 hover:bg-red-50'
                                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {STATUS_LABEL[next] || next}
                          </button>
                        ))}
                        {!(NEXT_STATUS[b.bookingStatus] || []).length && (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Bookings;
