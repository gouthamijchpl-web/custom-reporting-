/**
 * Every route in the application, in one place. Screens and navigation reference these
 * constants instead of literal strings so a path can be changed without hunting for it.
 */
export const RoutePath = {
  root: '/',

  // Public
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',

  // Authenticated
  workspace: '/workspace',
  dataUpload: '/data-upload',
  reports: '/reports',
  settings: '/settings',
} as const;

export type RoutePath = (typeof RoutePath)[keyof typeof RoutePath];

/** Where a user lands after signing in. */
export const DEFAULT_AUTHENTICATED_ROUTE = RoutePath.workspace;
