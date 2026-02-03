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

  const getRecipeForDay = (date: Date): Recipe | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayPlan = state.calendar.find((d) => d.date === dateStr);
    if (!dayPlan?.recipeId) return null;
    return state.recipes.find((r) => r.id === dayPlan.recipeId) || null;
  };

  return (
    <div className="calendar-grid">
      {days.map((date) => (
        <DayCard
          key={date.toISOString()}
          date={date}
          recipe={getRecipeForDay(date)}
          onRecipeClick={onRecipeClick}
        />
      ))}
    </div>
  );
}
