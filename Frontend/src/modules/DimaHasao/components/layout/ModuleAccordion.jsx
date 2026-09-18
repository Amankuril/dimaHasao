import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * One module's sub-section, collapsed by default.
 *
 * Profile and More both show five modules' worth of rows. Flat, that is a very
 * long screen and the customer's own identity gets pushed off the top — so each
 * module collapses to a single line naming what is inside it, and only the
 * section they tapped expands.
 *
 * A row with `control` is rendered by the caller through `renderControl`: some
 * of what lives in a module's profile is a setting, not a destination.
 */
export const ModuleAccordion = ({
  section,
  rows,
  defaultOpen = false,
  onNavigate,
  renderControl,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!rows?.length) return null;

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-[#E5DDC3] overflow-hidden">
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 p-3.5 text-left cursor-pointer hover:bg-[#FAF6ED]/60 transition-colors"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm ${section.tint}`}>
          <i className={section.icon}></i>
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="font-montserrat font-bold text-xs text-gray-900 truncate">
            {section.title}
          </h4>
          <p className="text-[10px] text-gray-500 truncate leading-snug mt-0.5">
            {section.subtitle}
          </p>
        </div>

        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
          {rows.length}
        </span>
        <i
          className={`fa-solid fa-chevron-down text-[10px] text-gray-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180 text-emerald-800' : ''
          }`}
        ></i>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-t border-[#E5DDC3]/70 overflow-hidden"
          >
            <div className="p-2 space-y-0.5">
              {rows.map((row) => {
                if (row.control) {
                  return (
                    <div key={row.control} className="px-1">
                      {renderControl?.(row)}
                    </div>
                  );
                }

                return (
                  <button
                    key={row.path + row.label}
                    onClick={() => onNavigate(row.path)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#FAF6ED] transition-colors text-left cursor-pointer"
                  >
                    <i className={`${row.icon} text-emerald-800 text-xs w-4 text-center shrink-0`}></i>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-gray-800 truncate">
                        {row.label}
                      </span>
                      {row.sub && (
                        <span className="block text-[10px] text-gray-500 truncate leading-snug">
                          {row.sub}
                        </span>
                      )}
                    </div>
                    <i className="fa-solid fa-chevron-right text-gray-300 text-[10px] shrink-0"></i>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
