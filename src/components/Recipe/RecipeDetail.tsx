import type { Recipe } from '../../types';
import { Button } from '../UI/Button';

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
  onDelete: () => void;
}

export function RecipeDetail({ recipe, onClose, onDelete }: RecipeDetailProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="recipe-detail">
      <div className="card">
        <div className="recipe-detail-header">
          <h2 className="recipe-detail-name">{recipe.name}</h2>
          <p className="recipe-detail-description">{recipe.description}</p>
          <div className="recipe-detail-meta">
            <span>{recipe.totalTime} minutes</span>
            <span>{recipe.servings} servings</span>
            <span>{recipe.equipment.join(', ')}</span>
          </div>
          <div className="recipe-tags" style={{ justifyContent: 'center', marginTop: 'var(--space-md)' }}>
            {recipe.tags.map((tag) => (
              <span key={tag} className={`tag ${tag === 'vegan' ? 'vegan' : ''}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="recipe-section">
          <h3 className="recipe-section-title">Ingredients</h3>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="ingredient-item">
                <span>{ing.name}</span>
                <span>
                  {ing.amount} {ing.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="recipe-section">
          <h3 className="recipe-section-title">Instructions</h3>
          <ol className="step-list">
            {recipe.steps.map((step, i) => (
              <li key={i} className="step-item">
                {step.instruction}
                <div className="step-duration">{step.duration} min</div>
              </li>
            ))}
          </ol>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 'var(--space-md)',
            justifyContent: 'center',
            marginTop: 'var(--space-xl)',
          }}
          className="no-print"
        >
          <Button variant="secondary" onClick={onClose}>
            Back
          </Button>
          <Button onClick={handlePrint}>Print Recipe</Button>
          <Button variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
