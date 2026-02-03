import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppState } from '../../context/AppContext';
import type { Toast as ToastType } from '../../types';

interface ToastItemProps {
  toast: ToastType;
  onUndo?: () => void;
}

function ToastItem({ toast, onUndo }: ToastItemProps) {
  const { removeToast } = useAppState();

  const handleClose = useCallback(() => {
    removeToast(toast.id);
  }, [removeToast, toast.id]);

  // Auto-close is now handled by AppContext, but we can still track progress
  const duration = toast.duration || 5000;

  return (
    <motion.div
      className={`toast ${toast.type}`}
      initial={{ x: '120%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0, scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        opacity: { duration: 0.2 }
      }}
      layout
    >
      <div className="toast-content">
        <span className="toast-message">{toast.message}</span>
        {onUndo && toast.type === 'error' && (
          <button className="toast-undo" onClick={onUndo}>
            Undo
          </button>
        )}
      </div>
      <button
        className="toast-close"
        onClick={handleClose}
        aria-label="Close"
      >
        ✕
      </button>
      <motion.div
        className="toast-progress"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts } = useAppState();

  return (
    <div className="toast-container">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
