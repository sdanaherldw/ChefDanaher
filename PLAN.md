# Plan: Collapsible Sidebar + Auto-Generate Meal Plan

## Overview
Add collapsible cards to the sidebar and a new "Auto-Generate Meal Plan" feature that batch-generates a week's worth of varied, ingredient-efficient recipes.

---

## Part 1: Collapsible Sidebar Cards

### New Component: `CollapsibleCard.tsx`
- Reusable wrapper component with:
  - Header bar with title + chevron icon (▼ expanded, ▲ collapsed)
  - Smooth CSS transition on expand/collapse (max-height animation)
  - `defaultOpen` prop to control initial state
  - Stores collapse state in localStorage by card ID

### Apply to Existing Sections:
1. **Generate Recipe** - Default: expanded
2. **Recipes** - Default: expanded
3. **Auto-Generate Meal Plan** (new) - Default: collapsed

---

## Part 2: Auto-Generate Meal Plan Feature

### New Sidebar Card: `AutoPlanForm.tsx`

**UI Elements:**
1. Diner checkboxes (Shane, Lauren, Tucker, Brady) - same as Generate Recipe
2. "Number of Days" dropdown: 3, 4, 5, 6, 7
3. "Generate Plan" button
4. Preview area (shows generated plan before applying)
5. "Apply Plan" / "Regenerate" buttons after preview

### New API Endpoint: `generate-plan.ts`

**Request:**
```typescript
{
  diners: string[];      // ['shane', 'lauren', 'tucker', 'brady']
  numberOfDays: number;  // 3-7
  existingCalendar: DayPlan[];  // to find empty days
}
```

**Logic:**
1. Find next N days without recipes (skip already-planned days)
2. Build prompt with:
   - Dietary constraints from selected diners
   - Variation rules (protein rotation, cuisine variety, cooking method mix)
   - Ingredient efficiency (reuse produce, minimize unique items)
   - Equipment preferences (Joule, Vitamix, etc.)
3. Single OpenAI call generates all N recipes
4. Validate with Zod schema
5. Return recipes + day assignments

**Response:**
```typescript
{
  plan: Array<{
    date: string;        // '2024-02-05'
    recipe: Recipe;
  }>;
}
```

### AI Prompt Strategy

The prompt will instruct GPT-4o to:
- Generate exactly N recipes as a JSON array
- Ensure **protein variety**: rotate between tofu, tempeh, legumes, seitan, etc.
- Ensure **cuisine rotation**: no same cuisine back-to-back
- Ensure **cooking method variety**: sheet pan → stir-fry → soup → grain bowl
- **Ingredient efficiency**:
  - If cilantro is needed Monday, use it again by Wednesday
  - Share aromatics (ginger, garlic) across multiple recipes
  - Minimize unique produce items to reduce waste
- All recipes under 40 minutes
- Respect equipment preferences

---

## Part 3: Mid-Century Diner Loading Animation

### Themed Spinner with Rotating Messages

**Visual:** Retro spinning plate/diner element

**Rotating Messages (cycle every 2 seconds):**
1. "Flipping your flapjacks..."
2. "Spinning the pie case..."
3. "Warming up the griddle..."
4. "Checking the blue plate special..."
5. "Pouring a fresh cup of joe..."
6. "Firing up the short order..."
7. "Seasoning the hash browns..."
8. "Ringing the dinner bell..."

**CSS:**
- Retro font (Pacifico)
- Red/teal color scheme
- Subtle bounce animation on text

---

## Files to Create

1. `src/components/UI/CollapsibleCard.tsx`
2. `src/components/Generate/AutoPlanForm.tsx`
3. `src/components/UI/DinerSpinner.tsx` (themed loading component)
4. `netlify/functions/generate-plan.ts`

## Files to Modify

1. `src/types/index.ts` - Add GeneratePlanRequest, GeneratePlanResponse
2. `src/api/client.ts` - Add generatePlan() method
3. `src/pages/DashboardPage.tsx` - Wrap sidebar sections in CollapsibleCard, add AutoPlanForm
4. `src/context/AppContext.tsx` - Add applyMealPlan() action for batch save
5. `src/styles/index.css` - Collapsible card styles, diner spinner styles

---

## User Flow

1. Click "Auto-Generate Meal Plan" header to expand
2. Diners default to all selected (can deselect)
3. Select "5 days" from dropdown
4. Click "Generate Plan"
5. Themed spinner appears: "Flipping your flapjacks..."
6. After ~10-15 seconds, preview appears:
   ```
   ┌─────────────────────────────────┐
   │ YOUR MEAL PLAN                  │
   ├─────────────────────────────────┤
   │ Wed Feb 5:  Thai Peanut Noodles │
   │ Thu Feb 6:  Black Bean Tacos    │
   │ Fri Feb 7:  Miso Glazed Tofu    │
   │ Sat Feb 8:  Chickpea Curry      │
   │ Sun Feb 9:  Mediterranean Bowl  │
   ├─────────────────────────────────┤
   │ [Apply Plan]    [Regenerate]    │
   └─────────────────────────────────┘
   ```
7. Click "Apply Plan" → All recipes saved, calendar populated
8. Success toast: "5 meals planned!"
9. Collapse the card

---

## Implementation Order

1. Create CollapsibleCard component + styles
2. Wrap existing Generate Recipe in CollapsibleCard
3. Wrap existing Recipes in CollapsibleCard
4. Create DinerSpinner component with themed messages
5. Create AutoPlanForm component (UI only, no API yet)
6. Add to sidebar
7. Create generate-plan.ts backend endpoint
8. Wire up API client
9. Add applyMealPlan to AppContext
10. Connect AutoPlanForm to backend
11. Test end-to-end
12. Deploy

---

## Acceptance Criteria

- [ ] Generate Recipe card is collapsible
- [ ] Recipes card is collapsible
- [ ] Auto-Generate Meal Plan card exists and is collapsible
- [ ] Selecting diners + days and clicking Generate shows themed spinner
- [ ] Spinner shows rotating diner-themed messages
- [ ] Preview displays generated recipes with dates
- [ ] Apply Plan saves all recipes and calendar entries
- [ ] Recipes have varied proteins (no same type back-to-back)
- [ ] Recipes share ingredients where practical
- [ ] All recipes respect dietary constraints
