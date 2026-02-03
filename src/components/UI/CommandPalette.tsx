import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppState } from '../../context/AppContext';
import type { Recipe } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onNavigate: (section: 'generate' | 'settings' | 'batch' | 'full-menu') => void;
}

interface CommandItem {
  id: string;
  title: string;
  type: 'recipe' | 'action' | 'navigation';
  icon: string;
  action: () => void;
}

export function CommandPalette({ isOpen, onClose, onSelectRecipe, onNavigate }: CommandPaletteProps) {
  const { state } = useAppState();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build command items
  const items = useMemo<CommandItem[]>(() => {
    const commands: CommandItem[] = [];

    // Add navigation actions
    commands.push({
      id: 'nav-full-menu',
      title: 'Browse the Full Menu',
      type: 'navigation',
      icon: '📋',
      action: () => {
        onNavigate('full-menu');
        onClose();
      },
    });

    commands.push({
      id: 'nav-generate',
      title: 'Cook up something new',
      type: 'action',
      icon: '🍳',
      action: () => {
        onNavigate('generate');
        onClose();
      },
    });

    commands.push({
      id: 'nav-batch',
      title: 'Get recipe ideas',
      type: 'action',
      icon: '💡',
      action: () => {
        onNavigate('batch');
        onClose();
      },
    });

    commands.push({
      id: 'nav-settings',
      title: 'Back of house (Settings)',
      type: 'navigation',
      icon: '⚙️',
      action: () => {
        onNavigate('settings');
        onClose();
      },
    });

    // Add recipes
    state.recipes.forEach((recipe) => {
      commands.push({
        id: recipe.id,
        title: recipe.name,
        type: 'recipe',
        icon: '📖',
        action: () => {
          onSelectRecipe(recipe);
          onClose();
        },
      });
    });

    return commands;
  }, [state.recipes, onSelectRecipe, onNavigate, onClose]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items.slice(0, 10);

    const lowerQuery = query.toLowerCase();
    return items
      .filter((item) => item.title.toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  }, [items, query]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredItems, selectedIndex, onClose]
  );

  // Secret menu easter egg
  useEffect(() => {
    if (query.toLowerCase() === 'secret menu') {
      // Show joke recipes
    }
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="command-palette-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="command-palette"
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              className="command-palette-input"
              placeholder="What sounds good?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <div className="command-palette-results">
              {filteredItems.length === 0 ? (
                <div className="command-palette-empty">
                  <p style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-gray)' }}>
                    Nothing matches that search
                  </p>
                </div>
              ) : (
                filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={item.action}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <span className="command-palette-item-icon">{item.icon}</span>
                    <span className="command-palette-item-title">{item.title}</span>
                    <span className="command-palette-item-type">{item.type}</span>
                  </motion.div>
                ))
              )}
            </div>

            <div style={{
              padding: 'var(--space-sm) var(--space-lg)',
              borderTop: '1px solid var(--color-gray-light)',
              display: 'flex',
              gap: 'var(--space-md)',
              fontSize: '0.75rem',
              color: 'var(--color-gray)',
            }}>
              <span><kbd className="kbd">↑↓</kbd> Navigate</span>
              <span><kbd className="kbd">↵</kbd> Select</span>
              <span><kbd className="kbd">Esc</kbd> Close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
