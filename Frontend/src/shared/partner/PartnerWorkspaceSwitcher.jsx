/**
 * Switch between the two businesses one partner runs.
 *
 * Renders only when both profiles exist — a partner with one business should
 * never see a tab bar with one tab. The two dashboards live under different
 * route roots (/food/restaurant and /hotel/partner), so switching is an
 * ordinary navigation; both are lazy chunks of the same app.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { Store, Building2 } from 'lucide-react';
import {
  hasBothProfiles,
  setActiveWorkspace,
  WORKSPACE,
  WORKSPACE_HOME,
} from './partnerSession';

const TABS = [
  { id: WORKSPACE.RESTAURANT, label: 'Restaurant', Icon: Store },
  { id: WORKSPACE.HOTEL, label: 'Hotel', Icon: Building2 },
];

export default function PartnerWorkspaceSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();

  if (!hasBothProfiles()) return null;

  const active = location.pathname.startsWith('/hotel')
    ? WORKSPACE.HOTEL
    : WORKSPACE.RESTAURANT;

  const go = (id) => {
    if (id === active) return;
    setActiveWorkspace(id);
    navigate(WORKSPACE_HOME[id]);
  };

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-3xl gap-2">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = id === active;

          return (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
