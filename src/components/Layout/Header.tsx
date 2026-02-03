import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../UI/Button';
import { useRepeatedClicks } from '../../hooks/useKeyboardShortcuts';

interface HeaderProps {
  onSettingsClick?: () => void;
  onFullMenuClick?: () => void;
  onLogoClick?: () => void;
  showSettings?: boolean;
  showFullMenu?: boolean;
}

// About panel easter egg content
function AboutPanel({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 'var(--space-lg)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        style={{
          background: 'var(--color-cream)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl)',
          maxWidth: '400px',
          textAlign: 'center',
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-red)', marginBottom: 'var(--space-md)' }}>
          The Story
        </h2>
        <p style={{ marginBottom: 'var(--space-md)', lineHeight: 1.6 }}>
          <strong>Birdie</strong> is the heart of this kitchen. No fuss, no frills—just
          good food, made with care, landing in front of you before you knew you were
          hungry. You're gonna eat well. You're gonna love it. And somewhere between
          the first bite and the last, you're gonna feel loved too.
        </p>
        <p style={{ marginBottom: 'var(--space-md)', lineHeight: 1.6 }}>
          <strong>Ripsaw</strong> is... unpredictable. You never quite know what's
          coming out of that kitchen. Could be genius. Could be chaos. Either way,
          you're eating it. "Just try it," he'll say, sliding a plate your way.
          "It's all you got."
        </p>
        <p style={{ color: 'var(--color-gray)', fontSize: '0.875rem', marginBottom: 'var(--space-lg)' }}>
          Together, they make sure your family eats well every night.
        </p>
        <Button onClick={onClose}>Back to the Diner</Button>
      </motion.div>
    </motion.div>
  );
}

export function Header({ onSettingsClick, onFullMenuClick, onLogoClick, showSettings = true, showFullMenu = true }: HeaderProps) {
  const { user, logout } = useAuth();
  const [showAbout, setShowAbout] = useState(false);

  // Easter egg: click logo 5 times to see the About panel
  const triggerEasterEgg = useRepeatedClicks(5, () => {
    setShowAbout(true);
  });

  const handleLogoClick = () => {
    triggerEasterEgg(); // Track for easter egg
    if (onLogoClick) {
      onLogoClick(); // Navigate home
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          <motion.h1
            className="logo"
            onClick={handleLogoClick}
            style={{ cursor: 'pointer' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Birdie & Ripsaw's Diner
          </motion.h1>
          <nav className="header-nav">
            {user && (
              <>
                <motion.span
                  style={{ color: 'var(--color-cream)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  Howdy, {user.username}!
                </motion.span>
                {showFullMenu && onFullMenuClick && (
                  <Button variant="ghost" onClick={onFullMenuClick} className="full-menu-nav-btn">
                    The Full Menu
                  </Button>
                )}
                {showSettings && onSettingsClick && (
                  <Button variant="ghost" onClick={onSettingsClick}>
                    Back of House
                  </Button>
                )}
                <Button variant="ghost" onClick={logout}>
                  Clock Out
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <AnimatePresence>
        {showAbout && <AboutPanel onClose={() => setShowAbout(false)} />}
      </AnimatePresence>
    </>
  );
}
