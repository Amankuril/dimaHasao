import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PatternDivider } from './PatternDivider';
import '../../dimahasao.css';

// The v1 Dima Hasao header, for wrapping the Hello-Parth food/taxi/hotel
// modules. Deliberately standalone: it uses the host router directly and takes
// no BookingContext, so it can render outside the DimaHasao route tree.
export const ModuleHeader = ({ title, subtitle, backTo = '/app' }) => {
  const navigate = useNavigate();

  return (
    <header className="bg-[#062c16] text-white px-3.5 py-3 sticky top-0 z-40 shadow-md backdrop-blur-md border-b border-emerald-900/50">
      <div className="flex items-center justify-between gap-2">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => navigate(backTo)}
          aria-label="Go Back"
          className="p-1 -ml-1 text-white hover:text-amber-300 transition-colors flex items-center justify-center text-base cursor-pointer shrink-0"
        >
          <i className="fa-solid fa-arrow-left text-base"></i>
        </motion.button>

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

        <div className="w-6" />
      </div>
    </header>
  );
};

export const ModuleShell = ({ title, subtitle, children }) => (
  <div className="dh-app min-h-screen flex flex-col bg-[#FAF6ED]">
    <ModuleHeader title={title} subtitle={subtitle} />
    <PatternDivider variant="green-gold" />
    <div className="flex-1 min-h-0">{children}</div>
  </div>
);

export default ModuleShell;
