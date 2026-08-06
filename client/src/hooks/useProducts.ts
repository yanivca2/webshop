import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiClient';
import type { Product } from '../types/api';

/**
 * Exported as a helper, rather than inlined at the one `useQuery` call site, so
 * that if a test ever needs to read or seed this exact cache entry (e.g.
 * `queryClient.setQueryData(productsQueryKey(), ...)`), it reuses this shape
 * instead of reconstructing it by hand and risking a mismatch that would
 * silently miss the cache.
 */
export function productsQueryKey() {
  return ['products'] as const;
}

export function useProducts() {
  return useQuery({
    queryKey: productsQueryKey(),
    queryFn: ({ signal }) => apiRequest<Product[]>('/api/products', { signal }),
  });
}
