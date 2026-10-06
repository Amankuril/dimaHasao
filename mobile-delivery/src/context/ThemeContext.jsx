import { createContext, useContext, useMemo } from 'react';
import { buildTheme, DEFAULT_PRIMARY } from '../theme';

const ThemeContext = createContext(buildTheme(DEFAULT_PRIMARY));

export function ThemeProvider({ children, primary = DEFAULT_PRIMARY }) {
  const theme = useMemo(() => buildTheme(primary), [primary]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useStyles(factory) {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
