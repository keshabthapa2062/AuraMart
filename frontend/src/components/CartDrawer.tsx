import React from 'react';
import { X, Trash2, ArrowRight, Lock, ShoppingBag, User } from 'lucide-react';
import { CartItem, UserProfile } from '../types';
import { formatCurrencyVal } from '../utils/currency';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  userCountry: string;
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  userCountry,
  currentUser,
  onOpenAuth
}: CartDrawerProps) {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div 
          id="cart-drawer-panel"
          className="w-screen max-w-md transform bg-white shadow-2xl transition-all duration-300 flex flex-col h-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-neutral-900" />
              <h2 className="font-sans font-bold text-lg text-neutral-900">
                Shopping Cart
              </h2>
              {currentUser && (
                <span className="font-mono text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                  {totalQuantity}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-neutral-950 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body Content */}
          {!currentUser ? (
            /* Non-logged-in user barrier: Cart items are strictly private to logged-in users */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 shadow-sm">
                <Lock className="h-8 w-8" />
              </div>
              <h3 className="font-extrabold text-neutral-900 text-lg">Log In to Access Your Cart</h3>
              <p className="mt-2 text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
                Shopping cart items and saved orders are private to your user account. Please log in to view or add items to your personal cart.
              </p>
              <button
                onClick={() => {
                  onClose();
                  if (onOpenAuth) onOpenAuth();
                }}
                className="mt-6 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer w-full max-w-xs"
              >
                <User className="h-4 w-4" />
                <span>Log In / Sign Up to View Cart</span>
              </button>
            </div>
          ) : (
            /* Logged in User Cart Items List */
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-50 mb-4 text-neutral-400">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                  <h3 className="font-sans font-semibold text-neutral-900 text-base">Your cart is empty</h3>
                  <p className="mt-1 text-sm text-neutral-400 max-w-xs mx-auto">
                    Find premium lifestyle items, electronics, and apparel in our catalog to get started.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-6 px-5 py-2.5 rounded-xl bg-neutral-950 text-white font-bold text-xs hover:bg-neutral-800 transition-colors shadow-md"
                  >
                    Browse Catalog
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div 
                      key={item.product.id} 
                      className="flex items-center gap-4 py-4 border-b border-neutral-50 last:border-0"
                    >
                      {/* Thumbnail */}
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-50 border border-neutral-100">
                        <img
                          src={Array.isArray(item.product.image) ? item.product.image[0] : item.product.image}
                          alt={item.product.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>

                      {/* Meta info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-sans font-semibold text-sm text-neutral-900 truncate leading-none mb-1">
                          {item.product.name}
                        </h4>
                        <p className="text-xs text-neutral-400 font-mono mb-2">
                          {formatCurrencyVal(item.product.price, userCountry)} each
                        </p>

                        {/* Quantity Selector */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center border border-neutral-200 rounded-lg bg-neutral-50 overflow-hidden h-7">
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                              className="px-2 hover:bg-neutral-100 font-sans text-xs text-neutral-500 font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-sans text-xs font-semibold text-neutral-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, Math.min(item.product.inventory, item.quantity + 1))}
                              className="px-2 hover:bg-neutral-100 font-sans text-xs text-neutral-500 font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          {/* Remove */}
                          <button
                            onClick={() => onRemoveItem(item.product.id)}
                            className="text-neutral-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Total item price */}
                      <div className="text-right flex-shrink-0">
                        <span className="font-sans font-bold text-sm text-neutral-900 block">
                          {formatCurrencyVal(item.product.price * item.quantity, userCountry)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer Subtotal & Action (Only for Logged in Users with Items) */}
          {currentUser && cartItems.length > 0 && (
            <div className="border-t border-neutral-100 px-6 py-6 bg-neutral-50">
              <div className="space-y-1.5 mb-5">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Items Count</span>
                  <span className="font-mono">{totalQuantity} units</span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Shipping & Handling</span>
                  <span className="text-emerald-600 font-bold uppercase tracking-wider">Free</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <span className="font-sans font-bold text-sm text-neutral-900">Est. Subtotal</span>
                  <span className="font-sans font-extrabold text-base text-neutral-950">
                    {formatCurrencyVal(subtotal, userCountry)}
                  </span>
                </div>
              </div>

              <button
                onClick={onCheckout}
                className="w-full flex items-center justify-center gap-2 h-12 bg-neutral-950 text-white rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-all shadow-md active:scale-98"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-neutral-400 font-medium">
                <Lock className="h-3 w-3" />
                <span>Secure 256-bit encryption. Fully safe checkout.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
