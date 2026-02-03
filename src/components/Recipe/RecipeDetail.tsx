import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Recipe, Ingredient, RecipeStep } from '../../types';
import { hasProteinVariants, HOUSEHOLD } from '../../types';
import { Button } from '../UI/Button';

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
  onDelete: () => void;
}

// Group ingredients by their group field
function groupIngredients(ingredients: Ingredient[]): Map<string, Ingredient[]> {
  const groups = new Map<string, Ingredient[]>();

  for (const ing of ingredients) {
    const group = ing.group || 'Main';
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(ing);
  }

  return groups;
}

// Format ingredient as inline string: "3 tbsp white miso paste"
function formatIngredient(ing: Ingredient): string {
  const amount = ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(1);
  return `${amount} ${ing.unit} ${ing.name}`.trim();
}

// Get suitable diners for display
function getSuitableForDisplay(suitableFor?: string[]): string | null {
  if (!suitableFor || suitableFor.length === 0 || suitableFor.length === HOUSEHOLD.length) {
    return null; // Everyone can eat it
  }
  const names = suitableFor
    .map(id => HOUSEHOLD.find(m => m.id === id)?.name)
    .filter(Boolean);
  return names.join(' & ');
}

function IngredientGroup({
  title,
  ingredients,
  suitableFor
}: {
  title: string;
  ingredients: Ingredient[];
  suitableFor?: string | null;
}) {
  return (
    <motion.div
      className="ingredients-group"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h4 className="ingredients-group-title">
        {title}
        {suitableFor && (
          <span className="dietary-badge">{suitableFor}</span>
        )}
      </h4>
      <ul className="ingredients-checklist">
        {ingredients.map((ing, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
          >
            {formatIngredient(ing)}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

function TaskSection({
  title,
  steps,
  icon,
  suitableFor
}: {
  title: string;
  steps: RecipeStep[];
  icon?: string;
  suitableFor?: string | null;
}) {
  return (
    <motion.div
      className="task-section"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h4 className="task-section-title">
        {icon && <span className="task-icon">{icon}</span>}
        {title}
        {suitableFor && (
          <span className="dietary-badge">{suitableFor}</span>
        )}
      </h4>
      <ol className="task-steps">
        {steps.map((step, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            {step.instruction}
            {step.duration > 0 && (
              <span className="step-time">{step.duration} min</span>
            )}
          </motion.li>
        ))}
      </ol>
    </motion.div>
  );
}

function Timeline({ steps }: { steps: RecipeStep[] }) {
  // Build a simple timeline from steps
  let runningTime = 0;
  const entries = steps.map((step) => {
    const entry = {
      time: runningTime,
      action: step.instruction,
    };
    runningTime += step.duration;
    return entry;
  });

  if (entries.length < 3) return null; // Don't show for very short recipes

  return (
    <motion.div
      className="timeline-section"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h4 className="timeline-title">Timeline</h4>
      <table className="timeline-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 6).map((entry, i) => (
            <tr key={i}>
              <td className="timeline-time">{entry.time}:00</td>
              <td>{entry.action.substring(0, 60)}{entry.action.length > 60 ? '...' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

export function RecipeDetail({ recipe, onClose, onDelete }: RecipeDetailProps) {
  const handlePrint = () => {
    window.print();
  };

  const isVariant = hasProteinVariants(recipe);

  // Group ingredients for display
  const ingredientGroups = useMemo(() => {
    if (isVariant) {
      return groupIngredients(recipe.sharedIngredients || []);
    }
    return groupIngredients(recipe.ingredients || []);
  }, [recipe, isVariant]);

  // Get equipment string
  const equipmentStr = recipe.equipment.join(' + ');

  // Build subtitle line
  const subtitleParts = [
    `Serves ${recipe.servings}`,
    `${recipe.totalTime} minutes`,
    equipmentStr,
  ];

  // Add protein variant info to subtitle
  if (isVariant && recipe.proteinOptions) {
    const variantInfo = recipe.proteinOptions
      .map(opt => {
        const who = getSuitableForDisplay(opt.suitableFor);
        return who ? `${who}: ${opt.name.split(' ').slice(-1)[0]}` : opt.name;
      })
      .join(' | ');
    subtitleParts.push(variantInfo);
  }

  return (
    <motion.div
      className="recipe-detail-new"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <motion.header
        className="recipe-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="recipe-title">{recipe.name}</h1>
        <p className="recipe-subtitle">{subtitleParts.join('  |  ')}</p>
      </motion.header>

      {/* Main Content - Two Column Layout */}
      <div className="recipe-two-column">
        {/* Left Column: Ingredients */}
        <motion.div
          className="recipe-column-left"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="recipe-section-header">Ingredients</h2>

          {Array.from(ingredientGroups.entries()).map(([groupName, ings]) => (
            <IngredientGroup
              key={groupName}
              title={groupName}
              ingredients={ings}
            />
          ))}

          {/* Protein Variant Ingredients */}
          {isVariant && recipe.proteinOptions?.map((option) => (
            <IngredientGroup
              key={option.id}
              title={option.name}
              ingredients={option.ingredients}
              suitableFor={getSuitableForDisplay(option.suitableFor)}
            />
          ))}
        </motion.div>

        {/* Right Column: Setup & Timeline */}
        <motion.div
          className="recipe-column-right"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          {/* Description as setup note */}
          {recipe.description && (
            <div className="setup-box">
              <h4 className="setup-box-title">About This Dish</h4>
              <p>{recipe.description}</p>
            </div>
          )}

          {/* Tags */}
          <div className="recipe-tags-section">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className={`recipe-tag ${tag === 'vegan' ? 'vegan' : ''}`}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Timeline for longer recipes */}
          {!isVariant && recipe.steps && recipe.steps.length >= 3 && (
            <Timeline steps={recipe.steps} />
          )}
        </motion.div>
      </div>

      {/* Instructions - Full Width */}
      <motion.section
        className="recipe-instructions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="recipe-section-header">Instructions</h2>

        {isVariant ? (
          <>
            {/* Shared base steps */}
            {recipe.sharedSteps && recipe.sharedSteps.length > 0 && (
              <TaskSection
                title="Base Preparation"
                steps={recipe.sharedSteps}
                icon="🍳"
              />
            )}

            {/* Protein-specific steps */}
            {recipe.proteinOptions?.map((option) => (
              <TaskSection
                key={option.id}
                title={option.name}
                steps={option.steps}
                icon={option.dietaryInfo.isVegan ? '🌱' : '🍗'}
                suitableFor={getSuitableForDisplay(option.suitableFor)}
              />
            ))}
          </>
        ) : (
          /* Legacy single-path recipe */
          recipe.steps && (
            <TaskSection
              title="Cooking"
              steps={recipe.steps}
              icon="🍳"
            />
          )
        )}
      </motion.section>

      {/* Action Buttons */}
      <motion.div
        className="recipe-actions no-print"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button variant="secondary" onClick={onClose}>
          Back to Menu
        </Button>
        <Button onClick={handlePrint}>Print Recipe</Button>
        <Button variant="danger" onClick={onDelete}>
          86 This
        </Button>
      </motion.div>
    </motion.div>
  );
}
