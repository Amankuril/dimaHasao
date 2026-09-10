import { motion } from 'framer-motion';

export const RoomCard = ({ room, isSelected = false, onSelect }) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`bg-white rounded-2xl overflow-hidden border transition-all duration-300 ${
        isSelected
          ? 'border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
          : 'border-[#E5DDC3] shadow-xs hover:border-emerald-300'
      }`}
    >
      {/* Room Photo & Badges */}
      <div className="relative h-36 w-full overflow-hidden bg-gray-100">
        <img
          src={room.image}
          alt={room.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {room.isPopular && (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
            Most Popular
          </span>
        )}

        <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded backdrop-blur-xs">
          {room.availableRooms} rooms left
        </span>

        <div className="absolute bottom-2 left-2 text-white text-xs font-semibold drop-shadow">
          <span>{room.size}</span> • <span>{room.bedType}</span>
        </div>
      </div>

      {/* Room Details */}
      <div className="p-3.5 space-y-3">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="font-montserrat font-bold text-sm text-gray-900">{room.name}</h4>
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Max {room.maxGuests} Guests
            </span>
          </div>

          {/* Amenities checklist */}
          <div className="grid grid-cols-2 gap-1.5 mt-2.5">
            {room.amenities.map((am, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                <i className="fa-solid fa-circle-check text-emerald-600 text-[10px] shrink-0"></i>
                <span className="truncate">{am}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Price & Selection Button */}
        <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-emerald-950 font-montserrat">
                ₹{room.price.toLocaleString('en-IN')}
              </span>
              {room.originalPrice && (
                <span className="text-[11px] text-gray-400 line-through">
                  ₹{room.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <span className="text-[9.5px] text-gray-400 block">per night + ₹{Math.round(room.price * 0.12)} tax</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => onSelect(room)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
              isSelected
                ? 'bg-emerald-700 text-white'
                : 'bg-[#06381e] text-amber-300 hover:bg-[#0a4d2b]'
            }`}
          >
            {isSelected ? (
              <>
                <i className="fa-solid fa-check text-[10px]"></i>
                <span>Selected</span>
              </>
            ) : (
              <span>Select Room</span>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
