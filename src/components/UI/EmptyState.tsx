import { motion } from 'framer-motion';
import { Button } from './Button';

interface EmptyStateProps {
  variant: 'no-recipes' | 'no-meals-planned' | 'groceries-done' | 'search-empty' | 'full-menu-empty' | 'full-menu-no-results';
  onAction?: () => void;
}

// Birdie mascot (robin with notepad)
function BirdieMascot() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="40" cy="45" rx="20" ry="22" fill="#c73e3a" />
      {/* Belly */}
      <ellipse cx="40" cy="50" rx="14" ry="15" fill="#f5e6d3" />
      {/* Head */}
      <circle cx="40" cy="25" r="15" fill="#c73e3a" />
      {/* Eye */}
      <circle cx="45" cy="22" r="4" fill="white" />
      <circle cx="46" cy="21" r="2" fill="#2d2d2d" />
      {/* Beak */}
      <path d="M52 25 L60 26 L52 28 Z" fill="#d4a84b" />
      {/* Wing */}
      <ellipse cx="28" cy="45" rx="8" ry="12" fill="#a02f2c" />
      {/* Notepad */}
      <rect x="50" y="35" width="18" height="24" rx="2" fill="white" stroke="#6b6b6b" />
      <line x1="53" y1="42" x2="65" y2="42" stroke="#e5e5e5" />
      <line x1="53" y1="48" x2="65" y2="48" stroke="#e5e5e5" />
      <line x1="53" y1="54" x2="60" y2="54" stroke="#e5e5e5" />
      {/* Pencil */}
      <rect x="67" y="32" width="4" height="20" rx="1" fill="#d4a84b" transform="rotate(10 67 32)" />
    </svg>
  );
}

// Ripsaw mascot (bear chef) - exported for use in other components
export function RipsawMascot() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="40" cy="55" rx="25" ry="20" fill="#6b6b6b" />
      {/* Apron */}
      <path d="M25 45 L55 45 L52 70 L28 70 Z" fill="white" />
      {/* Head */}
      <circle cx="40" cy="28" r="18" fill="#6b6b6b" />
      {/* Ears */}
      <circle cx="24" cy="15" r="6" fill="#6b6b6b" />
      <circle cx="56" cy="15" r="6" fill="#6b6b6b" />
      <circle cx="24" cy="15" r="3" fill="#4a9b8f" />
      <circle cx="56" cy="15" r="3" fill="#4a9b8f" />
      {/* Snout */}
      <ellipse cx="40" cy="32" rx="8" ry="6" fill="#f5e6d3" />
      <ellipse cx="40" cy="30" rx="3" ry="2" fill="#2d2d2d" />
      {/* Eyes */}
      <circle cx="32" cy="24" r="3" fill="#2d2d2d" />
      <circle cx="48" cy="24" r="3" fill="#2d2d2d" />
      {/* Chef hat */}
      <ellipse cx="40" cy="10" rx="14" ry="8" fill="white" />
      <rect x="30" y="10" width="20" height="8" fill="white" />
    </svg>
  );
}

// Shopping bags icon
function ShoppingBagsMascot() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bag 1 */}
      <path d="M15 30 L15 65 L35 65 L35 30 Z" fill="#4a9b8f" />
      <path d="M20 30 Q25 20 30 30" stroke="#6b6b6b" fill="none" strokeWidth="2" />
      {/* Celery sticking out */}
      <rect x="18" y="22" width="3" height="12" fill="#8fc9b8" />
      <rect x="22" y="18" width="3" height="16" fill="#8fc9b8" />
      {/* Bag 2 */}
      <path d="M45 35 L45 65 L65 65 L65 35 Z" fill="#c73e3a" />
      <path d="M50 35 Q55 25 60 35" stroke="#6b6b6b" fill="none" strokeWidth="2" />
      {/* Bread sticking out */}
      <ellipse cx="55" cy="30" rx="6" ry="4" fill="#d4a84b" />
      {/* Ripsaw peeking */}
      <circle cx="55" cy="55" r="8" fill="#6b6b6b" />
      <circle cx="52" cy="53" r="2" fill="#2d2d2d" />
      <circle cx="58" cy="53" r="2" fill="#2d2d2d" />
      <ellipse cx="55" cy="57" rx="3" ry="2" fill="#f5e6d3" />
    </svg>
  );
}

const EMPTY_STATES = {
  'no-recipes': {
    icon: BirdieMascot,
    title: "The specials board is empty, sugar!",
    message: "Generate your first recipe to get started.",
    actionLabel: "Ring the kitchen bell",
  },
  'no-meals-planned': {
    icon: () => (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Booth */}
        <rect x="10" y="50" width="60" height="25" rx="4" fill="#c73e3a" />
        <rect x="15" y="55" width="50" height="15" rx="2" fill="#f5e6d3" />
        {/* Table */}
        <rect x="20" y="40" width="40" height="8" fill="#d4a84b" />
        <rect x="25" y="48" width="4" height="10" fill="#6b6b6b" />
        <rect x="51" y="48" width="4" height="10" fill="#6b6b6b" />
        {/* Sunlight rays */}
        <line x1="5" y1="10" x2="15" y2="25" stroke="#d4a84b" strokeWidth="2" opacity="0.5" />
        <line x1="15" y1="5" x2="22" y2="22" stroke="#d4a84b" strokeWidth="2" opacity="0.5" />
        <line x1="25" y1="2" x2="28" y2="20" stroke="#d4a84b" strokeWidth="2" opacity="0.5" />
      </svg>
    ),
    title: "This booth's open!",
    message: "Drag a recipe over to reserve it.",
    actionLabel: null,
  },
  'groceries-done': {
    icon: ShoppingBagsMascot,
    title: "Kitchen's stocked and ready!",
    message: "All groceries have been purchased.",
    actionLabel: null,
  },
  'search-empty': {
    icon: BirdieMascot,
    title: "Hmm, nothing matches that...",
    message: "Try a different search or check your spelling.",
    actionLabel: null,
  },
  'full-menu-empty': {
    icon: BirdieMascot,
    title: "The specials board's empty, sugar!",
    message: "Cook up some recipes to fill these pages.",
    actionLabel: "Back to the Kitchen",
  },
  'full-menu-no-results': {
    icon: BirdieMascot,
    title: "Nothing matches those orders, hon...",
    message: "Try loosening up those filters.",
    actionLabel: "Start Fresh",
  },
};

export function EmptyState({ variant, onAction }: EmptyStateProps) {
  const config = EMPTY_STATES[variant];
  const IconComponent = config.icon;

  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <motion.div
        className="empty-state-icon"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
      >
        <IconComponent />
      </motion.div>

      <motion.h4
        className="empty-state-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {config.title}
      </motion.h4>

      <motion.p
        className="empty-state-text"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {config.message}
      </motion.p>

      {config.actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button onClick={onAction}>{config.actionLabel}</Button>
        </motion.div>
      )}
    </motion.div>
  );
}
