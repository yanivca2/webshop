import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../types/api';
import { BASKET_STORAGE_KEY, useBasketItemList, useBasketStore, type BasketItem } from './basketStore';

const HEADPHONES_PRICE_MINOR_UNITS = 27999;
const HEADPHONES_MAX_QUANTITY = 3;
const LAPTOP_PRICE_MINOR_UNITS = 129900;
const LAPTOP_MAX_QUANTITY = 5;

const headphones: Product = {
  id: '1',
  name: 'Sony WH-1000XM5',
  description: 'Noise cancelling',
  priceMinorUnits: HEADPHONES_PRICE_MINOR_UNITS,
  category: 'Audio',
  brand: 'Sony',
  stock: HEADPHONES_MAX_QUANTITY,
  imageUrl: 'https://example.test/headphones.jpg',
};

const laptop: Product = {
  id: '2',
  name: 'MacBook Air',
  description: 'Lightweight laptop',
  priceMinorUnits: LAPTOP_PRICE_MINOR_UNITS,
  category: 'Laptops',
  brand: 'Apple',
  stock: LAPTOP_MAX_QUANTITY,
  imageUrl: 'https://example.test/laptop.jpg',
};

function lineFor(product: Product, quantity: number): BasketItem {
  return {
    productId: product.id,
    name: product.name,
    priceMinorUnits: product.priceMinorUnits,
    imageUrl: product.imageUrl,
    quantity,
    stock: product.stock,
  };
}

describe('basketStore', () => {
  beforeEach(() => {
    // The store is a module-level singleton and so, unlike a component-local
    // hook, survives across every test in this file unless reset explicitly.
    useBasketStore.setState({ items: {} });
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('add', () => {
    it('adds a new product as a line of one', () => {
      useBasketStore.getState().add(headphones);

      expect(useBasketStore.getState().items).toEqual({ [headphones.id]: lineFor(headphones, 1) });
    });

    it('increments the existing line instead of duplicating it', () => {
      useBasketStore.getState().add(headphones);
      useBasketStore.getState().add(headphones);

      expect(Object.keys(useBasketStore.getState().items)).toHaveLength(1);
      expect(useBasketStore.getState().items[headphones.id]?.quantity).toBe(2);
    });

    it('keeps a separate line for a different product', () => {
      useBasketStore.getState().add(headphones);
      useBasketStore.getState().add(laptop);

      expect(Object.keys(useBasketStore.getState().items).sort()).toEqual([headphones.id, laptop.id]);
    });

    it('does not add beyond available stock', () => {
      const basketAtStockLimit = { [headphones.id]: lineFor(headphones, HEADPHONES_MAX_QUANTITY) };
      useBasketStore.setState({ items: basketAtStockLimit });

      useBasketStore.getState().add(headphones);

      expect(useBasketStore.getState().items[headphones.id]?.quantity).toBe(HEADPHONES_MAX_QUANTITY);
    });

    it('increments an existing line against the product current stock, not its cached stock', () => {
      // This line was added back when headphones' stock was lower than it is
      // now, and is already capped at that old, lower number.
      const lineAtOldStockLimit = { ...lineFor(headphones, 1), stock: 1 };
      useBasketStore.setState({ items: { [headphones.id]: lineAtOldStockLimit } });

      useBasketStore.getState().add(headphones);

      expect(useBasketStore.getState().items[headphones.id]?.quantity).toBe(2);
      expect(useBasketStore.getState().items[headphones.id]?.stock).toBe(HEADPHONES_MAX_QUANTITY);
    });

    it('does not add an out-of-stock product', () => {
      const outOfStock: Product = { ...headphones, stock: 0 };

      useBasketStore.getState().add(outOfStock);

      expect(useBasketStore.getState().items).toEqual({});
    });
  });

  describe('increment', () => {
    it('increments below the stock ceiling', () => {
      const basketWithOneHeadphones = { [headphones.id]: lineFor(headphones, 1) };
      useBasketStore.setState({ items: basketWithOneHeadphones });

      useBasketStore.getState().increment(headphones.id);

      expect(useBasketStore.getState().items[headphones.id]?.quantity).toBe(2);
    });

    it('clamps at the stock ceiling instead of exceeding it', () => {
      const basketAtStockLimit = { [headphones.id]: lineFor(headphones, HEADPHONES_MAX_QUANTITY) };
      useBasketStore.setState({ items: basketAtStockLimit });

      useBasketStore.getState().increment(headphones.id);

      expect(useBasketStore.getState().items[headphones.id]?.quantity).toBe(HEADPHONES_MAX_QUANTITY);
    });

    it('does nothing for a product that is not in the basket', () => {
      useBasketStore.getState().increment(headphones.id);

      expect(useBasketStore.getState().items).toEqual({});
    });
  });

  describe('decrement', () => {
    it('decrements a line above one', () => {
      const basketWithTwoHeadphones = { [headphones.id]: lineFor(headphones, 2) };
      useBasketStore.setState({ items: basketWithTwoHeadphones });

      useBasketStore.getState().decrement(headphones.id);

      expect(useBasketStore.getState().items[headphones.id]?.quantity).toBe(1);
    });

    it('removes the line when decrementing from one', () => {
      // A zero-quantity row is not a state the basket should reach.
      const basketWithOneHeadphones = { [headphones.id]: lineFor(headphones, 1) };
      useBasketStore.setState({ items: basketWithOneHeadphones });

      useBasketStore.getState().decrement(headphones.id);

      expect(useBasketStore.getState().items).toEqual({});
    });

    it('does nothing for a product that is not in the basket', () => {
      useBasketStore.getState().decrement(headphones.id);

      expect(useBasketStore.getState().items).toEqual({});
    });
  });

  describe('remove', () => {
    it('removes a line outright, leaving other lines untouched', () => {
      const basketWithTwoProducts = {
        [headphones.id]: lineFor(headphones, 4),
        [laptop.id]: lineFor(laptop, 1),
      };
      useBasketStore.setState({ items: basketWithTwoProducts });

      useBasketStore.getState().remove(headphones.id);

      expect(Object.keys(useBasketStore.getState().items)).toEqual([laptop.id]);
    });
  });

  describe('clear', () => {
    it('clears every line', () => {
      const basketWithTwoProducts = {
        [headphones.id]: lineFor(headphones, 2),
        [laptop.id]: lineFor(laptop, 1),
      };
      useBasketStore.setState({ items: basketWithTwoProducts });

      useBasketStore.getState().clear();

      expect(useBasketStore.getState().items).toEqual({});
    });
  });

  describe('useBasketItemList', () => {
    it('lists every basket line', () => {
      const basketWithTwoProducts = {
        [headphones.id]: lineFor(headphones, 1),
        [laptop.id]: lineFor(laptop, 2),
      };
      useBasketStore.setState({ items: basketWithTwoProducts });

      const { result } = renderHook(() => useBasketItemList());

      expect(result.current).toEqual(
        expect.arrayContaining([lineFor(headphones, 1), lineFor(laptop, 2)]),
      );
      expect(result.current).toHaveLength(2);
    });
  });

  // These reach into storage only to arrange a precondition the store can't
  // produce itself; assertions stay on the store's own state.
  describe('persistence', () => {
    it('rehydrates a basket a previous session persisted', async () => {
      // Seeding storage directly, rather than calling add() then resetting
      // in-memory state to simulate "a fresh load," is deliberate: resetting
      // via setState also runs through the persist subscriber, which would
      // immediately overwrite this seeded data with the empty reset before
      // rehydrate() ever got to read it back.
      const previousSessionBasket = { [headphones.id]: lineFor(headphones, 1) };
      window.localStorage.setItem(
        BASKET_STORAGE_KEY,
        JSON.stringify({ state: { items: previousSessionBasket }, version: 0 }),
      );

      await useBasketStore.persist.rehydrate();

      expect(useBasketStore.getState().items[headphones.id]?.quantity).toBe(1);
    });

    it('falls back to an empty basket when stored data is corrupt', async () => {
      const corruptStoredValue = '{not json';
      window.localStorage.setItem(BASKET_STORAGE_KEY, corruptStoredValue);

      await useBasketStore.persist.rehydrate();

      expect(useBasketStore.getState().items).toEqual({});
    });

    it('falls back to an empty basket when stored data is valid JSON of the wrong shape', async () => {
      const wrongShapeStoredValue = { state: { items: 'not an object' }, version: 0 };
      window.localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(wrongShapeStoredValue));

      await useBasketStore.persist.rehydrate();

      expect(useBasketStore.getState().items).toEqual({});
    });

    it('falls back to an empty basket when stored items is an array instead of a keyed object', async () => {
      // items must be a Record<productId, BasketItem>; an array of otherwise
      // valid-looking items should still be rejected as the wrong shape.
      const arrayShapedStoredValue = { state: { items: [lineFor(headphones, 1)] }, version: 0 };
      window.localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(arrayShapedStoredValue));

      await useBasketStore.persist.rehydrate();

      expect(useBasketStore.getState().items).toEqual({});
    });

    it('falls back to an empty basket when reading storage throws', async () => {
      // Safari in private mode can throw on access rather than returning null.
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage disabled');
      });

      await useBasketStore.persist.rehydrate();

      expect(useBasketStore.getState().items).toEqual({});
    });

    it('keeps working in memory when writing to storage throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });

      expect(() => useBasketStore.getState().add(headphones)).not.toThrow();
      expect(useBasketStore.getState().items[headphones.id]?.quantity).toBe(1);
    });
  });
});
