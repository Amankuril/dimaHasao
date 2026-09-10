import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const ItineraryTimeline = ({ itinerary = [] }) => {
  const [expandedDays, setExpandedDays] = useState([1]); // Day 1 open by default

  const toggleDay = (dayNum) => {
    setExpandedDays((prev) =>
      prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum]
    );
  };

  return (
    <div className="space-y-3">
      {itinerary.map((dayItem) => {
        const isOpen = expandedDays.includes(dayItem.day);

        return (
          <div
            key={dayItem.day}
            className="bg-white rounded-2xl overflow-hidden shadow-xs border border-[#E5DDC3] transition-all"
          >
            {/* Day Header Button */}
            <button
              onClick={() => toggleDay(dayItem.day)}
              className="w-full p-3.5 flex items-center justify-between gap-3 text-left hover:bg-gray-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-full bg-[#06381e] text-amber-300 font-montserrat font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  D{dayItem.day}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      Day {dayItem.day}
                    </span>
                    {dayItem.mealPlan && (
                      <span className="bg-amber-100 text-amber-900 text-[9.5px] font-semibold px-2 py-0.2 rounded border border-amber-300">
                        {dayItem.mealPlan}
                      </span>
                    )}
                  </div>
                  <h4 className="font-montserrat font-bold text-xs text-gray-900 truncate mt-0.5">
                    {dayItem.title}
                  </h4>
                </div>
              </div>

              <i
                className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform duration-200 shrink-0 ${
                  isOpen ? 'rotate-180 text-emerald-800' : ''
                }`}
              />
            </button>

            {/* Expandable Activities List */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="px-4 pb-4 pt-1 border-t border-gray-100 bg-[#FAF6ED]/40"
                >
                  <div className="space-y-2 mt-2">
                    {dayItem.activities.map((act, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{act}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
