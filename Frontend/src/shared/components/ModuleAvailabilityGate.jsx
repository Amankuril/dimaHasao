/**
 * Closes a module's whole route tree when it is switched off.
 *
 * Wraps the router rather than each module, so a path nobody thought to gate
 * is still covered — `/food/anything` shows the maintenance screen, not just
 * the handful of screens someone remembered.
 *
 * Admin routes are exempt, because the switch that reopens a module lives
 * behind them.
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useModuleAvailability } from '@/shared/platform/moduleToggles';
import ModuleMaintenance from './ModuleMaintenance';

export default function ModuleAvailabilityGate({ children }) {
  const location = useLocation();
  const { closed, message } = useModuleAvailability(location.pathname);

  if (closed) return <ModuleMaintenance message={message} />;

  return children;
}
