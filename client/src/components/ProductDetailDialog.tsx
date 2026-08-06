import { useEffect, useRef } from 'react';
import { useBasketStore } from '../basket/basketStore';
import { useProduct } from '../hooks/useProduct';
import { formatPrice } from '../lib/money';
import StatusMessage from './StatusMessage';
import './ProductDetailDialog.css';

interface ProductDetailDialogProps {
  productId: string | null;
  onClose: () => void;
}

export default function ProductDetailDialog({ productId, onClose }: ProductDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // productId can be null (dialog closed); '' never matches a real product id,
  // so the lookup just misses instead of needing a branch for the null case.
  const quantityInBasket = useBasketStore((state) => state.items[productId ?? '']?.quantity ?? 0);
  const add = useBasketStore((state) => state.add);
  const { data: product, isPending, isError, error, refetch, fetchStatus } = useProduct(productId);

  // TanStack has no straightforward way to detect offline, so we assume it from
  // the status.
  const isOffline = fetchStatus === 'paused';

  // showModal/close are imperative, so the open state has to be pushed into the
  // element. Using the native dialog buys focus trapping, inertness of the rest
  // of the page, and Escape handling without reimplementing any of it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (productId !== null && !dialog.open) {
      dialog.showModal();
    } else if (productId === null && dialog.open) {
      dialog.close();
    }
  }, [productId]);

  // The native dialog can be closed in multiple, outside-of-React ways - Escape,
  // or clicking outside of it. In each of these ways, there is a dialog `close`
  // event triggered. We use this event to cleanup everything.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  // Same distinction the listing makes: stock zero satisfies the quantity
  // check below at an empty basket, so the two reasons are kept apart rather
  // than both surfacing as "Max in basket".
  const isOutOfStock = product?.stock === 0;
  const atStockLimit = product ? quantityInBasket >= product.stock : false;

  return (
    <dialog
      ref={dialogRef}
      className="detail"
      // The title only exists once the product has arrived, so aria-labelledby
      // has nothing to point at while the dialog is loading or has failed - and
      // that is the state a user meets on every open. aria-label names it in the
      // meantime; the title takes over the moment it renders.
      aria-label="Product details"
      aria-labelledby="detail-title"
      onClick={(event) => {
        // The backdrop is _itself_ the dialog target. We call the close dialog
        // method to cleanup everything when such a click is detected.
        if (event.target === dialogRef.current) {
          dialogRef.current?.close();
        }
      }}
    >
      <div className="detail__content">
        <button
          type="button"
          className="detail__close"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close product details"
        >
          ×
        </button>

        {isOffline ? (
          <StatusMessage
            title="You are offline"
            detail="This product will load by itself once the connection is back."
          />
        ) : null}

        {isPending && !isOffline && productId !== null ? (
          <p className="detail__loading">Loading product...</p>
        ) : null}

        {isError ? (
          <StatusMessage
            tone="error"
            title="Could not load this product"
            detail={error?.message}
            onRetry={() => void refetch()}
          />
        ) : null}

        {product ? (
          <>
            <img className="detail__image" src={product.imageUrl} alt={product.name} />
            <p className="detail__brand">{product.brand}</p>
            <h2 className="detail__title" id="detail-title">
              {product.name}
            </h2>
            <p className="detail__category">{product.category}</p>
            <p className="detail__description">{product.description}</p>

            <div className="detail__footer">
              <p className="detail__price">{formatPrice(product.priceMinorUnits)}</p>
              <button
                type="button"
                className="detail__add"
                onClick={() => add(product)}
                disabled={atStockLimit}
              >
                {isOutOfStock ? 'Out of stock' : atStockLimit ? 'Max in basket' : 'Add to basket'}
              </button>
            </div>

            <p className="detail__stock">{product.stock} in stock</p>
          </>
        ) : null}
      </div>
    </dialog>
  );
}
