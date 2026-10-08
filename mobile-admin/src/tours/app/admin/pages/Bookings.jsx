/* Ported from Frontend/src/modules/Tours/app/admin/pages/Bookings.jsx (tools/port.js first pass). */
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from '../../../../lib/webRouter';
import { RefreshCw } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, EmptyState, StatCard, StatusPill, currency, shortDate } from '../components/ui';
import { toast } from '../../../../lib/notify';
import { Button, Div, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import usePrompt from '../components/usePrompt';
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
  const [promptDialog, prompt] = usePrompt();
  const status = params.get('status') || 'all';
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getBookings({
        status,
      });
      setBookings(data.bookings || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    load();
  }, [load]);

  /*
   * Cancelling asks for a reason, because the traveller is told what it was and
   * "Cancelled" on its own answers nothing. `window.confirm` is deliberately
   * not used anywhere in these panels — it is suppressed in embedded browsers,
   * where it silently returns false and the action looks broken.
   */
  const act = async (booking, next) => {
    const reason = next === 'cancelled' ? await prompt(`Why is ${booking.bookingId} being cancelled?`) : undefined;
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
  const revenue = bookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  const pendingCount = bookings.filter((b) => b.bookingStatus === 'pending').length;
  const balanceDue = bookings.reduce((sum, b) => sum + (Number(b.balanceDue) || 0), 0);
  return (
    <ScrollDiv className="p-4 pb-20 space-y-4">
      <PageHeader
        title="Bookings"
        subtitle="Every trip booked across the district."
        action={
          <Button
            type="button"
            onClick={load}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            accessibilityLabel="Refresh"
          >
            <UiIcon as={RefreshCw} size={14} />
          </Button>
        }
      />

      {!loading && bookings.length > 0 && (
        <Div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label={`${status === 'all' ? 'Total' : status} bookings`} value={bookings.length} />
          <StatCard label="Pending" value={pendingCount} tone={pendingCount ? 'text-amber-600' : 'text-gray-900'} />
          <StatCard label="Total value" value={currency(revenue)} tone="text-[#0a4d2b]" />
          <StatCard label="Balance still due" value={currency(balanceDue)} />
        </Div>
      )}

      <Div className="flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <Button
            key={value}
            type="button"
            onClick={() =>
              setParams(
                value === 'all'
                  ? {}
                  : {
                      status: value,
                    },
              )
            }
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors ${status === value ? 'bg-[#0a4d2b] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {value}
          </Button>
        ))}
      </Div>

      <Div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <Table cols={[130, 180, 130, 110, 110, 110, 130, 200]} className="w-full text-left text-sm">
          <Thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
            <Tr>
              <Th className="p-4 font-semibold">Booking</Th>
              <Th className="p-4 font-semibold">Package</Th>
              <Th className="p-4 font-semibold">Travel</Th>
              <Th className="p-4 font-semibold text-right">Total</Th>
              <Th className="p-4 font-semibold text-right">Advance</Th>
              <Th className="p-4 font-semibold text-right">Balance</Th>
              <Th className="p-4 font-semibold">Status</Th>
              <Th className="p-4 font-semibold text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody className="divide-y divide-gray-100">
            {loading ? (
              <Tr>
                <Td colSpan="8">
                  <Spinner />
                </Td>
              </Tr>
            ) : bookings.length === 0 ? (
              <Tr>
                <Td colSpan="8">
                  <EmptyState message="No bookings yet." />
                </Td>
              </Tr>
            ) : (
              bookings.map((b) => (
                <Tr key={b._id} className="hover:bg-gray-50/60">
                  <Td className="p-4">
                    <P className="font-mono text-[11px] font-bold text-gray-900">{b.bookingId}</P>
                    <P className="text-[10px] text-gray-400">{b.travellerContact?.name || '—'}</P>
                  </Td>
                  <Td className="p-4 text-xs text-gray-700">{(b.packageId || {}).title || '—'}</Td>
                  <Td className="p-4 text-xs text-gray-600">
                    <P>{shortDate(b.travelDate)}</P>
                    <P className="text-[10px] text-gray-400">{b.totalTravellers} traveller(s)</P>
                  </Td>
                  <Td className="p-4 text-right font-bold text-gray-900">{currency(b.totalAmount)}</Td>
                  <Td className="p-4 text-right text-gray-700">{currency(b.advanceAmount)}</Td>
                  <Td className="p-4 text-right text-gray-700">
                    {b.balanceDue > 0 ? (
                      <Div className="items-end">
                        <P className={`text-right ${b.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>{currency(b.balanceDue)}</P>
                        <P className={`text-[9px] uppercase font-bold ${b.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {b.paymentStatus === 'paid' ? 'collected' : 'due'}
                        </P>
                      </Div>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td className="p-4">
                    <Div className="flex-row">
                      <StatusPill status={b.bookingStatus} />
                    </Div>
                    <Div className="mt-1 flex-row">
                      <StatusPill status={b.paymentStatus} />
                    </Div>
                  </Td>
                  <Td className="p-4">
                    <Div className="flex flex-wrap justify-end gap-1.5">
                      {(NEXT_STATUS[b.bookingStatus] || []).map((next) => (
                        <Button
                          key={next}
                          type="button"
                          disabled={busyId === b._id}
                          onClick={() => act(b, next)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${next === 'cancelled' ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                          {STATUS_LABEL[next] || next}
                        </Button>
                      ))}
                      {!(NEXT_STATUS[b.bookingStatus] || []).length && <Span className="text-[11px] text-gray-300">—</Span>}
                    </Div>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Div>
      {promptDialog}
    </ScrollDiv>
  );
};
export default Bookings;
