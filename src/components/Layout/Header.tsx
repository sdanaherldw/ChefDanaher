import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../UI/Button';
import { useRaveMode } from '../../hooks/useRaveMode';

interface HeaderProps {
  onSettingsClick?: () => void;
  onFullMenuClick?: () => void;
  onLogoClick?: () => void;
  showSettings?: boolean;
  showFullMenu?: boolean;
}

// About panel content
function AboutPanel({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 'var(--space-lg)',
        overflowY: 'auto',
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
          maxWidth: '540px',
          textAlign: 'center',
          margin: 'auto',
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-red)', marginBottom: 'var(--space-lg)', fontSize: '1.75rem' }}>
          The Story of Birdie & Ripsaw
        </h2>

        {/* They Meet */}
        <motion.div
          style={{ marginBottom: 'var(--space-lg)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <img
            src="/story-meet.jpg"
            alt="Birdie and Ripsaw when they first met"
            style={{
              width: '100%',
              maxWidth: '280px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-sm)',
              border: '3px solid var(--color-cream-dark)',
              boxShadow: 'var(--shadow-md)',
            }}
          />
          <p style={{ fontStyle: 'italic', color: 'var(--color-gray)', fontSize: '0.8125rem', marginBottom: 'var(--space-xs)' }}>
            Somewhere in the Atlantic, 2004
          </p>
          <p style={{ lineHeight: 1.6, fontSize: '0.9375rem' }}>
            They met on a cruise to Bermuda. Ripsaw was stretched out on a lounger
            on the Sun Deck when Birdie walked up and asked, "Mind if I take the
            chair next to you?" The answer was no. It's been no ever since.
          </p>
        </motion.div>

        {/* They Marry */}
        <motion.div
          style={{ marginBottom: 'var(--space-lg)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <img
            src="/story-marry.jpg"
            alt="Birdie and Ripsaw's wedding in Bermuda"
            style={{
              width: '100%',
              maxWidth: '320px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-sm)',
              border: '3px solid var(--color-cream-dark)',
              boxShadow: 'var(--shadow-md)',
            }}
          />
          <p style={{ fontStyle: 'italic', color: 'var(--color-gray)', fontSize: '0.8125rem', marginBottom: 'var(--space-xs)' }}>
            Bermuda, a few years later
          </p>
          <p style={{ lineHeight: 1.6, fontSize: '0.9375rem' }}>
            They went back to the island where it all started. Said their vows with
            sand between their toes and saltwater in the air. The cake was simple.
            The promise wasn't.
          </p>
        </motion.div>

        {/* The Diner */}
        <motion.div
          style={{ marginBottom: 'var(--space-lg)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <img
            src="/story-diner.jpg"
            alt="Birdie and Ripsaw at their diner"
            style={{
              width: '100%',
              maxWidth: '380px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-sm)',
              border: '3px solid var(--color-cream-dark)',
              boxShadow: 'var(--shadow-md)',
            }}
          />
          <p style={{ fontStyle: 'italic', color: 'var(--color-gray)', fontSize: '0.8125rem', marginBottom: 'var(--space-xs)' }}>
            The diner, present day
          </p>
          <p style={{ lineHeight: 1.6, fontSize: '0.9375rem' }}>
            Now here they are. <strong>Birdie</strong> runs the front—warm smile,
            sharp memory, knows your order before you do. <strong>Ripsaw</strong> runs
            the back—unpredictable, fearless, sliding plates through the pass with a
            wink and a "trust me." Together, they've been feeding families for years.
          </p>
        </motion.div>

        <p style={{ color: 'var(--color-gray)', fontSize: '0.875rem', marginBottom: 'var(--space-lg)', fontStyle: 'italic' }}>
          Some things you find on a boat to Bermuda just stick with you forever.
        </p>

        <Button onClick={onClose}>Back to the Diner</Button>
      </motion.div>
    </motion.div>
  );
}

export function Header({ onSettingsClick, onFullMenuClick, onLogoClick, showSettings = true, showFullMenu = true }: HeaderProps) {
  const { user, logout } = useAuth();
  const [showAbout, setShowAbout] = useState(false);
  const { isRaveMode, toggleRaveMode, isTransitioning } = useRaveMode();

  const handleLogoClick = () => {
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
                <button
                  className="story-link"
                  onClick={() => setShowAbout(true)}
                >
                  The Story
                </button>
                <Button variant="ghost" onClick={logout}>
                  Clock Out
                </Button>
                <button
                  className={`neon-sign-toggle ${isRaveMode ? 'rave-active' : ''}`}
                  onClick={toggleRaveMode}
                  disabled={isTransitioning}
                  aria-label={isRaveMode ? 'Switch to day mode' : 'Switch to night mode'}
                  title={isRaveMode ? 'Open the diner' : 'Close the diner'}
                >
                  <span className="neon-dot" />
                  <span className="neon-text">{isRaveMode ? 'CLOSED' : 'OPEN'}</span>
                </button>
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
