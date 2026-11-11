/**
 * ==============================================================================
 * SHOPPING CART CONTEXT (CartContext.tsx)
 * ==============================================================================
 * Database-synced shopping cart backed by `/api/cart/`.
 * Enforces stock bounds cleanly (never exceeding available stock or adding out-of-stock
 * items), resets cleanly per account on login/logout, and never deducts backend stock
 * prematurely when adding or viewing cart items.
 * ==============================================================================
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useUser } from './UserContext';

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
  stock?: number;
  stock_label?: string | null;
  seller?: {
    name: string;
    rating: number;
    verified: boolean;
  };
  description?: string;
}

export interface CartItem extends CartProduct {
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addToCart: (product: CartProduct, quantity?: number) => Promise<void>;
  addItem?: (product: any, quantity?: number) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  updateQuantity: (id: string, delta: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function mapCartRow(row: any): CartItem {
  const p = row?.product || {};
  return {
    id: String(p.id),
    name: p.title || p.name || 'Marketplace Item',
    title: p.title || p.name,
    price: Number(p.price || 0),
    oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
    category: p.category || p.category_name || 'others',
    image: p.image || '',
    university: p.university_name || p.university || '',
    condition: p.condition,
    stock: p.stock !== undefined ? Number(p.stock) : undefined,
    stock_label: p.stock_label ?? null,
    quantity: Number(row?.quantity || 1),
  };
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, user } = useUser();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn || !user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<{ results: any[] }>('/cart/');
      const rows = Array.isArray(res?.results) ? res.results : [];
      setItems(rows.map(mapCartRow));
    } catch {
      // Do not inject stale cross-user localStorage state
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (product: CartProduct, quantity = 1) => {
    if (!isLoggedIn) {
      toast.error('Please sign in to add items to your cart.');
      return;
    }
    if (product.stock !== undefined && product.stock <= 0) {
      toast.error(`"${product.name || product.title}" is currently out of stock.`);
      return;
    }

    const existing = items.find((i) => String(i.id) === String(product.id));
    const maxStock = product.stock !== undefined ? Number(product.stock) : existing?.stock;
    if (maxStock !== undefined && (existing?.quantity || 0) + quantity > maxStock) {
      toast.error(`Only ${maxStock} unit(s) available for "${product.name || product.title}".`);
      return;
    }

    const productId = Number(product.id);
    if (!Number.isFinite(productId) || productId <= 0) {
      toast.error('Invalid product selected.');
      return;
    }

    try {
      const res = await api.post<{ results: any[] }>('/cart/', {
        product_id: productId,
        quantity,
      });
      if (Array.isArray(res?.results)) {
        setItems(res.results.map(mapCartRow));
      }
      toast.success(
        existing
          ? `Updated ${product.name || product.title} in cart (+${quantity})`
          : `Added ${product.name || product.title} to your cart!`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Unable to add item to cart.');
      throw err;
    }
  };

  const updateQuantity = async (id: string, delta: number) => {
    const existing = items.find((i) => String(i.id) === String(id));
    if (!existing) return;
    const nextQty = existing.quantity + delta;
    if (nextQty > 0 && existing.stock !== undefined && nextQty > existing.stock) {
      toast.error(`Only ${existing.stock} unit(s) available in stock.`);
      return;
    }
    try {
      const res = await api.patch<{ results: any[] }>(`/cart/${id}/`, { quantity: Math.max(0, nextQty) });
      if (Array.isArray(res?.results)) {
        setItems(res.results.map(mapCartRow));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to update cart quantity.');
    }
  };

  const removeFromCart = async (id: string) => {
    const existing = items.find((i) => String(i.id) === String(id));
    try {
      const res = await api.delete<{ results: any[] }>(`/cart/${id}/`);
      if (Array.isArray(res?.results)) {
        setItems(res.results.map(mapCartRow));
      } else {
        setItems((prev) => prev.filter((item) => String(item.id) !== String(id)));
      }
      if (existing) {
        toast.info(`Removed ${existing.name || existing.title} from cart`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to remove item from cart.');
    }
  };

  const clearCart = async () => {
    setItems([]);
    if (!isLoggedIn) return;
    try {
      await api.delete('/cart/');
    } catch {
      // Backend Order creation already clears ordered items automatically
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = items.length > 0 ? 20 : 0;
  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        addToCart,
        addItem: addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
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

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
