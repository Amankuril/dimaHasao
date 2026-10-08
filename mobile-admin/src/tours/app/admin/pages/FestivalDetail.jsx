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
import { ArrowLeft, Loader2, Search } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import festivalService from '../../../services/festivalService';
import {
  Button,
  Div,
  H1,
  H3,
  Img,
  Input,
  Option,
  P,
  ScrollDiv,
  Select,
  Span,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../components/web';
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
  if (loading && !data) {
    return (
      <ScrollDiv className="p-4 pb-20" contentClassName="py-20 items-center">
        <UiIcon as={Loader2} className="animate-spin text-gray-400" />
      </ScrollDiv>
    );
  }
  if (!data) return null;
  const { festival, categories, totals } = data;
  return (
    <ScrollDiv className="p-4 pb-20 space-y-5">
      <Button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800">
        <UiIcon as={ArrowLeft} size={15} /> All festivals
      </Button>

      {/* Header */}
      <Div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-wrap items-start gap-5">
        <Img
          src={festival.heroImage}
          alt=""
          className="w-28 h-24 rounded-xl object-cover bg-gray-100 shrink-0"
          fallback={<Div className="w-28 h-24 shrink-0" />}
        />

        <Div className="flex-1 basis-64 min-w-0">
          <Div className="flex flex-wrap items-center gap-2">
            <H1 className="text-lg font-bold text-gray-900">{festival.name}</H1>
            <Span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${LIFECYCLE_TONE[festival.status] || ''}`}>{festival.status}</Span>
            {!festival.isActive && <Span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-700">hidden</Span>}
          </Div>
          <P className="text-sm text-gray-500 mt-1">
            {festival.dates}
            {festival.venue ? ` · ${festival.venue}` : ''}
          </P>

          <P
            className={`mt-2.5 inline-block text-xs font-semibold rounded-lg px-2.5 py-1.5 ${festival.bookingOpen ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
          >
            {festival.bookingOpen ? `Booking open${festival.bookingClosesAt ? ` until ${when(festival.bookingClosesAt)}` : ''}` : festival.bookingClosedReason}
          </P>
        </Div>
      </Div>

      {/* Seats at a glance */}
      <Div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            label: 'Seats configured',
            value: totals.configuredSeats,
          },
          {
            label: 'Available',
            value: totals.availableSeats,
          },
          {
            label: 'Paid',
            value: totals.paidSeats,
          },
          {
            label: 'Held (unpaid)',
            value: totals.heldSeats,
          },
          {
            label: 'Revenue',
            value: currency(totals.revenue),
          },
        ].map((card) => (
          <Div key={card.label} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <P className="text-xs font-semibold text-gray-500">{card.label}</P>
            <P className="text-xl font-black text-gray-900 mt-1">{card.value}</P>
          </Div>
        ))}
      </Div>

      {/* Per category */}
      <Div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <H3 className="font-bold text-gray-900 text-sm p-4 pb-3 border-b border-gray-100">Seats by category</H3>
        <Table cols={[170, 100, 80, 80, 80, 80, 100, 110]} className="w-full text-sm">
          <Thead className="bg-gray-50 text-gray-500">
            <Tr>
              {['Category', 'Price', 'Seats', 'Booked', 'Paid', 'Held', 'Available', 'Revenue'].map((h, i) => (
                <Th key={h} className={`px-4 py-2.5 text-xs font-bold ${i === 0 ? 'text-left' : 'text-right'}`}>
                  {h}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody className="divide-y divide-gray-100">
            {categories.map((c) => {
              const soldOut = c.availableSeats === 0;
              return (
                <Tr key={c._id} className="hover:bg-gray-50/60">
                  <Td className="px-4 py-3">
                    <Div className="flex-row flex-wrap items-center gap-2">
                      <Span className="font-semibold text-gray-800">{c.name}</Span>
                      {!c.isActive && <Span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-gray-200 text-gray-600">closed</Span>}
                    </Div>
                  </Td>
                  <Td className="px-4 py-3 text-right text-gray-700">{currency(c.price)}</Td>
                  <Td className="px-4 py-3 text-right text-gray-700">{c.configuredSeats}</Td>
                  <Td className="px-4 py-3 text-right text-gray-700">{c.bookedSeats}</Td>
                  <Td className="px-4 py-3 text-right font-semibold text-emerald-700">{c.paidSeats}</Td>
                  <Td className="px-4 py-3 text-right text-amber-700">{c.heldSeats || '—'}</Td>
                  <Td className={`px-4 py-3 text-right font-bold ${soldOut ? 'text-red-600' : 'text-gray-900'}`}>
                    {soldOut ? 'Sold out' : c.availableSeats}
                  </Td>
                  <Td className="px-4 py-3 text-right text-gray-700">{currency(c.revenue)}</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Div>

      {/* Bookings */}
      <Div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <Div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3 border-b border-gray-100">
          <H3 className="font-bold text-gray-900 text-sm">
            Bookings <Span className="text-gray-400 font-semibold">({totals.bookings})</Span>
          </H3>

          <Div className="flex flex-wrap items-center gap-2">
            <Div className="relative justify-center">
              <UiIcon as={Search} size={14} className="absolute left-2.5 z-10 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Booking ID, name or phone"
                className="pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] w-56"
              />
            </Div>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b]"
            >
              {FILTERS.map((f) => (
                <Option key={f.value} value={f.value}>
                  {f.label}
                </Option>
              ))}
            </Select>
          </Div>
        </Div>

        {bookings.length === 0 ? (
          <P className="py-12 text-center text-sm text-gray-400">{query || status !== 'all' ? 'No bookings match this filter.' : 'Nobody has booked yet.'}</P>
        ) : (
          <Table cols={[130, 190, 140, 80, 110, 160, 150, 150, 120]} className="w-full text-sm">
            <Thead className="bg-gray-50 text-gray-500">
              <Tr>
                {['Booking ID', 'Attendee', 'Category', 'Seats', 'Amount', 'Status', 'Pass', 'Booked on', ''].map((h, i) => (
                  <Th key={h} className={`px-4 py-2.5 text-xs font-bold ${['Seats', 'Amount'].includes(h) ? 'text-right' : 'text-left'}`}>
                    {h}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-gray-100">
              {bookings.map((b) => {
                // The account that booked; the attendee named on the pass may
                // differ when someone books for a friend.
                const user = b.userId || {};
                return (
                  <Tr key={b._id} className="hover:bg-gray-50/60">
                    <Td className="px-4 py-3 font-mono text-xs font-bold text-gray-800">{b.bookingId}</Td>
                    <Td className="px-4 py-3">
                      <P className="font-semibold text-gray-800">{b.attendee?.name || user.name || 'Unknown'}</P>
                      <P className="text-xs text-gray-500">
                        {b.attendee?.phone || user.phone || ''}
                        {user.name && b.attendee?.name && user.name !== b.attendee.name ? ` · booked by ${user.name}` : ''}
                      </P>
                    </Td>
                    <Td className="px-4 py-3 text-gray-700">{b.ticketCategoryName}</Td>
                    <Td className="px-4 py-3 text-right font-semibold text-gray-900">{b.ticketCount}</Td>
                    <Td className="px-4 py-3 text-right text-gray-700">{currency(b.totalAmount)}</Td>
                    <Td className="px-4 py-3">
                      <Div className="flex-row flex-wrap items-center gap-1.5">
                        <Span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_TONE[b.bookingStatus] || ''}`}>{b.bookingStatus}</Span>
                        {b.paymentStatus !== 'paid' && b.bookingStatus !== 'cancelled' && (
                          <Span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">unpaid</Span>
                        )}
                      </Div>
                    </Td>
                    <Td className="px-4 py-3 font-mono text-[11px] text-gray-500">{b.qrCode || '—'}</Td>
                    <Td className="px-4 py-3 text-xs text-gray-500">{when(b.createdAt)}</Td>
                    <Td className="px-4 py-3 text-right">
                      {b.bookingStatus === 'cancelled' ? (
                        <Span className="text-[11px] text-gray-300">—</Span>
                      ) : (
                        <Button
                          type="button"
                          disabled={cancellingId === b._id}
                          onClick={() => cancelBooking(b)}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          Cancel
                        </Button>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Div>
      {promptDialog}
    </ScrollDiv>
  );
};
export default FestivalDetail;
