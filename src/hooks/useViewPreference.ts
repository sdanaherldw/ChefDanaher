import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'list' | 'board';
export type SortOption = 'recent' | 'alpha' | 'quickest' | 'newest';
export type GroupByOption = 'protein' | 'cuisine' | 'style' | 'time';

interface ViewPreferences {
  viewMode: ViewMode;
  sortBy: SortOption;
  groupBy: GroupByOption;
}

const STORAGE_KEY = 'fullmenu-preferences';

const DEFAULT_PREFERENCES: ViewPreferences = {
  viewMode: 'list',
  sortBy: 'recent',
  groupBy: 'protein',
};

export function useViewPreference() {
  const [preferences, setPreferences] = useState<ViewPreferences>(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
        }
      } catch (e) {
        console.warn('Failed to load view preferences:', e);
      }
    }
    return DEFAULT_PREFERENCES;
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.warn('Failed to save view preferences:', e);
    }
  }, [preferences]);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    setPreferences(prev => ({ ...prev, viewMode }));
  }, []);

  const setSortBy = useCallback((sortBy: SortOption) => {
    setPreferences(prev => ({ ...prev, sortBy }));
  }, []);

  const setGroupBy = useCallback((groupBy: GroupByOption) => {
    setPreferences(prev => ({ ...prev, groupBy }));
  }, []);

  return {
    ...preferences,
    setViewMode,
    setSortBy,
    setGroupBy,
  };
}
