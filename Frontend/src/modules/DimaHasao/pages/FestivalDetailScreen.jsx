import { useState } from 'react';
import { useParams, useNavigate } from '../router';
import { FESTIVALS_DATA } from '../data/festivalData';
import { useBooking } from '../context/BookingContext';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion, AnimatePresence } from 'framer-motion';

export const FestivalDetailScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { createFestivalBooking, showToast } = useBooking();

  const festival = FESTIVALS_DATA.find((f) => f.id === id) || FESTIVALS_DATA[0];

  // Ticket quantities state { [categoryId]: number }
  const [ticketQuantities, setTicketQuantities] = useState({
    [festival.ticketCategories[0]?.id]: 1
  });

  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdPassData, setCreatedPassData] = useState(null);

  const handleUpdateQty = (catId, delta) => {
    setTicketQuantities((prev) => {
      const current = prev[catId] || 0;
      const updated = Math.max(0, current + delta);
      return { ...prev, [catId]: updated };
    });
  };

  const totalTickets = Object.values(ticketQuantities).reduce((a, b) => a + b, 0);

  const subtotal = festival.ticketCategories.reduce((sum, cat) => {
    const qty = ticketQuantities[cat.id] || 0;
    return sum + cat.price * qty;
  }, 0);

  const taxes = Math.round(subtotal * 0.05);
  const totalAmount = subtotal + taxes;

  const handleBookTickets = () => {
    if (totalTickets === 0) {
      showToast('Please select at least 1 ticket');
      return;
    }

    const selectedCategory = festival.ticketCategories.find(
      (c) => (ticketQuantities[c.id] || 0) > 0
    );

    const bookingPayload = {
      festivalId: festival.id,
      festivalName: festival.name,
      ticketCategory: selectedCategory?.name || 'Festival Entry Pass',
      ticketCount: totalTickets,
      totalAmount,
      venue: festival.venue,
      dates: festival.dates,
      image: festival.heroImage
    };

    const newBooking = createFestivalBooking(bookingPayload);
    setCreatedPassData(newBooking);
    setIsSuccessModalOpen(true);
  };

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-32 relative font-poppins">
      <Header
        title={festival.name}
        subtitle={festival.dates}
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      {/* Hero Banner */}
      <div className="relative h-52 sm:h-60 w-full overflow-hidden bg-black">
        <img
          src={festival.heroImage}
          alt={festival.name}
          className="w-full h-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />

        <div className="absolute bottom-3 left-3.5 right-3.5 text-white space-y-1">
          <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
            {festival.dates}
          </span>
          <h1 className="font-montserrat font-bold text-lg text-white leading-tight">
            {festival.name}
          </h1>
          <p className="text-xs text-gray-200 truncate flex items-center gap-1">
            <i className="fa-solid fa-location-dot text-amber-400"></i>
            <span>{festival.venue}</span>
          </p>
        </div>
      </div>

      <main className="p-3.5 space-y-4">
        {/* Organizer & Description Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2.5">
          <div className="flex items-center gap-2 text-emerald-800 text-[11px] font-bold">
            <i className="fa-solid fa-building-columns"></i>
            <span>Organized by: {festival.organizer}</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{festival.description}</p>
        </div>

        {/* Highlights */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2.5">
          <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-star text-amber-400"></i>
            <span>Festival Attractions & Lineup</span>
          </h3>

          <div className="space-y-2">
            {festival.highlights.map((hl, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                <i className="fa-solid fa-circle-check text-emerald-600 text-xs mt-0.5 shrink-0"></i>
                <span className="leading-relaxed">{hl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ticket Categories Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-montserrat font-bold text-sm text-gray-900">
              Select Ticket Category
            </h3>
            <span className="text-[11px] text-gray-500 font-medium">Real-Time Available</span>
          </div>

          <div className="space-y-3">
            {festival.ticketCategories.map((cat) => {
              const qty = ticketQuantities[cat.id] || 0;

              return (
                <div
                  key={cat.id}
                  className={`bg-white rounded-2xl p-4 border transition-all ${
                    cat.isSoldOut
                      ? 'border-gray-200 opacity-60'
                      : qty > 0
                      ? 'border-emerald-700 shadow-sm ring-1 ring-emerald-600'
                      : 'border-[#E5DDC3] shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-montserrat font-bold text-sm text-gray-900">
                          {cat.name}
                        </h4>
                        {cat.isSoldOut ? (
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.2 rounded">
                            Sold Out
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded">
                            {cat.remainingTickets} left
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="font-montserrat font-extrabold text-base text-emerald-950">
                          ₹{cat.price}
                        </span>
                        {cat.originalPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            ₹{cat.originalPrice}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    {!cat.isSoldOut && (
                      <div className="flex items-center bg-[#FAF6ED] rounded-xl px-2 py-1 border border-[#E5DDC3] font-bold text-xs gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(cat.id, -1)}
                          className="w-5 h-5 flex items-center justify-center text-gray-700 hover:text-emerald-800 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-gray-900 w-4 text-center">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(cat.id, 1)}
                          className="w-5 h-5 flex items-center justify-center text-gray-700 hover:text-emerald-800 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Perks list */}
                  <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1">
                    {cat.perks.map((perk, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                        <i className="fa-solid fa-check text-emerald-600 text-[10px]"></i>
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Sticky Bottom Checkout Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5DDC3] p-3 shadow-lg flex justify-center">
        <div className="w-full max-w-[430px] flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">
              {totalTickets} {totalTickets === 1 ? 'Pass' : 'Passes'} Selected
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold text-emerald-950 font-montserrat">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-gray-400">(incl. GST)</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            disabled={totalTickets === 0}
            onClick={handleBookTickets}
            className="bg-[#06381e] disabled:opacity-50 hover:bg-[#0a4d2b] text-amber-300 text-xs font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-ticket text-xs"></i>
            <span>Book Passes Now</span>
          </motion.button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isSuccessModalOpen && createdPassData && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-5 shadow-2xl z-10 w-full max-w-sm border border-emerald-200 relative space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="text-center space-y-1">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
                  <i className="fa-solid fa-ticket"></i>
                </div>
                <h3 className="font-montserrat font-bold text-lg text-gray-900">
                  Festival Pass Confirmed!
                </h3>
                <p className="text-xs text-gray-500">Official Government Tourism E-Ticket</p>
                <span className="inline-block bg-[#FAF6ED] text-emerald-900 font-mono font-bold text-xs px-3 py-1 rounded-full border border-[#E5DDC3]">
                  Pass ID: {createdPassData.id}
                </span>
              </div>

              {/* Digital E-Pass with QR Simulation */}
              <div className="bg-[#FAF6ED] rounded-2xl p-4 border border-[#E5DDC3] space-y-3 text-xs">
                {/* QR Code graphic */}
                <div className="w-28 h-28 mx-auto bg-white p-2 rounded-xl shadow-xs border border-gray-200 flex flex-col items-center justify-center">
                  <i className="fa-solid fa-qrcode text-5xl text-gray-900"></i>
                  <span className="font-mono text-[9px] font-bold text-gray-500 mt-1">
                    {createdPassData.qrCode}
                  </span>
                </div>

                <div className="border-t border-[#E5DDC3] pt-2 text-center">
                  <h4 className="font-bold text-sm text-gray-900">{createdPassData.festivalName}</h4>
                  <p className="text-emerald-800 font-semibold">{createdPassData.ticketCategory}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{createdPassData.dates}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700 bg-white p-2.5 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Pass Count:</span>
                    <span className="font-semibold">{createdPassData.ticketCount} Tickets</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Total Amount:</span>
                    <span className="font-bold text-emerald-900">
                      ₹{createdPassData.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
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
