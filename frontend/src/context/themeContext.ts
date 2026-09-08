import { createContext } from 'react';

/**
 * Colour scheme for the interface.
 *
 * Defined here rather than in the shared API types because it controls the React UI. The
 * selected value is persisted through the preferences API for the signed-in account.
 */
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

export interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
