/* Ported from Frontend/src/modules/Taxi/modules/admin/components/AdminLayout.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Outlet, useLocation, useNavigate } from '../../../../lib/webRouter';
import AdminModuleSwitcher from '../../../../admin/AdminModuleSwitcher';
import { useAuth } from '../../../../context/AuthContext';
import { FontFamily } from '../../../../components/Text';
import { socketService } from '../../../shared/api/socket';
import { SettingsProvider, useSettings } from '../../../shared/context/SettingsContext';
import { getSupportConversations, markSupportMessagesRead } from '../../shared/chat/chatApi';
import { adminService } from '../services/adminService';
import { hasAdminPermission } from '../constants/adminAccess';
import { clearUnifiedAdminSession, getUnifiedAdminProfile, syncAdminSessionBridge } from '../../../../admin/session';
import { toast } from '../../../../lib/notify';
import {
  Ban,
  Bell,
  Car,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Home,
  IndianRupee,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  Settings,
  Settings2,
  Share2,
  ShieldCheck,
  Smartphone,
  Trash2,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react-native';
import { cn as clsx } from '../../../../lib/tw';
import { DEFAULT_BRAND_LOGO } from '../../../../admin/brandLogo';
import { Aside, Button, Div, H2, H3, Header, Img, Input, Main, Overlay, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
import { alert, window } from '../../../../lib/webShim';
function cn(...inputs) {
  return clsx(inputs);
}
/** react-router's <SideLink end className={({ isActive }) => …}>: the active state from the current path. */
const SideLink = ({ to, end, className, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = end ? location.pathname === to : pathMatches(location.pathname, to);
  return (
    <Button type="button" onClick={() => navigate(to)} className={typeof className === 'function' ? className({ isActive }) : className}>
      {children}
    </Button>
  );
};
const SIDEBAR_EXPANSION_STORAGE_KEY = 'adminSidebarExpandedGroups';
const NOTIFICATION_DISMISS_STORAGE_KEY = 'adminNotificationDismissals';
const pathMatches = (pathname, targetPath) => pathname === targetPath || pathname.startsWith(`${targetPath}/`);
const hasActiveChild = (pathname, items = []) =>
  items.some((item) => {
    if (item.path && pathMatches(pathname, item.path)) return true;
    if (item.subItems) return hasActiveChild(pathname, item.subItems);
    return false;
  });
const flattenItems = (sections = []) => sections.flatMap((section) => section.items ?? []);
const flattenSearchEntries = (items = [], parentLabels = []) =>
  items.flatMap((item) => {
    const currentTrail = [...parentLabels, item.label].filter(Boolean);
    if (item.path) {
      return [
        {
          label: item.label,
          path: item.path,
          trail: parentLabels,
          keywords: currentTrail.join(' ').toLowerCase(),
        },
      ];
    }
    if (item.subItems) {
      return flattenSearchEntries(item.subItems, currentTrail);
    }
    return [];
  });
const filterSidebarItemsBySearch = (items = [], query = '') => {
  if (!query) return items;
  return items.flatMap((item) => {
    const labelMatch = String(item.label || '')
      .toLowerCase()
      .includes(query);
    if (item.subItems) {
      const filteredChildren = filterSidebarItemsBySearch(item.subItems, query);
      if (labelMatch) return [item];
      if (filteredChildren.length > 0)
        return [
          {
            ...item,
            subItems: filteredChildren,
          },
        ];
      return [];
    }
    return labelMatch ? [item] : [];
  });
};
const readAdminProfile = () => {
  if (typeof window === 'undefined') {
    return {
      admin_type: 'superadmin',
      permissions: ['*'],
      name: 'Admin',
    };
  }
  try {
    const parsed = getUnifiedAdminProfile();
    return (
      parsed || {
        admin_type: 'superadmin',
        permissions: ['*'],
        name: 'Admin',
      }
    );
  } catch {
    return {
      admin_type: 'superadmin',
      permissions: ['*'],
      name: 'Admin',
    };
  }
};
const filterSidebarItemsByAccess = (items = [], adminProfile = {}) =>
  items.flatMap((item) => {
    const selfAllowed = !item.permission || hasAdminPermission(adminProfile, item.permission);
    if (item.subItems) {
      const filteredSubItems = filterSidebarItemsByAccess(item.subItems, adminProfile);
      if (!selfAllowed && filteredSubItems.length === 0) {
        return [];
      }
      if (filteredSubItems.length === 0) {
        return [];
      }
      return [
        {
          ...item,
          subItems: filteredSubItems,
        },
      ];
    }
    return selfAllowed ? [item] : [];
  });
const filterSidebarSectionsByAccess = (sections = [], adminProfile = {}) =>
  sections
    .map((section) => ({
      ...section,
      items: filterSidebarItemsByAccess(section.items || [], adminProfile),
    }))
    .filter((section) => section.items.length > 0);
const NOTIFICATION_PAGE_SIZE = 5;
const readDismissedNotifications = () => {
  if (typeof window === 'undefined') {
    return {
      ride_requests: [],
      bookings: [],
      chats: [],
    };
  }
  try {
    const saved = window.localStorage.getItem(NOTIFICATION_DISMISS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      ride_requests: Array.isArray(parsed?.ride_requests) ? parsed.ride_requests : [],
      bookings: Array.isArray(parsed?.bookings) ? parsed.bookings : [],
      chats: Array.isArray(parsed?.chats) ? parsed.chats : [],
    };
  } catch {
    return {
      ride_requests: [],
      bookings: [],
      chats: [],
    };
  }
};
const getNotificationEntryId = (tab, item = {}) => {
  if (tab === 'ride_requests') {
    return String(item.id || item.requestId || '').trim();
  }
  if (tab === 'bookings') {
    return String(item._id || item.id || item.booking_reference || '').trim();
  }
  return String(item.id || '').trim();
};
const dedupeAdminChatNotifications = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.id || '').trim();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};
const formatRelativeAdminTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return 'Just now';
  }
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString();
};
const looksLikeCoordinateLabel = (value = '') => /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(String(value || '').trim());
const formatAdminNotificationLocation = (value, fallback) => {
  const text = String(value || '').trim();
  if (!text || looksLikeCoordinateLabel(text)) {
    return fallback;
  }
  return text;
};
const resolvePageTitle = (pathname, sections, appName) => {
  const findLabel = (items = []) => {
    for (const item of items) {
      if (item.path && pathMatches(pathname, item.path)) return item.label;
      if (item.subItems) {
        const nested = findLabel(item.subItems);
        if (nested) return nested;
      }
    }
    return null;
  };
  const label = findLabel(flattenItems(sections));
  if (label) return label;
  if (pathname.includes('/settings')) return 'Settings';
  if (pathname.includes('/reports')) return 'Reports';
  return `${appName || 'App'} Admin`;
};
const normalizeHexColor = (value, fallback = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return fallback;
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  const shortHexMatch = withHash.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHexMatch) {
    const [r, g, b] = shortHexMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^#([0-9a-fA-F]{6})$/.test(withHash)) {
    return withHash.toUpperCase();
  }
  return fallback;
};
const getSidebarItemCount = (item, unreadCountsByPath = {}) => {
  if (item?.path) {
    return Math.max(0, Number(unreadCountsByPath[item.path] || 0));
  }
  if (Array.isArray(item?.subItems)) {
    return item.subItems.reduce((sum, child) => sum + getSidebarItemCount(child, unreadCountsByPath), 0);
  }
  return 0;
};
const SidebarBadge = ({ count, isActive = false }) => {
  if (count <= 0) {
    return null;
  }
  return (
    <Span
      className={`ml-auto inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-orange-500 text-white'}`}
    >
      {count > 99 ? '99+' : count}
    </Span>
  );
};
const SidebarItem = ({ icon, label, path, isCollapsed, unreadCount = 0 }) => (
  <SideLink
    to={path}
    end
    className={({ isActive }) =>
      cn(
        'group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 relative',
        isActive
          ? 'bg-white/10 text-white border border-white/15'
          : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5',
      )
    }
  >
    <UiIcon as={icon} size={18} />
    {!isCollapsed && <Span className="min-w-0 flex-1 text-[14px] font-bold tracking-tight">{label}</Span>}
    {!isCollapsed && <SidebarBadge count={unreadCount} />}
  </SideLink>
);
const SidebarGroup = ({
  icon,
  label,
  subItems,
  isCollapsed,
  pathname,
  forceOpen = false,
  groupKey,
  expandedGroups,
  setExpandedGroups,
  sidebarTextColor,
  unreadCountsByPath,
}) => {
  const isActive = hasActiveChild(pathname, subItems);
  const isOpen = expandedGroups.includes(groupKey);
  const isExpanded = forceOpen || isOpen;
  const unreadCount = subItems.reduce((sum, item) => sum + getSidebarItemCount(item, unreadCountsByPath), 0);
  const toggleGroup = () => {
    setExpandedGroups((current) => (current.includes(groupKey) ? current.filter((key) => key !== groupKey) : [...current, groupKey]));
  };
  return (
    <Div className="space-y-1">
      <Button
        type="button"
        onClick={toggleGroup}
        className={cn(
          'group w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300',
          isActive || isExpanded
            ? 'bg-white/10 text-white border border-white/15'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5',
        )}
      >
        <Div className="flex min-w-0 items-center gap-3">
          <UiIcon as={icon} size={18} />
          {!isCollapsed && <Span className="flex-1 truncate text-[14px] font-bold tracking-tight">{label}</Span>}
        </Div>
        {!isCollapsed && (
          <Div className="ml-3 flex items-center gap-2">
            <SidebarBadge count={unreadCount} isActive={isActive || isExpanded} />
            <UiIcon as={ChevronRight} size={14} style={isExpanded ? { transform: [{ rotate: '90deg' }] } : undefined} />
          </Div>
        )}
      </Button>

      {!isCollapsed && isExpanded && (
        <Div className="pl-6 pr-2 space-y-1">
          {subItems.map((item) =>
            item.subItems ? (
              <NestedGroup
                key={item.label}
                label={item.label}
                subItems={item.subItems}
                pathname={pathname}
                forceOpen={forceOpen}
                groupKey={`${groupKey}:${item.label}`}
                expandedGroups={expandedGroups}
                setExpandedGroups={setExpandedGroups}
                sidebarTextColor={sidebarTextColor}
                unreadCountsByPath={unreadCountsByPath}
              />
            ) : (
              <SideLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive: childActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-300',
                    childActive ? 'bg-white/5 text-white' : 'text-neutral-500 hover:text-neutral-200 hover:bg-white/5',
                  )
                }
              >
                <Div className={cn('h-1 w-1 shrink-0 rounded-full bg-neutral-600')} />
                <Span className="min-w-0 flex-1">{item.label}</Span>
                <SidebarBadge count={getSidebarItemCount(item, unreadCountsByPath)} />
              </SideLink>
            ),
          )}
        </Div>
      )}
    </Div>
  );
};
const NestedGroup = ({ label, subItems, pathname, forceOpen = false, groupKey, expandedGroups, setExpandedGroups, sidebarTextColor, unreadCountsByPath }) => {
  const isActive = hasActiveChild(pathname, subItems);
  const isOpen = expandedGroups.includes(groupKey);
  const isExpanded = forceOpen || isOpen;
  const unreadCount = subItems.reduce((sum, item) => sum + getSidebarItemCount(item, unreadCountsByPath), 0);
  const toggleGroup = () => {
    setExpandedGroups((current) => (current.includes(groupKey) ? current.filter((key) => key !== groupKey) : [...current, groupKey]));
  };
  return (
    <Div className="space-y-1">
      <Button
        type="button"
        onClick={toggleGroup}
        className={cn(
          'group w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition-all duration-300',
          isActive || isExpanded
            ? 'bg-white/10 text-white border border-white/15'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5',
        )}
      >
        <Div className="flex flex-1 min-w-0 items-center gap-3">
          <Div className={cn('h-1 w-1 shrink-0 rounded-full', isActive || isExpanded ? 'bg-white' : 'bg-neutral-600')} />
          <Span className="flex-1 truncate text-[12px] font-medium">{label}</Span>
        </Div>
        <Div className="ml-3 flex items-center gap-2">
          <SidebarBadge count={unreadCount} isActive={isActive || isExpanded} />
          <UiIcon as={ChevronRight} size={12} style={isExpanded ? { transform: [{ rotate: '90deg' }] } : undefined} />
        </Div>
      </Button>

      {isExpanded && (
        <Div className="pl-4 space-y-1">
          {subItems.map((item) => (
            <SideLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive: childActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all duration-300',
                  childActive ? 'bg-white/5 text-white' : 'text-neutral-500 hover:text-neutral-200 hover:bg-white/5',
                )
              }
            >
              <Div className="h-0.5 w-0.5 shrink-0 rounded-full bg-neutral-700" />
              <Span className="min-w-0 flex-1">{item.label}</Span>
              <SidebarBadge count={getSidebarItemCount(item, unreadCountsByPath)} />
            </SideLink>
          ))}
        </Div>
      )}
    </Div>
  );
};
const AdminLayoutShell = () => {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const sidebarTextColor = normalizeHexColor(settings.customization?.sidebar_text_color, '#CBD5E1');
  // At phone width the sidebar is a drawer behind the navbar's menu button; collapse is a desktop-only control.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isCollapsed = false;
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState('ride_requests');
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [rideRequestFeed, setRideRequestFeed] = useState({
    results: [],
    paginator: {
      current_page: 1,
      last_page: 1,
      total: 0,
    },
  });
  const [bookingsFeed, setBookingsFeed] = useState([]);
  const [chatNotifications, setChatNotifications] = useState([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [rideRequestPage, setRideRequestPage] = useState(1);
  const [bookingPage, setBookingPage] = useState(1);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState(() => readDismissedNotifications());
  const [expandedSidebarGroups, setExpandedSidebarGroups] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const saved = localStorage.getItem(SIDEBAR_EXPANSION_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [adminProfile, setAdminProfile] = useState(() => readAdminProfile());
  const appName = settings.general?.app_name || 'App';
  useEffect(() => {
    const syncAdminProfile = () => setAdminProfile(readAdminProfile());
    window.addEventListener('storage', syncAdminProfile);
    syncAdminProfile();
    return () => window.removeEventListener('storage', syncAdminProfile);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(NOTIFICATION_DISMISS_STORAGE_KEY, JSON.stringify(dismissedNotifications));
  }, [dismissedNotifications]);
  const dismissedRideRequestSet = useMemo(
    () => new Set((dismissedNotifications.ride_requests || []).map((item) => String(item).trim()).filter(Boolean)),
    [dismissedNotifications],
  );
  const dismissedBookingSet = useMemo(
    () => new Set((dismissedNotifications.bookings || []).map((item) => String(item).trim()).filter(Boolean)),
    [dismissedNotifications],
  );
  const dismissedChatSet = useMemo(
    () => new Set((dismissedNotifications.chats || []).map((item) => String(item).trim()).filter(Boolean)),
    [dismissedNotifications],
  );
  const visibleRideRequestResults = useMemo(
    () => rideRequestFeed.results.filter((item) => !dismissedRideRequestSet.has(getNotificationEntryId('ride_requests', item))),
    [dismissedRideRequestSet, rideRequestFeed.results],
  );
  const visibleBookingsFeed = useMemo(
    () => bookingsFeed.filter((item) => !dismissedBookingSet.has(getNotificationEntryId('bookings', item))),
    [bookingsFeed, dismissedBookingSet],
  );
  const visibleChatNotifications = useMemo(
    () => chatNotifications.filter((item) => !dismissedChatSet.has(getNotificationEntryId('chats', item))),
    [chatNotifications, dismissedChatSet],
  );
  const dismissNotification = (tab, item) => {
    const id = getNotificationEntryId(tab, item);
    if (!id) return;
    setDismissedNotifications((current) => {
      const existingItems = Array.isArray(current?.[tab]) ? current[tab] : [];
      if (existingItems.includes(id)) {
        return current;
      }
      return {
        ...current,
        [tab]: [id, ...existingItems].slice(0, 500),
      };
    });
  };
  const dismissCurrentNotifications = () => {
    if (notificationTab === 'ride_requests') {
      visibleRideRequestResults.forEach((item) => dismissNotification('ride_requests', item));
      return;
    }
    if (notificationTab === 'bookings') {
      visibleBookingsFeed.forEach((item) => dismissNotification('bookings', item));
      return;
    }
    visibleChatNotifications.forEach((item) => dismissNotification('chats', item));
  };
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem(SIDEBAR_EXPANSION_STORAGE_KEY, JSON.stringify(expandedSidebarGroups));
  }, [expandedSidebarGroups]);
  const adminSections = useMemo(
    () => [
      {
        title: 'Home',
        items: [
          {
            icon: UserCog,
            label: 'Admin Management',
            subItems: [
              {
                label: 'Admins',
                path: '/taxi/admin/management/admins',
                permission: 'subadmins.manage',
              },
            ],
          },
          {
            icon: Home,
            label: 'Dashboard',
            path: '/taxi/admin/dashboard',
            permission: 'dashboard.view',
          },
          {
            icon: IndianRupee,
            label: 'Admin Earnings',
            path: '/taxi/admin/earnings',
            permission: 'earnings.view',
          },
          {
            icon: MessageCircle,
            label: 'Chat',
            path: '/taxi/admin/chat',
            permission: 'chat.view',
          },
          {
            icon: TrendingUp,
            label: 'Promotions Management',
            subItems: [
              {
                label: 'Promo Code',
                path: '/taxi/admin/promotions/promo-codes',
                permission: 'promotions.view',
              },
              {
                label: 'Push Notifications',
                path: '/taxi/admin/promotions/send-notification',
                permission: 'promotions.view',
              },
              //{ label: 'Banner Image', path: '/taxi/admin/promotions/banner-image', permission: 'promotions.view' },
            ],
          },
          {
            icon: IndianRupee,
            label: 'Price Management',
            subItems: [
              {
                label: 'Service Location',
                path: '/taxi/admin/pricing/service-location',
                permission: 'service_locations.view',
              },
              {
                label: 'Zone',
                path: '/taxi/admin/pricing/zone',
                permission: 'zones.view',
              },
              {
                label: 'Airport',
                path: '/taxi/admin/pricing/airport',
                permission: 'airports.view',
              },
              {
                label: 'App Modules',
                path: '/taxi/admin/pricing/app-modules',
                permission: 'settings.view',
              },
              {
                label: 'Vehicle Type',
                path: '/taxi/admin/pricing/vehicle-type',
                permission: 'vehicle_types.view',
              },
              {
                label: 'Rental Package Types',
                path: '/taxi/admin/pricing/rental-packages',
                permission: 'rental.view',
              },
              {
                label: 'Package Pricing',
                path: '/taxi/admin/pricing/package-pricing',
                permission: 'rental.view',
              },
              {
                label: 'Set Price',
                path: '/taxi/admin/pricing/set-price',
                permission: 'set_prices.view',
              },
            ],
          },
          {
            icon: MapPin,
            label: 'Geofencing',
            subItems: [
              {
                label: 'Heat Map',
                path: '/taxi/admin/geo/heatmap',
                permission: 'geofencing.view',
              },
              {
                label: "God's Eye",
                path: '/taxi/admin/geo/gods-eye',
                permission: 'geofencing.view',
              },
              {
                label: 'Peak Zone',
                path: '/taxi/admin/geo/peak-zone',
                permission: 'geofencing.view',
              },
            ],
          },
          {
            icon: Car,
            label: 'Trip Requests',
            path: '/taxi/admin/trips',
            permission: 'trips.view',
          },
          {
            icon: Ban,
            label: 'Cancellation Analytics',
            path: '/taxi/admin/cancellation-analytics',
            permission: 'dashboard.view',
          },
          {
            icon: Clock,
            label: 'Ongoing Requests',
            path: '/taxi/admin/ongoing',
            permission: 'ongoing.view',
          },
        ],
      },
      {
        title: 'Users',
        items: [
          {
            icon: Users,
            label: 'Customer Management',
            subItems: [
              {
                label: 'User List',
                path: '/taxi/admin/users',
                permission: 'users.view',
              },
              {
                label: 'Delete Request Users',
                path: '/taxi/admin/users/delete-requests',
                permission: 'users.view',
              },
              {
                label: 'User Bulk Upload',
                path: '/taxi/admin/users/bulk-upload',
                permission: 'users.view',
              },
            ],
          },
          {
            icon: Wallet,
            label: 'Wallet Payment',
            path: '/taxi/admin/wallet/payment',
            permission: 'wallet.view',
          },
          {
            icon: Car,
            label: 'Driver Management',
            subItems: [
              {
                label: 'Pending Drivers',
                path: '/taxi/admin/drivers/pending',
                permission: 'drivers.view',
              },
              {
                label: 'Approved Drivers',
                path: '/taxi/admin/drivers',
                permission: 'drivers.view',
              },
              {
                label: 'Active Drivers',
                path: '/taxi/admin/drivers/active',
                permission: 'drivers.view',
              },
              {
                label: 'Drivers Ratings',
                path: '/taxi/admin/drivers/ratings',
                permission: 'drivers.view',
              },
              {
                label: 'Driver Wallet',
                subItems: [
                  {
                    label: 'Withdrawal Requests',
                    path: '/taxi/admin/drivers/wallet/withdrawals',
                    permission: 'wallet.view',
                  },
                  {
                    label: 'Negative Balance Drivers',
                    path: '/taxi/admin/drivers/wallet/negative',
                    permission: 'wallet.view',
                  },
                ],
              },
              {
                label: 'Delete Request Drivers',
                path: '/taxi/admin/drivers/delete-requests',
                permission: 'drivers.view',
              },
              {
                label: 'Driver Needed Documents',
                path: '/taxi/admin/drivers/documents',
                permission: 'drivers.view',
              },
              {
                label: 'Driver Bulk Upload',
                path: '/taxi/admin/drivers/bulk-upload',
                permission: 'drivers.view',
              },
              {
                label: 'Payment Methods',
                path: '/taxi/admin/drivers/payment-methods',
                permission: 'wallet.view',
              },
            ],
          },
          {
            icon: Share2,
            label: 'Referral Management',
            subItems: [
              {
                label: 'Referral Dashboard',
                path: '/taxi/admin/referrals/dashboard',
                permission: 'referrals.view',
              },
              {
                label: 'User Referral Settings',
                path: '/taxi/admin/referrals/user-settings',
                permission: 'referrals.view',
              },
              {
                label: 'Driver Referral Settings',
                path: '/taxi/admin/referrals/driver-settings',
                permission: 'referrals.view',
              },
            ],
          },
          {
            icon: FileText,
            label: 'Report',
            subItems: [
              {
                label: 'User Report',
                path: '/taxi/admin/reports/user',
                permission: 'reports.view',
              },
              {
                label: 'Driver Report',
                path: '/taxi/admin/reports/driver',
                permission: 'reports.view',
              },
              {
                label: 'Driver Duty Report',
                path: '/taxi/admin/reports/driver-duty',
                permission: 'reports.view',
              },
              {
                label: 'Finance Report',
                path: '/taxi/admin/reports/finance',
                permission: 'reports.view',
              },
            ],
          },
          {
            icon: ShieldCheck,
            label: 'Support Management',
            subItems: [
              {
                label: 'Ticket Title',
                path: '/taxi/admin/support/ticket-title',
                permission: 'support.view',
              },
              {
                label: 'Support Tickets',
                path: '/taxi/admin/support/tickets',
                permission: 'support.view',
              },
            ],
          },
        ],
      },
      {
        title: 'Settings',
        items: [
          {
            icon: Settings,
            label: 'Business Settings',
            permission: 'settings.view',
            subItems: [
              {
                label: 'General Settings',
                path: '/taxi/admin/settings/business/general',
                permission: 'settings.view',
              },
              {
                label: 'Transport Ride Settings',
                path: '/taxi/admin/settings/business/transport-ride',
                permission: 'settings.view',
              },
            ],
          },
          {
            icon: Smartphone,
            label: 'App Settings',
            permission: 'settings.view',
            subItems: [
              {
                label: 'Wallet Settings',
                path: '/taxi/admin/settings/app/wallet',
                permission: 'settings.view',
              },
              {
                label: 'Tip Settings',
                path: '/taxi/admin/settings/app/tip',
                permission: 'settings.view',
              },
              {
                label: 'Mobile App Landing/Onboard Screens Settings',
                path: '/taxi/admin/settings/app/onboard',
                permission: 'settings.view',
              },
            ],
          },
          {
            icon: Settings2,
            label: 'Third-party Settings',
            permission: 'settings.view',
            subItems: [
              {
                label: 'Payment Gateway Settings',
                path: '/taxi/admin/settings/third-party/payment',
                permission: 'settings.view',
              },
              {
                label: 'SMS Gateway Settings',
                path: '/taxi/admin/settings/third-party/sms',
                permission: 'settings.view',
              },
              {
                label: 'Firebase Settings',
                path: '/taxi/admin/settings/third-party/firebase',
                permission: 'settings.view',
              },
              {
                label: 'Map and Map APIs Settings',
                path: '/taxi/admin/settings/third-party/map-apis',
                permission: 'settings.view',
              },
              {
                label: 'Mail Configuration',
                path: '/taxi/admin/settings/third-party/mail',
                permission: 'settings.view',
              },
              // { label: 'Notification Channel', path: '/taxi/admin/settings/third-party/notification-channel' },
            ],
          },
          // {
          //   icon: PlusCircle,
          //   label: 'Addons',
          //   subItems: [{ label: 'Dispatcher Addons', path: '/taxi/admin/settings/addons/dispatcher' }],
          // },
        ],
      },
    ],
    [],
  );
  const isAdminChatRoute = pathMatches(location.pathname, '/taxi/admin/chat');
  const sidebarSections = useMemo(() => filterSidebarSectionsByAccess(adminSections, adminProfile), [adminProfile, adminSections]);
  const unreadCountsByPath = useMemo(
    () => ({
      '/taxi/admin/chat': chatUnreadCount,
    }),
    [chatUnreadCount],
  );
  useEffect(() => {
    const activeKeys = [];
    const traverse = (items, parentKey) => {
      items.forEach((item) => {
        if (item.subItems) {
          const currentKey = parentKey ? `${parentKey}:${item.label}` : item.label;
          if (hasActiveChild(location.pathname, item.subItems)) {
            activeKeys.push(currentKey);
          }
          traverse(item.subItems, currentKey);
        }
      });
    };
    sidebarSections.forEach((section) => {
      traverse(section.items, section.title);
    });
    if (activeKeys.length > 0) {
      setExpandedSidebarGroups((current) => {
        const next = [...current];
        let changed = false;
        activeKeys.forEach((key) => {
          if (!next.includes(key)) {
            next.push(key);
            changed = true;
          }
        });
        return changed ? next : current;
      });
    }
  }, [location.pathname, sidebarSections]);
  const visibleSidebarSections = useMemo(() => {
    const query = sidebarSearchQuery.toLowerCase().trim();
    if (!query) return sidebarSections;
    return sidebarSections
      .map((section) => ({
        ...section,
        items: filterSidebarItemsBySearch(section.items || [], query),
      }))
      .filter((section) => section.items.length > 0);
  }, [sidebarSearchQuery, sidebarSections]);
  const pageTitle = resolvePageTitle(location.pathname, sidebarSections, appName);
  const searchEntries = useMemo(() => flattenSearchEntries(flattenItems(sidebarSections)), [sidebarSections]);
  const filteredSearchEntries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return searchEntries.slice(0, 10);
    }
    return searchEntries.filter((entry) => entry.keywords.includes(query) || entry.path.toLowerCase().includes(query)).slice(0, 14);
  }, [searchEntries, searchTerm]);
  const pagedBookings = useMemo(() => {
    const total = visibleBookingsFeed.length;
    const lastPage = Math.max(1, Math.ceil(total / NOTIFICATION_PAGE_SIZE));
    const currentPage = Math.min(bookingPage, lastPage);
    const start = (currentPage - 1) * NOTIFICATION_PAGE_SIZE;
    return {
      results: visibleBookingsFeed.slice(start, start + NOTIFICATION_PAGE_SIZE),
      paginator: {
        current_page: currentPage,
        last_page: lastPage,
        total,
      },
    };
  }, [bookingPage, visibleBookingsFeed]);
  const activeNotificationMeta =
    notificationTab === 'ride_requests'
      ? rideRequestFeed.paginator
      : notificationTab === 'bookings'
        ? pagedBookings.paginator
        : {
            current_page: 1,
            last_page: 1,
            total: chatNotifications.length,
          };
  const totalNotificationItems =
    Math.max(0, Number(rideRequestFeed?.paginator?.total || 0) - dismissedRideRequestSet.size) + visibleBookingsFeed.length + visibleChatNotifications.length;
  const currentNotificationCount =
    notificationTab === 'ride_requests'
      ? visibleRideRequestResults.length
      : notificationTab === 'bookings'
        ? pagedBookings.results.length
        : visibleChatNotifications.length;
  useEffect(() => {
    setIsSearchOpen(false);
    setSearchTerm('');
    setIsNotificationsOpen(false);
    setIsUserMenuOpen(false);
    setIsSidebarOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const { token } = syncAdminSessionBridge();
    if (!token) {
      setChatUnreadCount(0);
      return undefined;
    }
    let active = true;
    const syncUnreadChats = async () => {
      try {
        const response = await getSupportConversations(token);
        const conversations = response?.data?.conversations || [];
        const unreadTotal = conversations.reduce((sum, conversation) => sum + Math.max(0, Number(conversation?.unreadCount || 0)), 0);
        if (!active) {
          return;
        }
        if (isAdminChatRoute) {
          const unreadConversationKeys = conversations
            .filter((conversation) => Number(conversation?.unreadCount || 0) > 0)
            .map((conversation) => conversation.conversationKey)
            .filter(Boolean);
          if (unreadConversationKeys.length > 0) {
            await Promise.all(unreadConversationKeys.map((conversationKey) => markSupportMessagesRead(conversationKey, token)));
          }
          if (!active) {
            return;
          }
          setChatNotifications([]);
          setChatUnreadCount(0);
          return;
        }
        setChatUnreadCount(unreadTotal);
      } catch (error) {
        if (!active) {
          return;
        }
        console.error('Failed to sync admin chat unread count:', error);
      }
    };
    syncUnreadChats();
    return () => {
      active = false;
    };
  }, [isAdminChatRoute]);
  useEffect(() => {
    if (!isNotificationsOpen) return undefined;
    let isMounted = true;
    const fetchNotifications = async () => {
      setNotificationsLoading(true);
      try {
        if (notificationTab === 'ride_requests') {
          const response = await adminService.getRideRequests({
            page: rideRequestPage,
            limit: NOTIFICATION_PAGE_SIZE,
            tab: 'all',
            search: '',
          });
          if (!isMounted) return;
          setRideRequestFeed({
            results: response?.data?.results || response?.results || [],
            paginator: response?.data?.paginator ||
              response?.paginator || {
                current_page: 1,
                last_page: 1,
                total: 0,
              },
          });
          return;
        }
        if (notificationTab === 'chats') {
          return;
        }

        // The "Bookings" feed came from the fleet-owner module, which this
        // district does not run. Nothing else populates it.
        if (!isMounted) return;
        setBookingsFeed([]);
      } catch (error) {
        console.error('Failed to load admin notifications:', error);
        if (!isMounted) return;
        if (notificationTab === 'ride_requests') {
          setRideRequestFeed({
            results: [],
            paginator: {
              current_page: 1,
              last_page: 1,
              total: 0,
            },
          });
        } else if (notificationTab === 'bookings') {
          setBookingsFeed([]);
        }
      } finally {
        if (isMounted) {
          setNotificationsLoading(false);
        }
      }
    };
    fetchNotifications();
    return () => {
      isMounted = false;
    };
  }, [bookingPage, isNotificationsOpen, notificationTab, rideRequestPage]);
  useEffect(() => {
    const { token } = syncAdminSessionBridge();
    if (!token && !window.location.pathname.includes('/admin/login')) {
      navigate('/admin/login');
      return undefined;
    }
    if (!token) return undefined;
    socketService.connect({
      role: 'admin',
      token,
    });
    socketService.on('new_sos', (data) => {
      console.log('SOS ALERT RECEIVED:', data);
      alert(`SOS ALERT: Driver ${data.driver_name} is in trouble!`);
    });
    socketService.on('new_driver_registration', (data) => {
      console.log('New driver registration:', data);
    });
    const handleSupportChatNotification = (payload = {}) => {
      const senderRole = String(payload.senderRole || payload.sender?.role || '').toLowerCase();
      const receiverRole = String(payload.receiverRole || payload.receiver?.role || '').toLowerCase();
      const messageBody = String(payload.message || payload.body || '').trim();
      if (!messageBody || senderRole === 'admin' || receiverRole !== 'admin') {
        return;
      }
      if (isAdminChatRoute) {
        if (payload.conversationKey) {
          markSupportMessagesRead(payload.conversationKey, token).catch((error) => {
            console.error('Failed to mark live admin chat message as read:', error);
          });
        }
        setChatNotifications([]);
        setChatUnreadCount(0);
        return;
      }
      const senderName = String(payload.sender?.name || '').trim() || (senderRole === 'driver' ? 'Driver' : senderRole === 'user' ? 'User' : 'Support contact');
      const nextItem = {
        id: `support-chat:${payload.id || payload._id || payload.conversationKey || `${Date.now()}-${messageBody}`}`,
        title: `${senderName} sent a new chat`,
        body: messageBody,
        senderRole: senderRole || 'user',
        createdAt: payload.createdAt || new Date().toISOString(),
      };
      let wasAdded = false;
      setChatNotifications((current) => {
        const next = dedupeAdminChatNotifications([nextItem, ...current]).slice(0, 25);
        wasAdded = next.some((item) => item.id === nextItem.id) && !current.some((item) => item.id === nextItem.id);
        return next;
      });
      if (wasAdded) {
        setChatUnreadCount((current) => current + 1);
        toast(nextItem.body, {
          duration: 4500,
          className: 'font-bold text-[13px] rounded-2xl shadow-xl border border-sky-50 bg-white',
        });
      }
    };
    socketService.on('chat:message', handleSupportChatNotification);
    return () => {
      socketService.off('new_sos');
      socketService.off('new_driver_registration');
      socketService.off('chat:message', handleSupportChatNotification);
    };
  }, [isAdminChatRoute, navigate]);
  const handleLogout = async () => {
    socketService.disconnect();
    setIsUserMenuOpen(false);
    await logout();
    clearUnifiedAdminSession();
    navigate('/admin/login', {
      replace: true,
    });
  };  const notificationTabClass = (tab) => `flex-1 rounded-xl px-3 py-2 text-xs font-bold items-center ${notificationTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`;
  const renderDismissButton = (tab, item) => (
    <Button
      type="button"
      onClick={() => dismissNotification(tab, item)}
      className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400"
      accessibilityLabel="Delete notification"
    >
      <UiIcon as={Trash2} size={14} />
    </Button>
  );
  return (
    <FontFamily family="Inter">
      <Div className="flex-1 flex-col bg-neutral-100 font-sans text-gray-900">
        <Header className="z-40 border-b border-neutral-200 bg-white shadow-sm" style={{ paddingTop: insets.top }}>
          <Div className="flex h-16 flex-row items-center justify-between px-4">
            <Div className="flex flex-1 min-w-0 flex-row items-center gap-3">
              <Button type="button" onClick={() => setIsSidebarOpen(true)} className="-ml-2 rounded-lg p-2 text-neutral-700" accessibilityLabel="Open menu">
                <UiIcon as={Menu} size={22} />
              </Button>
              <Div className="h-6 w-1 rounded-full bg-amber-600" />
              <H2 className="flex-1 truncate text-[15px] font-bold tracking-tight text-neutral-800">{pageTitle}</H2>
            </Div>

            <Div className="flex flex-row items-center gap-1">
              <Button type="button" onClick={() => setIsSearchOpen((current) => !current)} className="rounded-lg p-2 text-neutral-400">
                <UiIcon as={Search} size={18} />
              </Button>
              <Button type="button" onClick={() => setIsNotificationsOpen((current) => !current)} className="relative rounded-lg p-2 text-neutral-400">
                <UiIcon as={Bell} size={18} />
                {totalNotificationItems > 0 ? <Div className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500" /> : null}
              </Button>
              <Button
                type="button"
                className="ml-1 flex flex-row items-center gap-1 rounded-full border border-gray-100 bg-gray-50 p-1"
                onClick={() => setIsUserMenuOpen((current) => !current)}
              >
                <Div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                  <UiIcon as={Users} size={14} />
                </Div>
                <UiIcon as={ChevronDown} size={14} className="text-gray-300" />
              </Button>
            </Div>
          </Div>
        </Header>

        <Main className="flex-1 bg-neutral-100 px-4 pt-4">
          <Outlet />
        </Main>

        {/* User menu: name, role and logout. Tapping outside closes it, as the web's mousedown listener does. */}
        {isUserMenuOpen && (
          <Overlay className="bg-transparent" onClick={() => setIsUserMenuOpen(false)} onClose={() => setIsUserMenuOpen(false)}>
            <Div
              onClick={() => {}}
              className="absolute right-3 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl"
              style={{ top: insets.top + 60 }}
            >
              <Div className="px-4 py-2 border-b border-gray-100 mb-1">
                <Span className="text-[11px] font-black text-gray-950">{adminProfile?.name || 'Admin'}</Span>
                <Span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {adminProfile?.admin_type === 'subadmin' ? adminProfile?.role || 'Subadmin' : 'Superadmin'}
                </Span>
              </Div>
              <Button type="button" onClick={handleLogout} className="flex w-full flex-row items-center gap-3 rounded-xl px-4 py-3 text-red-600">
                <UiIcon as={LogOut} size={16} />
                <Span className="text-[12px] font-bold">Logout Session</Span>
              </Button>
            </Div>
          </Overlay>
        )}

        {/* Notifications dropdown */}
        {isNotificationsOpen && (
          <Overlay className="bg-transparent" onClick={() => setIsNotificationsOpen(false)} onClose={() => setIsNotificationsOpen(false)}>
            <Div
              onClick={() => {}}
              className="absolute left-2 right-2 overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-2xl"
              style={{ top: insets.top + 60 }}
            >
              <Div className="border-b border-slate-100 px-4 py-4">
                <Div className="flex flex-row items-center justify-between gap-3">
                  <Div className="flex-1">
                    <P className="text-sm font-extrabold text-slate-900">Notifications</P>
                    <P className="mt-1 text-[11px] font-semibold text-slate-500">Latest bookings, ride requests, and support chats</P>
                  </Div>
                  <Div className="flex flex-row items-center gap-2">
                    {currentNotificationCount > 0 ? (
                      <Button
                        type="button"
                        onClick={dismissCurrentNotifications}
                        className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500"
                      >
                        Clear
                      </Button>
                    ) : null}
                    <Span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">{totalNotificationItems}</Span>
                  </Div>
                </Div>

                <Div className="mt-4 flex flex-row gap-2 rounded-2xl bg-slate-50 p-1">
                  <Button
                    type="button"
                    onClick={() => {
                      setNotificationTab('ride_requests');
                      setRideRequestPage(1);
                    }}
                    className={notificationTabClass('ride_requests')}
                  >
                    Ride Requests
                  </Button>
                  <Button type="button" onClick={() => setNotificationTab('chats')} className={notificationTabClass('chats')}>
                    Chats
                  </Button>
                </Div>
              </Div>

              <ScrollDiv className="max-h-[420px] p-3">
                {notificationsLoading ? (
                  <Div className="flex items-center justify-center px-4 py-12">
                    <Span className="text-sm font-semibold text-slate-500">Loading notifications...</Span>
                  </Div>
                ) : notificationTab === 'ride_requests' ? (
                  visibleRideRequestResults.length === 0 ? (
                    <Div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 items-center">
                      <P className="text-sm font-bold text-slate-900 text-center">No ride requests found</P>
                      <P className="mt-1 text-xs font-semibold text-slate-500 text-center">New ride requests will show up here.</P>
                    </Div>
                  ) : (
                    <Div className="space-y-2">
                      {visibleRideRequestResults.map((item) => (
                        <Button
                          key={item.id || item.requestId}
                          type="button"
                          onClick={() => {
                            navigate('/taxi/admin/trips');
                            setIsNotificationsOpen(false);
                          }}
                          className="relative w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 items-stretch"
                        >
                          <Div className="flex flex-row items-start justify-between gap-3 pr-8">
                            <Div className="flex-1 min-w-0">
                              <P className="truncate text-sm font-bold text-slate-900">
                                {item.requestId} · {item.userName}
                              </P>
                              <P className="mt-1 truncate text-xs font-semibold text-slate-500">
                                Pickup: {formatAdminNotificationLocation(item.pickupLabel, 'Pickup location set')}
                              </P>
                            </Div>
                            <Span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                              {item.tripStatus || 'Upcoming'}
                            </Span>
                          </Div>
                          <Div className="mt-2 flex flex-row items-center justify-between gap-3">
                            <Span className="flex-1 text-[11px] font-semibold text-slate-400" numberOfLines={1}>
                              Destination: {formatAdminNotificationLocation(item.dropLabel, 'Destination set')}
                            </Span>
                            <Span className="text-[11px] font-semibold text-slate-400">{formatRelativeAdminTime(item.date)}</Span>
                          </Div>
                          {renderDismissButton('ride_requests', item)}
                        </Button>
                      ))}
                    </Div>
                  )
                ) : visibleChatNotifications.length === 0 ? (
                  <Div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 items-center">
                    <P className="text-sm font-bold text-slate-900 text-center">No new chats found</P>
                    <P className="mt-1 text-xs font-semibold text-slate-500 text-center">New user and driver support messages will show up here.</P>
                  </Div>
                ) : (
                  <Div className="space-y-2">
                    {visibleChatNotifications.map((item) => (
                      <Button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          navigate('/taxi/admin/chat');
                          setChatNotifications([]);
                          setIsNotificationsOpen(false);
                        }}
                        className="relative w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 items-stretch"
                      >
                        <Div className="flex flex-row items-start justify-between gap-3 pr-8">
                          <Div className="flex-1 min-w-0">
                            <P className="truncate text-sm font-bold text-slate-900">{item.title}</P>
                            <P className="mt-1 truncate text-xs font-semibold text-slate-500">{item.body}</P>
                          </Div>
                          <Span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">{item.senderRole}</Span>
                        </Div>
                        <Div className="mt-2 flex flex-row items-center justify-end">
                          <Span className="text-[11px] font-semibold text-slate-400">{formatRelativeAdminTime(item.createdAt)}</Span>
                        </Div>
                        {renderDismissButton('chats', item)}
                      </Button>
                    ))}
                  </Div>
                )}
              </ScrollDiv>

              <Div className="flex flex-row items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                <Button
                  type="button"
                  disabled={(activeNotificationMeta?.current_page || 1) <= 1}
                  onClick={() => {
                    if (notificationTab === 'ride_requests') {
                      setRideRequestPage((current) => Math.max(1, current - 1));
                    } else {
                      setBookingPage((current) => Math.max(1, current - 1));
                    }
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40"
                >
                  Previous
                </Button>
                <Span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Page {activeNotificationMeta?.current_page || 1} of {activeNotificationMeta?.last_page || 1}
                </Span>
                <Button
                  type="button"
                  disabled={(activeNotificationMeta?.current_page || 1) >= (activeNotificationMeta?.last_page || 1)}
                  onClick={() => {
                    if (notificationTab === 'ride_requests') {
                      setRideRequestPage((current) => current + 1);
                    } else {
                      setBookingPage((current) => current + 1);
                    }
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40"
                >
                  Next
                </Button>
              </Div>
            </Div>
          </Overlay>
        )}

        {/* Sidebar search (the navbar's search button) */}
        {isSearchOpen && (
          <Overlay className="bg-slate-900/10" onClick={() => setIsSearchOpen(false)} onClose={() => setIsSearchOpen(false)}>
            <Div className="w-full px-4" style={{ marginTop: insets.top + 80 }}>
              <Div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl" onClick={() => {}}>
                <Div className="border-b border-slate-100 px-5 py-4">
                  <Div className="flex flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-1">
                    <UiIcon as={Search} size={18} className="text-neutral-400" />
                    <Input
                      autoFocus
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search sidebar options..."
                      className="flex-1 bg-transparent py-2 text-sm font-semibold text-slate-900"
                    />
                    <Button type="button" onClick={() => setIsSearchOpen(false)} className="rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Close
                    </Button>
                  </Div>
                </Div>

                <ScrollDiv className="max-h-[420px] p-3">
                  {filteredSearchEntries.length === 0 ? (
                    <Div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-8 items-center">
                      <P className="text-sm font-bold text-slate-900 text-center">No sidebar option found</P>
                      <P className="mt-1 text-xs font-semibold text-slate-500 text-center">Try searching for drivers, trips, pricing, reports, or settings.</P>
                    </Div>
                  ) : (
                    <Div className="space-y-2">
                      {filteredSearchEntries.map((entry) => (
                        <Button
                          key={entry.path}
                          type="button"
                          onClick={() => {
                            navigate(entry.path);
                            setIsSearchOpen(false);
                            setSearchTerm('');
                          }}
                          className="flex w-full flex-row items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3"
                        >
                          <Div className="flex-1 min-w-0">
                            <P className="truncate text-sm font-bold text-slate-900">{entry.label}</P>
                            <P className="mt-1 truncate text-[11px] font-semibold text-slate-500">{[...entry.trail, entry.path].join(' • ')}</P>
                          </Div>
                          <UiIcon as={ChevronRight} size={16} className="text-slate-300" />
                        </Button>
                      ))}
                    </Div>
                  )}
                </ScrollDiv>
              </Div>
            </Div>
          </Overlay>
        )}

        {/* Sidebar drawer */}
        {isSidebarOpen && (
          <Overlay className="bg-black/50" onClick={() => setIsSidebarOpen(false)} onClose={() => setIsSidebarOpen(false)}>
            <FontFamily family="Inter">
              <Aside
                onClick={() => {}}
                className="absolute left-0 top-0 bottom-0 w-80 max-w-[85%] flex flex-col bg-neutral-950 border-r border-neutral-800/60"
                style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
              >
                <Div className="px-3 py-3 border-b border-neutral-800/60 bg-neutral-900">
                  <Div className="relative flex flex-row items-center mb-3 min-h-[80px]">
                    <Img src={DEFAULT_BRAND_LOGO} alt="Dima Hasao" className="h-20 w-20" contentFit="contain" />
                    <Div pointerEvents="none" className="absolute inset-0 flex flex-col items-center justify-center">
                      <H3 className="text-[15px] font-extrabold leading-tight text-white tracking-tight">Dima Hasao</H3>
                      <Div className="mt-1 flex flex-row items-center gap-1.5">
                        <Div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <Span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Taxi Admin</Span>
                      </Div>
                    </Div>
                    <Button type="button" onClick={() => setIsSidebarOpen(false)} className="absolute right-0 top-0 p-1 text-neutral-400" accessibilityLabel="Close menu">
                      <UiIcon as={X} className="w-5 h-5 text-neutral-400" />
                    </Button>
                  </Div>

                  <Div className="mb-3">
                    <H2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider text-left">Admin Panel</H2>
                  </Div>

                  {/* Taxi kept its own copy of this strip: it had no Global tab, its
                    Food/Taxi tabs were hardcoded active/inactive regardless of the
                    route, Hotel and Tours only rendered when Food or Taxi was
                    visible, and its gating dropped the legacy "no adminLevel"
                    fallback, so an older admin account saw no tabs at all. */}
                  <AdminModuleSwitcher isCollapsed={isCollapsed} onNavigate={() => setIsSidebarOpen(false)} />

                  <Div className="relative justify-center">
                    <UiIcon as={Search} className="absolute left-3 text-neutral-400 w-4 h-4 z-10" />
                    <Input
                      type="text"
                      placeholder="Search Menu..."
                      value={sidebarSearchQuery}
                      onChange={(event) => setSidebarSearchQuery(event.target.value)}
                      placeholderTextColor="#737373"
                      className={cn('w-full pl-9 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white text-left', sidebarSearchQuery ? 'pr-9' : 'pr-3')}
                    />
                    {sidebarSearchQuery ? (
                      <Button type="button" onClick={() => setSidebarSearchQuery('')} className="absolute right-3 text-neutral-400 z-10" accessibilityLabel="Clear search">
                        <UiIcon as={X} className="w-4 h-4" />
                      </Button>
                    ) : null}
                  </Div>
                </Div>

                <ScrollDiv className="flex-1 space-y-8 px-3 py-3">
                  {visibleSidebarSections.length === 0 && sidebarSearchQuery.trim() ? (
                    <Div className="px-3 py-12">
                      <P className="text-neutral-300 text-sm font-medium">No menu items found</P>
                      <P className="text-neutral-500 text-sm mt-2">Try a different search term</P>
                    </Div>
                  ) : (
                    visibleSidebarSections.map((section) => (
                      <Div key={section.title} className="space-y-1">
                        <Div className="px-4 mb-4 flex flex-row items-center gap-2">
                          <Div className="h-3 w-1 rounded-full bg-white" />
                          <Span className="text-[12px] font-black uppercase tracking-widest text-white/90">{section.title}</Span>
                        </Div>
                        {section.items.map((item) =>
                          item.subItems ? (
                            <SidebarGroup
                              key={item.label}
                              {...item}
                              forceOpen={Boolean(sidebarSearchQuery.trim())}
                              isCollapsed={isCollapsed}
                              pathname={location.pathname}
                              groupKey={`${section.title}:${item.label}`}
                              expandedGroups={expandedSidebarGroups}
                              setExpandedGroups={setExpandedSidebarGroups}
                              sidebarTextColor={sidebarTextColor}
                              unreadCountsByPath={unreadCountsByPath}
                            />
                          ) : (
                            <SidebarItem key={item.path} {...item} isCollapsed={isCollapsed} unreadCount={getSidebarItemCount(item, unreadCountsByPath)} />
                          ),
                        )}
                      </Div>
                    ))
                  )}
                </ScrollDiv>
              </Aside>
            </FontFamily>
          </Overlay>
        )}
      </Div>
    </FontFamily>
  );
};

/** The web mounts this layout inside TaxiApp's SettingsProvider. */
const AdminLayout = () => (
  <SettingsProvider>
    <AdminLayoutShell />
  </SettingsProvider>
);
export default AdminLayout;
