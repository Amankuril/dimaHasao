/* Ported from Frontend/src/modules/Tours/app/admin/pages/FestivalDetail.jsx (tools/port.js first pass). */
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
import { ArrowLeft } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import festivalService from '../../../services/festivalService';
import {
  AdminPage,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
  Card,
  Cell,
  DataTable,
  EmptyState,
  ErrorState,
  INPUT,
  LoadingState,
  PageHeader,
  Row,
  SectionTitle,
  StatCard,
  StatGrid,
  StatusBadge,
  TBody,
  THead,
  Toolbar,
} from '../../../../admin/ui';
import { Button, Div, Img, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
import usePrompt from '../components/usePrompt';
const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const when = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';
const STATUS_TONE = {
  confirmed: 'success',
  pending: 'warning',
  used: 'info',
  cancelled: 'neutral',
};
const LIFECYCLE_TONE = {
  live: 'success',
  upcoming: 'info',
  ended: 'neutral',
  scheduled: 'warning',
};
const FILTERS = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'confirmed',
    label: 'Confirmed',
  },
  {
    value: 'pending',
    label: 'Unpaid',
  },
  {
    value: 'used',
    label: 'Checked in',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
  },
];
const CAT_COLS = [170, 110, 90, 90, 90, 90, 110, 120];
const BOOK_COLS = [130, 180, 140, 80, 110, 150, 150, 150, 120];
const FestivalDetail = ({ festivalId, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [promptDialog, prompt] = usePrompt();
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(
        await festivalService.getFestivalSummary(festivalId, {
          status,
        }),
      );
    } catch (error) {
      toast.error(error.message || 'Could not load this festival');
    } finally {
      setLoading(false);
    }
  }, [festivalId, status]);
  useEffect(() => {
    load();
  }, [load]);

  // Filtered in the browser: the list is one festival's bookings, so this is a
  // small array and a round trip per keystroke would be worse than useless.
  const query = search.trim().toLowerCase();
  /*
   * Cancelling a pass on the attendee's behalf — someone who cannot make it
   * rings the office rather than using the app. The endpoint releases the
   * seats it held, so the festival's remaining count corrects itself.
   */
  const cancelBooking = async (booking) => {
    const reason = await prompt(`Why is ${booking.bookingId} being cancelled?`);
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
    return [b.bookingId, b.qrCode, b.ticketCategoryName, user.name, user.phone, b.attendee?.name, b.attendee?.phone].some((v) =>
      String(v || '')
        .toLowerCase()
        .includes(query),
    );
  });
  const backButton = (
    <Button type="button" onClick={onBack} className={BTN_SECONDARY}>
      <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
      <Span className={BTN_TEXT_SECONDARY}>All festivals</Span>
    </Button>
  );
  if (loading && !data) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader title="Festival" subtitle="Seats, categories and bookings." actions={backButton} />
        <LoadingState label="Loading this festival…" />
      </AdminPage>
    );
  }
  if (!data) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader title="Festival" subtitle="Seats, categories and bookings." actions={backButton} />
        <ErrorState title="This festival could not be loaded" message="Go back and open it again." onRetry={load} />
      </AdminPage>
    );
  }
  const { festival, categories, totals } = data;
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        title={festival.name}
        subtitle={`${festival.dates || ''}${festival.venue ? ` · ${festival.venue}` : ''}`}
        breadcrumb={[{ label: 'Tours' }, { label: 'Festivals', onPress: onBack }, { label: festival.name }]}
        actions={backButton}
      />

      {/* Header */}
      <Card className="mb-4 gap-3">
        <Div className="flex-row items-start gap-3">
          <Img src={festival.heroImage} alt="" className="w-24 h-20 rounded-lg object-cover bg-slate-100 shrink-0" fallback={<Div className="w-24 h-20 shrink-0" />} />
          <Div className="flex-1 min-w-0 gap-2">
            <Div className="flex-row flex-wrap items-center gap-2">
              {festival.status ? <StatusBadge status={festival.status} tone={LIFECYCLE_TONE[festival.status] || 'neutral'} label={festival.status} /> : null}
              {!festival.isActive && <StatusBadge status="hidden" tone="warning" label="hidden" />}
            </Div>
            <P className={`text-sm font-semibold ${festival.bookingOpen ? 'text-green-700' : 'text-amber-700'}`}>
              {festival.bookingOpen
                ? `Booking open${festival.bookingClosesAt ? ` until ${when(festival.bookingClosesAt)}` : ''}`
                : festival.bookingClosedReason}
            </P>
          </Div>
        </Div>
      </Card>

      {/* Seats at a glance */}
      <StatGrid className="mb-4">
        <StatCard label="Seats configured" value={totals.configuredSeats} />
        <StatCard label="Available" value={totals.availableSeats} tone="info" />
        <StatCard label="Paid" value={totals.paidSeats} tone="success" />
        <StatCard label="Held (unpaid)" value={totals.heldSeats} tone="warning" />
        <StatCard label="Revenue" value={currency(totals.revenue)} tone="success" />
      </StatGrid>

      {/* Per category */}
      <SectionTitle>Seats by category</SectionTitle>
      {categories.length === 0 ? (
        <EmptyState title="No pass categories" message="Add a pass on the festival's edit screen." className="mb-4" />
      ) : (
        <DataTable cols={CAT_COLS} className="mb-4">
          <THead cols={CAT_COLS} labels={['Category', 'Price', 'Seats', 'Booked', 'Paid', 'Held', 'Available', 'Revenue']} />
          <TBody>
            {categories.map((c, i, a) => {
              const soldOut = c.availableSeats === 0;
              return (
                <Row key={c._id} last={i === a.length - 1}>
                  <Cell width={CAT_COLS[0]}>
                    <P className="text-sm font-semibold text-slate-800" numberOfLines={2}>
                      {c.name}
                    </P>
                    {!c.isActive && <StatusBadge status="closed" tone="neutral" label="closed" className="mt-1" />}
                  </Cell>
                  <Cell width={CAT_COLS[1]} align="right">{currency(c.price)}</Cell>
                  <Cell width={CAT_COLS[2]} align="right">{c.configuredSeats}</Cell>
                  <Cell width={CAT_COLS[3]} align="right">{c.bookedSeats}</Cell>
                  <Cell width={CAT_COLS[4]} align="right">
                    <P className="text-sm font-semibold text-green-700">{c.paidSeats}</P>
                  </Cell>
                  <Cell width={CAT_COLS[5]} align="right">
                    <P className="text-sm text-amber-700">{c.heldSeats || '—'}</P>
                  </Cell>
                  <Cell width={CAT_COLS[6]} align="right">
                    <P className={`text-sm font-semibold ${soldOut ? 'text-red-600' : 'text-slate-900'}`}>{soldOut ? 'Sold out' : c.availableSeats}</P>
                  </Cell>
                  <Cell width={CAT_COLS[7]} align="right">{currency(c.revenue)}</Cell>
                </Row>
              );
            })}
          </TBody>
        </DataTable>
      )}

      {/* Bookings */}
      <SectionTitle>{`Bookings (${totals.bookings})`}</SectionTitle>
      <Toolbar>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Booking ID, name or phone"
          className={`${INPUT} flex-1`}
          style={{ minWidth: 180 }}
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className={`${INPUT} flex-1`} style={{ minWidth: 150 }}>
          {FILTERS.map((f) => (
            <Option key={f.value} value={f.value}>
              {f.label}
            </Option>
          ))}
        </Select>
      </Toolbar>

      {bookings.length === 0 ? (
        <EmptyState
          title={query || status !== 'all' ? 'No bookings match this filter' : 'Nobody has booked yet'}
          message={query || status !== 'all' ? 'Clear the search or widen the status filter.' : 'Passes bought in the app appear here.'}
        />
      ) : (
        <DataTable cols={BOOK_COLS}>
          <THead cols={BOOK_COLS} labels={['Booking ID', 'Attendee', 'Category', 'Seats', 'Amount', 'Status', 'Pass', 'Booked on', 'Actions']} />
          <TBody>
            {bookings.map((b, i, a) => {
              // The account that booked; the attendee named on the pass may
              // differ when someone books for a friend.
              const user = b.userId || {};
              return (
                <Row key={b._id} last={i === a.length - 1}>
                  <Cell width={BOOK_COLS[0]}>
                    <P className="text-sm font-semibold text-slate-800" numberOfLines={1}>
                      {b.bookingId}
                    </P>
                  </Cell>
                  <Cell width={BOOK_COLS[1]}>
                    <P className="text-sm font-semibold text-slate-800" numberOfLines={1}>
                      {b.attendee?.name || user.name || 'Unknown'}
                    </P>
                    <P className="text-xs text-slate-500 mt-0.5" numberOfLines={2}>
                      {b.attendee?.phone || user.phone || ''}
                      {user.name && b.attendee?.name && user.name !== b.attendee.name ? ` · booked by ${user.name}` : ''}
                    </P>
                  </Cell>
                  <Cell width={BOOK_COLS[2]}>{b.ticketCategoryName}</Cell>
                  <Cell width={BOOK_COLS[3]} align="right">
                    <P className="text-sm font-semibold text-slate-900">{b.ticketCount}</P>
                  </Cell>
                  <Cell width={BOOK_COLS[4]} align="right">{currency(b.totalAmount)}</Cell>
                  <Cell width={BOOK_COLS[5]}>
                    <Div className="gap-1">
                      <StatusBadge status={b.bookingStatus} tone={STATUS_TONE[b.bookingStatus] || 'neutral'} label={b.bookingStatus} />
                      {b.paymentStatus !== 'paid' && b.bookingStatus !== 'cancelled' && <StatusBadge status="unpaid" tone="danger" label="unpaid" />}
                    </Div>
                  </Cell>
                  <Cell width={BOOK_COLS[6]}>
                    <P className="text-xs text-slate-500" numberOfLines={2}>
                      {b.qrCode || '—'}
                    </P>
                  </Cell>
                  <Cell width={BOOK_COLS[7]}>
                    <P className="text-xs text-slate-500" numberOfLines={2}>
                      {when(b.createdAt)}
                    </P>
                  </Cell>
                  <Cell width={BOOK_COLS[8]}>
                    {b.bookingStatus === 'cancelled' ? (
                      <Span className="text-sm text-slate-400">—</Span>
                    ) : (
                      <Button
                        type="button"
                        disabled={cancellingId === b._id}
                        onClick={() => cancelBooking(b)}
                        className="h-11 px-3 rounded-lg border border-red-200 bg-white items-center justify-center disabled:opacity-50"
                      >
                        <Span className="text-sm font-semibold text-red-600">Cancel</Span>
                      </Button>
                    )}
                  </Cell>
                </Row>
              );
            })}
          </TBody>
        </DataTable>
      )}
      {promptDialog}
    </AdminPage>
  );
};
export default FestivalDetail;
