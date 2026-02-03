import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import { useAppState } from '../../context/AppContext';
import { Button } from '../UI/Button';
import { DinerSpinner } from '../UI/DinerSpinner';
import { HOUSEHOLD } from '../../types';
import type { Recipe } from '../../types';

interface BatchSuggestionFormProps {
  onSuggestionsReady: (recipes: Recipe[]) => void;
}

export function BatchSuggestionForm({ onSuggestionsReady }: BatchSuggestionFormProps) {
  const { addToast } = useAppState();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDiners, setSelectedDiners] = useState<string[]>(
    HOUSEHOLD.map((m) => m.id) // All selected by default
  );

  const toggleDiner = (dinerId: string) => {
    setSelectedDiners((prev) =>
      prev.includes(dinerId)
        ? prev.filter((id) => id !== dinerId)
        : [...prev, dinerId]
    );
  };

  // Calculate dietary summary based on selected diners
  const getDietarySummary = () => {
    if (selectedDiners.length === 0) return '';

    const hasShane = selectedDiners.includes('shane');
    const hasLauren = selectedDiners.includes('lauren');
    const hasBrady = selectedDiners.includes('brady');

    if (hasShane) {
      return 'Vegan recipes (for Shane)';
    }
    if (hasBrady) {
      return 'Dairy-free & egg-free (for Brady)';
    }
    if (hasLauren) {
      return 'Dairy-free (for Lauren)';
    }
    return 'No dietary restrictions';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (selectedDiners.length === 0) {
      addToast('Select at least one diner', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const { recipes } = await api.generateBatchSuggestions(selectedDiners);
      onSuggestionsReady(recipes);
    } catch (error) {
      addToast('Failed to generate recipe ideas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="batch-loading">
        <DinerSpinner />
        <p className="batch-loading-text">
          Generating 10 {getDietarySummary().toLowerCase()} ideas...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="batch-form">
      <p className="batch-form-intro">
        Get 10 diverse recipe ideas at once. Review each one and choose which to keep.
      </p>

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
        {selectedDiners.length > 0 && (
          <p className="dietary-summary">{getDietarySummary()}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={selectedDiners.length === 0}
        style={{ width: '100%' }}
      >
        Generate 10 Ideas
      </Button>
    </form>
  );
}
