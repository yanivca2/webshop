import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiClient';
import type { Product } from '../types/api';

/**
 * Single product, for the detail dialog. Disabled when no id is selected so
 * closing the dialog also cancels pending request.
 */
export function useProduct(productId: string | null): UseQueryResult<Product, Error> {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: ({ signal }): Promise<Product> =>
      apiRequest<Product>(`/api/products/${productId}`, { signal }),
    enabled: productId !== null,
  });
}
