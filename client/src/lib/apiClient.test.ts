import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, apiRequest } from './apiClient';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** apiRequest always normalizes headers into a Headers instance before calling fetch. */
function headersOf(init: RequestInit | undefined): Headers {
  return new Headers(init?.headers);
}

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the parsed body on success', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse([{ id: 1 }]))));

    await expect(apiRequest('/api/products')).resolves.toEqual([{ id: 1 }]);
  });

  it('resolves to undefined when a successful response has no body', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))));

    await expect(apiRequest('/api/purchases')).resolves.toBeUndefined();
  });

  it('throws the server ApiError message so the UI can show it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({ status: 404, error: 'Not Found', message: 'No product with id 9999' }, 404),
        ),
      ),
    );

    await expect(apiRequest('/api/products/9999')).rejects.toThrowError(
      new ApiRequestError(404, 'No product with id 9999'),
    );
  });

  it('falls back to status text when the error body is not JSON', async () => {
    // A proxy or a crash can return HTML; parsing must not throw over the throw.
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response('<html>502</html>', { status: 502, statusText: 'Bad Gateway' })),
      ),
    );

    await expect(apiRequest('/api/products')).rejects.toThrowError('Bad Gateway');
  });

  it('falls back to status text when the error body is missing required ApiError fields', async () => {
    // A body with status/message but no `error` is not a real ApiError - accepting
    // it anyway would mean any malformed error payload gets treated as genuine.
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ status: 404, message: 'No product with id 9999' }), {
            status: 404,
            statusText: 'Not Found',
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );

    await expect(apiRequest('/api/products/9999')).rejects.toThrowError('Not Found');
  });

  it('sets a JSON content type only when there is a body', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(jsonResponse({})),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/products');
    expect(headersOf(fetchMock.mock.calls[0]?.[1]).get('Content-Type')).toBeNull();

    await apiRequest('/api/purchases', { method: 'POST', body: '{}' });
    expect(headersOf(fetchMock.mock.calls[1]?.[1]).get('Content-Type')).toBe('application/json');
  });

  it('normalizes headers passed as a Headers instance instead of dropping them', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(jsonResponse({})),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/products', { headers: new Headers({ Authorization: 'Bearer token' }) });

    expect(headersOf(fetchMock.mock.calls[0]?.[1]).get('Authorization')).toBe('Bearer token');
  });

  it('normalizes headers passed as a tuple array instead of dropping them', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(jsonResponse({})),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/products', { headers: [['Authorization', 'Bearer token']] });

    expect(headersOf(fetchMock.mock.calls[0]?.[1]).get('Authorization')).toBe('Bearer token');
  });
});
