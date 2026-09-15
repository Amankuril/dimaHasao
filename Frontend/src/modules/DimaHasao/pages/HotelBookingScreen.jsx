/**
 * Book a stay.
 *
 * Every amount comes from `POST /hotel/bookings/quote`. The screen used to
 * derive its own total from a hard-coded 12% GST, a flat ₹99 convenience fee
 * and promo codes the server had never heard of, then hand the result to a
 * local `createHotelBooking()` that wrote to React state — no booking was ever
 * created. Coupons are validated server-side now, so a discount shown here is
 * a discount that will actually be applied.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import {
  fetchHotelById,
  quoteStay,
  createHotelBooking as createHotelBookingApi,
  verifyHotelPayment,
} from '../services/hotelApi';
import { initRazorpayPayment } from '../../Food/utils/razorpay';
import { motion, AnimatePresence } from 'framer-motion';

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** yyyy-mm-dd, `days` from today. */
const isoDate = (days = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

/** checkIn + nights, as yyyy-mm-dd. */
const addNights = (checkIn, nights) => {
  const date = new Date(checkIn);
  date.setDate(date.getDate() + Math.max(1, Number(nights) || 1));
  return date.toISOString().slice(0, 10);
};

export const HotelBookingScreen = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, showToast, refreshHotelBookings } = useBooking();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const roomId = searchParams.get('roomId');

  const [selectedRoom, setSelectedRoom] = useState(null);

  // Booking Form State
  const [checkInDate, setCheckInDate] = useState(isoDate(1));
  const [nights, setNights] = useState(parseInt(searchParams.get('nights') || '1', 10));
  const [roomCount, setRoomCount] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('upi'); // upi | card | netbanking | cash
  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');

  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Confirmation Modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdBookingData, setCreatedBookingData] = useState(null);

  const checkOutDate = addNights(checkInDate, nights);

  /* -------------------------- load the stay ------------------------- */
  useEffect(() => {
    let cancelled = false;

    fetchHotelById(id)
      .then((found) => {
        if (cancelled || !found) return setHotel(null);
        setHotel(found);
        const room = found.rooms.find((r) => r.id === roomId) || found.rooms[0] || null;
        setSelectedRoom(room);
      })
      .catch(() => { if (!cancelled) setHotel(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id, roomId]);

  useEffect(() => {
    if (!user?.isLoggedIn) return;
    setGuestName((c) => c || (user.name !== 'Guest' ? user.name : ''));
    setGuestPhone((c) => c || user.phone || '');
  }, [user]);

  /* ----------------------------- quote ------------------------------ */
  // Guards a slow earlier quote from landing after a newer one.
  const quoteSequence = useRef(0);

  useEffect(() => {
    if (!hotel || !selectedRoom || !user?.isLoggedIn) return undefined;

    const sequence = ++quoteSequence.current;
    setQuoting(true);

    const timer = setTimeout(() => {
      quoteStay({
        propertyId: hotel.id,
        roomTypeId: selectedRoom.id,
        checkInDate,
        checkOutDate,
        guests: { adults, children, rooms: roomCount },
        couponCode: appliedCoupon || undefined,
      })
        .then((result) => {
          if (sequence !== quoteSequence.current) return;
          setQuote(result);
          setQuoteError('');
          if (appliedCoupon && !result.couponCode && result.couponMessage) {
            showToast(result.couponMessage);
            setAppliedCoupon('');
          }
        })
        .catch((error) => {
          if (sequence !== quoteSequence.current) return;
          setQuote(null);
          setQuoteError(error?.response?.data?.message || 'We could not price this stay.');
        })
        .finally(() => { if (sequence === quoteSequence.current) setQuoting(false); });
      // Debounced: the guest taps the counters repeatedly.
    }, 350);

    return () => clearTimeout(timer);
  }, [hotel, selectedRoom, checkInDate, checkOutDate, adults, children, roomCount, appliedCoupon, user, showToast]);

  /** The server decides whether a code applies; this just re-quotes with it. */
  const handleApplyPromo = (e) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (!code) return showToast('Enter a promo code first');
    setAppliedCoupon(code);
  };

  const clearPromo = () => { setAppliedCoupon(''); setPromoCode(''); };

  const finish = useCallback(async (booking) => {
    await refreshHotelBookings();
    setCreatedBookingData({
      id: booking.bookingId || booking._id,
      hotelName: hotel.name,
      roomName: selectedRoom.name,
      checkIn: new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      checkOut: new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      guests: `${adults} Adults${children > 0 ? `, ${children} Children` : ''}`,
      totalAmount: booking.totalAmount,
      paymentStatus: booking.paymentStatus === 'paid' ? 'Paid Online' : 'Pay at Property',
    });
    setIsSuccessModalOpen(true);
  }, [hotel, selectedRoom, adults, children, refreshHotelBookings]);

  const handleConfirmStay = async (e) => {
    e.preventDefault();

    if (!user?.isLoggedIn) {
      showToast('Please sign in to book this stay');
      return navigate('/login');
    }
    if (!quote) return showToast(quoteError || 'Please wait for the price to load');

    // The in-page picker chooses between paying now and paying at the property;
    // Razorpay shows its own UPI/card/netbanking list inside the checkout.
    const payAtHotel = paymentMethod === 'cash';

    let created;
    try {
      setSubmitting(true);
      created = await createHotelBookingApi({
        propertyId: hotel.id,
        roomTypeId: selectedRoom.id,
        checkInDate,
        checkOutDate,
        guests: { adults, children, rooms: roomCount },
        paymentMethod: payAtHotel ? 'pay_at_hotel' : 'razorpay',
        couponCode: appliedCoupon || undefined,
        specialRequest,
        guestContact: { name: guestName, phone: guestPhone, email: guestEmail },
      });
    } catch (error) {
      setSubmitting(false);
      return showToast(error?.response?.data?.message || 'We could not create this booking');
    }

    const booking = created.booking;

    if (payAtHotel || !created.paymentRequired) {
      setSubmitting(false);
      return finish(booking);
    }

    try {
      await initRazorpayPayment({
        key: created.key,
        amount: created.order.amount,
        currency: created.order.currency || 'INR',
        order_id: created.order.id,
        name: 'Dima Hasao Stays',
        description: `${hotel.name} — ${selectedRoom.name}`,
        themeColor: '#0a4d2b',
        prefill: { name: guestName, email: guestEmail, contact: guestPhone },
        notes: { bookingId: booking.bookingId },
        handler: async (response) => {
          try {
            const confirmed = await verifyHotelPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking._id,
            });
            await finish(confirmed.booking || { ...booking, paymentStatus: 'paid' });
          } catch (error) {
            showToast(error?.response?.data?.message || 'Payment taken but not confirmed — contact support');
          } finally {
            setSubmitting(false);
          }
        },
        onError: (error) => {
          setSubmitting(false);
          showToast(error?.description || 'Payment failed. Your booking is saved as unpaid.');
        },
        onClose: () => {
          setSubmitting(false);
          showToast('Payment cancelled. Your booking is saved as unpaid.');
        },
      });
    } catch (error) {
      setSubmitting(false);
      showToast(error?.message || 'Could not open the payment window');
    }
  };

  if (loading) {
    return (
      <div className="bg-[#FAF6ED] min-h-screen font-poppins">
        <Header title="REVIEW & BOOK" subtitle="Loading your stay" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <main className="p-3.5 space-y-3">
          {[0, 1, 2].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-[#E5DDC3] p-4 space-y-2 animate-pulse">
              <div className="h-3.5 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </main>
      </div>
    );
  }

  if (!hotel || !selectedRoom) {
    return (
      <div className="bg-[#FAF6ED] min-h-screen font-poppins">
        <Header title="REVIEW & BOOK" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <div className="p-6 text-center space-y-3 mt-10">
          <i className="fa-solid fa-hotel text-4xl text-gray-300"></i>
          <h3 className="font-bold text-gray-800 text-sm">This stay is no longer available</h3>
          <button
            onClick={() => navigate('/hotels')}
            className="bg-[#06381e] text-amber-300 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
          >
            See All Stays
          </button>
        </div>
      </div>
    );
  }

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

          {/* Check-in date — the server prices per night, so it needs a real
              date rather than the old "nights from today" assumption. */}
          <div className="pt-2 border-t border-gray-100">
            <label className="text-[11px] font-semibold text-gray-700 block mb-1">Check-in</label>
            <input
              type="date"
              required
              value={checkInDate}
              min={isoDate(0)}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Checking out {new Date(checkOutDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>

          {/* Dates & Duration Selector */}
          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
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
              placeholder="Promo code"
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
          {quote?.couponCode && (
            <p className="text-[11px] font-semibold text-emerald-700 mt-2 flex items-center gap-1">
              <i className="fa-solid fa-tag"></i>
              <span>Coupon {quote.couponCode} applied — saving {rupees(quote.discount)}</span>
              <button type="button" onClick={clearPromo} className="ml-1 text-gray-400 underline">remove</button>
            </p>
          )}
          {quote?.couponMessage && !quote?.couponCode && (
            <p className="text-[11px] font-semibold text-amber-700 mt-2">{quote.couponMessage}</p>
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

          {quoteError ? (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-2.5">{quoteError}</p>
          ) : !quote ? (
            <div className="space-y-2 animate-pulse py-1">
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ) : (
            <div className={`space-y-1.5 text-xs text-gray-600 transition-opacity ${quoting ? 'opacity-50' : ''}`}>
              <div className="flex justify-between">
                <span>Room Base Fare ({quote.totalNights}N × {quote.rooms} room{quote.rooms > 1 ? 's' : ''})</span>
                <span className="font-semibold text-gray-900">{rupees(quote.baseAmount)}</span>
              </div>

              {quote.extraCharges > 0 && (
                <div className="flex justify-between">
                  <span>Extra guest charges</span>
                  <span className="font-semibold text-gray-900">{rupees(quote.extraCharges)}</span>
                </div>
              )}

              {quote.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Promo Discount ({quote.couponCode})</span>
                  <span>- {rupees(quote.discount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>GST &amp; Hospitality Taxes ({quote.taxRate}%)</span>
                <span className="font-semibold text-gray-900">{rupees(quote.taxes)}</span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline text-gray-900">
                <span className="font-bold text-sm">Total Amount</span>
                <span className="font-black text-lg text-emerald-950 font-montserrat">
                  {rupees(quote.totalAmount)}
                </span>
              </div>

              {paymentMethod === 'cash' && (
                <p className="text-[11px] text-amber-700 font-semibold pt-1">
                  You'll pay this at the property on arrival.
                </p>
              )}

              {quote.availableUnits <= 3 && (
                <p className="text-[11px] text-amber-700 font-semibold pt-1">
                  Only {quote.availableUnits} room{quote.availableUnits === 1 ? '' : 's'} left for these dates.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Confirm Stay Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          type="submit"
          disabled={!quote || quoting || submitting}
          className="w-full bg-[#06381e] hover:bg-[#0a4d2b] disabled:opacity-60 disabled:cursor-not-allowed text-amber-300 font-bold text-sm py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {submitting ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
              <span>Processing…</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-lock text-xs"></i>
              <span>
                {quote
                  ? paymentMethod === 'cash'
                    ? `Reserve (${rupees(quote.totalAmount)} at hotel)`
                    : `Confirm & Pay (${rupees(quote.totalAmount)})`
                  : 'Loading price…'}
              </span>
            </>
          )}
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
