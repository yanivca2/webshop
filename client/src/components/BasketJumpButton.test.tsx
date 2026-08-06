import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBasketStore } from '../basket/basketStore';
import BasketPanel from './BasketPanel';
import { renderWithProviders } from '../test/renderWithProviders';

// Queried by role alone, never by name since hidden elements always considered
// as nameless.
describe('BasketJumpButton', () => {
  beforeEach(() => {
    useBasketStore.setState({ items: {} });
    window.localStorage.clear();
  });

  it('points at an id the basket actually has', () => {
    // Rendered through its owner, which is the only place it appears - that is
    // also what puts it inside the element declaring the view-timeline.
    renderWithProviders(<BasketPanel />);

    const href = screen.getByRole('link', { hidden: true }).getAttribute('href');
    const target = document.querySelector(`#${CSS.escape(href!.slice(1))}`);

    expect(target).toBe(screen.getByRole('complementary', { name: 'Basket' }));
  });
});
