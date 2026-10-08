/*
 * The phone-width shell shared by the Tours & Festivals and Global admin
 * layouts. On the web both are the same dark rail (logo, "Admin Panel",
 * AdminModuleSwitcher, menu search, menu, logout) beside a white top bar and
 * the page. At phone width the top bar stays and the rail becomes a drawer
 * opened from a menu button, as the Food / Taxi / Hotel panels do.
 */
import React, { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, LogOut, X, Menu } from 'lucide-react-native';
import { Outlet, useLocation, useNavigate } from '../../../../lib/webRouter';
import { toast } from '../../../../lib/notify';
import { useAuth } from '../../../../context/AuthContext';
import AdminModuleSwitcher from '../../../../admin/AdminModuleSwitcher';
import { DEFAULT_BRAND_LOGO } from '../../../../admin/brandLogo';
import { Aside, Button, Div, H1, H2, H3, Header, Img, Input, Main, NavLink, Overlay, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';

export default function PanelShell({ menuItems, panelLabel, title }) {
  const [open, setOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const visibleMenuItems = useMemo(() => {
    const query = menuQuery.trim().toLowerCase();
    if (!query) return menuItems;
    return menuItems.filter((item) => item.label.toLowerCase().includes(query));
  }, [menuQuery, menuItems]);

  /**
   * The longest matching path wins, so /packages/new highlights only
   * "Create Package" and not "Packages" as well.
   */
  const activePath = useMemo(() => {
    const matches = menuItems
      .filter((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))
      .sort((a, b) => b.path.length - a.path.length);
    return matches[0]?.path || null;
  }, [location.pathname, menuItems]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    toast.success('Logged out successfully');
    navigate('/admin/login', {
      replace: true,
    });
  };

  return (
    <Div className="flex-1 bg-neutral-200 font-sans text-gray-900">
      <Header
        className="bg-white border-b border-gray-200 flex-row items-center justify-between px-4 shadow-sm z-10"
        style={{ paddingTop: insets.top, height: 64 + insets.top }}
      >
        <Div className="flex-row items-center gap-3 flex-1 min-w-0">
          <Button type="button" onClick={() => setOpen(true)} className="p-2 -ml-2 rounded-lg" accessibilityLabel="Open menu">
            <UiIcon as={Menu} size={22} className="text-gray-800" />
          </Button>
          <H1 className="text-xl font-bold text-gray-800 truncate flex-1">{title}</H1>
        </Div>
        <Div className="h-8 w-8 rounded-full bg-neutral-950 text-white flex items-center justify-center font-bold text-sm">A</Div>
      </Header>

      <Main className="flex-1 bg-gray-50/50">
        <Outlet />
      </Main>

      {open && (
        <Overlay className="bg-black/50 flex-row" onClick={() => setOpen(false)} onClose={() => setOpen(false)}>
          <Aside
            className="h-full flex-col bg-neutral-950 border-r border-neutral-800/60"
            style={{ width: '82%', maxWidth: 320, paddingTop: insets.top, paddingBottom: insets.bottom }}
            onClick={() => {}}
          >
            <Div className="px-3 py-3 border-b border-neutral-800/60 bg-neutral-900">
              <Div className="relative flex items-center mb-3 min-h-[80px]">
                <Img src={DEFAULT_BRAND_LOGO} alt="Dima Hasao" className="h-20 w-20" contentFit="contain" />
                <Div className="absolute inset-0 flex flex-col items-center justify-center" pointerEvents="none">
                  <H3 className="text-[15px] font-extrabold leading-tight text-white tracking-tight">Dima Hasao</H3>
                  <Div className="mt-1 flex items-center gap-1.5">
                    <Div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <Span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{panelLabel}</Span>
                  </Div>
                </Div>
                <Button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-0 top-0 h-8 w-8 items-center justify-center rounded-full text-neutral-300"
                  accessibilityLabel="Close menu"
                >
                  <UiIcon as={X} size={18} className="text-neutral-300" />
                </Button>
              </Div>

              <Div className="mb-3">
                <H2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider text-left">Admin Panel</H2>
              </Div>

              <AdminModuleSwitcher onNavigate={() => setOpen(false)} />

              <Div className="relative justify-center">
                <UiIcon as={Search} className="absolute left-3 text-neutral-400 w-4 h-4 z-10" />
                <Input
                  type="text"
                  placeholder="Search Menu..."
                  value={menuQuery}
                  onChange={(e) => setMenuQuery(e.target.value)}
                  className={`w-full pl-9 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder:text-neutral-500 ${menuQuery ? 'pr-9' : 'pr-3'}`}
                />
                {menuQuery ? (
                  <Button type="button" onClick={() => setMenuQuery('')} className="absolute right-3 z-10" accessibilityLabel="Clear search">
                    <UiIcon as={X} className="w-4 h-4 text-neutral-400" />
                  </Button>
                ) : null}
              </Div>
            </Div>

            <ScrollDiv className="flex-1 px-3 py-3" contentClassName="gap-1">
              {visibleMenuItems.length === 0 ? (
                <Div className="px-3 py-12 text-left">
                  <P className="text-neutral-300 text-sm font-medium">No menu items found</P>
                </Div>
              ) : (
                visibleMenuItems.map((item) => {
                  const isActive = activePath === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${isActive ? 'bg-white text-black' : 'text-neutral-400'}`}
                    >
                      <UiIcon as={item.icon} size={20} className={isActive ? 'text-black' : 'text-neutral-500'} />
                      <Span className={`flex-1 truncate text-sm font-medium ${isActive ? 'text-black' : 'text-neutral-400'}`}>{item.label}</Span>
                    </NavLink>
                  );
                })
              )}
            </ScrollDiv>

            <Div className="border-t border-neutral-800/60 p-3">
              <Button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400">
                <UiIcon as={LogOut} size={20} className="text-red-400" />
                <Span className="text-sm font-medium text-red-400">Logout</Span>
              </Button>
            </Div>
          </Aside>
        </Overlay>
      )}
    </Div>
  );
}
