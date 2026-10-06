import { createContext, useContext } from 'react';
import { useDeliveryNotifications } from './hooks/useDeliveryNotifications';
import { useRiderLocationSync } from './hooks/useRiderLocationSync';

// Web: components/DeliveryRealtimeShell.jsx. Keeps the socket and order queue
// alive across every signed-in delivery screen.
const DeliveryNotificationsContext = createContext(null);

export function useDeliveryNotificationsContext() {
  const ctx = useContext(DeliveryNotificationsContext);
  if (!ctx) throw new Error('useDeliveryNotificationsContext must be used within DeliveryRealtimeShell');
  return ctx;
}

export function DeliveryRealtimeShell({ children }) {
  const notifications = useDeliveryNotifications();
  useRiderLocationSync();
  return <DeliveryNotificationsContext.Provider value={notifications}>{children}</DeliveryNotificationsContext.Provider>;
}
