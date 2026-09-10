import { useNavigate } from '../../router';
import { useBooking } from '../../context/BookingContext';
import { motion } from 'framer-motion';

export const Header = ({
  title = 'TOURIST PLACES',
  subtitle = 'Explore the Beauty of Dima Hasao',
  showBack = true,
  rightAction = 'search', // 'search' | 'favorite' | 'none'
  placeId = null,
  onSearchClick,
  className = ''
}) => {
  const navigate = useNavigate();
  const { favorites, toggleFavorite } = useBooking();
  const isFav = placeId ? favorites.includes(placeId) : false;

  return (
    <header className={`bg-[#062c16] text-white px-3.5 py-3 sticky top-0 z-40 shadow-md backdrop-blur-md border-b border-emerald-900/50 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        {/* Left: Back Button */}
        {showBack ? (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => navigate(-1)}
            aria-label="Go Back"
            className="p-1 -ml-1 text-white hover:text-amber-300 transition-colors flex items-center justify-center text-base cursor-pointer shrink-0"
          >
            <i className="fa-solid fa-arrow-left text-base"></i>
          </motion.button>
        ) : (
          <div className="w-6"></div>
        )}

        {/* Center: Title & Subtitle */}
        <div className="text-center flex-1 px-2">
          <h1 className="text-sm sm:text-base font-extrabold tracking-widest flex items-center justify-center gap-1.5 uppercase font-cinzel text-amber-300">
            <span className="text-amber-400 text-[10px]">
              <i className="fa-solid fa-leaf"></i>
            </span>
            <span className="truncate">{title}</span>
            <span className="text-amber-400 text-[10px]">
              <i className="fa-solid fa-leaf"></i>
            </span>
          </h1>
          {subtitle && (
            <p className="text-[10px] sm:text-[11px] italic font-playfair text-amber-100/90 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Action */}
        <div className="w-6 flex justify-end">
          {rightAction === 'search' && (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onSearchClick || (() => navigate('/places'))}
              aria-label="Search"
              className="p-1 -mr-1 text-white hover:text-amber-300 transition-colors flex items-center justify-center text-base cursor-pointer shrink-0"
            >
              <i className="fa-solid fa-magnifying-glass"></i>
            </motion.button>
          )}

          {rightAction === 'favorite' && placeId && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => toggleFavorite(placeId)}
              aria-label="Toggle Favorite"
              className="p-1 -mr-1 text-white hover:text-amber-300 transition-colors flex items-center justify-center text-base cursor-pointer shrink-0"
            >
              <motion.i
                animate={{ scale: isFav ? [1, 1.3, 1] : 1 }}
                transition={{ duration: 0.3 }}
                className={`fa-heart text-base ${isFav ? 'fa-solid text-red-500' : 'fa-regular text-white'}`}
              />
            </motion.button>
          )}

          {rightAction === 'none' && <div className="w-6"></div>}
        </div>
      </div>
    </header>
  );
};

