import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const AdminLoadingState: React.FC<{ label?: string }> = ({ label = 'Loading records from database...' }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs">
    <div className="w-8 h-8 border-4 border-[#a14b58] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
    <p className="text-xs font-bold text-gray-500">{label}</p>
  </div>
);

export const AdminErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="bg-red-50 rounded-2xl border border-red-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-black text-red-900">Unable to load admin data</p>
        <p className="text-xs text-red-700 mt-0.5">{message}</p>
      </div>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    )}
  </div>
);

export function formatAdminDate(isoString?: string | null): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatAdminDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

