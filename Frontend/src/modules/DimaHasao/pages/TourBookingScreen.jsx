/**
 * Book a tour package.
 *
 * Every figure on this screen comes from `POST /tours/bookings/quote`. The
 * screen displays a total; it never computes one. The earlier version derived
 * its own (5% GST, a flat ₹150 cess, a 0.6 child rate, client-side promo
 * codes) — that is precisely the shape of the food payment bug, where the
 * amount charged and the amount verified disagreed.
 *
 * The traveller pays the package's **advance** online. The balance goes to the
 * operator on the day, so the CTA says what is actually being charged now.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import {
  fetchPackageById,
  quoteBooking,
  createBooking,
  createPaymentOrder,
  verifyPayment,
  settleWithoutGateway,
} from '../services/toursApi';
import { initRazorpayPayment } from '../../Food/utils/razorpay';
import { motion, AnimatePresence } from 'framer-motion';

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** yyyy-mm-dd, `days` from today — matches what a date input expects. */
const isoDate = (days = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const TourBookingScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, showToast, refreshTourBookings } = useBooking();

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);

  const [travelDate, setTravelDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [pickupPoint, setPickupPoint] = useState('');

  const [travelerName, setTravelerName] = useState('');
  const [travelerPhone, setTravelerPhone] = useState('');
  const [travelerEmail, setTravelerEmail] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoting, setQuoting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdTourData, setCreatedTourData] = useState(null);

  /* ---------------------------------------------------------------- *
   * Package
   * ---------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    fetchPackageById(id)
      .then((found) => {
        if (cancelled || !found) return setPkg(null);
        setPkg(found);
        // Respect the operator's lead time rather than offering a date the
        // server will refuse on submit.
        setTravelDate(isoDate(Math.max(found.leadTimeDays, 1)));
        setAdults(Math.max(found.groupSizeMin || 1, 1));
        setPickupPoint(found.pickupPoints[0] || '');
      })
      .catch(() => { if (!cancelled) setPkg(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!user?.isLoggedIn) return;
    setTravelerName((current) => current || (user.name !== 'Guest' ? user.name : ''));
    setTravelerPhone((current) => current || user.phone || '');
  }, [user]);

  /* ---------------------------------------------------------------- *
   * Server quote
   * ---------------------------------------------------------------- */

  // Guards against a slow earlier quote landing after a newer one and
  // overwriting the price with a stale figure.
  const quoteSequence = useRef(0);

  useEffect(() => {
    if (!pkg || !travelDate) return undefined;

    const sequence = ++quoteSequence.current;
    setQuoting(true);

    const timer = setTimeout(() => {
      quoteBooking({ packageId: pkg.id, travelDate, adults, children })
        .then((result) => {
          if (sequence !== quoteSequence.current) return;
          setQuote(result);
          setQuoteError('');
        })
        .catch((error) => {
          if (sequence !== quoteSequence.current) return;
          setQuote(null);
          setQuoteError(
            error?.response?.data?.message || 'We could not price this trip. Try another date or party size.',
          );
        })
        .finally(() => {
          if (sequence === quoteSequence.current) setQuoting(false);
        });
      // Debounced: the traveller taps +/- repeatedly, and each tap would
      // otherwise be its own request.
    }, 350);

    return () => clearTimeout(timer);
  }, [pkg, travelDate, adults, children]);

  /* ---------------------------------------------------------------- *
   * Book and pay
   * ---------------------------------------------------------------- */

  const finish = useCallback(async (booking) => {
    await refreshTourBookings();
    setCreatedTourData({
      id: booking.bookingId,
      packageTitle: pkg.title,
      duration: pkg.duration,
      travelDate: new Date(travelDate).toLocaleDateString('en-IN', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      }),
      travelers: `${adults} Adult${adults === 1 ? '' : 's'}${children > 0 ? `, ${children} Children` : ''}`,
      operatorName: pkg.operator?.name || 'Your operator',
      operatorPhone: pkg.operator?.phone || '',
      amountPaid: booking.advanceAmount,
      balanceDue: booking.balanceDue,
      totalAmount: booking.totalAmount,
    });
    setIsSuccessModalOpen(true);
  }, [pkg, travelDate, adults, children, refreshTourBookings]);

  const handleConfirmTour = async (event) => {
    event.preventDefault();

    if (!user?.isLoggedIn) {
      showToast('Please sign in to book this tour');
      return navigate('/login');
    }
    if (!quote) return showToast(quoteError || 'Please wait for the price to load');

    let booking;
    try {
      setSubmitting(true);

      const created = await createBooking({
        packageId: pkg.id,
        travelDate,
        adults,
        children,
        pickupPoint,
        travellerContact: { name: travelerName, phone: travelerPhone, email: travelerEmail },
        specialRequest,
      });
      booking = created.booking;
    } catch (error) {
      setSubmitting(false);
      return showToast(error?.response?.data?.message || 'We could not create this booking');
    }

    // The booking now exists but is unpaid. Everything below confirms it.
    try {
      const order = await createPaymentOrder(booking._id);

      await initRazorpayPayment({
        key: order.razorpayKeyId,
        amount: order.order.amount,
        currency: order.order.currency,
        order_id: order.order.id,
        name: 'Dima Hasao Tours',
        description: pkg.title,
        themeColor: '#0a4d2b',
        prefill: { name: travelerName, email: travelerEmail, contact: travelerPhone },
        notes: { bookingId: booking.bookingId },
        handler: async (response) => {
          try {
            const confirmed = await verifyPayment(booking._id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await finish(confirmed.booking);
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
      // 503 means this server has no Razorpay keys. The backend refuses the
      // no-gateway settle whenever they *are* configured, so this can never
      // become a way to confirm a trip without paying.
      if (error?.response?.status === 503) {
        try {
          const settled = await settleWithoutGateway(booking._id);
          await finish(settled.booking);
        } catch (settleError) {
          showToast(settleError?.response?.data?.message || 'Could not confirm this booking');
        } finally {
          setSubmitting(false);
        }
        return;
      }

      setSubmitting(false);
      showToast(error?.response?.data?.message || 'Could not start the payment');
    }
  };

  /* ---------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="bg-[#FAF6ED] min-h-screen font-poppins">
        <Header title="BOOK TOUR PACKAGE" subtitle="Loading package" showBack rightAction="none" />
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

  if (!pkg) {
    return (
      <div className="bg-[#FAF6ED] min-h-screen font-poppins">
        <Header title="Package unavailable" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <div className="p-6 text-center space-y-3 mt-10">
          <i className="fa-solid fa-suitcase-rolling text-4xl text-gray-300"></i>
          <h3 className="font-bold text-gray-800 text-sm">This tour is no longer available</h3>
          <button
            onClick={() => navigate('/packages')}
            className="bg-[#06381e] text-amber-300 text-xs font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer"
          >
            See All Packages
          </button>
        </div>
      </div>
    );
  }

  const payableNow = quote ? quote.advanceAmount : 0;
  const canSubmit = Boolean(quote) && !quoting && !submitting;

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-28 relative font-poppins">
      <Header title="BOOK TOUR PACKAGE" subtitle={pkg.title} showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <form onSubmit={handleConfirmTour} className="p-3.5 space-y-4">
        {/* Package Overview Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
          <div className="flex gap-3">
            <img
              src={pkg.heroImage}
              alt={pkg.title}
              className="w-20 h-20 rounded-xl object-cover shrink-0 border border-gray-200"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {pkg.type} • {pkg.duration}
              </span>
              <h3 className="font-montserrat font-bold text-sm text-gray-900 truncate mt-1">
                {pkg.title}
              </h3>
              {pkg.destinations.length > 0 && (
                <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                  <i className="fa-solid fa-map-pin text-emerald-700"></i>
                  <span>{pkg.destinations.join(' • ')}</span>
                </p>
              )}
              {pkg.operator?.name && (
                <p className="text-[10px] text-gray-400 mt-0.5">Operated by {pkg.operator.name}</p>
              )}
            </div>
          </div>

          {/* Travel Date & Travelers Selector */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center text-xs">
            <div className="bg-[#FAF6ED] p-2 rounded-xl border border-[#E5DDC3]/60 col-span-1">
              <span className="text-[10px] text-gray-500 block">Start Date</span>
              <input
                type="date"
                required
                value={travelDate}
                min={isoDate(pkg.leadTimeDays)}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full bg-transparent text-[11px] font-bold text-gray-900 text-center focus:outline-none mt-1 cursor-pointer"
              />
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

            <div className="bg-[#FAF6ED] p-2 rounded-xl border border-[#E5DDC3]/60">
              <span className="text-[10px] text-gray-500 block">Children</span>
              <div className="flex items-center justify-center gap-1.5 mt-1 font-bold text-gray-900">
                <button
                  type="button"
                  disabled={children <= 0}
                  onClick={() => setChildren((p) => Math.max(0, p - 1))}
                  className="w-5 h-5 rounded-full bg-white text-gray-700 flex items-center justify-center border border-gray-300 disabled:opacity-40"
                >
                  -
                </button>
                <span>{children}</span>
                <button
                  type="button"
                  onClick={() => setChildren((p) => p + 1)}
                  className="w-5 h-5 rounded-full bg-white text-gray-700 flex items-center justify-center border border-gray-300"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 text-center">
            {pkg.groupSize}
            {pkg.leadTimeDays > 0 && ` • book at least ${pkg.leadTimeDays} day${pkg.leadTimeDays > 1 ? 's' : ''} ahead`}
          </p>
        </div>

        {/* Pickup Location Preference */}
        {pkg.pickupPoints.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2.5">
            <label className="font-montserrat font-bold text-xs text-gray-900 block">
              Pickup Point in Dima Hasao
            </label>
            <select
              value={pickupPoint}
              onChange={(e) => setPickupPoint(e.target.value)}
              className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              {pkg.pickupPoints.map((point) => (
                <option key={point} value={point}>{point}</option>
              ))}
            </select>
          </div>
        )}

        {/* Primary Traveler Details */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
          <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-id-card text-emerald-800"></i>
            <span>Lead Traveler Details</span>
          </h3>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={travelerName}
                onChange={(e) => setTravelerName(e.target.value)}
                placeholder="Name on the booking"
                className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={travelerPhone}
                  onChange={(e) => setTravelerPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Email ID</label>
                <input
                  type="email"
                  value={travelerEmail}
                  onChange={(e) => setTravelerEmail(e.target.value)}
                  placeholder="For your invoice"
                  className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Anything the operator should know?
              </label>
              <textarea
                rows={2}
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                placeholder="Dietary needs, window seats, accessibility…"
                className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Payment Mode — Razorpay shows its own picker, so this states what
            happens rather than duplicating a choice it does not control. */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-1.5">
          <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-credit-card text-emerald-800"></i>
            <span>Payment Mode</span>
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            You'll choose UPI, card or net banking in the secure payment window.
          </p>
          <div className="flex items-center gap-3 pt-1 text-emerald-900">
            <i className="fa-solid fa-qrcode text-sm"></i>
            <i className="fa-solid fa-credit-card text-sm"></i>
            <i className="fa-solid fa-building-columns text-sm"></i>
          </div>
        </div>

        {/* Fare Summary — every figure here is the server's */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2">
          <h3 className="font-montserrat font-bold text-sm text-gray-900">Price Breakdown</h3>

          {quoteError ? (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-2.5">
              {quoteError}
            </p>
          ) : !quote ? (
            <div className="space-y-2 animate-pulse py-1">
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ) : (
            <div className={`space-y-1.5 text-xs text-gray-600 transition-opacity ${quoting ? 'opacity-50' : ''}`}>
              <div className="flex justify-between">
                <span>
                  Package Base Price ({quote.adults} Adult{quote.adults === 1 ? '' : 's'}
                  {quote.children > 0 ? `, ${quote.children} Children` : ''})
                </span>
                <span className="font-semibold text-gray-900">{rupees(quote.baseAmount)}</span>
              </div>

              {quote.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount</span>
                  <span>- {rupees(quote.discount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Tourism GST &amp; Permits ({quote.taxRate}%)</span>
                <span className="font-semibold text-gray-900">{rupees(quote.taxes)}</span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline text-gray-900">
                <span className="font-bold text-sm">Total Package Fare</span>
                <span className="font-black text-lg text-emerald-950 font-montserrat">
                  {rupees(quote.totalAmount)}
                </span>
              </div>

              {quote.balanceDue > 0 && (
                <div className="mt-2 bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl p-2.5 space-y-1">
                  <div className="flex justify-between font-bold text-emerald-950">
                    <span>Pay now ({quote.advancePercent}% advance)</span>
                    <span>{rupees(quote.advanceAmount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Pay the operator on the day</span>
                    <span className="font-semibold">{rupees(quote.balanceDue)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CTA Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-[#06381e] hover:bg-[#0a4d2b] disabled:opacity-60 text-amber-300 font-bold text-sm py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
              <span>Processing…</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-lock text-xs"></i>
              <span>{quote ? `Confirm & Pay (${rupees(payableNow)})` : 'Loading price…'}</span>
            </>
          )}
        </motion.button>
      </form>

      {/* Success Modal */}
      <AnimatePresence>
        {isSuccessModalOpen && createdTourData && (
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
              <div className="text-center space-y-1">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
                  <i className="fa-solid fa-compass"></i>
                </div>
                <h3 className="font-montserrat font-bold text-lg text-gray-900">
                  Tour Package Confirmed!
                </h3>
                <p className="text-xs text-gray-500">Your expedition has been booked successfully</p>
                <span className="inline-block bg-[#FAF6ED] text-emerald-900 font-mono font-bold text-xs px-3 py-1 rounded-full border border-[#E5DDC3]">
                  ID: {createdTourData.id}
                </span>
              </div>

              {/* Digital Tour Pass */}
              <div className="bg-[#FAF6ED] rounded-2xl p-3.5 border border-[#E5DDC3] space-y-2 text-xs">
                <div className="border-b border-[#E5DDC3] pb-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Tour</span>
                  <h4 className="font-bold text-gray-900">{createdTourData.packageTitle}</h4>
                  <p className="text-emerald-800 font-semibold">{createdTourData.duration}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Travel Date:</span>
                    <span className="font-semibold">{createdTourData.travelDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Travelers:</span>
                    <span className="font-semibold">{createdTourData.travelers}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-gray-400 block">Your Operator:</span>
                    <span className="font-semibold text-emerald-900">
                      {createdTourData.operatorName}
                      {createdTourData.operatorPhone && ` (${createdTourData.operatorPhone})`}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5DDC3] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">Paid online:</span>
                    <span className="font-black text-sm text-emerald-950 font-montserrat">
                      {rupees(createdTourData.amountPaid)}
                    </span>
                  </div>
                  {createdTourData.balanceDue > 0 && (
                    <div className="flex justify-between items-center text-amber-800">
                      <span className="font-semibold">Due to the operator:</span>
                      <span className="font-bold">{rupees(createdTourData.balanceDue)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
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
