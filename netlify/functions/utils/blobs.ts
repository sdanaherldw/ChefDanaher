import { getStore } from '@netlify/blobs';

export interface AppSettings {
  recipeDecayDays: number;
  suggestedRecipeDecayDays: number;
}

export interface AppState {
  recipes: unknown[];
  calendar: unknown[];
  settings: AppSettings;
  version: number;
}

const STORE_NAME = 'chefdanaher-state';

function getStateKey(): string {
  return process.env.STATE_BLOB_KEY || 'state.json';
}

export async function getState(): Promise<AppState> {
  const store = getStore(STORE_NAME);
  const key = getStateKey();

  try {
    const data = await store.get(key, { type: 'json' });
    if (data) {
      return data as AppState;
    }
  } catch (error) {
    console.error('Error reading state from blob:', error);
  }

  // Return default state if not found
  return {
    recipes: [],
    calendar: [],
    settings: {
      recipeDecayDays: 60,
      suggestedRecipeDecayDays: 30,
    },
    version: 0,
  };
}

export async function saveState(state: AppState): Promise<void> {
  const store = getStore(STORE_NAME);
  const key = getStateKey();

  await store.setJSON(key, state);
}

export async function checkVersionAndSave(
  newState: AppState,
  expectedVersion: number
): Promise<{ success: boolean; state: AppState }> {
  const currentState = await getState();

  if (currentState.version !== expectedVersion) {
    return { success: false, state: currentState };
  }

  const updatedState = {
    ...newState,
    version: expectedVersion + 1,
  };

  await saveState(updatedState);
  return { success: true, state: updatedState };
}
