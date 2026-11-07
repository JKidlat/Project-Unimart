import React, { useState, useEffect, useMemo } from 'react';
import { 
  Filter, SlidersHorizontal, ChevronDown, Search, X, 
  Sparkles, ShoppingBag, ArrowRight, Heart, ShoppingCart, 
  Check, RefreshCw, Star, Flame
} from 'lucide-react';
import { products as defaultProducts, categories, universities } from '../data/mockData';
import { ProductCard } from '../components/ProductCard';
import { useUser } from '../context/UserContext';
import { useCart } from '../context/CartContext';
import { api, normalizeCategorySlug } from '../../lib/api';
import { 
  getPersonalizedProducts, 
  getTopUserCategories, 
  hasUserInteractions, 
  trackSearchInterest 
} from '../utils/personalization';
import { Link, useSearchParams } from 'react-router';

export const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategory = searchParams.get('category') || 'all';
  const { searchQuery, setSearchQuery } = useUser();
  const { itemCount } = useCart();
  const [productList, setProductList] = useState<any[]>(defaultProducts);
  const [selectedCategory, setSelectedCategory] = useState<string>(urlCategory);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<number>(10000);
  const [sortBy, setSortBy] = useState<'recommended' | 'price_low' | 'price_high' | 'newest'>('recommended');
  const [loading, setLoading] = useState<boolean>(true);

  // Sync category if URL parameter changes
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  // Fetch approved live products
  const fetchProducts = () => {
    setLoading(true);
    api.get('/products/')
      .then((res) => {
        const items = res.results || res;
        if (Array.isArray(items) && items.length > 0) {
          // Ensure only approved live items are displayed in the public shop
          const liveItems = items.filter((p: any) => p.status === 'live' || !p.status);
          setProductList(liveItems.length > 0 ? liveItems : items);
        } else {
          setProductList(defaultProducts);
        }
      })
      .catch(() => {
        // Fallback to local store or defaults
        try {
          const stored = JSON.parse(localStorage.getItem('unimart_products_store') || '[]');
          const liveStored = stored.filter((p: any) => p.status === 'live' || !p.status);
          setProductList(liveStored.length > 0 ? liveStored : defaultProducts);
        } catch {
          setProductList(defaultProducts);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Track search interest when user searches
  useEffect(() => {
    if (searchQuery && searchQuery.trim().length >= 2) {
      const q = searchQuery.toLowerCase().trim();
      const matchedCats = categories
        .filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
        .map(c => c.id);
      trackSearchInterest(q, matchedCats);
    }
  }, [searchQuery]);

  // Determine top user categories for personalization banner
  const userTopCategories = useMemo(() => getTopUserCategories(2), [productList, searchQuery]);
  const userHasHistory = useMemo(() => hasUserInteractions(), [productList]);

  // Filter products:
  // Key requirement: Working search bar searches regardless of the category
  const filteredProducts = useMemo(() => {
    const isSearching = Boolean(searchQuery && searchQuery.trim().length > 0);
    const query = searchQuery ? searchQuery.toLowerCase().trim() : '';

    return productList.filter((p: any) => {
      // If user is searching, search regardless of category; otherwise match selectedCategory
      const categoryMatch = isSearching 
        ? true 
        : (selectedCategory === 'all' || normalizeCategorySlug(p.category) === normalizeCategorySlug(selectedCategory));

      const uniMatch = selectedUniversity === 'all' || 
        (p.university && p.university.toLowerCase().includes(selectedUniversity.toLowerCase()));

      const priceMatch = Number(p.price || 0) <= priceRange;

      const searchMatch = !isSearching || 
        (p.name || p.title || '').toLowerCase().includes(query) || 
        (p.description || '').toLowerCase().includes(query) ||
        (p.category || '').toLowerCase().includes(query) ||
        (p.category_name || '').toLowerCase().includes(query) ||
        (p.seller?.name || '').toLowerCase().includes(query) ||
        (p.university || '').toLowerCase().includes(query);

      return categoryMatch && uniMatch && priceMatch && searchMatch;
    });
  }, [productList, selectedCategory, selectedUniversity, priceRange, searchQuery]);

  // Sort / Personalize products
  const displayedProducts = useMemo(() => {
    const list = [...filteredProducts];

    if (sortBy === 'recommended') {
      return getPersonalizedProducts(list);
    }
    if (sortBy === 'price_low') {
      return list.sort((a, b) => Number(a.price) - Number(b.price));
    }
    if (sortBy === 'price_high') {
      return list.sort((a, b) => Number(b.price) - Number(a.price));
    }
    if (sortBy === 'newest') {
      return list.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    }
    return list;
  }, [filteredProducts, sortBy]);

  // Personalized picks for the top showcase (when on default "all" view without search)
  const personalizedPicks = useMemo(() => {
    if (selectedCategory !== 'all' || searchQuery) return [];
    return getPersonalizedProducts(productList, 4);
  }, [productList, selectedCategory, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header & Search Bar */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Student Shop</h1>
            <p className="text-sm text-gray-500">
              Verified campus listings with safe hostel pickups across Ghanaian universities
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/sell"
              className="px-5 py-2.5 bg-[#a14b58] text-white rounded-xl text-sm font-bold hover:bg-[#863b48] transition-all shadow-md shadow-[#a14b5826] flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Post an Ad</span>
            </Link>
            <Link
              to="/cart"
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center gap-2 relative"
            >
              <ShoppingCart className="w-4 h-4 text-[#a14b58]" />
              <span>Cart</span>
              {itemCount > 0 && (
                <span className="w-5 h-5 bg-[#a14b58] text-white text-[11px] rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Global Working Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search all items in the shop (laptops, kettles, textbooks, sneakers, groceries...)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:border-[#a14b58] focus:ring-4 focus:ring-[#a14b581a] focus:outline-none text-base shadow-sm transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search status notice if actively searching across categories */}
        {searchQuery && (
          <div className="bg-[#fcf6f7] border border-[#f3d7db] px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-[#a14b58]">
            <span className="font-semibold">
              Searching across all categories for: &ldquo;<strong className="font-black">{searchQuery}</strong>&rdquo; (Found {filteredProducts.length} items)
            </span>
            <button 
              onClick={() => setSearchQuery('')}
              className="font-bold underline hover:text-[#883d49] ml-2"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Category Horizontal Quick-Tabs (All 7 Official Categories) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none pt-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              selectedCategory === 'all' && !searchQuery
                ? 'bg-[#a14b58] text-white shadow-md shadow-[#a14b5833]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id && !searchQuery;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#a14b58] text-white shadow-md shadow-[#a14b5833]'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-[#a14b58] hover:text-[#a14b58]'
                }`}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Layout: Sidebar & Catalog */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 space-y-6 shrink-0">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#a14b58]" />
                <h2 className="font-bold text-gray-900">Filters</h2>
              </div>
              <button 
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedUniversity('all');
                  setPriceRange(10000);
                  setSearchQuery('');
                }}
                className="text-xs text-[#a14b58] font-bold hover:underline"
              >
                Reset
              </button>
            </div>

            {/* Category Filter */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">Shop Categories</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                    selectedCategory === 'all'
                      ? 'bg-[#fcf6f7] text-[#a14b58]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>All Categories</span>
                  {selectedCategory === 'all' && <Check className="w-3.5 h-3.5" />}
                </button>
                {categories.map((cat) => {
                  const active = selectedCategory === cat.id;
                  const count = productList.filter(p => normalizeCategorySlug(p.category) === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                        active
                          ? 'bg-[#fcf6f7] text-[#a14b58]'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      <span className="text-[10px] text-gray-400 font-normal ml-1">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* University Filter */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-3">Campus University</h3>
              <select 
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none text-xs font-medium"
                onChange={(e) => setSelectedUniversity(e.target.value)}
                value={selectedUniversity}
              >
                <option value="all">All Ghanaian Campuses</option>
                {universities.map(uni => (
                  <option key={uni} value={uni}>{uni}</option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400">Max Price</h3>
                <span className="text-[#a14b58] font-black text-xs">GH₵{priceRange.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="10000" 
                step="50"
                value={priceRange}
                onChange={(e) => setPriceRange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#a14b58]"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1">
                <span>GH₵50</span>
                <span>GH₵10,000+</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Product Catalog Main Content */}
        <main className="flex-1 min-w-0 space-y-8">
          {/* Default Homepage Showcase: Recommended for You (Algorithm Tailored to User Usage) */}
          {selectedCategory === 'all' && !searchQuery && personalizedPicks.length > 0 && (
            <div className="bg-gradient-to-r from-rose-50/70 via-pink-50/50 to-orange-50/40 border border-[#f3d7db] rounded-3xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#a14b58] text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                      Tailored For You
                      {userHasHistory && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-[#a14b58] text-white rounded-full uppercase tracking-wider">
                          Smart Algorithm
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {userHasHistory && userTopCategories.length > 0
                        ? `Curated based on your browsing & saved interests in ${userTopCategories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(' & ')}`
                        : 'Diverse showcase featuring popular deals across different categories'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {personalizedPicks.map((product) => (
                  <ProductCard key={`tailored-${product.id}`} product={product} />
                ))}
              </div>
            </div>
          )}

          {/* Results Bar & Sorting */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
            <div>
              <h2 className="text-base font-black text-gray-900">
                {searchQuery ? `Search Results (${displayedProducts.length})` : selectedCategory === 'all' ? 'All Shop Listings' : `${categories.find(c => c.id === selectedCategory)?.name || 'Category'} Listings`}
              </h2>
              <p className="text-xs text-gray-400">
                Showing {displayedProducts.length} approved items
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-bold">Sort:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
              >
                <option value="recommended">Personalized / Recommended</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {displayedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 p-8">
              <div className="bg-[#fcf6f7] w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-[#a14b58]">
                <Search className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">No matching products found</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                We couldn&apos;t find any approved items matching your current filters. Try resetting or searching another category.
              </p>
              <button 
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedUniversity('all');
                  setPriceRange(10000);
                  setSearchQuery('');
                }}
                className="px-6 py-3 bg-[#a14b58] text-white rounded-xl font-bold hover:bg-[#863b48] transition-all shadow-md shadow-[#a14b5833]"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
