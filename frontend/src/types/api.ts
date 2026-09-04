/**
 * Shapes returned by the backend that are not specific to one feature.
 */

/** Uniform error body produced by the backend exception handler. */
export interface ApiErrorBody {
  timestamp: string;
  status: number;
  error: string;
  code: string;
  message: string;
  path: string;
  /** Present only for validation failures, keyed by request field name. */
  fieldErrors?: Record<string, string[]>;
}

/** Acknowledgement payload for endpoints with nothing else to return. */
export interface MessageResponse {
  message: string;
}

/**
 * Stable error codes shared with the backend. Screens branch on these rather than on
 * message text, which is free to change.
 */
export const ApiErrorCode = {
  ValidationFailed: 'VALIDATION_FAILED',
  InvalidCredentials: 'INVALID_CREDENTIALS',
  AccountLocked: 'ACCOUNT_LOCKED',
  AccountDisabled: 'ACCOUNT_DISABLED',
  EmailAlreadyRegistered: 'EMAIL_ALREADY_REGISTERED',
  Unauthenticated: 'UNAUTHENTICATED',
  AccessDenied: 'ACCESS_DENIED',
  InvalidToken: 'INVALID_TOKEN',
  ResourceNotFound: 'RESOURCE_NOT_FOUND',
  BusinessRuleViolation: 'BUSINESS_RULE_VIOLATION',
  InternalError: 'INTERNAL_ERROR',
  /** Raised by the client itself when the server cannot be reached at all. */
  NetworkError: 'NETWORK_ERROR',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];
