/**
 * Client-side field validation.
 *
 * These rules mirror the backend constraints so users get immediate feedback, but they
 * are a convenience only: the server validates every request independently and its
 * response is what ultimately decides whether a request succeeds.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 15;
export const FULL_NAME_MIN_LENGTH = 2;
export const FULL_NAME_MAX_LENGTH = 120;

/** Pragmatic address check; the authoritative check is the backend @Email constraint. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateRequired(value: string, label: string): string | undefined {
  return value.trim().length === 0 ? `${label} is required.` : undefined;
}

export function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Email address is required.';
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Enter a valid email address.';
  }
  if (trimmed.length > 254) {
    return 'Email address is too long.';
  }
  return undefined;
}

export function validateFullName(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Full name is required.';
  }
  if (trimmed.length < FULL_NAME_MIN_LENGTH || trimmed.length > FULL_NAME_MAX_LENGTH) {
    return `Full name must be between ${FULL_NAME_MIN_LENGTH} and ${FULL_NAME_MAX_LENGTH} characters.`;
  }
  return undefined;
}

/** Presence only — used on sign-in, where the policy must not be advertised. */
export function validatePasswordPresence(value: string): string | undefined {
  return value.length === 0 ? 'Password is required.' : undefined;
}

/** Full policy check — used wherever a new password is being chosen. */
export function validateNewPassword(value: string): string | undefined {
  if (value.length === 0) {
    return 'Password is required.';
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (!/[A-Z]/.test(value)) {
    return 'Password must include an uppercase letter.';
  }
  if (!/[a-z]/.test(value)) {
    return 'Password must include a lowercase letter.';
  }
  if (!/[0-9]/.test(value)) {
    return 'Password must include a number.';
  }
  return undefined;
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | undefined {
  if (confirmation.length === 0) {
    return 'Please confirm your password.';
  }
  return password !== confirmation ? 'Passwords do not match.' : undefined;
}
