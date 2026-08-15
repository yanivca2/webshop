import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiClient';

/**
 * Categories come from their own endpoint rather than being derived from the
 * product list: deriving them would shrink the filter options as the user
 * filters, making it impossible to switch to a category you had filtered out.
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => apiRequest<string[]>('/api/categories', { signal }),
    staleTime: Infinity,
  });
}
