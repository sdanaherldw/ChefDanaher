import { motion, AnimatePresence } from 'framer-motion';
import { KEYBOARD_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay visible"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-dialog shortcuts-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            style={{ padding: 'var(--space-lg)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ margin: 0, color: 'var(--color-red)' }}>Keyboard Shortcuts</h3>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  color: 'var(--color-gray)',
                }}
              >
                ✕
              </button>
            </div>

            {KEYBOARD_SHORTCUTS.map((section) => (
              <div key={section.category} className="shortcuts-section">
                <h4 className="shortcuts-section-title">{section.category}</h4>
                <div className="shortcuts-list">
                  {section.shortcuts.map((shortcut) => (
                    <div key={shortcut.description} className="shortcut-row">
                      <span>{shortcut.description}</span>
                      <span className="shortcut-keys">
                        {shortcut.keys.map((key, i) => (
                          <kbd key={i} className="kbd">{key}</kbd>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray)', marginTop: 'var(--space-lg)', textAlign: 'center' }}>
              Press <kbd className="kbd">?</kbd> anytime to see this help
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
