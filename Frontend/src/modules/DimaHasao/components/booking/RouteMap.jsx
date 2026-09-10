import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const RouteMap = ({ place }) => {
  const [showFullMap, setShowFullMap] = useState(false);

  return (
    <section>
      <h3 className="font-bold text-sm sm:text-base mb-2.5 text-gray-900 flex items-center gap-2">
        <i className="fa-solid fa-map-location-dot text-emerald-800"></i>
        <span>Route Overview</span>
      </h3>

      <div className="relative bg-white rounded-2xl p-1.5 shadow-sm border border-[#E5DDC3] overflow-hidden h-60">
        <img
          alt="Map Route"
          className="w-full h-full object-cover rounded-xl"
          src={place.routeOverviewImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA5j2IwgOANlRiyn4G-hWEa6kjfN3Bn8ZxOnm5zSqkvFdxXc4Si5_qPH8LuqmV5sbPUfJPUQVEOEj-VastKPFBIYnqXBBmcczt5EREh9Z0ZsC7qwUZtaB3Ext24tsatrfOe_-czcyVoigKY-FK-Cf7egZF28huoOGqPFu2QtbnWDLUoZLXFHrkEKeam6fVRoRuB_7mpglvWs_IdcDdqWcSPNe0vqnUD62WijysL39vzeqL6upcRm28V'}
        />

        {/* Pickup Pin */}
        <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
          <span className="bg-white/95 px-2 py-0.5 rounded-md text-[10px] font-bold shadow text-gray-800 mb-1 border border-gray-100">
            Haflong Station
          </span>
          <div className="w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-ping absolute top-5"></div>
          <div className="w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-lg relative"></div>
        </div>

        {/* Destination Pin */}
        <div className="absolute top-1/3 right-1/4 transform translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
          <span className="bg-white/95 px-2 py-0.5 rounded-md text-[10px] font-bold shadow text-gray-800 mb-1 whitespace-nowrap border border-gray-100">
            {place.name}
          </span>
          <i className="fa-solid fa-location-dot text-red-500 text-2xl drop-shadow-md animate-bounce"></i>
        </div>

        {/* Route Info Tooltip Center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-full shadow-md text-xs font-semibold flex items-center gap-2 border border-gray-100 pointer-events-none">
          <i className="fa-solid fa-car-side text-emerald-700"></i>
          <div>
            <span className="text-[11px] font-bold text-gray-900">{place.distanceFromStation}</span>
            <span className="text-[9px] text-gray-500 font-normal block leading-none">{place.travelTime}</span>
          </div>
        </div>

        {/* View Map Button */}
        <button
          onClick={() => setShowFullMap(true)}
          className="absolute bottom-3 right-3 bg-white/95 hover:bg-white px-3 py-1.5 rounded-xl shadow-md font-semibold text-xs flex items-center gap-1.5 border border-gray-200 text-gray-800 transition-all active:scale-95 cursor-pointer"
        >
          <i className="fa-solid fa-map text-emerald-700"></i>
          <span>View in Maps</span>
        </button>
      </div>

      {/* Full Map Modal */}
      <AnimatePresence>
        {showFullMap && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFullMap(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-5 shadow-2xl z-10 w-full max-w-sm border border-emerald-100 relative"
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-sm text-gray-900">Interactive GPS Route</h4>
                <button
                  onClick={() => setShowFullMap(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>

              <div className="h-64 w-full rounded-2xl overflow-hidden border border-gray-200 mb-3">
                <img src={place.routeOverviewImage || place.mapImage} alt="Detailed Route" className="w-full h-full object-cover" />
              </div>

              <p className="text-[11px] text-gray-600 mb-3 text-center">
                Route guidance: Via NH 27 / Jatinga Bypass. Smooth scenic hill road condition.
              </p>

              <button
                onClick={() => setShowFullMap(false)}
                className="w-full py-2.5 bg-[#0a3a22] text-white rounded-xl font-bold text-xs shadow hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                Close Map
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
