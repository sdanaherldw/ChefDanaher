// User and Authentication
export interface User {
  username: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

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
    hasCheese: boolean;
  };
  equipment: string[];
  createdAt: string;
}

// Calendar Types
export interface DayPlan {
  date: string; // ISO date string YYYY-MM-DD
  recipeId: string | null;
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
  cuisine?: string;
  mainIngredient?: string;
  servings: number;
  maxTime?: number;
}

export interface GenerateResponse {
  recipe: Recipe;
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
