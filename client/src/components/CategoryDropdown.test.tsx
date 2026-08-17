import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import CategoryDropdown from './CategoryDropdown';

const CATEGORIES = [
  'Accessories',
  'Audio',
  'Cameras',
  'Components',
  'Laptops',
  'Monitors',
  'Networking',
  'Peripherals',
  'Smart Home',
  'Smartphones',
  'Storage',
  'TVs',
  'Tablets',
  'Wearables',
];

type Props = ComponentProps<typeof CategoryDropdown>;

interface DropdownHarness extends Props {
  // Re-renders with new props, for state that only settles across a render.
  rerenderWith: (next: Partial<Props>) => void;
}

function renderDropdown(overrides: Partial<Props> = {}): DropdownHarness {
  const props: Props = {
    categories: CATEGORIES,
    isPending: false,
    hasFailed: false,
    onRetry: vi.fn(),
    selected: [],
    applied: [],
    onSelectionChange: vi.fn(),
    onApply: vi.fn(),
    ...overrides,
  };
  const view = render(<CategoryDropdown {...props} />);

  return {
    ...props,
    rerenderWith: (next: Partial<Props>): void =>
      view.rerender(<CategoryDropdown {...props} {...next} />),
  };
}

const categorySelector = (): HTMLElement => screen.getByRole('button', { expanded: false });
const listed = (): (string | null)[] =>
  screen.getAllByRole('listitem').map((item) => item.textContent);
// The panel is a disclosure, so its own filter field stands in for it being open.
const openPanel = (): HTMLElement | null =>
  screen.queryByRole('searchbox', { name: 'Filter categories' });

describe('CategoryDropdown', () => {
  it('counts the selection on the selector before it is applied', () => {
    // Arrange + Act
    renderDropdown({ selected: ['Audio', 'Cameras'] });

    // Assert
    expect(screen.getByRole('button', { name: /2 categories selected/ })).toBeInTheDocument();
  });

  it('focuses on the textbox when dropdown is opened', async () => {
    // Arrange
    const user = userEvent.setup();
    renderDropdown();

    // Act
    await user.click(categorySelector());

    // Assert
    expect(screen.getByLabelText('Filter categories')).toHaveFocus();
  });

  it('sorts the list with the applied categories first', async () => {
    // Arrange
    const user = userEvent.setup();
    renderDropdown({ applied: ['Storage', 'Wearables'] });

    // Act
    await user.click(categorySelector());

    // Assert
    expect(listed().slice(0, 2)).toEqual(['Storage', 'Wearables']);
  });

  it('puts newly applied categories first the next time it opens', async () => {
    // Arrange
    const user = userEvent.setup();
    const { rerenderWith } = renderDropdown({ applied: [] });
    await user.click(categorySelector());
    rerenderWith({ applied: ['Wearables'] });
    await user.keyboard('{Escape}');

    // Act
    await user.click(categorySelector());

    // Assert
    expect(listed()[0]).toBe('Wearables');
  });

  it('narrows the list to what the filter matches', async () => {
    // Arrange
    const user = userEvent.setup();
    renderDropdown();
    await user.click(categorySelector());

    // Act
    await user.type(screen.getByLabelText('Filter categories'), 'phone');

    // Assert
    expect(listed()).toEqual(['Smartphones']);
  });

  it("shows 'no matched' message when filter matches nothing", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDropdown();
    await user.click(categorySelector());

    // Act
    await user.type(screen.getByLabelText('Filter categories'), 'zzz');

    // Assert
    expect(screen.getByText('No categories match that.')).toBeInTheDocument();
  });

  it('applies the selection when Apply is pressed', async () => {
    // Arrange
    const user = userEvent.setup();
    const { onApply } = renderDropdown({ selected: ['Cameras'] });
    await user.click(categorySelector());

    // Act
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    // Assert
    expect(onApply).toHaveBeenCalledWith(['Cameras']);
  });

  it('closes itself once the selection is applied', async () => {
    // Arrange
    const user = userEvent.setup();
    renderDropdown({ selected: ['Cameras'] });
    await user.click(categorySelector());

    // Act
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    // Assert
    expect(openPanel()).not.toBeInTheDocument();
  });

  it('drops the categories from the query when Clear selection is pressed', async () => {
    // Arrange
    const user = userEvent.setup();
    const { onSelectionChange, onApply } = renderDropdown({ selected: ['Cameras'] });
    await user.click(categorySelector());

    // Act
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));

    // Assert
    expect(onSelectionChange).toHaveBeenCalledWith([]);
    expect(onApply).toHaveBeenCalledWith([]);
  });

  it('stays open after Clear selection, ready for the next pick', async () => {
    // Arrange
    const user = userEvent.setup();
    renderDropdown({ selected: ['Cameras'] });
    await user.click(categorySelector());

    // Act
    await user.click(screen.getByRole('button', { name: 'Clear selection' }));

    // Assert
    expect(openPanel()).toBeInTheDocument();
  });

  it('closes on Escape and hands focus back to the selector', async () => {
    // Arrange
    const user = userEvent.setup();
    renderDropdown();
    await user.click(categorySelector());

    // Act
    await user.keyboard('{Escape}');

    // Assert
    expect(openPanel()).not.toBeInTheDocument();
    expect(categorySelector()).toHaveFocus();
  });

  it('closes when clicking outside of the panel', async () => {
    // Arrange
    const user = userEvent.setup();
    renderDropdown();
    await user.click(categorySelector());

    // Act
    await user.click(document.body);

    // Assert
    expect(openPanel()).not.toBeInTheDocument();
  });

  it('says the categories are loading rather than showing an empty list', async () => {
    // Arrange
    const user = userEvent.setup();
    renderDropdown({ categories: [], isPending: true });

    // Act
    await user.click(categorySelector());

    // Assert
    expect(screen.getByText('Loading categories...')).toBeInTheDocument();
  });

  it('tells the user the categories could not be loaded', async () => {
    // Arrange
    const user = userEvent.setup();
    renderDropdown({ categories: [], hasFailed: true });

    // Act
    await user.click(categorySelector());

    // Assert - a failed request, not a catalog without categories.
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load categories.');
    expect(screen.queryByText('No categories match that.')).not.toBeInTheDocument();
  });

  it('asks for the categories again when Retry is pressed', async () => {
    // Arrange
    const user = userEvent.setup();
    const { onRetry } = renderDropdown({ categories: [], hasFailed: true });
    await user.click(categorySelector());

    // Act
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    // Assert
    expect(onRetry).toHaveBeenCalled();
  });
});
