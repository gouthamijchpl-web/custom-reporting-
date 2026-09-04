import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext, type ThemeContextValue, type ThemePreference } from './themeContext';

const STORAGE_KEY = 'custom-reporting.theme';
const DEFAULT_THEME: ThemePreference = 'SYSTEM';

/**
 * Applies the selected colour scheme to the document.
 *
 * The choice is remembered in localStorage, which is also what paints the correct theme on
 * the very first frame after a reload. It follows the operating system unless changed.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => readCachedTheme());

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme.toLowerCase();
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode, blocked cookies); the theme still applies.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function readCachedTheme(): ThemePreference {
  try {
    const cached = window.localStorage.getItem(STORAGE_KEY);
    if (cached === 'LIGHT' || cached === 'DARK' || cached === 'SYSTEM') {
      return cached;
    }
  } catch {
    // Ignore and fall through to the default.
  }
  return DEFAULT_THEME;
}
