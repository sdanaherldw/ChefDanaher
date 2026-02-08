import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout/Layout';
import { CalendarGrid } from '../components/Calendar/CalendarGrid';
import { RecipeList, type RecipeListRef } from '../components/Recipe/RecipeList';
import { RecipeDetail } from '../components/Recipe/RecipeDetail';
import { RecipeCard } from '../components/Recipe/RecipeCard';
import { GroceryList } from '../components/Grocery/GroceryList';
import { GenerateForm } from '../components/Generate/GenerateForm';
import { AutoPlanForm } from '../components/Generate/AutoPlanForm';
import { CollapsibleCard } from '../components/UI/CollapsibleCard';
import { SettingsPage } from './SettingsPage';
import { DecayDialog } from '../components/Decay/DecayDialog';
import { BatchSuggestionForm } from '../components/Generate/BatchSuggestionForm';
import { BatchSuggestionDialog } from '../components/Suggestion/BatchSuggestionDialog';
import { CommandPalette } from '../components/UI/CommandPalette';
import { KeyboardShortcutsModal } from '../components/UI/KeyboardShortcutsModal';
import { CelebrationOverlay } from '../components/UI/Confetti';
import { DinerSpinner } from '../components/UI/DinerSpinner';
import { FullMenuPage } from './FullMenuPage';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAppState } from '../context/AppContext';
import type { Recipe, DragData, DropData } from '../types';

function getDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function DashboardPage() {
  const { state, isLoading, assignRecipeToDay, swapRecipes, removeRecipe, updateRecipeLastUsed, addRecipes, addToast } =
    useAppState();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [decayRecipeId, setDecayRecipeId] = useState<string | null>(null);
  const [dismissedDecayIds, setDismissedDecayIds] = useState<Set<string>>(new Set());
  const [batchSuggestions, setBatchSuggestions] = useState<Recipe[] | null>(null);
  const [showFullMenu, setShowFullMenu] = useState(false);

  // UI state for keyboard shortcuts and command palette
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState({ title: '', message: '' });

  const recipeListRef = useRef<RecipeListRef>(null);

  // Check if all days are planned (for celebration)
  const allDaysPlanned = useMemo(() => {
    if (state.recipes.length === 0) return false;
    // Get next 5 weekdays
    const today = new Date();
    const weekdays: string[] = [];
    let d = new Date(today);
    while (weekdays.length < 5) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        weekdays.push(d.toISOString().split('T')[0]);
      }
      d.setDate(d.getDate() + 1);
    }
    return weekdays.every((date) => {
      const dayPlan = state.calendar.find((c) => c.date === date);
      return dayPlan?.recipeId;
    });
  }, [state.calendar, state.recipes.length]);

  // Trigger celebration when week is fully planned
  const [hasShownCelebration, setHasShownCelebration] = useState(false);
  useEffect(() => {
    if (allDaysPlanned && !hasShownCelebration && !isLoading) {
      setCelebrationMessage({
        title: "OPEN",
        message: "The week's menu is SET!"
      });
      setShowCelebration(true);
      setHasShownCelebration(true);
    }
  }, [allDaysPlanned, hasShownCelebration, isLoading]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: '?',
        action: () => setShowShortcutsModal(true),
        description: 'Show keyboard shortcuts',
      },
      {
        key: 'k',
        ctrl: true,
        action: () => setShowCommandPalette(true),
        description: 'Open command palette',
      },
      {
        key: '/',
        action: () => setShowCommandPalette(true),
        description: 'Open command palette',
      },
      {
        key: 'Escape',
        action: () => {
          if (showCommandPalette) setShowCommandPalette(false);
          else if (showShortcutsModal) setShowShortcutsModal(false);
          else if (selectedRecipe) setSelectedRecipe(null);
          else if (showSettings) setShowSettings(false);
        },
        description: 'Close modal',
      },
      {
        key: 'n',
        action: () => {
          // Focus generate form - scroll to it
          document.getElementById('generate')?.scrollIntoView({ behavior: 'smooth' });
        },
        description: 'Focus generate form',
      },
    ],
  });

  // Find decayed recipes
  const decayedRecipes = useMemo(() => {
    const { recipeDecayDays, suggestedRecipeDecayDays } = state.settings;
    return state.recipes.filter((recipe) => {
      if (dismissedDecayIds.has(recipe.id)) return false;

      if (recipe.lastUsedAt) {
        const daysSince = getDaysSince(recipe.lastUsedAt);
        return daysSince > recipeDecayDays;
      } else {
        const daysSince = getDaysSince(recipe.createdAt);
        return daysSince > suggestedRecipeDecayDays;
      }
    });
  }, [state.recipes, state.settings, dismissedDecayIds]);

  // Show decay dialog for the first decayed recipe
  useEffect(() => {
    if (!isLoading && decayedRecipes.length > 0 && !decayRecipeId) {
      setDecayRecipeId(decayedRecipes[0].id);
    }
  }, [isLoading, decayedRecipes, decayRecipeId]);

  const decayRecipe = decayRecipeId ? state.recipes.find((r) => r.id === decayRecipeId) : null;
  const decayInfo = decayRecipe
    ? {
        daysSince: decayRecipe.lastUsedAt
          ? getDaysSince(decayRecipe.lastUsedAt)
          : getDaysSince(decayRecipe.createdAt),
        isNeverUsed: !decayRecipe.lastUsedAt,
      }
    : null;

  const handleKeepDecayRecipe = useCallback(async () => {
    if (decayRecipeId && decayRecipe) {
      await updateRecipeLastUsed(decayRecipeId, new Date().toISOString().split('T')[0]);
      setDismissedDecayIds((prev) => new Set(prev).add(decayRecipeId));
      setDecayRecipeId(null);
      addToast("That's a keeper! Reset the timer.", 'success');
    }
  }, [decayRecipeId, decayRecipe, updateRecipeLastUsed, addToast]);

  const handleDeleteDecayRecipe = useCallback(async () => {
    if (decayRecipeId && decayRecipe) {
      await removeRecipe(decayRecipeId);
      setDismissedDecayIds((prev) => new Set(prev).add(decayRecipeId));
      setDecayRecipeId(null);
      addToast(`${decayRecipe.name} has been 86'd`, 'info');
    }
  }, [decayRecipeId, decayRecipe, removeRecipe, addToast]);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as DragData;
      const recipe = state.recipes.find((r) => r.id === data.recipeId);
      setActiveRecipe(recipe || null);
    },
    [state.recipes]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveRecipe(null);

      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current as DragData;
      const overData = over.data.current as DropData;

      if (overData?.type !== 'calendar-day') return;

      const targetDay = overData.dayId;

      if (activeData.source === 'recipe-list') {
        await assignRecipeToDay(targetDay, activeData.recipeId);
      } else if (activeData.source === 'calendar' && activeData.dayId) {
        if (activeData.dayId !== targetDay) {
          await swapRecipes(activeData.dayId, targetDay);
        }
      }
    },
    [assignRecipeToDay, swapRecipes]
  );

  const handleRecipeClick = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  const handleDeleteRecipe = useCallback(async () => {
    if (selectedRecipe) {
      await removeRecipe(selectedRecipe.id);
      addToast(`${selectedRecipe.name} has been 86'd`, 'info');
      setSelectedRecipe(null);
    }
  }, [selectedRecipe, removeRecipe, addToast]);

  const handleSuggestionsReady = useCallback((recipes: Recipe[]) => {
    setBatchSuggestions(recipes);
  }, []);

  const handleBatchComplete = useCallback(async (approvedRecipes: Recipe[]) => {
    if (approvedRecipes.length > 0) {
      await addRecipes(approvedRecipes);
      addToast(`Added ${approvedRecipes.length} recipes to the menu!`, 'success');
    }
    setBatchSuggestions(null);
  }, [addRecipes, addToast]);

  const handleBatchCancel = useCallback(() => {
    setBatchSuggestions(null);
  }, []);

  const handleCommandPaletteNavigate = useCallback((section: 'generate' | 'settings' | 'batch' | 'full-menu') => {
    if (section === 'settings') {
      setShowSettings(true);
    } else if (section === 'full-menu') {
      setShowFullMenu(true);
    } else {
      document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleLogoClick = useCallback(() => {
    // Reset to main dashboard view
    setSelectedRecipe(null);
    setShowSettings(false);
    setShowFullMenu(false);
  }, []);

  if (isLoading) {
    return (
      <Layout>
        <motion.div
          className="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <DinerSpinner context="default" />
        </motion.div>
      </Layout>
    );
  }

  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />;
  }

  if (showFullMenu) {
    return <FullMenuPage onBack={() => setShowFullMenu(false)} />;
  }

  if (batchSuggestions) {
    return (
      <BatchSuggestionDialog
        recipes={batchSuggestions}
        onComplete={handleBatchComplete}
        onCancel={handleBatchCancel}
      />
    );
  }

  if (selectedRecipe) {
    return (
      <Layout
        onSettingsClick={() => setShowSettings(true)}
        onFullMenuClick={() => setShowFullMenu(true)}
        onLogoClick={handleLogoClick}
      >
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={handleCloseDetail}
          onDelete={handleDeleteRecipe}
        />
      </Layout>
    );
  }

  return (
    <Layout
      onSettingsClick={() => setShowSettings(true)}
      onFullMenuClick={() => setShowFullMenu(true)}
      onLogoClick={handleLogoClick}
    >
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <motion.div
          className="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <aside className="sidebar">
            <CollapsibleCard id="auto-plan" title="Auto-Generate Meal Plan" defaultOpen={false}>
              <AutoPlanForm />
            </CollapsibleCard>
            <CollapsibleCard id="batch-ideas" title="Get Recipe Ideas" defaultOpen={false}>
              <BatchSuggestionForm onSuggestionsReady={handleSuggestionsReady} />
            </CollapsibleCard>
            <CollapsibleCard id="generate" title="Cook Up Something New" defaultOpen={true}>
              <GenerateForm />
            </CollapsibleCard>
            <CollapsibleCard id="recipes" title="The Menu" defaultOpen={true}>
              <RecipeList ref={recipeListRef} onRecipeClick={handleRecipeClick} />
            </CollapsibleCard>
          </aside>

          <section className="main-section">
            <motion.h2
              style={{ marginBottom: 'var(--space-lg)' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              This Week's Meals
            </motion.h2>
            <CalendarGrid onRecipeClick={handleRecipeClick} />

            <GroceryList />
          </section>
        </motion.div>

        <DragOverlay>
          {activeRecipe && (
            <motion.div
              initial={{ rotate: 0, scale: 1 }}
              animate={{ rotate: 3, scale: 1.05 }}
              className="drag-overlay-card"
            >
              <RecipeCard recipe={activeRecipe} compact />
            </motion.div>
          )}
        </DragOverlay>
      </DndContext>

      {decayRecipe && decayInfo && (
        <DecayDialog
          recipe={decayRecipe}
          daysSinceUsed={decayInfo.daysSince}
          isNeverUsed={decayInfo.isNeverUsed}
          onKeep={handleKeepDecayRecipe}
          onDelete={handleDeleteDecayRecipe}
        />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onSelectRecipe={handleRecipeClick}
        onNavigate={handleCommandPaletteNavigate}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Celebration Overlay */}
      <CelebrationOverlay
        isVisible={showCelebration}
        title={celebrationMessage.title}
        message={celebrationMessage.message}
        onClose={() => setShowCelebration(false)}
      />

      {/* Keyboard hint (bottom right) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 2 }}
        style={{
          position: 'fixed',
          bottom: 'var(--space-lg)',
          left: 'var(--space-lg)',
          fontSize: '0.75rem',
          color: 'var(--color-gray)',
        }}
      >
        Press <kbd className="kbd">?</kbd> for shortcuts
      </motion.div>
    </Layout>
  );
}
