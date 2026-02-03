import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api, ApiError } from '../api/client';
import { useAuth } from './AuthContext';
import type { AppState, Recipe, DayPlan, Toast } from '../types';

interface AppContextValue {
  state: AppState;
  isLoading: boolean;
  toasts: Toast[];
  // Recipe actions
  addRecipe: (recipe: Recipe) => Promise<void>;
  removeRecipe: (recipeId: string) => Promise<void>;
  // Calendar actions
  assignRecipeToDay: (date: string, recipeId: string) => Promise<void>;
  clearDay: (date: string) => Promise<void>;
  swapRecipes: (date1: string, date2: string) => Promise<void>;
  // Toast actions
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
  // Sync
  refreshState: () => Promise<void>;
}

const defaultState: AppState = {
  recipes: [],
  calendar: [],
  version: 0,
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshState = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const { state: serverState } = await api.getState();
      setState(serverState);
    } catch (error) {
      console.error('Failed to fetch state:', error);
      addToast('Failed to sync state', 'error');
    }
  }, [isAuthenticated, addToast]);

  const saveStateOptimistic = useCallback(
    async (newState: AppState) => {
      const previousState = state;
      const currentVersion = state.version;

      // Optimistic update
      setState(newState);

      try {
        const { state: serverState } = await api.saveState(newState, currentVersion);
        setState(serverState);
      } catch (error) {
        // Rollback on error
        setState(previousState);

        if (error instanceof ApiError && error.status === 409) {
          // Version conflict
          const conflictData = error.data as { state: AppState };
          setState(conflictData.state);
          addToast('State was updated elsewhere. Refreshed with latest data.', 'warning');
        } else {
          addToast('Failed to save changes', 'error');
        }
      }
    },
    [state, addToast]
  );

  const addRecipe = useCallback(
    async (recipe: Recipe) => {
      const newState = {
        ...state,
        recipes: [...state.recipes, recipe],
      };
      await saveStateOptimistic(newState);
    },
    [state, saveStateOptimistic]
  );

  const removeRecipe = useCallback(
    async (recipeId: string) => {
      const newState = {
        ...state,
        recipes: state.recipes.filter((r) => r.id !== recipeId),
        calendar: state.calendar.map((day) =>
          day.recipeId === recipeId ? { ...day, recipeId: null } : day
        ),
      };
      await saveStateOptimistic(newState);
    },
    [state, saveStateOptimistic]
  );

  const assignRecipeToDay = useCallback(
    async (date: string, recipeId: string) => {
      const existingDayIndex = state.calendar.findIndex((d) => d.date === date);
      let newCalendar: DayPlan[];

      if (existingDayIndex >= 0) {
        newCalendar = state.calendar.map((day, i) =>
          i === existingDayIndex ? { ...day, recipeId } : day
        );
      } else {
        newCalendar = [...state.calendar, { date, recipeId }];
      }

      await saveStateOptimistic({ ...state, calendar: newCalendar });
    },
    [state, saveStateOptimistic]
  );

  const clearDay = useCallback(
    async (date: string) => {
      const newCalendar = state.calendar.map((day) =>
        day.date === date ? { ...day, recipeId: null } : day
      );
      await saveStateOptimistic({ ...state, calendar: newCalendar });
    },
    [state, saveStateOptimistic]
  );

  const swapRecipes = useCallback(
    async (date1: string, date2: string) => {
      const day1 = state.calendar.find((d) => d.date === date1);
      const day2 = state.calendar.find((d) => d.date === date2);

      const recipe1 = day1?.recipeId || null;
      const recipe2 = day2?.recipeId || null;

      let newCalendar = [...state.calendar];

      // Update or add day1
      const day1Index = newCalendar.findIndex((d) => d.date === date1);
      if (day1Index >= 0) {
        newCalendar[day1Index] = { date: date1, recipeId: recipe2 };
      } else {
        newCalendar.push({ date: date1, recipeId: recipe2 });
      }

      // Update or add day2
      const day2Index = newCalendar.findIndex((d) => d.date === date2);
      if (day2Index >= 0) {
        newCalendar[day2Index] = { date: date2, recipeId: recipe1 };
      } else {
        newCalendar.push({ date: date2, recipeId: recipe1 });
      }

      await saveStateOptimistic({ ...state, calendar: newCalendar });
    },
    [state, saveStateOptimistic]
  );

  // Fetch state on auth
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true);
      refreshState().finally(() => setIsLoading(false));
    } else {
      setState(defaultState);
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshState]);

  return (
    <AppContext.Provider
      value={{
        state,
        isLoading,
        toasts,
        addRecipe,
        removeRecipe,
        assignRecipeToDay,
        clearDay,
        swapRecipes,
        addToast,
        removeToast,
        refreshState,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}
