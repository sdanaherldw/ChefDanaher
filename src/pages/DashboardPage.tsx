import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { Layout } from '../components/Layout/Layout';
import { CalendarGrid } from '../components/Calendar/CalendarGrid';
import { RecipeList } from '../components/Recipe/RecipeList';
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

  // Find decayed recipes
  const decayedRecipes = useMemo(() => {
    const { recipeDecayDays, suggestedRecipeDecayDays } = state.settings;
    return state.recipes.filter((recipe) => {
      if (dismissedDecayIds.has(recipe.id)) return false;

      if (recipe.lastUsedAt) {
        // Recipe has been used - check against recipeDecayDays
        const daysSince = getDaysSince(recipe.lastUsedAt);
        return daysSince > recipeDecayDays;
      } else {
        // Never used - check against suggestedRecipeDecayDays
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
      // Update lastUsedAt to today to reset the decay timer
      await updateRecipeLastUsed(decayRecipeId, new Date().toISOString().split('T')[0]);
      setDismissedDecayIds((prev) => new Set(prev).add(decayRecipeId));
      setDecayRecipeId(null);
    }
  }, [decayRecipeId, decayRecipe, updateRecipeLastUsed]);

  const handleDeleteDecayRecipe = useCallback(async () => {
    if (decayRecipeId) {
      await removeRecipe(decayRecipeId);
      setDismissedDecayIds((prev) => new Set(prev).add(decayRecipeId));
      setDecayRecipeId(null);
    }
  }, [decayRecipeId, removeRecipe]);

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
        // Copy from recipe list to calendar
        await assignRecipeToDay(targetDay, activeData.recipeId);
      } else if (activeData.source === 'calendar' && activeData.dayId) {
        // Move/swap within calendar
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
      setSelectedRecipe(null);
    }
  }, [selectedRecipe, removeRecipe]);

  const handleSuggestionsReady = useCallback((recipes: Recipe[]) => {
    setBatchSuggestions(recipes);
  }, []);

  const handleBatchComplete = useCallback(async (approvedRecipes: Recipe[]) => {
    if (approvedRecipes.length > 0) {
      await addRecipes(approvedRecipes);
      addToast(`Added ${approvedRecipes.length} recipes to your collection`, 'success');
    }
    setBatchSuggestions(null);
  }, [addRecipes, addToast]);

  const handleBatchCancel = useCallback(() => {
    setBatchSuggestions(null);
  }, []);

  if (isLoading) {
    return (
      <Layout>
        <div className="loading">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  if (showSettings) {
    return <SettingsPage onBack={() => setShowSettings(false)} />;
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
      <Layout onSettingsClick={() => setShowSettings(true)}>
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={handleCloseDetail}
          onDelete={handleDeleteRecipe}
        />
      </Layout>
    );
  }

  return (
    <Layout onSettingsClick={() => setShowSettings(true)}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="dashboard">
          <aside className="sidebar">
            <CollapsibleCard id="auto-plan" title="Auto-Generate Meal Plan" defaultOpen={false}>
              <AutoPlanForm />
            </CollapsibleCard>
            <CollapsibleCard id="batch-ideas" title="Get Recipe Ideas" defaultOpen={false}>
              <BatchSuggestionForm onSuggestionsReady={handleSuggestionsReady} />
            </CollapsibleCard>
            <CollapsibleCard id="generate" title="Generate Recipe" defaultOpen={true}>
              <GenerateForm />
            </CollapsibleCard>
            <CollapsibleCard id="recipes" title="Recipes" defaultOpen={true}>
              <RecipeList onRecipeClick={handleRecipeClick} />
            </CollapsibleCard>
          </aside>

          <section className="main-section">
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>
              This Week's Meals
            </h2>
            <CalendarGrid onRecipeClick={handleRecipeClick} />

            <GroceryList />
          </section>
        </div>

        <DragOverlay>
          {activeRecipe && <RecipeCard recipe={activeRecipe} compact />}
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
    </Layout>
  );
}
