import { motion, AnimatePresence } from 'framer-motion';
import { RecipeCardEnhanced } from './RecipeCardEnhanced';
import type { Recipe } from '../../types';

interface BoardColumnProps {
  category: string;
  recipes: Recipe[];
  onRecipeClick: (recipe: Recipe) => void;
  onFavoriteToggle: (recipeId: string) => void;
  onAssignToDay: (recipeId: string, date: string) => void;
  upcomingDays: { date: string; label: string }[];
}

export function BoardColumn({
  category,
  recipes,
  onRecipeClick,
  onFavoriteToggle,
  onAssignToDay,
  upcomingDays,
}: BoardColumnProps) {
  return (
    <motion.div
      className="board-column"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="board-column-header">
        <h3 className="board-column-title">{category}</h3>
        <span className="board-column-count">{recipes.length}</span>
      </div>

      <div className="board-column-content">
        <AnimatePresence mode="popLayout">
          {recipes.length === 0 ? (
            <motion.div
              className="board-column-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              No {category.toLowerCase()} recipes yet
            </motion.div>
          ) : (
            recipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  delay: Math.min(index * 0.03, 0.2),
                }}
              >
                <RecipeCardEnhanced
                  recipe={recipe}
                  onClick={() => onRecipeClick(recipe)}
                  onFavoriteToggle={() => onFavoriteToggle(recipe.id)}
                  onAssignToDay={(date) => onAssignToDay(recipe.id, date)}
                  upcomingDays={upcomingDays}
                  compact
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
