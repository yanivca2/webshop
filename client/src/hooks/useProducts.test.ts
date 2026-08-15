import { describe, expect, it } from 'vitest';
import { productsQueryKey } from './useProducts';

describe('productsQueryKey', () => {
  it('returns the same key regardless of the category insertion order', () => {
    // Arrange + Act - the panel appends in click order, so the same two
    // categories arrive either way round.
    const audioFirst = productsQueryKey({ search: '', categories: ['Audio', 'Laptops'] });
    const laptopsFirst = productsQueryKey({ search: '', categories: ['Laptops', 'Audio'] });

    // Assert - one key is one cache entry, so the second apply is served from
    // the first instead of going back to the server.
    expect(audioFirst).toEqual(laptopsFirst);
  });

  it('returns a different key for a different category selection', () => {
    // Arrange + Act
    const both = productsQueryKey({ search: '', categories: ['Audio', 'Laptops'] });
    const one = productsQueryKey({ search: '', categories: ['Audio'] });

    // Assert
    expect(both).not.toEqual(one);
  });

  it('ignores the whitespace around a search term', () => {
    // Arrange + Act
    const padded = productsQueryKey({ search: '  sony  ', categories: [] });

    // Assert
    expect(padded).toEqual(productsQueryKey({ search: 'sony', categories: [] }));
  });
});
