import React, { useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router';
import { 
  getLegalDocument, 
  getAllLegalDocuments,
  LegalDocument 
} from '../../../content/legalDocuments';
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer';
import { 
  FileText, 
  Calendar, 
  Tag, 
  ArrowLeft, 
  ChevronRight, 
  Printer, 
  Share2, 
  ShieldAlert, 
  BookOpen, 
  ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';

export const LegalDocumentPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Resolve effective slug from URL params or path alias
  const resolvedSlug = useMemo(() => {
    if (slug) return slug;
    const path = location.pathname.replace(/^\/legal\//, '').replace(/^\//, '');
    if (path === 'terms') return 'terms';
    if (path === 'privacy') return 'privacy';
    if (path === 'cookies') return 'cookies';
    if (path === 'returns' || path === 'refunds') return 'refunds-returns';
    if (path === 'disclaimer') return 'disclaimer';
    return path;
  }, [slug, location.pathname]);

  // Retrieve document from central legal content file
  const doc: LegalDocument | undefined = useMemo(() => {
    return resolvedSlug ? getLegalDocument(resolvedSlug) : undefined;
  }, [resolvedSlug]);

  // Extract table of contents from content (h2 headings)
  const tableOfContents = useMemo(() => {
    if (!doc) return [];
    const headings: { text: string; id: string }[] = [];
    const lines = doc.content.split('\n');
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('## ')) {
        const text = trimmed.replace(/^##\s+/, '');
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        headings.push({ text, id });
      }
    });
    return headings;
  }, [doc]);

  // All documents for quick sidebar links
  const allDocs = useMemo(() => getAllLegalDocuments(), []);

  // Copy link handler
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // 404 Not Found state
  if (!doc) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 mx-auto mb-4 bg-rose-50 dark:bg-rose-950/40 text-[#a14b58] rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Legal Document Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The legal policy or document requested (<code className="font-mono text-sm">{slug}</code>) could not be located in the central registry.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              Go Back
            </button>
            <Link
              to="/legal"
              className="px-5 py-2.5 rounded-xl bg-[#a14b58] text-white hover:bg-[#883d49] font-medium transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              View All Legal Documents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link to="/" className="hover:text-[#a14b58] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/legal" className="hover:text-[#a14b58] transition-colors">
            Legal Center
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white font-medium truncate max-w-xs sm:max-w-md">
            {doc.title}
          </span>
        </nav>

        {/* Header Hero */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-10 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#a14b58] dark:text-[#f48fb1] border border-[#a14b58]/20">
                  {doc.category}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                  <Tag className="w-3 h-3" />
                  Version {doc.version}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />
                  Effective: {doc.effectiveDate}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {doc.title}
              </h1>
              <p className="mt-2 text-base text-gray-600 dark:text-gray-300 max-w-3xl">
                {doc.description}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-start lg:self-center">
              <button
                onClick={handleCopyLink}
                title="Share link"
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-[#a14b58] transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={handlePrint}
                title="Print document"
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-[#a14b58] transition-colors"
              >
                <Printer className="w-5 h-5" />
              </button>
              <Link
                to="/legal"
                className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                All Policies
              </Link>
            </div>
          </div>

          <div className="pt-4 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-y-1 gap-x-4">
            <span>Jurisdiction: Republic of Ghana</span>
            <span>•</span>
            <span>Source of Truth: <code className="font-mono">src/content/legalDocuments.ts</code></span>
            <span>•</span>
            <span>Direct Public Access</span>
          </div>
        </div>

        {/* Content Layout with Table of Contents Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Policy Content (8 columns on lg) */}
          <main className="lg:col-span-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-10 shadow-sm">
            <MarkdownRenderer content={doc.content} />
          </main>

          {/* Sticky Sidebar (4 columns on lg) */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* Table of Contents Box */}
            {tableOfContents.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#a14b58]" />
                  On This Page
                </h3>
                <nav className="space-y-1.5 max-h-80 overflow-y-auto pr-1 text-sm">
                  {tableOfContents.map((heading, idx) => (
                    <a
                      key={idx}
                      href={`#${heading.id}`}
                      className="block py-1 px-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-[#a14b58] dark:hover:text-[#f48fb1] hover:bg-rose-50/50 dark:hover:bg-rose-950/20 text-xs transition-colors"
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {/* Other Policies Directory Links */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#a14b58]" />
                All Legal Documents ({allDocs.length})
              </h3>
              <div className="space-y-1 text-xs max-h-72 overflow-y-auto pr-1">
                {allDocs.map((item) => {
                  const isActive = item.slug === doc.slug;
                  return (
                    <Link
                      key={item.slug}
                      to={`/legal/${item.slug}`}
                      className={`block py-1.5 px-2.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[#a14b58] text-white font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="truncate">{item.title}</div>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                <Link
                  to="/legal"
                  className="text-xs font-semibold text-[#a14b58] hover:underline flex items-center justify-between"
                >
                  <span>Open Legal Center Index</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
