import { useMemo } from 'react';
import { addDays, startOfToday, format } from 'date-fns';
import { DayCard } from './DayCard';
import { useAppState } from '../../context/AppContext';
import type { Recipe } from '../../types';

interface CalendarGridProps {
  onRecipeClick: (recipe: Recipe) => void;
}

export function CalendarGrid({ onRecipeClick }: CalendarGridProps) {
  const { state } = useAppState();

  const days = useMemo(() => {
    const today = startOfToday();
    return Array.from({ length: 5 }, (_, i) => addDays(today, i));
  }, []);

  const getDayData = (date: Date): { recipe: Recipe | null; groceriesPurchased: boolean } => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayPlan = state.calendar.find((d) => d.date === dateStr);

    const recipe = dayPlan?.recipeId
      ? state.recipes.find((r) => r.id === dayPlan.recipeId) || null
      : null;

    return {
      recipe,
      groceriesPurchased: dayPlan?.groceriesPurchased || false,
    };
  };

  return (
    <div className="calendar-grid">
      {days.map((date) => {
        const { recipe, groceriesPurchased } = getDayData(date);
        return (
          <DayCard
            key={date.toISOString()}
            date={date}
            recipe={recipe}
            groceriesPurchased={groceriesPurchased}
            onRecipeClick={onRecipeClick}
          />
        );
      })}
    </div>
  );
}
