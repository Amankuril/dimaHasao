import { motion } from 'framer-motion';
import { useNavigate } from '../../router';

export const RestaurantCard = ({ restaurant, index = 0 }) => {
  const navigate = useNavigate();

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -3 }}
      onClick={() => navigate(`/food/${restaurant.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-[#E5DDC3]/80 transition-all duration-300 flex flex-col cursor-pointer group"
    >
      {/* Restaurant Image */}
      <div className="relative h-40 w-full overflow-hidden bg-gray-200">
        <img
          src={restaurant.heroImage}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Veg / Non-Veg Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {restaurant.isVegOnly ? (
            <span className="bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              <i className="fa-solid fa-leaf text-[9px]"></i>
              <span>Pure Veg</span>
            </span>
          ) : (
            <span className="bg-[#06381e]/90 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs border border-amber-400/40">
              Ethnic & Multi-Cuisine
            </span>
          )}
        </div>

        {/* Delivery Time Badge */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white font-medium drop-shadow">
          <span className="flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
            <i className="fa-solid fa-clock text-amber-300 text-xs"></i>
            {restaurant.deliveryTime}
          </span>
          <span className="bg-black/50 px-2 py-0.5 rounded-md text-[10px] backdrop-blur-xs">
            Min ₹{restaurant.minOrder}
          </span>
        </div>
      </div>

      {/* Restaurant Details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-montserrat font-bold text-sm text-gray-900 leading-snug group-hover:text-emerald-800 transition-colors">
              {restaurant.name}
            </h3>
            <span className="bg-emerald-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ml-1">
              <span>{restaurant.rating}</span>
              <i className="fa-solid fa-star text-[8px] text-amber-300"></i>
            </span>
          </div>

          {/* Cuisines */}
          <p className="text-xs text-gray-500 truncate">
            {restaurant.cuisine.join(' • ')}
          </p>

          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1 truncate">
            <i className="fa-solid fa-location-dot text-emerald-700"></i>
            <span>{restaurant.address}</span>
          </p>
        </div>

        {/* Bottom Price & Action */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-600 font-medium">
            ₹{restaurant.priceForTwo} for two
          </span>

          <motion.button
            whileTap={{ scale: 0.94 }}
            className="bg-[#06381e] hover:bg-[#0a4d2b] text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>View Menu</span>
            <i className="fa-solid fa-arrow-right text-[10px]"></i>
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
};
