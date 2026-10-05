import { createContext, useContext } from 'react';

// The taxi user app is light-only; the web provider pins 'light' and the toggle is a no-op.
const value = { theme: 'light', toggleTheme: () => {} };
const UserThemeContext = createContext(value);

export const UserThemeProvider = ({ children }) => <UserThemeContext.Provider value={value}>{children}</UserThemeContext.Provider>;

export const useUserTheme = () => useContext(UserThemeContext);
