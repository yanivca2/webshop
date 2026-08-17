import type { ReactElement } from 'react';
import './BasketJumpButton.css';

const LABEL = 'Jump to basket';

interface BasketJumpButtonProps {
  /** The id of the element to jump to. */
  elementId: string;
}

/**
 * Floating shortcut to the basket, for the narrow layout where the basket sits
 * below the entire product listing instead of beside it.
 *
 * To disappear once the basket is in view it has to render inside the basket
 * element - that is what puts it in scope of the `--basket-visibility` view
 * timeline the basket declares.
 */
export default function BasketJumpButton({ elementId }: BasketJumpButtonProps): ReactElement {
  return (
    <a className="basket-jump" href={`#${elementId}`} aria-label={LABEL} title={LABEL}>
      <svg
        className="basket-jump__icon"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="18" cy="20" r="1.4" />
        <path d="M2 3h3l2.4 11.6a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.55L21 7H6" />
      </svg>
      Basket
    </a>
  );
}
