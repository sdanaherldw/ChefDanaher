import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../components/Layout/Layout';
import { FilterBar } from '../components/FullMenu/FilterBar';
import { ListViewGrid } from '../components/FullMenu/ListViewGrid';
import { BoardView } from '../components/FullMenu/BoardView';
import { RecipeDetail } from '../components/Recipe/RecipeDetail';
import { EmptyState } from '../components/UI/EmptyState';
import { DinerSpinner } from '../components/UI/DinerSpinner';
import { useAppState } from '../context/AppContext';
import { useViewPreference, type SortOption } from '../hooks/useViewPreference';
import { useDebounce } from '../hooks/useDebounce';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { getTopTags } from '../utils/tagCategories';
import type { Recipe } from '../types';

interface FullMenuPageProps {
  onBack: () => void;
}

function getUpcomingWeekdays(count: number = 5): { date: string; label: string }[] {
  const days: { date: string; label: string }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let d = new Date();

  while (days.length < count) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = d.toISOString().split('T')[0];
      const isToday = days.length === 0 && new Date().toISOString().split('T')[0] === dateStr;
      days.push({
        date: dateStr,
        label: isToday ? 'Today' : dayNames[dayOfWeek],
      });
    }
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  }

  return days;
}

function sortRecipes(recipes: Recipe[], sortBy: SortOption): Recipe[] {
  const sorted = [...recipes];

  switch (sortBy) {
    case 'recent':
      // Favorites first, then by last used date (most recent first), never-made last
      return sorted.sort((a, b) => {
        // Favorites always first
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;

        // Then by last used
        if (!a.lastUsedAt && !b.lastUsedAt) return 0;
        if (!a.lastUsedAt) return 1;
        if (!b.lastUsedAt) return -1;
        return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
      });

    case 'alpha':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));

    case 'quickest':
      return sorted.sort((a, b) => a.totalTime - b.totalTime);

    case 'newest':
      return sorted.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    default:
      return sorted;
  }
}

export function FullMenuPage({ onBack }: FullMenuPageProps) {
  const { state, isLoading, toggleFavorite, assignRecipeToDay, removeRecipe, addToast } = useAppState();
  const {
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    groupBy,
    setGroupBy,
  } = useViewPreference();

  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(search, 300);

  // Upcoming weekdays for quick assign
  const upcomingDays = useMemo(() => getUpcomingWeekdays(5), []);

  // Get top tags from recipes
  const topTags = useMemo(
    () => getTopTags(state.recipes, 8),
    [state.recipes]
  );

  // Filter and sort recipes
  const filteredRecipes = useMemo(() => {
    let recipes = state.recipes;

    // Filter by favorites
    if (showFavorites) {
      recipes = recipes.filter((r) => r.isFavorite);
    }

    // Filter by selected tags (AND logic)
    if (selectedTags.length > 0) {
      recipes = recipes.filter((r) =>
        selectedTags.every((tag) => r.tags.includes(tag))
      );
    }

    // Filter by search (name, description, AND tags)
    if (debouncedSearch.trim()) {
      const lower = debouncedSearch.toLowerCase();
      recipes = recipes.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.description.toLowerCase().includes(lower) ||
          r.tags.some((tag) => tag.toLowerCase().includes(lower))
      );
    }

    // Sort
    return sortRecipes(recipes, sortBy);
  }, [state.recipes, showFavorites, selectedTags, debouncedSearch, sortBy]);

  // Handle scroll for sticky filter bar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Force list view on mobile
      if (window.innerWidth < 768 && viewMode === 'board') {
        setViewMode('list');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [viewMode, setViewMode]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Escape',
        action: () => {
          if (selectedRecipe) {
            setSelectedRecipe(null);
          } else if (search) {
            setSearch('');
          } else {
            onBack();
          }
        },
        description: 'Close modal or go back',
      },
      {
        key: 'g',
        action: () => {
          if (!isMobile) {
            setViewMode(viewMode === 'list' ? 'board' : 'list');
          }
        },
        description: 'Toggle view mode',
      },
    ],
  });

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setSelectedTags([]);
    setShowFavorites(false);
  }, []);

  const handleFavoriteToggle = useCallback(
    async (recipeId: string) => {
      const recipe = state.recipes.find((r) => r.id === recipeId);
      await toggleFavorite(recipeId);
      addToast(
        recipe?.isFavorite ? 'Removed from favorites' : "Added to your keepers!",
        'success'
      );
    },
    [state.recipes, toggleFavorite, addToast]
  );

  const handleAssignToDay = useCallback(
    async (recipeId: string, date: string) => {
      await assignRecipeToDay(date, recipeId);
      const day = upcomingDays.find((d) => d.date === date);
      addToast(`Added to ${day?.label || 'the calendar'}!`, 'success');
    },
    [assignRecipeToDay, upcomingDays, addToast]
  );

  const handleRecipeClick = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  const handleDeleteRecipe = useCallback(async () => {
    if (selectedRecipe) {
      await removeRecipe(selectedRecipe.id);
      addToast(`${selectedRecipe.name} has been 86'd`, 'info');
      setSelectedRecipe(null);
    }
  }, [selectedRecipe, removeRecipe, addToast]);

  if (isLoading) {
    return (
      <Layout showSettings={false}>
        <motion.div
          className="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <DinerSpinner context="browse" />
        </motion.div>
      </Layout>
    );
  }

  // Recipe detail modal
  if (selectedRecipe) {
    return (
      <Layout showSettings={false}>
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={handleCloseDetail}
          onDelete={handleDeleteRecipe}
        />
      </Layout>
    );
  }

  return (
    <Layout showSettings={false}>
      <motion.div
        className="full-menu-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Page Header */}
        <motion.header
          className="full-menu-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button className="back-button" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
            Back to the Floor
          </button>
          <h1 className="full-menu-title">The Full Menu</h1>
          <div className="full-menu-header-spacer" />
        </motion.header>

        {/* Filter Bar */}
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortChange={setSortBy}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          tags={topTags}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          showFavorites={showFavorites}
          onFavoritesToggle={() => setShowFavorites(!showFavorites)}
          recipeCount={filteredRecipes.length}
          onClearFilters={handleClearFilters}
          isScrolled={isScrolled}
          isMobile={isMobile}
        />

        {/* Content */}
        <div className="full-menu-content">
          {state.recipes.length === 0 ? (
            <EmptyState variant="full-menu-empty" onAction={onBack} />
          ) : filteredRecipes.length === 0 ? (
            <EmptyState variant="full-menu-no-results" onAction={handleClearFilters} />
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === 'list' ? (
                <ListViewGrid
                  key="list"
                  recipes={filteredRecipes}
                  onRecipeClick={handleRecipeClick}
                  onFavoriteToggle={handleFavoriteToggle}
                  onAssignToDay={handleAssignToDay}
                  upcomingDays={upcomingDays}
                />
              ) : (
                <BoardView
                  key="board"
                  recipes={filteredRecipes}
                  groupBy={groupBy}
                  onRecipeClick={handleRecipeClick}
                  onFavoriteToggle={handleFavoriteToggle}
                  onAssignToDay={handleAssignToDay}
                  upcomingDays={upcomingDays}
                />
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </Layout>
  );
}
