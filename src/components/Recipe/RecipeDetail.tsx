import { motion } from 'framer-motion';
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
    <motion.div
      className="recipe-section"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="recipe-section-title">{title || 'Ingredients'}</h3>
      <ul className="ingredient-list">
        {ingredients.map((ing, i) => (
          <motion.li
            key={i}
            className="ingredient-item"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.03 }}
          >
            <span>{ing.name}</span>
            <span>
              {ing.amount} {ing.unit}
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

function StepList({ steps, title }: { steps: RecipeStep[]; title?: string }) {
  return (
    <motion.div
      className="recipe-section"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h3 className="recipe-section-title">{title || 'Instructions'}</h3>
      <ol className="step-list">
        {steps.map((step, i) => (
          <motion.li
            key={i}
            className="step-item"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
          >
            {step.instruction}
            <div className="step-duration">{step.duration} min</div>
          </motion.li>
        ))}
      </ol>
    </motion.div>
  );
}

export function RecipeDetail({ recipe, onClose, onDelete }: RecipeDetailProps) {
  const handlePrint = () => {
    window.print();
  };

  const isVariant = hasProteinVariants(recipe);

  return (
    <motion.div
      className="recipe-detail"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <motion.div
          className="recipe-detail-header"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <motion.h2
            className="recipe-detail-name"
            layoutId={`recipe-title-${recipe.id}`}
          >
            {recipe.name}
          </motion.h2>
          <p className="recipe-detail-description">{recipe.description}</p>
          <div className="recipe-detail-meta">
            <span>{recipe.totalTime} minutes</span>
            <span>{recipe.servings} servings</span>
            <span>{recipe.equipment.join(', ')}</span>
          </div>
          <div className="recipe-tags" style={{ justifyContent: 'center', marginTop: 'var(--space-md)' }}>
            {recipe.tags.map((tag, index) => (
              <motion.span
                key={tag}
                className={`tag ${tag === 'vegan' ? 'vegan' : ''}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + index * 0.05 }}
              >
                {tag}
              </motion.span>
            ))}
          </div>
        </motion.div>

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
            <motion.div
              className="recipe-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="recipe-section-title">Protein Options</h3>
              <div className="protein-options-grid">
                {recipe.proteinOptions?.map((option, index) => (
                  <motion.div
                    key={option.id}
                    className="protein-option-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
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
                  </motion.div>
                ))}
              </div>
            </motion.div>
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

        <motion.div
          style={{
            display: 'flex',
            gap: 'var(--space-md)',
            justifyContent: 'center',
            marginTop: 'var(--space-xl)',
          }}
          className="no-print"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button variant="secondary" onClick={onClose}>
            Nevermind
          </Button>
          <Button onClick={handlePrint}>Print Recipe</Button>
          <Button variant="danger" onClick={onDelete}>
            86 This
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
