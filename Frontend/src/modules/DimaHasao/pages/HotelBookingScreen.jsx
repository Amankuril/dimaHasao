import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from '../router';
import { HOTELS_DATA } from '../data/hotelData';
import { useBooking } from '../context/BookingContext';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion, AnimatePresence } from 'framer-motion';

export const HotelBookingScreen = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, createHotelBooking, showToast } = useBooking();

  const hotel = HOTELS_DATA.find((h) => h.id === id) || HOTELS_DATA[0];
  const roomId = searchParams.get('roomId') || hotel.rooms[0].id;
  const initialNights = parseInt(searchParams.get('nights') || '1', 10);

  const selectedRoom = hotel.rooms.find((r) => r.id === roomId) || hotel.rooms[0];

  // Booking Form State
  const [nights, setNights] = useState(initialNights);
  const [roomCount, setRoomCount] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const [guestName, setGuestName] = useState(user.name !== 'Guest' ? user.name : 'Dima Explorer');
  const [guestPhone, setGuestPhone] = useState(user.phone || '+91 98765 43210');
  const [guestEmail, setGuestEmail] = useState('explorer@dimahasao.in');
  const [specialRequest, setSpecialRequest] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi', 'card', 'netbanking', 'cash'
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountCodeName, setDiscountCodeName] = useState('');

  // Confirmation Modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdBookingData, setCreatedBookingData] = useState(null);

  // Price Calculations
  const roomBasePrice = selectedRoom.price * nights * roomCount;
  const discountAmount = appliedDiscount > 0 ? Math.round(roomBasePrice * (appliedDiscount / 100)) : 0;
  const taxableAmount = roomBasePrice - discountAmount;
  const gstAmount = Math.round(taxableAmount * 0.12);
  const serviceFee = 99;
  const totalAmount = taxableAmount + gstAmount + serviceFee;

  const handleApplyPromo = (e) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code === 'DIMA10' || code === 'WELCOME2026') {
      setAppliedDiscount(10);
      setDiscountCodeName(code);
      showToast(`Promo ${code} applied! 10% OFF 🎉`);
    } else if (code === 'FALCON') {
      setAppliedDiscount(15);
      setDiscountCodeName(code);
      showToast('Falcon Festival Special: 15% OFF! 🦅');
    } else {
      showToast('Invalid promo code. Try DIMA10 or FALCON');
    }
  };

  const handleConfirmStay = (e) => {
    e.preventDefault();

    const bookingPayload = {
      hotelId: hotel.id,
      hotelName: hotel.name,
      roomName: selectedRoom.name,
      location: hotel.location,
      checkIn: 'Tomorrow, 12:00 PM',
      checkOut: `In ${nights} day(s), 11:00 AM`,
      nights,
      roomCount,
      guests: `${adults} Adults${children > 0 ? `, ${children} Children` : ''}`,
      totalAmount,
      paymentMethod:
        paymentMethod === 'upi'
          ? 'UPI (GPay/PhonePe)'
          : paymentMethod === 'card'
          ? 'Credit/Debit Card'
          : paymentMethod === 'netbanking'
          ? 'Net Banking'
          : 'Pay at Property',
      image: selectedRoom.image || hotel.heroImage,
      guestName,
      guestPhone,
      guestEmail,
      specialRequest
    };

    const newBooking = createHotelBooking(bookingPayload);
    setCreatedBookingData(newBooking);
    setIsSuccessModalOpen(true);
  };

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-28 relative font-poppins">
      <Header
        title="REVIEW & BOOK"
        subtitle="Confirm your stay details"
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      <form onSubmit={handleConfirmStay} className="p-3.5 space-y-4">
        {/* Hotel & Selected Room Summary Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
          <div className="flex gap-3">
            <img
              src={selectedRoom.image || hotel.heroImage}
              alt={hotel.name}
              className="w-20 h-20 rounded-xl object-cover shrink-0 border border-gray-200"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {hotel.type}
              </span>
              <h3 className="font-montserrat font-bold text-sm text-gray-900 truncate mt-1">
                {hotel.name}
              </h3>
              <p className="text-xs font-semibold text-emerald-800">{selectedRoom.name}</p>
              <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                <i className="fa-solid fa-location-dot text-emerald-700"></i>
                <span>{hotel.location}</span>
              </p>
            </div>
          </div>

          {/* Dates & Duration Selector */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center text-xs">
            <div className="bg-[#FAF6ED] p-2 rounded-xl border border-[#E5DDC3]/60">
              <span className="text-[10px] text-gray-500 block">Nights</span>
              <div className="flex items-center justify-center gap-1.5 mt-1 font-bold text-gray-900">
                <button
                  type="button"
                  disabled={nights <= 1}
                  onClick={() => setNights((p) => Math.max(1, p - 1))}
                  className="w-5 h-5 rounded-full bg-white text-gray-700 flex items-center justify-center border border-gray-300 disabled:opacity-40"
                >
                  -
                </button>
                <span>{nights}</span>
                <button
                  type="button"
                  onClick={() => setNights((p) => p + 1)}
                  className="w-5 h-5 rounded-full bg-white text-gray-700 flex items-center justify-center border border-gray-300"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-[#FAF6ED] p-2 rounded-xl border border-[#E5DDC3]/60">
              <span className="text-[10px] text-gray-500 block">Rooms</span>
              <div className="flex items-center justify-center gap-1.5 mt-1 font-bold text-gray-900">
                <button
                  type="button"
                  disabled={roomCount <= 1}
                  onClick={() => setRoomCount((p) => Math.max(1, p - 1))}
                  className="w-5 h-5 rounded-full bg-white text-gray-700 flex items-center justify-center border border-gray-300 disabled:opacity-40"
                >
                  -
                </button>
                <span>{roomCount}</span>
                <button
                  type="button"
                  onClick={() => setRoomCount((p) => p + 1)}
                  className="w-5 h-5 rounded-full bg-white text-gray-700 flex items-center justify-center border border-gray-300"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-[#FAF6ED] p-2 rounded-xl border border-[#E5DDC3]/60">
              <span className="text-[10px] text-gray-500 block">Adults</span>
              <div className="flex items-center justify-center gap-1.5 mt-1 font-bold text-gray-900">
                <button
                  type="button"
                  disabled={adults <= 1}
                  onClick={() => setAdults((p) => Math.max(1, p - 1))}
                  className="w-5 h-5 rounded-full bg-white text-gray-700 flex items-center justify-center border border-gray-300 disabled:opacity-40"
                >
                  -
                </button>
                <span>{adults}</span>
                <button
                  type="button"
                  onClick={() => setAdults((p) => p + 1)}
                  className="w-5 h-5 rounded-full bg-white text-gray-700 flex items-center justify-center border border-gray-300"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Guest Details */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
          <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-user-check text-emerald-800"></i>
            <span>Guest Information</span>
          </h3>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Email ID</label>
                <input
                  type="email"
                  required
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Special Requests (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Early check-in, high floor, quiet room"
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Promo Code Box */}
        <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#E5DDC3]">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Promo (e.g. DIMA10, FALCON)"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs uppercase font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={handleApplyPromo}
              className="bg-[#06381e] text-amber-300 text-xs font-bold px-4 py-2 rounded-xl shadow-xs hover:bg-[#0a4d2b] transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
          {appliedDiscount > 0 && (
            <p className="text-[11px] font-semibold text-emerald-700 mt-2 flex items-center gap-1">
              <i className="fa-solid fa-tag"></i>
              <span>Coupon {discountCodeName} applied ({appliedDiscount}% Discount)</span>
            </p>
          )}
        </div>

        {/* Payment Method Selector */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
          <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-credit-card text-emerald-800"></i>
            <span>Payment Method</span>
          </h3>

          <div className="space-y-2">
            {[
              { id: 'upi', label: 'UPI / QR (Google Pay, PhonePe, Paytm)', icon: 'fa-solid fa-qrcode', badge: 'Instant & Fast' },
              { id: 'card', label: 'Credit / Debit Cards', icon: 'fa-solid fa-credit-card', badge: 'Visa, MC, RuPay' },
              { id: 'netbanking', label: 'Net Banking (All Indian Banks)', icon: 'fa-solid fa-building-columns', badge: null },
              { id: 'cash', label: 'Pay at Hotel (Cash / Card on Arrival)', icon: 'fa-solid fa-hand-holding-dollar', badge: 'No Prepayment' }
            ].map((method) => (
              <label
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  paymentMethod === method.id
                    ? 'border-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-600'
                    : 'border-[#E5DDC3] bg-[#FAF6ED]/40 hover:bg-[#FAF6ED]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                    className="accent-emerald-800 w-4 h-4"
                  />
                  <div className="flex items-center gap-2">
                    <i className={`${method.icon} text-sm text-emerald-900`}></i>
                    <span className="text-xs font-semibold text-gray-900">{method.label}</span>
                  </div>
                </div>
                {method.badge && (
                  <span className="text-[9.5px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {method.badge}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Bill Breakdown Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2.5">
          <h3 className="font-montserrat font-bold text-sm text-gray-900">Fare Summary</h3>

          <div className="space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>
                Room Base Fare ({nights}N × {roomCount} room)
              </span>
              <span className="font-semibold text-gray-900">₹{roomBasePrice.toLocaleString('en-IN')}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Promo Discount ({appliedDiscount}%)</span>
                <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>GST & Hospitality Taxes (12%)</span>
              <span className="font-semibold text-gray-900">₹{gstAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between">
              <span>Tourism Support & Convenience Fee</span>
              <span className="font-semibold text-gray-900">₹{serviceFee}</span>
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline text-gray-900">
              <span className="font-bold text-sm">Total Amount</span>
              <span className="font-black text-lg text-emerald-950 font-montserrat">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Confirm Stay Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          type="submit"
          className="w-full bg-[#06381e] hover:bg-[#0a4d2b] text-amber-300 font-bold text-sm py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <i className="fa-solid fa-lock text-xs"></i>
          <span>Confirm & Book Stay (₹{totalAmount.toLocaleString('en-IN')})</span>
        </motion.button>
      </form>

      {/* Booking Confirmation & Invoice Modal */}
      <AnimatePresence>
        {isSuccessModalOpen && createdBookingData && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-5 shadow-2xl z-10 w-full max-w-sm border border-emerald-200 relative space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Header Icon */}
              <div className="text-center space-y-1">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <h3 className="font-montserrat font-bold text-lg text-gray-900">Booking Confirmed!</h3>
                <p className="text-xs text-gray-500">Your stay has been reserved successfully</p>
                <span className="inline-block bg-[#FAF6ED] text-emerald-900 font-mono font-bold text-xs px-3 py-1 rounded-full border border-[#E5DDC3]">
                  ID: {createdBookingData.id}
                </span>
              </div>

              {/* Digital Invoice Summary */}
              <div className="bg-[#FAF6ED] rounded-2xl p-3.5 border border-[#E5DDC3] space-y-2 text-xs">
                <div className="border-b border-[#E5DDC3] pb-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Property & Room</span>
                  <h4 className="font-bold text-gray-900">{createdBookingData.hotelName}</h4>
                  <p className="text-emerald-800 font-semibold">{createdBookingData.roomName}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Check-in:</span>
                    <span className="font-semibold">{createdBookingData.checkIn}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Check-out:</span>
                    <span className="font-semibold">{createdBookingData.checkOut}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Guests:</span>
                    <span className="font-semibold">{createdBookingData.guests}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Payment:</span>
                    <span className="font-semibold text-emerald-800">{createdBookingData.paymentStatus}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5DDC3] flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total Paid/Payable:</span>
                  <span className="font-black text-sm text-emerald-950 font-montserrat">
                    ₹{createdBookingData.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccessModalOpen(false);
                    navigate('/bookings');
                  }}
                  className="w-full py-3 bg-[#06381e] hover:bg-emerald-900 text-amber-300 rounded-xl font-bold text-xs transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-calendar-check"></i>
                  <span>View in My Bookings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSuccessModalOpen(false);
                    navigate('/');
                  }}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Back to Home
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
