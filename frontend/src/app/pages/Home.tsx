import React from 'react';
import { ArrowRight, Zap, ShieldCheck, Clock, Star, User } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { categories, products } from '../data/mockData';
import { ProductCard } from '../components/ProductCard';
import { CategoryCard } from '../components/CategoryCard';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { ThreeHero } from '../components/ThreeHero';

/**
 * Home Page Component
 * 
 * The main landing page for Unimart. 
 * Features include:
 * - A 3D-enhanced Hero section with branding and value proposition.
 * - Dynamic category cards for quick navigation.
 * - Featured products (Top Deals) grid.
 * - Trust-building banners highlighting platform security and community.
 */
export const Home = () => {
  return (
    <div className="space-y-20 pb-20 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
        {/* 3D Background */}
        <ThreeHero />

        {/* Decorative Gradients - Adjusted to A14B58 */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[#a14b581a] rounded-full blur-[120px] -z-10 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-[#a14b581a] rounded-full blur-[100px] -z-10 -translate-x-1/3 translate-y-1/3" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center space-x-2 bg-[#fcf6f7] px-3 py-1.5 rounded-full text-[#a14b58] font-semibold text-xs tracking-wider uppercase mb-6">
                <Zap className="w-3.5 h-3.5" />
                <span>Exclusively for Ghanaian Students</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-[1.1] mb-6">
                The Ultimate <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a14b58] to-[#6f323d]">
                  Student Marketplace
                </span>
              </h1>
              <p className="text-lg text-gray-600 mb-10 max-w-lg leading-relaxed">
                Buy, sell, and swap electronics, dorm essentials, and fashion with fellow students from all Ghanaian Universities, Training colleges, and more. Trusted and safe.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/shop"
                  className="px-8 py-4 bg-[#a14b58] text-white rounded-2xl font-bold text-lg hover:bg-[#863b48] transition-all flex items-center justify-center space-x-2 shadow-xl shadow-[#a14b5833] hover:shadow-2xl hover:shadow-[#a14b584d]"
                >
                  <span>Shop Now</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/signup"
                  className="px-8 py-4 bg-white border-2 border-[#f3d7db] text-[#a14b58] rounded-2xl font-bold text-lg hover:border-[#e8b6bd] hover:bg-[#fcf6f7] transition-all flex items-center justify-center"
                >
                  Join Community
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-12 flex items-center space-x-10">
                <div>
                  <p className="text-2xl font-bold text-gray-900">15k+</p>
                  <p className="text-sm text-gray-500">Active Students</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">10+</p>
                  <p className="text-sm text-gray-500">Universities</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div>
                  <div className="flex items-center text-yellow-500 mb-0.5">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <p className="text-sm text-gray-500">Top Rated App</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="relative hidden lg:block"
            >
              <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl rotate-2 border-8 border-white">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1620829813573-7c9e1877706f"
                  alt="Student Lifestyle"
                  className="w-full h-full object-cover aspect-[4/5]"
                />
              </div>
              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-10 -right-10 z-20 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Verified Sellers</p>
                  <p className="text-xs text-gray-500">Shop with confidence</p>
                </div>
              </motion.div>
              
              <motion.div
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-10 -left-10 z-20 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-[#fcf6f7] rounded-xl flex items-center justify-center text-[#a14b58]">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Same-Day Pickups</p>
                  <p className="text-xs text-gray-500">Available on campus</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Shop by Category</h2>
            <p className="text-gray-500">Explore everything from gadgets to textbooks</p>
          </div>
          <Link to="/categories" className="text-[#a14b58] font-semibold flex items-center gap-2 hover:gap-3 transition-all">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      {/* Top Deals Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-[#a14b58] rounded-full" />
                <span className="text-[#a14b58] font-bold text-xs uppercase tracking-widest">Trending Now</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Hot Student Deals</h2>
            </div>
            <Link to="/shop" className="text-[#a14b58] font-semibold flex items-center gap-2 hover:gap-3 transition-all">
              See All Deals <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#a14b58] to-[#6f323d] rounded-[3rem] p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center text-white">
            <div>
              <h2 className="text-4xl font-bold mb-6 leading-tight">Join the largest student commerce community in Ghana</h2>
              <p className="text-[#f3d7db] text-lg mb-10 max-w-md">
                Selling your old textbooks or looking for a laptop upgrade? Unimart makes it easy, safe, and student-friendly.
              </p>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Secure Payments</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Student Verified</span>
                </div>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <Link to="/signup" className="bg-white text-[#a14b58] px-10 py-5 rounded-2xl font-bold text-xl hover:bg-gray-50 transition-all shadow-xl shadow-black/10">
                Start Selling Today
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
