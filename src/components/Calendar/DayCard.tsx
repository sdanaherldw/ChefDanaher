import { format, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { DroppableDay } from './DroppableDay';
import { DraggableRecipe } from '../Recipe/DraggableRecipe';
import { Button } from '../UI/Button';
import { useAppState } from '../../context/AppContext';
import type { Recipe } from '../../types';

interface DayCardProps {
  date: Date;
  recipe: Recipe | null;
  groceriesPurchased: boolean;
  onRecipeClick?: (recipe: Recipe) => void;
}

export function DayCard({ date, recipe, groceriesPurchased, onRecipeClick }: DayCardProps) {
  const { clearDay, toggleGroceriesPurchased, addToast } = useAppState();
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayName = isToday(date) ? 'Today' : format(date, 'EEEE');
  const dateDisplay = format(date, 'MMM d');

  const handleClear = async () => {
    if (recipe) {
      try {
        await clearDay(dateStr);
        addToast(`Cleared ${dayName}'s menu`, 'info');
      } catch (error) {
        addToast("Couldn't clear that day. Try again?", 'error');
      }
    }
  };

  return (
    <DroppableDay dayId={dateStr}>
      <div className="day-header">{dayName}</div>
      <div className="day-date">{dateDisplay}</div>
      <div className="day-content">
        <AnimatePresence mode="wait">
          {recipe ? (
            <motion.div
              key={`recipe-${recipe.id}`}
              style={{ width: '100%' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <DraggableRecipe
                recipe={recipe}
                source="calendar"
                dayId={dateStr}
                onClick={() => onRecipeClick?.(recipe)}
              />
              <motion.div
                className="day-actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <label className={`purchased-checkbox ${groceriesPurchased ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={groceriesPurchased}
                    onChange={() => toggleGroceriesPurchased(dateStr)}
                  />
                  <motion.span
                    className="checkbox-icon"
                    animate={groceriesPurchased ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.2 }}
                  >
                    {groceriesPurchased ? '✓' : ''}
                  </motion.span>
                  <span className="checkbox-label">Shopped</span>
                </label>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleClear}
                >
                  Clear
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.p
              key="empty-state"
              className="day-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              This booth's open!
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </DroppableDay>
  );
}
