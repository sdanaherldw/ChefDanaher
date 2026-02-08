import { useEffect, useCallback, useRef } from 'react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: Shortcut[];
}

export function useKeyboardShortcuts({ enabled = true, shortcuts }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow escape to work in inputs
        if (event.key !== 'Escape') return;
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const metaMatches = !!shortcut.meta === event.metaKey;
        const shiftMatches = !!shortcut.shift === event.shiftKey;
        const altMatches = !!shortcut.alt === event.altKey;

        // For shortcuts with ctrl/meta, check either
        const modifierMatches = shortcut.ctrl
          ? ctrlMatches
          : shortcut.meta
          ? metaMatches
          : !event.ctrlKey && !event.metaKey;

        if (keyMatches && modifierMatches && shiftMatches && altMatches) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [enabled, shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Track repeated clicks on an element
export function useRepeatedClicks(threshold: number, callback: () => void) {
  const clickCount = useRef(0);
  const lastClickTime = useRef(0);

  const handleClick = useCallback(() => {
    const now = Date.now();

    // Reset if more than 500ms between clicks
    if (now - lastClickTime.current > 500) {
      clickCount.current = 0;
    }

    lastClickTime.current = now;
    clickCount.current += 1;

    if (clickCount.current >= threshold) {
      clickCount.current = 0;
      callback();
    }
  }, [threshold, callback]);

  return handleClick;
}

// Keyboard shortcuts data for the help modal
export const KEYBOARD_SHORTCUTS = [
  { category: 'Navigation', shortcuts: [
    { keys: ['?'], description: 'Show keyboard shortcuts' },
    { keys: ['/', '⌘', 'K'], description: 'Open command palette' },
    { keys: ['Esc'], description: 'Close modal / detail view' },
  ]},
  { category: 'Recipes', shortcuts: [
    { keys: ['N'], description: 'Focus recipe generator' },
    { keys: ['J'], description: 'Next recipe in list' },
    { keys: ['K'], description: 'Previous recipe in list' },
    { keys: ['Enter'], description: 'Open selected recipe' },
  ]},
  { category: 'Full Menu', shortcuts: [
    { keys: ['G'], description: 'Toggle List/Board view' },
    { keys: ['Esc'], description: 'Clear search, then go back' },
  ]},
  { category: 'Quick Actions', shortcuts: [
    { keys: ['1-5'], description: 'Assign selected recipe to day' },
  ]},
];
