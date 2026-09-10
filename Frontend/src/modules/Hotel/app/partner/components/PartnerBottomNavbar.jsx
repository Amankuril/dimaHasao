import React from 'react';
import { LayoutDashboard, Briefcase, UserCircle, Crown, Clapperboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

const PartnerBottomNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('dashboard') || path === '/hotel') return 'Dashboard';
    if (path.includes('bookings')) return 'Enquiry';
    if (path.includes('subscription')) return 'Subscription';
    if (path.includes('reels') || path.includes('reel')) return 'Reels';
    if (path.includes('profile')) return 'Profile';
    return '';
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, route: '/hotel/dashboard' },
    { name: 'Enquiry', icon: Briefcase, route: '/hotel/bookings' },
    { name: 'Subscription', icon: Crown, route: '/hotel/subscriptions' },
    { name: 'Reels', icon: Clapperboard, route: '/reels' },
    { name: 'Profile', icon: UserCircle, route: '/hotel/profile' },
  ];

  const handleNavClick = (item) => {
    navigate(item.route);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] print:hidden pb-safe">
      <div className="
        bg-white/95 backdrop-blur-md 
        rounded-t-[28px] 
        shadow-[0_-8px_30px_rgba(0,0,0,0.08)] 
        border-t border-gray-100/80 
        px-2 h-[68px] 
        grid grid-cols-5 items-center 
        relative
      ">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = getActiveTab() === item.name;

          return (
            <button
              key={item.name}
              onClick={() => handleNavClick(item)}
              className="relative flex flex-col items-center justify-center h-full gap-1 p-1"
            >
              {isActive && (
                <motion.div
                  layoutId="partner-active-pill"
                  className="absolute inset-x-2 inset-y-1.5 bg-[#005CA8]/10 rounded-xl -z-10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <Icon
                size={22}
                className={`transition-colors duration-200 ${isActive ? 'text-[#005CA8] fill-[#005CA8]/10' : 'text-gray-400'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />

              <span className={`text-[10px] font-bold tracking-wide transition-colors duration-200 ${isActive ? 'text-[#005CA8]' : 'text-gray-400'}`}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PartnerBottomNavbar;

