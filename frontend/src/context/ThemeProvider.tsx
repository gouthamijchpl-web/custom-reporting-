import { useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useCloudPreference } from '@/hooks/useCloudPreference';
import { ThemeContext, type ThemeContextValue, type ThemePreference } from './themeContext';

const DEFAULT_THEME: ThemePreference = 'SYSTEM';

/**
 * Applies the selected colour scheme to the document.
 *
 * The choice is stored per account in Supabase and follows the operating system unless
 * changed.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [storedTheme, setThemeState] = useCloudPreference<ThemePreference>('appearance.theme', DEFAULT_THEME);
  const theme = storedTheme === 'LIGHT' || storedTheme === 'DARK' || storedTheme === 'SYSTEM'
    ? storedTheme
    : DEFAULT_THEME;

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme.toLowerCase();
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
  }, [setThemeState]);

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
