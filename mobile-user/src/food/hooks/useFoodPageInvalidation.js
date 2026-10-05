import { useEffect } from "react";
import { FOOD_PAGE_INVALIDATE_EVENT } from '../utils/foodPageCache';
import { events } from '../../lib/events';

/**
 * Subscribe to global food page invalidation (location/zone/auth changes).
 */
export function useFoodPageInvalidation(onInvalidate) {
  useEffect(() => {
    if (typeof onInvalidate !== "function") return undefined;

    const handler = (event) => {
      onInvalidate(event?.detail || {});
    };

    events.on(FOOD_PAGE_INVALIDATE_EVENT, handler);
    return () => events.off(FOOD_PAGE_INVALIDATE_EVENT, handler);
  }, [onInvalidate]);
}
