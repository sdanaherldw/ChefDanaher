import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
      addToast('Settings locked in!', 'success');
    } catch (error) {
      addToast("Whoops! Couldn't save those changes...", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    recipeDecayDays !== state.settings.recipeDecayDays ||
    suggestedRecipeDecayDays !== state.settings.suggestedRecipeDecayDays;

  return (
    <Layout showFullMenu={false} onLogoClick={onBack}>
      <motion.div
        className="settings-page"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="settings-header">
          <Button variant="secondary" onClick={onBack}>
            Back to the Floor
          </Button>
          <h2>Back of House</h2>
        </div>

        <motion.div
          className="settings-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recipe Rotation</h3>
            </div>

            <p className="settings-description">
              Keep your menu fresh! Configure how long recipes stick around before
              we ask if they're still earning their spot on the specials board.
            </p>

            <div className="settings-form">
              <motion.div
                className="form-group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="form-label" htmlFor="recipeDecayDays">
                  Tried & True Recipes (days)
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
                  How long since you last made a recipe before we check if it's still a keeper.
                </p>
              </motion.div>

              <motion.div
                className="form-group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="form-label" htmlFor="suggestedRecipeDecayDays">
                  Never-Made Recipes (days)
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
                  How long before we ask about recipes that looked good but never made it to the table.
                </p>
              </motion.div>

              <motion.div
                className="settings-actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={!hasChanges}
                  loading={isSaving}
                >
                  Save Changes
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
