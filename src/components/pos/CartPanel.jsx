'use client';

import { Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import Button from '../ui/Button';

function CartItem({ item, onQtyChange, onRemove }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className="text-xs text-gray-500">฿{item.price.toLocaleString()} each</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onQtyChange(item.id, item.qty - 1)}
          className="h-7 w-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="text-sm font-semibold w-6 text-center">{item.qty}</span>
        <button
          onClick={() => onQtyChange(item.id, item.qty + 1)}
          className="h-7 w-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="text-right min-w-[60px]">
        <p className="text-sm font-semibold text-gray-900">
          ฿{(item.price * item.qty).toLocaleString()}
        </p>
      </div>
      <button onClick={() => onRemove(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function CartPanel({
  cart = [],
  onCartChange,
  discount = 0,
  onDiscountChange,
  onCheckout,
}) {
  const updateQty = (id, qty) => {
    if (qty <= 0) {
      onCartChange(cart.filter((i) => i.id !== id));
    } else {
      onCartChange(cart.map((i) => i.id === id ? { ...i, qty } : i));
    }
  };

  const removeItem = (id) => onCartChange(cart.filter((i) => i.id !== id));

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountAmount = Math.round(subtotal * (discount / 100));
  const total = subtotal - discountAmount;

  return (
    <div className="w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200">
        <ShoppingCart className="h-5 w-5 text-indigo-600" />
        <h3 className="font-semibold text-gray-900">Cart</h3>
        {cart.length > 0 && (
          <span className="ml-auto h-5 w-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
            {cart.reduce((sum, i) => sum + i.qty, 0)}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-5">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 py-8">
            <ShoppingCart className="h-12 w-12 mb-2" />
            <p className="text-sm">Cart is empty</p>
          </div>
        ) : (
          cart.map((item) => (
            <CartItem key={item.id} item={item} onQtyChange={updateQty} onRemove={removeItem} />
          ))
        )}
      </div>

      {/* Summary */}
      <div className="px-5 py-4 border-t border-gray-200 space-y-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>฿{subtotal.toLocaleString()}</span>
        </div>

        {/* Discount */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 shrink-0">Discount</label>
          <div className="flex items-center gap-1 flex-1">
            <input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(e) => onDiscountChange(Number(e.target.value))}
              className="w-16 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
          {discountAmount > 0 && (
            <span className="text-sm text-red-500 font-medium">-฿{discountAmount.toLocaleString()}</span>
          )}
        </div>

        <div className="flex items-center justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
          <span>Total</span>
          <span className="text-indigo-600">฿{total.toLocaleString()}</span>
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={cart.length === 0}
          onClick={onCheckout}
        >
          Checkout
        </Button>
      </div>
    </div>
  );
}
