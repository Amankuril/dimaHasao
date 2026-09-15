import { useState, useEffect } from 'react';
import { fetchDestinations } from '../services/toursApi';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { PlaceCard } from '../components/places/PlaceCard';
import { motion } from 'framer-motion';

export const TouristPlacesList = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const filterChips = [
    { id: 'all', label: 'All Places' },
    { id: 'viewpoint', label: 'Viewpoints' },
    { id: 'town', label: 'Town & Culture' },
    { id: 'trek', label: 'Treks & Peaks' },
    { id: 'temple', label: 'Temples' },
    { id: 'lake', label: 'Lakes' },
    { id: 'wildlife', label: 'Wildlife' }
  ];

  useEffect(() => {
    let cancelled = false;

    fetchDestinations()
      .then((list) => { if (!cancelled) { setPlaces(list); setLoadError(''); } })
      .catch(() => { if (!cancelled) setLoadError('We could not load destinations just now.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // Filtered in the browser — the directory is small, and the chips used to
  // compare hard-coded ids, which silently broke as soon as a place was added.
  const filteredPlaces = places.filter((place) => {
    const needle = searchFilter.toLowerCase();
    const matchesSearch =
      place.name.toLowerCase().includes(needle) ||
      place.location.toLowerCase().includes(needle) ||
      place.description.toLowerCase().includes(needle);

    return matchesSearch && (activeFilter === 'all' || place.category === activeFilter);
  });

  // Chips with nothing behind them are noise once an admin curates the list.
  const visibleChips = filterChips.filter(
    (chip) => chip.id === 'all' || places.some((p) => p.category === chip.id),
  );

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
        {visibleChips.map((chip) => (
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
        {loading ? (
          [0, 1, 2].map((n) => (
            <div key={n} className="bg-white/70 rounded-2xl border border-orange-200 overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-3.5 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : loadError ? (
          <div className="text-center py-12 bg-white/60 rounded-2xl border border-orange-200 p-6">
            <i className="fa-solid fa-triangle-exclamation text-3xl text-amber-400 mb-2"></i>
            <p className="text-sm font-bold text-gray-700">Couldn't load destinations</p>
            <p className="text-xs text-gray-500 mt-1">{loadError}</p>
          </div>
        ) : filteredPlaces.length > 0 ? (
          filteredPlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))
        ) : (
          <div className="text-center py-12 bg-white/60 rounded-2xl border border-orange-200 p-6">
            <i className="fa-solid fa-mountain text-3xl text-gray-400 mb-2"></i>
            <p className="text-sm font-bold text-gray-700">
              {searchFilter || activeFilter !== 'all'
                ? 'No destinations match your search'
                : 'No destinations published yet'}
            </p>
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
