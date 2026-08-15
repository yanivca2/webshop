import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { createTestQueryClient, jsonResponse, testProduct } from '../test/renderWithProviders';

const SONY = 'Sony WH-1000XM5';
const MACBOOK = 'MacBook Air';

const catalog = [
  testProduct,
  { ...testProduct, id: '2', name: MACBOOK, brand: 'Apple', category: 'Laptops' },
];

// Mocking server calls, as we care only about the grid behavior in these tests.
function search(url: string): Response {
  const term = new URL(url, 'http://localhost').searchParams.get('search')?.toLowerCase() ?? '';
  return jsonResponse(catalog.filter((product) => product.name.toLowerCase().includes(term)));
}

function stubApi() {
  const fetchMock = vi.fn((input: RequestInfo | URL) => Promise.resolve(search(String(input))));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function stubApiThatNeverAnswers() {
  vi.stubGlobal(
    'fetch',
    // Not calling `resolve` to hold the call.
    vi.fn(() => new Promise<Response>(() => {})),
  );
}

function stubApiWithAStuckRefetch() {
  const fetchMock = vi
    .fn((input: RequestInfo | URL) => Promise.resolve(search(String(input))))
    .mockResolvedValueOnce(jsonResponse(catalog))
    .mockReturnValueOnce(new Promise<Response>(() => {}));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// Returns a mocked slow fetch call, with a trigger to release it.
function stubApiThatHangs() {
  let resolvePending: (value: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => (resolvePending = resolve));
  const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(catalog)).mockReturnValue(pending);
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, release: () => resolvePending(jsonResponse([testProduct])) };
}

// We want to check the actual user experience rather than callback values
// wherever we can, so we mount the whole App component and test what it really
// does.
function renderApp() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <App />
    </QueryClientProvider>,
  );
}

async function renderWithFullCatalog() {
  renderApp();
  await screen.findByRole('heading', { name: SONY });
  expect(screen.getByRole('heading', { name: MACBOOK })).toBeInTheDocument();
}

function returnToTheTab() {
  act(() => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
  });
}

const searchField = () => screen.getByLabelText<HTMLInputElement>('Search products');
const applyButton = () => screen.getByRole('button', { name: 'Apply' });
const clearButton = () => screen.getByRole('button', { name: 'Clear' });

describe('ProductFilters', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Clear focus between tests to ensure stable calls to `returnToTheTab`.
    focusManager.setFocused(undefined);
  });

  it('applies the search clicking the Apply button', async () => {
    // Arrange
    const user = userEvent.setup();
    stubApi();
    await renderWithFullCatalog();

    // Act
    await user.type(searchField(), 'sony');
    await user.click(applyButton());

    // Assert
    expect(await screen.findByRole('heading', { name: SONY })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: MACBOOK })).not.toBeInTheDocument();
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

  it('applies the search on Enter, with no click on Apply', async () => {
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

  it('reads "Apply" while the first load is still running', async () => {
    // Arrange + Act
    stubApiThatNeverAnswers();
    renderApp();

    // Assert
    expect(await screen.findByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('reads "Applying..." while the request it triggered is still running', async () => {
    // Arrange
    const user = userEvent.setup();
    stubApiThatHangs();
    await renderWithFullCatalog();

    // Act - applying a new search term to make sure a new query is sent.
    await user.type(searchField(), 'sony');
    await user.click(applyButton());

    // Assert
    expect(await screen.findByRole('button', { name: 'Applying...' })).toBeInTheDocument();
  });

  it('reads "Apply" again once the request finishes', async () => {
    // Arrange
    const user = userEvent.setup();
    const { release } = stubApiThatHangs();
    await renderWithFullCatalog();
    await user.type(searchField(), 'sony');
    await user.click(applyButton());
    await screen.findByRole('button', { name: 'Applying...' });

    // Act
    release();

    // Assert
    expect(await screen.findByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('ignores a second apply while the first is still running', async () => {
    // Arrange
    const user = userEvent.setup();
    const { fetchMock } = stubApiThatHangs();
    await renderWithFullCatalog();
    await user.type(searchField(), 'sony');
    await user.click(applyButton());
    const applying = await screen.findByRole('button', { name: 'Applying...' });
    const requestsSoFar = fetchMock.mock.calls.length;

    // Act
    await user.type(searchField(), ' headphones');
    await user.click(applying);

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
    await waitFor(() => expect(fetchMock.mock.calls).toHaveLength(2));

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

  it('empties the search field when Clear is pressed', async () => {
    // Arrange
    const user = userEvent.setup();
    stubApi();
    await renderWithFullCatalog();
    await user.type(searchField(), 'sony');

    // Act
    await user.click(clearButton());

    // Assert
    expect(searchField().value).toBe('');
  });
});
