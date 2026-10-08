/* Ported from Frontend/src/modules/Tours/app/admin/pages/Bookings.jsx (tools/port.js first pass). */
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from '../../../../lib/webRouter';
import { RefreshCw } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { currency, shortDate } from '../components/ui';
import {
  AdminPage,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
  Cell,
  DataTable,
  EmptyState,
  PageHeader,
  Row,
  StatCard,
  StatGrid,
  StatusBadge,
  TBody,
  THead,
  TableSkeleton,
  Toolbar,
} from '../../../../admin/ui';
import { toast } from '../../../../lib/notify';
import { Button, Div, P, Span, Icon as UiIcon } from '../../../../components/web';
import usePrompt from '../components/usePrompt';
const FILTERS = ['all', 'pending', 'confirmed', 'ongoing', 'completed', 'cancelled'];
const COLS = [130, 170, 130, 110, 110, 120, 130, 200];

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
    <AdminPage maxWidth={1200}>
      <PageHeader
        title="Bookings"
        subtitle="Every trip booked across the district."
        breadcrumb={[{ label: 'Tours' }, { label: 'Bookings' }]}
        actions={
          <Button type="button" onClick={load} className={BTN_SECONDARY} accessibilityLabel="Refresh">
            <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Refresh</Span>
          </Button>
        }
      />

      {!loading && bookings.length > 0 && (
        <StatGrid className="mb-4">
          <StatCard label={`${status === 'all' ? 'Total' : status} bookings`} value={bookings.length} />
          <StatCard label="Pending" value={pendingCount} tone={pendingCount ? 'warning' : 'info'} />
          <StatCard label="Total value" value={currency(revenue)} tone="success" />
          <StatCard label="Balance still due" value={currency(balanceDue)} />
        </StatGrid>
      )}

      <Toolbar>
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
            className={`h-11 px-4 rounded-full items-center justify-center ${status === value ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
          >
            <Span className={`text-sm font-semibold ${status === value ? 'text-white' : 'text-slate-700'}`}>{value}</Span>
          </Button>
        ))}
      </Toolbar>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          message={status === 'all' ? 'Trips booked in the travellers’ app appear here.' : `No ${status} bookings in this period.`}
          actionLabel="Reload"
          onAction={load}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['Booking', 'Package', 'Travel', 'Total', 'Advance', 'Balance', 'Status', 'Actions']} />
          <TBody>
            {bookings.map((b, i, a) => (
              <Row key={b._id} last={i === a.length - 1}>
                <Cell width={COLS[0]}>
                  <P className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                    {b.bookingId}
                  </P>
                  <P className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                    {b.travellerContact?.name || '—'}
                  </P>
                </Cell>
                <Cell width={COLS[1]}>{(b.packageId || {}).title || '—'}</Cell>
                <Cell width={COLS[2]}>
                  <P className="text-sm text-slate-700">{shortDate(b.travelDate)}</P>
                  <P className="text-xs text-slate-500 mt-0.5">{b.totalTravellers} traveller(s)</P>
                </Cell>
                <Cell width={COLS[3]} align="right">
                  <P className="text-sm font-semibold text-slate-900">{currency(b.totalAmount)}</P>
                </Cell>
                <Cell width={COLS[4]} align="right">
                  <P className="text-sm text-slate-700">{currency(b.advanceAmount)}</P>
                </Cell>
                <Cell width={COLS[5]} align="right">
                  {b.balanceDue > 0 ? (
                    <Div className="items-end gap-1">
                      <P className="text-sm font-semibold text-slate-900">{currency(b.balanceDue)}</P>
                      <StatusBadge
                        status={b.paymentStatus === 'paid' ? 'paid' : 'pending'}
                        label={b.paymentStatus === 'paid' ? 'collected' : 'due'}
                      />
                    </Div>
                  ) : (
                    <P className="text-sm text-slate-400">—</P>
                  )}
                </Cell>
                <Cell width={COLS[6]}>
                  <Div className="gap-1">
                    <StatusBadge status={b.bookingStatus} label={String(b.bookingStatus || '').replace(/_/g, ' ')} />
                    <StatusBadge status={b.paymentStatus} label={String(b.paymentStatus || '').replace(/_/g, ' ')} />
                  </Div>
                </Cell>
                <Cell width={COLS[7]}>
                  <Div className="flex-row flex-wrap gap-2">
                    {(NEXT_STATUS[b.bookingStatus] || []).map((next) => (
                      <Button
                        key={next}
                        type="button"
                        disabled={busyId === b._id}
                        onClick={() => act(b, next)}
                        className={`h-11 px-3 rounded-lg items-center justify-center bg-white disabled:opacity-50 ${next === 'cancelled' ? 'border border-red-200' : 'border border-slate-300'}`}
                      >
                        <Span className={`text-sm font-semibold ${next === 'cancelled' ? 'text-red-600' : 'text-slate-700'}`}>
                          {STATUS_LABEL[next] || next}
                        </Span>
                      </Button>
                    ))}
                    {!(NEXT_STATUS[b.bookingStatus] || []).length && <Span className="text-sm text-slate-400">—</Span>}
                  </Div>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}
      {promptDialog}
    </AdminPage>
  );
};
export default Bookings;
