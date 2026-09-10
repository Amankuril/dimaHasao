import { useState } from 'react';
import { useBooking } from '../context/BookingContext';
import { TRANSPORTS_DATA } from '../data/tourismData';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { RouteMap } from '../components/booking/RouteMap';
import { RideSummary } from '../components/booking/RideSummary';
import { PaymentOptions } from '../components/booking/PaymentOptions';
import { TravelTips } from '../components/booking/TravelTips';
import { BookingConfirmationModal } from '../components/booking/BookingConfirmationModal';
import { motion, AnimatePresence } from 'framer-motion';

export const RideBookingScreen = () => {
  const {
    activePlace,
    activeTransport,
    selectedTransportId,
    setSelectedTransportId,
    pickupLocation,
    setPickupLocation,
    createBooking,
    showToast
  } = useBooking();

  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [isChangePickupOpen, setIsChangePickupOpen] = useState(false);
  const [tempPickup, setTempPickup] = useState(pickupLocation || 'Haflong Station');

  const handleConfirmBooking = () => {
    const booking = createBooking();
    setCreatedBooking(booking);
    setIsConfirmationOpen(true);
  };

  const handleUpdatePickup = (e) => {
    e.preventDefault();
    setPickupLocation(tempPickup);
    setIsChangePickupOpen(false);
    showToast(`Pickup updated to: ${tempPickup}`);
  };

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-36 relative font-poppins">
      {/* Header Section */}
      <Header
        title={activePlace.name}
        subtitle={`${pickupLocation || 'Haflong Station'} to ${activePlace.name}`}
        showBack={true}
        rightAction="favorite"
        placeId={activePlace.id}
      />

      {/* Decorative Border */}
      <PatternDivider variant="green-gold" />

      {/* Main Content */}
      <main className="p-4 space-y-5">
        {/* BEGIN: Destination Info Section */}
        <section className="flex flex-col sm:flex-row gap-3.5">
          {/* Image Card with Pickup Location Overlay */}
          <div className="relative w-full sm:w-1/2 rounded-2xl overflow-hidden shadow-sm h-48 bg-gray-200">
            <img
              alt={activePlace.name}
              className="w-full h-full object-cover"
              src={activePlace.heroImage || activePlace.mainImage}
            />
            {/* Pickup Overlay */}
            <div className="absolute bottom-2 left-2 right-2 bg-[#1B4D2E]/95 text-white p-2.5 rounded-xl text-xs backdrop-blur-xs border border-white/20 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <i className="fa-solid fa-circle-info text-amber-400 text-base shrink-0"></i>
                <div className="min-w-0 flex-1">
                  <p className="opacity-80 text-[10px] uppercase font-semibold leading-tight">You are at:</p>
                  <p className="font-bold text-xs truncate leading-tight">{pickupLocation || 'Haflong Station'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsChangePickupOpen(true)}
                className="text-amber-400 font-semibold text-[11px] hover:text-amber-300 w-full text-left pl-6 cursor-pointer"
              >
                Change Location &gt;
              </button>
            </div>
          </div>

          {/* Details Card */}
          <div className="w-full sm:w-1/2 space-y-3">
            <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-[#E5DDC3]">
              <div className="flex items-start gap-2.5">
                <i className="fa-solid fa-location-dot text-red-500 mt-1 text-base shrink-0"></i>
                <div>
                  <h2 className="font-bold text-sm text-gray-900 leading-tight">{activePlace.name}</h2>
                  <p className="text-[11px] text-gray-600 mt-1 leading-snug">{activePlace.fullAddress}</p>
                </div>
              </div>
            </div>

            {/* Quick 3-stats */}
            <div className="bg-[#F1EBD7] rounded-2xl p-3 shadow-sm flex justify-between border border-[#E5DDC3] text-center">
              <div className="flex flex-col items-center justify-center w-1/3 border-r border-[#E5DDC3]/60 pr-1">
                <i className="fa-solid fa-route text-[#1B4D2E] mb-1 text-base"></i>
                <span className="text-[9px] text-gray-500 uppercase font-semibold">Distance</span>
                <span className="font-bold text-xs text-gray-900">{activePlace.distanceFromStation}</span>
              </div>
              <div className="flex flex-col items-center justify-center w-1/3 border-r border-[#E5DDC3]/60 px-1">
                <i className="fa-regular fa-clock text-[#1B4D2E] mb-1 text-base"></i>
                <span className="text-[9px] text-gray-500 uppercase font-semibold">Travel Time</span>
                <span className="font-bold text-xs text-gray-900 leading-tight">{activePlace.travelTime}</span>
              </div>
              <div className="flex flex-col items-center justify-center w-1/3 pl-1">
                <i className="fa-solid fa-mountain-sun text-[#1B4D2E] mb-1 text-base"></i>
                <span className="text-[9px] text-gray-500 uppercase font-semibold">Best Time</span>
                <span className="text-[9px] font-bold text-gray-900 leading-tight">Sunrise &amp; Sunset</span>
              </div>
            </div>
          </div>
        </section>
        {/* END: Destination Info Section */}

        {/* BEGIN: Selected Transport Section */}
        <section>
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="font-bold text-sm sm:text-base text-gray-900">Selected Transport</h3>
            <span className="text-[10px] text-gray-500">Tap below to switch vehicle</span>
          </div>

          {/* Quick Vehicle Switcher Tabs */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {TRANSPORTS_DATA.map((t) => {
              const isSelected = selectedTransportId === t.id;
              return (
                <motion.button
                  key={t.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedTransportId(t.id)}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1B4D2E] text-white border-[#1B4D2E] shadow-sm font-bold'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50'
                  }`}
                >
                  <div className="text-xs font-semibold">{t.name}</div>
                  <div className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-emerald-800'}`}>
                    {t.fareFormatted}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Active Transport Card */}
          <motion.div
            key={activeTransport.id}
            initial={{ opacity: 0.8, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#F1EBD7] rounded-2xl p-3.5 shadow-sm flex items-center justify-between border border-[#E5DDC3]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                alt={activeTransport.name}
                className="w-16 h-12 object-contain shrink-0 mix-blend-multiply"
                src={activeTransport.image}
              />
              <div className="min-w-0">
                <h4 className="font-bold text-base text-[#1B4D2E] leading-tight">{activeTransport.name}</h4>
                <div className="flex items-center gap-3 text-xs font-medium text-gray-700 mt-1">
                  <span className="flex items-center gap-1">
                    <i className="fa-regular fa-clock text-gray-400 text-[10px]"></i>
                    <span className="text-[11px]">{activeTransport.time}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-500 uppercase">MRP</span>
                    <strong className="text-sm font-bold text-gray-900">{activeTransport.fareFormatted}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#4A7C59] text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs shrink-0">
              <span>SELECTED</span>
              <i className="fa-solid fa-check"></i>
            </div>
          </motion.div>
        </section>
        {/* END: Selected Transport Section */}

        {/* Route Overview Section */}
        <RouteMap place={activePlace} transport={activeTransport} />

        {/* Ride Summary & Payment Section */}
        <section className="space-y-3.5">
          <h3 className="font-bold text-sm sm:text-base text-gray-900">Ride Summary &amp; Payment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <RideSummary place={activePlace} transport={activeTransport} />
            <PaymentOptions transport={activeTransport} onBookNow={handleConfirmBooking} />
          </div>
        </section>

        {/* Travel Tips Section */}
        <TravelTips />
      </main>

      {/* BEGIN: Bottom Fixed Confirmation Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto bg-[#1B4D2E] text-white pb-safe border-t-4 border-amber-400 z-50 shadow-2xl">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 border border-white/30 rounded-xl flex items-center justify-center bg-white/10">
              <i className={`${activeTransport.iconClass} text-lg text-amber-300`}></i>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-200">{activeTransport.name} Selected</p>
              <p className="text-base font-black text-amber-300 flex items-center gap-1">
                MRP {activeTransport.fareFormatted}
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleConfirmBooking}
            className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold py-2.5 px-4 sm:px-5 rounded-xl flex items-center gap-1.5 shadow-lg text-xs sm:text-sm cursor-pointer transition-all"
          >
            <span>Confirm &amp; Book</span>
            <i className="fa-solid fa-arrow-right text-xs"></i>
          </motion.button>
        </div>

        <div className="bg-[#133a21] text-center py-1.5 text-[10px] font-medium text-[#a3c9b1] flex justify-center items-center gap-1.5">
          <i className="fa-solid fa-leaf text-amber-400 text-[9px]"></i>
          <span>Enjoy a safe and memorable journey!</span>
          <i className="fa-solid fa-leaf text-amber-400 text-[9px]"></i>
        </div>
      </div>
      {/* END: Bottom Fixed Bar */}

      {/* Change Pickup Location Modal */}
      <AnimatePresence>
        {isChangePickupOpen && (
          <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChangePickupOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-5 shadow-2xl z-10 w-full max-w-sm border border-emerald-100 relative"
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-sm text-gray-900">Change Pickup Location</h4>
                <button
                  onClick={() => setIsChangePickupOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>

              <form onSubmit={handleUpdatePickup} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Enter Pickup Point</label>
                  <input
                    type="text"
                    value={tempPickup}
                    onChange={(e) => setTempPickup(e.target.value)}
                    placeholder="e.g. Haflong Station, Lower Haflong, Circuit House"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Popular Pickup Points</p>
                  {['Haflong Station', 'Lower Haflong Market', 'Haflong Lake Side', 'Circuit House'].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setTempPickup(pt)}
                      className="w-full text-left p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 text-xs text-gray-800 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <i className="fa-solid fa-location-crosshairs text-emerald-700 text-xs"></i>
                      <span>{pt}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#0a3a22] text-white rounded-xl font-bold text-xs hover:bg-emerald-800 shadow cursor-pointer transition-colors"
                >
                  Save Pickup Point
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Confirmation Dialog */}
      <BookingConfirmationModal
        isOpen={isConfirmationOpen}
        booking={createdBooking}
        onClose={() => setIsConfirmationOpen(false)}
      />
    </div>
  );
};
