import { motion } from 'framer-motion';
import { useNavigate } from '../../router';

export const PackageCard = ({ pkg, index = 0 }) => {
  const navigate = useNavigate();

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -3 }}
      onClick={() => navigate(`/packages/${pkg.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-[#E5DDC3]/80 transition-all duration-300 flex flex-col cursor-pointer group"
    >
      {/* Hero Image */}
      <div className="relative h-44 w-full overflow-hidden bg-gray-200">
        <img
          src={pkg.heroImage}
          alt={pkg.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

        {/* Duration & Type Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="bg-[#06381e]/90 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs border border-amber-400/40">
            {pkg.duration}
          </span>
          <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
            {pkg.type}
          </span>
        </div>

        {/* Rating */}
        <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/20">
          <span>{pkg.rating}</span>
          <i className="fa-solid fa-star text-[8px] text-amber-300"></i>
        </div>

        {/* Bottom Destinations Overlay */}
        <div className="absolute bottom-2 left-2.5 right-2.5 text-white text-[11px] font-medium drop-shadow flex items-center justify-between">
          <span className="flex items-center gap-1 truncate max-w-[70%]">
            <i className="fa-solid fa-map-pin text-amber-400 text-xs shrink-0"></i>
            <span className="truncate">{pkg.destinations.join(' • ')}</span>
          </span>
          <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs shrink-0">
            {pkg.difficulty}
          </span>
        </div>
      </div>

      {/* Package Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="font-montserrat font-bold text-sm text-gray-900 leading-snug group-hover:text-emerald-800 transition-colors">
            {pkg.title}
          </h3>

          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {pkg.highlights[0]}
          </p>

          {/* Quick Inclusions icons */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <span className="text-[10px] text-gray-600 bg-[#FAF6ED] px-2 py-0.5 rounded-md border border-[#E5DDC3]/60 flex items-center gap-1">
              <i className="fa-solid fa-car text-[9px] text-emerald-800"></i>
              Private Cab
            </span>
            <span className="text-[10px] text-gray-600 bg-[#FAF6ED] px-2 py-0.5 rounded-md border border-[#E5DDC3]/60 flex items-center gap-1">
              <i className="fa-solid fa-hotel text-[9px] text-emerald-800"></i>
              Stay Included
            </span>
            <span className="text-[10px] text-gray-600 bg-[#FAF6ED] px-2 py-0.5 rounded-md border border-[#E5DDC3]/60 flex items-center gap-1">
              <i className="fa-solid fa-utensils text-[9px] text-emerald-800"></i>
              Meals
            </span>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-emerald-950 font-montserrat">
                ₹{pkg.pricePerPerson.toLocaleString('en-IN')}
              </span>
              {pkg.originalPrice && (
                <span className="text-[11px] text-gray-400 line-through">
                  ₹{pkg.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <span className="text-[9.5px] text-gray-400 block">per traveler + all inclusive</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            className="bg-[#06381e] hover:bg-[#0a4d2b] text-amber-300 text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>View Plan</span>
            <i className="fa-solid fa-arrow-right text-[10px]"></i>
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
};
