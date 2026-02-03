import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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
  toggleGroceriesPurchased: (date: string) => Promise<void>;
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

  // Use a ref to track if a save is in progress to prevent race conditions
  const saveInProgressRef = useRef(false);
  const pendingOperationsRef = useRef<Array<(currentState: AppState) => AppState>>([]);

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

  // Core save function that handles conflicts with retry
  const saveWithRetry = useCallback(
    async (
      operation: (currentState: AppState) => AppState,
      maxRetries: number = 3
    ): Promise<boolean> => {
      // If a save is already in progress, queue this operation
      if (saveInProgressRef.current) {
        pendingOperationsRef.current.push(operation);
        return true; // Will be processed when current save completes
      }

      saveInProgressRef.current = true;
      let retries = 0;
      let currentState = state;

      try {
        while (retries < maxRetries) {
          // Apply the operation to get new state
          const newState = operation(currentState);

          // Optimistic update
          setState(newState);

          try {
            const { state: serverState } = await api.saveState(newState, currentState.version);
            setState(serverState);
            currentState = serverState;

            // Process any pending operations
            while (pendingOperationsRef.current.length > 0) {
              const pendingOp = pendingOperationsRef.current.shift()!;
              const pendingNewState = pendingOp(currentState);
              setState(pendingNewState);

              try {
                const { state: pendingServerState } = await api.saveState(pendingNewState, currentState.version);
                setState(pendingServerState);
                currentState = pendingServerState;
              } catch (pendingError) {
                if (pendingError instanceof ApiError && pendingError.status === 409) {
                  // Conflict on pending op - refresh and requeue
                  const conflictData = pendingError.data as { state: AppState };
                  currentState = conflictData.state;
                  setState(currentState);
                  pendingOperationsRef.current.unshift(pendingOp);
                } else {
                  throw pendingError;
                }
              }
            }

            return true;
          } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
              // Version conflict - get latest state and retry
              const conflictData = error.data as { state: AppState };
              currentState = conflictData.state;
              setState(currentState);
              retries++;

              if (retries < maxRetries) {
                // Small delay before retry
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            } else {
              throw error;
            }
          }
        }

        // Max retries exceeded
        addToast('Failed to save after multiple attempts. Please refresh.', 'error');
        return false;
      } finally {
        saveInProgressRef.current = false;
      }
    },
    [state, addToast]
  );

  const addRecipe = useCallback(
    async (recipe: Recipe) => {
      await saveWithRetry((currentState) => ({
        ...currentState,
        recipes: [...currentState.recipes, recipe],
      }));
    },
    [saveWithRetry]
  );

  const removeRecipe = useCallback(
    async (recipeId: string) => {
      await saveWithRetry((currentState) => ({
        ...currentState,
        recipes: currentState.recipes.filter((r) => r.id !== recipeId),
        calendar: currentState.calendar.map((day) =>
          day.recipeId === recipeId ? { ...day, recipeId: null } : day
        ),
      }));
    },
    [saveWithRetry]
  );

  const assignRecipeToDay = useCallback(
    async (date: string, recipeId: string) => {
      await saveWithRetry((currentState) => {
        const existingDayIndex = currentState.calendar.findIndex((d) => d.date === date);
        let newCalendar: DayPlan[];

        if (existingDayIndex >= 0) {
          newCalendar = currentState.calendar.map((day, i) =>
            i === existingDayIndex ? { ...day, recipeId } : day
          );
        } else {
          newCalendar = [...currentState.calendar, { date, recipeId }];
        }

        return { ...currentState, calendar: newCalendar };
      });
    },
    [saveWithRetry]
  );

  const clearDay = useCallback(
    async (date: string) => {
      await saveWithRetry((currentState) => ({
        ...currentState,
        calendar: currentState.calendar.map((day) =>
          day.date === date ? { ...day, recipeId: null } : day
        ),
      }));
    },
    [saveWithRetry]
  );

  const swapRecipes = useCallback(
    async (date1: string, date2: string) => {
      await saveWithRetry((currentState) => {
        const day1 = currentState.calendar.find((d) => d.date === date1);
        const day2 = currentState.calendar.find((d) => d.date === date2);

        const recipe1 = day1?.recipeId || null;
        const recipe2 = day2?.recipeId || null;

        let newCalendar = [...currentState.calendar];

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

        return { ...currentState, calendar: newCalendar };
      });
    },
    [saveWithRetry]
  );

  const toggleGroceriesPurchased = useCallback(
    async (date: string) => {
      await saveWithRetry((currentState) => {
        const existingDayIndex = currentState.calendar.findIndex((d) => d.date === date);

        if (existingDayIndex >= 0) {
          const day = currentState.calendar[existingDayIndex];
          const newCalendar = [...currentState.calendar];
          newCalendar[existingDayIndex] = {
            ...day,
            groceriesPurchased: !day.groceriesPurchased,
          };
          return { ...currentState, calendar: newCalendar };
        } else {
          // Create day entry with groceriesPurchased = true
          return {
            ...currentState,
            calendar: [...currentState.calendar, { date, recipeId: null, groceriesPurchased: true }],
          };
        }
      });
    },
    [saveWithRetry]
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
        toggleGroceriesPurchased,
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
