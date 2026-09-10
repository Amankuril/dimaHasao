import { useState } from 'react';
import { WHY_VISIT_DATA } from '../../data/tourismData';
import { motion, AnimatePresence } from 'framer-motion';

export const WhyVisitGrid = () => {
  const [selectedHighlight, setSelectedHighlight] = useState(null);

  return (
    <>
      <div className="bg-[#fcf8ed] rounded-2xl p-3 shadow-sm border border-orange-200/70 mx-3 mb-24" data-purpose="why-visit">
        <h3 className="text-center font-bold text-gray-900 mb-2.5 text-xs sm:text-sm">
          Why Visit Dima Hasao?
        </h3>

        <div className="grid grid-cols-4 gap-1.5">
          {WHY_VISIT_DATA.map((item, index) => (
            <motion.div
              key={item.id}
              whileTap={{ scale: 0.93 }}
              onClick={() => setSelectedHighlight(item)}
              className={`flex flex-col items-center text-center p-1 rounded-xl hover:bg-orange-100/50 transition-colors cursor-pointer ${
                index > 0 ? 'border-l border-orange-200/90 pl-1' : ''
              }`}
            >
              <div className="w-10 h-10 mb-1 flex items-center justify-center">
                <img
                  alt={item.title}
                  className="h-9 object-contain drop-shadow-xs"
                  src={item.image}
                />
              </div>
              <span className="text-[8.5px] font-bold text-gray-800 leading-tight">
                {item.title}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Highlight Details Modal */}
      <AnimatePresence>
        {selectedHighlight && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedHighlight(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-white rounded-3xl p-5 shadow-2xl z-10 w-full max-w-sm border border-emerald-100 relative"
            >
              <button
                onClick={() => setSelectedHighlight(null)}
                className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>

              <div className="flex items-center gap-3 mb-3">
                <img
                  src={selectedHighlight.image}
                  alt={selectedHighlight.title}
                  className="w-12 h-12 object-contain"
                />
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{selectedHighlight.title}</h4>
                  <p className="text-[11px] text-emerald-800 font-semibold">{selectedHighlight.subtitle}</p>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                {selectedHighlight.description}
              </p>

              <button
                onClick={() => setSelectedHighlight(null)}
                className="w-full py-2.5 bg-[#0a3a22] text-white rounded-xl font-bold text-xs hover:bg-emerald-800 transition-colors shadow-md cursor-pointer"
              >
                Explore More
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
