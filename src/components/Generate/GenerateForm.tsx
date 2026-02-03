import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import { useAppState } from '../../context/AppContext';
import { Button } from '../UI/Button';
import { HOUSEHOLD } from '../../types';
import type { GenerateRequest } from '../../types';

export function GenerateForm() {
  const { addRecipe, addToast } = useAppState();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDiners, setSelectedDiners] = useState<string[]>(
    HOUSEHOLD.map((m) => m.id) // All selected by default
  );
  const [formData, setFormData] = useState({
    mealType: 'dinner' as GenerateRequest['mealType'],
    cuisine: '',
    mainIngredient: '',
    specialNotes: '',
    maxTime: 40,
  });

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
      return 'Vegan recipe (for Shane)';
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
      const { recipe } = await api.generateRecipe({
        mealType: formData.mealType,
        diners: selectedDiners,
        cuisine: formData.cuisine || undefined,
        mainIngredient: formData.mainIngredient || undefined,
        specialNotes: formData.specialNotes || undefined,
        maxTime: formData.maxTime,
      });
      await addRecipe(recipe);
      addToast(`Generated: ${recipe.name}`, 'success');

      // Reset optional fields
      setFormData((prev) => ({
        ...prev,
        cuisine: '',
        mainIngredient: '',
        specialNotes: '',
      }));
    } catch (error) {
      addToast('Failed to generate recipe', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sidebar-section">
      <h3 className="sidebar-title">Generate Recipe</h3>

      <form onSubmit={handleSubmit} className="generate-form">
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

        <div className="form-group">
          <label htmlFor="mealType" className="form-label">
            Meal Type
          </label>
          <select
            id="mealType"
            className="form-input form-select"
            value={formData.mealType}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                mealType: e.target.value as GenerateRequest['mealType'],
              }))
            }
          >
            <option value="dinner">Dinner</option>
            <option value="lunch">Lunch</option>
            <option value="breakfast">Breakfast</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="maxTime" className="form-label">
            Max Time (min)
          </label>
          <input
            id="maxTime"
            type="number"
            className="form-input"
            value={formData.maxTime}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                maxTime: parseInt(e.target.value) || 40,
              }))
            }
            min={15}
            max={120}
          />
        </div>

        <div className="form-group">
          <label htmlFor="cuisine" className="form-label">
            Cuisine (optional)
          </label>
          <input
            id="cuisine"
            type="text"
            className="form-input"
            value={formData.cuisine}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                cuisine: e.target.value,
              }))
            }
            placeholder="e.g., Thai, Mexican, Italian"
          />
        </div>

        <div className="form-group">
          <label htmlFor="mainIngredient" className="form-label">
            Main Ingredient (optional)
          </label>
          <input
            id="mainIngredient"
            type="text"
            className="form-input"
            value={formData.mainIngredient}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                mainIngredient: e.target.value,
              }))
            }
            placeholder="e.g., tofu, chickpeas, tempeh"
          />
        </div>

        <div className="form-group">
          <label htmlFor="specialNotes" className="form-label">
            Special Notes (optional)
          </label>
          <textarea
            id="specialNotes"
            className="form-input form-textarea"
            value={formData.specialNotes}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                specialNotes: e.target.value,
              }))
            }
            placeholder="e.g., Birthday dinner, extra protein, kid-friendly, comfort food..."
            rows={2}
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading || selectedDiners.length === 0}
          style={{ width: '100%' }}
        >
          {isLoading
            ? 'Generating...'
            : `Generate for ${selectedDiners.length} ${selectedDiners.length === 1 ? 'person' : 'people'}`}
        </Button>

        {isLoading && (
          <p
            style={{
              textAlign: 'center',
              fontSize: '0.875rem',
              color: 'var(--color-gray)',
              marginTop: 'var(--space-sm)',
            }}
          >
            Creating a {getDietarySummary().toLowerCase() || 'custom'} recipe...
          </p>
        )}
      </form>
    </div>
  );
}
