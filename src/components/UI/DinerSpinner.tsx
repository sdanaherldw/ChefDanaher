import { useState, useEffect } from 'react';

const DINER_MESSAGES = [
  "Flipping your flapjacks...",
  "Spinning the pie case...",
  "Warming up the griddle...",
  "Checking the blue plate special...",
  "Pouring a fresh cup of joe...",
  "Firing up the short order...",
  "Seasoning the hash browns...",
  "Ringing the dinner bell...",
];

interface DinerSpinnerProps {
  className?: string;
}

export function DinerSpinner({ className = '' }: DinerSpinnerProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % DINER_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`diner-spinner ${className}`}>
      <div className="diner-spinner-icon">
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
      </div>
      <p className="diner-spinner-message">{DINER_MESSAGES[messageIndex]}</p>
    </div>
  );
}
