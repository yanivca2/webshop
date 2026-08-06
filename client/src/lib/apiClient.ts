import type { ApiError } from '../types/api';

/**
 * An error carrying the server's `ApiError` message, so the UI can show what
 * actually went wrong instead of a generic failure string.
 */
export class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

/**
 * `fetch` wrapper for the JSON API. Callers pass the TanStack Query `signal`
 * so an in-flight request is aborted when its query is cancelled.
 */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  // RequestInit['headers'] accepts a Headers instance, a [string, string][]
  // tuple array, or a plain object - spreading it (`...init?.headers`) only
  // works for the plain-object case and silently drops the other two. Route
  // everything through Headers so all three shapes merge correctly, with the
  // caller's headers taking priority over our defaults.
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  if (init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));

  const response = await fetch(path, { ...init, headers });

  if (!response.ok) {
    throw await toRequestError(response);
  }

  // A 204, or any 2xx with an empty body, has nothing to parse - response.json()
  // throws a raw SyntaxError on empty input, which would bypass the
  // ApiRequestError handling above entirely. Read as text first so an empty
  // body resolves to undefined instead of throwing.
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.status === 'number' &&
    typeof candidate.error === 'string' &&
    typeof candidate.message === 'string'
  );
}

/**
 * Reads the server's error body when there is one. A failing response is not
 * guaranteed to be JSON - a proxy or a crash can return HTML - so a parse
 * failure falls back to the status text rather than throwing over the throw.
 */
async function toRequestError(response: Response): Promise<ApiRequestError> {
  try {
    const body: unknown = await response.json();
    if (isApiError(body)) {
      return new ApiRequestError(body.status, body.message);
    }
  } catch {
    // Body was absent or not JSON; fall through to the status-based message.
  }
  return new ApiRequestError(response.status, response.statusText || 'Request failed');
}
