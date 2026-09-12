import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, User, Building, List,
    CreditCard, History, Shield,
    FileText, HelpCircle, LogOut,
    LayoutDashboard,
    ChevronRight, Wallet, Bell, Settings, Edit3, Info, Phone, Calendar, TrendingUp
} from 'lucide-react';
import usePartnerStore from '../store/partnerStore';

const PartnerSidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { formData } = usePartnerStore();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Disable body scroll when sidebar is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleNavigation = (path) => {
        if (path) {
            navigate(path);
            onClose();
        }
    };

    const handleLogout = () => {
        // Clear everything
        localStorage.clear();
        usePartnerStore.getState().resetForm();
        onClose();
        navigate('/hotel/login');
    };

    const MenuItem = ({ icon: Icon, label, path, badge }) => (
        <button
            onClick={() => handleNavigation(path)}
            className="flex items-center gap-4 w-full p-2.5 hover:bg-gray-50 rounded-xl transition-all group active:scale-95"
        >
            <div className="w-8 h-8 rounded-full bg-[#005CA8]/5 flex items-center justify-center group-hover:bg-[#005CA8]/10 transition-colors">
                <Icon size={16} className="text-[#005CA8]" />
            </div>
            <span className="flex-1 text-left font-medium text-gray-700 text-sm">{label}</span>
            {badge && (
                <span className="text-[10px] font-bold bg-[#005CA8] text-white px-2 py-0.5 rounded-full">
                    {badge}
                </span>
            )}
            <ChevronRight size={14} className="text-gray-300 group-hover:text-[#005CA8] transition-colors" />
        </button>
    );

    const menuGroups = [
        {
            title: 'Overview',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/hotel/partner-dashboard' },
            ]
        },
        {
            title: 'Growth & Finance',
            items: [
                { icon: Wallet, label: 'Wallet', path: '/hotel/wallet' },
                { icon: TrendingUp, label: 'Revenue Report', path: '/hotel/revenue' },
                { icon: History, label: 'Bookings', path: '/hotel/bookings' },
            ]
        },
        {
            title: 'Management',
            items: [
                { icon: Building, label: 'My Properties', path: '/hotel/properties' },
                { icon: Calendar, label: 'Manage Inventory', path: '/hotel/inventory-properties' },
                { icon: List, label: 'Reviews & Ratings', path: '/hotel/reviews' },
                { icon: Bell, label: 'Notifications', path: '/hotel/notifications' },
            ]
        },
        {
            title: 'Support & Legal',
            items: [
                { icon: HelpCircle, label: 'Help & Support', path: '/hotel/support' },
                { icon: FileText, label: 'Terms & Conditions', path: '/hotel/terms' },
                { icon: Shield, label: 'Privacy Policy', path: '/hotel/privacy' },
                { icon: Info, label: 'About Dima Hasao Partner', path: '/hotel/about' },
                { icon: Phone, label: 'Contact Support', path: '/hotel/contact' },
                { icon: Settings, label: 'Settings', path: '/hotel/settings' },
            ]
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'tween', ease: 'circOut', duration: 0.4 }}
                        className="relative flex h-[100dvh] w-[85%] max-w-[300px] flex-col bg-white shadow-2xl z-[2001]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex-1 overflow-y-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <div className="flex items-center justify-between p-5 pb-2">
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-lg font-black tracking-tight flex items-center gap-1">
                                        <span className="text-[#0a4d2b]">Dima</span>
                                        <span className="text-amber-600">Hasao</span>
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-1">Partner</span>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition border border-gray-100">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="px-5 mb-6">
                            <div className="bg-gradient-to-br from-[#005CA8] to-[#003768] rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 backdrop-blur-sm overflow-hidden">
                                            {user.profileImage ? (
                                                <img src={user.profileImage} className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={22} className="text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <h3 className="font-bold text-base leading-tight truncate">
                                                {user.name || formData?.full_name || formData?.owner_name || 'Partner'}
                                            </h3>
                                            <p className="text-[10px] text-white/80 mt-0.5 truncate">
                                                {user.email || formData?.email || 'Manage Account'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleNavigation('/hotel/profile')}
                                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
                                    >
                                        <Edit3 size={14} className="text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-5 space-y-5 pb-32">
                            {menuGroups.map((group, idx) => (
                                <div key={idx}>
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">
                                        {group.title}
                                    </h4>
                                    <div className="flex flex-col gap-1">
                                        {group.items.map((item, idy) => <MenuItem key={idy} {...item} />)}
                                    </div>
                                </div>
                            ))}

                            <div className="pt-2 border-t border-gray-100">
                                <button onClick={handleLogout} className="mt-2 flex items-center gap-2 text-red-500 font-medium text-xs px-2 hover:opacity-80">
                                    <LogOut size={14} /> Log Out
                                </button>
                                <p className="text-[10px] text-gray-400 mt-4 px-2">
                                    Partner App • v1.0.0
                                </p>
                            </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PartnerSidebar;
