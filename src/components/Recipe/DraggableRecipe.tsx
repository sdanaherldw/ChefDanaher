import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { RecipeCard } from './RecipeCard';
import type { Recipe, DragSource } from '../../types';

interface DraggableRecipeProps {
  recipe: Recipe;
  source: DragSource;
  dayId?: string;
  onClick?: () => void;
}

export function DraggableRecipe({
  recipe,
  source,
  dayId,
  onClick,
}: DraggableRecipeProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${source}-${recipe.id}${dayId ? `-${dayId}` : ''}`,
      data: {
        recipeId: recipe.id,
        source,
        dayId,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? 'dragging' : ''}
    >
      <RecipeCard
        recipe={recipe}
        onClick={onClick}
        compact={source === 'calendar'}
      />
    </div>
  );
}
