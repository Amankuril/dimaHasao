import { Compass, Globe, Hotel, Truck, UtensilsCrossed } from 'lucide-react-native';
import { usePathname } from 'expo-router';
import { cn } from '../lib/tw';
import { navigateTo } from '../lib/webRouter';
import { Button, Div, Icon } from '../components/web';
import { getCurrentUser } from './session';
import { FOOD_ADMIN_HOME, GLOBAL_ADMIN_HOME, HOTEL_ADMIN_HOME, TAXI_ADMIN_HOME, TOURS_ADMIN_HOME, canSeeAdminModule } from './access';

/*
 * Port of shared/components/admin/AdminModuleSwitcher.jsx: the module tab strip
 * at the top of every admin sidebar (Food, Taxi, Hotel, Tours & Festivals in a
 * 2-column grid, Global across both columns). Same markup and classes in every
 * panel. `onNavigate` lets the drawer close itself.
 */
export default function AdminModuleSwitcher({ isCollapsed = false, className, onNavigate }) {
  const pathname = usePathname();
  const adminProfile = getCurrentUser('admin') || {};
  if (isCollapsed) return null;

  const tabs = [
    { key: 'food', label: 'Food', icon: UtensilsCrossed, home: FOOD_ADMIN_HOME, show: canSeeAdminModule(adminProfile, 'food'), active: pathname.includes('/admin/food') || pathname === '/admin' },
    { key: 'taxi', label: 'Taxi', icon: Truck, home: TAXI_ADMIN_HOME, show: canSeeAdminModule(adminProfile, 'taxi'), active: pathname.startsWith('/taxi') },
    { key: 'hotel', label: 'Hotel', icon: Hotel, home: HOTEL_ADMIN_HOME, show: canSeeAdminModule(adminProfile, 'hotel'), active: pathname.startsWith('/hotel') },
    { key: 'tours', label: 'Tours & Festivals', icon: Compass, home: TOURS_ADMIN_HOME, show: canSeeAdminModule(adminProfile, 'tours'), active: pathname.startsWith('/tours') },
  ].filter((t) => t.show);
  const globalActive = pathname.startsWith('/global');

  const tabClass = (isActive) => cn('flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold', isActive ? 'bg-white text-black shadow-md' : 'text-neutral-400');
  const go = (path) => {
    onNavigate?.();
    navigateTo(path);
  };

  return (
    <Div className={cn('flex flex-row flex-wrap gap-1 p-1 bg-neutral-800/40 rounded-xl mb-4 border border-white/5', className)}>
      {tabs.map((t) => (
        <Button key={t.key} type="button" onClick={() => go(t.home)} className={tabClass(t.active)} style={{ width: '49%', flexGrow: 1, flexBasis: '45%' }}>
          <Icon as={t.icon} className={cn('w-3.5 h-3.5', t.active ? 'text-black' : 'text-neutral-500')} />
          {t.label}
        </Button>
      ))}
      <Button type="button" onClick={() => go(GLOBAL_ADMIN_HOME)} className={cn(tabClass(globalActive), 'w-full')}>
        <Icon as={Globe} className={cn('w-3.5 h-3.5', globalActive ? 'text-black' : 'text-neutral-500')} />
        Global
      </Button>
    </Div>
  );
}
