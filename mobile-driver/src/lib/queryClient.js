import { QueryClient } from '@tanstack/react-query';

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
    },
    mutations: { retry: 0 },
  },
});

export default queryClient;
