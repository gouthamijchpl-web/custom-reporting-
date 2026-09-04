import { ApiError } from './ApiError';
import { tokenStore } from './tokenStore';
import type { ApiErrorBody, AuthenticationResponse } from '@/types';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const REFRESH_PATH = '/auth/refresh';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  /** Serialised as JSON when present. */
  body?: unknown;
  /** Attach the bearer token and retry once after a silent refresh. Defaults to true. */
  authenticated?: boolean;
  signal?: AbortSignal;
}

/**
 * Shared in-flight refresh. Several requests failing with 401 at the same time must
 * trigger exactly one refresh call and then all retry with the same new token.
 */
let refreshInFlight: Promise<string> | null = null;

/**
 * The single place where the application talks to the backend.
 *
 * Responsibilities kept here so no screen has to repeat them: base URL, JSON encoding,
 * bearer header, credentialed requests so the refresh cookie is sent, uniform error
 * translation, and transparent re-authentication when an access token expires.
 */
async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const { method = 'GET', body, authenticated = true, signal } = options;

  const response = await send(path, method, body, authenticated, signal);

  if (response.status === 401 && authenticated && path !== REFRESH_PATH) {
    const refreshed = await tryRefresh();
    if (!refreshed) {
      tokenStore.notifySessionExpired();
      throw await toApiError(response);
    }
    const retried = await send(path, method, body, authenticated, signal);
    return handleResponse<TResponse>(retried);
  }

  return handleResponse<TResponse>(response);
}

async function send(
  path: string,
  method: HttpMethod,
  body: unknown,
  authenticated: boolean,
  signal: AbortSignal | undefined,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const token = tokenStore.get();
  if (authenticated && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      // Required so the browser sends and stores the httpOnly refresh cookie.
      credentials: 'include',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw ApiError.network();
  }
}

/** @returns true when a new access token was obtained */
async function tryRefresh(): Promise<boolean> {
  refreshInFlight ??= refreshAccessToken().finally(() => {
    refreshInFlight = null;
  });

  try {
    const token = await refreshInFlight;
    tokenStore.set(token);
    return true;
  } catch {
    return false;
  }
}

async function refreshAccessToken(): Promise<string> {
  const response = await send(REFRESH_PATH, 'POST', undefined, false, undefined);
  const session = await handleResponse<AuthenticationResponse>(response);
  return session.accessToken;
}

async function handleResponse<TResponse>(response: Response): Promise<TResponse> {
  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return undefined as TResponse;
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/json')) {
    return undefined as TResponse;
  }
  return (await response.json()) as TResponse;
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> | null = null;
  try {
    body = (await response.clone().json()) as Partial<ApiErrorBody>;
  } catch {
    // Not a JSON body (a proxy error page, an empty response); fall back to defaults.
  }
  return ApiError.fromBody(response.status, body);
}

export const httpClient = {
  get: <TResponse>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<TResponse>(path, { ...options, method: 'GET' }),

  post: <TResponse>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<TResponse>(path, { ...options, method: 'POST', body }),

  put: <TResponse>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<TResponse>(path, { ...options, method: 'PUT', body }),

  patch: <TResponse>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<TResponse>(path, { ...options, method: 'PATCH', body }),

  delete: <TResponse>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<TResponse>(path, { ...options, method: 'DELETE' }),
};
