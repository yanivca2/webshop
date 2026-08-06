import { useRef } from 'react';
import { useBasketItemList, useBasketStore } from '../basket/basketStore';
import { usePurchase } from '../hooks/usePurchase';
import { formatPrice, sumLineTotals } from '../lib/money';
import BasketJumpButton from './BasketJumpButton';
import BasketLine from './BasketLine';
import PurchaseConfirmation from './PurchaseConfirmation';
import './BasketPanel.css';

// The jump button links to this, so the two read it from one place.
const BASKET_ELEMENT_ID = 'basket';

export default function BasketPanel() {
  const items = useBasketItemList();
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const totalMinorUnits = sumLineTotals(items);
  const increment = useBasketStore((state) => state.increment);
  const decrement = useBasketStore((state) => state.decrement);
  const remove = useBasketStore((state) => state.remove);
  const clear = useBasketStore((state) => state.clear);
  const purchase = usePurchase();

  // The basket is cleared on success, so the total has to be captured before
  // submitting for the confirmation to be able to compare against it.
  const submittedTotalMinorUnits = useRef(0);

  const handlePurchase = () => {
    submittedTotalMinorUnits.current = totalMinorUnits;
    purchase.mutate(items, {
      onSuccess: () => clear(),
    });
  };

  const handleContinue = () => {
    purchase.reset();
  };

  if (purchase.isSuccess && purchase.data) {
    return (
      <aside className="basket" id={BASKET_ELEMENT_ID} aria-label="Basket">
        <h2 className="basket__title">Basket</h2>
        <PurchaseConfirmation
          order={purchase.data}
          expectedTotalMinorUnits={submittedTotalMinorUnits.current}
          onContinue={handleContinue}
        />
        <BasketJumpButton elementId={BASKET_ELEMENT_ID} />
      </aside>
    );
  }

  return (
    <aside className="basket" id={BASKET_ELEMENT_ID} aria-label="Basket">
      <h2 className="basket__title">
        Basket
        {itemCount > 0 ? <span className="basket__count">{itemCount}</span> : null}
      </h2>

      {items.length === 0 ? (
        <p className="basket__empty">Your basket is empty. Add a product to get started.</p>
      ) : (
        <>
          <ul className="basket__lines">
            {items.map((item) => (
              <BasketLine
                key={item.productId}
                item={item}
                onIncrement={increment}
                onDecrement={decrement}
                onRemove={remove}
              />
            ))}
          </ul>

          {/* A definition list rather than two spans: it pairs the label with
              the value, so assistive tech reads "Total, $559.98". */}
          <dl className="basket__summary">
            <dt>Total</dt>
            <dd className="basket__total">{formatPrice(totalMinorUnits)}</dd>
          </dl>

          {purchase.isError ? (
            <p className="basket__error" role="alert">
              {purchase.error.message}
            </p>
          ) : null}

          <button
            type="button"
            className="basket__purchase"
            onClick={handlePurchase}
            disabled={purchase.isPending}
          >
            {purchase.isPending ? 'Placing order...' : 'Purchase'}
          </button>
        </>
      )}

      {/* Being inside the panel at all is what lets it read the panel's own
          view-timeline. */}
      <BasketJumpButton elementId={BASKET_ELEMENT_ID} />
    </aside>
  );
}
