import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBasketStore } from '../basket/basketStore';
import ProductItem from './ProductItem';
import {
  renderWithProviders,
  testProduct,
  type ProvidersRenderResult,
} from '../test/renderWithProviders';

function seedBasket(quantity: number): void {
  useBasketStore.setState({
    items: {
      [testProduct.id]: {
        productId: testProduct.id,
        name: testProduct.name,
        priceMinorUnits: testProduct.priceMinorUnits,
        imageUrl: testProduct.imageUrl,
        quantity,
        stock: testProduct.stock,
      },
    },
  });
}

function renderItem(onOpenDetail = vi.fn()): ProvidersRenderResult {
  return renderWithProviders(
    <ul>
      <ProductItem product={testProduct} viewMode="cards" onOpenDetail={onOpenDetail} />
    </ul>,
  );
}

describe('ProductItem', () => {
  beforeEach(() => {
    // The store is a module-level singleton and so, unlike the props this
    // component used to receive, survives across tests unless reset here.
    useBasketStore.setState({ items: {} });
    window.localStorage.clear();
  });

  it('shows the name, price, description, brand, category and image', () => {
    renderItem();

    expect(screen.getByRole('button', { name: 'Sony WH-1000XM5' })).toBeInTheDocument();
    expect(screen.getByText('$279.99')).toBeInTheDocument();
    expect(screen.getByText('Industry-leading noise cancelling.')).toBeInTheDocument();
    // Brand and category are separate elements; the dot between them is CSS.
    expect(screen.getByText('Sony')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sony WH-1000XM5' })).toHaveAttribute(
      'src',
      testProduct.imageUrl,
    );
  });

  it('adds the product when the add button is pressed', async () => {
    const user = userEvent.setup();
    renderItem();

    await user.click(screen.getByRole('button', { name: 'Add to basket' }));

    expect(useBasketStore.getState().items[testProduct.id]?.quantity).toBe(1);
  });

  it('opens the detail view from the product title', async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();
    renderItem(onOpenDetail);

    await user.click(screen.getByRole('button', { name: 'Sony WH-1000XM5' }));

    expect(onOpenDetail).toHaveBeenCalledWith('1');
  });

  it('reports how many are already in the basket', () => {
    seedBasket(2);
    renderItem();

    expect(screen.getByText('2 in basket')).toBeInTheDocument();
    expect(screen.getByText('3 in stock')).toBeInTheDocument();
  });

  it('disables adding once the basket holds all remaining stock', () => {
    seedBasket(3);
    renderItem();

    expect(screen.getByRole('button', { name: 'Max in basket' })).toBeDisabled();
  });

  it("shows an 'Out of stock' message when the product inital amount is 0", () => {
    renderWithProviders(
      <ul>
        <ProductItem
          product={{ ...testProduct, stock: 0 }}
          viewMode="cards"
          onOpenDetail={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByRole('button', { name: 'Out of stock' })).toBeDisabled();
  });

  it('falls back to a placeholder when the image fails to load', async () => {
    renderItem();

    const image = screen.getByRole('img', { name: 'Sony WH-1000XM5' });
    image.dispatchEvent(new Event('error'));

    expect(await screen.findByText('No image')).toBeInTheDocument();
  });
});
