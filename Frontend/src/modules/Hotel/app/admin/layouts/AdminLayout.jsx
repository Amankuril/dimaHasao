/**
 * Hotel admin shell.
 *
 * Reskinned to match the Food and Taxi admin sidebars — same dark neutral-950
 * rail, same "Admin Panel" heading, same menu search, same collapse affordance
 * — so switching modules no longer drops you into a different-looking panel.
 * The module tab strip comes from shared/ rather than a third local copy.
 *
 * Every in-app link here points at /hotel/admin/*. The module was ported from a
 * standalone app whose admin lived at /admin/*, and those bare paths now belong
 * to Food, which is why hotel menu clicks used to land in the Food panel.
 * Note the API paths in services/ are also /admin/* — those are server routes
 * and must stay exactly as they are.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Users, Building2, Calendar, Wallet,
    Settings, Bell, Search, LogOut, X, DollarSign, Star, Tag, FileText,
    MessageSquare, CircleHelp, Home, LayoutGrid,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

import useAdminStore from '../store/adminStore';
import adminService from '../../../services/adminService';
import AdminModuleSwitcher from '@/shared/components/admin/AdminModuleSwitcher.jsx';
import { clearModuleAuth } from '@/shared/utils/moduleAuth';
import { HOTEL_BRAND_LOGO, logoFallback } from '@/shared/constants/brandLogo';

const HOTEL_ADMIN_BASE = '/hotel/admin';

const MENU_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', path: `${HOTEL_ADMIN_BASE}/dashboard` },
    { icon: Users, label: 'User Management', path: `${HOTEL_ADMIN_BASE}/users` },
    { icon: Building2, label: 'Partner Management', path: `${HOTEL_ADMIN_BASE}/partners` },
    { icon: Home, label: 'Property Management', path: `${HOTEL_ADMIN_BASE}/properties` },
    { icon: LayoutGrid, label: 'Categories', path: `${HOTEL_ADMIN_BASE}/categories` },
    { icon: Calendar, label: 'Bookings', path: `${HOTEL_ADMIN_BASE}/bookings` },
    { icon: Star, label: 'Reviews', path: `${HOTEL_ADMIN_BASE}/reviews` },
    { icon: Bell, label: 'Notifications', path: `${HOTEL_ADMIN_BASE}/notifications`, badgeKey: 'unread' },
    { icon: Wallet, label: 'Finance & Payouts', path: `${HOTEL_ADMIN_BASE}/finance` },
    { icon: Tag, label: 'Offers & Coupons', path: `${HOTEL_ADMIN_BASE}/offers` },
    { icon: FileText, label: 'Legal & Content', path: `${HOTEL_ADMIN_BASE}/legal` },
    { icon: MessageSquare, label: 'Contact Messages', path: `${HOTEL_ADMIN_BASE}/contact-messages` },
    { icon: CircleHelp, label: 'FAQs', path: `${HOTEL_ADMIN_BASE}/faqs` },
    { icon: Settings, label: 'Settings', path: `${HOTEL_ADMIN_BASE}/settings` },
];

const AdminLayout = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [menuQuery, setMenuQuery] = useState('');
    const location = useLocation();
    const navigate = useNavigate();
    const logout = useAdminStore(state => state.logout);

    // Notifications
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const notifRef = useRef(null);

    useEffect(() => {
        loadNotifications();
        function handleClickOutside(event) {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await adminService.getNotifications(1, 5);
            if (data.success) {
                setNotifications(data.notifications);
                setUnreadCount(data.meta.unreadCount);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleViewAll = async () => {
        setIsNotifOpen(false);
        try {
            await adminService.markAllNotificationsRead();
            setUnreadCount(0);
        } catch (err) {
            // Navigate regardless — the list page marks them read too.
        }
        navigate(`${HOTEL_ADMIN_BASE}/notifications`);
    };

    const handleLogout = () => {
        // Hotel admin rides the platform admin session, so clearing only the
        // module's own token would leave the user still signed in everywhere else.
        logout();
        clearModuleAuth('admin');
        toast.success('Logged out successfully');
        navigate('/admin/login', { replace: true });
    };

    const visibleMenuItems = useMemo(() => {
        const query = menuQuery.trim().toLowerCase();
        if (!query) return MENU_ITEMS;
        return MENU_ITEMS.filter((item) => item.label.toLowerCase().includes(query));
    }, [menuQuery]);

    return (
        <div className="flex h-screen overflow-hidden bg-neutral-200 font-sans text-gray-900">
            <style>{`
                .admin-sidebar-scroll::-webkit-scrollbar { width: 2px; }
                .admin-sidebar-scroll::-webkit-scrollbar-track { background: rgba(17, 24, 39, 0.4); }
                .admin-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
                .admin-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.35); }
                .admin-sidebar-scroll:hover::-webkit-scrollbar { width: 6px; }
                .admin-sidebar-scroll { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.25) rgba(17, 24, 39, 0.4); }
            `}</style>

            <aside
                className={`relative z-50 flex h-screen flex-col overflow-hidden transition-all duration-500 bg-neutral-950 border-r border-neutral-800/60 ${isCollapsed ? 'w-20' : 'w-80'}`}
            >
                <div className="flex h-full flex-col">
                    <div className="shrink-0 px-3 py-3 border-b border-neutral-800/60 bg-neutral-900">
                        <div className="relative flex items-center mb-3 min-h-[80px]">
                            <img
                                src={HOTEL_BRAND_LOGO}
                                onError={logoFallback}
                                alt="Dima Hasao"
                                className={isCollapsed ? 'h-14 w-14 object-contain' : 'h-20 w-20 object-contain'}
                            />
                            {!isCollapsed && (
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                    <h3 className="text-[15px] font-extrabold leading-tight text-white tracking-tight">
                                        Dima Hasao
                                    </h3>
                                    <div className="mt-1 flex items-center gap-1.5">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                            Hotel Admin
                                        </span>
                                    </div>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsCollapsed((current) => !current)}
                                className="absolute -right-3 top-1/2 z-[60] hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-300 shadow-lg ring-4 ring-neutral-950 transition-all hover:bg-white hover:text-black hover:scale-110 active:scale-90 lg:flex"
                                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            >
                                {isCollapsed ? <ChevronRight size={12} strokeWidth={3.5} /> : <ChevronLeft size={12} strokeWidth={3.5} />}
                            </button>
                        </div>

                        {!isCollapsed && (
                            <div className="mb-3">
                                <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider text-left">
                                    Admin Panel
                                </h2>
                            </div>
                        )}

                        <AdminModuleSwitcher isCollapsed={isCollapsed} />

                        {!isCollapsed && (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4 z-10" />
                                <input
                                    type="text"
                                    placeholder="Search Menu..."
                                    value={menuQuery}
                                    onChange={(event) => setMenuQuery(event.target.value)}
                                    className={`w-full pl-9 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all duration-200 text-left ${menuQuery ? 'pr-9' : 'pr-3'}`}
                                />
                                {menuQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setMenuQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-all z-10"
                                        aria-label="Clear search"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <nav className="admin-sidebar-scroll flex-1 min-h-0 space-y-1 overflow-y-auto overscroll-y-contain px-3 py-3 scroll-smooth">
                        {visibleMenuItems.length === 0 ? (
                            <div className="px-3 py-12 text-left">
                                <p className="text-neutral-300 text-sm font-medium">No menu items found</p>
                                <p className="text-neutral-500 text-sm mt-2">Try a different search term</p>
                            </div>
                        ) : (
                            visibleMenuItems.map((item) => {
                                const isActive =
                                    location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        title={isCollapsed ? item.label : undefined}
                                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all group relative ${isActive
                                            ? 'bg-white text-black shadow-[0_4px_12px_rgba(255,255,255,0.15)]'
                                            : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                                            } ${isCollapsed ? 'justify-center' : ''}`}
                                    >
                                        <item.icon size={20} className={`shrink-0 ${isActive ? 'text-black' : 'text-neutral-500 group-hover:text-white'}`} />
                                        {!isCollapsed && <span className="whitespace-nowrap flex-1 truncate">{item.label}</span>}
                                        {item.badgeKey === 'unread' && unreadCount > 0 && !isCollapsed && (
                                            <span className="ml-auto min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </NavLink>
                                );
                            })
                        )}
                    </nav>

                    <div className="shrink-0 border-t border-neutral-800/60 p-3">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 ${isCollapsed ? 'justify-center' : ''}`}
                        >
                            <LogOut size={20} className="shrink-0" />
                            {!isCollapsed && <span>Logout</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <h1 className="text-xl font-bold text-gray-800">Hotel Admin</h1>
                    </div>

                    <div className="flex items-center gap-4" ref={notifRef}>
                        <div className="relative">
                            <button
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                                )}
                            </button>

                            <AnimatePresence>
                                {isNotifOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 origin-top-right"
                                    >
                                        <div className="p-3 border-b flex justify-between items-center bg-gray-50/50">
                                            <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
                                            {unreadCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{unreadCount} New</span>}
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {notifications.length > 0 ? (
                                                notifications.slice(0, 3).map((n) => (
                                                    <div key={n._id} className={`p-3 border-b hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
                                                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{n.title}</p>
                                                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>
                                                        <span className="text-[10px] text-gray-400 mt-1 block">{new Date(n.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-gray-400 text-sm">No notifications</div>
                                            )}
                                        </div>
                                        <div className="p-2 border-t bg-gray-50">
                                            <button
                                                onClick={handleViewAll}
                                                className="w-full text-center text-xs font-bold text-black hover:underline py-1"
                                            >
                                                View All Notifications
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-8 w-8 rounded-full bg-neutral-950 text-white flex items-center justify-center font-bold text-sm">
                            A
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 relative scroll-smooth bg-gray-50/50">
                    <div className="max-w-[1600px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
