'use client';

import { useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import Button from '../ui/Button';

function CartItem({ item, onQtyChange, onRemove }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className="text-xs text-gray-500">฿{item.price.toLocaleString()}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onQtyChange(item.id, item.qty - 1)}
          className="h-6 w-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
        <button
          onClick={() => onQtyChange(item.id, item.qty + 1)}
          className="h-6 w-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <button onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-600 ml-1">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ChatPOS({ products = [], onCheckout }) {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
    } else {
      setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty } : i));
    }
  };

  const removeItem = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountAmount = Math.round(subtotal * (discount / 100));
  const total = subtotal - discountAmount;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-3 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-indigo-600" /> Quick Sale
        </p>
      </div>

      {/* Product search */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {search && (
          <div className="mt-2 max-h-36 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-400">No products found.</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { addToCart(p); setSearch(''); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-indigo-50 transition-colors"
                >
                  <span className="text-gray-800">{p.name}</span>
                  <span className="text-gray-500">฿{p.price.toLocaleString()}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="flex-1 overflow-y-auto px-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs py-6">
            <ShoppingBag className="h-8 w-8 mb-2" />
            <p>Cart is empty.</p>
          </div>
        ) : (
          cart.map((item) => (
            <CartItem key={item.id} item={item} onQtyChange={updateQty} onRemove={removeItem} />
          ))
        )}
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-t border-gray-200 space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>฿{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Discount</span>
          <input
            type="number"
            min="0"
            max="100"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className="w-16 text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-500">%</span>
          {discountAmount > 0 && (
            <span className="ml-auto text-sm text-red-500">-฿{discountAmount.toLocaleString()}</span>
          )}
        </div>
        <div className="flex items-center justify-between font-semibold text-gray-900">
          <span>Total</span>
          <span>฿{total.toLocaleString()}</span>
        </div>
        <Button
          className="w-full mt-1"
          disabled={cart.length === 0}
          onClick={() => onCheckout?.({ cart, subtotal, discount, total })}
        >
          Checkout
        </Button>
      </div>
    </div>
  );
}
