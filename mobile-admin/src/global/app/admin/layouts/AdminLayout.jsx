/* Ported from Frontend/src/modules/Global/app/admin/layouts/AdminLayout.jsx. */
/**
 * Global admin shell.
 *
 * The things that are not a module: who the administrators are, and the
 * settings that belong to the platform rather than to food, taxi, hotel or
 * tours. Everything here operates on one shared entity, which is the test for
 * whether something belongs in this section — a commission rate that legitimately
 * differs per module does not.
 */
import React from 'react';
import { ShieldCheck, LifeBuoy, BarChart3, UserCog, ScrollText, Palette, ToggleRight } from 'lucide-react-native';
// The rail is the same markup as the Tours & Festivals panel's on the web.
import PanelShell from '../../../../tours/app/admin/layouts/PanelShell';

const BASE = '/global/admin';
const MENU_ITEMS = [
  { icon: UserCog, label: 'My Profile', path: `${BASE}/profile` },
  { icon: ShieldCheck, label: 'Administrators', path: `${BASE}/administrators` },
  { icon: ToggleRight, label: 'Toggle Management', path: `${BASE}/toggles` },
  { icon: Palette, label: 'Brand & Contact', path: `${BASE}/brand` },
  { icon: ScrollText, label: 'Legal & Policies', path: `${BASE}/legal` },
  { icon: LifeBuoy, label: 'Support', path: `${BASE}/support` },
  { icon: BarChart3, label: 'Reports', path: `${BASE}/reports` },
];

const AdminLayout = () => <PanelShell menuItems={MENU_ITEMS} panelLabel="Global Admin" title="Global Settings" />;
export default AdminLayout;
