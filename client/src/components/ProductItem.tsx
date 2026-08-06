import { useState } from 'react';
import { useProductBasketState } from '../hooks/useProductBasketState';
import type { ViewMode } from '../hooks/useViewMode';
import { formatPrice } from '../lib/money';
import type { Product } from '../types/api';
import './ProductItem.css';

function addToBasketButtonLabel(isOutOfStock: boolean, atStockLimit: boolean): string {
  if (isOutOfStock) {
    return 'Out of stock';
  }
  return atStockLimit ? 'Max in basket' : 'Add to basket';
}

interface ProductItemProps {
  product: Product;
  viewMode: ViewMode;
}

/**
 * One product from the product grid. Different view modes are defined using
 * only-CSS.
 */
export default function ProductItem({ product, viewMode }: ProductItemProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const { quantityInBasket, add, isOutOfStock, atStockLimit } = useProductBasketState(product);

  return (
    <li className={`item item--${viewMode}`}>
      <div className="item__media">
        {imageFailed ? (
          <div className="item__image-fallback" aria-hidden="true">
            No image
          </div>
        ) : (
          // Keeping the alt, although there's a 'No Image' alternative, to keep
          // the image in the accessibility tree for tests.
          <img
            className="item__image"
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>

      <h3 className="item__name">{product.name}</h3>

      <span className="item__meta">
        <span className="item__brand">{product.brand}</span>
        <span className="item__category">{product.category}</span>
      </span>

      <p className="item__description">{product.description}</p>

      <span className="item__price">{formatPrice(product.priceMinorUnits)}</span>

      <span className="item__stock">
        <span className="item__in-stock">{product.stock} in stock</span>
        {quantityInBasket > 0 ? (
          <span className="item__in-basket">{quantityInBasket} in basket</span>
        ) : null}
      </span>

      <button
        type="button"
        className="item__add"
        onClick={() => add(product)}
        disabled={atStockLimit}
      >
        {addToBasketButtonLabel(isOutOfStock, atStockLimit)}
      </button>
    </li>
  );
}
