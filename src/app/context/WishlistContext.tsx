/**
 * ==============================================================================
 * WISHLIST CONTEXT (WishlistContext.tsx)
 * ==============================================================================
 * This React Context manages items saved by buyers for future viewing or purchase.
 *
 * Core Features:
 * 1. Persistent Storage:
 *    - Automatically synchronizes with browser `localStorage` using `wishlistStorage`.
 *    - Saved items remain available even if the student leaves or refreshes the page.
 * 2. Deduplication:
 *    - `addToWishlist(item)`: Checks whether an item ID is already in the wishlist
 *      before adding, preventing duplicates.
 * 3. Fast Status Lookup:
 *    - `isInWishlist(id)`: Returns boolean so heart icons can toggle color immediately
 *      (e.g., filled red vs. outline gray).
 * 4. Item Removal & Transfer:
 *    - `removeFromWishlist(id)`: Removes individual items.
 *    - Items can also be moved directly into the cart from the Wishlist page.
 *
 * How to use:
 * const { wishlist, addToWishlist, isInWishlist } = useWishlist();
 * ==============================================================================
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { wishlistStorage } from '../../lib/api';

// Structure of an item saved in the user's wishlist
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
}

// Methods and values exposed by useWishlist()
interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string | number) => void;
  isInWishlist: (id: string | number) => boolean;
  clearWishlist: () => void;
  wishlistCount: number;
}

// Create the Wishlist Context
const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

// ==============================================================================
// WISHLIST PROVIDER COMPONENT
// ==============================================================================
export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // Load saved wishlist from localStorage on component mount
  useEffect(() => {
    setWishlist(wishlistStorage.get());
  }, []);

  /**
   * Adds an item to the wishlist if not already present.
   */
  const addToWishlist = useCallback((item: WishlistItem) => {
    setWishlist(prev => {
      const exists = prev.some(w => String(w.id) === String(item.id));
      if (exists) return prev; // Avoid duplicate entries
      const updated = [item, ...prev];
      wishlistStorage.save(updated);
      return updated;
    });
  }, []);

  /**
   * Removes an item from the wishlist by its ID.
   */
  const removeFromWishlist = useCallback((id: string | number) => {
    setWishlist(prev => {
      const updated = prev.filter(w => String(w.id) !== String(id));
      wishlistStorage.save(updated);
      return updated;
    });
  }, []);

  /**
   * Checks if a given product ID is already saved in the user's wishlist.
   * Used to highlight heart buttons in real-time.
   */
  const isInWishlist = useCallback((id: string | number): boolean => {
    return wishlist.some(w => String(w.id) === String(id));
  }, [wishlist]);

  /**
   * Clears all items from the wishlist.
   */
  const clearWishlist = useCallback(() => {
    setWishlist([]);
    wishlistStorage.save([]);
  }, []);

  return (
    <WishlistContext.Provider value={{
      wishlist,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      clearWishlist,
      wishlistCount: wishlist.length,
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

// ==============================================================================
// CUSTOM HOOK: useWishlist()
// ==============================================================================
/**
 * Hook to consume wishlist state and action methods in any component.
 */
export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};
