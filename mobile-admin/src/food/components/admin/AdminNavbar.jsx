/* Ported from Frontend/src/modules/Food/components/admin/AdminNavbar.jsx (tools/port.js first pass). */
import { useState, useEffect, useRef, useMemo } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigate } from '../../../lib/webRouter';
import { useAuth } from '../../../context/AuthContext';
import {
  Menu,
  Search,
  User,
  ChevronDown,
  UtensilsCrossed,
  LogOut,
  Settings,
  FileText,
  Package,
  Users,
  AlertCircle,
  ArrowRight,
  Building2,
  Utensils,
  Grid,
  PlusCircle,
  Bell,
  BellOff,
} from 'lucide-react-native';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../components/shadcn';
import { DEFAULT_BRAND_LOGO } from '../../../admin/brandLogo';
import { adminAPI } from '../../../api/food';
import { clearModuleAuth } from '../../../admin/session';
import useAdminNotifications from '../../hooks/useAdminNotifications';
import { Button, Div, Header, Img, P, ScrollDiv, Span, Icon as UiIcon } from '../../../components/web';
import { window } from '../../../lib/webShim';
const debugError = () => {};
export default function AdminNavbar({ onMenuClick }) {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const searchInputRef = useRef(null);
  const { items: adminNotifications, unreadCount: notificationCount, markAsRead } = useAdminNotifications();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  // Universal Search logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          const response = await adminAPI.globalSearch(searchQuery);
          if (response?.data?.success) {
            setSearchResults(response.data.data || []);
          }
        } catch (error) {
          debugError('Error searching:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);
  const groupedResults = useMemo(() => {
    const groups = {};
    searchResults.forEach((res) => {
      if (!groups[res.type]) groups[res.type] = [];
      groups[res.type].push(res);
    });
    return groups;
  }, [searchResults]);
  const handleResultClick = (result) => {
    // Save to recent searches
    const updatedRecent = [result.title, ...recentSearches.filter((s) => s !== result.title)].slice(0, 5);
    setRecentSearches(updatedRecent);
    localStorage.setItem('admin_recent_searches', JSON.stringify(updatedRecent));
    setSearchOpen(false);
    setSearchQuery('');
    navigate(result.path);
  };
  const handleRecentClick = (term) => {
    setSearchQuery(term);
  };
  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('admin_recent_searches');
  };

  // Load admin data from localStorage
  useEffect(() => {
    const loadAdminData = () => {
      try {
        const adminUserStr = localStorage.getItem('admin_user');
        if (adminUserStr) {
          const adminUser = JSON.parse(adminUserStr);
          setAdminData(adminUser);
        }
      } catch (error) {
        debugError('Error loading admin data:', error);
      }
    };
    loadAdminData();

    // Listen for auth changes
    const handleAuthChange = () => {
      loadAdminData();
    };
    window.addEventListener('adminAuthChanged', handleAuthChange);
    return () => {
      window.removeEventListener('adminAuthChanged', handleAuthChange);
    };
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [searchOpen]);

  // Handle logout: the backend logout (best effort) and the session clear are useAuth().logout();
  // the panel's own preference keys are cleared here as on the web.
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      debugError('Error during logout:', error);
      clearModuleAuth('admin');
    }
    localStorage.removeItem('admin_sidebar_state');
    localStorage.removeItem('admin_recent_searches');
    sessionStorage.removeItem('adminAuthData');
    window.dispatchEvent({ type: 'adminAuthChanged' });
    navigate('/admin/login', {
      replace: true,
    });
  };
  const openNotificationsPage = () => {
    setNotificationsOpen(false);
    navigate('/admin/food/notifications');
  };
  const handleNotificationClick = (item) => {
    if (item?.id) markAsRead(item.id);
    setNotificationsOpen(false);
    if (item?.path) navigate(item.path);
  };
      return (
    <>
      <Header className="z-50 bg-white border-b border-neutral-200 shadow-sm" style={{ paddingTop: insets.top }}>
        <Div className="flex items-center justify-between px-4 py-3">
          {/* Left: Logo and Mobile Menu */}
          <Div className="flex items-center gap-3">
            <Button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors"
              accessibilityLabel="Toggle menu"
            >
              <UiIcon as={Menu} className="w-5 h-5" />
            </Button>
            {/* Logo */}
            <Div className="flex items-center gap-2">
              <Div className="w-24 h-12 rounded-lg bg-white flex items-center justify-center">
                <Img src={DEFAULT_BRAND_LOGO} alt="Dima Hasao" className="h-10 w-24" contentFit="contain" />
              </Div>
            </Div>
          </Div>

          {/* Center: Search Bar */}
          <Div className="flex-1 flex justify-center max-w-md mx-2">
            <Button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-neutral-100 w-full border border-neutral-200"
              accessibilityLabel="Search"
            >
              <UiIcon as={Search} className="w-4 h-4 text-neutral-700" />
              <Span className="text-sm flex-1 text-left text-neutral-700" numberOfLines={1}>
                Search
              </Span>
            </Button>
          </Div>

          {/* Right: User Profile */}
          <Div className="flex items-center gap-3">
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  className="relative h-10 w-10 rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 flex items-center justify-center hover:bg-neutral-100 transition-colors overflow-visible"
                  accessibilityLabel={notificationCount > 0 ? `Notifications (${notificationCount} unread)` : 'Notifications'}
                >
                  <UiIcon as={Bell} className="w-5 h-5 shrink-0" strokeWidth={2} />
                  {notificationCount > 0 && (
                    <Span className="absolute -top-1 -right-1 z-10 min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold text-center px-1 border-2 border-white overflow-hidden">
                      {notificationCount > 99 ? '99+' : notificationCount > 9 ? '9+' : notificationCount}
                    </Span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 mt-2 border border-neutral-200 shadow-2xl rounded-2xl overflow-hidden" align="end">
                <Div className="bg-white">
                  <Div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-3">
                    <Div className="min-w-0">
                      <P className="text-sm font-semibold text-neutral-900">Notifications</P>
                      <P className="text-xs text-neutral-500">
                        {notificationCount > 0 ? `${notificationCount} unread alert${notificationCount === 1 ? '' : 's'}` : 'Approval and support alerts'}
                      </P>
                    </Div>
                    <Button type="button" onClick={openNotificationsPage} className="text-xs font-semibold text-amber-600 hover:text-amber-700 shrink-0">
                      View all
                    </Button>
                  </Div>

                  <ScrollDiv className="max-h-96" nestedScrollEnabled>
                    {adminNotifications.length === 0 ? (
                      <Div className="px-6 py-10 text-center flex flex-col items-center gap-2">
                        <UiIcon as={BellOff} className="w-9 h-9 text-neutral-300" />
                        <P className="text-sm text-neutral-500">No notifications yet</P>
                      </Div>
                    ) : (
                      adminNotifications.slice(0, 8).map((item) => (
                        <Button
                          key={item?.id}
                          type="button"
                          onClick={() => handleNotificationClick(item)}
                          className={`w-full text-left px-4 py-4 border-b border-neutral-100 last:border-b-0 transition-colors ${item.read ? 'hover:bg-neutral-50' : 'bg-amber-50/60 hover:bg-amber-50'}`}
                        >
                          <Div className="flex items-start justify-between gap-3">
                            <Div className="min-w-0">
                              <Div className="flex items-center gap-2">
                                {!item.read && <Span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                                <P className={`text-sm font-semibold truncate ${item.read ? 'text-neutral-600' : 'text-neutral-900'}`}>
                                  {item?.title || 'Notification'}
                                </P>
                              </Div>
                              <P className={`text-xs mt-1 line-clamp-2 ${item.read ? 'text-neutral-500' : 'text-neutral-600'}`}>{item?.message || '-'}</P>
                              <P className="text-[11px] text-neutral-400 mt-2">{item?.metaLabel || item?.category || 'Admin alert'}</P>
                            </Div>
                            <Span className="shrink-0 text-[10px] text-neutral-400">{item?.timeLabel || 'Now'}</Span>
                          </Div>
                        </Button>
                      ))
                    )}
                  </ScrollDiv>
                </Div>
              </PopoverContent>
            </Popover>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Div className="flex items-center gap-2 border-l border-neutral-200 rounded-md px-2 py-2">
                  <UiIcon as={ChevronDown} className="w-4 h-4 text-neutral-700" />
                </Div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 text-neutral-900 animate-in fade-in-0 zoom-in-95 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
              >
                <Div className="p-4 border-b border-neutral-200">
                  <Div className="flex items-center gap-3">
                    <Div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden border border-neutral-300">
                      {adminData?.profileImage ? (
                        <Img
                          src={adminData.profileImage && adminData.profileImage.trim() ? adminData.profileImage : undefined}
                          alt={adminData.name || 'Admin'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Span className="text-lg font-semibold text-neutral-600">
                          {adminData?.name
                            ? adminData.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .substring(0, 2)
                            : 'AD'}
                        </Span>
                      )}
                    </Div>
                    <Div>
                      <P className="text-sm font-semibold text-neutral-900">{adminData?.name || 'Admin User'}</P>
                      <P className="text-xs text-neutral-500">
                        {adminData?.email
                          ? (() => {
                              const [local, domain] = adminData.email.split('@');
                              return local[0] + '*'.repeat(Math.min(local.length - 1, 5)) + '@' + domain;
                            })()
                          : 'admin@example.com'}
                      </P>
                    </Div>
                  </Div>
                </Div>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="group cursor-pointer hover:bg-neutral-100 focus:bg-neutral-100 text-neutral-700 hover:text-neutral-900 focus:text-neutral-900"
                    onClick={() => navigate('/admin/food/profile')}
                  >
                    <UiIcon as={User} className="mr-2 w-4 h-4 text-neutral-500 group-hover:text-neutral-700 group-focus:text-neutral-700" />
                    <Span>Profile</Span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="group cursor-pointer hover:bg-neutral-100 focus:bg-neutral-100 text-neutral-700 hover:text-neutral-900 focus:text-neutral-900"
                    onClick={() => navigate('/admin/food/settings')}
                  >
                    <UiIcon as={Settings} className="mr-2 w-4 h-4 text-neutral-500 group-hover:text-neutral-700 group-focus:text-neutral-700" />
                    <Span>Settings</Span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="group cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50 hover:text-red-700 focus:text-red-700"
                  onClick={handleLogout}
                >
                  <UiIcon as={LogOut} className="mr-2 w-4 h-4 text-red-500 group-hover:text-red-600 group-focus:text-red-600" />
                  <Span>Logout</Span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Div>
        </Div>
      </Header>

      {/* Search Modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl p-0 bg-white opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 ease-in-out data-[state=open]:scale-100 data-[state=closed]:scale-100 border border-neutral-200">
          <DialogHeader className="p-6 pb-4 border-b border-neutral-200">
            <DialogTitle className="text-xl font-semibold text-neutral-900">Universal Search</DialogTitle>
          </DialogHeader>
          <Div className="p-6">
            <Div className="relative mb-6 justify-center">
              <UiIcon as={Search} className="absolute left-3 z-10 w-5 h-5 text-neutral-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search orders, users, products, reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 text-base border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-500 focus:border-black focus:ring-black"
              />
            </Div>

            {searchQuery.trim() === '' ? (
              <Div className="space-y-4">
                <Div className="text-sm text-neutral-500 mb-4">Quick Actions</Div>
                <Div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      icon: Package,
                      label: 'Orders',
                      path: '/admin/food/orders/all',
                    },
                    {
                      icon: Users,
                      label: 'Users',
                      path: '/admin/food/customers',
                    },
                    {
                      icon: UtensilsCrossed,
                      label: 'Products',
                      path: '/admin/food/foods',
                    },
                    {
                      icon: FileText,
                      label: 'Reports',
                      path: '/admin/food/transaction-report',
                    },
                  ].map((action, idx) => (
                    <Button
                      key={idx}
                      onClick={() => {
                        setSearchOpen(false);
                        navigate(action.path);
                      }}
                      className="flex items-center gap-3 p-4 rounded-lg border border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 transition-all"
                    >
                      <Div className="p-2 rounded-md bg-black text-white">
                        <UiIcon as={action.icon} className="w-5 h-5" />
                      </Div>
                      <Span className="text-sm font-medium text-neutral-900">{action.label}</Span>
                    </Button>
                  ))}
                </Div>
                {recentSearches.length > 0 && (
                  <Div className="mt-6 pt-4 border-t border-neutral-200">
                    <Div className="flex items-center justify-between mb-2">
                      <P className="text-xs text-neutral-500">Recent Searches</P>
                      <Button onClick={clearRecent} className="text-[10px] text-red-500 hover:underline">
                        Clear All
                      </Button>
                    </Div>
                    <Div className="flex flex-wrap gap-2">
                      {recentSearches.map((term, idx) => (
                        <Button
                          key={idx}
                          onClick={() => handleRecentClick(term)}
                          className="px-3 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-700 transition-colors"
                        >
                          {term}
                        </Button>
                      ))}
                    </Div>
                  </Div>
                )}
              </Div>
            ) : (
              <ScrollDiv className="max-h-96" contentClassName="gap-2" nestedScrollEnabled>
                {isSearching ? (
                  <Div className="text-center py-12">
                    <ActivityIndicator size="large" color="#000" style={{ marginBottom: 12 }} />
                    <P className="text-sm text-neutral-500">Searching...</P>
                  </Div>
                ) : searchResults.length === 0 ? (
                  <Div className="text-center py-12">
                    <UiIcon as={AlertCircle} className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <P className="text-sm text-neutral-500">No results found for &quot;{searchQuery}&quot;</P>
                  </Div>
                ) : (
                  <>
                    <Div className="text-sm text-neutral-600 mb-3 ml-1">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                    </Div>
                    {Object.entries(groupedResults).map(([type, results]) => (
                      <Div key={type} className="mb-4">
                        <Div className="flex items-center gap-2 mb-2 px-1">
                          <Span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{type}s</Span>
                          <Div className="h-px flex-1 bg-neutral-100" />
                        </Div>
                        <Div className="space-y-2">
                          {results.map((result, idx) => (
                            <Button
                              key={`${type}-${idx}`}
                              onClick={() => handleResultClick(result)}
                              className="w-full flex items-center gap-3 p-3 rounded-xl border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50 transition-all text-left group"
                            >
                              <Div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 group-hover:bg-white group-hover:text-black transition-colors">
                                {result.type === 'Order' && <UiIcon as={Package} className="w-5 h-5" />}
                                {result.type === 'User' && <UiIcon as={User} className="w-5 h-5" />}
                                {result.type === 'Restaurant' && <UiIcon as={Building2} className="w-5 h-5" />}
                                {result.type === 'Product' && <UiIcon as={Utensils} className="w-5 h-5" />}
                                {result.type === 'Category' && <UiIcon as={Grid} className="w-5 h-5" />}
                                {result.type === 'Addon' && <UiIcon as={PlusCircle} className="w-5 h-5" />}
                              </Div>
                              <Div className="flex-1 min-w-0">
                                <P className="text-sm font-semibold text-neutral-900 truncate">{result.title}</P>
                                <P className="text-xs text-neutral-500 truncate mt-0.5">{result.description}</P>
                              </Div>
                              <UiIcon as={ArrowRight} className="w-4 h-4 text-neutral-300 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
                            </Button>
                          ))}
                        </Div>
                      </Div>
                    ))}
                  </>
                )}
              </ScrollDiv>
            )}
          </Div>
        </DialogContent>
      </Dialog>
    </>
  );
}
