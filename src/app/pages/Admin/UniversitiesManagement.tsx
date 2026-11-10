/**
 * ==============================================================================
 * ADMIN UNIVERSITY DIRECTORY MANAGEMENT (UniversitiesManagement.tsx)
 * ==============================================================================
 * Enables administrators to:
 * - View all 67+ Ghanaian tertiary institutions stored in PostgreSQL
 * - Search institutions by name or acronym
 * - Filter by official category & active status
 * - View registered user and listing counts per institution
 * - Add new institutions, edit details, and activate/deactivate cleanly
 * - Safely block permanent deletion when any users or listings are attached
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Search,
  Plus,
  Edit3,
  Power,
  Trash2,
  X,
  RefreshCw,
  Users,
  ShoppingBag,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { AdminLoadingState, AdminErrorState } from '../../components/Admin/AdminStateFeedback';
import { UNIVERSITY_CATEGORIES, invalidateUniversitiesCache } from '../../../hooks/useUniversities';
import { api } from '../../../lib/api';
import { toast } from 'sonner';

interface AdminUniversity {
  id: number;
  name: string;
  short_name: string;
  category: string;
  is_active: boolean;
  user_count: number;
  product_count: number;
}

interface UniversitiesResponse {
  summary: {
    total: number;
    active: number;
    inactive: number;
    public: number;
    technical: number;
    private: number;
  };
  results: AdminUniversity[];
}

export const UniversitiesManagement: React.FC = () => {
  const [universities, setUniversities] = useState<AdminUniversity[]>([]);
  const [summary, setSummary] = useState<UniversitiesResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUniversity | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    short_name: '',
    category: UNIVERSITY_CATEGORIES[0] as string,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const loadUniversities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<UniversitiesResponse>('/admin/universities/');
      setUniversities(Array.isArray(res?.results) ? res.results : []);
      setSummary(res?.summary || null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load universities directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUniversities();
  }, [loadUniversities]);

  const openCreateModal = () => {
    setEditing(null);
    setFormState({
      name: '',
      short_name: '',
      category: UNIVERSITY_CATEGORIES[0],
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (uni: AdminUniversity) => {
    setEditing(uni);
    setFormState({
      name: uni.name,
      short_name: uni.short_name,
      category: uni.category,
      is_active: uni.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/admin/universities/${editing.id}/`, formState);
        toast.success(`Updated "${formState.name}".`);
      } else {
        await api.post('/admin/universities/', formState);
        toast.success(`Added "${formState.name}" to the university directory.`);
      }
      invalidateUniversitiesCache();
      setModalOpen(false);
      await loadUniversities();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save institution.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (uni: AdminUniversity) => {
    const nextState = !uni.is_active;
    try {
      await api.patch(`/admin/universities/${uni.id}/`, { is_active: nextState });
      invalidateUniversitiesCache();
      toast.success(
        nextState
          ? `"${uni.name}" activated and visible in registration forms.`
          : `"${uni.name}" deactivated. Existing user accounts remain preserved.`
      );
      await loadUniversities();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update institution status.');
    }
  };

  const handleDelete = async (uni: AdminUniversity) => {
    if (uni.user_count > 0 || uni.product_count > 0) {
      toast.error('Cannot delete an institution with associated users or listings. Deactivate it instead.');
      return;
    }
    if (!confirm(`Permanently delete "${uni.name}"?`)) return;
    try {
      await api.delete(`/admin/universities/${uni.id}/`);
      invalidateUniversitiesCache();
      toast.success(`Deleted "${uni.name}".`);
      await loadUniversities();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to delete institution.');
    }
  };

  const filtered = universities.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      u.short_name.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'All' || u.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' || (statusFilter === 'active' ? u.is_active : !u.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              University Directory Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Manage accredited Ghanaian tertiary institutions, categories, and visibility
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadUniversities}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-gradient-to-r from-[#a14b58] to-[#c86371] hover:from-[#863b48] hover:to-[#a14b58] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#a14b58]/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Institution
            </button>
          </div>
        </div>

        {loading && universities.length === 0 ? (
          <AdminLoadingState label="Loading university directory..." />
        ) : error ? (
          <AdminErrorState message={error} onRetry={loadUniversities} />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">Total Institutions</span>
                  <GraduationCap className="w-4 h-4 text-[#a14b58]" />
                </div>
                <p className="text-2xl font-black text-gray-900">{summary?.total ?? universities.length}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {summary?.active ?? 0} active • {summary?.inactive ?? 0} inactive
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-xs font-bold text-gray-500 uppercase block mb-2">Public Universities</span>
                <p className="text-2xl font-black text-gray-900">{summary?.public ?? 0}</p>
                <p className="text-[11px] text-gray-500 mt-1">Accredited public institutions</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-xs font-bold text-gray-500 uppercase block mb-2">Technical Universities</span>
                <p className="text-2xl font-black text-gray-900">{summary?.technical ?? 0}</p>
                <p className="text-[11px] text-gray-500 mt-1">Public technical institutions</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-xs font-bold text-gray-500 uppercase block mb-2">Private & Colleges</span>
                <p className="text-2xl font-black text-gray-900">{summary?.private ?? 0}</p>
                <p className="text-[11px] text-gray-500 mt-1">Private universities & colleges</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search institutions by name or acronym (e.g. KNUST, KUCoHAS)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none text-xs sm:text-sm font-medium"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
                  >
                    <option value="All">All Categories</option>
                    {UNIVERSITY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-bold">
                    {(['all', 'active', 'inactive'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                          statusFilter === st ? 'bg-[#a14b58] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#faf8f8] border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Institution</th>
                      <th className="px-5 py-3.5">Code</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Users</th>
                      <th className="px-5 py-3.5">Listings</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                          No institutions found matching your search or filter.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((uni) => {
                        const hasLinkedRecords = uni.user_count > 0 || uni.product_count > 0;
                        return (
                          <tr key={uni.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-gray-900">{uni.name}</td>
                            <td className="px-5 py-3.5 font-mono text-gray-600">{uni.short_name}</td>
                            <td className="px-5 py-3.5">
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                                {uni.category}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1 font-bold text-gray-700">
                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                {uni.user_count}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center gap-1 font-bold text-gray-700">
                                <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
                                {uni.product_count}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black ${
                                  uni.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {uni.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditModal(uni)}
                                  className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                                  title="Edit Institution"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleActive(uni)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    uni.is_active
                                      ? 'hover:bg-amber-50 text-amber-600'
                                      : 'hover:bg-green-50 text-green-600'
                                  }`}
                                  title={uni.is_active ? 'Deactivate' : 'Activate'}
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(uni)}
                                  disabled={hasLinkedRecords}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    hasLinkedRecords
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : 'hover:bg-red-50 text-red-500'
                                  }`}
                                  title={
                                    hasLinkedRecords
                                      ? 'Cannot delete while users or products reference this institution'
                                      : 'Delete Unused Institution'
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-black text-gray-900 mb-1">
                {editing ? 'Edit Institution' : 'Add New Institution'}
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                {editing
                  ? 'Updating institution details preserves all registered users and listings.'
                  : 'New active institutions become immediately available in signup and profile forms.'}
              </p>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Official Institution Name *</label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. University of Ghana"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Short Name / Acronym *</label>
                  <input
                    type="text"
                    required
                    value={formState.short_name}
                    onChange={(e) => setFormState((p) => ({ ...p, short_name: e.target.value }))}
                    placeholder="e.g. UG"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Category *</label>
                  <select
                    value={formState.category}
                    onChange={(e) => setFormState((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#a14b58]"
                  >
                    {UNIVERSITY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formState.is_active}
                    onChange={(e) => setFormState((p) => ({ ...p, is_active: e.target.checked }))}
                    className="w-4 h-4 accent-[#a14b58]"
                  />
                  <span>Active in public registration & profile dropdowns</span>
                </label>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 bg-[#a14b58] hover:bg-[#863b48] text-white font-bold text-xs rounded-xl disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Institution'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

