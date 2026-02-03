import type { Recipe, Ingredient, RecipeStep } from '../../types';
import { hasProteinVariants } from '../../types';
import { Button } from '../UI/Button';

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
  onDelete: () => void;
}

function IngredientList({ ingredients, title }: { ingredients: Ingredient[]; title?: string }) {
  return (
    <div className="recipe-section">
      <h3 className="recipe-section-title">{title || 'Ingredients'}</h3>
      <ul className="ingredient-list">
        {ingredients.map((ing, i) => (
          <li key={i} className="ingredient-item">
            <span>{ing.name}</span>
            <span>
              {ing.amount} {ing.unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepList({ steps, title }: { steps: RecipeStep[]; title?: string }) {
  return (
    <div className="recipe-section">
      <h3 className="recipe-section-title">{title || 'Instructions'}</h3>
      <ol className="step-list">
        {steps.map((step, i) => (
          <li key={i} className="step-item">
            {step.instruction}
            <div className="step-duration">{step.duration} min</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function RecipeDetail({ recipe, onClose, onDelete }: RecipeDetailProps) {
  const handlePrint = () => {
    window.print();
  };

  const isVariant = hasProteinVariants(recipe);

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

        {isVariant ? (
          <>
            {/* Shared Base Section */}
            {recipe.sharedIngredients && recipe.sharedIngredients.length > 0 && (
              <IngredientList
                ingredients={recipe.sharedIngredients}
                title="Shared Base Ingredients"
              />
            )}

            {recipe.sharedSteps && recipe.sharedSteps.length > 0 && (
              <StepList steps={recipe.sharedSteps} title="Base Preparation" />
            )}

            {/* Protein Options Section */}
            <div className="recipe-section">
              <h3 className="recipe-section-title">Protein Options</h3>
              <div className="protein-options-grid">
                {recipe.proteinOptions?.map((option) => (
                  <div key={option.id} className="protein-option-card">
                    <div className="protein-option-header">
                      <h4 className="protein-option-name">{option.name}</h4>
                      {option.dietaryInfo.isVegan && (
                        <span className="tag vegan">vegan</span>
                      )}
                    </div>

                    <div className="protein-option-section">
                      <h5>Ingredients</h5>
                      <ul className="ingredient-list compact">
                        {option.ingredients.map((ing, i) => (
                          <li key={i} className="ingredient-item">
                            <span>{ing.name}</span>
                            <span>
                              {ing.amount} {ing.unit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="protein-option-section">
                      <h5>Instructions</h5>
                      <ol className="step-list compact">
                        {option.steps.map((step, i) => (
                          <li key={i} className="step-item">
                            {step.instruction}
                            <div className="step-duration">{step.duration} min</div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Legacy Recipe Format */}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <IngredientList ingredients={recipe.ingredients} />
            )}
            {recipe.steps && recipe.steps.length > 0 && (
              <StepList steps={recipe.steps} />
            )}
          </>
        )}

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
