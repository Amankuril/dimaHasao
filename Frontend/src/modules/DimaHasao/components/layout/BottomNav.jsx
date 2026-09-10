import { useLocation, useNavigate } from '../../router';
import { motion } from 'framer-motion';
import { useBooking } from '../../context/BookingContext';

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookings } = useBooking();

  const currentPath = location.pathname;

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: 'fa-solid fa-house',
      path: '/'
    },
    {
      id: 'bookings',
      label: 'My Bookings',
      icon: 'fa-regular fa-calendar-check',
      path: '/bookings',
      badge: bookings.length > 0 ? bookings.length : null
    },
    {
      id: 'center',
      isCenter: true,
      label: 'Explore',
      path: '/places'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: 'fa-regular fa-circle-user',
      path: '/profile'
    },
    {
      id: 'more',
      label: 'More',
      icon: 'fa-solid fa-ellipsis',
      path: '/more'
    }
  ];

  return (
    <div className="fixed bottom-2 left-0 right-0 z-50 px-2.5 flex justify-center pointer-events-none">
      <nav
        className="w-full max-w-[384px] bg-[#06381e] text-white rounded-full px-3 py-1 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-emerald-800/50 select-none pointer-events-auto h-[48px] flex items-center"
        data-purpose="bottom-nav"
      >
        <div className="flex justify-between items-center w-full relative px-1">
          {navItems.map((item) => {
            if (item.isCenter) {
              return (
                <div key="center-button" className="relative w-14 h-8 flex justify-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => navigate('/places')}
                    aria-label="Explore Dima Hasao"
                    className="absolute -top-4 bg-[#06381e] rounded-full p-0.5 shadow-[0_6px_20px_rgba(0,0,0,0.55)] w-[58px] h-[58px] flex items-center justify-center border-[3.5px] border-[#06381e] cursor-pointer z-20"
                  >
                    <img
                      alt="Dimasa Traditional Emblem"
                      className="w-full h-full rounded-full object-cover shadow-inner"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHxXjaqg_p2_vshVQlQARltQKITPTxRdxMMlP-3QyFF5y8e2b25l5rewGDv8hjTJT1mIeodoXkQyW5Q5DbamrNM5Wqkn9zC5hXH-uNiaqjmuWSf0eYIG090j8R2skAqbm4nCA9jzMl8Rca5t2ANsI31UQDQpgiAqnjiXgjeFcP5hsy0iTh8orLvaeTNhXhfOJY7K7F6qam7R85TVEaEb8naGgso3oEml2Ix6YFyN-Jua917AHlmZIs"
                    />
                  </motion.button>
                </div>
              );
            }

            const isActive = item.path
              ? item.path === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.path)
              : false;

            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  if (item.path) {
                    navigate(item.path);
                  }
                }}
                className="flex flex-col items-center justify-center w-13 relative transition-colors cursor-pointer"
              >
                <div className="relative flex items-center justify-center h-4">
                  <i
                    className={`${item.icon} text-sm transition-colors ${
                      isActive ? 'text-[#ffd027]' : 'text-white/85 hover:text-white'
                    }`}
                  ></i>
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2 bg-[#ffd027] text-black text-[8px] font-extrabold w-3 h-3 rounded-full flex items-center justify-center border border-[#06381e]">
                      {item.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[8.5px] font-medium tracking-tight mt-0.5 leading-none transition-colors ${
                    isActive ? 'text-[#ffd027] font-semibold' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item.label}
                </span>

                {/* Active flat yellow line indicator directly under the text */}
                <div className="h-[2px] w-5 flex items-center justify-center mt-[2px]">
                  {isActive && (
                    <motion.div
                      layoutId="pill-active-line"
                      className="w-4 h-[1.8px] bg-[#ffd027] rounded-full"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
