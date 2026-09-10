import { useState, useMemo } from 'react';
import { TOUR_PACKAGES_DATA } from '../data/tourPackageData';
import { PackageCard } from '../components/tour/PackageCard';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion } from 'framer-motion';

export const TourPackageListScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [sortBy, setSortBy] = useState('popular');

  const packageTypes = ['All', 'Weekend Escapade', 'Trekking & Adventure', 'Wildlife & Nature', 'Cultural Heritage'];

  const filteredPackages = useMemo(() => {
    return TOUR_PACKAGES_DATA.filter((pkg) => {
      const matchesType = selectedType === 'All' || pkg.type === selectedType;
      const matchesSearch =
        pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.destinations.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesType && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.pricePerPerson - b.pricePerPerson;
      if (sortBy === 'price-high') return b.pricePerPerson - a.pricePerPerson;
      if (sortBy === 'rating') return b.rating - a.rating;
      return b.reviewCount - a.reviewCount;
    });
  }, [searchQuery, selectedType, sortBy]);

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-28 relative font-poppins">
      <Header
        title="TOUR PACKAGES"
        subtitle="Curated expeditions, treks & cultural journeys"
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      <main className="p-3.5 space-y-3.5">
        {/* Search Bar */}
        <div className="bg-white rounded-2xl p-3 shadow-xs border border-[#E5DDC3]">
          <div className="relative flex items-center">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 text-emerald-800 text-xs"></i>
            <input
              type="text"
              placeholder="Search packages (Jatinga, Silaikul, Trekking)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl pl-9 pr-8 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-600 font-medium"
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
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
          {packageTypes.map((type) => (
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
              {type === 'All' ? 'All Packages' : type}
            </motion.button>
          ))}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-gray-700">
            {filteredPackages.length} {filteredPackages.length === 1 ? 'Package' : 'Packages'} Available
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

        {/* Package Cards List */}
        {filteredPackages.length > 0 ? (
          <div className="space-y-4">
            {filteredPackages.map((pkg, idx) => (
              <PackageCard key={pkg.id} pkg={pkg} index={idx} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E5DDC3] p-6 space-y-3">
            <i className="fa-solid fa-suitcase-rolling text-4xl text-gray-300"></i>
            <h3 className="font-bold text-gray-800 text-sm">No Tour Packages Found</h3>
            <p className="text-xs text-gray-500">
              No packages match "{searchQuery}". Try exploring another category or reset filters.
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
