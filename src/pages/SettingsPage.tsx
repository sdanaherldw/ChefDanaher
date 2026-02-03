import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout/Layout';
import { Button } from '../components/UI/Button';
import { useAppState } from '../context/AppContext';

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { state, updateSettings, addToast } = useAppState();
  const [recipeDecayDays, setRecipeDecayDays] = useState(state.settings.recipeDecayDays);
  const [suggestedRecipeDecayDays, setSuggestedRecipeDecayDays] = useState(
    state.settings.suggestedRecipeDecayDays
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRecipeDecayDays(state.settings.recipeDecayDays);
    setSuggestedRecipeDecayDays(state.settings.suggestedRecipeDecayDays);
  }, [state.settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        recipeDecayDays,
        suggestedRecipeDecayDays,
      });
      addToast('Settings saved successfully', 'success');
    } catch (error) {
      addToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    recipeDecayDays !== state.settings.recipeDecayDays ||
    suggestedRecipeDecayDays !== state.settings.suggestedRecipeDecayDays;

  return (
    <Layout>
      <div className="settings-page">
        <div className="settings-header">
          <Button variant="secondary" onClick={onBack}>
            Back to Dashboard
          </Button>
          <h2>Settings</h2>
        </div>

        <div className="settings-content">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recipe Decay Settings</h3>
            </div>

            <p className="settings-description">
              Configure how long recipes stay in your list before you're prompted to review them.
              Recipes you haven't made in a while may be candidates for removal to keep your
              collection fresh and relevant.
            </p>

            <div className="settings-form">
              <div className="form-group">
                <label className="form-label" htmlFor="recipeDecayDays">
                  Used Recipe Decay (days)
                </label>
                <input
                  type="number"
                  id="recipeDecayDays"
                  className="form-input"
                  value={recipeDecayDays}
                  onChange={(e) => setRecipeDecayDays(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="365"
                />
                <p className="form-help">
                  Days since last made before prompting to review. Applies to recipes you've
                  purchased groceries for at least once.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="suggestedRecipeDecayDays">
                  New Recipe Decay (days)
                </label>
                <input
                  type="number"
                  id="suggestedRecipeDecayDays"
                  className="form-input"
                  value={suggestedRecipeDecayDays}
                  onChange={(e) =>
                    setSuggestedRecipeDecayDays(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  min="1"
                  max="365"
                />
                <p className="form-help">
                  Days since creation before prompting to review. Applies to recipes you've never
                  made (no grocery purchase recorded).
                </p>
              </div>

              <div className="settings-actions">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
