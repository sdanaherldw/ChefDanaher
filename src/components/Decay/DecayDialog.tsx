import { Button } from '../UI/Button';
import type { Recipe } from '../../types';

interface DecayDialogProps {
  recipe: Recipe;
  daysSinceUsed: number;
  isNeverUsed: boolean;
  onKeep: () => void;
  onDelete: () => void;
}

export function DecayDialog({ recipe, daysSinceUsed, isNeverUsed, onKeep, onDelete }: DecayDialogProps) {
  return (
    <div className="decay-overlay">
      <div className="decay-dialog">
        <h3 className="decay-title">Recipe Review</h3>

        <div className="decay-content">
          {isNeverUsed ? (
            <p>
              You added<br />
              <strong>"{recipe.name}"</strong><br />
              {daysSinceUsed} days ago but never made it.
            </p>
          ) : (
            <p>
              You haven't made<br />
              <strong>"{recipe.name}"</strong><br />
              in {daysSinceUsed} days.
            </p>
          )}

          <p className="decay-question">Would you like to keep it?</p>
        </div>

        <div className="decay-actions">
          <Button variant="danger" onClick={onDelete}>
            Delete Recipe
          </Button>
          <Button variant="primary" onClick={onKeep}>
            Keep Recipe
          </Button>
        </div>
      </div>
    </div>
  );
}
