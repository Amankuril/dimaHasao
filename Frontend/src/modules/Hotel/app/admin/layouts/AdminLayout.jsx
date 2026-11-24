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
    
} from 'lucide-react';
import toast from 'react-hot-toast';

import useAdminStore from '../store/adminStore';
import adminService from '../../../services/adminService';
import AdminModuleSwitcher from '@/shared/components/admin/AdminModuleSwitcher.jsx';
import AdminSidebarBrand, { RailCollapseButton } from '@/shared/components/admin/AdminSidebarBrand.jsx';
import {
    railClass, railHeaderClass, railNavClass, railFooterClass, navRowClass, navIconClass,
    navCountClass, navDotClass, railSearchInputClass, railSearchIconClass, railSearchClearClass,
    railLogoutClass, railEmptyState, RAIL_SCROLLBAR_CSS, topBarClass, topBarTitleClass,
} from '@/shared/components/admin/adminShell.js';
import { clearModuleAuth } from '@/shared/utils/moduleAuth';
import { HOTEL_BRAND_LOGO } from '@/shared/constants/brandLogo';

const HOTEL_ADMIN_BASE = '/hotel/admin';

const MENU_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', path: `${HOTEL_ADMIN_BASE}/dashboard` },
    { icon: Users, label: 'User management', path: `${HOTEL_ADMIN_BASE}/users` },
    { icon: Building2, label: 'Partner management', path: `${HOTEL_ADMIN_BASE}/partners` },
    { icon: Home, label: 'Property management', path: `${HOTEL_ADMIN_BASE}/properties` },
    { icon: LayoutGrid, label: 'Categories', path: `${HOTEL_ADMIN_BASE}/categories` },
    { icon: Calendar, label: 'Bookings', path: `${HOTEL_ADMIN_BASE}/bookings` },
    { icon: Star, label: 'Reviews', path: `${HOTEL_ADMIN_BASE}/reviews` },
    { icon: Bell, label: 'Notifications', path: `${HOTEL_ADMIN_BASE}/notifications`, badgeKey: 'unread' },
    { icon: Wallet, label: 'Finance & payouts', path: `${HOTEL_ADMIN_BASE}/finance` },
    { icon: Tag, label: 'Offers & coupons', path: `${HOTEL_ADMIN_BASE}/offers` },
    { icon: FileText, label: 'Legal & content', path: `${HOTEL_ADMIN_BASE}/legal` },
    { icon: MessageSquare, label: 'Contact messages', path: `${HOTEL_ADMIN_BASE}/contact-messages` },
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
        toast.success('Logged out');
        navigate('/admin/login', { replace: true });
    };

    const visibleMenuItems = useMemo(() => {
        const query = menuQuery.trim().toLowerCase();
        if (!query) return MENU_ITEMS;
        return MENU_ITEMS.filter((item) => item.label.toLowerCase().includes(query));
    }, [menuQuery]);

    return (
        <div className="flex h-screen overflow-hidden bg-neutral-50 font-sans text-neutral-900">
            <style>{RAIL_SCROLLBAR_CSS}</style>

            <aside className={railClass(isCollapsed)}>
                <div className="flex h-full flex-col">
                    <div className={railHeaderClass}>
                        <AdminSidebarBrand moduleLabel="Hotel admin" isCollapsed={isCollapsed} logoSrc={HOTEL_BRAND_LOGO}>
                            <RailCollapseButton isCollapsed={isCollapsed} onClick={() => setIsCollapsed((current) => !current)} />
                        </AdminSidebarBrand>

                        <AdminModuleSwitcher isCollapsed={isCollapsed} />

                        {!isCollapsed && (
                            <div className="relative">
                                <Search className={railSearchIconClass} strokeWidth={1.5} />
                                <input
                                    type="text"
                                    placeholder="Search menu"
                                    aria-label="Search menu"
                                    value={menuQuery}
                                    onChange={(event) => setMenuQuery(event.target.value)}
                                    className={railSearchInputClass(Boolean(menuQuery))}
                                />
                                {menuQuery && (
                                    <button type="button" onClick={() => setMenuQuery('')} className={railSearchClearClass} aria-label="Clear search">
                                        <X size={14} strokeWidth={1.5} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <nav className={`${railNavClass} space-y-0.5`}>
                        {visibleMenuItems.length === 0 ? (
                            <div className="px-3 py-8">
                                <p className="text-sm text-neutral-300">{railEmptyState.title}</p>
                                <p className="mt-1 text-xs text-neutral-500">{railEmptyState.hint}</p>
                            </div>
                        ) : (
                            visibleMenuItems.map((item) => {
                                const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        title={isCollapsed ? item.label : undefined}
                                        className={navRowClass(isActive, isCollapsed)}
                                    >
                                        <item.icon strokeWidth={1.5} className={navIconClass(isActive)} />
                                        {!isCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                                        {item.badgeKey === 'unread' && unreadCount > 0 && !isCollapsed && (
                                            <span className={navCountClass}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                                        )}
                                        {item.badgeKey === 'unread' && unreadCount > 0 && isCollapsed && <span className={navDotClass} />}
                                    </NavLink>
                                );
                            })
                        )}
                    </nav>

                    <div className={railFooterClass}>
                        <button type="button" onClick={handleLogout} className={railLogoutClass(isCollapsed)}>
                            <LogOut size={16} strokeWidth={1.5} className="shrink-0" />
                            {!isCollapsed && <span>Log out</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <header className={topBarClass}>
                    <div className="flex items-center gap-4 flex-1">
                        <h1 className={topBarTitleClass}>Hotel admin</h1>
                    </div>

                    <div className="flex items-center gap-3" ref={notifRef}>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                aria-label="Notifications"
                                className="relative flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 outline-none transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-[#0a4d2b]/30"
                            >
                                <Bell size={18} strokeWidth={1.5} />
                                {unreadCount > 0 && (
                                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                                )}
                            </button>

                            <AnimatePresence>
                                {isNotifOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                        className="absolute right-0 z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-xl border border-neutral-900/[0.08] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                                    >
                                        <div className="flex h-11 items-center justify-between border-b border-neutral-900/[0.06] px-4">
                                            <h3 className="text-sm font-medium text-neutral-900">Notifications</h3>
                                            {unreadCount > 0 && <span className="text-xs tabular-nums text-neutral-500">{unreadCount} unread</span>}
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {notifications.length > 0 ? (
                                                notifications.slice(0, 3).map((n) => (
                                                    <div key={n._id} className="flex gap-3 border-b border-neutral-900/[0.06] px-4 py-3 last:border-0">
                                                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${!n.isRead ? 'bg-[#0a4d2b]' : 'bg-transparent'}`} />
                                                        <div className="min-w-0">
                                                            <p className="line-clamp-1 text-sm font-medium text-neutral-900">{n.title}</p>
                                                            <p className="mt-0.5 line-clamp-2 text-[13px] text-neutral-500">{n.body}</p>
                                                            <span className="mt-1 block text-xs tabular-nums text-neutral-400">{new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-8 text-center text-sm text-neutral-500">No notifications</div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleViewAll}
                                            className="flex h-10 w-full items-center justify-center border-t border-neutral-900/[0.06] text-[13px] font-medium text-[#0a4d2b] transition-colors hover:bg-neutral-50"
                                        >
                                            View all notifications
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-[13px] font-medium text-neutral-600">
                            A
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto px-4 pt-6 pb-16 md:px-8 relative scroll-smooth bg-neutral-50">
                    <div className="max-w-[1600px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
