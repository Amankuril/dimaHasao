/**
 * Operator panel shell.
 *
 * A pending operator can sign in and reach this, but the selling screens are
 * gated until an admin approves them — approval depends on documents they can
 * only supply from inside, so locking them out entirely would be a dead end.
 * The profile/KYC tab stays open for exactly that reason.
 *
 * The gate reads the *live* status from `/operators/me` rather than the session
 * payload: the token is issued while the account is still pending, so trusting
 * the cached copy would keep showing "waiting for approval" long after an admin
 * approved them.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, LayoutDashboard, LogOut, Package, Wallet, Clock, ShieldOff, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';

import operatorService, {
  cacheOperator,
  clearOperatorSession,
  readOperatorUser,
} from '../../../services/operatorService';
import { DEFAULT_BRAND_LOGO } from '@/shared/constants/brandLogo';
import '../toursTheme.css';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/tours/operator/dashboard' },
  { icon: Package, label: 'Packages', path: '/tours/operator/packages' },
  { icon: Calendar, label: 'Bookings', path: '/tours/operator/bookings' },
  { icon: Wallet, label: 'Wallet', path: '/tours/operator/wallet' },
  { icon: UserCog, label: 'Profile & KYC', path: '/tours/operator/profile' },
];

/** Reachable while the account is still pending. */
const OPEN_WHILE_PENDING = ['/tours/operator/profile'];

const OperatorContext = createContext({ operator: null, refresh: () => {} });
export const useOperator = () => useContext(OperatorContext);

const OperatorLayout = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [operator, setOperator] = useState(readOperatorUser());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { operator: fresh } = await operatorService.getProfile();
      cacheOperator(fresh);
      setOperator(fresh);
    } catch (error) {
      if (error?.status === 401 || /token|authoriz/i.test(error?.message || '')) {
        clearOperatorSession();
        navigate('/tours/operator/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { refresh(); }, [refresh]);

  // React Router keeps the scroll offset across route changes, which lands you
  // halfway down the next tab. Reset it per navigation.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  const logout = () => {
    clearOperatorSession();
    toast.success('Signed out');
    navigate('/tours/operator/login', { replace: true });
  };

  const approved = operator?.operatorApprovalStatus === 'approved' && !operator?.isBlocked;
  const gated = !loading && !approved && !OPEN_WHILE_PENDING.some((p) => pathname.startsWith(p));

  return (
    <OperatorContext.Provider value={{ operator, refresh }}>
      <div className="tours-operator">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-5xl mx-auto flex items-center gap-3 px-4 h-16">
            <img src={DEFAULT_BRAND_LOGO} alt="Dima Hasao" className="h-10 w-10 object-contain" />
            <div className="flex flex-col leading-none">
              <span className="text-base font-black tracking-tight">
                <span className="text-[#0a4d2b]">Dima</span> <span className="text-amber-600">Hasao</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-1">
                Tour Operator
              </span>
            </div>

            <div className="flex-1" />

            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {operator?.agencyName || operator?.name || 'Operator'}
              </p>
              <p className="text-[10px] text-gray-400">{operator?.phone}</p>
            </div>
            <button type="button" onClick={logout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>

          <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-[#0a4d2b] text-[#0a4d2b]'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`
                }
              >
                <item.icon size={16} /> {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6 pb-20">
          {loading ? (
            <p className="text-sm text-gray-400 py-16 text-center">Loading…</p>
          ) : gated ? (
            <PendingApproval
              status={operator?.isBlocked ? 'blocked' : operator?.operatorApprovalStatus}
              reason={operator?.rejectionReason}
            />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </OperatorContext.Provider>
  );
};

/** Shown instead of the working screens until an admin approves the account. */
export const PendingApproval = ({ status, reason }) => {
  const blocked = status === 'blocked';
  const rejected = status === 'rejected';
  const Icon = blocked ? ShieldOff : Clock;

  return (
    <div className="to-card p-8 text-center max-w-lg mx-auto">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
        blocked || rejected ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
      }`}>
        <Icon size={26} />
      </div>
      <h2 className="text-xl font-bold text-gray-900">
        {blocked ? 'Your account is suspended'
          : rejected ? 'Your registration was not approved'
            : 'Waiting for approval'}
      </h2>
      <p className="text-sm text-gray-500 mt-2">
        {blocked ? 'Please contact support to have it reinstated.'
          : rejected ? (reason || 'Please contact support to find out what is needed.')
            : 'An admin is reviewing your agency. Fill in your profile and KYC in the meantime — packages and bookings unlock once you are approved.'}
      </p>
      {!blocked && (
        <NavLink to="/tours/operator/profile" className="to-btn mt-5 inline-flex">
          <UserCog size={16} /> Complete your profile
        </NavLink>
      )}
    </div>
  );
};

export default OperatorLayout;
