import React, { createContext, useContext, useEffect } from 'react';

export type ThemeMode = 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode?: string) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeMode: ThemeMode = 'dark';

  const setThemeMode = (_mode?: string) => {
    // Permanent Dark Mode: light mode is disabled per user mandate
    localStorage.setItem('app_theme_mode', 'dark');
  };

  const toggleTheme = () => {
    // No-op: Only dark mode is active
    localStorage.setItem('app_theme_mode', 'dark');
  };

  useEffect(() => {
    localStorage.setItem('app_theme_mode', 'dark');
    const root = document.documentElement;
    root.classList.remove('light', 'theme-light', 'theme-night');
    root.classList.add('dark', 'theme-dark');
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themeMode: 'dark',
        setThemeMode,
        toggleTheme,
        isDark: true,
        isLight: false,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
