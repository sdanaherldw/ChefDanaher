import { useRef, useEffect, useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { BoardColumn } from './BoardColumn';
import { groupRecipesByCategory, type TagCategory } from '../../utils/tagCategories';
import type { Recipe } from '../../types';

interface BoardViewProps {
  recipes: Recipe[];
  groupBy: TagCategory;
  onRecipeClick: (recipe: Recipe) => void;
  onFavoriteToggle: (recipeId: string) => void;
  onAssignToDay: (recipeId: string, date: string) => void;
  upcomingDays: { date: string; label: string }[];
}

export function BoardView({
  recipes,
  groupBy,
  onRecipeClick,
  onFavoriteToggle,
  onAssignToDay,
  upcomingDays,
}: BoardViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const groupedRecipes = groupRecipesByCategory(recipes, groupBy);

  // Handle horizontal drag scrolling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
    containerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Multiply for faster scroll
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  // Reset scroll position when groupBy changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
    }
  }, [groupBy]);

  return (
    <LayoutGroup id="board-view">
      <motion.div
        ref={containerRef}
        className="board-container"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="board-columns">
          {groupedRecipes.map((group, index) => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <BoardColumn
                category={group.category}
                recipes={group.recipes}
                onRecipeClick={onRecipeClick}
                onFavoriteToggle={onFavoriteToggle}
                onAssignToDay={onAssignToDay}
                upcomingDays={upcomingDays}
              />
            </motion.div>
          ))}
        </div>

        {/* Fade edge indicators */}
        <div className="board-fade-left" />
        <div className="board-fade-right" />
      </motion.div>
    </LayoutGroup>
  );
}
