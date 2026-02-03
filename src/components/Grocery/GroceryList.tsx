import { useMemo, useState } from 'react';
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
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const days = useMemo(() => {
    const today = startOfToday();
    return Array.from({ length: 5 }, (_, i) => ({
      date: addDays(today, i),
      dateStr: format(addDays(today, i), 'yyyy-MM-dd'),
      label: format(addDays(today, i), 'EEE d'),
    }));
  }, []);

  const toggleDay = (dateStr: string) => {
    setSelectedDays((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const selectAll = () => {
    setSelectedDays(days.map((d) => d.dateStr));
  };

  const groceryItems = useMemo(() => {
    const daysToInclude =
      selectedDays.length > 0 ? selectedDays : days.map((d) => d.dateStr);

    // Get recipes for selected days
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
  }, [state.calendar, state.recipes, selectedDays, days]);

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

  return (
    <div className="sidebar-section">
      <h3 className="sidebar-title">Grocery List</h3>

      <div style={{ marginBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', marginBottom: 'var(--space-sm)' }}>
          {days.map((day) => (
            <span
              key={day.dateStr}
              className={`tag ${selectedDays.includes(day.dateStr) ? 'vegan' : ''}`}
              onClick={() => toggleDay(day.dateStr)}
              style={{ cursor: 'pointer' }}
            >
              {day.label}
            </span>
          ))}
        </div>
        <Button size="small" variant="secondary" onClick={selectAll}>
          Select All
        </Button>
      </div>

      {groceryItems.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-gray)' }}>
          No meals planned for selected days.
        </p>
      ) : (
        <>
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

          <Button
            onClick={handlePrint}
            style={{ width: '100%', marginTop: 'var(--space-md)' }}
          >
            Print List
          </Button>
        </>
      )}
    </div>
  );
}
