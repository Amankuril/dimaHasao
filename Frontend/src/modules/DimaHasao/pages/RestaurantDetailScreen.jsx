import { useState, useMemo } from 'react';
import { useParams } from '../router';
import { useRestaurant } from '../hooks/useFoodData';
import { MenuItemCard } from '../components/food/MenuItemCard';
import { CartFloatingBar } from '../components/food/CartFloatingBar';
import { Header } from '../components/layout/Header';
import { PatternDivider } from '../components/layout/PatternDivider';
import { motion } from 'framer-motion';

export const RestaurantDetailScreen = () => {
  const { id } = useParams();
  const restaurant = useRestaurant(id);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  const menuCategories = useMemo(() => {
    return ['All', ...restaurant.categories];
  }, [restaurant]);

  const filteredMenuItems = useMemo(() => {
    return restaurant.menu.filter((item) => {
      if (vegOnly && !item.isVeg) return false;
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(itemSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [restaurant, selectedCategory, vegOnly, itemSearch]);

  return (
    <div className="bg-[#FAF6ED] text-gray-800 antialiased min-h-screen pb-32 relative font-poppins">
      <Header
        title={restaurant.name}
        subtitle={`${restaurant.cuisine.slice(0, 2).join(', ')} • ${restaurant.address.split(',')[0]}`}
        showBack={true}
        rightAction="none"
      />
      <PatternDivider variant="green-gold" />

      {/* Restaurant Hero Card */}
      <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-gray-200">
        <img
          src={restaurant.heroImage}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

        <div className="absolute bottom-3 left-3.5 right-3.5 text-white space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              <span>{restaurant.rating}</span>
              <i className="fa-solid fa-star text-[8px] text-amber-300"></i>
            </span>
            <span className="text-[11px] text-gray-200">({restaurant.reviewCount} Ratings)</span>
            <span className="text-white/40">•</span>
            <span className="text-[11px] text-amber-300 font-semibold">{restaurant.deliveryTime}</span>
          </div>

          <h1 className="font-montserrat font-bold text-lg text-white leading-tight">
            {restaurant.name}
          </h1>

          <p className="text-xs text-gray-200 truncate">
            {restaurant.cuisine.join(' • ')}
          </p>
        </div>
      </div>

      <main className="p-3.5 space-y-3.5">
        {/* Menu Search & Veg Filter */}
        <div className="bg-white rounded-2xl p-3 shadow-xs border border-[#E5DDC3] flex items-center gap-3">
          <div className="relative flex-1 flex items-center">
            <i className="fa-solid fa-magnifying-glass absolute left-3 text-emerald-800 text-xs"></i>
            <input
              type="text"
              placeholder="Search in menu..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="w-full bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-600 font-medium"
            />
          </div>

          <button
            onClick={() => setVegOnly((p) => !p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shrink-0 cursor-pointer ${
              vegOnly
                ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                : 'bg-white text-gray-700 border-[#E5DDC3] hover:bg-gray-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            <span>Veg Only</span>
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
          {menuCategories.map((cat) => (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.94 }}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#06381e] text-amber-300 shadow-xs border border-emerald-800'
                  : 'bg-white text-gray-700 border border-[#E5DDC3] hover:bg-gray-50'
              }`}
            >
              {cat}
            </motion.button>
          ))}
        </div>

        {/* Menu Items List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-montserrat font-bold text-sm text-gray-900">
              {selectedCategory === 'All' ? 'Complete Menu' : selectedCategory}
            </h3>
            <span className="text-xs text-gray-500">
              {filteredMenuItems.length} {filteredMenuItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {filteredMenuItems.length > 0 ? (
            filteredMenuItems.map((item) => (
              <MenuItemCard key={item.id} item={item} restaurant={restaurant} />
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-[#E5DDC3] p-6 space-y-2">
              <i className="fa-solid fa-bowl-food text-3xl text-gray-300"></i>
              <h4 className="font-bold text-gray-800 text-xs">No items match your filter</h4>
              <p className="text-[11px] text-gray-500">Try changing your search term or turning off Veg Only.</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Cart Bar */}
      <CartFloatingBar />
    </div>
  );
};
