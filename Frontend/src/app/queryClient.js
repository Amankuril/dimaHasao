import { QueryClient } from '@tanstack/react-query';

/**
 * Query defaults for this app.
 *
 * The behaviour we are after: the first visit to a screen loads, every later
 * visit paints instantly from cache with no spinner, and a refresh happens
 * quietly behind it. React Query does that out of the box — `data` is returned
 * synchronously on remount, so `isLoading` is only ever true when there is
 * genuinely nothing to show. The defaults below are the ones that needed
 * changing for a webview.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * How long a result is treated as current. Inside this window a revisit
       * costs nothing at all; past it the cached data is still shown instantly
       * and a refresh runs behind the screen.
       */
      staleTime: 60 * 1000,

      /**
       * How long an unused result stays in memory. This is what makes going
       * back to a screen instant rather than a fresh load, so it is well past
       * the default five minutes — a person moving around the app for half an
       * hour should never see the same list load twice.
       */
      gcTime: 30 * 60 * 1000,

      /**
       * OFF, deliberately, and this is the important one.
       *
       * React Query refetches on window focus by default, which is sensible in
       * a desktop tab and wrong inside the Flutter wrapper: there `focus` fires
       * on every tap into a field, every dismissed keyboard, every return from
       * the camera or a payment sheet. Left on, it would put the whole app back
       * into the request storm that the taxi driver screens were just fixed for.
       *
       * Freshness comes from `staleTime` plus the refetch on mount instead.
       */
      refetchOnWindowFocus: false,

      /**
       * ON: coming back from no connection is exactly when a refetch is worth
       * making, and phones lose signal constantly.
       */
      refetchOnReconnect: true,

      /**
       * Refetch when a screen mounts, but only if the data is stale. This is
       * what gives "instant, then quietly updated": the cached result paints
       * first and the response replaces it when it lands.
       */
      refetchOnMount: true,

      /**
       * One retry, not three. On a bad connection three retries with backoff
       * means a screen that sits there for many seconds before admitting it
       * failed, and the person is better served by an error they can act on.
       */
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
