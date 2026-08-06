import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBasketStore } from '../basket/basketStore';
import BasketPanel from './BasketPanel';
import ProductGrid from './ProductGrid';
import { formatPrice } from '../lib/money';
import { jsonResponse, renderWithProviders, testProduct } from '../test/renderWithProviders';
import type { Product, PurchaseResponse } from '../types/api';

const HEADPHONES: Product = {
  ...testProduct,
  name: 'Sony WH-1000XM5',
  priceMinorUnits: 27_999,
  stock: 3,
};

const order: PurchaseResponse = {
  orderId: 'order-123',
  lines: [
    {
      productId: HEADPHONES.id,
      name: HEADPHONES.name,
      unitPriceMinorUnits: HEADPHONES.priceMinorUnits,
      quantity: 2,
      lineTotalMinorUnits: 2 * HEADPHONES.priceMinorUnits,
    },
  ],
  itemCount: 2,
  totalMinorUnits: 2 * HEADPHONES.priceMinorUnits,
  currency: 'USD',
  placedAt: '2026-08-07T10:15:30Z',
};

const rejectedOrder = {
  status: 400,
  error: 'Bad Request',
  message: 'Only 14 in stock, requested 15',
};

function basketElement() {
  return within(screen.getByRole('complementary', { name: 'Basket' }));
}

function basketTotalMinorUnits(): number {
  return Number((basketElement().getByRole('definition').textContent ?? '').replace(/\D/g, ''));
}

function renderShop(product: Product) {
  return renderWithProviders(
    <>
      <ProductGrid
        products={[product]}
        isPending={false}
        isError={false}
        error={null}
        isFiltered={false}
        isOffline={false}
        onRetry={vi.fn()}
      />
      <BasketPanel />
    </>,
  );
}

async function renderShopWithOneInBasket(
  user: ReturnType<typeof userEvent.setup>,
  product: Product,
) {
  renderShop(product);
  await user.click(screen.getByRole('button', { name: 'Add to basket' }));
}

function stubPurchase(body: unknown = order, status = 201) {
  const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
    Promise.resolve(jsonResponse(body, status)),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// A purchase that never answers, so the button can be read mid-request.
function stubPurchaseThatHangs() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>(() => {})),
  );
}

const purchaseButton = () => screen.getByRole('button', { name: /Purchase|Placing order/ });

const increaseButton = (product: Product) =>
  screen.getByRole('button', { name: `Increase quantity of ${product.name}` });

describe('BasketPanel', () => {
  beforeEach(() => {
    // The store is a module-level singleton and so, unlike the old
    // component-local hook, survives across tests in this file unless reset.
    useBasketStore.setState({ items: {} });
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('says the basket is empty', () => {
    // Arrange + Act
    renderWithProviders(<BasketPanel />);

    // Assert
    expect(screen.getByText(/your basket is empty/i)).toBeInTheDocument();
  });

  it('adds a line for the product', async () => {
    // Arrange
    const user = userEvent.setup();

    // Act
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Assert
    expect(basketElement().getByText(HEADPHONES.name)).toBeInTheDocument();
  });

  it('shows the unit price on the line', async () => {
    // Arrange
    const user = userEvent.setup();

    // Act
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Assert
    expect(
      basketElement().getByText(`${formatPrice(HEADPHONES.priceMinorUnits)} each`),
    ).toBeInTheDocument();
  });

  it('renders the lines already in the store', () => {
    // Arrange - two units, put there by something other than this component.
    // Whether they came from a previous session (a real persistence roundtrip
    // is covered in basketStore.test.ts) or from elsewhere is not this
    // component's concern, so seeding the store directly is the right level.
    useBasketStore.setState({
      items: {
        [HEADPHONES.id]: {
          productId: HEADPHONES.id,
          name: HEADPHONES.name,
          priceMinorUnits: HEADPHONES.priceMinorUnits,
          imageUrl: HEADPHONES.imageUrl,
          quantity: 2,
          stock: HEADPHONES.stock,
        },
      },
    });

    // Act
    renderWithProviders(<BasketPanel />);

    // Assert
    expect(basketTotalMinorUnits()).toBe(2 * HEADPHONES.priceMinorUnits);
  });

  it('increases the quantity', async () => {
    // Arrange
    const user = userEvent.setup();
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Act
    await user.click(increaseButton(HEADPHONES));

    // Assert
    expect(basketTotalMinorUnits()).toBe(2 * HEADPHONES.priceMinorUnits);
  });

  it('decreases the quantity', async () => {
    // Arrange
    const user = userEvent.setup();
    await renderShopWithOneInBasket(user, HEADPHONES);
    await user.click(increaseButton(HEADPHONES));

    // Act
    await user.click(
      screen.getByRole('button', { name: `Decrease quantity of ${HEADPHONES.name}` }),
    );

    // Assert
    expect(basketTotalMinorUnits()).toBe(HEADPHONES.priceMinorUnits);
  });

  it('removes the line', async () => {
    // Arrange
    const user = userEvent.setup();
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Act
    await user.click(screen.getByRole('button', { name: `Remove ${HEADPHONES.name} from basket` }));

    // Assert
    expect(screen.getByText(/your basket is empty/i)).toBeInTheDocument();
  });

  it('stops increasing at the available stock', async () => {
    // Arrange - one of the stock is in the basket already.
    const user = userEvent.setup();
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Act - take the rest.
    for (let taken = 1; taken < HEADPHONES.stock; taken += 1) {
      await user.click(increaseButton(HEADPHONES));
    }

    // Assert
    expect(basketTotalMinorUnits()).toBe(HEADPHONES.stock * HEADPHONES.priceMinorUnits);
    expect(increaseButton(HEADPHONES)).toBeDisabled();
  });

  it('submits only ids and quantities', async () => {
    // Arrange
    const user = userEvent.setup();
    const fetchMock = stubPurchase();
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Act
    await user.click(purchaseButton());

    // Assert - the price stays on the client; the server prices the order.
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body: unknown = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({ items: [{ productId: HEADPHONES.id, quantity: 1 }] });
  });

  it('reads "Placing order..." while the request runs', async () => {
    // Arrange
    const user = userEvent.setup();
    stubPurchaseThatHangs();
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Act
    await user.click(purchaseButton());

    // Assert
    expect(await screen.findByRole('button', { name: 'Placing order...' })).toBeInTheDocument();
  });

  it('refuses a second purchase while the first runs', async () => {
    // Arrange
    const user = userEvent.setup();
    stubPurchaseThatHangs();
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Act
    await user.click(purchaseButton());

    // Assert
    expect(purchaseButton()).toBeDisabled();
  });

  it('confirms the order', async () => {
    // Arrange
    const user = userEvent.setup();
    stubPurchase();
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Act
    await user.click(purchaseButton());

    // Assert
    expect(await screen.findByText('Order placed')).toBeInTheDocument();
  });

  it('shows the order id', async () => {
    // Arrange
    const user = userEvent.setup();
    stubPurchase();
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Act
    await user.click(purchaseButton());

    // Assert
    expect(await screen.findByText(order.orderId)).toBeInTheDocument();
  });

  it('shows the total the server charged', async () => {
    // Arrange
    const user = userEvent.setup();
    stubPurchase();
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Act
    await user.click(purchaseButton());

    // Assert - the server's total, not the basket's.
    expect(
      await screen.findByText(`${formatPrice(order.totalMinorUnits)} ${order.currency}`),
    ).toBeInTheDocument();
  });

  it('empties the basket once the order is placed', async () => {
    // Arrange
    const user = userEvent.setup();
    stubPurchase();
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Act
    await user.click(purchaseButton());
    await screen.findByText('Order placed');

    // Assert
    expect(useBasketStore.getState().items).toEqual({});
  });

  it('flags a repricing', async () => {
    // Arrange - the basket holds one unit, and the server charges for four.
    const user = userEvent.setup();
    stubPurchase({ ...order, totalMinorUnits: 4 * HEADPHONES.priceMinorUnits });
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Act
    await user.click(purchaseButton());

    // Assert
    expect(
      await screen.findByText(/prices changed while the basket was open/i),
    ).toBeInTheDocument();
  });

  it('shows the message a failed purchase came back with', async () => {
    // Arrange
    const user = userEvent.setup();
    stubPurchase(rejectedOrder, 400);
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Act
    await user.click(purchaseButton());

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(rejectedOrder.message);
  });

  it('keeps the basket after a failed purchase', async () => {
    // Arrange
    const user = userEvent.setup();
    stubPurchase(rejectedOrder, 400);
    await renderShopWithOneInBasket(user, HEADPHONES);

    // Act
    await user.click(purchaseButton());
    await screen.findByRole('alert');

    // Assert - nothing was bought, so nothing is taken away.
    expect(basketElement().getByText(HEADPHONES.name)).toBeInTheDocument();
  });

  it('goes back to the basket after continuing', async () => {
    // Arrange - an order already placed, so the confirmation is on screen.
    const user = userEvent.setup();
    stubPurchase();
    await renderShopWithOneInBasket(user, HEADPHONES);
    await user.click(purchaseButton());
    await screen.findByText('Order placed');

    // Act
    await user.click(screen.getByRole('button', { name: 'Continue shopping' }));

    // Assert
    expect(screen.getByText(/your basket is empty/i)).toBeInTheDocument();
  });
});
