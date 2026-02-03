import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { RecipeCardEnhanced } from './RecipeCardEnhanced';
import type { Recipe } from '../../types';

interface ListViewGridProps {
  recipes: Recipe[];
  onRecipeClick: (recipe: Recipe) => void;
  onFavoriteToggle: (recipeId: string) => void;
  onAssignToDay: (recipeId: string, date: string) => void;
  upcomingDays: { date: string; label: string }[];
}

export function ListViewGrid({
  recipes,
  onRecipeClick,
  onFavoriteToggle,
  onAssignToDay,
  upcomingDays,
}: ListViewGridProps) {
  return (
    <LayoutGroup id="list-view">
      <motion.div
        className="recipe-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        <AnimatePresence mode="popLayout">
          {recipes.map((recipe, index) => (
            <motion.div
              key={recipe.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
                delay: Math.min(index * 0.05, 0.4),
              }}
            >
              <RecipeCardEnhanced
                recipe={recipe}
                onClick={() => onRecipeClick(recipe)}
                onFavoriteToggle={() => onFavoriteToggle(recipe.id)}
                onAssignToDay={(date) => onAssignToDay(recipe.id, date)}
                upcomingDays={upcomingDays}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}
