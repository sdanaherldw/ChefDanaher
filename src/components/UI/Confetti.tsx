import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  shape: 'circle' | 'square' | 'fork' | 'knife';
}

const DINER_COLORS = [
  'var(--color-red)',
  'var(--color-teal)',
  'var(--color-mustard)',
  'var(--color-mint)',
  'var(--color-coral)',
];

const RAVE_COLORS = [
  '#ff2d6a',  // hot pink
  '#00ffcc',  // electric cyan
  '#bf00ff',  // deep violet
  '#00ff88',  // neon green
  '#ffff00',  // electric yellow
  '#00aaff',  // electric blue
  '#ff6b35',  // orange neon
];

function isRaveMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme') === 'rave';
}

function generateConfetti(count: number): ConfettiPiece[] {
  const colors = isRaveMode() ? RAVE_COLORS : DINER_COLORS;
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.5,
    rotation: Math.random() * 360,
    shape: ['circle', 'square', 'fork', 'knife'][Math.floor(Math.random() * 4)] as ConfettiPiece['shape'],
  }));
}

function ConfettiShape({ shape, color }: { shape: ConfettiPiece['shape']; color: string }) {
  switch (shape) {
    case 'circle':
      return <circle cx="5" cy="5" r="5" fill={color} />;
    case 'square':
      return <rect x="0" y="0" width="10" height="10" fill={color} />;
    case 'fork':
      return (
        <g fill={color}>
          <rect x="4" y="0" width="2" height="10" rx="1" />
          <rect x="2" y="0" width="2" height="4" rx="1" />
          <rect x="6" y="0" width="2" height="4" rx="1" />
        </g>
      );
    case 'knife':
      return (
        <g fill={color}>
          <rect x="4" y="2" width="2" height="8" rx="1" />
          <path d="M4 0 L6 0 L8 4 L6 4 Z" />
        </g>
      );
  }
}

interface ConfettiProps {
  isActive: boolean;
  onComplete?: () => void;
}

export function Confetti({ isActive, onComplete }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isActive) {
      setPieces(generateConfetti(50));
      const timer = setTimeout(() => {
        setPieces([]);
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {pieces.length > 0 && (
        <div className="confetti-container">
          {pieces.map((piece) => (
            <motion.svg
              key={piece.id}
              className="confetti-piece"
              width="10"
              height="10"
              viewBox="0 0 10 10"
              style={{ left: `${piece.x}%` }}
              initial={{
                y: -20,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: '100vh',
                rotate: piece.rotation + 720,
                opacity: 0,
              }}
              transition={{
                duration: 3 + Math.random(),
                delay: piece.delay,
                ease: 'easeOut',
              }}
            >
              <ConfettiShape shape={piece.shape} color={piece.color} />
            </motion.svg>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

interface CelebrationOverlayProps {
  isVisible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function CelebrationOverlay({ isVisible, title, message, onClose }: CelebrationOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <Confetti isActive={isVisible} />
          <motion.div
            className="celebration-overlay"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={onClose}
          >
            {/* Neon OPEN sign effect */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                delay: 0.2
              }}
              style={{
                padding: 'var(--space-lg) var(--space-2xl)',
                border: '4px solid var(--color-red)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 0 20px var(--color-red), 0 0 40px rgba(199, 62, 58, 0.3)',
                marginBottom: 'var(--space-xl)',
              }}
            >
              <motion.h2
                className="celebration-title"
                style={{
                  textShadow: '0 0 10px var(--color-red)',
                  margin: 0,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.8, 1] }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                {title}
              </motion.h2>
            </motion.div>

            <motion.p
              className="celebration-message"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {message}
            </motion.p>

            <motion.button
              className="btn btn-primary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              onClick={onClose}
              style={{ marginTop: 'var(--space-lg)' }}
            >
              <span className="btn-content">Thanks, I'm amazing</span>
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
