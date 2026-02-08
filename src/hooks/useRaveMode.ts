import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'rave-mode-enabled';

export function useRaveMode() {
  const [isRaveMode, setIsRaveMode] = useState<boolean>(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    }
    return false;
  });

  const [isTransitioning, setIsTransitioning] = useState(false);

  // Apply/remove theme class on document
  useEffect(() => {
    if (isRaveMode) {
      document.documentElement.setAttribute('data-theme', 'rave');
      // Remove the old theme-neon class if present
      document.body.classList.remove('theme-neon');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isRaveMode]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isRaveMode));
  }, [isRaveMode]);

  const toggleRaveMode = useCallback(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      // Instant transition for accessibility
      setIsRaveMode(prev => !prev);
      return;
    }

    // Start transition animation
    setIsTransitioning(true);

    if (!isRaveMode) {
      // Turning ON: Quick dim then switch
      document.documentElement.classList.add('rave-transition-on');

      setTimeout(() => {
        setIsRaveMode(true);
        document.documentElement.classList.remove('rave-transition-on');
      }, 150);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 400);
    } else {
      // Turning OFF: Quick brighten then switch
      document.documentElement.classList.add('rave-transition-off');

      setTimeout(() => {
        setIsRaveMode(false);
        document.documentElement.classList.remove('rave-transition-off');
      }, 150);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 400);
    }
  }, [isRaveMode]);

  const enableRaveMode = useCallback(() => {
    if (!isRaveMode) {
      toggleRaveMode();
    }
  }, [isRaveMode, toggleRaveMode]);

  const disableRaveMode = useCallback(() => {
    if (isRaveMode) {
      toggleRaveMode();
    }
  }, [isRaveMode, toggleRaveMode]);

  return {
    isRaveMode,
    isTransitioning,
    toggleRaveMode,
    enableRaveMode,
    disableRaveMode,
  };
}
