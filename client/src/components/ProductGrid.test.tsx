import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBasketStore } from '../basket/basketStore';
import ProductGrid from './ProductGrid';
import { renderWithProviders, testProduct } from '../test/renderWithProviders';

const SONY = 'Sony WH-1000XM5';
const MACBOOK = 'MacBook Air';

const twoProducts = [testProduct, { ...testProduct, id: '2', name: MACBOOK }];

function renderGrid(props: Partial<ComponentProps<typeof ProductGrid>> = {}) {
  return renderWithProviders(
    <ProductGrid
      products={undefined}
      isPending={false}
      isError={false}
      error={null}
      isOffline={false}
      isFiltered={false}
      onRetry={vi.fn()}
      onOpenDetail={vi.fn()}
      {...props}
    />,
  );
}

describe('ProductGrid', () => {
  beforeEach(() => {
    // The basket store is a module-level singleton, so it survives between
    // tests unless reset.
    useBasketStore.setState({ items: {} });
    window.localStorage.clear();
  });

  it('marks the list busy while loading', () => {
    // Arrange + Act
    renderGrid({ isPending: true });

    // Assert
    expect(screen.getByRole('list', { name: 'Loading products' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('shows a card for every product', () => {
    // Arrange + Act
    renderGrid({ products: twoProducts });

    // Assert
    expect(screen.getByRole('button', { name: SONY })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: MACBOOK })).toBeInTheDocument();
  });

  it('counts the products above the grid', () => {
    // Arrange + Act
    renderGrid({ products: twoProducts });

    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('2 products');
  });

  it('shows the server message when loading fails', () => {
    // Arrange + Act
    renderGrid({ isError: true, error: new Error('Service unavailable') });

    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent('Service unavailable');
  });

  it('retries when the Retry button is pressed', async () => {
    // Arrange
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderGrid({ isError: true, error: new Error('Service unavailable'), onRetry });

    // Act
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    // Assert
    expect(onRetry).toHaveBeenCalled();
  });

  it('says the catalog is empty when there are no products', () => {
    // Arrange + Act
    renderGrid({ products: [] });

    // Assert
    expect(screen.getByText('No products available')).toBeInTheDocument();
  });

  it("shows 'no products found' when all products are filtered out", () => {
    // Arrange + Act
    renderGrid({ products: [], isFiltered: true });

    // Assert - a different problem from an empty catalog, so a different
    // message.
    expect(screen.getByText('No products match your filters')).toBeInTheDocument();
  });

  it('shows an offline message when pending and offline', () => {
    // Arrange + Act
    renderGrid({ isPending: true, isOffline: true });

    // Assert
    expect(screen.getByText('You are offline')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Loading products' })).not.toBeInTheDocument();
  });

  it('keeps the products it already has while offline', () => {
    // Arrange + Act
    renderGrid({ products: [testProduct], isOffline: true });

    // Assert
    expect(screen.getByRole('button', { name: SONY })).toBeInTheDocument();
  });

  it('explains the pause in a line above the grid while offline', () => {
    // Arrange + Act
    renderGrid({ products: [testProduct], isOffline: true });

    // Assert - a line, not the full panel, which would take the products away.
    expect(screen.getByText(/catch up on its own/i)).toBeInTheDocument();
    expect(screen.queryByText('You are offline')).not.toBeInTheDocument();
  });

  it('shows how many of a product are already in the basket', async () => {
    // Arrange
    const user = userEvent.setup();
    renderGrid({ products: [testProduct] });

    // Act
    await user.click(screen.getByRole('button', { name: 'Add to basket' }));

    // Assert
    expect(await screen.findByText('1 in basket')).toBeInTheDocument();
  });
});
