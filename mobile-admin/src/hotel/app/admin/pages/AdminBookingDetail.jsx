/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminBookingDetail.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Calendar, User, MapPin, CreditCard, CheckCircle, XCircle, AlertTriangle, Download, ShieldCheck, Phone, Mail, Loader2 } from 'lucide-react-native';
import { useParams } from '../../../../lib/webRouter';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import BookingInvoice from '../../../components/invoice/BookingInvoice';
import { toast } from '../../../../lib/notify';
import { Button, Div, H1, H2, H4, Link, Overlay, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
const AdminBookingDetail = () => {
  const { id } = useParams();
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

  // Status Colors
  const getStatusColor = (s) => {
    if (s === 'confirmed') return 'text-green-600 bg-green-50 border-green-200 font-bold';
    if (s === 'cancelled') return 'text-red-600 bg-red-50 border-red-200 font-bold';
    if (s === 'completed') return 'text-blue-600 bg-blue-50 border-blue-200 font-bold';
    return 'text-amber-600 bg-amber-50 border-amber-200 font-bold';
  };
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
      <ScrollDiv className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <UiIcon as={Loader2} className="animate-spin text-gray-400" size={48} />
        <P className="text-gray-500 font-bold uppercase text-xs tracking-widest">Loading booking details...</P>
      </ScrollDiv>
    );
  if (!booking)
    return (
      <ScrollDiv className="text-center py-20">
        <UiIcon as={AlertTriangle} size={48} className="mx-auto text-red-400 mb-4" />
        <H2 className="text-2xl font-bold text-gray-900">Booking Not Found</H2>
        <Link to="/hotel/admin/bookings" className="mt-6 inline-block text-black font-bold uppercase text-xs border-b-2 border-black pb-1">
          Back to Bookings
        </Link>
      </ScrollDiv>
    );
  return (
    <ScrollDiv className="max-w-4xl mx-auto space-y-6 pb-10">
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

      {/* Nav */}
      <Div className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 mb-2">
        <Link to="/hotel/admin/bookings" className="hover:text-black transition-colors">
          Bookings
        </Link>
        <Span>/</Span>
        <Span className="text-black">#{booking.bookingId || booking._id.slice(-6)}</Span>
      </Div>

      {invoice && (
        <Overlay className="fixed inset-0 z-[200] bg-black/50 p-4" onClose={() => setInvoice(null)} onClick={() => setInvoice(null)}>
          {/* The ScrollView takes the touches inside the sheet, so only the backdrop closes it — the web's stopPropagation. */}
          <ScrollDiv className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl max-h-[90vh]">
            <BookingInvoice invoice={invoice} onClose={() => setInvoice(null)} />
          </ScrollDiv>
        </Overlay>
      )}

      {/* Header Card */}
      <Div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Div>
          <Div className="flex items-center gap-3 mb-1">
            <H1 className="text-2xl font-bold text-gray-900 uppercase">Booking #{booking.bookingId || booking._id.slice(-6)}</H1>
            <Span
              className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${getStatusColor(booking.bookingStatus || booking.status)} flex items-center gap-1`}
            >
              {(booking.bookingStatus || booking.status) === 'confirmed' ? <UiIcon as={CheckCircle} size={10} /> : <UiIcon as={XCircle} size={10} />}
              {booking.bookingStatus || booking.status}
            </Span>
          </Div>
          <P className="text-[10px] font-bold uppercase text-gray-400 tracking-tight">
            Booked on {new Date(booking.createdAt).toLocaleDateString()} • {new Date(booking.createdAt).toLocaleTimeString()}
          </P>
        </Div>
        <Div className="flex gap-2">
          <Button
            type="button"
            onClick={handleViewInvoice}
            disabled={invoiceLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <UiIcon as={Download} size={14} /> {invoiceLoading ? 'Loading…' : 'Invoice'}
          </Button>
          {((booking.bookingStatus || booking.status) === 'confirmed' || (booking.bookingStatus || booking.status) === 'pending') && (
            <Button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold uppercase hover:bg-red-100 transition-colors"
            >
              Cancel Booking
            </Button>
          )}
        </Div>
      </Div>

      <Div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Main Details */}
        <Div className="md:col-span-2 space-y-6">
          {/* Stay Details */}
          <Div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold uppercase text-gray-500 text-[10px] flex items-center gap-2">
              <UiIcon as={Calendar} size={14} /> Stay Details
            </Div>
            <Div className="p-6 grid grid-cols-2 gap-6">
              <Div>
                <P className="text-[10px] text-gray-400 uppercase font-bold mb-1">Check-in</P>
                <P className="text-lg font-bold text-gray-900">{new Date(booking.checkInDate || booking.checkIn).toLocaleDateString()}</P>
              </Div>
              <Div>
                <P className="text-[10px] text-gray-400 uppercase font-bold mb-1">Check-out</P>
                <P className="text-lg font-bold text-gray-900">{new Date(booking.checkOutDate || booking.checkOut).toLocaleDateString()}</P>
              </Div>
              <Div className="col-span-2 pt-4 border-t border-gray-100">
                <P className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-tight">
                  Hotel: {booking.propertyId?.propertyName || booking.propertyId?.name || 'Deleted Property'}
                </P>
                <P className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase">
                  <UiIcon as={MapPin} size={12} />{' '}
                  {booking.propertyId?.address?.fullAddress || `${booking.propertyId?.address?.city}, ${booking.propertyId?.address?.state}`}
                </P>
              </Div>
            </Div>
          </Div>

          {/* Guest Details */}
          <Div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold uppercase text-gray-500 text-[10px] flex items-center gap-2">
              <UiIcon as={User} size={14} /> Guest Information
            </Div>
            <Div className="p-6 flex items-start gap-4">
              <Div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold uppercase">
                {booking.userId?.name?.charAt(0) || 'G'}
              </Div>
              <Div>
                <H4 className="font-bold text-gray-900 text-lg uppercase tracking-tight">{booking.userId?.name || 'Guest User'}</H4>
                <Div className="flex flex-col gap-1 mt-1 font-bold uppercase text-[10px]">
                  <P className="text-gray-400 flex items-center gap-2">
                    <UiIcon as={Mail} size={12} /> {booking.userId?.email || 'No email provided'}
                  </P>
                  <P className="text-gray-400 flex items-center gap-2">
                    <UiIcon as={Phone} size={12} /> {booking.userId?.phone || 'N/A'}
                  </P>
                </Div>
              </Div>
            </Div>
          </Div>
        </Div>

        {/* Right Col: Payment */}
        <Div className="space-y-6">
          <Div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold uppercase text-gray-500 text-[10px] flex items-center gap-2">
              <UiIcon as={CreditCard} size={14} /> Payment Summary
            </Div>
            <Div className="p-6 space-y-3">
              <Div className="flex justify-between text-xs font-bold uppercase">
                <Span className="text-gray-400">Total Calculation</Span>
                <Span className="text-gray-900">₹{booking.totalAmount?.toLocaleString()}</Span>
              </Div>

              <Div className="flex justify-between text-xs font-bold uppercase">
                <Span className="text-gray-400">Taxes & Fees</Span>
                <Span className="text-gray-900">Included</Span>
              </Div>
              <Div className="flex justify-between text-xs font-bold uppercase">
                <Span className="text-emerald-600">Payment Status</Span>
                <Span className="text-emerald-700">PAID</Span>
              </Div>
              <Div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <Span className="font-bold text-gray-900 uppercase text-xs">Total Amount</Span>
                <Span className="text-xl font-bold text-gray-900">₹{booking.totalAmount?.toLocaleString()}</Span>
              </Div>
              <Div className="pt-2">
                <Span className="flex items-center justify-center w-full py-1.5 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-100 uppercase">
                  <UiIcon as={ShieldCheck} size={12} className="mr-1" /> Payment Verified
                </Span>
              </Div>
            </Div>
          </Div>

          <Div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <H4 className="font-bold text-blue-900 text-[10px] uppercase mb-2 flex items-center gap-1">
              <UiIcon as={AlertTriangle} size={14} /> Admin Note
            </H4>
            <P className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase tracking-tight">
              System verified booking. This transaction is secured and final. Review any cancellation policies before manual intervention.
            </P>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default AdminBookingDetail;
