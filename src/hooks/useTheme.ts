import { useState, useEffect } from 'react';
import { ThemePreference } from '../types';

export function useTheme(initialPreference: ThemePreference = 'auto') {
  const [themePreference, setThemePreference] = useState<ThemePreference>(initialPreference);
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Listen for OS / system dark mode changes in real-time
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    setSystemIsDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Compute effective dark state
  const isDark = themePreference === 'auto' ? systemIsDark : themePreference === 'dark';

  // Apply theme to DOM and meta theme-color
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const metaThemeColor = document.getElementById('meta-theme-color');

    if (isDark) {
      root.classList.add('dark');
      body.classList.add('dark-theme');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', '#0B1324');
      }
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark-theme');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', '#101D32');
      }
    }
  }, [isDark]);

  return {
    themePreference,
    setThemePreference,
    isDark,
    systemIsDark,
  };
}
