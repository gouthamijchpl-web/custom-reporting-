/** Anything a conditional expression may produce; only non-empty strings survive. */
type ClassValue = string | number | bigint | boolean | null | undefined;

/**
 * Joins conditional class names, dropping anything that is not a usable string.
 *
 * @example cx('button', isActive && 'button--active')
 */
export function cx(...values: ClassValue[]): string {
  return values.filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ');
}
