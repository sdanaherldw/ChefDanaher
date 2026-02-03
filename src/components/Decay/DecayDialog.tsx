import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../UI/Button';
import type { Recipe } from '../../types';

interface DecayDialogProps {
  recipe: Recipe;
  daysSinceUsed: number;
  isNeverUsed: boolean;
  onKeep: () => void;
  onDelete: () => void;
}

export function DecayDialog({ recipe, daysSinceUsed, isNeverUsed, onKeep, onDelete }: DecayDialogProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="decay-overlay"
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          className="decay-dialog"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <h3 className="decay-title">Recipe Review</h3>

          <div className="decay-content">
            {isNeverUsed ? (
              <p>
                You added<br />
                <strong>"{recipe.name}"</strong><br />
                {daysSinceUsed} days ago but never made it.
              </p>
            ) : (
              <p>
                You haven't made<br />
                <strong>"{recipe.name}"</strong><br />
                in {daysSinceUsed} days.
              </p>
            )}

            <p className="decay-question">Would you like to keep it?</p>
          </div>

          <motion.div
            className="decay-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Button variant="danger" onClick={onDelete}>
              86 This
            </Button>
            <Button variant="primary" onClick={onKeep}>
              That's a Keeper!
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
