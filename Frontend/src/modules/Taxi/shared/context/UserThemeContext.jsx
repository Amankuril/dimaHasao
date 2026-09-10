import React, { createContext, useContext, useEffect } from 'react';

// The taxi user app used to default to a dark palette. The product is now
// light-only, so this provider pins 'light' and the toggle is a no-op. The
// context is kept so existing consumers keep working unchanged.
const UserThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export const UserThemeProvider = ({ children }) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.backgroundColor = '#f6f7fb';
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <UserThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}>
      {children}
    </UserThemeContext.Provider>
  );
};

export const useUserTheme = () => useContext(UserThemeContext);
