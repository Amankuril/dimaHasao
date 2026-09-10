import { useState } from 'react';
import { useNavigate } from '../router';
import { useBooking } from '../context/BookingContext';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion } from 'framer-motion';

export const MyBookingsScreen = () => {
  const { bookings, hotelBookings, foodOrders, tourBookings, festivalBookings, showToast } =
    useBooking();
  const [activeTab, setActiveTab] = useState('rides'); // 'rides', 'hotels', 'food', 'events'
  const navigate = useNavigate();

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
            {
              id: 'events',
              label: `Passes (${tourBookings.length + festivalBookings.length})`,
              icon: 'fa-solid fa-ticket'
            }
          ];
          const activeIndex = bookingTabs.findIndex((t) => t.id === activeTab);

          return (
            <div className="bg-[#ede8dc] p-1 rounded-2xl relative flex items-center border border-[#dfd6c4] shadow-xs">
              {/* Smooth Horizontal Sliding Active Pill */}
              <div
                className="absolute top-1 bottom-1 rounded-xl bg-white shadow-xs border border-[#dfd6c4]/80 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
                style={{
                  left: '4px',
                  width: 'calc((100% - 8px) / 4)',
                  transform: `translateX(${activeIndex * 100}%)`
                }}
              />

              {bookingTabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2 px-1 text-[11px] rounded-xl transition-colors duration-200 flex items-center justify-center gap-1.5 relative z-10 cursor-pointer ${
                      isActive
                        ? 'text-[#06381e] font-extrabold'
                        : 'text-stone-600 hover:text-stone-900 font-semibold'
                    }`}
                  >
                    <i
                      className={`${tab.icon} text-[10px] transition-colors duration-200 ${
                        isActive ? 'text-[#06381e]' : 'text-stone-400'
                      }`}
                    ></i>
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
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
                  onClick={() => navigate('/book-ride')}
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
                      onClick={() => navigate(`/food/orders/${fo.id}`)}
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
                  onClick={() => navigate('/food')}
                  className="bg-[#06381e] text-amber-300 text-xs font-bold px-4 py-2 rounded-xl shadow hover:bg-emerald-900 transition-colors cursor-pointer"
                >
                  Explore Restaurants
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TOURS & FESTIVAL PASSES */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            {/* Festival Passes */}
            {festivalBookings.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-montserrat font-bold text-xs text-gray-500 uppercase tracking-wider px-1">
                  Festival & Event Passes
                </h4>

                {festivalBookings.map((fb) => (
                  <motion.div
                    key={fb.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3"
                  >
                    <div className="flex gap-3">
                      <img
                        src={fb.image}
                        alt={fb.festivalName}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-200"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">
                            ID: {fb.id}
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {fb.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 truncate mt-0.5">{fb.festivalName}</h4>
                        <p className="text-xs font-semibold text-emerald-800">{fb.ticketCategory}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 bg-[#FAF6ED] p-2.5 rounded-xl border border-[#E5DDC3]/60">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Dates:</span>
                        <span className="font-semibold">{fb.dates}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Passes:</span>
                        <span className="font-semibold">{fb.ticketCount} Tickets</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase">Paid:</span>
                        <span className="text-sm font-bold text-gray-900 ml-1.5 font-montserrat">
                          ₹{fb.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <button
                        onClick={() => showToast(`QR Pass ${fb.qrCode} ready for entry gate scan! 🎟️`)}
                        className="bg-[#06381e] text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <i className="fa-solid fa-qrcode text-[10px]"></i>
                        <span>Show QR Pass</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Tour Packages */}
            {tourBookings.length > 0 && (
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
                        <span className="text-[10px] text-gray-400 block uppercase">Guide Assigned:</span>
                        <span className="font-semibold text-emerald-900">{tb.guideAssigned}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase">Paid:</span>
                        <span className="text-sm font-bold text-gray-900 ml-1.5 font-montserrat">
                          ₹{tb.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <button
                        onClick={() => showToast(`Connecting to guide at ${tb.guidePhone}`)}
                        className="bg-[#06381e] text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <i className="fa-solid fa-phone text-[10px]"></i>
                        <span>Call Guide</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {festivalBookings.length === 0 && tourBookings.length === 0 && (
              <div className="text-center py-14 bg-white rounded-2xl border border-[#E5DDC3] p-6 space-y-3">
                <i className="fa-solid fa-ticket text-4xl text-gray-300"></i>
                <h3 className="font-bold text-gray-800 text-sm">No Tour or Festival Bookings</h3>
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
