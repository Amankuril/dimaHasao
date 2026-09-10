import { useState } from 'react';
import { useNavigate } from '../../router';
import { useBooking } from '../../context/BookingContext';
import { PLACES_DATA } from '../../data/tourismData';
import { motion, AnimatePresence } from 'framer-motion';

export const SearchBar = ({ className = '' }) => {
  const { searchQuery, setSearchQuery, showToast } = useBooking();
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();

  const handleVoiceSearch = () => {
    setIsListening(true);
    showToast('🎤 Listening... Try saying "Jatinga" or "Haflong"');
    setTimeout(() => {
      setIsListening(false);
      setSearchQuery('Jatinga');
      showToast('Voice matched: "Jatinga" 🌿');
      navigate('/places');
    }, 2000);
  };

  const filteredSuggestions = searchQuery.trim()
    ? PLACES_DATA.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className={`relative z-30 px-3 -mt-4 sm:-mt-5 ${className}`} data-purpose="search-bar-container">
      {/* Repeating Pattern border behind search bar */}
      <div className="pattern-border absolute left-0 right-0 top-1/2 -translate-y-1/2 z-0 opacity-90 h-[5px]" />

      {/* Main Search Input Capsule */}
      <div className="bg-white rounded-full shadow-md py-1 px-3 flex items-center border-[2.5px] border-[#084524] relative z-10 mx-1.5">
        <i className="fa-solid fa-magnifying-glass text-gray-400 mr-2.5 text-xs"></i>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              navigate('/places');
            }
          }}
          placeholder="Search places, hotels, cabs..."
          className="w-full bg-transparent border-none focus:outline-none text-[11px] sm:text-xs py-0.5 text-gray-800 placeholder-gray-400"
        />

        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-1 text-gray-400 hover:text-gray-600 text-[10px] mr-1 cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleVoiceSearch}
          aria-label="Voice Search"
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isListening ? 'bg-red-500 text-white animate-pulse' : 'text-[#084524] hover:bg-emerald-50'
          }`}
        >
          <i className="fa-solid fa-microphone text-xs"></i>
        </motion.button>
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {isFocused && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute left-5 right-5 top-9 bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden z-50 divide-y divide-gray-100"
          >
            {filteredSuggestions.map((place) => (
              <div
                key={place.id}
                onMouseDown={() => {
                  setSearchQuery('');
                  navigate(`/places/${place.id}`);
                }}
                className="p-2.5 hover:bg-emerald-50/80 cursor-pointer flex items-center gap-2.5 transition-colors"
              >
                <img src={place.mainImage} alt={place.name} className="w-8 h-8 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-gray-900 truncate">{place.name}</h4>
                  <p className="text-[10px] text-emerald-700 truncate">{place.location}</p>
                </div>
                <span className="text-[9px] text-gray-400 font-medium">{place.distanceFromStation}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
