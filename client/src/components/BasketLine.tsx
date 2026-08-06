import { formatPrice, lineTotal } from '../lib/money';
import type { BasketItem } from '../basket/basketStore';
import './BasketLine.css';

interface BasketLineProps {
  item: BasketItem;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
}

export default function BasketLine({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: BasketLineProps) {
  const atStockLimit = item.quantity >= item.stock;

  return (
    <li className="line">
      <img className="line__image" src={item.imageUrl} alt="" loading="lazy" />

      <div className="line__details">
        <p className="line__name">{item.name}</p>
        <p className="line__unit">{formatPrice(item.priceMinorUnits)} each</p>
      </div>

      <div className="line__quantity">
        <button
          type="button"
          className="line__step"
          onClick={() => onDecrement(item.productId)}
          aria-label={`Decrease quantity of ${item.name}`}
        >
          -
        </button>
        <span className="line__count">{item.quantity}</span>
        <button
          type="button"
          className="line__step"
          onClick={() => onIncrement(item.productId)}
          disabled={atStockLimit}
          aria-label={`Increase quantity of ${item.name}`}
        >
          +
        </button>
      </div>

      <p className="line__total">{formatPrice(lineTotal(item.priceMinorUnits, item.quantity))}</p>

      <button
        type="button"
        className="line__remove"
        onClick={() => onRemove(item.productId)}
        aria-label={`Remove ${item.name} from basket`}
      >
        Remove
      </button>
    </li>
  );
}
