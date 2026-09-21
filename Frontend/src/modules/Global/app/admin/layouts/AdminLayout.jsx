/**
 * Global admin shell.
 *
 * The things that are not a module: who the administrators are, and the
 * settings that belong to the platform rather than to food, taxi, hotel or
 * tours. Everything here operates on one shared entity, which is the test for
 * whether something belongs in this section — a commission rate that legitimately
 * differs per module does not.
 */
import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LifeBuoy, BarChart3, UserCog, ScrollText, Search, LogOut, X, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

import AdminModuleSwitcher from '@/shared/components/admin/AdminModuleSwitcher.jsx';
import { clearModuleAuth } from '@/shared/utils/moduleAuth';
import { DEFAULT_BRAND_LOGO } from '@/shared/constants/brandLogo';

const BASE = '/global/admin';

const MENU_ITEMS = [
    { icon: UserCog, label: 'My Profile', path: `${BASE}/profile` },
    { icon: ShieldCheck, label: 'Administrators', path: `${BASE}/administrators` },
    { icon: ScrollText, label: 'Legal & Policies', path: `${BASE}/legal` },
    { icon: LifeBuoy, label: 'Support', path: `${BASE}/support` },
    { icon: BarChart3, label: 'Reports', path: `${BASE}/reports` },
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
        toast.success('Logged out successfully');
        navigate('/admin/login', { replace: true });
    };

    return (
        <div className="flex h-screen overflow-hidden bg-neutral-200 font-sans text-gray-900">
            <style>{`
                .admin-sidebar-scroll::-webkit-scrollbar { width: 2px; }
                .admin-sidebar-scroll::-webkit-scrollbar-track { background: rgba(17, 24, 39, 0.4); }
                .admin-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
                .admin-sidebar-scroll:hover::-webkit-scrollbar { width: 6px; }
                .admin-sidebar-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.25) rgba(17,24,39,0.4); }
            `}</style>

            <aside
                className={`relative z-50 flex h-screen flex-col overflow-hidden transition-all duration-500 bg-neutral-950 border-r border-neutral-800/60 ${isCollapsed ? 'w-20' : 'w-80'}`}
            >
                <div className="flex h-full flex-col">
                    <div className="shrink-0 px-3 py-3 border-b border-neutral-800/60 bg-neutral-900">
                        <div className="relative flex items-center mb-3 min-h-[80px]">
                            <img
                                src={DEFAULT_BRAND_LOGO}
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
                                            Global Admin
                                        </span>
                                    </div>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsCollapsed((v) => !v)}
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
                                    onChange={(e) => setMenuQuery(e.target.value)}
                                    className={`w-full pl-9 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all ${menuQuery ? 'pr-9' : 'pr-3'}`}
                                />
                                {menuQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setMenuQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white z-10"
                                        aria-label="Clear search"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <nav className="admin-sidebar-scroll flex-1 min-h-0 space-y-1 overflow-y-auto px-3 py-3">
                        {visibleMenuItems.length === 0 ? (
                            <div className="px-3 py-12 text-left">
                                <p className="text-neutral-300 text-sm font-medium">No menu items found</p>
                            </div>
                        ) : (
                            visibleMenuItems.map((item) => {
                                const isActive = activePath === item.path;
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        title={isCollapsed ? item.label : undefined}
                                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all group ${isActive
                                            ? 'bg-white text-black shadow-[0_4px_12px_rgba(255,255,255,0.15)]'
                                            : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                                            } ${isCollapsed ? 'justify-center' : ''}`}
                                    >
                                        <item.icon size={20} className={`shrink-0 ${isActive ? 'text-black' : 'text-neutral-500 group-hover:text-white'}`} />
                                        {!isCollapsed && <span className="whitespace-nowrap flex-1 truncate">{item.label}</span>}
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

            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
                    <h1 className="text-xl font-bold text-gray-800">Global Settings</h1>
                    <div className="h-8 w-8 rounded-full bg-neutral-950 text-white flex items-center justify-center font-bold text-sm">
                        A
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 bg-gray-50/50">
                    <div className="max-w-[1600px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
