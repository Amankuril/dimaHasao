/* Ported from Frontend/src/modules/Hotel/app/admin/layouts/AdminLayout.jsx (tools/port.js first pass). */
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
import React, { useState, useEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Outlet, useLocation, useNavigate } from '../../../../lib/webRouter';
import { motion, AnimatePresence } from '../../../../lib/motion';
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  Wallet,
  Settings,
  Bell,
  Search,
  LogOut,
  X,
  DollarSign,
  Star,
  Tag,
  FileText,
  MessageSquare,
  CircleHelp,
  Home,
  LayoutGrid,
  Menu,
} from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import useAdminStore from '../store/adminStore';
import adminService from '../../../services/adminService';
import AdminModuleSwitcher from '../../../../admin/AdminModuleSwitcher';
import { clearModuleAuth } from '../../../../admin/session';
import { HOTEL_BRAND_LOGO, logoFallback } from '../../../../admin/brandLogo';
import { Aside, Button, Div, H1, H2, H3, Header, Img, Input, Main, NavLink, Overlay, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
const HOTEL_ADMIN_BASE = '/hotel/admin';
const MENU_ITEMS = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: `${HOTEL_ADMIN_BASE}/dashboard`,
  },
  {
    icon: Users,
    label: 'User Management',
    path: `${HOTEL_ADMIN_BASE}/users`,
  },
  {
    icon: Building2,
    label: 'Partner Management',
    path: `${HOTEL_ADMIN_BASE}/partners`,
  },
  {
    icon: Home,
    label: 'Property Management',
    path: `${HOTEL_ADMIN_BASE}/properties`,
  },
  {
    icon: LayoutGrid,
    label: 'Categories',
    path: `${HOTEL_ADMIN_BASE}/categories`,
  },
  {
    icon: Calendar,
    label: 'Bookings',
    path: `${HOTEL_ADMIN_BASE}/bookings`,
  },
  {
    icon: Star,
    label: 'Reviews',
    path: `${HOTEL_ADMIN_BASE}/reviews`,
  },
  {
    icon: Bell,
    label: 'Notifications',
    path: `${HOTEL_ADMIN_BASE}/notifications`,
    badgeKey: 'unread',
  },
  {
    icon: Wallet,
    label: 'Finance & Payouts',
    path: `${HOTEL_ADMIN_BASE}/finance`,
  },
  {
    icon: Tag,
    label: 'Offers & Coupons',
    path: `${HOTEL_ADMIN_BASE}/offers`,
  },
  {
    icon: FileText,
    label: 'Legal & Content',
    path: `${HOTEL_ADMIN_BASE}/legal`,
  },
  {
    icon: MessageSquare,
    label: 'Contact Messages',
    path: `${HOTEL_ADMIN_BASE}/contact-messages`,
  },
  {
    icon: CircleHelp,
    label: 'FAQs',
    path: `${HOTEL_ADMIN_BASE}/faqs`,
  },
  {
    icon: Settings,
    label: 'Settings',
    path: `${HOTEL_ADMIN_BASE}/settings`,
  },
];
const AdminLayout = () => {
  const insets = useSafeAreaInsets();
  // At phone width the web's sidebar is the drawer; collapse is a desktop-only control.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isCollapsed = false;
  const [menuQuery, setMenuQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAdminStore((state) => state.logout);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  useEffect(() => {
    loadNotifications();
  }, []);
  // Close the drawer whenever the route changes.
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);
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
    setIsSidebarOpen(false);
    logout();
    clearModuleAuth('admin');
    toast.success('Logged out successfully');
    navigate('/admin/login', {
      replace: true,
    });
  };
  const visibleMenuItems = useMemo(() => {
    const query = menuQuery.trim().toLowerCase();
    if (!query) return MENU_ITEMS;
    return MENU_ITEMS.filter((item) => item.label.toLowerCase().includes(query));
  }, [menuQuery]);
  return (
    <Div className="flex-1 flex-col bg-neutral-200 font-sans text-gray-900">
      {/* Main Content Area */}
      <Div className="flex-1 flex flex-col min-w-0">
        <Header className="bg-white border-b border-gray-200 shadow-sm z-10" style={{ paddingTop: insets.top }}>
          <Div className="h-16 flex flex-row items-center justify-between px-4">
            <Div className="flex flex-row items-center gap-3 flex-1">
              <Button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-lg text-gray-700" accessibilityLabel="Open menu">
                <UiIcon as={Menu} size={22} />
              </Button>
              <H1 className="text-xl font-bold text-gray-800">Hotel Admin</H1>
            </Div>

            <Div className="flex flex-row items-center gap-4">
              <Button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative p-2 rounded-full text-gray-600">
                <UiIcon as={Bell} size={20} />
                {unreadCount > 0 && <Span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></Span>}
              </Button>

              <Div className="h-8 w-8 rounded-full bg-neutral-950 text-white flex items-center justify-center font-bold text-sm">A</Div>
            </Div>
          </Div>
        </Header>

        <Main className="flex-1 px-4 pt-4 bg-gray-50/50">
          <Outlet />
        </Main>
      </Div>

      {/* Notifications dropdown; tapping outside closes it, as the web's mousedown listener does. */}
      {isNotifOpen && (
        <Overlay onClick={() => setIsNotifOpen(false)} onClose={() => setIsNotifOpen(false)} className="bg-transparent">
          <AnimatePresence>
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: 10,
              }}
              className="absolute right-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50"
              style={{ top: insets.top + 60 }}
            >
              <Div onClick={() => {}} className="bg-white">
                <Div className="p-3 border-b flex flex-row justify-between items-center bg-gray-50/50">
                  <H3 className="font-bold text-sm text-gray-800">Notifications</H3>
                  {unreadCount > 0 && <Span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{unreadCount} New</Span>}
                </Div>
                <ScrollDiv className="max-h-64">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 3).map((n) => (
                      <Div key={n._id} className={`p-3 border-b ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
                        <P className="text-sm font-semibold text-gray-800 line-clamp-1">{n.title}</P>
                        <P className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</P>
                        <Span className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</Span>
                      </Div>
                    ))
                  ) : (
                    <Div className="p-8 items-center">
                      <P className="text-center text-gray-400 text-sm">No notifications</P>
                    </Div>
                  )}
                </ScrollDiv>
                <Div className="p-2 border-t bg-gray-50">
                  <Button onClick={handleViewAll} className="w-full items-center py-1">
                    <Span className="text-center text-xs font-bold text-black">View All Notifications</Span>
                  </Button>
                </Div>
              </Div>
            </motion.div>
          </AnimatePresence>
        </Overlay>
      )}

      {/* Sidebar drawer */}
      {isSidebarOpen && (
        <Overlay onClick={() => setIsSidebarOpen(false)} onClose={() => setIsSidebarOpen(false)} className="bg-black/50">
          <Aside
            onClick={() => {}}
            className="absolute left-0 top-0 bottom-0 w-80 max-w-[85%] flex flex-col bg-neutral-950 border-r border-neutral-800/60"
            style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
          >
            <Div className="flex-1 flex-col">
              <Div className="px-3 py-3 border-b border-neutral-800/60 bg-neutral-900">
                <Div className="relative flex flex-row items-center mb-3 min-h-[80px]">
                  <Img src={HOTEL_BRAND_LOGO} onError={logoFallback} alt="Dima Hasao" className="h-20 w-20" contentFit="contain" />
                  <Div pointerEvents="none" className="absolute inset-0 flex flex-col items-center justify-center">
                    <H3 className="text-[15px] font-extrabold leading-tight text-white tracking-tight">Dima Hasao</H3>
                    <Div className="mt-1 flex flex-row items-center gap-1.5">
                      <Div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <Span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Hotel Admin</Span>
                    </Div>
                  </Div>
                  <Button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute right-0 top-0 p-1 text-neutral-400"
                    accessibilityLabel="Close menu"
                  >
                    <UiIcon as={X} className="w-5 h-5 text-neutral-400" />
                  </Button>
                </Div>

                <Div className="mb-3">
                  <H2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider text-left">Admin Panel</H2>
                </Div>

                <AdminModuleSwitcher isCollapsed={isCollapsed} onNavigate={() => setIsSidebarOpen(false)} />

                <Div className="relative justify-center">
                  <UiIcon as={Search} className="absolute left-3 text-neutral-400 w-4 h-4 z-10" />
                  <Input
                    type="text"
                    placeholder="Search Menu..."
                    value={menuQuery}
                    onChange={(event) => setMenuQuery(event.target.value)}
                    className={`w-full pl-9 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder:text-neutral-500 text-left ${menuQuery ? 'pr-9' : 'pr-3'}`}
                  />
                  {menuQuery && (
                    <Button type="button" onClick={() => setMenuQuery('')} className="absolute right-3 z-10" accessibilityLabel="Clear search">
                      <UiIcon as={X} className="w-4 h-4 text-neutral-400" />
                    </Button>
                  )}
                </Div>
              </Div>

              <ScrollDiv className="flex-1 min-h-0 px-3 py-3" contentClassName="gap-1">
                {visibleMenuItems.length === 0 ? (
                  <Div className="px-3 py-12">
                    <P className="text-neutral-300 text-sm font-medium">No menu items found</P>
                    <P className="text-neutral-500 text-sm mt-2">Try a different search term</P>
                  </Div>
                ) : (
                  visibleMenuItems.map((item) => {
                    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex flex-row items-center gap-3 rounded-xl px-4 py-3 ${isActive ? 'bg-white' : ''}`}
                      >
                        <UiIcon as={item.icon} size={20} className={isActive ? 'text-black' : 'text-neutral-500'} />
                        <Span numberOfLines={1} className={`flex-1 text-sm font-medium ${isActive ? 'text-black' : 'text-neutral-400'}`}>
                          {item.label}
                        </Span>
                        {item.badgeKey === 'unread' && unreadCount > 0 && (
                          <Span className="ml-auto min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Span>
                        )}
                      </NavLink>
                    );
                  })
                )}
              </ScrollDiv>

              <Div className="border-t border-neutral-800/60 p-3">
                <Button type="button" onClick={handleLogout} className="w-full flex flex-row items-center gap-3 rounded-xl px-4 py-3">
                  <UiIcon as={LogOut} size={20} className="text-red-400" />
                  <Span className="text-sm font-medium text-red-400">Logout</Span>
                </Button>
              </Div>
            </Div>
          </Aside>
        </Overlay>
      )}
    </Div>
  );
};
export default AdminLayout;
