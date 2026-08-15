import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createTestQueryClient, testProduct } from './test/renderWithProviders';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

const products = [testProduct, { ...testProduct, id: '2', name: 'MacBook Air', category: 'Laptops' }];

function routeFetch(url: string): Response {
  const body = url.includes('/api/categories') ? ['Audio', 'Laptops'] : products;
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderApp() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads and lists products from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => Promise.resolve(routeFetch(String(input)))),
    );

    renderApp();

    expect(await screen.findByRole('heading', { name: 'Sony WH-1000XM5' })).toBeInTheDocument();
    expect(screen.getByText('2 products')).toBeInTheDocument();
  });
});
