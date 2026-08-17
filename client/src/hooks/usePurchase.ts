import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiClient';
import type { BasketItem } from '../basket/basketStore';
import type { PurchaseRequest, PurchaseResponse } from '../types/api';

/**
 * Submits the basket as an order.
 *
 * Only ids and quantities go over the wire - the cached name and price in a
 * `BasketItem` are for rendering, and the server resolves the real values.
 */
export function usePurchase(): UseMutationResult<PurchaseResponse, Error, BasketItem[]> {
  return useMutation<PurchaseResponse, Error, BasketItem[]>({
    mutationFn: (items): Promise<PurchaseResponse> => {
      const body: PurchaseRequest = {
        items: items.map(({ productId, quantity }) => ({ productId, quantity })),
      };

      return apiRequest<PurchaseResponse>('/api/purchases', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  });
}
