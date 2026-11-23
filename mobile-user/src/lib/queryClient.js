import NetInfo from '@react-native-community/netinfo';
import { QueryClient, onlineManager } from '@tanstack/react-query';

// React Native has no browser online/offline events, so without this
// refetchOnReconnect never fired: a list that failed offline stayed failed
// after the connection came back until the user tapped Retry.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false);
  }),
);

/*
 * The web's query defaults (Frontend/src/app/queryClient.js): first visit
 * loads, later visits paint from cache and refresh quietly behind.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      // Still try (and fail visibly) while offline, as before, rather than
      // pausing on a loading state; the reconnect refetch above recovers it.
      networkMode: 'offlineFirst',
    },
    mutations: { retry: 0 },
  },
});

export default queryClient;
