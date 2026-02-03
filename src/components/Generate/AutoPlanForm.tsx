import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import { useAppState } from '../../context/AppContext';
import { Button } from '../UI/Button';
import { DinerSpinner } from '../UI/DinerSpinner';
import { HOUSEHOLD } from '../../types';
import type { Recipe, DayPlan } from '../../types';

interface PlanPreview {
  plan: Array<{ date: string; recipe: Recipe }>;
  sharedIngredients: string[];
}

function getNextVacantWeekdayDates(count: number, calendar: DayPlan[]): string[] {
  const dates: string[] = [];
  const today = new Date();
  let current = new Date(today);

  // Build a set of dates that already have recipes
  const occupiedDates = new Set(
    calendar
      .filter((day) => day.recipeId !== null)
      .map((day) => day.date)
  );

  // Start from today (in case today is unplanned) or tomorrow
  while (dates.length < count) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];

    // Skip weekends (0 = Sunday, 6 = Saturday) and occupied days
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !occupiedDates.has(dateStr)) {
      dates.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function AutoPlanForm() {
  const { state, applyMealPlan, addToast } = useAppState();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDiners, setSelectedDiners] = useState<string[]>(
    HOUSEHOLD.map((m) => m.id)
  );
  const [numberOfDays, setNumberOfDays] = useState(3);
  const [preview, setPreview] = useState<PlanPreview | null>(null);

  const toggleDiner = (dinerId: string) => {
    setSelectedDiners((prev) =>
      prev.includes(dinerId)
        ? prev.filter((id) => id !== dinerId)
        : [...prev, dinerId]
    );
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();

    if (selectedDiners.length === 0) {
      addToast('Select at least one diner', 'error');
      return;
    }

    setIsLoading(true);
    setPreview(null);

    try {
      const targetDates = getNextVacantWeekdayDates(numberOfDays, state.calendar);
      const response = await api.generateMealPlan({
        diners: selectedDiners,
        numberOfDays,
        targetDates,
      });

      setPreview(response);
      addToast(`Generated ${numberOfDays}-day meal plan`, 'success');
    } catch (error) {
      addToast('Failed to generate meal plan', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;

    try {
      await applyMealPlan(preview.plan);
      addToast(`Applied ${preview.plan.length} meals to calendar`, 'success');
      setPreview(null);
    } catch (error) {
      addToast('Failed to apply meal plan', 'error');
    }
  };

  const handleRegenerate = () => {
    setPreview(null);
  };

  if (isLoading) {
    return (
      <div className="auto-plan-loading">
        <DinerSpinner />
      </div>
    );
  }

  if (preview) {
    return (
      <div className="meal-plan-preview">
        <h4 className="preview-title">Your Meal Plan</h4>

        {preview.sharedIngredients.length > 0 && (
          <div className="shared-ingredients">
            <span className="shared-label">Shared ingredients:</span>
            <span className="shared-list">
              {preview.sharedIngredients.join(', ')}
            </span>
          </div>
        )}

        <div className="preview-list">
          {preview.plan.map(({ date, recipe }) => (
            <div key={recipe.id} className="preview-item">
              <div className="preview-date">{formatDate(date)}</div>
              <div className="preview-recipe">
                <div className="preview-recipe-name">{recipe.name}</div>
                <div className="preview-recipe-meta">
                  {recipe.totalTime} min • {recipe.tags[0]}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="preview-actions">
          <Button onClick={handleApply} style={{ flex: 1 }}>
            Apply Plan
          </Button>
          <Button variant="secondary" onClick={handleRegenerate}>
            Regenerate
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleGenerate} className="auto-plan-form">
      <div className="form-group">
        <label className="form-label">Who's Eating?</label>
        <div className="diner-checkboxes">
          {HOUSEHOLD.map((member) => {
            const isSelected = selectedDiners.includes(member.id);
            const restrictionLabel =
              member.restrictions.length === 0
                ? 'No restrictions'
                : member.restrictions.length >= 4
                ? 'Vegan'
                : member.restrictions.includes('no-eggs')
                ? 'Dairy & egg-free'
                : 'Dairy-free';

            return (
              <label
                key={member.id}
                className={`diner-checkbox ${isSelected ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleDiner(member.id)}
                />
                <span className="diner-name">{member.name}</span>
                <span className="diner-restriction">{restrictionLabel}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Number of Days</label>
        <div className="days-selector">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              type="button"
              className={`day-option ${numberOfDays === num ? 'selected' : ''}`}
              onClick={() => setNumberOfDays(num)}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={selectedDiners.length === 0}
        style={{ width: '100%' }}
        className="generate-btn"
      >
        Generate {numberOfDays}-Day Plan
      </Button>
    </form>
  );
}
