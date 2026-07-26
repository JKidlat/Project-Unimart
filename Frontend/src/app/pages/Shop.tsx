import React, { useState } from 'react';
import { Filter, SlidersHorizontal, ChevronDown, Search, X } from 'lucide-react';
import { products, categories, universities } from '../data/mockData';
import { ProductCard } from '../components/ProductCard';
import { useUser } from '../context/UserContext';

/**
 * Shop Page Component
 * 
 * The main marketplace interface. It allows users to browse products with 
 * advanced filtering capabilities including:
 * 1. Global text search (via UserContext)
 * 2. Category selection
 * 3. University-specific filtering
 * 4. Price range adjustments
 * 
 * It dynamically filters the `products` list based on the user's active criteria.
 */
export const Shop = () => {
  // Pull the global search state from context
  const { searchQuery, setSearchQuery } = useUser();
  
  // Local filter states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedUniversity, setSelectedUniversity] = useState('all');
  const [priceRange, setPriceRange] = useState(10000);

  /**
   * Computed filtered products list.
   * Runs on every render whenever filter dependencies change.
   */
  const filteredProducts = products.filter(p => {
    // 1. Filter by category
    const categoryMatch = selectedCategory === 'all' || p.category === selectedCategory;
    
    // 2. Filter by university (checks if the product is available in the selected uni)
    const uniMatch = selectedUniversity === 'all' || p.university.includes(selectedUniversity);
    
    // 3. Filter by price ceiling
    const priceMatch = p.price <= priceRange;
    
    // 4. Filter by global or local search text (matches name, description, or category)
    const searchMatch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    // All conditions must be met for a product to appear
    return categoryMatch && uniMatch && priceMatch && searchMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 space-y-8 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Filter className="w-5 h-5 text-purple-600" />
              <h2 className="font-bold text-xl">Filters</h2>
            </div>

            {/* Category Filter */}
            <div className="space-y-4 mb-8">
              <h3 className="font-semibold text-gray-900">Category</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === 'all' ? 'bg-[#fcf6f7] text-[#a14b58] font-bold' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === cat.id ? 'bg-[#fcf6f7] text-[#a14b58] font-bold' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* University Filter */}
            <div className="space-y-4 mb-8">
              <h3 className="font-semibold text-gray-900">University</h3>
              <select 
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none text-sm"
                onChange={(e) => setSelectedUniversity(e.target.value)}
                value={selectedUniversity}
              >
                <option value="all">All Universities</option>
                {universities.map(uni => (
                  <option key={uni} value={uni}>{uni}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Max Price</h3>
                <span className="text-[#a14b58] font-bold">GH₵{priceRange}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="10000" 
                step="100"
                value={priceRange}
                onChange={(e) => setPriceRange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#a14b58]"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                <span>GH₵0</span>
                <span>GH₵10,000+</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <main className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shop All Products</h1>
              <p className="text-sm text-gray-500">Showing {filteredProducts.length} items</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search in results..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none text-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#a14b58]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shrink-0">
                Sort by <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Search className="w-10 h-10 text-gray-300" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No products found</h2>
              <p className="text-gray-500 mb-8">Try adjusting your filters or search terms.</p>
              <button 
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedUniversity('all');
                  setPriceRange(10000);
                  setSearchQuery('');
                }}
                className="px-6 py-3 bg-[#a14b58] text-white rounded-xl font-bold hover:bg-[#863b48] transition-all"
              >
                Reset Filters
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
