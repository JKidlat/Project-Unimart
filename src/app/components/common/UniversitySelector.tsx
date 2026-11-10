import React, { useMemo, useState } from 'react';
import { GraduationCap, RefreshCw, Search } from 'lucide-react';
import { useUniversities, type UniversityOption } from '../../../hooks/useUniversities';

interface UniversitySelectorProps {
  value: string;
  onChange: (name: string, university?: UniversityOption | null) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  includeAllOption?: boolean;
  allLabel?: string;
  placeholder?: string;
  showSearch?: boolean;
  compact?: boolean;
  className?: string;
}

export const UniversitySelector: React.FC<UniversitySelectorProps> = ({
  value,
  onChange,
  name = 'university',
  required = false,
  disabled = false,
  includeAllOption = false,
  allLabel = 'All Ghanaian Campuses',
  placeholder = 'Select your institution',
  showSearch = true,
  compact = false,
  className = '',
}) => {
  const { universities, groupedUniversities, loading, error, refresh } = useUniversities();
  const [filterText, setFilterText] = useState('');

  const filteredGroups = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return groupedUniversities;
    return groupedUniversities
      .map((g) => ({
        category: g.category,
        items: g.items.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.short_name.toLowerCase().includes(q) ||
            u.category.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groupedUniversities, filterText]);

  const resolvedValue = useMemo(() => {
    if (!value) return includeAllOption ? 'all' : '';
    if (includeAllOption && value === 'all') return 'all';
    const match = universities.find(
      (u) =>
        u.name.toLowerCase() === value.toLowerCase() ||
        u.short_name.toLowerCase() === value.toLowerCase() ||
        `${u.name} (${u.short_name})`.toLowerCase() === value.toLowerCase()
    );
    return match ? match.name : value;
  }, [value, universities, includeAllOption]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'all') {
      onChange('all', null);
      return;
    }
    const found = universities.find((u) => u.name === val) || null;
    onChange(val, found);
  };

  if (error && universities.length === 0) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-2 text-xs text-red-700">
        <span>{error}</span>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-red-200 rounded-lg font-bold text-red-700 hover:bg-red-100 shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {showSearch && universities.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter 67 institutions by name or acronym..."
            aria-label="Filter institutions"
            className={`w-full pl-8 pr-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none ${
              compact ? 'py-1.5 text-xs' : 'py-2 text-xs'
            }`}
          />
        </div>
      )}

      <div className="relative">
        {!compact && (
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        )}
        <select
          name={name}
          required={required}
          disabled={disabled || loading}
          value={resolvedValue}
          onChange={handleSelect}
          className={`w-full bg-gray-50 border border-[#f3d7db] rounded-xl focus:ring-2 focus:ring-[#a14b58] focus:outline-none ${
            compact ? 'p-2.5 text-xs font-medium border-gray-200' : 'pl-10 pr-4 py-3 font-medium'
          }`}
        >
          {loading ? (
            <option value="">Loading Ghanaian universities...</option>
          ) : includeAllOption ? (
            <option value="all">{allLabel}</option>
          ) : (
            <option value="">{placeholder}</option>
          )}

          {filteredGroups.map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.items.map((uni) => (
                <option key={uni.id} value={uni.name}>
                  {uni.name} ({uni.short_name})
                </option>
              ))}
            </optgroup>
          ))}

          {resolvedValue &&
            resolvedValue !== 'all' &&
            !universities.some((u) => u.name === resolvedValue) && (
              <option value={resolvedValue}>{resolvedValue}</option>
            )}
        </select>
      </div>
    </div>
  );
};

