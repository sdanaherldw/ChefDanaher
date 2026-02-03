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

export interface Recipe {
  id: string;
  name: string;
  description: string;
  servings: number;
  totalTime: number; // in minutes
  ingredients: Ingredient[];
  steps: RecipeStep[];
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
}

// Calendar Types
export interface DayPlan {
  date: string; // ISO date string YYYY-MM-DD
  recipeId: string | null;
  groceriesPurchased?: boolean; // Mark if groceries for this day are already bought
}

// Application State
export interface AppState {
  recipes: Recipe[];
  calendar: DayPlan[];
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
