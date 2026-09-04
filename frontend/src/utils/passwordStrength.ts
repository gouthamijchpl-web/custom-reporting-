import { PASSWORD_MIN_LENGTH } from './validation';

export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  label: string;
  /** 0-4, drives the segmented meter under the password field. */
  score: number;
}

const LABELS: Record<PasswordStrengthLevel, string> = {
  empty: '',
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

/**
 * Scores a candidate password for the strength meter.
 *
 * This is guidance for the user, not an access decision — the backend policy check is
 * what actually accepts or rejects the password.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return { level: 'empty', label: LABELS.empty, score: 0 };
  }

  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (password.length >= 14) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const level: PasswordStrengthLevel =
    score <= 1 ? 'weak' : score === 2 ? 'fair' : score === 3 ? 'good' : 'strong';

  return { level, label: LABELS[level], score: Math.min(score, 4) };
}
