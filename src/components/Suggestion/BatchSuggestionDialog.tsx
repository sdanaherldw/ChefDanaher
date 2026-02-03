import { useState } from 'react';
import { Button } from '../UI/Button';
import { NutritionLabelCard } from './NutritionLabelCard';
import type { Recipe } from '../../types';

interface BatchSuggestionDialogProps {
  recipes: Recipe[];
  onComplete: (approvedRecipes: Recipe[]) => void;
  onCancel: () => void;
}

export function BatchSuggestionDialog({ recipes, onComplete, onCancel }: BatchSuggestionDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [approvedRecipes, setApprovedRecipes] = useState<Recipe[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  const currentRecipe = recipes[currentIndex];
  const isLastRecipe = currentIndex === recipes.length - 1;

  const handleKeep = () => {
    setApprovedRecipes((prev) => [...prev, currentRecipe]);
    if (isLastRecipe) {
      setShowSummary(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    if (isLastRecipe) {
      setShowSummary(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleDone = () => {
    onComplete(approvedRecipes);
  };

  if (showSummary) {
    return (
      <div className="batch-dialog">
        <div className="batch-dialog-content">
          <div className="batch-summary">
            <h2 className="batch-summary-title">All Done!</h2>
            <div className="batch-summary-count">
              You kept <strong>{approvedRecipes.length}</strong> of {recipes.length} recipes
            </div>

            {approvedRecipes.length > 0 && (
              <div className="batch-summary-list">
                <h4>Recipes added to your collection:</h4>
                <ul>
                  {approvedRecipes.map((recipe) => (
                    <li key={recipe.id}>{recipe.name}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="batch-summary-actions">
              <Button variant="primary" onClick={handleDone}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="batch-dialog">
      <div className="batch-dialog-header">
        <Button variant="secondary" size="small" onClick={onCancel}>
          Cancel
        </Button>
        <div className="batch-progress">
          <span className="batch-progress-text">
            Recipe {currentIndex + 1} of {recipes.length}
          </span>
          <div className="batch-progress-bar">
            <div
              className="batch-progress-fill"
              style={{ width: `${((currentIndex + 1) / recipes.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="batch-kept-count">
          Kept: {approvedRecipes.length}
        </div>
      </div>

      <div className="batch-dialog-content">
        <NutritionLabelCard recipe={currentRecipe} />

        <div className="batch-actions">
          <Button variant="secondary" onClick={handleSkip}>
            Skip
          </Button>
          <Button variant="primary" onClick={handleKeep}>
            Keep
          </Button>
        </div>
      </div>
    </div>
  );
}
