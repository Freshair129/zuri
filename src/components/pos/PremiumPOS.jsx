'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import CartPanel from './CartPanel';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

function ProductCard({ product, onAdd }) {
  return (
    <button
      onClick={() => onAdd(product)}
      className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-indigo-400 hover:shadow-md transition-all aspect-square"
    >
      <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center text-2xl mb-2 shrink-0">
        {product.emoji ?? '🍳'}
      </div>
      <p className="text-sm font-semibold text-gray-900 truncate w-full px-1">{product.name}</p>
      <p className="text-xs text-gray-500 mt-0.5 truncate w-full px-1">{product.category}</p>
      <p className="text-sm font-bold text-indigo-600 mt-1">฿{product.price.toLocaleString()}</p>
    </button>
  );
}

export default function PremiumPOS({ products = [], onOrderComplete }) {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateCart = (updatedCart) => setCart(updatedCart);

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountAmount = Math.round(subtotal * (discount / 100));
  const total = subtotal - discountAmount;

  const handleConfirmPayment = () => {
    onOrderComplete?.({ cart, subtotal, discount, discountAmount, total, paymentMethod });
    setCart([]);
    setDiscount(0);
    setShowPayment(false);
  };

  return (
    <div className="flex h-full gap-0">
      {/* Product grid */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No products found.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart sidebar */}
      <CartPanel
        cart={cart}
        onCartChange={updateCart}
        discount={discount}
        onDiscountChange={setDiscount}
        onCheckout={() => setShowPayment(true)}
      />

      {/* Payment modal */}
      <Modal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        title="Payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPayment(false)}>Cancel</Button>
            <Button onClick={handleConfirmPayment}>Confirm ฿{total.toLocaleString()}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span>฿{subtotal.toLocaleString()}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Discount ({discount}%)</span>
              <span>-฿{discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-3">
            <span>Total</span>
            <span className="text-indigo-600">฿{total.toLocaleString()}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {['cash', 'transfer', 'card'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`
                    py-2.5 rounded-lg border text-sm font-medium capitalize transition-colors
                    ${paymentMethod === method
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
