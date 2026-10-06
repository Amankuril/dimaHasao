import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/** true while the device reports no connection (web: the `offline` event). */
export function useOffline() {
  const [offline, setOffline] = useState(false);
  useEffect(
    () =>
      NetInfo.addEventListener((s) => {
        setOffline(s.isConnected === false || s.isInternetReachable === false);
      }),
    [],
  );
  return offline;
}
