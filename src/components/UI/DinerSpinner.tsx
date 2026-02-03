import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type SpinnerContext = 'default' | 'recipe' | 'batch' | 'plan' | 'grocery' | 'browse';

const CONTEXT_MESSAGES: Record<SpinnerContext, string[]> = {
  default: [
    "Flipping your flapjacks...",
    "Spinning the pie case...",
    "Warming up the griddle...",
    "Checking the blue plate special...",
    "Pouring a fresh cup of joe...",
    "Firing up the short order...",
    "Seasoning the hash browns...",
    "Ringing the dinner bell...",
  ],
  recipe: [
    "Ripsaw's warming up the grill...",
    "Adding a pinch of love...",
    "Consulting the secret recipe book...",
    "Taste-testing for quality...",
    "Plating something special...",
    "Birdie's taking notes...",
    "Sizzling up something good...",
    "Almost ready for the pass...",
  ],
  batch: [
    "Rifling through the recipe box...",
    "Asking the regulars what's good...",
    "Checking what's fresh today...",
    "Brainstorming with Birdie...",
    "Ripsaw's got some ideas...",
    "Looking for crowd pleasers...",
    "Finding the hidden gems...",
    "Pulling out the favorites...",
  ],
  plan: [
    "Making sure nobody eats tacos 5 days straight...",
    "Balancing the week's menu...",
    "Checking what pairs well...",
    "Planning for leftovers...",
    "Mixing up the cuisines...",
    "Keeping things interesting...",
    "Birdie's scheduling the specials...",
    "Ripsaw's approving the lineup...",
  ],
  grocery: [
    "Checking the pantry...",
    "Making the shopping list...",
    "Organizing by aisle...",
    "Counting the ingredients...",
    "Finding the best deals...",
    "Getting everything ready...",
  ],
  browse: [
    "Birdie's flipping through the files...",
    "Checking the back catalog...",
    "Pulling up the specials...",
    "Dusting off the recipe cards...",
    "Organizing the menu board...",
  ],
};

interface DinerSpinnerProps {
  className?: string;
  context?: SpinnerContext;
}

export function DinerSpinner({ className = '', context = 'default' }: DinerSpinnerProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = CONTEXT_MESSAGES[context];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className={`diner-spinner ${className}`}>
      <motion.div
        className="diner-spinner-icon"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Plate */}
          <ellipse
            cx="24"
            cy="32"
            rx="20"
            ry="8"
            fill="var(--color-cream-dark)"
            stroke="var(--color-gray)"
            strokeWidth="2"
          />
          <ellipse
            cx="24"
            cy="28"
            rx="16"
            ry="6"
            fill="white"
            stroke="var(--color-gray-light)"
            strokeWidth="1"
          />
          {/* Fork */}
          <g className="diner-spinner-fork">
            <rect x="8" y="8" width="2" height="16" rx="1" fill="var(--color-gray)" />
            <rect x="6" y="6" width="2" height="6" rx="1" fill="var(--color-gray)" />
            <rect x="10" y="6" width="2" height="6" rx="1" fill="var(--color-gray)" />
          </g>
          {/* Knife */}
          <g className="diner-spinner-knife">
            <rect x="38" y="8" width="2" height="16" rx="1" fill="var(--color-gray)" />
            <path
              d="M38 6 L40 6 L42 12 L40 12 Z"
              fill="var(--color-gray)"
            />
          </g>
        </svg>
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.p
          key={messageIndex}
          className="diner-spinner-message"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {messages[messageIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
