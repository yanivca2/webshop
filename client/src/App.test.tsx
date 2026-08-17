import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createTestQueryClient, testProduct } from './test/renderWithProviders';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';

const products = [testProduct, { ...testProduct, id: '2', name: 'MacBook Air', category: 'Laptops' }];

function routeFetch(url: string): Response {
  const body = url.includes('/api/categories') ? ['Audio', 'Laptops'] : products;
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderApp(): RenderResult {
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

    expect(await screen.findByRole('button', { name: 'Sony WH-1000XM5' })).toBeInTheDocument();
    expect(screen.getByText('2 products')).toBeInTheDocument();
  });

  it('opens the detail dialog straight from a deep-linked hash', async () => {
    window.history.replaceState(null, '', '/#product=1');
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/products/1')) {
          return Promise.resolve(
            new Response(JSON.stringify(testProduct), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }
        return Promise.resolve(routeFetch(url));
      }),
    );

    renderApp();

    // Scoped to the dialog: the card title is also a heading with this name.
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('heading', { name: 'Sony WH-1000XM5' })).toBeVisible();
    expect(within(dialog).getByText('$279.99')).toBeInTheDocument();
  });
});
