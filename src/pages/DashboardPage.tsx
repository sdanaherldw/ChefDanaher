import { useState, useCallback } from 'react';
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
import { useAppState } from '../context/AppContext';
import type { Recipe, DragData, DropData } from '../types';

export function DashboardPage() {
  const { state, isLoading, assignRecipeToDay, swapRecipes, removeRecipe } =
    useAppState();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);

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

  if (isLoading) {
    return (
      <Layout>
        <div className="loading">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  if (selectedRecipe) {
    return (
      <Layout>
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={handleCloseDetail}
          onDelete={handleDeleteRecipe}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="dashboard">
          <aside className="sidebar">
            <GenerateForm />
            <RecipeList onRecipeClick={handleRecipeClick} />
            <GroceryList />
          </aside>

          <section>
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>
              This Week's Meals
            </h2>
            <CalendarGrid onRecipeClick={handleRecipeClick} />
          </section>
        </div>

        <DragOverlay>
          {activeRecipe && <RecipeCard recipe={activeRecipe} compact />}
        </DragOverlay>
      </DndContext>
    </Layout>
  );
}
