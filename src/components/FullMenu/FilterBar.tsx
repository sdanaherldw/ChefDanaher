import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ViewMode, SortOption, GroupByOption } from '../../hooks/useViewPreference';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  groupBy: GroupByOption;
  onGroupByChange: (group: GroupByOption) => void;
  tags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  showFavorites: boolean;
  onFavoritesToggle: () => void;
  recipeCount: number;
  onClearFilters: () => void;
  isScrolled: boolean;
  isMobile: boolean;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recently Made' },
  { value: 'alpha', label: 'A to Z' },
  { value: 'quickest', label: 'Quickest First' },
  { value: 'newest', label: 'Newest' },
];

const GROUP_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: 'protein', label: 'Protein' },
  { value: 'cuisine', label: 'Cuisine' },
  { value: 'style', label: 'Cooking Style' },
  { value: 'time', label: 'Time' },
];

export function FilterBar({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  groupBy,
  onGroupByChange,
  tags,
  selectedTags,
  onTagToggle,
  showFavorites,
  onFavoritesToggle,
  recipeCount,
  onClearFilters,
  isScrolled,
  isMobile,
}: FilterBarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasActiveFilters = showFavorites || selectedTags.length > 0 || search.length > 0;

  // Focus search on / key (handled by parent, but we expose ref)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <motion.div
      className={`filter-bar ${isScrolled ? 'scrolled' : ''}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="filter-bar-top">
        <div className="filter-bar-search">
          <input
            ref={searchInputRef}
            type="text"
            className="form-input filter-search-input"
            placeholder="What sounds good?"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="filter-bar-controls">
          <select
            className="form-input form-select filter-sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {viewMode === 'board' && (
            <select
              className="form-input form-select filter-group-select"
              value={groupBy}
              onChange={(e) => onGroupByChange(e.target.value as GroupByOption)}
            >
              {GROUP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Group by: {opt.label}
                </option>
              ))}
            </select>
          )}

          {!isMobile && (
            <div className="view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => onViewModeChange('list')}
                aria-label="List view"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="2" width="14" height="2" rx="1" />
                  <rect x="1" y="7" width="14" height="2" rx="1" />
                  <rect x="1" y="12" width="14" height="2" rx="1" />
                </svg>
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'board' ? 'active' : ''}`}
                onClick={() => onViewModeChange('board')}
                aria-label="Board view"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1" width="4" height="14" rx="1" />
                  <rect x="6" y="1" width="4" height="14" rx="1" />
                  <rect x="11" y="1" width="4" height="14" rx="1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="filter-bar-tags">
        <motion.button
          className={`filter-chip favorites-chip ${showFavorites ? 'active' : ''}`}
          onClick={onFavoritesToggle}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="heart-icon">{showFavorites ? '♥' : '♡'}</span>
          Keepers
        </motion.button>

        <motion.button
          className={`filter-chip ${selectedTags.length === 0 && !showFavorites ? 'active' : ''}`}
          onClick={onClearFilters}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          All
        </motion.button>

        {tags.map((tag, index) => (
          <motion.button
            key={tag}
            className={`filter-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
            onClick={() => onTagToggle(tag)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            {tag}
          </motion.button>
        ))}

        {hasActiveFilters && (
          <motion.button
            className="filter-chip clear-chip"
            onClick={onClearFilters}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            Clear the board
          </motion.button>
        )}

        <span className="recipe-count">
          {recipeCount} {recipeCount === 1 ? 'dish' : 'dishes'} ready to go
        </span>
      </div>
    </motion.div>
  );
}
