import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

// Premium SVG Icon Components with Active & Inactive States
const HomeIcon = ({ isActive }) => (
    <div className="relative flex items-center justify-center">
        {isActive ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[23px] h-[23px] drop-shadow-[0_2px_8px_rgba(26,86,219,0.35)]">
                <defs>
                    <linearGradient id="homeGrad" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#2563eb" />
                        <stop offset="1" stopColor="#1d4ed8" />
                    </linearGradient>
                </defs>
                <path d="M3 9.8L12 2.5L21 9.8V20C21 20.5523 20.5523 21 20 21H15C14.4477 21 14 20.5523 14 20V15.5C14 14.6716 13.3284 14 12.5 14H11.5C10.6716 14 10 14.6716 10 15.5V20C10 20.5523 9.55228 21 9 21H4C3.44772 21 3 20.5523 3 20V9.8Z" fill="url(#homeGrad)" />
                <path d="M10 21V15.5C10 14.6716 10.6716 14 11.5 14H12.5C13.3284 14 14 14.6716 14 15.5V21" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
        ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[23px] h-[23px]">
                <path d="M3 9.8L12 2.5L21 9.8V20C21 20.5523 20.5523 21 20 21H15C14.4477 21 14 20.5523 14 20V15.5C14 14.6716 13.3284 14 12.5 14H11.5C10.6716 14 10 14.6716 10 15.5V20C10 20.5523 9.55228 21 9 21H4C3.44772 21 3 20.5523 3 20V9.8Z" stroke="#788292" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )}
    </div>
);

const BookingsIcon = ({ isActive }) => (
    <div className="relative flex items-center justify-center">
        {isActive ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[23px] h-[23px] drop-shadow-[0_2px_8px_rgba(26,86,219,0.35)]">
                <defs>
                    <linearGradient id="bookGrad" x1="3" y1="2" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#2563eb" />
                        <stop offset="1" stopColor="#1d4ed8" />
                    </linearGradient>
                </defs>
                <rect x="3" y="4" width="18" height="17" rx="4" fill="url(#bookGrad)" />
                <path d="M16 2V5.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 2V5.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 9.5H21" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" />
                <path d="M8.5 15.2L11 17.5L15.5 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[23px] h-[23px]">
                <rect x="3" y="4" width="18" height="17" rx="4" stroke="#788292" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 2V5.5" stroke="#788292" strokeWidth="1.9" strokeLinecap="round" />
                <path d="M8 2V5.5" stroke="#788292" strokeWidth="1.9" strokeLinecap="round" />
                <path d="M3 9.5H21" stroke="#788292" strokeWidth="1.7" />
                <circle cx="8" cy="13.5" r="1.1" fill="#788292" />
                <circle cx="12" cy="13.5" r="1.1" fill="#788292" />
                <circle cx="16" cy="13.5" r="1.1" fill="#788292" />
                <circle cx="8" cy="17" r="1.1" fill="#788292" />
                <circle cx="12" cy="17" r="1.1" fill="#788292" />
                <circle cx="16" cy="17" r="1.1" fill="#788292" />
            </svg>
        )}
    </div>
);

const ProfileIcon = ({ isActive }) => (
    <div className="relative flex items-center justify-center">
        {isActive ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[23px] h-[23px] drop-shadow-[0_2px_8px_rgba(26,86,219,0.35)]">
                <defs>
                    <linearGradient id="profGrad" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#2563eb" />
                        <stop offset="1" stopColor="#1d4ed8" />
                    </linearGradient>
                </defs>
                <circle cx="12" cy="7.5" r="4.2" fill="url(#profGrad)" />
                <path d="M4 20.5C4 16.5 7.5 13.5 12 13.5C16.5 13.5 20 16.5 20 20.5" fill="url(#profGrad)" />
            </svg>
        ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[23px] h-[23px]">
                <circle cx="12" cy="7.5" r="4.2" stroke="#788292" strokeWidth="1.9" strokeLinecap="round" />
                <path d="M4.5 20.5C4.5 16.8 7.8 13.8 12 13.8C16.2 13.8 19.5 16.8 19.5 20.5" stroke="#788292" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
        )}
    </div>
);

const BottomNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { name: 'Home', icon: HomeIcon, route: '/' },
        { name: 'Add Property', icon: Plus, route: '/hotel/login', isCenter: true },
        { name: 'Bookings', icon: BookingsIcon, route: '/bookings' },
        { name: 'Profile', icon: ProfileIcon, route: '/profile/edit' },
    ];

    const getActiveTab = (path) => {
        if (path.includes('hotel') || path.includes('post') || path.includes('property')) return 'Add Property';
        if (path.includes('bookings') || path.includes('checkout')) return 'Bookings';
        if (path.includes('profile') || path.includes('account')) return 'Profile';
        return 'Home';
    };

    const activeTab = getActiveTab(location.pathname);

    const handleNavClick = (item) => {
        navigate(item.route);
    };

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] print:hidden pb-safe">
            <div className="bg-white/95 backdrop-blur-xl rounded-t-[30px] shadow-[0_-8px_32px_rgba(0,0,0,0.09)] border-t border-gray-100/90 px-2 h-[70px] grid grid-cols-4 items-center relative">
                {navItems.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = activeTab === item.name;

                    if (item.isCenter) {
                        return (
                            <div key={item.name} className="relative flex justify-center items-center h-full">
                                <button
                                    onClick={() => handleNavClick(item)}
                                    className="absolute -top-3.5 w-14 h-14 bg-[#0b1329] hover:bg-[#070d1e] rounded-full flex items-center justify-center shadow-xl shadow-slate-900/35 transition-transform active:scale-95 border-[3px] border-white"
                                    aria-label="Add Property"
                                >
                                    <Plus className="w-7 h-7 text-[#f59e0b]" strokeWidth={2.5} />
                                </button>
                            </div>
                        );
                    }

                    return (
                        <button
                            key={item.name}
                            onClick={() => handleNavClick(item)}
                            className="relative flex flex-col items-center justify-center h-full py-1 gap-1 transition-all duration-200 active:scale-95 group"
                        >
                            {/* Animated soft glow background behind active icon */}
                            {isActive && (
                                <motion.div
                                    layoutId="bottom-nav-active-glow"
                                    className="absolute inset-x-2.5 inset-y-2 bg-blue-50/70 rounded-2xl -z-10 border border-blue-100/40"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}

                            <motion.div
                                animate={{ scale: isActive ? 1.08 : 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className="flex items-center justify-center"
                            >
                                <IconComponent isActive={isActive} />
                            </motion.div>

                            <span
                                className={`text-[11px] tracking-tight transition-all duration-200 ${
                                    isActive
                                        ? 'font-bold text-[#1a56db] scale-[1.02]'
                                        : 'font-medium text-[#788292] group-hover:text-gray-800'
                                }`}
                            >
                                {item.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNavbar;
