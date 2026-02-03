import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import { useAppState } from '../../context/AppContext';
import { Button } from '../UI/Button';
import type { GenerateRequest } from '../../types';

export function GenerateForm() {
  const { addRecipe, addToast } = useAppState();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<GenerateRequest>({
    mealType: 'dinner',
    cuisine: '',
    mainIngredient: '',
    servings: 3,
    maxTime: 40,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { recipe } = await api.generateRecipe({
        ...formData,
        cuisine: formData.cuisine || undefined,
        mainIngredient: formData.mainIngredient || undefined,
      });
      await addRecipe(recipe);
      addToast(`Generated: ${recipe.name}`, 'success');

      // Reset optional fields
      setFormData((prev) => ({
        ...prev,
        cuisine: '',
        mainIngredient: '',
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

        <div className="generate-options">
          <div className="form-group">
            <label htmlFor="servings" className="form-label">
              Servings
            </label>
            <input
              id="servings"
              type="number"
              className="form-input"
              value={formData.servings}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  servings: parseInt(e.target.value) || 3,
                }))
              }
              min={1}
              max={10}
            />
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

        <Button type="submit" disabled={isLoading} style={{ width: '100%' }}>
          {isLoading ? 'Generating...' : 'Generate Recipe'}
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
            Creating a vegan, dairy-free recipe...
          </p>
        )}
      </form>
    </div>
  );
}
