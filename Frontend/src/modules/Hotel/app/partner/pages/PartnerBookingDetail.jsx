import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, User, Phone, Mail, MapPin,
  CreditCard, CheckCircle,
  ChevronLeft, AlertTriangle, LogIn, LogOut, FileText
} from 'lucide-react';
import { bookingService } from '../../../services/apiService';
import BookingInvoice from '../../../components/invoice/BookingInvoice';
import toast from 'react-hot-toast';

const PartnerBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const data = await bookingService.getPartnerBookingDetail(id);
      setBooking(data);
    } catch (error) {
      toast.error("Failed to load booking details");
      navigate('/hotel/bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const handleViewInvoice = async () => {
    try {
      setInvoiceLoading(true);
      const data = await bookingService.getInvoice(id);
      setInvoice(data.invoice);
    } catch (error) {
      toast.error(error?.message || 'Failed to load the invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!window.confirm("Confirm: Guest has paid the full amount at the hotel?")) return;
    try {
      await bookingService.markAsPaid(id);
      toast.success("Marked as Paid Successfully");
      fetchBooking(); // Refresh
    } catch (error) {
      toast.error(error.message || "Action Failed");
    }
  };

  const handleNoShow = async () => {
    if (!window.confirm("Confirm: Guest did NOT arrive? This will cancel the booking and release inventory.")) return;
    try {
      await bookingService.markNoShow(id);
      toast.success("Marked as No Show");
      fetchBooking();
    } catch (error) {
      toast.error(error.message || "Action Failed");
    }
  };

  const handleCheckIn = async () => {
    if (!window.confirm("Confirm Guest Check-In?")) return;
    try {
      await bookingService.checkIn(id);
      toast.success("Checked In Successfully");
      fetchBooking();
    } catch (error) {
      toast.error(error.message || "Action Failed");
    }
  };

  const handleCheckOut = async () => {
    try {
      if (!window.confirm("Confirm Guest Check-Out?")) return;
      await bookingService.checkOut(id);
      toast.success("Checked Out Successfully");
      fetchBooking();
    } catch (error) {
      if (error.requirePayment) {
        if (window.confirm(`${error.message}\n\nDo you want to FORCE check-out anyway?`)) {
          try {
            await bookingService.checkOut(id, true);
            toast.success("Checked Out (Forced)");
            fetchBooking();
          } catch (e) {
            toast.error(e.message || "Force Check-out Failed");
          }
        }
      } else {
        toast.error(error.message || "Action Failed");
      }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>;
  if (!booking) return null;

  const user = booking.userId || {};
  const property = booking.propertyId || {};
  const room = booking.roomTypeId || {};

  const isPayAtHotel = booking.paymentStatus !== 'paid';
  const canMarkPaid = isPayAtHotel && ['confirmed', 'checked_in'].includes(booking.bookingStatus);
  const canMarkNoShow = ['confirmed'].includes(booking.bookingStatus);
  const canCheckIn = booking.bookingStatus === 'confirmed';
  const canCheckOut = booking.bookingStatus === 'checked_in';

  const pType = (property?.propertyType || '').toLowerCase();

  const checkInLabel = 'Check-in';
  const checkOutLabel = 'Check-out';
  const durationLabel = 'Nights';

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/hotel/bookings')} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-bold text-lg flex-1">Booking Details</h1>
        <button
          type="button"
          onClick={handleViewInvoice}
          disabled={invoiceLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-950 text-white text-xs font-bold disabled:opacity-60"
        >
          <FileText size={14} /> {invoiceLoading ? 'Loading…' : 'Invoice'}
        </button>
      </div>

      {invoice && (
        <div className="fixed inset-0 z-[200] bg-black/50 overflow-y-auto p-4" onClick={() => setInvoice(null)}>
          <div
            className="max-w-3xl mx-auto bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <BookingInvoice invoice={invoice} onClose={() => setInvoice(null)} />
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Status Card - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Booking ID</span>
            <p className="text-sm font-black text-gray-900 break-all">#{booking.bookingId || booking._id}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${booking.bookingStatus === 'confirmed' ? 'bg-green-50 text-green-700 border-green-100' :
            booking.bookingStatus === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
              booking.bookingStatus === 'no_show' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                'bg-yellow-50 text-yellow-700 border-yellow-100'
            }`}>
            {booking.bookingStatus.replace('_', ' ')}
          </div>
        </div>

        {/* Property Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
            {property.images?.[0] ? <img src={property.images[0]} alt="property" className="w-full h-full object-cover" /> : <MapPin size={24} className="m-5 text-gray-300" />}
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-base leading-tight uppercase">{property.propertyName || 'Property Name'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-gray-100 text-[9px] font-bold rounded text-gray-500 uppercase">{pType}</span>
              <p className="text-xs text-gray-400 font-medium truncate max-w-[150px]">
                {typeof property.address === 'object'
                  ? `${property.address.city || ''}${property.address.city && property.address.area ? ', ' : ''}${property.address.area || ''}`
                  : (property.address || 'Location')}
              </p>
            </div>
          </div>
        </div>

        {/* Guest Info - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <User size={16} className="text-gray-400" /> Guest Details
          </h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-base text-gray-500">
              {user.name?.[0] || 'G'}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{user.name || 'Guest'}</p>
              <p className="text-xs text-gray-500">Joined via App</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a href={`tel:${user.phone}`} className="flex flex-col p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Phone</p>
              <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-xs">
                <Phone size={12} className="text-gray-400" /> {user.phone || 'N/A'}
              </div>
            </a>
            <div className="flex flex-col p-2.5 bg-gray-50 rounded-xl">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Email</p>
              <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-xs truncate">
                <Mail size={12} className="text-gray-400" /> <span className="truncate">{user.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
            <div className="flex items-center gap-2">
              <User size={14} className="text-gray-400" />
              <span className="text-[10px] text-gray-500 font-bold uppercase">Total Guests</span>
            </div>
            <p className="font-bold text-gray-900 text-sm">
              {booking.guests?.adults || 1} Adult{(booking.guests?.adults || 1) !== 1 ? 's' : ''}
              {booking.guests?.children > 0 ? `, ${booking.guests.children} Child${booking.guests.children !== 1 ? 'ren' : ''}` : ''}
            </p>
          </div>
        </div>

        {/* Stay Info - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" /> Stay Details
          </h3>
          <div className="grid gap-3 mb-3 grid-cols-2">
            <div className="p-2.5 bg-gray-50 rounded-xl">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">{checkInLabel}</p>
              <p className="font-bold text-gray-900 text-sm">{booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-xl">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">{checkOutLabel}</p>
              <p className="font-bold text-gray-900 text-sm">{booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
            <div>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Room Type</p>
              <p className="font-bold text-gray-900 text-sm">{room.name || room.type || 'Standard'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-900 font-bold">
                {booking.bookingUnit === 'entire' ? '1 Unit' : '1 Room'}
              </p>
              <p className="text-[10px] text-gray-500 font-medium">
                {booking.totalNights} {durationLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Payment/Price Info - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <CreditCard size={16} className="text-gray-400" /> Payment & Payout
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Total Amount (Collect)</span>
              <span className="font-bold text-gray-900 text-base">₹{booking.totalAmount}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Partner Payout (Earnings)</span>
              <span className="font-bold text-green-700 text-sm">₹{booking.partnerPayout}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-gray-600">Status</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {booking.paymentStatus === 'paid' ? 'PAID' : 'PAY AT HOTEL'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        {canCheckIn && (
          <button
            onClick={handleCheckIn}
            className="col-span-2 bg-black text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <LogIn size={20} /> {checkInLabel} Guest
          </button>
        )}

        {canCheckOut && (
          <button
            onClick={handleCheckOut}
            className="col-span-2 bg-black text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <LogOut size={20} /> {checkOutLabel} Guest
          </button>
        )}

        {canMarkPaid && (
          <button
            onClick={handleMarkPaid}
            className={`bg-green-600 text-white font-bold py-3 rounded-xl shadow-green-200 active:scale-95 transition-transform flex items-center justify-center gap-2 ${canCheckIn || canCheckOut ? 'col-span-1' : 'col-span-2'}`}
          >
            <CheckCircle size={18} /> Mark Paid
          </button>
        )}

        {canMarkNoShow && (
          <button
            onClick={handleNoShow}
            className={`bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 active:scale-95 transition-transform flex items-center justify-center gap-2 ${canCheckIn || canCheckOut ? 'col-span-1' : 'col-span-2'}`}
          >
            <AlertTriangle size={18} /> No Show
          </button>
        )}
      </div>
    </div>
  );
};

export default PartnerBookingDetail;
