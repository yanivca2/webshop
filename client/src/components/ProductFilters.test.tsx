import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import App from '../App';
import { createTestQueryClient, jsonResponse, testProduct } from '../test/renderWithProviders';

const SONY = 'Sony WH-1000XM5';
const MACBOOK = 'MacBook Air';

const catalog = [
  testProduct,
  { ...testProduct, id: '2', name: MACBOOK, brand: 'Apple', category: 'Laptops' },
];

// Mocking server calls, as we care only about the grid behavior in these tests.
function api(url: string): Response {
  if (url.includes('/api/categories')) {
    return jsonResponse(['Audio', 'Laptops']);
  }
  const params = new URL(url, 'http://localhost').searchParams;
  const term = params.get('search')?.toLowerCase() ?? '';
  const chosen = params.getAll('categories');
  return jsonResponse(
    catalog.filter(
      (product) =>
        product.name.toLowerCase().includes(term) &&
        (chosen.length === 0 || chosen.includes(product.category)),
    ),
  );
}

function stubApi(): Mock<(input: RequestInfo | URL) => Promise<Response>> {
  const fetchMock = vi.fn((input: RequestInfo | URL) => Promise.resolve(api(String(input))));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function stubApiThatNeverAnswers(): void {
  vi.stubGlobal(
    'fetch',
    // Not calling `resolve` to hold the call.
    vi.fn(() => new Promise<Response>(() => {})),
  );
}

function stubApiWithAStuckRefetch(): Mock<(input: RequestInfo | URL) => Promise<Response>> {
  const fetchMock = vi
    .fn((input: RequestInfo | URL) => Promise.resolve(api(String(input))))
    .mockResolvedValueOnce(jsonResponse(catalog))
    .mockResolvedValueOnce(jsonResponse(['Audio', 'Laptops']))
    .mockReturnValueOnce(new Promise<Response>(() => {}));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

interface HangingApi {
  fetchMock: Mock;
  // Lets the held request answer, so the test controls when the wait ends.
  release: () => void;
}

// Returns a mocked slow fetch call, with a trigger to release it.
function stubApiThatHangs(): HangingApi {
  let resolvePending: (value: Response) => void = (): void => {};
  const pending = new Promise<Response>((resolve) => (resolvePending = resolve));
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(jsonResponse(catalog))
    .mockResolvedValueOnce(jsonResponse(['Audio', 'Laptops']))
    .mockReturnValue(pending);
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, release: (): void => resolvePending(jsonResponse([testProduct])) };
}

// We want to check the actual user experience rather than callback values
// wherever we can, so we mount the whole App component and test what it really
// does.
function renderApp(): RenderResult {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <App />
    </QueryClientProvider>,
  );
}

async function renderWithFullCatalog(): Promise<void> {
  renderApp();
  await screen.findByRole('heading', { name: SONY });
  expect(screen.getByRole('heading', { name: MACBOOK })).toBeInTheDocument();
}

function returnToTheTab(): void {
  act(() => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
}

const searchField = (): HTMLInputElement =>
  screen.getByLabelText<HTMLInputElement>('Search products');
const searchButton = (): HTMLElement => screen.getByRole('button', { name: /Search|Searching/ });
const clearAllButton = (): HTMLElement => screen.getByRole('button', { name: 'Clear all filters' });
const categorySelectorButton = (): HTMLElement =>
  screen.getByRole('button', { name: /Select a category|categor(y|ies) selected/ });
const categoryOption = (name: string): HTMLElement => screen.getByRole('checkbox', { name });
const applySelectedCategories = (): HTMLElement => screen.getByRole('button', { name: 'Apply' });

async function selectCategory(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
): Promise<void> {
  await user.click(categorySelectorButton());
  await user.click(categoryOption(name));
}

describe('ProductFilters', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Clear focus between tests to ensure stable calls to `returnToTheTab`.
    focusManager.setFocused(undefined);
  });

  it('searches products based on the applied filters', async () => {
    // Arrange
    const user = userEvent.setup();
    stubApi();
    await renderWithFullCatalog();

    // Act
    await selectCategory(user, 'Laptops');
    await user.click(applySelectedCategories());

    // Assert
    expect(await screen.findByRole('heading', { name: MACBOOK })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: SONY })).not.toBeInTheDocument();
  });

  it('lists an applied category with a button to remove it', async () => {
    // Arrange
    const user = userEvent.setup();
    stubApi();
    await renderWithFullCatalog();

    // Act
    await selectCategory(user, 'Laptops');
    await user.click(applySelectedCategories());

    // Assert
    expect(
      await screen.findByRole('button', { name: 'Remove Laptops filter' }),
    ).toBeInTheDocument();
  });

  it('applies the search with the button inside the field', async () => {
    // Arrange
    const user = userEvent.setup();
    stubApi();
    await renderWithFullCatalog();

    // Act
    await user.type(searchField(), 'sony');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    // Assert
    expect(await screen.findByRole('heading', { name: SONY })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: MACBOOK })).not.toBeInTheDocument();
  });

  it('applies the search on Enter, with no click on Search', async () => {
    // Arrange
    const user = userEvent.setup();
    stubApi();
    await renderWithFullCatalog();

    // Act
    await user.type(searchField(), 'macbook{Enter}');

    // Assert
    await screen.findByText('1 product');
    expect(screen.queryByRole('heading', { name: SONY })).not.toBeInTheDocument();
  });

  it('reads "Search" while the first load is still running', async () => {
    // Arrange + Act
    stubApiThatNeverAnswers();
    renderApp();

    // Assert
    expect(await screen.findByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('reads "Searching..." while the request it triggered is still running', async () => {
    // Arrange
    const user = userEvent.setup();
    stubApiThatHangs();
    await renderWithFullCatalog();

    // Act - applying a new search term to make sure a new query is sent.
    await user.type(searchField(), 'sony');
    await user.click(searchButton());

    // Assert
    expect(await screen.findByRole('button', { name: 'Searching...' })).toBeInTheDocument();
  });

  it('reads "Search" again once the request finishes', async () => {
    // Arrange
    const user = userEvent.setup();
    const { release } = stubApiThatHangs();
    await renderWithFullCatalog();
    await user.type(searchField(), 'sony');
    await user.click(searchButton());
    await screen.findByRole('button', { name: 'Searching...' });

    // Act
    release();

    // Assert
    expect(await screen.findByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('ignores a second search while the first is still running', async () => {
    // Arrange
    const user = userEvent.setup();
    const { fetchMock } = stubApiThatHangs();
    await renderWithFullCatalog();
    await user.type(searchField(), 'sony');
    await user.click(searchButton());
    const searching = await screen.findByRole('button', { name: 'Searching...' });
    const requestsSoFar = fetchMock.mock.calls.length;

    // Act
    await user.type(searchField(), ' headphones');
    await user.click(searching);

    // Assert
    expect(fetchMock.mock.calls).toHaveLength(requestsSoFar);
  });

  // TanStack re-requests the products list on its own when the tab regains
  // focus and what it holds is more than 30 seconds old. We want to make sure
  // a new search query is not dropped during this refetch.
  it('applies the search during an infra background auto-refetch', async () => {
    // Arrange
    const user = userEvent.setup();
    const fetchMock = stubApiWithAStuckRefetch();
    await renderWithFullCatalog();
    returnToTheTab();
    // Two loads, then the products refetch, which is the request left hanging
    // - categories never refetch, they are pinned fresh. The arrange is not
    // set until that third request is actually in flight.
    await waitFor(() => expect(fetchMock.mock.calls).toHaveLength(3));

    // Act
    await user.type(searchField(), 'sony{Enter}');

    // Assert
    expect(await screen.findByText('1 product')).toBeInTheDocument();
  });

  it('reuses the results when the new term differs only by whitespace', async () => {
    // Arrange
    const user = userEvent.setup();
    const fetchMock = stubApi();
    await renderWithFullCatalog();
    await user.type(searchField(), 'sony{Enter}');
    await screen.findByText('1 product');
    const requestsSoFar = fetchMock.mock.calls.length;

    // Act - the same term one space wider, which builds the same URL.
    await user.type(searchField(), ' {Enter}');

    // Assert
    expect(fetchMock.mock.calls).toHaveLength(requestsSoFar);
  });

  it('empties the search field when Clear all is pressed', async () => {
    // Arrange
    const user = userEvent.setup();
    stubApi();
    await renderWithFullCatalog();
    await user.type(searchField(), 'sony');

    // Act
    await user.click(clearAllButton());

    // Assert
    expect(searchField().value).toBe('');
  });

  it('clears all selected categories when clicking on Clear all', async () => {
    // Arrange
    const user = userEvent.setup();
    stubApi();
    await renderWithFullCatalog();
    await selectCategory(user, 'Audio');
    await user.click(categoryOption('Laptops'));
    await user.keyboard('{Escape}');

    // Act
    await user.click(clearAllButton());

    // Assert - the trigger counts the ticks, so it is where the emptying shows.
    expect(screen.getByRole('button', { name: /Select a category/ })).toBeInTheDocument();
  });

  it('adds the selected categories to the filter when clicking the Search button', async () => {
    // Arrange - ticking alone applies nothing, and the term is what the user
    // came to submit; the two travel together.
    const user = userEvent.setup();
    stubApi();
    await renderWithFullCatalog();
    await selectCategory(user, 'Laptops');
    await user.keyboard('{Escape}');

    // Act
    await user.type(searchField(), 'macbook');
    await user.click(searchButton());

    // Assert
    expect(await screen.findByRole('heading', { name: MACBOOK })).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Remove Laptops filter' }),
    ).toBeInTheDocument();
  });

  it('keeps selected categories even after closing the dialog without applying', async () => {
    // Arrange
    const user = userEvent.setup();
    stubApi();
    await renderWithFullCatalog();

    // Act
    await selectCategory(user, 'Laptops');
    await user.keyboard('{Escape}');

    // Assert - counted on the trigger, but not yet a filter: no chip for it.
    expect(screen.getByRole('button', { name: /1 category selected/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Laptops filter' })).not.toBeInTheDocument();
  });
});
