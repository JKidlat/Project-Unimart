import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import * as Icons from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    icon: string;
    image: string;
    color: string;
  }
}

export const CategoryCard = ({ category }: CategoryCardProps) => {
  const Icon = (Icons as any)[category.icon];

  return (
    <Link to={`/shop?category=${category.id}`}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative h-48 rounded-3xl overflow-hidden group cursor-pointer shadow-lg`}
      >
        <ImageWithFallback
          src={category.image}
          alt={category.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/80 via-purple-900/20 to-transparent" />
        
        <div className="absolute inset-0 p-6 flex flex-col justify-end">
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
