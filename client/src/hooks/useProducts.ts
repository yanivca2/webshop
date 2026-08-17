import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiClient';
import type { Product } from '../types/api';

export interface ProductFilters {
  search: string;
  categories: string[];
}

// Trimming here means filters that build the same URL also build the same cache
// key, so they are one entry instead of a duplicate request.
//
// Categories are sorted because the key hash keeps array order: ticking Audio
// then Laptops and ticking them the other way round are the same filter, and
// without this they would be two cache entries and a second request.
function normalize({ search, categories }: ProductFilters): ProductFilters {
  return { search: search.trim(), categories: [...categories].sort((a, b) => a.localeCompare(b)) };
}

export type ProductsQueryKey = readonly ['products', ProductFilters];

// Exported as a helper so tests can build the same key to read or seed the cache.
export function productsQueryKey(filters: ProductFilters): ProductsQueryKey {
  return ['products', normalize(filters)] as const;
}

function buildQuery({ search, categories }: ProductFilters): string {
  const params = new URLSearchParams();
  if (search) {
    params.set('search', search);
  }
  for (const category of categories) {
    params.append('categories', category);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useProducts(filters: ProductFilters): UseQueryResult<Product[], Error> {
  const applied = normalize(filters);

  return useQuery({
    queryKey: productsQueryKey(applied),
    queryFn: ({ signal }): Promise<Product[]> =>
      apiRequest<Product[]>(`/api/products${buildQuery(applied)}`, { signal }),
    // Keeps the previous results on screen while the next set loads, to not
    // lose context while new query is loading.
    placeholderData: (previous): Product[] | undefined => previous,
  });
}
