import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { Product } from '../types/api';

/**
 * Basket state, held as a Zustand store keyed by productId.
 *
 * Every read goes through a selector - e.g.
 * `useBasketStore(state => state.items[id])` - so a component only
 * re-renders when the specific slice it selected actually changes. Adding
 * one product re-renders that product's own card; the rest of the catalog,
 * and whatever else is on screen, are untouched. Keying by productId also
 * makes every lookup, add, and removal a direct property access rather than
 * a scan over an array.
 */

/** Versioned so a future shape change cannot crash on a stale stored basket. */
export const BASKET_STORAGE_KEY = 'webshop.basket.v1';

/**
 * A product item in the basket.
 *
 * Carries the whole product alongside the id, so a reload paints the basket
 * straight from local storage with nothing to wait for on the network, and an
 * item still shows once its product leaves the catalog. These prices are
 * display-only - the server reprices every purchase.
 *
 * TODO: name/imageUrl/stock have no equivalent reconciliation - unlike price,
 * nothing catches them going stale. Once the catalog is fetched elsewhere
 * (useProducts/useProduct), diff it against matching basket items and notify
 * the user when one of their basket lines no longer matches the catalog.
 */
export interface BasketItem {
  productId: string;
  name: string;
  // Integer count of the currency's smallest unit (e.g. cents), not a decimal amount.
  priceMinorUnits: number;
  imageUrl: string;
  quantity: number;
  // Catalog stock when the item was added. Should be used to limit stock increase.
  stock: number;
}

type BasketItems = Record<string, BasketItem>;

interface PersistedBasket {
  items: BasketItems;
}

interface BasketStoreState extends PersistedBasket {
  add: (product: Product) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

function incrementQuantity(item: BasketItem): BasketItem {
  return { ...item, quantity: Math.min(item.quantity + 1, item.stock) };
}

function removeProduct(items: BasketItems, productId: string): BasketItems {
  const remaining = { ...items };
  delete remaining[productId];
  return remaining;
}

function isBasketItem(value: unknown): value is BasketItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as BasketItem).productId === 'string' &&
    typeof (value as BasketItem).name === 'string' &&
    typeof (value as BasketItem).priceMinorUnits === 'number' &&
    typeof (value as BasketItem).imageUrl === 'string' &&
    typeof (value as BasketItem).quantity === 'number' &&
    typeof (value as BasketItem).stock === 'number'
  );
}

function isBasketItems(value: unknown): value is BasketItems {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(isBasketItem)
  );
}

// Wraps localStorage so a throwing read or write (Safari private mode, quota
// exceeded) falls back to a no-op instead of crashing the app. Shape validation
// against corrupt or stale data happens in `merge` below, since that's where
// zustand hands us the already-parsed, already envelope-unwrapped persisted
// value.
const basketStorage: PersistStorage<PersistedBasket> = {
  getItem: (name): StorageValue<PersistedBasket> | null => {
    try {
      const raw = window.localStorage.getItem(name);
      return raw === null ? null : (JSON.parse(raw) as StorageValue<PersistedBasket>);
    } catch {
      return null;
    }
  },
  setItem: (name, value): void => {
    try {
      window.localStorage.setItem(name, JSON.stringify(value));
    } catch {
      // Quota exceeded or storage disabled. The in-memory value stays
      // correct for this session; only persistence across reloads is lost.
    }
  },
  removeItem: (name): void => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

export const useBasketStore = create<BasketStoreState>()(
  persist(
    (set) => ({
      items: {},

      add: (product) =>
        set((state) => {
          const existing = state.items[product.id];
          if (existing) {
            // Keep item stock updated.
            const refreshed = { ...existing, stock: product.stock };
            return { items: { ...state.items, [product.id]: incrementQuantity(refreshed) } };
          }
          if (product.stock <= 0) {
            return state;
          }
          return {
            items: {
              ...state.items,
              [product.id]: {
                productId: product.id,
                name: product.name,
                priceMinorUnits: product.priceMinorUnits,
                imageUrl: product.imageUrl,
                quantity: 1,
                stock: product.stock,
              },
            },
          };
        }),

      increment: (productId) =>
        set((state) => {
          const existing = state.items[productId];
          return existing
            ? { items: { ...state.items, [productId]: incrementQuantity(existing) } }
            : state;
        }),

      decrement: (productId) =>
        set((state) => {
          const existing = state.items[productId];
          if (!existing) {
            return state;
          }
          if (existing.quantity <= 1) {
            return { items: removeProduct(state.items, productId) };
          }
          return {
            items: { ...state.items, [productId]: { ...existing, quantity: existing.quantity - 1 } },
          };
        }),

      remove: (productId) => set((state) => ({ items: removeProduct(state.items, productId) })),

      clear: () => set({ items: {} }),
    }),
    {
      name: BASKET_STORAGE_KEY,
      storage: basketStorage,
      partialize: (state): PersistedBasket => ({ items: state.items }),
      merge: (persisted, current): BasketStoreState => {
        const candidate = (persisted as Partial<PersistedBasket> | null)?.items;
        return isBasketItems(candidate) ? { ...current, items: candidate } : current;
      },
    },
  ),
);

/** The full basket as a list, for views that render every line (e.g. the basket panel). */
export function useBasketItemList(): BasketItem[] {
  return useBasketStore(useShallow((state) => Object.values(state.items)));
}
