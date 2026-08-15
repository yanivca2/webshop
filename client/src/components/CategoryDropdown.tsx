import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import './CategoryDropdown.css';

interface CategoryDropdownProps {
  categories: string[];
  // True while the category list is still loading.
  isPending: boolean;
  // True when the category list could not be loaded.
  hasFailed: boolean;
  onRetry: () => void;
  // Currently selected categories. Not necessarily the ones applied in the filter.
  selected: string[];
  // The applied filtered categories.
  applied: string[];
  // Selection change. Has no effect on the product list before applying.
  onSelectionChange: (categories: string[]) => void;
  onApply: (categories: string[]) => void;
}

function dropdownButtonLabel(count: number): string {
  if (count === 0) {
    return 'Select a category';
  }

  return `${count} ${count === 1 ? 'category' : 'categories'} selected`;
}

export default function CategoryDropdown({
  categories,
  isPending,
  hasFailed,
  onRetry,
  selected,
  applied,
  onSelectionChange,
  onApply,
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  // Applied categories are shown first, but the order changes only after the
  // next dialog open, so the item will not "jump".
  const [leadingAtOpen, setLeadingAtOpen] = useState<string[]>([]);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchFieldRef = useRef<HTMLInputElement>(null);
  const searchFieldId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Closes the dialog when clicking outside of it.
    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && !panelRef.current?.contains(target)) {
        // Ignore clicks on the button, as this has its own handling.
        if (!dropdownButtonRef.current?.contains(target)) {
          setIsOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      searchFieldRef.current?.focus();
    }
  }, [isOpen]);

  function close() {
    setIsOpen(false);
    dropdownButtonRef.current?.focus();
  }

  function toggleOpen() {
    if (isOpen) {
      close();
      return;
    }
    setFilter('');
    setLeadingAtOpen(applied);
    setIsOpen(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      close();
    }
  }

  function toggleCategory(category: string) {
    onSelectionChange(
      selected.includes(category)
        ? selected.filter((picked) => picked !== category)
        : [...selected, category],
    );
  }

  function handleApply() {
    onApply(selected);
    close();
  }

  function handleClearSelection() {
    onSelectionChange([]);
    onApply([]);
    // Allow the user to keep using the category filter.
    searchFieldRef.current?.focus();
  }

  const byName = (a: string, b: string) => a.localeCompare(b);
  const ordered = [
    ...categories.filter((category) => leadingAtOpen.includes(category)).sort(byName),
    ...categories.filter((category) => !leadingAtOpen.includes(category)).sort(byName),
  ];
  const term = filter.trim().toLowerCase();
  const matches = ordered.filter((category) => category.toLowerCase().includes(term));

  return (
    <div className="category-dropdown">
      <button
        type="button"
        ref={dropdownButtonRef}
        className="category-dropdown__button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={toggleOpen}
      >
        {dropdownButtonLabel(selected.length)}
        <span className="category-dropdown__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div
          className="category-dropdown__panel"
          role="dialog"
          aria-label="Categories"
          ref={panelRef}
          onKeyDown={handleKeyDown}
        >
          <label className="category-dropdown__filter-label" htmlFor={searchFieldId}>
            Filter categories
          </label>
          <input
            id={searchFieldId}
            ref={searchFieldRef}
            type="search"
            className="category-dropdown__filter"
            placeholder="Filter categories..."
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            // This panel sits inside the filters form, where Enter in a text
            // field would submit it and search behind the open dialog.
            onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
          />

          {isPending ? (
            <p className="category-dropdown__empty">Loading categories...</p>
          ) : hasFailed ? (
            // An alert because the panel is already open when the retry fails
            // again: without it the second failure would change nothing on
            // screen and a screen reader would hear nothing at all.
            <div className="category-dropdown__failure" role="alert">
              <p className="category-dropdown__empty">Could not load categories.</p>
              <button type="button" className="category-dropdown__retry" onClick={onRetry}>
                Retry
              </button>
            </div>
          ) : matches.length === 0 ? (
            <p className="category-dropdown__empty">No categories match that.</p>
          ) : (
            <ul className="category-dropdown__list">
              {matches.map((category) => (
                <li key={category}>
                  <label className="category-option">
                    <input
                      type="checkbox"
                      className="category-option__input"
                      checked={selected.includes(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    {category}
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div className="category-dropdown__actions">
            <button
              type="button"
              className="category-dropdown__clear"
              onClick={handleClearSelection}
            >
              Clear selection
            </button>
            <button type="button" className="category-dropdown__apply" onClick={handleApply}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
