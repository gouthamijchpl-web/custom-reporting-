import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tracks a CSS media query from TypeScript, so layout behaviour that cannot be expressed
 * in CSS alone (such as which navigation component to render) stays in sync with the
 * breakpoints used in the stylesheets.
 *
 * Backed by `useSyncExternalStore` rather than state plus an effect: the match is read
 * straight from the browser during render, so there is no first paint at the wrong
 * breakpoint and no re-render just to catch up with reality.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', onChange);
      return () => mediaQueryList.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // Server-rendered output has no viewport; assume the query does not match.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Breakpoints shared by the layout components and the stylesheets. */
export const Breakpoint = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
} as const;
