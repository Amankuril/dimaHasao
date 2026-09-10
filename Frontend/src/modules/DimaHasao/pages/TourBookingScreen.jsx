import { useState } from 'react';
import { useParams, useNavigate } from '../router';
import { TOUR_PACKAGES_DATA } from '../data/tourPackageData';
import { useBooking } from '../context/BookingContext';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion, AnimatePresence } from 'framer-motion';

export const TourBookingScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, createTourBooking, showToast } = useBooking();

  const pkg = TOUR_PACKAGES_DATA.find((p) => p.id === id) || TOUR_PACKAGES_DATA[0];

  const [travelDate, setTravelDate] = useState('2026-09-12');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [pickupPoint, setPickupPoint] = useState('Haflong Railway Station (Pickup at 9:00 AM)');

  const [travelerName, setTravelerName] = useState(user.name !== 'Guest' ? user.name : 'Dima Explorer');
  const [travelerPhone, setTravelerPhone] = useState(user.phone || '+91 98765 43210');
  const [travelerEmail, setTravelerEmail] = useState('explorer@dimahasao.in');
  const [specialRequest, setSpecialRequest] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountCodeName, setDiscountCodeName] = useState('');

  // Confirmation Modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdTourData, setCreatedTourData] = useState(null);

  // Price calculations
  const totalTravelers = adults + children;
  const basePrice = pkg.pricePerPerson * adults + Math.round(pkg.pricePerPerson * 0.6) * children;
  const discountAmount = appliedDiscount > 0 ? Math.round(basePrice * (appliedDiscount / 100)) : 0;
  const taxableAmount = basePrice - discountAmount;
  const gstAmount = Math.round(taxableAmount * 0.05);
  const ecoCess = 150;
  const totalAmount = taxableAmount + gstAmount + ecoCess;

  const handleApplyPromo = (e) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code === 'TOUR10' || code === 'EXPLORE') {
      setAppliedDiscount(10);
      setDiscountCodeName(code);
      showToast(`Promo ${code} applied! 10% OFF 🎒`);
    } else {
      showToast('Invalid code. Try TOUR10 or EXPLORE');
    }
  };

  const handleConfirmTour = (e) => {
    e.preventDefault();

    const tourPayload = {
      packageId: pkg.id,
      packageTitle: pkg.title,
      duration: pkg.duration,
      travelDate: new Date(travelDate).toLocaleDateString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      travelers: `${adults} Adults${children > 0 ? `, ${children} Children` : ''}`,
      pickupPoint,
      totalAmount,
      paymentMethod: paymentMethod === 'upi' ? 'UPI (Instant)' : 'Credit/Debit Card',
      image: pkg.heroImage,
      travelerName,
      travelerPhone,
      travelerEmail,
      specialRequest
    };

    const newTour = createTourBooking(tourPayload);
    setCreatedTourData(newTour);
    setIsSuccessModalOpen(true);
  };

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-28 relative font-poppins">
      <Header
        title="BOOK TOUR PACKAGE"
        subtitle={pkg.title}
        showBack={true}
        rightAction="none"
      />
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
              <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                <i className="fa-solid fa-map-pin text-emerald-700"></i>
                <span>{pkg.destinations.join(' • ')}</span>
              </p>
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
        </div>

        {/* Pickup Location Preference */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2.5">
          <label className="font-montserrat font-bold text-xs text-gray-900 block">
            Pickup Point in Dima Hasao
          </label>
          <select
            value={pickupPoint}
            onChange={(e) => setPickupPoint(e.target.value)}
            className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            <option value="Haflong Railway Station (Pickup at 9:00 AM)">
              Haflong Railway Station (Recommended)
            </option>
            <option value="Haflong Town Center / Hotel Pickup">
              Haflong Town Center / Hotel Pickup
            </option>
            <option value="Jatinga Road Junction">Jatinga Road Junction</option>
            <option value="Umrangso Kopili Main Gate">Umrangso Kopili Main Gate</option>
          </select>
        </div>

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
                  className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Email ID</label>
                <input
                  type="email"
                  required
                  value={travelerEmail}
                  onChange={(e) => setTravelerEmail(e.target.value)}
                  className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Promo Code Box */}
        <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#E5DDC3]">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Promo Code (e.g. TOUR10)"
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
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2.5">
          <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-credit-card text-emerald-800"></i>
            <span>Payment Mode</span>
          </h3>

          <div className="space-y-1.5">
            {[
              { id: 'upi', label: 'UPI / QR (Google Pay, PhonePe, Paytm)', icon: 'fa-solid fa-qrcode' },
              { id: 'card', label: 'Credit / Debit Cards (Visa, MC, RuPay)', icon: 'fa-solid fa-credit-card' },
              { id: 'netbanking', label: 'Net Banking (All Indian Banks)', icon: 'fa-solid fa-building-columns' }
            ].map((m) => (
              <label
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  paymentMethod === m.id
                    ? 'border-emerald-700 bg-emerald-50/70 ring-1 ring-emerald-600'
                    : 'border-[#E5DDC3] bg-[#FAF6ED]/40 hover:bg-[#FAF6ED]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="tourPayment"
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)}
                    className="accent-emerald-800 w-3.5 h-3.5"
                  />
                  <i className={`${m.icon} text-xs text-emerald-900`}></i>
                  <span className="text-xs font-semibold text-gray-900">{m.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Fare Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2">
          <h3 className="font-montserrat font-bold text-sm text-gray-900">Price Breakdown</h3>

          <div className="space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>
                Package Base Price ({adults} Adults{children > 0 ? `, ${children} Children` : ''})
              </span>
              <span className="font-semibold text-gray-900">₹{basePrice.toLocaleString('en-IN')}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Promo Discount ({appliedDiscount}%)</span>
                <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Tourism GST & Permits (5%)</span>
              <span className="font-semibold text-gray-900">₹{gstAmount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between">
              <span>Borail Eco-Conservation Cess</span>
              <span className="font-semibold text-gray-900">₹{ecoCess}</span>
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline text-gray-900">
              <span className="font-bold text-sm">Total Package Fare</span>
              <span className="font-black text-lg text-emerald-950 font-montserrat">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          type="submit"
          className="w-full bg-[#06381e] hover:bg-[#0a4d2b] text-amber-300 font-bold text-sm py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <i className="fa-solid fa-lock text-xs"></i>
          <span>Confirm & Pay (₹{totalAmount.toLocaleString('en-IN')})</span>
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
                    <span className="text-[10px] text-gray-400 block">Guide Assigned:</span>
                    <span className="font-semibold text-emerald-900">
                      {createdTourData.guideAssigned} ({createdTourData.guidePhone})
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5DDC3] flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total Paid:</span>
                  <span className="font-black text-sm text-emerald-950 font-montserrat">
                    ₹{createdTourData.totalAmount.toLocaleString('en-IN')}
                  </span>
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
