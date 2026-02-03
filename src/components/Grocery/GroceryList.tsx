import { useMemo } from 'react';
import { format, addDays, startOfToday } from 'date-fns';
import { useAppState } from '../../context/AppContext';
import { Button } from '../UI/Button';
import type { StoreSection, GroceryItem } from '../../types';

const SECTION_ORDER: StoreSection[] = [
  'produce',
  'meat',
  'pantry',
  'dairy-free',
  'frozen',
  'bakery',
  'other',
];

const SECTION_LABELS: Record<StoreSection, string> = {
  produce: 'Produce',
  meat: 'Meat & Seafood',
  pantry: 'Pantry',
  'dairy-free': 'Dairy-Free',
  frozen: 'Frozen',
  bakery: 'Bakery',
  other: 'Other',
};

export function GroceryList() {
  const { state } = useAppState();

  const days = useMemo(() => {
    const today = startOfToday();
    return Array.from({ length: 5 }, (_, i) => {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayPlan = state.calendar.find((d) => d.date === dateStr);
      return {
        date,
        dateStr,
        label: format(date, 'EEE d'),
        purchased: dayPlan?.groceriesPurchased || false,
        hasRecipe: !!dayPlan?.recipeId,
      };
    });
  }, [state.calendar]);

  // Count how many days are not yet purchased (need groceries)
  const unpurchasedDays = days.filter((d) => d.hasRecipe && !d.purchased);

  const groceryItems = useMemo(() => {
    // Only include days that have a recipe AND are not marked as purchased
    const daysToInclude = days
      .filter((d) => d.hasRecipe && !d.purchased)
      .map((d) => d.dateStr);

    // Get recipes for those days
    const recipes = daysToInclude
      .map((dateStr) => {
        const dayPlan = state.calendar.find((d) => d.date === dateStr);
        if (!dayPlan?.recipeId) return null;
        return state.recipes.find((r) => r.id === dayPlan.recipeId);
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // Aggregate ingredients
    const itemMap = new Map<string, GroceryItem>();

    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ing) => {
        const key = `${ing.name.toLowerCase()}-${ing.unit}`;
        const existing = itemMap.get(key);

        if (existing) {
          existing.totalAmount += ing.amount;
          if (!existing.recipes.includes(recipe.name)) {
            existing.recipes.push(recipe.name);
          }
        } else {
          itemMap.set(key, {
            name: ing.name,
            totalAmount: ing.amount,
            unit: ing.unit,
            section: ing.section,
            recipes: [recipe.name],
          });
        }
      });
    });

    return Array.from(itemMap.values());
  }, [state.calendar, state.recipes, days]);

  const groupedItems = useMemo(() => {
    const groups: Record<StoreSection, GroceryItem[]> = {
      produce: [],
      meat: [],
      pantry: [],
      'dairy-free': [],
      frozen: [],
      bakery: [],
      other: [],
    };

    groceryItems.forEach((item) => {
      groups[item.section].push(item);
    });

    return groups;
  }, [groceryItems]);

  const handlePrint = () => {
    window.print();
  };

  // Show which days need groceries
  const needGroceriesLabel = unpurchasedDays.length > 0
    ? `For: ${unpurchasedDays.map((d) => d.label).join(', ')}`
    : '';

  return (
    <div className="grocery-list-section">
      <div className="grocery-list-header">
        <h3 className="grocery-list-title">Grocery List</h3>
        {needGroceriesLabel && (
          <span className="grocery-days-label">{needGroceriesLabel}</span>
        )}
      </div>

      {groceryItems.length === 0 ? (
        <p className="grocery-empty">
          {days.some((d) => d.hasRecipe)
            ? 'All groceries purchased! Check a day to add its items back.'
            : 'No meals planned yet.'}
        </p>
      ) : (
        <div className="grocery-content">
          <div className="grocery-sections">
            {SECTION_ORDER.map((section) => {
              const items = groupedItems[section];
              if (items.length === 0) return null;

              return (
                <div key={section} className="grocery-section">
                  <h4 className="grocery-section-title">
                    {SECTION_LABELS[section]}
                  </h4>
                  {items.map((item, i) => (
                    <div key={i} className="grocery-item">
                      <span className="grocery-item-name">{item.name}</span>
                      <span className="grocery-item-amount">
                        {item.totalAmount} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <Button
            onClick={handlePrint}
            style={{ marginTop: 'var(--space-md)' }}
          >
            Print List
          </Button>
        </div>
      )}
    </div>
  );
}
