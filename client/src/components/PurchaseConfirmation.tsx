import { useEffect, useRef, type ReactElement } from 'react';
import { formatPrice } from '../lib/money';
import type { PurchaseResponse } from '../types/api';
import './PurchaseConfirmation.css';

interface PurchaseConfirmationProps {
  order: PurchaseResponse;
  // Total the basket showed before submitting, to detect a repricing.
  expectedTotalMinorUnits: number;
  onContinue: () => void;
}

export default function PurchaseConfirmation({
  order,
  expectedTotalMinorUnits,
  onContinue,
}: PurchaseConfirmationProps): ReactElement {
  // The server reprices every order from the catalog. If a cached basket
  // price had drifted, saying so is better than quietly charging a different
  // number than the one the customer was looking at.
  const wasRepriced = formatPrice(expectedTotalMinorUnits) !== formatPrice(order.totalMinorUnits);

  const continueRef = useRef<HTMLButtonElement>(null);

  // This replaces the form the user just submitted from, so the button they
  // pressed is gone and focus would fall to <body> with it - leaving a
  // keyboard user at the top of the page, with the confirmation somewhere
  // below. Focus goes to the one thing there is left to do here rather than to
  // the heading above it; the confirmation reads itself out either way,
  // through the live region this sits in.
  useEffect(() => {
    continueRef.current?.focus();
  }, []);

  return (
    <div className="confirmation" role="status">
      <h3 className="confirmation__title">Order placed</h3>

      {/* `dl`/`dt` is used for name-value pairs, and that's what makes a screen
          reader announce "Total, $559.98" as one fact instead of reading the
          label and the number as two unrelated strings. */}
      <dl className="confirmation__meta">
        <dt>Order</dt>
        <dd className="confirmation__order-id">{order.orderId}</dd>
        <dt>Items</dt>
        <dd>{order.itemCount}</dd>
        <dt>Total</dt>
        <dd className="confirmation__total">
          {formatPrice(order.totalMinorUnits)} {order.currency}
        </dd>
      </dl>

      {wasRepriced ? (
        <p className="confirmation__notice">
          Prices changed while the basket was open. You were charged the current catalog price of{' '}
          {formatPrice(order.totalMinorUnits)}.
        </p>
      ) : null}

      <button
        type="button"
        className="confirmation__continue"
        ref={continueRef}
        onClick={onContinue}
      >
        Continue shopping
      </button>
    </div>
  );
}
