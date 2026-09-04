import { ApiErrorCode, type ApiErrorBody } from '@/types';

/**
 * Error thrown by the HTTP client for every non-successful response, so callers can use a
 * single `catch` and inspect a typed object instead of re-reading the response.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, code: string, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  /** Builds an error from a parsed backend error body. */
  static fromBody(status: number, body: Partial<ApiErrorBody> | null): ApiError {
    return new ApiError(
      status,
      body?.code ?? ApiErrorCode.InternalError,
      body?.message ?? 'Something went wrong. Please try again.',
      body?.fieldErrors ?? {},
    );
  }

  /** The server could not be reached; distinct from any response the server sent. */
  static network(): ApiError {
    return new ApiError(
      0,
      ApiErrorCode.NetworkError,
      'Unable to reach the server. Check your connection and try again.',
    );
  }

  get isValidationError(): boolean {
    return this.code === ApiErrorCode.ValidationFailed || Object.keys(this.fieldErrors).length > 0;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  /**
   * Flattens the per-field messages into the shape the form hooks use, keeping only the
   * first message per field so the UI shows one clear line under each input.
   */
  toFieldMessages<TFields extends string>(): Partial<Record<TFields, string>> {
    const messages: Record<string, string> = {};
    for (const [field, fieldMessages] of Object.entries(this.fieldErrors)) {
      const first = fieldMessages[0];
      if (first) {
        messages[field] = first;
      }
    }
    return messages as Partial<Record<TFields, string>>;
  }
}
