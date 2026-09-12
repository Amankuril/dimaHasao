import React, { useState, useEffect } from 'react';
import { User, Globe, Menu, X, Home, Search, Calendar, Wallet, Share2, LogOut, FileText, HelpCircle, Shield, ChevronRight, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const TopNavbar = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = user.name || 'User';
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Disable body scroll when sidebar is open
    useEffect(() => {
        if (isSidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isSidebarOpen]);

    const handleNavigation = (path) => {
        setIsSidebarOpen(false);
        navigate(path);
    };

    const navLinks = [
        { name: 'Home', path: '/', icon: Home },
        { name: 'Search', path: '/search', icon: Search },
        { name: 'Add Property', path: '/hotel/login', icon: Plus }, // Maps to hotel login like mobile
        { name: 'Bookings', path: '/bookings', icon: Calendar },
        { name: 'Wallet', path: '/wallet', icon: Wallet },
        { name: 'Refer & Earn', path: '/refer', icon: Share2 },
    ];

    const supportLinks = [
        { name: 'Help & Support', path: '/support', icon: HelpCircle },
        { name: 'Terms & Conditions', path: '/terms', icon: FileText },
        { name: 'Privacy Policy', path: '/privacy', icon: Shield },
    ];

    return (
        <>
            <nav className="hidden md:flex w-full h-16 bg-white/95 backdrop-blur-md border-b border-gray-100 px-8 justify-between items-center fixed top-0 z-40">
                
                {/* Left Side: Hamburger Menu & Logo */}
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-100 flex items-center justify-center text-gray-700"
                    >
                        <Menu size={20} />
                    </button>

                    <Link to="/">
                        <div className="flex flex-col items-start leading-tight group">
                            <span className="text-2xl font-black tracking-tighter text-gray-900">
                                HOOM<span className="text-emerald-600">ZO</span>
                            </span>
                            <div className="h-0.5 w-6 bg-emerald-500 rounded-full group-hover:w-full transition-all duration-300"></div>
                        </div>
                    </Link>
                </div>

                {/* Desktop Links (Restored) */}
                <div className="flex items-center gap-8">
                    <Link to="/" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                        Home
                    </Link>
                    <Link to="/search" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                        Search
                    </Link>
                    <Link to="/hotel/partner/login" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                        Add Property
                    </Link>
                    <Link to="/bookings" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                        Bookings
                    </Link>
                    <Link to="/wallet" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                        Wallet
                    </Link>
                    <Link to="/refer" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                        Refer & Earn
                    </Link>
                </div>

                {/* Right Side: User Actions */}
                <div className="flex items-center gap-4">
                    <Link
                        to="/saved-places"
                        className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition border border-transparent hover:border-emerald-100"
                    >
                        <Globe size={18} className="text-gray-500 hover:text-emerald-600" />
                    </Link>

                    <Link
                        to="/settings"
                        className="pl-3 pr-4 py-1.5 bg-white border border-gray-100 rounded-full flex items-center gap-3 hover:border-emerald-200 hover:bg-emerald-50/30 transition group shadow-sm"
                    >
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-200">
                            {userName.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-emerald-950 group-hover:text-emerald-700">
                            {userName.split(' ')[0]}
                        </span>
                    </Link>
                </div>
            </nav>

            {/* Sidebar Drawer */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <div className="fixed inset-0 z-50 flex hidden md:flex">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', ease: 'circOut', duration: 0.4 }}
                            className="relative flex h-[100dvh] w-[85%] max-w-[300px] flex-col bg-white shadow-2xl z-[51]"
                        >
                            <div className="flex-1 overflow-y-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                                {/* Sidebar Header */}
                                <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-100">
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-xl font-black tracking-tighter text-gray-900">
                                            HOOM<span className="text-emerald-600">ZO</span>
                                        </span>
                                        <div className="h-1 w-6 bg-emerald-600 rounded-full mt-0.5"></div>
                                    </div>
                                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition border border-gray-100">
                                        <X size={20} className="text-gray-500" />
                                    </button>
                                </div>

                                {/* Main Navigation */}
                                <div className="px-3 mt-4 space-y-1">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-3">
                                        Main Menu
                                    </h4>
                                    {navLinks.map((link, idx) => {
                                        const Icon = link.icon;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleNavigation(link.path)}
                                                className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-emerald-50 group transition-all"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/5 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                                                    <Icon size={18} className="text-emerald-700" />
                                                </div>
                                                <span className="flex-1 text-left font-bold text-gray-700 text-sm group-hover:text-emerald-800 transition-colors">{link.name}</span>
                                                <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-600 transition-colors" />
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Support Links */}
                                <div className="px-3 mt-6 space-y-1">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-3">
                                        Support & More
                                    </h4>
                                    {supportLinks.map((link, idx) => {
                                        const Icon = link.icon;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleNavigation(link.path)}
                                                className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-gray-50 group transition-all"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-colors">
                                                    <Icon size={16} className="text-gray-600" />
                                                </div>
                                                <span className="flex-1 text-left font-medium text-gray-600 text-sm group-hover:text-gray-900 transition-colors">{link.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sidebar Footer */}
                            <div className="p-4 border-t border-gray-100">
                                <button onClick={() => {
                                    localStorage.clear();
                                    handleNavigation('/login');
                                }} className="flex items-center gap-2 text-red-500 font-bold text-xs px-2 hover:opacity-80 transition-opacity">
                                    <LogOut size={16} /> Log Out
                                </button>
                                <p className="text-[10px] font-medium text-gray-400 mt-3 px-2">
                                    HoomZo Web • v1.0.0
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default TopNavbar;
