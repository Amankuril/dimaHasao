import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '../router';
import { fetchHotels } from '../services/hotelApi';
import { HotelCard } from '../components/hotel/HotelCard';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion } from 'framer-motion';

export const HotelListScreen = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [guestCount, setGuestCount] = useState(2);
  const [nights, setNights] = useState(1);

  /*
   * Cached by React Query, so coming back to this list is instant: `data` is
   * there on the first render and `isPending` is only true when there is
   * genuinely nothing to show yet. A stale result still paints immediately
   * and is replaced when the refetch behind it lands.
   *
   * The error message is unchanged from when this fetched by hand.
   */
  const {
    data: hotels = [],
    isPending: loading,
    error,
  } = useQuery({ queryKey: ['hotels'], queryFn: () => fetchHotels() });

  const loadError = error
    ? error?.response?.data?.message || 'Could not load stays. Please try again.'
    : '';

  const propertyTypes = ['All', 'Resort', 'Homestay', 'Hotel', 'Lodge'];

  // Live stays from the hotel backend. Filtering and sorting stay client-side
  // so the existing chips and sort control keep working unchanged.

  // Filtered & Sorted Hotels
  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const matchesType = selectedType === 'All' || hotel.type === selectedType;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (hotel.name || '').toLowerCase().includes(q) ||
        (hotel.location || '').toLowerCase().includes(q) ||
        (hotel.description || '').toLowerCase().includes(q);
      return matchesType && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.startingPrice - b.startingPrice;
      if (sortBy === 'price-high') return b.startingPrice - a.startingPrice;
      if (sortBy === 'rating') return b.rating - a.rating;
      return b.reviewCount - a.reviewCount; // popular
    });
  }, [hotels, selectedType, searchQuery, sortBy]);

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-28 relative font-poppins">
      {/* Page Header */}
      <Header
        title="HOTELS & HOMESTAYS"
        subtitle="Experience scenic stays across Dima Hasao"
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      <main className="p-3.5 space-y-3.5">
        {/* Quick Search & Dates Banner */}
        <div className="bg-white rounded-2xl p-3 shadow-xs border border-[#E5DDC3] space-y-2.5">
          {/* Search Input */}
          <div className="relative flex items-center">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 text-emerald-800 text-xs"></i>
            <input
              type="text"
              placeholder="Search Haflong, Jatinga, Umrangso..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl pl-9 pr-8 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-gray-400 hover:text-gray-600 text-xs p-1"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Quick Stay Preferences (Nights & Guests) */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center justify-between bg-[#FAF6ED] px-3 py-1.5 rounded-xl border border-[#E5DDC3]">
              <span className="text-gray-500 font-medium flex items-center gap-1.5">
                <i className="fa-regular fa-moon text-emerald-700"></i>
                Nights:
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={nights <= 1}
                  onClick={() => setNights((p) => Math.max(1, p - 1))}
                  className="w-5 h-5 rounded-full bg-white text-gray-700 font-bold flex items-center justify-center border border-gray-300 disabled:opacity-40"
                >
                  -
                </button>
                <span className="font-bold text-gray-900">{nights}</span>
                <button
                  onClick={() => setNights((p) => p + 1)}
                  className="w-5 h-5 rounded-full bg-white text-gray-700 font-bold flex items-center justify-center border border-gray-300"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#FAF6ED] px-3 py-1.5 rounded-xl border border-[#E5DDC3]">
              <span className="text-gray-500 font-medium flex items-center gap-1.5">
                <i className="fa-solid fa-users text-emerald-700"></i>
                Guests:
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={guestCount <= 1}
                  onClick={() => setGuestCount((p) => Math.max(1, p - 1))}
                  className="w-5 h-5 rounded-full bg-white text-gray-700 font-bold flex items-center justify-center border border-gray-300 disabled:opacity-40"
                >
                  -
                </button>
                <span className="font-bold text-gray-900">{guestCount}</span>
                <button
                  onClick={() => setGuestCount((p) => p + 1)}
                  className="w-5 h-5 rounded-full bg-white text-gray-700 font-bold flex items-center justify-center border border-gray-300"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Property Type Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
          {propertyTypes.map((type) => (
            <motion.button
              key={type}
              whileTap={{ scale: 0.94 }}
              onClick={() => setSelectedType(type)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedType === type
                  ? 'bg-[#06381e] text-amber-300 shadow-xs border border-emerald-800'
                  : 'bg-white text-gray-700 border border-[#E5DDC3] hover:bg-gray-50'
              }`}
            >
              {type === 'All' ? 'All Stays' : `${type}s`}
            </motion.button>
          ))}
        </div>

        {/* Results Count & Sort Dropdown */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-gray-700">
            {filteredHotels.length} {filteredHotels.length === 1 ? 'Stay' : 'Stays'} Available
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-[#E5DDC3] text-gray-800 text-[11px] font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="popular">Popular</option>
              <option value="rating">Top Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Hotels Grid */}
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#E5DDC3] overflow-hidden animate-pulse"
              >
                <div className="h-40 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-1/3 bg-gray-200 rounded" />
                  <div className="h-4 w-2/3 bg-gray-200 rounded" />
                  <div className="h-3 w-1/2 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E5DDC3] p-6 space-y-3">
            <i className="fa-solid fa-triangle-exclamation text-4xl text-amber-400"></i>
            <h3 className="font-bold text-gray-800 text-sm">Couldn't load stays</h3>
            <p className="text-xs text-gray-500">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#06381e] text-amber-300 text-xs font-bold px-4 py-2 rounded-xl shadow-xs hover:bg-emerald-900 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredHotels.length > 0 ? (
          <div className="space-y-4">
            {filteredHotels.map((hotel, index) => (
              <HotelCard key={hotel.id} hotel={hotel} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E5DDC3] p-6 space-y-3">
            <i className="fa-solid fa-hotel text-4xl text-gray-300"></i>
            <h3 className="font-bold text-gray-800 text-sm">No Stays Found</h3>
            <p className="text-xs text-gray-500">
              {hotels.length === 0
                ? 'No stays are listed yet. Please check back soon.'
                : `No hotels match "${searchQuery}" under ${selectedType}. Try searching another area or reset filters.`}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('All');
              }}
              className="bg-[#06381e] text-amber-300 text-xs font-bold px-4 py-2 rounded-xl shadow-xs hover:bg-emerald-900 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
