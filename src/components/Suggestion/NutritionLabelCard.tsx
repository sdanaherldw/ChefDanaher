import type { Recipe } from '../../types';

interface NutritionLabelCardProps {
  recipe: Recipe;
}

export function NutritionLabelCard({ recipe }: NutritionLabelCardProps) {
  return (
    <div className="nutrition-label">
      <div className="nutrition-label-header">
        <span>Recipe Facts</span>
      </div>

      <div className="nutrition-label-title">
        {recipe.name}
      </div>

      <div className="nutrition-label-thick-border" />

      <div className="nutrition-label-meta">
        <div className="nutrition-label-meta-item">
          <span className="nutrition-label-meta-label">Servings</span>
          <span className="nutrition-label-meta-value">{recipe.servings}</span>
        </div>
        <div className="nutrition-label-meta-divider">|</div>
        <div className="nutrition-label-meta-item">
          <span className="nutrition-label-meta-label">Time</span>
          <span className="nutrition-label-meta-value">{recipe.totalTime} min</span>
        </div>
      </div>

      <div className="nutrition-label-section">
        <div className="nutrition-label-section-title">Ingredients</div>
        <ul className="nutrition-label-ingredients">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={index} className="nutrition-label-ingredient">
              <span className="nutrition-label-ingredient-name">{ingredient.name}</span>
              <span className="nutrition-label-ingredient-dots" />
              <span className="nutrition-label-ingredient-amount">
                {ingredient.amount} {ingredient.unit}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="nutrition-label-description">
        "{recipe.description}"
      </div>

      {recipe.tags.length > 0 && (
        <div className="nutrition-label-tags">
          {recipe.tags.map((tag) => (
            <span key={tag} className="nutrition-label-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
