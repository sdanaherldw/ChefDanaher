import { useRef, useState, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Recipe } from '../../types';

interface RecipeCardEnhancedProps {
  recipe: Recipe;
  onClick: () => void;
  onFavoriteToggle: () => void;
  onAssignToDay?: (date: string) => void;
  upcomingDays?: { date: string; label: string }[];
  compact?: boolean;
}

function getFreshnessInfo(recipe: Recipe): { label: string; color: 'green' | 'yellow' | 'gray' } {
  if (!recipe.lastUsedAt) {
    return { label: 'Never made', color: 'gray' };
  }

  const lastUsed = new Date(recipe.lastUsedAt);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince <= 14) {
    return { label: `Made ${daysSince === 0 ? 'today' : daysSince === 1 ? 'yesterday' : `${daysSince} days ago`}`, color: 'green' };
  } else if (daysSince <= 30) {
    return { label: `Made ${Math.floor(daysSince / 7)} weeks ago`, color: 'yellow' };
  } else {
    const months = Math.floor(daysSince / 30);
    return { label: `Made ${months} ${months === 1 ? 'month' : 'months'} ago`, color: 'gray' };
  }
}

export function RecipeCardEnhanced({
  recipe,
  onClick,
  onFavoriteToggle,
  onAssignToDay,
  upcomingDays = [],
  compact = false,
}: RecipeCardEnhancedProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const freshness = getFreshnessInfo(recipe);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleFavoriteClick = (e: MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle();
  };

  const handleAddToDayClick = (e: MouseEvent) => {
    e.stopPropagation();
    setShowDayPicker(!showDayPicker);
  };

  const handleDaySelect = (date: string) => {
    onAssignToDay?.(date);
    setShowDayPicker(false);
  };

  if (compact) {
    return (
      <motion.div
        ref={cardRef}
        className="recipe-card-compact"
        onClick={onClick}
        onMouseMove={handleMouseMove}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        whileHover={{ y: -2, transition: { duration: 0.15 } }}
      >
        <div className="recipe-card-compact-name">{recipe.name}</div>
        <div className="recipe-card-compact-meta">
          {recipe.totalTime} min
        </div>
        <button
          className={`recipe-card-heart compact ${recipe.isFavorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {recipe.isFavorite ? '♥' : '♡'}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      className="recipe-card-enhanced"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowQuickActions(true)}
      onMouseLeave={() => {
        setShowQuickActions(false);
        setShowDayPicker(false);
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{ cursor: 'pointer' }}
    >
      {/* Favorite heart */}
      <button
        className={`recipe-card-heart ${recipe.isFavorite ? 'active' : ''}`}
        onClick={handleFavoriteClick}
        aria-label={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {recipe.isFavorite ? '♥' : '♡'}
      </button>

      {/* Freshness badge */}
      <div className={`freshness-badge freshness-${freshness.color}`}>
        {freshness.label}
      </div>

      <div className="recipe-card-name">{recipe.name}</div>
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
              delay: index * 0.05,
            }}
          >
            {tag}
          </motion.span>
        ))}
      </div>

      {/* Quick actions overlay */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            className="quick-actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {upcomingDays.length > 0 && (
              <div className="quick-action-wrapper">
                <button
                  className="quick-action-btn"
                  onClick={handleAddToDayClick}
                  aria-label="Add to day"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 0v2H2v12h12V2h-2V0h-2v2H6V0H4zm0 5h8v7H4V5z" />
                  </svg>
                  Add to Day
                </button>

                <AnimatePresence>
                  {showDayPicker && (
                    <motion.div
                      className="day-picker-dropdown"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {upcomingDays.map((day) => (
                        <button
                          key={day.date}
                          className="day-picker-option"
                          onClick={() => handleDaySelect(day.date)}
                        >
                          {day.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
