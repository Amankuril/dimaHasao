import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useUserTheme } from '../../../shared/context/UserThemeContext';
import { getTaxiUserRoutePrefix } from '../../../shared/utils/routePrefix';

/**
 * Sits directly under SuperAppHomeHeader, which already owns branding, the
 * location pill and the wallet button — this used to repeat all three (plus,
 * in its floating variant, a second wallet button on top of the map), which
 * is what made the taxi home header look duplicated/cluttered. All it adds
 * now is the "Where do you want to go?" search trigger.
 */
const HeaderGreeting = ({ hideSearch = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = getTaxiUserRoutePrefix(location.pathname);
  const { theme } = useUserTheme();

  if (hideSearch) return null;

  return (
    <div className="px-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: 'easeOut' }}
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate(`${routePrefix}/ride/select-location`, { state: { activeInput: 'drop', flow: 'ride' } })}
          className={`flex w-full items-center gap-3 rounded-full text-left shadow-[0_12px_26px_rgba(15,23,42,0.06)] transition-all ${theme === 'dark'
              ? 'search-button-dark'
              : 'bg-[#f1f3f6] border border-slate-200/40 text-slate-900'
            }`}
        >
          <Search size={16} className={theme === 'dark' ? 'text-white' : 'text-slate-900'} strokeWidth={2.5} />
          <span className={`min-w-0 flex-1 truncate text-[13px] font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Where do you want to go?
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default HeaderGreeting;
