import { useBasketStore } from '../basket/basketStore';
import type { Product } from '../types/api';

/**
 * Basket-derived state shared by every product presentation (card, list row,
 * detail dialog): how many of this product are already in the basket, the
 * `add` action, and whether stock caps further adds. Selecting by this
 * product's own id, rather than reading the whole basket, is what keeps
 * adding one product from re-rendering every other product on screen.
 */
export function useProductBasketState(product: Product) {
  const quantityInBasket = useBasketStore((state) => state.items[product.id]?.quantity ?? 0);
  const add = useBasketStore((state) => state.add);
  const isOutOfStock = product.stock === 0;
  // Reported apart from isOutOfStock, which also satisfies this comparison at
  // a quantity of zero: both block the add, but "you hold all of them" and
  // "there are none" are different things to tell the user.
  const atStockLimit = quantityInBasket >= product.stock;

  return { quantityInBasket, add, isOutOfStock, atStockLimit };
}
