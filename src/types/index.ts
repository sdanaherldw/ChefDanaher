// User and Authentication
export interface User {
  username: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Household Members
export interface HouseholdMember {
  id: string;
  name: string;
  restrictions: DietaryRestriction[];
}

export type DietaryRestriction =
  | 'no-meat'
  | 'no-fish'
  | 'no-dairy'
  | 'no-eggs'
  | 'no-honey';

// Predefined household
export const HOUSEHOLD: HouseholdMember[] = [
  {
    id: 'shane',
    name: 'Shane',
    restrictions: ['no-meat', 'no-fish', 'no-dairy', 'no-eggs', 'no-honey'] // Vegan
  },
  {
    id: 'lauren',
    name: 'Lauren',
    restrictions: ['no-dairy'] // Dairy-free, eats meat/fish/eggs
  },
  {
    id: 'tucker',
    name: 'Tucker',
    restrictions: [] // No restrictions
  },
  {
    id: 'brady',
    name: 'Brady',
    restrictions: ['no-dairy', 'no-eggs'] // Dairy-free and egg-free
  },
];

// Equipment preferences (in order of preference)
export const EQUIPMENT_PREFERENCES = [
  { id: 'joule', name: 'Breville Joule Oven', description: 'Countertop convection oven with precise temperature control' },
  { id: 'vitamix', name: 'Vitamix', description: 'High-powered blender for sauces, soups, smoothies' },
  { id: 'stovetop', name: 'Stovetop', description: 'Gas burners' },
  { id: 'rice-cooker', name: 'Rice Cooker', description: 'Always use for rice' },
  { id: 'wall-oven', name: 'Wall Oven', description: 'Standard oven (use only if necessary)' },
];

// Recipe Types
export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  section: StoreSection;
}

export type StoreSection =
  | 'produce'
  | 'meat'
  | 'pantry'
  | 'dairy-free'
  | 'frozen'
  | 'bakery'
  | 'other';

export interface RecipeStep {
  instruction: string;
  duration: number; // in minutes
  parallel?: string[]; // IDs of steps that can run in parallel
}

// Protein option for variant recipes
export interface ProteinOption {
  id: string;                    // "vegan" or "meat"
  name: string;                  // "Crispy Glazed Tofu"
  suitableFor: string[];         // ["shane"] - member IDs
  ingredients: Ingredient[];
  steps: RecipeStep[];
  dietaryInfo: {
    isVegan: boolean;
    isDairyFree: boolean;
    isEggFree: boolean;
  };
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  servings: number;
  totalTime: number; // in minutes

  // LEGACY (keep for backward compat with old recipes)
  ingredients?: Ingredient[];
  steps?: RecipeStep[];

  // NEW: Shared components everyone eats
  sharedIngredients?: Ingredient[];
  sharedSteps?: RecipeStep[];

  // NEW: Protein variants
  proteinOptions?: ProteinOption[];

  tags: string[];
  dietaryInfo: {
    isVegan: boolean;
    isDairyFree: boolean;
    isEggFree: boolean;
    hasCheese: boolean;
  };
  equipment: string[];
  createdAt: string;
  // New: who this recipe works for
  suitableFor?: string[]; // member IDs
  // Usage tracking: set when groceries are purchased for a day with this recipe
  lastUsedAt?: string; // ISO date string
}

// Helper: Check if recipe has protein variants
export function hasProteinVariants(recipe: Recipe): boolean {
  return Array.isArray(recipe.proteinOptions) && recipe.proteinOptions.length > 0;
}

// Helper: Get all ingredients for a recipe, given which diners are eating
// For legacy recipes, returns recipe.ingredients
// For variant recipes, returns sharedIngredients + all protein option ingredients
export function getAllIngredients(recipe: Recipe, _dinerIds?: string[]): Ingredient[] {
  if (!hasProteinVariants(recipe)) {
    // Legacy recipe - return ingredients directly
    return recipe.ingredients || [];
  }

  // Variant recipe - combine shared + all protein options
  const allIngredients: Ingredient[] = [...(recipe.sharedIngredients || [])];

  // Include ALL protein option ingredients (we need to buy for everyone)
  for (const option of recipe.proteinOptions || []) {
    allIngredients.push(...option.ingredients);
  }

  return allIngredients;
}

// Helper: Get all steps for a recipe
export function getAllSteps(recipe: Recipe): RecipeStep[] {
  if (!hasProteinVariants(recipe)) {
    return recipe.steps || [];
  }

  // For variant recipes, shared steps come first, then protein steps
  const allSteps: RecipeStep[] = [...(recipe.sharedSteps || [])];

  // Add protein option steps (labeled)
  for (const option of recipe.proteinOptions || []) {
    for (const step of option.steps) {
      allSteps.push({
        ...step,
        instruction: `[${option.name}] ${step.instruction}`
      });
    }
  }

  return allSteps;
}

// Calendar Types
export interface DayPlan {
  date: string; // ISO date string YYYY-MM-DD
  recipeId: string | null;
  groceriesPurchased?: boolean; // Mark if groceries for this day are already bought
}

// Application Settings
export interface AppSettings {
  recipeDecayDays: number;         // Days until used recipes are considered stale (default 60)
  suggestedRecipeDecayDays: number; // Days until never-used recipes are considered stale (default 30)
}

// Application State
export interface AppState {
  recipes: Recipe[];
  calendar: DayPlan[];
  settings: AppSettings;
  version: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SessionResponse {
  user: User;
}

export interface StateResponse {
  state: AppState;
  version: number;
}

export interface ConflictResponse {
  error: 'Version conflict';
  state: AppState;
}

// Generation Types
export interface GenerateRequest {
  mealType: 'dinner' | 'lunch' | 'breakfast';
  diners: string[]; // member IDs
  cuisine?: string;
  mainIngredient?: string;
  specialNotes?: string;
  maxTime?: number;
}

export interface GenerateBatchRequest {
  diners: string[]; // member IDs
}

export interface GenerateBatchResponse {
  recipes: Recipe[];
}

export interface GenerateResponse {
  recipe: Recipe;
}

// Meal Plan Generation Types
export interface GeneratePlanRequest {
  diners: string[];
  numberOfDays: number;
  targetDates: string[];
}

export interface GeneratePlanResponse {
  plan: Array<{ date: string; recipe: Recipe }>;
  sharedIngredients: string[];
}

// Drag and Drop Types
export type DragSource = 'recipe-list' | 'calendar';

export interface DragData {
  recipeId: string;
  source: DragSource;
  dayId?: string; // Only for calendar source
}

export interface DropData {
  type: 'calendar-day';
  dayId: string;
}

// Grocery List Types
export interface GroceryItem {
  name: string;
  totalAmount: number;
  unit: string;
  section: StoreSection;
  recipes: string[]; // Recipe names this item appears in
}

export interface GroceryList {
  items: GroceryItem[];
  selectedDays: string[];
}

// Toast Types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}
