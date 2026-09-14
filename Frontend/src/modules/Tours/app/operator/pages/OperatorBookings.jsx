import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import operatorService from '../../../services/operatorService';
import toast from 'react-hot-toast';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const shortDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const FILTERS = ['all', 'confirmed', 'ongoing', 'completed', 'cancelled'];

const OperatorBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  // Collecting cash is a claim about the real world, so it asks twice. Inline
  // rather than window.confirm, which some embedded browsers suppress outright.
  const [confirmingId, setConfirmingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await operatorService.getBookings(status === 'all' ? undefined : status);
      setBookings(data.bookings || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const collect = async (booking) => {
    if (confirmingId !== booking._id) return setConfirmingId(booking._id);
    try {
      setBusyId(booking._id);
      await operatorService.collectBalance(booking._id);
      toast.success('Balance marked as collected');
      setConfirmingId(null);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this booking');
    } finally {
      setBusyId(null);
    }
  };

  const move = async (booking, next) => {
    try {
      setBusyId(booking._id);
      await operatorService.updateBookingStatus(booking._id, next);
      toast.success(`Booking marked ${next}`);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this booking');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">
          The balance shown is what you collect from the traveller on the day.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <button key={value} type="button" onClick={() => setStatus(value)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors ${
              status === value ? 'bg-[#0a4d2b] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {value}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin inline" /></p>
      ) : bookings.length === 0 ? (
        <div className="to-card p-10 text-center text-sm text-gray-400">No bookings here yet.</div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b._id} className="to-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900">{(b.packageId || {}).title || 'Package'}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{b.bookingId}</p>
                  <p className="text-xs text-gray-600 mt-2">
                    {shortDate(b.travelDate)} · {b.totalTravellers} traveller(s) · {b.pickupPoint || 'Pickup TBC'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {b.travellerContact?.name} · {b.travellerContact?.phone}
                  </p>
                  {b.specialRequest && (
                    <p className="text-xs text-gray-500 italic mt-1">“{b.specialRequest}”</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-gray-900">{currency(b.totalAmount)}</p>
                  <p className="text-[11px] text-gray-400">
                    {currency(b.advanceAmount)} paid online
                  </p>
                  {b.balanceDue > 0 && (
                    <p className={`text-xs font-bold mt-1 ${b.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {currency(b.balanceDue)} {b.paymentStatus === 'paid' ? 'collected' : 'to collect'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">
                  {String(b.bookingStatus).replace(/_/g, ' ')}
                </span>

                {b.paymentStatus === 'advance_paid' && (
                  <>
                    <button type="button" disabled={busyId === b._id} onClick={() => collect(b)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50 ${
                        confirmingId === b._id
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-[#0a4d2b] text-white hover:bg-[#06381e]'
                      }`}>
                      {confirmingId === b._id
                        ? `Yes — I have the ${currency(b.balanceDue)}`
                        : 'Mark balance collected'}
                    </button>
                    {confirmingId === b._id && (
                      <button type="button" onClick={() => setConfirmingId(null)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-gray-500 hover:bg-gray-50">
                        Cancel
                      </button>
                    )}
                  </>
                )}
                {b.bookingStatus === 'confirmed' && (
                  <button type="button" disabled={busyId === b._id} onClick={() => move(b, 'ongoing')}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    Start trip
                  </button>
                )}
                {b.bookingStatus === 'ongoing' && (
                  <button type="button" disabled={busyId === b._id} onClick={() => move(b, 'completed')}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    Mark completed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OperatorBookings;
