import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import type { Product } from '../types/api';

/**
 * Test-only helpers and fixtures. Nothing in this file ships in the app -
 * it exists purely to keep test setup (providers, mock data, response
 * helpers) consistent and out of individual test files.
 */

// Retries are off so error-state assertions resolve immediately
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

export interface ProvidersRenderResult extends RenderResult {
  /** The client backing this render, so a test can seed or inspect the cache. */
  queryClient: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): ProvidersRenderResult {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}

export const testProduct: Product = {
  id: '1',
  name: 'Sony WH-1000XM5',
  description: 'Industry-leading noise cancelling.',
  priceMinorUnits: 27999,
  category: 'Audio',
  brand: 'Sony',
  stock: 3,
  imageUrl: 'https://example.test/headphones.jpg',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
