import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, EmptyState, StatusPill, currency, shortDate } from '../components/ui';
import toast from 'react-hot-toast';

const FILTERS = ['all', 'pending', 'confirmed', 'ongoing', 'completed', 'cancelled'];

const Bookings = () => {
  const [params, setParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7"><Spinner /></td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan="7"><EmptyState message="No bookings yet." /></td></tr>
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
