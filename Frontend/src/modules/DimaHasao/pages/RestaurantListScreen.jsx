import { useState, useMemo } from 'react';
import { useRestaurants } from '../hooks/useFoodData';
import { RestaurantCard } from '../components/food/RestaurantCard';
import { CartFloatingBar } from '../components/food/CartFloatingBar';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion } from 'framer-motion';

export const RestaurantListScreen = () => {
  const RESTAURANTS_DATA = useRestaurants();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);
  const [sortBy, setSortBy] = useState('popular');

  const cuisineCategories = ['All', 'Dimasa Ethnic', 'Cafe & Bakery', 'Momos & Chinese', 'Pure Veg'];

  const filteredRestaurants = useMemo(() => {
    return RESTAURANTS_DATA.filter((rest) => {
      if (vegOnly && !rest.isVegOnly) return false;

      const matchesCuisine =
        selectedCuisine === 'All' ||
        rest.cuisine.some((c) => c.toLowerCase().includes(selectedCuisine.toLowerCase().split(' ')[0]));

      const matchesSearch =
        rest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rest.cuisine.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
        rest.menu.some((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCuisine && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'time') return parseInt(a.deliveryTime) - parseInt(b.deliveryTime);
      return b.reviewCount - a.reviewCount;
    });
  }, [RESTAURANTS_DATA, searchQuery, selectedCuisine, vegOnly, sortBy]);

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-28 relative font-poppins">
      <Header
        title="DIMA FOOD & DINING"
        subtitle="Authentic tribal delicacies & local eateries"
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      <main className="p-3.5 space-y-3.5">
        {/* Search Bar & Veg Filter */}
        <div className="bg-white rounded-2xl p-3 shadow-xs border border-[#E5DDC3] space-y-2.5">
          <div className="relative flex items-center">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 text-emerald-800 text-xs"></i>
            <input
              type="text"
              placeholder="Search dishes (Muri Pork, Momos, Judima)..."
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

          {/* Quick Veg Toggle */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-gray-600 font-semibold flex items-center gap-1.5">
              <i className="fa-solid fa-leaf text-green-600"></i>
              <span>Pure Veg Mode</span>
            </span>

            <button
              type="button"
              onClick={() => setVegOnly((p) => !p)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                vegOnly ? 'bg-emerald-700' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  vegOnly ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Cuisine Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
          {cuisineCategories.map((cat) => (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.94 }}
              onClick={() => setSelectedCuisine(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCuisine === cat
                  ? 'bg-[#06381e] text-amber-300 shadow-xs border border-emerald-800'
                  : 'bg-white text-gray-700 border border-[#E5DDC3] hover:bg-gray-50'
              }`}
            >
              {cat}
            </motion.button>
          ))}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-gray-700">
            {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'Eatery' : 'Eateries'} Available
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-[#E5DDC3] text-gray-800 text-[11px] font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Top Rated</option>
              <option value="time">Fastest Delivery</option>
            </select>
          </div>
        </div>

        {/* Restaurant Cards List */}
        {filteredRestaurants.length > 0 ? (
          <div className="space-y-4">
            {filteredRestaurants.map((rest, idx) => (
              <RestaurantCard key={rest.id} restaurant={rest} index={idx} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E5DDC3] p-6 space-y-3">
            <i className="fa-solid fa-utensils text-4xl text-gray-300"></i>
            <h3 className="font-bold text-gray-800 text-sm">No Eateries Found</h3>
            <p className="text-xs text-gray-500">
              No restaurants match your search. Try another cuisine or reset filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCuisine('All');
                setVegOnly(false);
              }}
              className="bg-[#06381e] text-amber-300 text-xs font-bold px-4 py-2 rounded-xl shadow-xs hover:bg-emerald-900 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      <CartFloatingBar />
    </div>
  );
};
