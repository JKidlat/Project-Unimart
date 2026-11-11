/**
 * ==============================================================================
 * WISHLIST CONTEXT (WishlistContext.tsx)
 * ==============================================================================
 * Synchronizes the logged-in buyer's wishlist with Django PostgreSQL (`/api/wishlist/`).
 * Clears cleanly on sign-out and isolates data strictly to the authenticated account.
 * ==============================================================================
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useUser } from './UserContext';

export interface WishlistItem {
  id: string | number;
  name: string;
  price: number;
  image: string;
  university?: string;
  category?: string;
  condition?: string;
  rating?: number;
  badge?: string;
  stock?: number;
  stock_label?: string | null;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  loading: boolean;
  addToWishlist: (item: WishlistItem) => Promise<void>;
  removeFromWishlist: (id: string | number) => Promise<void>;
  isInWishlist: (id: string | number) => boolean;
  clearWishlist: () => void;
  refreshWishlist: () => Promise<void>;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

function mapBackendWishlistRow(row: any): WishlistItem {
  const p = row?.product || row || {};
  return {
    id: p.id,
    name: p.title || p.name || 'Marketplace Item',
    price: Number(p.price || 0),
    image: p.image || '',
    university: p.university_name || p.university || '',
    category: p.category || p.category_name || '',
    condition: p.condition || '',
    rating: p.average_rating ?? p.rating,
    stock: p.stock,
    stock_label: p.stock_label ?? null,
  };
}

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, user } = useUser();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    if (!isLoggedIn || !user) {
      setWishlist([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<any>('/wishlist/');
      const rows = Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : [];
      setWishlist(rows.map(mapBackendWishlistRow).filter((x: WishlistItem) => x.id !== undefined));
    } catch {
      // Do not populate stale or demo items when server fails
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const addToWishlist = useCallback(
    async (item: WishlistItem) => {
      if (!isLoggedIn) return;
      const numericId = Number(item.id);
      setWishlist((prev) => {
        if (prev.some((w) => String(w.id) === String(item.id))) return prev;
        return [item, ...prev];
      });
      if (!Number.isFinite(numericId) || numericId <= 0) return;
      try {
        await api.post('/wishlist/', { product_id: numericId });
      } catch (err: any) {
        setWishlist((prev) => prev.filter((w) => String(w.id) !== String(item.id)));
        toast.error(err?.message || 'Unable to save item to your wishlist.');
        throw err;
      }
    },
    [isLoggedIn]
  );

  const removeFromWishlist = useCallback(
    async (id: string | number) => {
      if (!isLoggedIn) return;
      const previous = wishlist;
      setWishlist((prev) => prev.filter((w) => String(w.id) !== String(id)));
      const numericId = Number(id);
      if (!Number.isFinite(numericId) || numericId <= 0) return;
      try {
        await api.delete(`/wishlist/${numericId}/`);
      } catch (err: any) {
        setWishlist(previous);
        toast.error(err?.message || 'Unable to remove item from wishlist.');
      }
    },
    [isLoggedIn, wishlist]
  );

  const isInWishlist = useCallback(
    (id: string | number): boolean => wishlist.some((w) => String(w.id) === String(id)),
    [wishlist]
  );

  const clearWishlist = useCallback(() => {
    setWishlist([]);
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        loading,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        clearWishlist,
        refreshWishlist,
        wishlistCount: wishlist.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};
