import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Filter, Search, X, Sparkles, ShoppingBag, ShoppingCart,
  Check, RefreshCw, SlidersHorizontal, ChevronUp
} from 'lucide-react';
import { categories } from '../data/mockData';
import { UniversitySelector } from '../components/common/UniversitySelector';
import type { UniversityOption } from '../../hooks/useUniversities';
import { ProductCard } from '../components/ProductCard';
import { useUser } from '../context/UserContext';
import { useCart } from '../context/CartContext';
import { api, normalizeCategorySlug } from '../../lib/api';
import {
  getPersonalizedProducts,
  getTopUserCategories,
  hasUserInteractions,
  trackSearchInterest,
} from '../utils/personalization';
import { Link, useSearchParams } from 'react-router';

export const Shop = () => {
  const [searchParams] = useSearchParams();
  const urlCategory = searchParams.get('category') || 'all';
  const { searchQuery, setSearchQuery } = useUser();
  const { itemCount } = useCart();

  const [productList, setProductList] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(urlCategory);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('all');
  const [selectedUniversityObj, setSelectedUniversityObj] = useState<UniversityOption | null>(null);
  const [priceRange, setPriceRange] = useState<number>(10000);
  const [sortBy, setSortBy] = useState<'recommended' | 'price_low' | 'price_high' | 'newest'>('recommended');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Mobile-first UX: hide filters by default until customer interacts with search
  const [filtersVisible, setFiltersVisible] = useState<boolean>(false);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);
  }, [searchParams]);

  // Automatically reveal filters if user arrives with or types a search query
  useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 0) {
      setFiltersVisible(true);
    }
  }, [searchQuery]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get<any>('/products/');
      const items = res?.results || res;
      if (Array.isArray(items)) {
        const liveItems = items.filter((p: any) => p.status === 'live' || !p.status);
        setProductList(liveItems);
      } else {
        setProductList([]);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load products from the marketplace server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (searchQuery && searchQuery.trim().length >= 2) {
      const q = searchQuery.toLowerCase().trim();
      const matchedCats = categories
        .filter((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
        .map((c) => c.id);
      trackSearchInterest(q, matchedCats);
    }
  }, [searchQuery]);

  const userTopCategories = useMemo(() => getTopUserCategories(2), [productList, searchQuery]);
  const userHasHistory = useMemo(() => hasUserInteractions(), [productList]);

  const activeFilterCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedUniversity !== 'all' ? 1 : 0) +
    (priceRange < 10000 ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSelectedUniversity('all');
    setSelectedUniversityObj(null);
    setPriceRange(10000);
    setSearchQuery('');
  };

  const filteredProducts = useMemo(() => {
    const isSearching = Boolean(searchQuery && searchQuery.trim().length > 0);
    const query = searchQuery ? searchQuery.toLowerCase().trim() : '';

    return productList.filter((p: any) => {
      const categoryMatch = isSearching
        ? true
        : selectedCategory === 'all' ||
          normalizeCategorySlug(p.category) === normalizeCategorySlug(selectedCategory);

      const prodUniName = (p.university_name || p.university || '').toLowerCase();
      const prodUniShort = (p.university_short_name || p.seller_details?.university || '').toLowerCase();
      const uniMatch =
        selectedUniversity === 'all' ||
        (selectedUniversityObj?.id &&
          p.university_id &&
          Number(p.university_id) === Number(selectedUniversityObj.id)) ||
        prodUniName.includes(selectedUniversity.toLowerCase()) ||
        (selectedUniversityObj?.short_name &&
          (prodUniShort === selectedUniversityObj.short_name.toLowerCase() ||
            prodUniName.includes(selectedUniversityObj.short_name.toLowerCase())));

      const priceMatch = Number(p.price || 0) <= priceRange;

      const searchMatch =
        !isSearching ||
        (p.name || p.title || '').toLowerCase().includes(query) ||
        (p.description || '').toLowerCase().includes(query) ||
        (p.category || '').toLowerCase().includes(query) ||
        (p.category_name || '').toLowerCase().includes(query) ||
        (p.seller_details?.name || p.seller?.name || '').toLowerCase().includes(query) ||
        prodUniName.includes(query) ||
        prodUniShort.includes(query);

      return categoryMatch && uniMatch && priceMatch && searchMatch;
    });
  }, [productList, selectedCategory, selectedUniversity, selectedUniversityObj, priceRange, searchQuery]);

  const displayedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === 'recommended') return getPersonalizedProducts(list);
    if (sortBy === 'price_low') return list.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === 'price_high') return list.sort((a, b) => Number(b.price) - Number(a.price));
    if (sortBy === 'newest') return list.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    return list;
  }, [filteredProducts, sortBy]);

  const personalizedPicks = useMemo(() => {
    if (selectedCategory !== 'all' || searchQuery) return [];
    return getPersonalizedProducts(productList, 4);
  }, [productList, selectedCategory, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header & Compact Mobile-Friendly Search Bar */}
      <div className="mb-6 space-y-4">
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

        {/* Search Input + Filter Reveal Toggle */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search items in the shop (tap to search & filter)..."
              value={searchQuery}
              onFocus={() => setFiltersVisible(true)}
              onClick={() => setFiltersVisible(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFiltersVisible(true);
              }}
              className="w-full pl-12 pr-10 py-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:border-[#a14b58] focus:ring-4 focus:ring-[#a14b581a] focus:outline-none text-sm sm:text-base shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFiltersVisible((v) => !v)}
            className={`px-4 py-3.5 rounded-2xl border-2 text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
              filtersVisible || activeFilterCount > 0
                ? 'border-[#a14b58] bg-[#fcf6f7] text-[#a14b58]'
                : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200'
            }`}
          >
            {filtersVisible ? <ChevronUp className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
            <span>{filtersVisible ? 'Hide Filters' : 'Filters'}</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#a14b58] text-white text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Category Quick-Tabs (compact single-line horizontal scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
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
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#a14b58] text-white shadow-md shadow-[#a14b5833]'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-[#a14b58] hover:text-[#a14b58]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Expandable Search Filters Drawer (Hidden by Default for Clean Mobile UX) */}
        {filtersVisible && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#f3d7db] shadow-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#a14b58]" />
                <h2 className="font-bold text-gray-900 text-sm">Refine Search Results</h2>
              </div>
              <div className="flex items-center gap-4">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="text-xs text-[#a14b58] font-bold hover:underline"
                  >
                    Reset Filters
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFiltersVisible(false)}
                  className="text-xs font-bold text-gray-500 hover:text-gray-800 px-2.5 py-1 rounded-lg bg-gray-100"
                >
                  Done
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Category Selector */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-2">Category</h3>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 ${
                      selectedCategory === 'all' ? 'bg-[#a14b58] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span>All</span>
                    {selectedCategory === 'all' && <Check className="w-3 h-3" />}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                        selectedCategory === cat.id
                          ? 'bg-[#a14b58] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campus University */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-2">Campus University</h3>
                <UniversitySelector
                  value={selectedUniversity}
                  onChange={(name, uni) => {
                    setSelectedUniversity(name);
                    setSelectedUniversityObj(uni || null);
                  }}
                  includeAllOption
                  compact
                />
              </div>

              {/* Price Range */}
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
                  onChange={(e) => setPriceRange(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#a14b58]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1">
                  <span>GH₵50</span>
                  <span>GH₵10,000+</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {searchQuery && (
          <div className="bg-[#fcf6f7] border border-[#f3d7db] px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-[#a14b58]">
            <span className="font-semibold">
              Searching for &ldquo;<strong className="font-black">{searchQuery}</strong>&rdquo; ({filteredProducts.length}{' '}
              found)
            </span>
            <button onClick={() => setSearchQuery('')} className="font-bold underline hover:text-[#883d49] ml-2">
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Main Full-Width Catalog */}
      <main className="space-y-8">
        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between gap-4">
            <p className="text-sm font-bold text-red-700">{loadError}</p>
            <button
              onClick={fetchProducts}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

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
                        For You
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {userHasHistory && userTopCategories.length > 0
                      ? `Curated based on your browsing & saved interests in ${userTopCategories.join(' & ')}`
                      : 'Popular student deals across campus'}
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

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
          <div>
            <h2 className="text-base font-black text-gray-900">
              {searchQuery
                ? `Search Results (${displayedProducts.length})`
                : selectedCategory === 'all'
                ? 'All Shop Listings'
                : `${categories.find((c) => c.id === selectedCategory)?.name || 'Category'} Listings`}
            </h2>
            <p className="text-xs text-gray-400">Showing {displayedProducts.length} approved items</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-bold">Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
            >
              <option value="recommended">Recommended</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {loading && productList.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-9 h-9 border-4 border-[#a14b58] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading shop listings...</p>
          </div>
        ) : displayedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              We couldn&apos;t find any approved items matching your current filters.
            </p>
            <button
              onClick={resetAllFilters}
              className="px-6 py-3 bg-[#a14b58] text-white rounded-xl font-bold hover:bg-[#863b48] transition-all shadow-md shadow-[#a14b5833]"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
