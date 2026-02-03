import { useState, useMemo } from 'react';
import { useAppState } from '../../context/AppContext';
import { DraggableRecipe } from './DraggableRecipe';
import type { Recipe } from '../../types';

interface RecipeListProps {
  onRecipeClick: (recipe: Recipe) => void;
}

export function RecipeList({ onRecipeClick }: RecipeListProps) {
  const { state } = useAppState();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

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

  return (
    <div className="sidebar-section">
      <h3 className="sidebar-title">Recipes</h3>

      <input
        type="text"
        className="form-input search-input"
        placeholder="Search recipes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {allTags.length > 0 && (
        <div className="recipe-tags" style={{ marginBottom: 'var(--space-md)' }}>
          <span
            className={`tag ${tagFilter === null ? 'vegan' : ''}`}
            onClick={() => setTagFilter(null)}
            style={{ cursor: 'pointer' }}
          >
            All
          </span>
          {allTags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className={`tag ${tagFilter === tag ? 'vegan' : ''}`}
              onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
              style={{ cursor: 'pointer' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="recipe-list">
        {filteredRecipes.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-gray)' }}>
            {state.recipes.length === 0
              ? 'No recipes yet. Generate one!'
              : 'No recipes match your search.'}
          </p>
        ) : (
          filteredRecipes.map((recipe) => (
            <DraggableRecipe
              key={recipe.id}
              recipe={recipe}
              source="recipe-list"
              onClick={() => onRecipeClick(recipe)}
            />
          ))
        )}
      </div>
    </div>
  );
}
