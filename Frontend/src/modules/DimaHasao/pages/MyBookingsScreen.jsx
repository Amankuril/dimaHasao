import { useState } from 'react';
import { useNavigate, useSearchParams, useHostNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { groupPasses } from '../services/festivalApi';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion } from 'framer-motion';

export const MyBookingsScreen = () => {
  const { bookings, hotelBookings, foodOrders, tourBookings, festivalBookings, showToast } =
    useBooking();
  /*
   * Tours and festivals used to share one "Passes" tab. They are separate
   * products with separate operators, so each module now gets its own — which
   * also lets Profile link straight at a module's bookings via ?tab=.
   */
  const [searchParams] = useSearchParams();
  const TAB_IDS = ['rides', 'hotels', 'food', 'tours', 'festivals'];
  const [activeTab, setActiveTab] = useState(() => {
    const requested = searchParams.get('tab');
    return TAB_IDS.includes(requested) ? requested : 'rides';
  });
  const navigate = useNavigate();
  const hostNavigate = useHostNavigate();

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-28 relative font-poppins">
      <Header
        title="MY BOOKINGS"
        subtitle="Manage rides, stays, food & festival passes"
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      {/* Tabs Switcher */}
      <div className="px-3 pt-3">
        {(() => {
          const bookingTabs = [
            { id: 'rides', label: `Rides (${bookings.length})`, icon: 'fa-solid fa-taxi' },
            { id: 'hotels', label: `Stays (${hotelBookings.length})`, icon: 'fa-solid fa-hotel' },
            { id: 'food', label: `Food (${foodOrders.length})`, icon: 'fa-solid fa-utensils' },
            { id: 'tours', label: `Tours (${tourBookings.length})`, icon: 'fa-solid fa-suitcase-rolling' },
            { id: 'festivals', label: `Passes (${festivalBookings.length})`, icon: 'fa-solid fa-ticket' }
          ];

          /*
           * Scrolls sideways rather than dividing the width five ways. Five
           * labels with icons and counts do not fit across a phone: they used
           * to squeeze until the icons sat on top of the text.
           *
           * The active state is painted on the button itself. It used to be an
           * absolutely positioned pill sized `calc((100% - 8px) / 4)` — four,
           * while there were five tabs — so it was both too wide and parked
           * one fifth away from whatever it was meant to be highlighting. A
           * pill cannot follow a scrolling strip without re-deriving that
           * arithmetic on every scroll, and this needs no arithmetic at all.
           */
          return (
            <div className="bg-[#ede8dc] p-1 rounded-2xl border border-[#dfd6c4] shadow-xs overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1 w-max min-w-full">
                {bookingTabs.map((tab) => {
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-pressed={isActive}
                      // Keeps the chosen tab on screen when it sits off the
                      // edge of the strip.
                      ref={(el) => { if (el && isActive) el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }}
                      className={`flex-none whitespace-nowrap py-2 px-3 text-[11px] rounded-xl transition-colors duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-white border border-[#dfd6c4]/80 shadow-xs text-[#06381e] font-extrabold'
                          : 'border border-transparent text-stone-600 hover:text-stone-900 font-semibold'
                      }`}
                    >
                      <i
                        className={`${tab.icon} text-[10px] transition-colors duration-200 ${
                          isActive ? 'text-[#06381e]' : 'text-stone-400'
                        }`}
                      ></i>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      <main className="p-3.5 space-y-4">
        {/* TAB 1: RIDES */}
        {activeTab === 'rides' && (
          <div className="space-y-3">
            {bookings.length > 0 ? (
              bookings.map((b) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3"
                >
                  <div className="flex justify-between items-start border-b border-gray-100 pb-2.5">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                        {b.date} • ID: {b.id}
                      </span>
                      <h3 className="font-bold text-sm text-gray-900">{b.placeName}</h3>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      {b.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 bg-[#FAF6ED] p-2.5 rounded-xl border border-[#E5DDC3]/60">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-medium">Pickup:</span>
                      <span className="font-semibold text-gray-900 truncate block">{b.pickup}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-medium">Transport:</span>
                      <span className="font-semibold text-emerald-800">{b.transport} ({b.vehicleNo})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-medium">Driver:</span>
                      <span className="font-medium text-gray-800">{b.driverName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-medium">Ride OTP:</span>
                      <span className="font-mono font-bold text-amber-700">{b.otp}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase">Total Fare:</span>
                      <span className="text-sm font-bold text-gray-900 ml-1.5 font-montserrat">₹{b.fare}</span>
                    </div>
                    <button
                      onClick={() => showToast(`Connecting to driver at ${b.driverPhone}`)}
                      className="bg-[#06381e] text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <i className="fa-solid fa-phone text-[10px]"></i>
                      <span>Call Driver</span>
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-14 bg-white rounded-2xl border border-[#E5DDC3] p-6 space-y-3">
                <i className="fa-solid fa-car-side text-4xl text-gray-300"></i>
                <h3 className="font-bold text-gray-800 text-sm">No Active Rides</h3>
                <p className="text-xs text-gray-500">You haven't booked any taxi or auto rides yet.</p>
                <button
                  onClick={() => hostNavigate('/taxi/user')}
                  className="bg-[#06381e] text-amber-300 text-xs font-bold px-4 py-2 rounded-xl shadow hover:bg-emerald-900 transition-colors cursor-pointer"
                >
                  Book a Taxi Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HOTEL STAYS */}
        {activeTab === 'hotels' && (
          <div className="space-y-3">
            {hotelBookings.length > 0 ? (
              hotelBookings.map((hb) => (
                <motion.div
                  key={hb.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3"
                >
                  <div className="flex gap-3">
                    <img
                      src={hb.image}
                      alt={hb.hotelName}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          ID: {hb.id}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {hb.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-gray-900 truncate mt-0.5">{hb.hotelName}</h3>
                      <p className="text-xs font-semibold text-emerald-800">{hb.roomName}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 bg-[#FAF6ED] p-2.5 rounded-xl border border-[#E5DDC3]/60">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-medium">Check-In:</span>
                      <span className="font-semibold text-gray-900">{hb.checkIn}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-medium">Check-Out:</span>
                      <span className="font-semibold text-gray-900">{hb.checkOut}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-medium">Guests:</span>
                      <span className="font-medium text-gray-800">{hb.guests}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-medium">Payment:</span>
                      <span className="font-semibold text-emerald-800">{hb.paymentStatus}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase">Total Amount:</span>
                      <span className="text-sm font-bold text-gray-900 ml-1.5 font-montserrat">
                        ₹{hb.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <button
                      onClick={() => showToast(`Digital Invoice for ${hb.id} sent to SMS/WhatsApp 📄`)}
                      className="bg-[#06381e] text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <i className="fa-solid fa-file-invoice text-[10px]"></i>
                      <span>Invoice</span>
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-14 bg-white rounded-2xl border border-[#E5DDC3] p-6 space-y-3">
                <i className="fa-solid fa-hotel text-4xl text-gray-300"></i>
                <h3 className="font-bold text-gray-800 text-sm">No Hotel Reservations</h3>
                <p className="text-xs text-gray-500">You haven't booked any hotel stays or homestays yet.</p>
                <button
                  onClick={() => navigate('/hotels')}
                  className="bg-[#06381e] text-amber-300 text-xs font-bold px-4 py-2 rounded-xl shadow hover:bg-emerald-900 transition-colors cursor-pointer"
                >
                  Explore Stays in Haflong
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FOOD ORDERS */}
        {activeTab === 'food' && (
          <div className="space-y-3">
            {foodOrders.length > 0 ? (
              foodOrders.map((fo) => (
                <motion.div
                  key={fo.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3"
                >
                  <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">
                        {fo.orderTime} • ID: {fo.id}
                      </span>
                      <h4 className="font-bold text-sm text-gray-900">{fo.restaurantName}</h4>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {fo.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-700 bg-[#FAF6ED] p-2.5 rounded-xl border border-[#E5DDC3]/60">
                    {fo.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {it.quantity} × {it.name}
                        </span>
                        <span className="font-semibold text-gray-900">₹{it.price * it.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase">Total Paid:</span>
                      <span className="text-sm font-bold text-gray-900 ml-1.5 font-montserrat">
                        ₹{fo.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <button
                      onClick={() => hostNavigate(`/food/user/orders/${fo.id}`)}
                      className="bg-[#06381e] text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <i className="fa-solid fa-location-crosshairs text-[10px]"></i>
                      <span>Track Order</span>
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-14 bg-white rounded-2xl border border-[#E5DDC3] p-6 space-y-3">
                <i className="fa-solid fa-utensils text-4xl text-gray-300"></i>
                <h3 className="font-bold text-gray-800 text-sm">No Food Orders Yet</h3>
                <p className="text-xs text-gray-500">Order traditional Dimasa food & bakes.</p>
                <button
                  onClick={() => hostNavigate('/food/user')}
                  className="bg-[#06381e] text-amber-300 text-xs font-bold px-4 py-2 rounded-xl shadow hover:bg-emerald-900 transition-colors cursor-pointer"
                >
                  Explore Restaurants
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4 & 5: TOURS, AND FESTIVAL PASSES */}
        {(activeTab === 'tours' || activeTab === 'festivals') && (
          <div className="space-y-4">
            {/* Festival Passes */}
            {activeTab === 'festivals' && festivalBookings.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-montserrat font-bold text-xs text-gray-500 uppercase tracking-wider px-1">
                  Festival & Event Passes
                </h4>

                {groupPasses(festivalBookings).map((group) => (
                  <motion.div
                    key={group.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3"
                  >
                    <div className="flex gap-3">
                      <img
                        src={group.image}
                        alt={group.festivalName}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-200"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] text-gray-400 font-bold uppercase truncate">
                            ID: {group.id}
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                            {group.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 truncate mt-0.5">{group.festivalName}</h4>
                        <p className="text-xs font-semibold text-emerald-800">{group.categoryLabel}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 bg-[#FAF6ED] p-2.5 rounded-xl border border-[#E5DDC3]/60">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Dates:</span>
                        <span className="font-semibold">{group.dates}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Passes:</span>
                        <span className="font-semibold">
                          {group.ticketCount} {group.ticketCount === 1 ? 'Ticket' : 'Tickets'}
                        </span>
                      </div>
                    </div>

                    {/* One row per pass. They are separate passes because each
                        category grants different access and is scanned on its
                        own, even though the purchase was a single payment. On a
                        single-category card the header already names it, so only
                        the code and the button are worth repeating. */}
                    <div className="space-y-1.5">
                      {group.passes.map((pass) => (
                        <div
                          key={pass.id}
                          className="flex items-center justify-between gap-2 bg-white border border-gray-100 rounded-xl px-2.5 py-2"
                        >
                          <div className="min-w-0">
                            {group.passes.length > 1 && (
                              <p className="text-xs font-semibold text-gray-900 truncate">
                                {pass.ticketCount} × {pass.ticketCategory}
                              </p>
                            )}
                            <p className="text-[10px] text-gray-400 font-mono truncate">
                              {pass.qrCode || 'Awaiting payment'}
                            </p>
                          </div>
                          <button
                            disabled={!pass.qrCode}
                            onClick={() => showToast(`QR Pass ${pass.qrCode} ready for entry gate scan! 🎟️`)}
                            className="bg-[#06381e] disabled:opacity-40 disabled:cursor-not-allowed text-amber-300 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-emerald-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                          >
                            <i className="fa-solid fa-qrcode text-[10px]"></i>
                            <span>QR</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase">Paid:</span>
                        <span className="text-sm font-bold text-gray-900 ml-1.5 font-montserrat">
                          ₹{group.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {group.passes.length > 1 ? `${group.passes.length} pass types · one payment` : ''}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Tour Packages */}
            {activeTab === 'tours' && tourBookings.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-montserrat font-bold text-xs text-gray-500 uppercase tracking-wider px-1">
                  Guided Tour Packages
                </h4>

                {tourBookings.map((tb) => (
                  <motion.div
                    key={tb.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3"
                  >
                    <div className="flex gap-3">
                      <img
                        src={tb.image}
                        alt={tb.packageTitle}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-200"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">
                            ID: {tb.id}
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {tb.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 truncate mt-0.5">{tb.packageTitle}</h4>
                        <p className="text-xs font-semibold text-emerald-800">{tb.duration}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 bg-[#FAF6ED] p-2.5 rounded-xl border border-[#E5DDC3]/60">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Travel Date:</span>
                        <span className="font-semibold">{tb.travelDate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Travelers:</span>
                        <span className="font-semibold">{tb.travelers}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-gray-400 block uppercase">Your Operator:</span>
                        <span className="font-semibold text-emerald-900">{tb.operatorName}</span>
                      </div>
                      {tb.pickupPoint && (
                        <div className="col-span-2">
                          <span className="text-[10px] text-gray-400 block uppercase">Pickup:</span>
                          <span className="font-semibold">{tb.pickupPoint}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase">Paid online:</span>
                        <span className="text-sm font-bold text-gray-900 ml-1.5 font-montserrat">
                          ₹{tb.paidOnline.toLocaleString('en-IN')}
                        </span>
                        {tb.collectedInPerson > 0 ? (
                          <span className="block text-[10px] text-emerald-700 font-semibold">
                            ₹{tb.collectedInPerson.toLocaleString('en-IN')} paid to the operator
                          </span>
                        ) : tb.balanceDue > 0 ? (
                          <span className="block text-[10px] text-amber-700 font-semibold">
                            ₹{tb.balanceDue.toLocaleString('en-IN')} due to the operator
                          </span>
                        ) : null}
                      </div>
                      <a
                        href={tb.operatorPhone ? `tel:${tb.operatorPhone}` : undefined}
                        onClick={(e) => {
                          if (!tb.operatorPhone) {
                            e.preventDefault();
                            showToast('No contact number on file for this operator');
                          }
                        }}
                        className="bg-[#06381e] text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <i className="fa-solid fa-phone text-[10px]"></i>
                        <span>Call Operator</span>
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {(activeTab === 'festivals' ? festivalBookings : tourBookings).length === 0 && (
              <div className="text-center py-14 bg-white rounded-2xl border border-[#E5DDC3] p-6 space-y-3">
                <i className="fa-solid fa-ticket text-4xl text-gray-300"></i>
                <h3 className="font-bold text-gray-800 text-sm">
                  {activeTab === 'festivals' ? 'No Festival Passes Yet' : 'No Tour Bookings Yet'}
                </h3>
                <p className="text-xs text-gray-500">Explore Falcon Festival passes or guided hill treks.</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => navigate('/festivals')}
                    className="bg-[#06381e] text-amber-300 text-xs font-bold px-4 py-2 rounded-xl shadow hover:bg-emerald-900 transition-colors cursor-pointer"
                  >
                    View Festivals
                  </button>
                  <button
                    onClick={() => navigate('/packages')}
                    className="bg-white border border-[#E5DDC3] text-gray-800 text-xs font-bold px-4 py-2 rounded-xl shadow hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    View Tour Packages
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
