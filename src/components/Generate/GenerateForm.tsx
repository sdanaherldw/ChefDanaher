import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { useAppState } from '../../context/AppContext';
import { Button } from '../UI/Button';
import { DinerSpinner } from '../UI/DinerSpinner';
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (selectedDiners.length === 0) {
      addToast('Pick at least one hungry soul!', 'error');
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
      addToast(`Order up! ${recipe.name} is on the menu!`, 'success');

      // Reset optional fields
      setFormData((prev) => ({
        ...prev,
        cuisine: '',
        mainIngredient: '',
        specialNotes: '',
      }));
    } catch (error) {
      addToast("Whoops! We dropped that plate...", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <DinerSpinner context="recipe" />
      </motion.div>
    );
  }

  return (
      <form onSubmit={handleSubmit} className="generate-form">
        <div className="form-group">
          <label className="form-label">Who's hungry?</label>
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
          <label htmlFor="mealType" className="form-label">
            What's cookin'?
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
          disabled={selectedDiners.length === 0}
          style={{ width: '100%' }}
          className="generate-btn"
        >
          Cook up something new
        </Button>
      </form>
  );
}
