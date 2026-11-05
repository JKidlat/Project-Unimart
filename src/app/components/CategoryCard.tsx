/**
 * ==============================================================================
 * CATEGORY CARD COMPONENT (CategoryCard.tsx)
 * ==============================================================================
 * This component renders an interactive category card with a dark gradient
 * overlay, category icon, and image background.
 *
 * How it works:
 * 1. Dynamic Icon Rendering:
 *    - Looks up the icon string (e.g. 'Smartphone', 'BookOpen') dynamically
 *      from the `lucide-react` icon library.
 * 2. Visual Layering:
 *    - Base layer: Background photo loaded through `ImageWithFallback`.
 *    - Mid layer: Dark vertical gradient (black 80% to transparent) for high
 *      text contrast.
 *    - Top layer: Frosted glass icon pill and title text.
 * 3. Auth Gating:
 *    - Supports the `requireAuth` function from the Home page so unauthenticated
 *      guests are redirected to sign in if clicked.
 * ==============================================================================
 */

import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import * as Icons from 'lucide-react';
import { ImageWithFallback } from './common/ImageWithFallback';

// Shape of category data required to render the card
interface CategoryCardProps {
  category: {
    id: string;      // Category slug (e.g. 'electronics', 'clothing')
    name: string;    // Display title
    icon: string;    // Lucide icon name (e.g. 'Smartphone')
    image: string;   // High-res photo URL
    color: string;   // Accent color class
  };
  /** Optional auth gate from Home page — checks if user is logged in */
  requireAuth?: (target: string) => (e: React.MouseEvent) => void;
}

export const CategoryCard = ({ category, requireAuth }: CategoryCardProps) => {
  // Dynamically resolve the Lucide icon component by name string
  const Icon = (Icons as any)[category.icon] || Icons.ShoppingBag;
  const target = `/shop?category=${category.id}`;

  return (
    <Link to={target} onClick={requireAuth ? requireAuth(target) : undefined}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative h-48 rounded-3xl overflow-hidden group cursor-pointer shadow-lg"
      >
        {/* Background Category Image */}
        <ImageWithFallback
          src={category.image}
          alt={category.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />

        {/* Readability Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent" />

        {/* Card Content Overlay */}
        <div className="absolute inset-0 p-6 flex flex-col justify-end">
          {/* Glassmorphic Icon Badge */}
          <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-3">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white">{category.name}</h3>
          <p className="text-white/70 text-xs">Browse Products →</p>
        </div>
      </motion.div>
    </Link>
  );
};
