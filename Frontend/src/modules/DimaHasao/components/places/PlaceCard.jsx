import { useNavigate } from '../../router';
import { motion } from 'framer-motion';

export const PlaceCard = ({ place }) => {
  const navigate = useNavigate();

  return (
    <article className="bg-white rounded-2xl shadow-md overflow-hidden border border-orange-200/80 relative pb-4 transition-all hover:shadow-lg">
      {/* Top Banner Image with Inset Badge */}
      <div className="relative h-60 w-full overflow-hidden bg-gray-100">
        <img
          alt={place.name}
          className="w-full h-full object-cover rounded-t-2xl transition-transform duration-500 hover:scale-105"
          src={place.mainImage}
        />

        {/* Circular Inset Image */}
        {place.insetImage && (
          <div className="absolute -bottom-7 right-4 w-20 h-20 sm:w-22 sm:h-22 rounded-full border-4 border-white overflow-hidden shadow-lg z-10 bg-white">
            <img alt={`${place.name} Inset`} className="w-full h-full object-cover" src={place.insetImage} />
          </div>
        )}
      </div>

      {/* Details Container */}
      <div className="p-4 pt-10">
        <h2 className="text-base font-bold text-[#0a3a2a] mb-0.5 tracking-wide">
          {place.number}. {place.name}
        </h2>
        {place.subtitle && (
          <h3 className="text-xs font-bold text-[#cc1b21] mb-1.5 leading-snug">
            {place.subtitle}
          </h3>
        )}

        <p className="text-[11px] text-gray-600 mb-2 flex items-center gap-1.5 font-medium">
          <i className="fa-solid fa-location-dot text-[#cc1b21]"></i>
          <span>{place.location}</span>
        </p>

        <p className="text-xs leading-relaxed text-gray-700 mb-3.5 line-clamp-3">
          {place.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-600 mb-4">
          {place.tags?.map((tag, idx) => (
            <span
              key={idx}
              className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 font-medium"
            >
              <i className={`${tag.icon} ${tag.color} text-xs`}></i>
              <span>{tag.text}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Explore Button */}
      <div className="px-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate(`/places/${place.id}`)}
          className="w-full bg-[#0a3a2a] hover:bg-emerald-800 text-white rounded-full py-2.5 text-xs font-bold tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
        >
          <span>EXPLORE</span>
          <i className="fa-solid fa-arrow-right text-[10px]"></i>
        </motion.button>
      </div>
    </article>
  );
};
