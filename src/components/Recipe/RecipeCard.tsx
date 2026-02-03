import type { Recipe } from '../../types';

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
  compact?: boolean;
}

export function RecipeCard({ recipe, onClick, compact = false }: RecipeCardProps) {
  return (
    <div
      className="recipe-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'grab' }}
    >
      <div className="recipe-card-name">{recipe.name}</div>
      {!compact && (
        <>
          <div className="recipe-card-meta">
            {recipe.totalTime} min • {recipe.servings} servings
          </div>
          <div className="recipe-tags">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={`tag ${tag === 'vegan' ? 'vegan' : ''}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
