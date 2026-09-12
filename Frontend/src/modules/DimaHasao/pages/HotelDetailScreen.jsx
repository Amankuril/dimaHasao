import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '../router';
import { fetchHotelById } from '../services/hotelApi';
import { useBooking } from '../context/BookingContext';
import { HotelGallery } from '../components/hotel/HotelGallery';
import { RoomCard } from '../components/hotel/RoomCard';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion } from 'framer-motion';

export const HotelDetailScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { favoriteHotels, toggleFavoriteHotel, showToast } = useBooking();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [nights, setNights] = useState(1);
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms', 'about', 'reviews'

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const result = await fetchHotelById(id);
        if (cancelled) return;

        if (!result) {
          setLoadError('This stay is no longer available.');
          setHotel(null);
          return;
        }

        setHotel(result);
        // Preselect the first bookable room, matching the previous behaviour.
        setSelectedRoom(result.rooms?.[0] || null);
      } catch (err) {
        if (!cancelled) {
          setHotel(null);
          setLoadError(
            err?.response?.data?.message || 'Could not load this stay. Please try again.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  const isFavorite = hotel ? favoriteHotels?.includes(hotel.id) : false;

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    showToast(`Selected: ${room.name}`);
  };

  const handleProceedToBook = () => {
    if (!selectedRoom) {
      showToast('Please select a room first');
      return;
    }
    navigate(`/hotels/${hotel.id}/book?roomId=${selectedRoom.id}&nights=${nights}`);
  };

  // The screen below dereferences `hotel` throughout, so it must not render
  // until the fetch resolves.
  if (loading) {
    return (
      <div className="bg-[#FAF6ED] min-h-screen font-poppins">
        <Header title="Loading stay…" showBack={true} rightAction="none" />
        <PatternDivider variant="green-gold" />
        <div className="p-3.5 space-y-4 animate-pulse">
          <div className="h-52 bg-gray-200 rounded-2xl" />
          <div className="bg-white rounded-2xl p-4 border border-[#E5DDC3] space-y-3">
            <div className="h-3 w-1/4 bg-gray-200 rounded" />
            <div className="h-5 w-2/3 bg-gray-200 rounded" />
            <div className="h-3 w-1/2 bg-gray-200 rounded" />
          </div>
          <div className="h-28 bg-white rounded-2xl border border-[#E5DDC3]" />
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="bg-[#FAF6ED] min-h-screen font-poppins">
        <Header title="Stay unavailable" showBack={true} rightAction="none" />
        <PatternDivider variant="green-gold" />
        <div className="p-6 text-center space-y-3 mt-10">
          <i className="fa-solid fa-hotel text-4xl text-gray-300"></i>
          <h3 className="font-bold text-gray-800 text-sm">Couldn't load this stay</h3>
          <p className="text-xs text-gray-500">{loadError || 'Please try again.'}</p>
          <button
            onClick={() => navigate('/hotels')}
            className="bg-[#06381e] text-amber-300 text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            Back to Stays
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-32 relative font-poppins">
      {/* Header */}
      <Header
        title={hotel.name}
        subtitle={`${hotel.type} • ${hotel.location}`}
        showBack={true}
        rightAction="custom"
      />
      <PatternDivider variant="green-gold" />

      {/* Main Hotel Gallery */}
      <HotelGallery images={hotel.images} hotelName={hotel.name} />

      <main className="p-3.5 space-y-4">
        {/* Hotel Quick Highlights Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#06381e] text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {hotel.type}
                </span>
                {hotel.badge && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    {hotel.badge}
                  </span>
                )}
              </div>
              <h1 className="font-montserrat font-bold text-lg text-gray-900 leading-snug">
                {hotel.name}
              </h1>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <i className="fa-solid fa-location-dot text-emerald-700"></i>
                <span>{hotel.address}</span>
              </p>
            </div>

            {/* Favorite Toggle Button */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => toggleFavoriteHotel(hotel.id)}
              className="w-10 h-10 rounded-full bg-[#FAF6ED] hover:bg-gray-100 flex items-center justify-center text-gray-700 shrink-0 border border-[#E5DDC3] transition-colors cursor-pointer"
            >
              <i
                className={`fa-solid fa-heart text-sm transition-colors ${
                  isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                }`}
              />
            </motion.button>
          </div>

          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
            <div className="bg-[#FAF6ED] p-2 rounded-xl border border-[#E5DDC3]/60">
              <div className="flex items-center justify-center gap-1 text-emerald-900 font-bold text-xs">
                <span>{hotel.rating}</span>
                <i className="fa-solid fa-star text-[10px] text-amber-400"></i>
              </div>
              <span className="text-[9.5px] text-gray-500 block mt-0.5">{hotel.reviewCount} Reviews</span>
            </div>

            {/* Distance only exists when the backend ran a geo search, so show
                check-out instead of an empty stat box. */}
            <div className="bg-[#FAF6ED] p-2 rounded-xl border border-[#E5DDC3]/60">
              <span className="font-bold text-xs text-gray-900">
                {hotel.distanceFromStation || hotel.checkOutTime}
              </span>
              <span className="text-[9.5px] text-gray-500 block mt-0.5">
                {hotel.distanceFromStation ? 'From Station' : 'Check-out'}
              </span>
            </div>

            <div className="bg-[#FAF6ED] p-2 rounded-xl border border-[#E5DDC3]/60">
              <span className="font-bold text-xs text-emerald-800">{hotel.checkInTime}</span>
              <span className="text-[9.5px] text-gray-500 block mt-0.5">Check-in</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        {(() => {
          const hotelTabs = [
            { id: 'rooms', label: 'Rooms', icon: 'fa-solid fa-bed' },
            { id: 'about', label: 'Amenities', icon: 'fa-solid fa-sparkles' },
            { id: 'reviews', label: `Reviews (${hotel.reviews.length})`, icon: 'fa-solid fa-star' }
          ];
          const activeIndex = hotelTabs.findIndex((t) => t.id === activeTab);

          return (
            <div className="bg-[#ede8dc] p-1 rounded-2xl relative flex items-center border border-[#dfd6c4] shadow-xs">
              {/* Smooth Horizontal Sliding Active Pill */}
              <div
                className="absolute top-1 bottom-1 rounded-xl bg-white shadow-xs border border-[#dfd6c4]/80 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
                style={{
                  left: '4px',
                  width: 'calc((100% - 8px) / 3)',
                  transform: `translateX(${activeIndex * 100}%)`
                }}
              />

              {hotelTabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2 px-1 text-xs rounded-xl transition-colors duration-200 flex items-center justify-center gap-1.5 relative z-10 cursor-pointer ${
                      isActive
                        ? 'text-[#06381e] font-extrabold'
                        : 'text-stone-600 hover:text-stone-900 font-semibold'
                    }`}
                  >
                    <i
                      className={`${tab.icon} text-[10.5px] transition-colors duration-200 ${
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

        {/* TAB 1: ROOM CATEGORIES */}
        {activeTab === 'rooms' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-montserrat font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <i className="fa-solid fa-door-open text-emerald-800"></i>
                <span>Available Room Types</span>
              </h3>
              <span className="text-[11px] text-gray-500">
                {hotel.rooms.length} room {hotel.rooms.length === 1 ? 'type' : 'types'}
              </span>
            </div>

            <div className="space-y-3">
              {hotel.rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isSelected={selectedRoom?.id === room.id}
                  onSelect={handleSelectRoom}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: ABOUT & AMENITIES */}
        {activeTab === 'about' && (
          <div className="space-y-4">
            {/* Description Card */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2.5">
              <h3 className="font-montserrat font-bold text-sm text-gray-900">About the Property</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{hotel.description}</p>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                {hotel.aboutDetails.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                    <i className="fa-solid fa-circle-check text-emerald-600 text-xs mt-0.5 shrink-0"></i>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities Grid */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-3">
              <h3 className="font-montserrat font-bold text-sm text-gray-900">Property Amenities</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {hotel.amenities.map((am) => (
                  <div
                    key={am.id}
                    className="flex items-center gap-2.5 p-2 bg-[#FAF6ED] rounded-xl border border-[#E5DDC3]/60 text-xs text-gray-800"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#06381e]/10 text-emerald-900 flex items-center justify-center shrink-0">
                      <i className={`${am.icon} text-xs`}></i>
                    </div>
                    <span className="font-medium">{am.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Policies */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] space-y-2.5">
              <h3 className="font-montserrat font-bold text-sm text-gray-900">Stay Policies</h3>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Check-in Time:</span>
                  <span className="font-bold text-gray-900">{hotel.checkInTime}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Check-out Time:</span>
                  <span className="font-bold text-gray-900">{hotel.checkOutTime}</span>
                </div>
                <div className="pt-1 text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <i className="fa-solid fa-shield-halved mr-1.5"></i>
                  {hotel.cancellationPolicy}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-emerald-900 font-montserrat">{hotel.rating}</span>
                  <div>
                    <div className="flex text-amber-400 text-xs">
                      <i className="fa-solid fa-star"></i>
                      <i className="fa-solid fa-star"></i>
                      <i className="fa-solid fa-star"></i>
                      <i className="fa-solid fa-star"></i>
                      <i className="fa-solid fa-star-half-stroke"></i>
                    </div>
                    <span className="text-[10px] text-gray-500">{hotel.reviewCount} total ratings</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => showToast('Review form opens after completed stay')}
                className="bg-[#06381e] text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs cursor-pointer"
              >
                Write Review
              </button>
            </div>

            {hotel.reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white rounded-2xl p-3.5 shadow-xs border border-[#E5DDC3] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={rev.avatar}
                      alt={rev.author}
                      className="w-8 h-8 rounded-full object-cover border border-amber-300"
                    />
                    <div>
                      <h4 className="font-bold text-xs text-gray-900">{rev.author}</h4>
                      <span className="text-[10px] text-gray-400">{rev.date}</span>
                    </div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-900 font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span>{rev.rating}</span>
                    <i className="fa-solid fa-star text-[9px] text-amber-500"></i>
                  </span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed pl-10">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Sticky Bottom Booking Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5DDC3] p-3 shadow-lg flex justify-center">
        <div className="w-full max-w-[430px] flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">
              {selectedRoom ? selectedRoom.name : 'Select a room'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold text-emerald-950 font-montserrat">
                ₹{selectedRoom ? (selectedRoom.price * nights).toLocaleString('en-IN') : hotel.startingPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-gray-400">
                / {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleProceedToBook}
            className="bg-[#06381e] hover:bg-[#0a4d2b] text-amber-300 text-xs font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span>Proceed to Book</span>
            <i className="fa-solid fa-arrow-right text-xs"></i>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
