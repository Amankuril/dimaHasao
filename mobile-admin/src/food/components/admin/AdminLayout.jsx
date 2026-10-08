/* Ported from Frontend/src/modules/Food/components/admin/AdminLayout.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from '../../../lib/webRouter';
import { ArrowLeft } from 'lucide-react-native';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';
import { API_BASE_URL } from '../../../api/config';
import { adminAPI } from '../../../api/food';
import { getCurrentUser, getModuleToken, setAuthData, getModuleRefreshToken } from '../../../admin/session';
import { canAccessPath, getFirstAllowedPath, isSubAdmin } from '../../utils/subAdminPermissions';
import { Button, Div, Main, Icon as UiIcon } from '../../../components/web';
import { router } from 'expo-router';
const debugError = () => {};
export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // The collapsed width only offsets the desktop layout (lg:ml-20 / lg:ml-80); kept so the
  // sidebar's state round-trips as on the web.
  const [, setIsSidebarCollapsed] = useState(false);
  // Bumped after a permission sync so the shell re-renders with the fresh menu.
  const [, setUserVersion] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser('admin');

  // Keep SUB_ADMIN permissions in sync (so permission changes apply without re-login)
  useEffect(() => {
    if (!isSubAdmin(user)) return;
    let cancelled = false;
    adminAPI
      .getAdminProfile()
      .then((res) => {
        if (cancelled) return;
        const fresh = res?.data?.data?.admin || res?.data?.admin || res?.data?.data?.user || null;
        if (!fresh) return;
        const prevPerms = JSON.stringify(user?.permissions || {});
        const nextPerms = JSON.stringify(fresh.permissions || {});
        // Avoid rewriting localStorage (and remounting sidebar) when nothing changed
        if (prevPerms === nextPerms && String(user?.role) === String(fresh.role) && user?.isActive === fresh.isActive) {
          return;
        }
        const token = getModuleToken('admin');
        const refresh = getModuleRefreshToken('admin');
        if (token) {
          setAuthData(
            'admin',
            token,
            {
              ...user,
              ...fresh,
            },
            refresh,
          );
          setUserVersion((v) => v + 1);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const showBackButton =
    normalizedPath !== '/admin/food' &&
    normalizedPath !== '/admin/food/coupons' &&
    normalizedPath !== '/admin/food/cash-confirmations' &&
    normalizedPath !== '/admin/food/sub-admins' &&
    normalizedPath !== '/admin/food/broadcast-notification' &&
    normalizedPath !== '/admin/food/pricing';
  const handleBackClick = () => {
    if (router.canGoBack()) {
      navigate(-1);
    } else {
      navigate('/admin/food');
    }
  };

  // Get initial collapsed state from localStorage to set initial margin
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_sidebar_state');
      if (saved !== null) {
        const state = JSON.parse(saved);
        if (state && typeof state.isCollapsed !== 'undefined') {
          setIsSidebarCollapsed(state.isCollapsed);
        }
      }
    } catch (e) {
      debugError('Error loading sidebar collapsed state:', e);
    }
  }, []);
  const handleCollapseChange = (collapsed) => {
    setIsSidebarCollapsed(collapsed);
  };

  // Block SUB_ADMIN from routes they don't have permission for
  const latestUser = getCurrentUser('admin') || user;
  if (isSubAdmin(latestUser) && !canAccessPath(latestUser, location.pathname)) {
    const fallback = getFirstAllowedPath(latestUser);
    if (fallback !== location.pathname) {
      return <Navigate to={fallback} replace />;
    }
  }

  // The web injects a "Go Back" button in front of each page's <h1> by DOM surgery; a
  // native screen has no DOM to insert into, so the same button sits in a slim row
  // above the page on the same routes.
  return (
    <Div className="flex-1 bg-neutral-200 flex flex-col overflow-hidden admin-module-container">
      {/* Top Navbar */}
      <AdminNavbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Sidebar: an overlay drawer at phone width (it renders nothing while closed) */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onCollapseChange={handleCollapseChange} />

      {/* Backend disconnected banner */}
      {!API_BASE_URL && (
        <Div className="w-full bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-900">Backend disconnected. Data is not live.</Div>
      )}

      {showBackButton && (
        <Div className="flex flex-row items-center px-4 pt-3 bg-neutral-100">
          <Button
            onClick={handleBackClick}
            accessibilityLabel="Go Back"
            className="flex items-center justify-center p-2 rounded-lg bg-white/60 border border-slate-200 shadow-sm"
          >
            <UiIcon as={ArrowLeft} className="w-4 h-4 text-slate-700" />
          </Button>
        </Div>
      )}

      {/* Page Content */}
      <Main className="flex-1 min-h-0 w-full max-w-full overflow-hidden bg-neutral-100">
        <Outlet />
      </Main>
    </Div>
  );
}
