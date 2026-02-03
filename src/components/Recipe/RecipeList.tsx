import { useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppState } from '../../context/AppContext';
import { DraggableRecipe } from './DraggableRecipe';
import { EmptyState } from '../UI/EmptyState';
import type { Recipe } from '../../types';

interface RecipeListProps {
  onRecipeClick: (recipe: Recipe) => void;
}

export interface RecipeListRef {
  focusSearch: () => void;
}

export const RecipeList = forwardRef<RecipeListRef, RecipeListProps>(
  function RecipeList({ onRecipeClick }, ref) {
    const { state } = useAppState();
    const [search, setSearch] = useState('');
    const [tagFilter, setTagFilter] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusSearch: () => searchInputRef.current?.focus(),
    }));

    const allTags = useMemo(() => {
      const tags = new Set<string>();
      state.recipes.forEach((recipe) => {
        recipe.tags.forEach((tag) => tags.add(tag));
      });
      return Array.from(tags).sort();
    }, [state.recipes]);

    const filteredRecipes = useMemo(() => {
      return state.recipes.filter((recipe) => {
        const matchesSearch =
          search === '' ||
          recipe.name.toLowerCase().includes(search.toLowerCase()) ||
          recipe.description.toLowerCase().includes(search.toLowerCase());

        const matchesTag =
          tagFilter === null || recipe.tags.includes(tagFilter);

        return matchesSearch && matchesTag;
      });
    }, [state.recipes, search, tagFilter]);

    if (state.recipes.length === 0) {
      return <EmptyState variant="no-recipes" />;
    }

    return (
      <div>
        <input
          ref={searchInputRef}
          type="text"
          className="form-input search-input"
          placeholder="What sounds good?"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {allTags.length > 0 && (
          <motion.div
            className="recipe-tags"
            style={{ marginBottom: 'var(--space-md)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.span
              className={`tag ${tagFilter === null ? 'vegan' : ''}`}
              onClick={() => setTagFilter(null)}
              style={{ cursor: 'pointer' }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              All
            </motion.span>
            {allTags.slice(0, 5).map((tag, index) => (
              <motion.span
                key={tag}
                className={`tag ${tagFilter === tag ? 'vegan' : ''}`}
                onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                style={{ cursor: 'pointer' }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                {tag}
              </motion.span>
            ))}
          </motion.div>
        )}

        <div className="recipe-list">
          <AnimatePresence mode="popLayout">
            {filteredRecipes.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EmptyState variant="search-empty" />
              </motion.div>
            ) : (
              filteredRecipes.map((recipe, index) => (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                    delay: Math.min(index * 0.05, 0.4)
                  }}
                  layout
                >
                  <DraggableRecipe
                    recipe={recipe}
                    source="recipe-list"
                    onClick={() => onRecipeClick(recipe)}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);
