/**
 * Tours & Festivals admin shell.
 *
 * Both are run by the district itself rather than by any vendor, so they are
 * administered from one section rather than tours here and festivals over in
 * the Global panel.
 *
 * Same dark rail as the Food, Taxi and Hotel admin panels, and it renders the
 * shared AdminModuleSwitcher — without which entering this section was a
 * one-way trip with no way back to the other modules.
 */
import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Package, Calendar, Settings, Ticket,
    Search, LogOut, X, PlusCircle, Star, MapPin, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

import AdminModuleSwitcher from '@/shared/components/admin/AdminModuleSwitcher.jsx';
import AdminSidebarBrand, { RailCollapseButton } from '@/shared/components/admin/AdminSidebarBrand.jsx';
import {
    railClass, railHeaderClass, railNavClass, railFooterClass, navRowClass, navIconClass,
    navCountClass, navDotClass, railSearchInputClass, railSearchIconClass, railSearchClearClass,
    railLogoutClass, railEmptyState, RAIL_SCROLLBAR_CSS, topBarClass, topBarTitleClass,
} from '@/shared/components/admin/adminShell.js';
import { clearModuleAuth } from '@/shared/utils/moduleAuth';

const BASE = '/tours/admin';

const MENU_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', path: `${BASE}/dashboard` },
    { icon: Package, label: 'Packages', path: `${BASE}/packages` },
    { icon: PlusCircle, label: 'Create package', path: `${BASE}/packages/new` },
    { icon: Calendar, label: 'Bookings', path: `${BASE}/bookings` },
    { icon: Ticket, label: 'Festivals', path: `${BASE}/festivals` },
    { icon: Star, label: 'Reviews', path: `${BASE}/reviews` },
    { icon: MapPin, label: 'Tourist places', path: `${BASE}/destinations` },
    { icon: Tag, label: 'Offers', path: `${BASE}/offers` },
    { icon: Settings, label: 'Settings', path: `${BASE}/settings` },
];

const AdminLayout = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [menuQuery, setMenuQuery] = useState('');
    const location = useLocation();
    const navigate = useNavigate();

    const visibleMenuItems = useMemo(() => {
        const query = menuQuery.trim().toLowerCase();
        if (!query) return MENU_ITEMS;
        return MENU_ITEMS.filter((item) => item.label.toLowerCase().includes(query));
    }, [menuQuery]);

    /**
     * The longest matching path wins, so /packages/new highlights only
     * "Create Package" and not "Packages" as well.
     */
    const activePath = useMemo(() => {
        const matches = MENU_ITEMS
            .filter((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))
            .sort((a, b) => b.path.length - a.path.length);
        return matches[0]?.path || null;
    }, [location.pathname]);

    const handleLogout = () => {
        clearModuleAuth('admin');
        toast.success('Logged out');
        navigate('/admin/login', { replace: true });
    };

    return (
        <div className="flex h-screen overflow-hidden bg-neutral-50 font-sans text-neutral-900">
            <style>{RAIL_SCROLLBAR_CSS}</style>

            <aside className={railClass(isCollapsed)}>
                <div className="flex h-full flex-col">
                    <div className={railHeaderClass}>
                        <AdminSidebarBrand moduleLabel="Tours & festivals admin" isCollapsed={isCollapsed}>
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
                                const isActive = activePath === item.path;
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        title={isCollapsed ? item.label : undefined}
                                        className={navRowClass(isActive, isCollapsed)}
                                    >
                                        <item.icon strokeWidth={1.5} className={navIconClass(isActive)} />
                                        {!isCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
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

            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <header className={topBarClass}>
                    <h1 className={topBarTitleClass}>Tours &amp; festivals</h1>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-[13px] font-medium text-neutral-600">
                        A
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto px-4 pt-6 pb-16 md:px-8 bg-neutral-50">
                    <div className="max-w-[1600px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
