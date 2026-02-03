import { format, isToday } from 'date-fns';
import { DroppableDay } from './DroppableDay';
import { DraggableRecipe } from '../Recipe/DraggableRecipe';
import { Button } from '../UI/Button';
import { useAppState } from '../../context/AppContext';
import type { Recipe } from '../../types';

interface DayCardProps {
  date: Date;
  recipe: Recipe | null;
  onRecipeClick?: (recipe: Recipe) => void;
}

export function DayCard({ date, recipe, onRecipeClick }: DayCardProps) {
  const { clearDay } = useAppState();
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayName = isToday(date) ? 'Today' : format(date, 'EEEE');
  const dateDisplay = format(date, 'MMM d');

  return (
    <DroppableDay dayId={dateStr}>
      <div className="day-header">{dayName}</div>
      <div className="day-date">{dateDisplay}</div>
      <div className="day-content">
        {recipe ? (
          <div style={{ width: '100%' }}>
            <DraggableRecipe
              recipe={recipe}
              source="calendar"
              dayId={dateStr}
              onClick={() => onRecipeClick?.(recipe)}
            />
            <Button
              variant="secondary"
              size="small"
              onClick={() => clearDay(dateStr)}
              style={{ marginTop: 'var(--space-sm)', width: '100%' }}
            >
              Clear
            </Button>
          </div>
        ) : (
          <p className="day-empty">Drag a recipe here</p>
        )}
      </div>
    </DroppableDay>
  );
}
