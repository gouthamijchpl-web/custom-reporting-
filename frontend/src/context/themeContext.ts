import { createContext } from 'react';

/**
 * Colour scheme for the interface.
 *
 * Defined here rather than in the shared API types because the theme is now purely a
 * client-side concern — it is remembered in the browser and never sent to the backend.
 */
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

export interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
