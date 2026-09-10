import { useState } from 'react';
import { PLACES_DATA } from '../data/tourismData';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { PlaceCard } from '../components/places/PlaceCard';
import { motion } from 'framer-motion';

export const TouristPlacesList = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  const filterChips = [
    { id: 'all', label: 'All Places' },
    { id: 'viewpoint', label: 'Viewpoints' },
    { id: 'town', label: 'Town & Culture' },
    { id: 'trek', label: 'Treks & Peaks' }
  ];

  const filteredPlaces = PLACES_DATA.filter((place) => {
    const matchesSearch =
      place.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      place.location.toLowerCase().includes(searchFilter.toLowerCase()) ||
      place.description.toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'viewpoint') return place.id === '1';
    if (activeFilter === 'town') return place.id === '2';
    if (activeFilter === 'trek') return place.id === '3';
    return true;
  });

  return (
    <div className="bg-[#fdf5e6] text-gray-800 font-inter min-h-screen flex flex-col relative pb-20">
      {/* Header */}
      <Header
        title="TOURIST PLACES"
        subtitle="Explore the Beauty of Dima Hasao"
        showBack={true}
        rightAction="search"
        onSearchClick={() => setShowSearchInput(!showSearchInput)}
      />

      {/* Top Pattern Divider */}
      <PatternDivider variant="native" />

      {/* Optional Search Filter Bar */}
      {showSearchInput && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 py-2 bg-white/90 border-b border-orange-200"
        >
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
            <i className="fa-solid fa-magnifying-glass text-gray-400 text-xs"></i>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter tourist destinations..."
              className="w-full bg-transparent text-xs text-gray-800 focus:outline-none"
              autoFocus
            />
            {searchFilter && (
              <button onClick={() => setSearchFilter('')} className="text-gray-400 text-xs">
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Filter Chips */}
      <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto hide-scrollbar">
        {filterChips.map((chip) => (
          <button
            key={chip.id}
            onClick={() => setActiveFilter(chip.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === chip.id
                ? 'bg-[#0a3a2a] text-white shadow-xs'
                : 'bg-white/80 text-gray-700 hover:bg-white border border-orange-200/60'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Main Content: Place Cards */}
      <main className="flex-1 p-4 flex flex-col gap-5">
        {filteredPlaces.length > 0 ? (
          filteredPlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))
        ) : (
          <div className="text-center py-12 bg-white/60 rounded-2xl border border-orange-200 p-6">
            <i className="fa-solid fa-mountain text-3xl text-gray-400 mb-2"></i>
            <p className="text-sm font-bold text-gray-700">No destinations match your search</p>
            <button
              onClick={() => {
                setSearchFilter('');
                setActiveFilter('all');
              }}
              className="mt-3 text-xs text-emerald-800 font-semibold underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}
      </main>

      {/* Bottom Pattern Divider */}
      <PatternDivider variant="native" />

      {/* Footer Section */}
      <footer className="bg-[#0a3a2a] text-white p-5 text-center mt-2">
        <p className="font-playfair text-sm italic text-amber-200 leading-relaxed">
          <span className="text-emerald-400 mr-1.5">
            <i className="fa-solid fa-leaf"></i>
          </span>
          Plan your trip, stay safe <br /> and enjoy the beauty of Dima Hasao!
        </p>

        <div className="mt-3 flex justify-center gap-1 opacity-60">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 block"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 block"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 block"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 block"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 block"></span>
        </div>
      </footer>
    </div>
  );
};
