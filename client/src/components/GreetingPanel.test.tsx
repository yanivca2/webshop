import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GreetingPanel from './GreetingPanel';
import type { GreetingResponse } from '../types/api';

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <GreetingPanel />
    </QueryClientProvider>,
  );
}

function jsonResponse(body: GreetingResponse): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GreetingPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows a loading state, then the greeting from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({ message: 'Hello, world!', generatedAt: '2026-08-06T10:15:30Z' }),
        ),
      ),
    );

    renderPanel();

    expect(screen.getByText('Loading greeting…')).toBeInTheDocument();
    expect(await screen.findByText('Hello, world!')).toBeInTheDocument();
  });

  it('debounces typing before refetching with the new name', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchMock = vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(
        jsonResponse({
          message: String(input).includes('Ada') ? 'Hello, Ada!' : 'Hello, world!',
          generatedAt: '2026-08-06T10:15:30Z',
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderPanel();
    await screen.findByText('Hello, world!');

    await user.type(screen.getByLabelText('Your name'), 'Ada');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(await screen.findByText('Hello, Ada!')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces a server error with a retry affordance', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ status: 500, error: 'Server Error', message: 'boom' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );

    renderPanel();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('boom');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
