import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** Calls fn when the app returns to the foreground (web: visibilitychange -> visible). */
export function useOnForeground(fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let prev = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (prev.match(/inactive|background/) && next === 'active') ref.current?.();
      prev = next;
    });
    return () => sub.remove();
  }, []);
}
