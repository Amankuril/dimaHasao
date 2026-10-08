/* Ported from Frontend/src/modules/Food/components/admin/AdminSidebar.jsx (tools/port.js first pass). */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocation } from '../../../lib/webRouter';
import AdminModuleSwitcher from '../../../admin/AdminModuleSwitcher';
import {
  Search,
  FileText,
  Calendar,
  Clock,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Link as LinkIcon,
  UtensilsCrossed,
  Building2,
  FolderTree,
  Plus,
  Utensils,
  Megaphone,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  LayoutDashboard,
  Gift,
  DollarSign,
  Image,
  Bell,
  MessageSquare,
  Mail,
  Users,
  Wallet,
  Award,
  Truck,
  Package,
  CreditCard,
  Settings,
  UserCog,
  User,
  Globe,
  Palette,
  Camera,
  LogIn,
  Database,
  Zap,
  Phone,
  IndianRupee,
  PiggyBank,
  Lock,
  UserX,
  Headset,
  FileX,
} from 'lucide-react-native';
import { cn } from '../../../lib/tw';
import { Input } from '../../../components/shadcn';
import { adminSidebarMenu } from '../../utils/adminSidebarMenu';
import { filterSidebarMenuByPermissions } from '../../utils/subAdminPermissions';
import { getCurrentUser } from '../../../admin/session';
import { adminAPI } from '../../../api/food';
import { dispatchAdminNotificationsUpdated } from '../../hooks/useAdminNotifications';
import { DEFAULT_BRAND_LOGO } from '../../../admin/brandLogo';
import { Button, Div, H2, H3, Img, Link, Overlay, P, ScrollDiv, Span, Icon as UiIcon } from '../../../components/web';
import { CustomEvent, document, window } from '../../../lib/webShim';
const debugError = () => {};

// Icon mapping
const iconMap = {
  LayoutDashboard,
  UtensilsCrossed,
  Building2,
  FileText,
  Calendar,
  Clock,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Link: LinkIcon,
  FolderTree,
  Plus,
  Utensils,
  Megaphone,
  Gift,
  DollarSign,
  Image,
  Bell,
  MessageSquare,
  Mail,
  Users,
  Wallet,
  Award,
  Truck,
  Package,
  CreditCard,
  Settings,
  UserCog,
  User,
  Globe,
  Palette,
  Camera,
  LogIn,
  Database,
  Zap,
  Phone,
  IndianRupee,
  PiggyBank,
  Lock,
  X,
  FileX,
  UserX,
  Headset,
};

// Sidebar Skeleton Loader Component
const SKELETON_WIDTHS = [62, 48, 75, 55];
const SidebarSkeleton = ({ isCollapsed }) => {
  return (
    <Div className="space-y-6 px-3 py-4 opacity-70">
      {[1, 2, 3].map((sectionIndex) => (
        <Div key={sectionIndex} className="space-y-3">
          {/* Section Header Skeleton */}
          {!isCollapsed && <Div className="h-4 w-24 bg-neutral-800/60 rounded mb-2 ml-3" />}
          {/* Section Items Skeletons */}
          {[1, 2, 3, 4].map((itemIndex) => (
            <Div key={itemIndex} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-900/40', isCollapsed ? 'justify-center' : '')}>
              {/* Icon Placeholder */}
              <Div className="w-4 h-4 bg-neutral-800/80 rounded-full shrink-0" />
              {/* Text Placeholder */}
              {!isCollapsed && (
                <Div
                  className="h-3 bg-neutral-800/70 rounded"
                  style={{
                    width: `${SKELETON_WIDTHS[itemIndex - 1]}%`,
                  }}
                />
              )}
            </Div>
          ))}
        </Div>
      ))}
    </Div>
  );
};

/** Dispatch refresh for sidebar notification badges. Optional key optimistically decrements before refetch. */
export function refreshSidebarBadges(decrement, options = {}) {
  window.dispatchEvent(
    new CustomEvent('refresh-sidebar-badges', {
      detail: decrement
        ? {
            decrement,
          }
        : undefined,
    }),
  );
  if (options.reloadNotifications !== false) {
    dispatchAdminNotificationsUpdated();
  }
}
function dispatchAdminListRefresh(counts, changedKeys) {
  if (!changedKeys?.length) return;
  window.dispatchEvent(
    new CustomEvent('admin-list-refresh', {
      detail: {
        counts,
        changedKeys,
      },
    }),
  );
}
function getBadgeKeyForPath(path = '') {
  const p = String(path || '').toLowerCase();
  if (p.includes('food-approval')) return 'foodApprovals';
  if (p.includes('restaurants/joining-request')) return 'restaurants';
  if (p.includes('delivery-partners/join-request')) return 'deliveryPartners';
  if (p.includes('orders/pending')) return 'orders';
  return null;
}
function refreshAdminListForPath(path = '') {
  const key = getBadgeKeyForPath(path);
  if (key) {
    dispatchAdminListRefresh({}, [key]);
  }
}
export default function AdminSidebar({ isOpen = false, onClose, onCollapseChange }) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [badges, setBadges] = useState({});
  const isInitialRender = useRef(true);
  const sidebarNavRef = useRef(null);
  const badgeCountsRef = useRef({});
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const activeItemRef = useRef(null);
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const res = await adminAPI.getSidebarBadges();
        if (res?.data?.success) {
          const nextCounts = res.data.counts || {};
          const prevCounts = badgeCountsRef.current || {};
          const changedKeys = Object.keys({
            ...prevCounts,
            ...nextCounts,
          }).filter((key) => (prevCounts[key] ?? 0) !== (nextCounts[key] ?? 0));
          badgeCountsRef.current = nextCounts;
          setBadges(nextCounts);
          if (changedKeys.length > 0) {
            dispatchAdminListRefresh(nextCounts, changedKeys);
          }
        }
      } catch (error) {
        debugError('Error fetching sidebar badges:', error);
      } finally {
        setIsLoading(false);
      }
    };
    const handleRefreshBadges = (event) => {
      const decrement = event?.detail?.decrement;
      if (decrement) {
        setBadges((prev) => ({
          ...prev,
          [decrement]: Math.max(0, (prev[decrement] ?? 0) - 1),
        }));
      }
      fetchBadges();
    };

    /*
     * Poll every 15s, but only while someone is actually looking.
     *
     * An admin console is a tab that stays open all day. Without this the badge
     * poll kept requesting counts nobody could see — browsers throttle a hidden
     * tab's timers to roughly once a minute rather than stopping them, so it is
     * a slow drip rather than four a minute, but it is a drip per idle tab per
     * admin, all day.
     *
     * Coming back refetches immediately rather than waiting out the interval,
     * so returning to the tab never shows a stale count — which is the only
     * thing that would make this a worse experience than polling blindly.
     */
    const tick = () => {
      if (!document.hidden) fetchBadges();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchBadges();
    };
    fetchBadges();
    const timer = setInterval(tick, 15000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('refresh-sidebar-badges', handleRefreshBadges);

    // Fallback timer to turn off loading in case network hangs or is slow
    const fallbackTimer = setTimeout(() => {
      setIsLoading(false);
    }, 700);
    return () => {
      clearInterval(timer);
      clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('refresh-sidebar-badges', handleRefreshBadges);
    };
  }, []);
  const getBadgeCount = (label = '', path = '') => {
    const l = label.toLowerCase();
    const p = path?.toLowerCase() || '';

    // Path-based (sub-menu items & direct links)
    if (p.includes('food-approval')) return badges.foodApprovals ?? 0;
    if (p.includes('restaurants/joining-request')) return badges.restaurants ?? 0;
    if (p.includes('restaurants/complaints')) return badges.restaurantComplaints ?? 0;
    if (p.includes('orders/pending')) return badges.orders ?? 0;
    if (p.includes('offline-payments')) return badges.offlinePayments ?? 0;
    if (p.includes('delivery-support-tickets')) return badges.deliverySupportTickets ?? 0;
    if (p.includes('/support-tickets')) return badges.userSupportTickets ?? 0;
    if (p.includes('delivery-withdrawal')) return badges.deliveryWithdrawals ?? 0;
    if (p.includes('cash-confirmations')) return badges.cashConfirmations ?? 0;
    if (p.includes('restaurant-withdraws')) return badges.restaurantWithdrawals ?? 0;
    if (p.includes('delivery-emergency-help')) return badges.emergencyHelp ?? 0;
    if (p.includes('earning-addon-history')) return badges.earningAddons ?? 0;
    if (p.includes('safety-emergency-reports')) return badges.safetyReports ?? 0;
    if (p.includes('delivery-partners/join-request')) return badges.deliveryPartners ?? 0;
    if (p.includes('contact-messages')) return badges.contactMessages ?? 0;

    // Label-based (expandable parents without paths)
    if (l.includes('food approval')) return badges.foodApprovals ?? 0;
    if (l === 'restaurants' || l.includes('new joining request')) return badges.restaurants ?? 0;
    if (l.includes('restaurant complaints')) return badges.restaurantComplaints ?? 0;
    if (l.includes('support tickets')) return l.includes('delivery') ? (badges.deliverySupportTickets ?? 0) : (badges.userSupportTickets ?? 0);
    if (l.includes('withdrawal') || l.includes('withdraws'))
      return l.includes('delivery') ? (badges.deliveryWithdrawals ?? 0) : (badges.restaurantWithdrawals ?? 0);
    if (l.includes('cash confirmations')) return badges.cashConfirmations ?? 0;
    if (l.includes('emergency help')) return badges.emergencyHelp ?? 0;
    if (l.includes('earning addon history')) return badges.earningAddons ?? 0;
    if (l.includes('safety emergency reports')) return badges.safetyReports ?? 0;
    if (l === 'deliveryman' || l.includes('join request') || l.includes('join-request')) return badges.deliveryPartners ?? 0;
    if (l === 'user feedback') return badges.contactMessages ?? 0;
    if (l === 'orders') return badges.orders ?? 0;
    return 0;
  };
  // Get initial states from consolidated admin_sidebar_state
  const getInitialStates = () => {
    try {
      const saved = localStorage.getItem('admin_sidebar_state');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      debugError('Error loading sidebar state:', e);
    }
    return {
      isCollapsed: false,
      expandedSections: {},
    };
  };
  const [isCollapsed, setIsCollapsed] = useState(() => getInitialStates().isCollapsed);
  const [expandedSections, setExpandedSections] = useState(() => {
    const initialState = getInitialStates().expandedSections || {};

    // Generate defaults if empty, but also pre-expand matching path synchronously
    const state = {
      ...initialState,
    };
    adminSidebarMenu.forEach((item) => {
      if (item.type === 'section') {
        item.items.forEach((subItem) => {
          if (subItem.type === 'expandable') {
            const key = subItem.label.toLowerCase().replace(/\s+/g, '');
            if (typeof state[key] === 'undefined') {
              state[key] = false;
            }
          }
        });
      }
    });

    // Pre-expand section for current path synchronously on reload
    const currentPath = location.pathname.replace(/\/+$/, '') || '/';
    adminSidebarMenu.forEach((item) => {
      if (item.type === 'section') {
        item.items.forEach((menuItem) => {
          if (menuItem.type === 'expandable' && menuItem.subItems) {
            const hasMatchingSubItem = menuItem.subItems.some((subItem) => {
              const subPath = String(subItem.path || '').replace(/\/+$/, '');
              return currentPath === subPath || currentPath.startsWith(`${subPath}/`);
            });
            if (hasMatchingSubItem) {
              const key = menuItem.label.toLowerCase().replace(/\s+/g, '');
              state[key] = true;
            }
          }
        });
      }
    });
    return state;
  });

  // Save states to consolidated localStorage and notify parent
  useEffect(() => {
    try {
      const currentState = JSON.parse(localStorage.getItem('admin_sidebar_state') || '{}');
      localStorage.setItem(
        'admin_sidebar_state',
        JSON.stringify({
          ...currentState,
          isCollapsed,
        }),
      );
      if (onCollapseChange) {
        onCollapseChange(isCollapsed);
      }
    } catch (e) {
      debugError('Error saving sidebar collapsed state:', e);
    }
  }, [isCollapsed, onCollapseChange]);

  // Notify parent on initial load
  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(isCollapsed);
    }
  }, []);
  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  // expandedSections state is initialized above in getInitialStates consolidation

  // Permission-filtered base menu (full ADMIN sees all; SUB_ADMIN sees allowed only)
  // Do NOT depend on location.pathname — remounting menu on every route break expandable submenus.
  const adminUser = getCurrentUser('admin');
  const permissionSyncKey = `${adminUser?.role || ''}:${JSON.stringify(adminUser?.permissions || {})}`;
  const permissionMenuData = useMemo(() => {
    return filterSidebarMenuByPermissions(adminSidebarMenu, getCurrentUser('admin'));
  }, [permissionSyncKey]);

  // Filter menu items based on search query
  const filteredMenuData = useMemo(() => {
    if (!searchQuery.trim()) {
      return permissionMenuData;
    }
    const query = searchQuery.toLowerCase().trim();
    const filtered = [];
    permissionMenuData.forEach((item) => {
      if (item.type === 'link') {
        if (item.label.toLowerCase().includes(query)) {
          filtered.push(item);
        }
      } else if (item.type === 'section') {
        const filteredItems = [];
        item.items.forEach((subItem) => {
          if (subItem.type === 'link') {
            if (subItem.label.toLowerCase().includes(query)) {
              filteredItems.push(subItem);
            }
          } else if (subItem.type === 'expandable') {
            const matchesLabel = subItem.label.toLowerCase().includes(query);
            const matchingSubItems = subItem.subItems?.filter((si) => si.label.toLowerCase().includes(query)) || [];
            if (matchesLabel || matchingSubItems.length > 0) {
              filteredItems.push({
                ...subItem,
                subItems: matchesLabel ? subItem.subItems : matchingSubItems,
              });
            }
          }
        });
        if (filteredItems.length > 0) {
          filtered.push({
            ...item,
            items: filteredItems,
          });
        }
      }
    });
    return filtered;
  }, [searchQuery, permissionMenuData]);

  // Auto-expand sections with matches when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      setExpandedSections((prev) => {
        const newExpandedState = {
          ...prev,
        };
        adminSidebarMenu.forEach((item) => {
          if (item.type === 'section') {
            item.items.forEach((subItem) => {
              if (subItem.type === 'expandable') {
                const matchesLabel = subItem.label.toLowerCase().includes(query);
                const hasMatchingSubItems = subItem.subItems?.some((si) => si.label.toLowerCase().includes(query));
                if (matchesLabel || hasMatchingSubItems) {
                  const sectionKey = subItem.label.toLowerCase().replace(/\s+/g, '');
                  newExpandedState[sectionKey] = true;
                }
              }
            });
          }
        });
        return newExpandedState;
      });
    }
  }, [searchQuery]);
  const isActive = (path, allPaths = []) => {
    const currentPath = location.pathname.replace(/\/+$/, '') || '/';
    const targetPath = String(path || '').replace(/\/+$/, '') || '/';
    const matchesPath = (candidatePath) => currentPath === candidatePath || currentPath.startsWith(`${candidatePath}/`);
    if (targetPath === '/admin' || targetPath === '/admin/food') {
      return currentPath === targetPath;
    }

    // For subItems, check if this is the most specific match
    if (allPaths.length > 0) {
      // Sort paths by length (longest first) to find most specific match
      const sortedPaths = [...allPaths].sort((a, b) => b.length - a.length);
      const bestMatch = sortedPaths.find((candidatePath) => matchesPath(String(candidatePath || '').replace(/\/+$/, '') || '/'));
      return (String(bestMatch || '').replace(/\/+$/, '') || '/') === targetPath;
    }
    return matchesPath(targetPath);
  };
  useEffect(() => {
    const currentPath = location.pathname.replace(/\/+$/, '') || '/';
    let foundSectionKey = null;
    adminSidebarMenu.forEach((item) => {
      if (item.type === 'section') {
        item.items.forEach((menuItem) => {
          if (menuItem.type === 'expandable' && menuItem.subItems) {
            const hasMatchingSubItem = menuItem.subItems.some((subItem) => {
              const subPath = String(subItem.path || '').replace(/\/+$/, '');
              return currentPath === subPath || currentPath.startsWith(`${subPath}/`);
            });
            if (hasMatchingSubItem) {
              foundSectionKey = menuItem.label.toLowerCase().replace(/\s+/g, '');
            }
          }
        });
      }
    });
    if (foundSectionKey) {
      setExpandedSections((prev) => {
        if (prev[foundSectionKey]) return prev;
        return {
          ...prev,
          [foundSectionKey]: true,
        };
      });
    }
  }, [location.pathname]);

  // Center the active item in the menu's scroll view (the web's scrollToActiveItem):
  // the drawer mounts when it opens, so this runs on open and after each route change.
  const scrollToActiveItem = (animated = false) => {
    const container = sidebarNavRef.current;
    const activeElement = activeItemRef.current;
    if (!container || !activeElement?.measureLayout) return;
    const inner = container.getInnerViewRef?.();
    if (!inner) return;
    activeElement.measureLayout(
      inner,
      (x, y, w, h) => {
        container.measure?.((cx, cy, cw, ch) => {
          container.scrollTo({ y: Math.max(0, y - ch / 2 + h / 2), animated });
        });
      },
      () => {},
    );
  };
  useEffect(() => {
    if (!isOpen || isLoading) return undefined;
    const timer = setTimeout(() => scrollToActiveItem(false), 100);
    return () => clearTimeout(timer);
  }, [isOpen, isLoading, location.pathname]);
  useEffect(() => {
    try {
      const currentState = JSON.parse(localStorage.getItem('admin_sidebar_state') || '{}');
      localStorage.setItem(
        'admin_sidebar_state',
        JSON.stringify({
          ...currentState,
          expandedSections,
        }),
      );
    } catch (e) {
      debugError('Error saving sidebar state:', e);
    }
  }, [expandedSections]);
  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => {
      const isCurrentlyOpen = Boolean(prev[sectionKey]);

      // Accordion behavior:
      // 1) If current section is open -> close it.
      // 2) If current section is closed -> open it and close all others.
      if (isCurrentlyOpen) {
        return {
          ...prev,
          [sectionKey]: false,
        };
      }
      const next = {};
      Object.keys(prev).forEach((key) => {
        next[key] = key === sectionKey;
      });
      return next;
    });
  };
  const renderMenuItem = (item, index, isInSection = false) => {
    if (item.type === 'link') {
      const Icon = iconMap[item.icon] || Utensils;
      return (
        <Link
          key={index}
          to={item.path}
          ref={isActive(item.path) ? activeItemRef : undefined}
          onClick={() => {
            if (isActive(item.path)) {
              refreshAdminListForPath(item.path);
            }
            if (onClose) {
              onClose();
            }
          }}
          className={cn(
            'flex flex-row items-center gap-2.5 px-3 py-2 rounded-lg text-left',
            isInSection ? 'text-sm font-semibold' : 'text-sm',
            isActive(item.path) ? 'bg-white/10 text-white border border-white/15 font-semibold' : 'text-neutral-300 border border-transparent',
            isCollapsed && 'justify-center px-2',
          )}
          accessibilityLabel={isCollapsed ? item.label : undefined}
        >
          <UiIcon
            as={Icon}
            className={cn('shrink-0 text-left', isInSection ? 'w-4 h-4' : 'w-4 h-4', isActive(item.path) ? 'text-white' : 'text-neutral-300')}
          />
          {!isCollapsed && (
            <Div className="flex-1 flex items-center justify-between overflow-hidden">
              <Span className={cn('text-left truncate', isInSection ? 'font-semibold' : 'font-medium')}>{item.label}</Span>
              {getBadgeCount(item.label, item.path) > 0 && (
                <Span className="shrink-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 min-w-[18px] text-center">
                  {getBadgeCount(item.label, item.path) > 99 ? '99+' : getBadgeCount(item.label, item.path)}
                </Span>
              )}
            </Div>
          )}
          {isCollapsed && getBadgeCount(item.label, item.path) > 0 && (
            <Span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-neutral-950" />
          )}
        </Link>
      );
    }
    if (item.type === 'expandable') {
      const Icon = iconMap[item.icon] || Utensils;
      const sectionKey = item.label.toLowerCase().replace(/\s+/g, '');
      const isExpanded = expandedSections[sectionKey] || false;
      if (isCollapsed) {
        return (
          <Div key={index}>
            <Button
              onClick={() => toggleSection(sectionKey)}
              className={cn('w-full flex items-center justify-center px-2 py-2 rounded-lg text-sm font-medium', 'text-white')}
            >
              <Div className="relative">
                <UiIcon as={Icon} className="w-4 h-4 shrink-0 text-neutral-300" />
                {getBadgeCount(item.label, item.path) > 0 && (
                  <Span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-neutral-950" />
                )}
              </Div>
            </Button>
          </Div>
        );
      }
      return (
        <Div key={index}>
          <Button
            onClick={() => toggleSection(sectionKey)}
            className={cn('w-full flex flex-row items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium text-left', 'text-white')}
          >
            <Div className="flex items-center gap-2.5 text-left flex-1 min-w-0">
              <UiIcon as={Icon} className="w-4 h-4 shrink-0 text-neutral-300" />
              <Span className="font-medium text-left truncate">{item.label}</Span>
              {getBadgeCount(item.label, item.path) > 0 && (
                <Span className="shrink-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 min-w-[18px] text-center">
                  {getBadgeCount(item.label, item.path) > 99 ? '99+' : getBadgeCount(item.label, item.path)}
                </Span>
              )}
            </Div>
            <Div
              className="transition-transform duration-300 shrink-0"
              style={{
                transform: [{ rotate: isExpanded ? '0deg' : '-90deg' }],
              }}
            >
              <UiIcon as={ChevronDown} className="w-4 h-4 shrink-0 text-neutral-300" />
            </Div>
          </Button>
          {isExpanded && item.subItems && item.subItems.length > 0 && (
            <Div className="ml-5 mt-1 space-y-1 border-neutral-800/60 pl-3">
              {item.subItems.map((subItem) => {
                const allSubPaths = item.subItems.map((si) => si.path);
                return (
                  <Link
                    key={subItem.path || subItem.label}
                    to={subItem.path}
                    ref={isActive(subItem.path, allSubPaths) ? activeItemRef : undefined}
                    onClick={() => {
                      if (isActive(subItem.path, allSubPaths)) {
                        refreshAdminListForPath(subItem.path);
                      }
                      if (onClose) {
                        onClose();
                      }
                    }}
                    className={cn(
                      'flex flex-row items-center gap-2 px-3 py-1.5 rounded-md text-sm font-normal text-left',
                      isActive(subItem.path, allSubPaths) ? 'bg-white/10 text-white font-semibold' : 'text-neutral-300',
                    )}
                  >
                    <Div className={cn('w-1.5 h-1.5 rounded-full shrink-0', isActive(subItem.path, allSubPaths) ? 'bg-white' : 'bg-neutral-400')} />
                    <Span className="text-left flex-1 truncate">{subItem.label}</Span>
                    {getBadgeCount(subItem.label, subItem.path) > 0 && (
                      <Span className="shrink-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 min-w-[18px] text-center">
                        {getBadgeCount(subItem.label, subItem.path) > 99 ? '99+' : getBadgeCount(subItem.label, subItem.path)}
                      </Span>
                    )}
                  </Link>
                );
              })}
            </Div>
          )}
        </Div>
      );
    }
    return null;
  };
  // At phone width the web's sidebar is an off-canvas drawer (translate-x) over a dimmed
  // backdrop; here that drawer is a Modal that mounts while open. The badge poll above
  // stays mounted with the layout, as the web's always-rendered sidebar does.
  if (!isOpen) return null;
  return (
    <Overlay className="flex-row" onClose={onClose}>
      <Div
        className={cn('bg-neutral-950 border-r border-neutral-800/60 h-full z-50 flex flex-col overflow-hidden', isCollapsed ? 'w-20' : 'w-80')}
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom, maxWidth: '85%' }}
      >
        {/* Header with Logo */}
        <Div className="shrink-0 px-3 py-3 border-b border-neutral-800/60 bg-neutral-900">
          <Div className="relative flex items-center mb-3 min-h-[80px]">
            <Img src={DEFAULT_BRAND_LOGO} alt="Dima Hasao" className={isCollapsed ? 'h-14 w-14' : 'h-20 w-20'} contentFit="contain" />
            {!isCollapsed && (
              <Div className="absolute inset-0 flex flex-col items-center justify-center" pointerEvents="none">
                <H3 className="text-[15px] font-extrabold leading-tight text-white tracking-tight">Dima Hasao</H3>
                <Div className="mt-1 flex items-center gap-1.5">
                  <Div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <Span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Food Admin</Span>
                </Div>
              </Div>
            )}
            <Div className={cn('flex items-center gap-2 shrink-0 absolute top-0 bottom-0 z-[60]', isCollapsed ? '-right-3' : 'right-0')}>
              <Button onClick={toggleCollapse} className="p-1.5 rounded-lg" accessibilityLabel={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                {isCollapsed ? (
                  <UiIcon as={ChevronRight} className="w-4 h-4 text-neutral-300" />
                ) : (
                  <UiIcon as={ChevronLeft} className="w-4 h-4 text-neutral-300" />
                )}
              </Button>
              {!isCollapsed && (
                <Button onClick={onClose} className="p-1" accessibilityLabel="Close menu">
                  <UiIcon as={X} className="w-5 h-5 text-neutral-300" />
                </Button>
              )}
            </Div>
          </Div>

          {/* Admin Panel Label */}
          {!isCollapsed && (
            <Div className="mb-3">
              <H2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider text-left">Admin Panel</H2>
            </Div>
          )}

          {/* The four-module strip plus Global. Food kept its own copy of
              this markup, which is why Global never appeared here even
              though the section existed — the shared component is the only
              one that knows about it. */}
          <AdminModuleSwitcher isCollapsed={isCollapsed} onNavigate={onClose} />

          {/* Search Bar */}
          {!isCollapsed && (
            <Div className="relative justify-center">
              <UiIcon as={Search} className="absolute left-3 text-neutral-400 w-4 h-4 z-10" />
              <Input
                type="text"
                placeholder="Search Menu..."
                placeholderTextColor="#737373"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full pl-9 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white text-left',
                  searchQuery ? 'pr-9' : 'pr-3',
                )}
              />
              {searchQuery ? (
                <Button onClick={() => setSearchQuery('')} className="absolute right-3 z-10" accessibilityLabel="Clear search">
                  <UiIcon as={X} className="w-4 h-4 text-neutral-400" />
                </Button>
              ) : null}
            </Div>
          )}
        </Div>

        {/* Navigation Menu */}
        <ScrollDiv ref={sidebarNavRef} className="flex-1 min-h-0 px-3 py-3 space-y-2">
          {isLoading ? (
            <SidebarSkeleton isCollapsed={isCollapsed} />
          ) : filteredMenuData.length === 0 && searchQuery.trim() ? (
            <Div className="px-3 py-12 text-left">
              <P className="text-neutral-300 text-sm font-medium text-left">No menu items found</P>
              <P className="text-neutral-500 text-sm mt-2 text-left">Try a different search term</P>
            </Div>
          ) : (
            filteredMenuData.map((item, index) => {
              if (item.type === 'link') {
                return renderMenuItem(item, item.path || item.label);
              }
              if (item.type === 'section') {
                return (
                  <Div key={item.label || index} className={cn(index > 0 ? 'mt-4 pt-4 border-t border-neutral-800/60' : '')}>
                    <Div className="px-3 py-2 mb-2 flex items-center justify-between">
                      <Span className="text-neutral-400 font-bold text-sm uppercase tracking-wider text-left">{item.label}</Span>
                      {item.items.some((subItem) => {
                        const count = getBadgeCount(subItem.label, subItem.path);
                        if (count > 0) return true;
                        if (subItem.type === 'expandable' && subItem.subItems) {
                          return subItem.subItems.some((si) => getBadgeCount(si.label, si.path) > 0);
                        }
                        return false;
                      }) && <Div className="w-2 h-2 bg-red-600 rounded-full" />}
                    </Div>
                    <Div className="space-y-1">
                      {item.items.map((subItem, subIndex) => renderMenuItem(subItem, subItem.path || subItem.label || `${item.label}-${subIndex}`, true))}
                    </Div>
                  </Div>
                );
              }
              return null;
            })
          )}
        </ScrollDiv>
      </Div>
      {/* Backdrop: tapping it closes the drawer (the web's bg-gray-900/50 overlay). */}
      <Div className="flex-1 bg-gray-900/50" onClick={onClose} pressedStyle={{}} accessibilityLabel="Close menu" />
    </Overlay>
  );
}
