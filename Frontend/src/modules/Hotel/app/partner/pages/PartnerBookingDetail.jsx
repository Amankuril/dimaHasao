import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, User, Phone, Mail, MapPin,
  CreditCard, CheckCircle, XCircle, Clock,
  ChevronLeft, AlertTriangle, LogIn, LogOut
} from 'lucide-react';
import { bookingService } from '../../../services/apiService';
import toast from 'react-hot-toast';

const PartnerBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleUpdateInquiry = async (status) => {
    const msg = prompt(`Any message/note for the user about status "${status}"?`, "");
    try {
      await bookingService.updateInquiryStatus(id, status, msg);
      toast.success(`Inquiry marked as ${status}`);
      fetchBooking();
    } catch (error) {
      toast.error(error.message || "Update Failed");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>;
  if (!booking) return null;

  const user = booking.userId || {};
  const property = booking.propertyId || {};
  const room = booking.roomTypeId || {};

  const isInquiry = booking.isInquiry === true;
  const isPayAtHotel = booking.paymentStatus !== 'paid';
  const canMarkPaid = !isInquiry && isPayAtHotel && ['confirmed', 'checked_in'].includes(booking.bookingStatus);
  const canMarkNoShow = !isInquiry && ['confirmed'].includes(booking.bookingStatus);
  const canCheckIn = !isInquiry && booking.bookingStatus === 'confirmed';
  const canCheckOut = !isInquiry && booking.bookingStatus === 'checked_in';

  // Inquiry Specifics
  const pType = (property?.propertyType || '').toLowerCase();
  const isPG = ['pg', 'hostel'].includes(pType);
  const isRent = pType === 'rent';
  const isBuyPlot = ['buy', 'plot'].includes(pType);

  const checkInLabel = isPG || isRent ? 'Move-in' : (isBuyPlot ? 'Preferred Date' : 'Check-in');
  const checkOutLabel = isPG || isRent ? 'Move-out' : 'Check-out';
  const durationLabel = isPG || isRent ? (booking.totalNights >= 30 ? 'Months' : 'Days') : 'Nights';
  // For PG, 'totalNights' usually represents 'totalMonths' if stored that way, 
  // OR we need to convert. Assuming backend stores 'nights' for all, we might show 'Days' or 'Months' based on usage.
  // If backend purely stores 'nights' (e.g. 30), for PG we might want to say '1 Month' if it's exactly 30?
  // simpler for now: just use 'Month' if the logic implies it, but be careful.
  // Let's stick to safe labels: 
  // If isPG, show "Duration" instead of "Nights" to be generic if we can't be sure of the unit?
  // Or better, per user request: "termology ko thik karo".
  // Let's assume standard booking for PG is often 30 days = 1 Month. 
  // We will use "Duration" and show "X Days/Months".


  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/hotel/bookings')} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-bold text-lg">Enquiry Details</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Status Card - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Enquiry ID</span>
            <p className="text-sm font-black text-gray-900 break-all">#{booking.bookingId || booking._id}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${booking.bookingStatus === 'confirmed' ? 'bg-green-50 text-green-700 border-green-100' :
            booking.bookingStatus === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
              booking.bookingStatus === 'no_show' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                'bg-yellow-50 text-yellow-700 border-yellow-100'
            }`}>
            {isInquiry ? booking.inquiryMetadata?.status?.replace('_', ' ') : booking.bookingStatus.replace('_', ' ')}
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
            <Calendar size={16} className="text-gray-400" /> {isInquiry ? 'Inquiry Details' : (isPG || isRent ? 'Tenancy Details' : 'Stay Details')}
          </h3>
          <div className={`grid gap-3 mb-3 ${(!isBuyPlot && (!isInquiry || booking.checkOutDate)) ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="p-2.5 bg-gray-50 rounded-xl">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">{checkInLabel}</p>
              <p className="font-bold text-gray-900 text-sm">{booking.checkInDate || booking.inquiryMetadata?.preferredDate ? new Date(booking.checkInDate || booking.inquiryMetadata?.preferredDate).toLocaleDateString() : 'N/A'}</p>
            </div>
            {!isBuyPlot && (!isInquiry || booking.checkOutDate) && (
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">{checkOutLabel}</p>
                <p className="font-bold text-gray-900 text-sm">{booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString() : 'N/A'}</p>
              </div>
            )}
          </div>
          {!isBuyPlot && (
            <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase">{isPG ? 'Selection' : 'Room Type'}</p>
                <p className="font-bold text-gray-900 text-sm">{room.name || room.type || 'Standard'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-900 font-bold">
                  {booking.bookingUnit === 'entire' ? '1 Unit' : booking.bookingUnit === 'bed' ? '1 Bed' : '1 Room'}
                </p>
                {!isInquiry && (
                  <p className="text-[10px] text-gray-500 font-medium">
                    {booking.totalNights} {durationLabel}
                  </p>
                )}
              </div>
            </div>
          )}

          {isInquiry && booking.inquiryMetadata?.message && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-[9px] text-blue-400 font-bold uppercase mb-1">User Message</p>
              <p className="text-sm text-blue-900 font-medium italic">"{booking.inquiryMetadata.message}"</p>
            </div>
          )}
        </div>

        {/* Payment/Price Info - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <CreditCard size={16} className="text-gray-400" /> {isInquiry ? 'Financial Details' : 'Payment & Payout'}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">{isInquiry ? 'Expected Price / Budget' : 'Total Amount (Collect)'}</span>
              <span className="font-bold text-gray-900 text-base">₹{isInquiry ? booking.inquiryMetadata?.budget : booking.totalAmount}</span>
            </div>
            {!isInquiry && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600">Partner Payout (Earnings)</span>
                <span className="font-bold text-green-700 text-sm">₹{booking.partnerPayout}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-gray-600">Status</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {isInquiry ? 'Lead' : (booking.paymentStatus === 'paid' ? 'PAID' : 'PAY AT HOTEL')}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        {isInquiry && (
          <>
            <button
              onClick={() => handleUpdateInquiry('scheduled')}
              className="bg-purple-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 col-span-1"
            >
              <Calendar size={18} /> Schedule Visit
            </button>
            <button
              onClick={() => handleUpdateInquiry('negotiating')}
              className="bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 col-span-1"
            >
              <Clock size={18} /> Negotiating
            </button>
            <button
              onClick={() => handleUpdateInquiry(isBuyPlot ? 'sold' : 'rented')}
              className="bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 col-span-2"
            >
              <CheckCircle size={20} /> Mark as {isBuyPlot ? 'Sold' : 'Rented'}
            </button>
            <button
              onClick={() => handleUpdateInquiry('dropped')}
              className="bg-white border border-gray-200 text-red-600 font-bold py-4 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 col-span-2"
            >
              <XCircle size={20} /> Drop Lead
            </button>
          </>
        )}

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
