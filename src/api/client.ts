import type {
  SessionResponse,
  StateResponse,
  GenerateRequest,
  GenerateResponse,
  GeneratePlanRequest,
  GeneratePlanResponse,
  AppState,
  User,
} from '../types';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Trigger logout on 401
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new ApiError('Unauthorized', 401);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.error || 'Request failed',
      response.status,
      data
    );
  }

  return data as T;
}

export const api = {
  // Auth endpoints
  async login(username: string, password: string): Promise<{ user: User }> {
    return fetchWithAuth('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async logout(): Promise<{ success: boolean }> {
    return fetchWithAuth('/logout', {
      method: 'POST',
    });
  },

  async getSession(): Promise<SessionResponse> {
    return fetchWithAuth('/session');
  },

  // State endpoints
  async getState(): Promise<StateResponse> {
    return fetchWithAuth('/state');
  },

  async saveState(state: AppState, version: number): Promise<StateResponse> {
    return fetchWithAuth('/state', {
      method: 'PUT',
      body: JSON.stringify({ state, version }),
    });
  },

  // Recipe generation
  async generateRecipe(request: GenerateRequest): Promise<GenerateResponse> {
    return fetchWithAuth('/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // Meal plan generation
  async generateMealPlan(request: GeneratePlanRequest): Promise<GeneratePlanResponse> {
    return fetchWithAuth('/generate-plan', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};

export { ApiError };
