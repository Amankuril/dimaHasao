/* Ported from Frontend/src/modules/Tours/app/admin/layouts/AdminLayout.jsx. */
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
import React from 'react';
import { LayoutDashboard, Package, Calendar, Settings, Ticket, PlusCircle, Star, MapPin, Tag } from 'lucide-react-native';
import PanelShell from './PanelShell';

const BASE = '/tours/admin';
const MENU_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: `${BASE}/dashboard` },
  { icon: Package, label: 'Packages', path: `${BASE}/packages` },
  { icon: PlusCircle, label: 'Create Package', path: `${BASE}/packages/new` },
  { icon: Calendar, label: 'Bookings', path: `${BASE}/bookings` },
  { icon: Ticket, label: 'Festivals', path: `${BASE}/festivals` },
  { icon: Star, label: 'Reviews', path: `${BASE}/reviews` },
  { icon: MapPin, label: 'Tourist Places', path: `${BASE}/destinations` },
  { icon: Tag, label: 'Offers', path: `${BASE}/offers` },
  { icon: Settings, label: 'Settings', path: `${BASE}/settings` },
];

const AdminLayout = () => <PanelShell menuItems={MENU_ITEMS} panelLabel="Tours & Festivals" title="Tours & Festivals" />;
export default AdminLayout;
