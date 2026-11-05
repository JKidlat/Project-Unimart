import React, { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { 
  getAllLegalDocuments, 
  getLegalDocumentsByCategory, 
  LegalDocument 
} from '../../../content/legalDocuments';
import { 
  ShieldCheck, 
  Search, 
  ArrowRight, 
  Scale, 
  FileText, 
  Lock, 
  ShoppingBag, 
  GraduationCap, 
  AlertTriangle, 
  HelpCircle,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export const LegalIndex: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const allDocs = useMemo(() => getAllLegalDocuments(), []);
  const categorizedDocs = useMemo(() => getLegalDocumentsByCategory(), []);
  const categories = useMemo(() => Object.keys(categorizedDocs), [categorizedDocs]);

  // Filter documents
  const filteredDocs = useMemo(() => {
    return allDocs.filter((doc) => {
      const matchesSearch = 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allDocs, searchTerm, selectedCategory]);

  // Category Icon helper
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'General Terms':
        return <Scale className="w-5 h-5 text-[#a14b58]" />;
      case 'Privacy & Data Protection':
        return <Lock className="w-5 h-5 text-indigo-500" />;
      case 'Orders & Fulfillment':
        return <ShoppingBag className="w-5 h-5 text-emerald-500" />;
      case 'Seller & Verification':
        return <GraduationCap className="w-5 h-5 text-amber-500" />;
      case 'Disputes & Enforcement':
        return <HelpCircle className="w-5 h-5 text-blue-500" />;
      case 'Marketplace Safety':
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link to="/" className="hover:text-[#a14b58] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white font-medium">
            Legal & Policy Center
          </span>
        </nav>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-white via-rose-50/20 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 sm:p-12 mb-10 shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-[#a14b58]/20 text-[#a14b58] dark:text-[#f48fb1] text-xs font-semibold uppercase tracking-wider mb-4">
              <ShieldCheck className="w-4 h-4" />
              Ghana Marketplace Compliance & Governance
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
              Unimart Legal & Trust Center
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg leading-relaxed mb-6">
              Welcome to the official legal registry of Unimart. Here you will find all 13 governing policies, terms of use, privacy declarations, and marketplace guidelines applicable to tertiary students, buyers, and sellers across Ghana.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Statutory Alignments:</span>
              <span className="bg-white dark:bg-gray-800 px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700">Data Protection Act, 2012 (Act 843)</span>
              <span className="bg-white dark:bg-gray-800 px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700">Electronic Transactions Act, 2008 (Act 772)</span>
              <span className="bg-white dark:bg-gray-800 px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700">Children&apos;s Act, 1998 (Act 560)</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search policies (e.g. returns, student verification, cookies)..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#a14b58] text-sm shadow-sm transition-all"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 text-sm">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors font-medium text-xs ${
                selectedCategory === 'all'
                  ? 'bg-[#a14b58] text-white shadow-sm'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              All Policies ({allDocs.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-colors font-medium text-xs ${
                  selectedCategory === cat
                    ? 'bg-[#a14b58] text-white shadow-sm'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {cat} ({categorizedDocs[cat]?.length || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Policy Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc: LegalDocument) => (
            <Link
              key={doc.slug}
              to={`/legal/${doc.slug}`}
              className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#a14b58]/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 group-hover:bg-rose-50 dark:group-hover:bg-rose-950/30 transition-colors">
                    {getCategoryIcon(doc.category)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    <span>v{doc.version}</span>
                  </div>
                </div>

                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#a14b58] dark:text-[#f48fb1] mb-1">
                  {doc.category}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#a14b58] dark:group-hover:text-[#f48fb1] transition-colors mb-2">
                  {doc.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                  {doc.description}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-semibold text-[#a14b58] dark:text-[#f48fb1]">
                <span>Read Full Document</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* No Results Fallback */}
        {filteredDocs.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              No matching legal policies found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Try adjusting your search query or reset the category filter.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 rounded-xl bg-[#a14b58] text-white text-xs font-semibold hover:bg-[#883d49] transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Bottom Contact and Cookie Management Help */}
        <div className="mt-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              Questions or Dispute Escalations?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Our campus administration and compliance team is available to assist buyers and sellers with dispute resolution, KYC eligibility, or data privacy requests.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).openCookiePreferences) {
                  (window as any).openCookiePreferences();
                }
              }}
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Manage Cookie Preferences
            </button>
            <Link
              to="/legal/disputes"
              className="px-4 py-2 rounded-xl bg-[#a14b58] text-white text-xs font-semibold hover:bg-[#883d49] transition-colors shadow-sm"
            >
              File a Dispute / Report
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
