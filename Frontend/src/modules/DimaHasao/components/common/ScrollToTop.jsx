import { useEffect } from 'react';
import { useLocation } from '../../router';

export const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // 1. Scroll main window
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // 2. Scroll all scrollable container elements in mobile frame
    const scrollContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto, [data-scroll-container]');
    scrollContainers.forEach((el) => {
      el.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      el.scrollTop = 0;
    });
  }, [pathname, search]);

  return null;
};
