import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../lib/api';

export interface UniversityOption {
  id: number;
  name: string;
  short_name: string;
  category: string;
  is_active: boolean;
}

export const UNIVERSITY_CATEGORIES = [
  'Public Universities',
  'Public Technical Universities',
  'Private Universities and University Colleges',
] as const;

let cachedUniversities: UniversityOption[] | null = null;
let inflightPromise: Promise<UniversityOption[]> | null = null;

export function invalidateUniversitiesCache() {
  cachedUniversities = null;
  inflightPromise = null;
}

export async function loadUniversities(forceRefresh = false): Promise<UniversityOption[]> {
  if (!forceRefresh && cachedUniversities) {
    return cachedUniversities;
  }
  if (!forceRefresh && inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = api
    .get<UniversityOption[] | { results: UniversityOption[] }>('/universities/')
    .then((res) => {
      const list = Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : [];
      cachedUniversities = list;
      return list;
    })
    .finally(() => {
      inflightPromise = null;
    });

  return inflightPromise;
}

export function useUniversities() {
  const [universities, setUniversities] = useState<UniversityOption[]>(cachedUniversities || []);
  const [loading, setLoading] = useState<boolean>(!cachedUniversities);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadUniversities(forceRefresh);
      setUniversities(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load universities directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(false);
  }, [fetchList]);

  const groupedUniversities = useMemo(() => {
    const groups: { category: string; items: UniversityOption[] }[] = UNIVERSITY_CATEGORIES.map(
      (cat) => ({
        category: cat,
        items: universities.filter((u) => u.category === cat),
      })
    );
    const knownSet = new Set<string>(UNIVERSITY_CATEGORIES);
    const other = universities.filter((u) => !knownSet.has(u.category));
    if (other.length > 0) {
      groups.push({ category: 'Other Accredited Institutions', items: other });
    }
    return groups.filter((g) => g.items.length > 0);
  }, [universities]);

  return {
    universities,
    groupedUniversities,
    loading,
    error,
    refresh: () => fetchList(true),
  };
}

