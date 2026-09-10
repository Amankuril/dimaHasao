import { motion } from 'framer-motion';
import { useNavigate } from '../../router';
import { useBooking } from '../../context/BookingContext';

export const HotelCard = ({ hotel, index = 0 }) => {
  const navigate = useNavigate();
  const { favoriteHotels, toggleFavoriteHotel } = useBooking();
  const isFavorite = favoriteHotels?.includes(hotel.id);

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -3 }}
      onClick={() => navigate(`/hotels/${hotel.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-[#E5DDC3]/80 transition-all duration-300 flex flex-col cursor-pointer group"
    >
      {/* Hotel Image Container */}
      <div className="relative h-44 w-full overflow-hidden bg-gray-200">
        <img
          src={hotel.heroImage}
          alt={hotel.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Property Type & Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="bg-[#06381e]/90 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs border border-amber-400/40">
            {hotel.type}
          </span>
          {hotel.badge && (
            <span className="bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs shadow-xs">
              {hotel.badge}
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavoriteHotel(hotel.id);
          }}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/80 hover:bg-white backdrop-blur-xs flex items-center justify-center text-gray-700 shadow-sm transition-colors cursor-pointer"
        >
          <i
            className={`fa-solid fa-heart text-xs transition-colors ${
              isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
            }`}
          />
        </motion.button>

        {/* Bottom Image Overlay: Distance & Travel Time */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white font-medium drop-shadow">
          <span className="flex items-center gap-1">
            <i className="fa-solid fa-location-dot text-amber-400 text-xs"></i>
            {hotel.location}
          </span>
          <span className="bg-black/40 px-2 py-0.5 rounded text-[10px] backdrop-blur-xs">
            {hotel.distanceFromStation} from station
          </span>
        </div>
      </div>

      {/* Hotel Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Rating & Review Count */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="bg-emerald-800 text-white text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                <span>{hotel.rating}</span>
                <i className="fa-solid fa-star text-[9px] text-amber-300"></i>
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                ({hotel.reviewCount} reviews)
              </span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Free Cancellation
            </span>
          </div>

          {/* Hotel Name */}
          <h3 className="font-montserrat font-bold text-sm text-gray-900 leading-snug group-hover:text-emerald-800 transition-colors">
            {hotel.name}
          </h3>

          {/* Top 3 Amenities */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {hotel.amenities.slice(0, 3).map((am) => (
              <span
                key={am.id}
                className="text-[10px] text-gray-600 bg-[#FAF6ED] px-2 py-0.5 rounded-md border border-[#E5DDC3]/60 flex items-center gap-1"
              >
                <i className={`${am.icon} text-[9px] text-emerald-700`}></i>
                {am.label}
              </span>
            ))}
          </div>
        </div>

        {/* Price & Action */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-emerald-900 font-montserrat">
                ₹{hotel.startingPrice.toLocaleString('en-IN')}
              </span>
              {hotel.originalPrice && (
                <span className="text-[11px] text-gray-400 line-through">
                  ₹{hotel.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <p className="text-[9.5px] text-gray-400 leading-tight">per room / night + taxes</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            className="bg-[#06381e] hover:bg-[#0a4d2b] text-amber-300 text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>View Rooms</span>
            <i className="fa-solid fa-arrow-right text-[10px]"></i>
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
};
