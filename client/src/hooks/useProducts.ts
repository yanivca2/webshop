import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiClient';
import type { Product } from '../types/api';

export interface ProductFilters {
  search: string;
}

// Trimming here means terms that build the same URL also build the same cache
// key, so they are one entry instead of a duplicate request.
function normalize({ search }: ProductFilters): ProductFilters {
  return { search: search.trim() };
}

// Exported as a helper so tests can build the same key to read or seed the cache.
export function productsQueryKey(filters: ProductFilters) {
  return ['products', normalize(filters)] as const;
}

function buildQuery({ search }: ProductFilters): string {
  const params = new URLSearchParams();
  if (search) {
    params.set('search', search);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useProducts(filters: ProductFilters) {
  const applied = normalize(filters);

  return useQuery({
    queryKey: productsQueryKey(applied),
    queryFn: ({ signal }) =>
      apiRequest<Product[]>(`/api/products${buildQuery(applied)}`, { signal }),
    // Keeps the previous results on screen while the next set loads, to not
    // lose context while new query is loading.
    placeholderData: (previous) => previous,
  });
}
