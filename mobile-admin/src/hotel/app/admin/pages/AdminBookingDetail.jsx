/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminBookingDetail.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, AlertTriangle, Download, ShieldCheck, Phone, Mail, CalendarCheck } from 'lucide-react-native';
import { useParams } from '../../../../lib/webRouter';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import BookingInvoice from '../../../components/invoice/BookingInvoice';
import { toast } from '../../../../lib/notify';
import { Button, Div, Link, Overlay, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatusBadge,
  LoadingState,
  ErrorState,
  BTN_DANGER,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';

const AdminBookingDetail = () => {
  const { id } = useParams();
  const { tablet } = useLayoutWidth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {},
  });
  const [invoice, setInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const handleViewInvoice = async () => {
    try {
      setInvoiceLoading(true);
      const data = await adminService.getBookingInvoice(id);
      setInvoice(data.invoice);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load the invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };
  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const data = await adminService.getBookingDetails(id);
      if (data.success) {
        setBooking(data.booking);
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast.error('Failed to load booking information');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  const handleCancel = () => {
    setModalConfig({
      isOpen: true,
      title: 'Cancel Booking?',
      message: `Are you sure you want to cancel booking #${booking.bookingId}? This will trigger any applicable refund processes.`,
      type: 'danger',
      confirmText: 'Yes, Cancel Booking',
      onConfirm: async () => {
        try {
          const res = await adminService.updateBookingStatus(booking._id, 'cancelled');
          if (res.success) {
            toast.success('Booking cancelled successfully');
            fetchBookingDetails();
          }
        } catch {
          toast.error('Failed to cancel booking');
        }
      },
    });
  };
  if (loading)
    return (
      <AdminPage maxWidth={900}>
        <PageHeader title="Booking" breadcrumb={[{ label: 'Hotel' }, { label: 'Bookings' }]} />
        <LoadingState label="Loading booking details…" />
      </AdminPage>
    );
  if (!booking)
    return (
      <AdminPage maxWidth={900}>
        <PageHeader title="Booking" breadcrumb={[{ label: 'Hotel' }, { label: 'Bookings' }]} />
        <ErrorState title="Booking not found" message="This booking does not exist or has been removed." onRetry={fetchBookingDetails} />
        <Link to="/hotel/admin/bookings" className={`${BTN_SECONDARY} mt-3 self-center`}>
          <Span className={BTN_TEXT_SECONDARY}>Back to bookings</Span>
        </Link>
      </AdminPage>
    );
  const status = booking.bookingStatus || booking.status;
  const bookingRef = `#${booking.bookingId || booking._id.slice(-6)}`;
  return (
    <AdminPage maxWidth={900}>
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() =>
          setModalConfig({
            ...modalConfig,
            isOpen: false,
          })
        }
        {...modalConfig}
      />

      {invoice && (
        <Overlay className="flex-1 bg-black/50 p-4" onClose={() => setInvoice(null)} onClick={() => setInvoice(null)}>
          {/* The ScrollView takes the touches inside the sheet, so only the backdrop closes it — the web's stopPropagation. */}
          <ScrollDiv className="bg-white rounded-xl border border-slate-200 self-center w-full" style={{ maxWidth: 720, maxHeight: '90%' }}>
            <BookingInvoice invoice={invoice} onClose={() => setInvoice(null)} />
          </ScrollDiv>
        </Overlay>
      )}

      <PageHeader
        icon={CalendarCheck}
        title={`Booking ${bookingRef}`}
        subtitle={`Booked on ${new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · ${new Date(
          booking.createdAt,
        ).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
        breadcrumb={[{ label: 'Hotel' }, { label: 'Bookings' }, { label: bookingRef }]}
        actions={
          <>
            <Button type="button" onClick={handleViewInvoice} disabled={invoiceLoading} className={BTN_SECONDARY}>
              <UiIcon as={Download} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>{invoiceLoading ? 'Loading…' : 'Invoice'}</Span>
            </Button>
            {status === 'confirmed' || status === 'pending' ? (
              <Button onClick={handleCancel} className={BTN_DANGER}>
                <Span className={BTN_TEXT_PRIMARY}>Cancel booking</Span>
              </Button>
            ) : null}
            <StatusBadge status={status} />
          </>
        }
      />

      <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
        <Div className={tablet ? 'flex-1 gap-4' : 'gap-4'}>
          <Card>
            <SectionTitle>Stay details</SectionTitle>
            <Div className="flex-row flex-wrap gap-4">
              <Div className="flex-1 min-w-[140px]">
                <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Check-in</Span>
                <Span className="text-base font-semibold text-slate-900 mt-1">
                  {new Date(booking.checkInDate || booking.checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Span>
              </Div>
              <Div className="flex-1 min-w-[140px]">
                <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Check-out</Span>
                <Span className="text-base font-semibold text-slate-900 mt-1">
                  {new Date(booking.checkOutDate || booking.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Span>
              </Div>
            </Div>
            <Div className="mt-4 pt-4 border-t border-slate-100 gap-1">
              <Div className="flex-row items-center gap-2">
                <UiIcon as={Calendar} size={14} className="text-slate-400" />
                <Span className="text-sm font-medium text-slate-900 flex-1" numberOfLines={2}>
                  {booking.propertyId?.propertyName || booking.propertyId?.name || 'Deleted Property'}
                </Span>
              </Div>
              <Div className="flex-row items-start gap-2">
                <UiIcon as={MapPin} size={14} className="text-slate-400" />
                <Span className="text-sm text-slate-500 flex-1" numberOfLines={3}>
                  {booking.propertyId?.address?.fullAddress || `${booking.propertyId?.address?.city}, ${booking.propertyId?.address?.state}`}
                </Span>
              </Div>
            </Div>
          </Card>

          <Card>
            <SectionTitle>Guest information</SectionTitle>
            <Div className="flex-row items-start gap-3">
              <Div className="w-11 h-11 rounded-full bg-slate-100 items-center justify-center shrink-0">
                <Span className="text-sm font-semibold text-slate-600">{booking.userId?.name?.charAt(0)?.toUpperCase() || 'G'}</Span>
              </Div>
              <Div className="flex-1 min-w-0 gap-1">
                <Span className="text-base font-semibold text-slate-900" numberOfLines={2}>
                  {booking.userId?.name || 'Guest User'}
                </Span>
                <Div className="flex-row items-center gap-2">
                  <UiIcon as={Mail} size={14} className="text-slate-400" />
                  <Span className="text-sm text-slate-500 flex-1" numberOfLines={1}>
                    {booking.userId?.email || 'No email provided'}
                  </Span>
                </Div>
                <Div className="flex-row items-center gap-2">
                  <UiIcon as={Phone} size={14} className="text-slate-400" />
                  <Span className="text-sm text-slate-500 flex-1" numberOfLines={1}>
                    {booking.userId?.phone || 'N/A'}
                  </Span>
                </Div>
              </Div>
            </Div>
          </Card>
        </Div>

        <Div className={tablet ? 'w-[320px] gap-4' : 'gap-4'}>
          <Card>
            <SectionTitle>Payment summary</SectionTitle>
            <Div className="gap-2">
              <Div className="flex-row items-center justify-between gap-3">
                <Span className="text-sm text-slate-500">Total calculation</Span>
                <Span className="text-sm text-slate-900">₹{booking.totalAmount?.toLocaleString()}</Span>
              </Div>
              <Div className="flex-row items-center justify-between gap-3">
                <Span className="text-sm text-slate-500">Taxes &amp; fees</Span>
                <Span className="text-sm text-slate-900">Included</Span>
              </Div>
              <Div className="flex-row items-center justify-between gap-3">
                <Span className="text-sm text-slate-500">Payment status</Span>
                <StatusBadge status="paid" label="Paid" />
              </Div>
              <Div className="flex-row items-center justify-between gap-3 pt-3 mt-1 border-t border-slate-100">
                <Span className="text-sm font-semibold text-slate-900">Total amount</Span>
                <Span className="text-xl font-bold text-slate-900">₹{booking.totalAmount?.toLocaleString()}</Span>
              </Div>
              <Div className="mt-1">
                <StatusBadge tone="success" icon={ShieldCheck} label="Payment verified" />
              </Div>
            </Div>
          </Card>

          <Card>
            <Div className="flex-row items-center gap-2 mb-2">
              <UiIcon as={AlertTriangle} size={14} className="text-blue-700" />
              <Span className="text-base font-semibold text-slate-900">Admin note</Span>
            </Div>
            <Span className="text-sm text-slate-500">
              System verified booking. This transaction is secured and final. Review any cancellation policies before manual intervention.
            </Span>
          </Card>
        </Div>
      </Div>
    </AdminPage>
  );
};
export default AdminBookingDetail;
