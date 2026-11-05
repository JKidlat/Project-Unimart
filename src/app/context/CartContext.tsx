/**
 * ==============================================================================
 * SHOPPING CART CONTEXT (CartContext.tsx)
 * ==============================================================================
 * This React Context manages items added to the user's shopping cart.
 *
 * Core Features:
 * 1. Persistent Storage:
 *    - Saves items to `localStorage` under `unimart_cart_items`.
 *    - Persists items across page reloads and browser restarts.
 * 2. Shopping Actions:
 *    - `addToCart(product, quantity)`: Appends a new item or increments existing quantity.
 *    - `updateQuantity(id, delta)`: Increments (+1) or decrements (-1). Removes if 0.
 *    - `removeFromCart(id)`: Removes a specific line item.
 *    - `clearCart()`: Empties the cart after order placement.
 * 3. Price & Summary Calculations:
 *    - `itemCount`: Total sum of all item quantities.
 *    - `subtotal`: Sum of price * quantity.
 *    - `deliveryFee`: Fixed GH₵20 campus delivery fee when cart is non-empty.
 *    - `total`: Subtotal + delivery fee.
 *
 * How to use:
 * const { items, addToCart, itemCount, total } = useCart();
 * ==============================================================================
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

// Structure of a product that can be added to the cart
export interface CartProduct {
  id: string;
  name: string;
  title?: string;
  price: number;
  oldPrice?: number;
  category: string;
  image: string;
  university: string;
  condition?: string;
  seller?: {
    name: string;
    rating: number;
    verified: boolean;
  };
  description?: string;
}

// Structure of an item inside the cart (includes quantity)
export interface CartItem extends CartProduct {
  quantity: number;
}

// Interface of methods and values exposed by useCart()
interface CartContextType {
  items: CartItem[];
  addToCart: (product: CartProduct, quantity?: number) => void;
  addItem?: (product: any, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

// Create the Cart Context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Storage key used in browser localStorage
const CART_STORAGE_KEY = 'unimart_cart_items';

// ==============================================================================
// CART PROVIDER COMPONENT
// ==============================================================================
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize cart items from localStorage on first render
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  // Automatically sync any change in cart items back to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  // ----------------------------------------------------------------------------
  // Action: Add Item to Cart
  // ----------------------------------------------------------------------------
  const addToCart = (product: CartProduct, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => String(item.id) === String(product.id));
      if (existing) {
        toast.success(`Updated ${product.name || product.title} in cart (+${quantity})`);
        return prev.map((item) =>
          String(item.id) === String(product.id)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      toast.success(`Added ${product.name || product.title} to your cart!`);
      return [...prev, { ...product, quantity }];
    });
  };

  // ----------------------------------------------------------------------------
  // Action: Increment / Decrement Quantity
  // ----------------------------------------------------------------------------
  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (String(item.id) === String(id)) {
            const newQty = item.quantity + delta;
            // If quantity goes to 0 or below, filter it out
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // ----------------------------------------------------------------------------
  // Action: Remove Specific Item
  // ----------------------------------------------------------------------------
  const removeFromCart = (id: string) => {
    setItems((prev) => {
      const removed = prev.find((item) => String(item.id) === String(id));
      if (removed) {
        toast.info(`Removed ${removed.name || removed.title} from cart`);
      }
      return prev.filter((item) => String(item.id) !== String(id));
    });
  };

  // ----------------------------------------------------------------------------
  // Action: Empty Cart
  // ----------------------------------------------------------------------------
  const clearCart = () => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  // ----------------------------------------------------------------------------
  // Computed Totals & Badge Counts
  // ----------------------------------------------------------------------------
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0);
  const deliveryFee = items.length > 0 ? 20 : 0; // Flat GH₵20 campus delivery
  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        addItem: addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        deliveryFee,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// ==============================================================================
// CUSTOM HOOK: useCart()
// ==============================================================================
/**
 * Hook to access shopping cart state and action methods in any component.
 */
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
