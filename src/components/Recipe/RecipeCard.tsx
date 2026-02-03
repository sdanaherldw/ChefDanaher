import { useRef, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import type { Recipe } from '../../types';

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
  compact?: boolean;
  layoutId?: string;
}

export function RecipeCard({ recipe, onClick, compact = false, layoutId }: RecipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <motion.div
      ref={cardRef}
      className="recipe-card"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      style={{ cursor: onClick ? 'pointer' : 'grab' }}
      layoutId={layoutId}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="recipe-card-name">{recipe.name}</div>
      {!compact && (
        <>
          <div className="recipe-card-meta">
            {recipe.totalTime} min &bull; {recipe.servings} servings
          </div>
          <div className="recipe-tags">
            {recipe.tags.slice(0, 3).map((tag, index) => (
              <motion.span
                key={tag}
                className={`tag ${tag === 'vegan' ? 'vegan' : ''}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                  delay: index * 0.05
                }}
              >
                {tag}
              </motion.span>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
