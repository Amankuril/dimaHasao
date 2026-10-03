import {QueryClient} from '@tanstack/react-query';

/**
 * Query defaults — ported from Frontend/src/app/queryClient.js. Same
 * reasoning applies on RN as it did in the webview: no window-focus storm,
 * freshness comes from staleTime + refetch-on-mount, and reconnect refetch
 * matters even more on a phone that loses signal constantly.
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
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000),
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
