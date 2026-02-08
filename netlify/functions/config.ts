/**
 * Centralized OpenAI configuration for all Netlify functions
 * Change model settings here - all functions will use these values
 */

export const OPENAI_CONFIG = {
  // PRIMARY MODEL - Change this ONE place to switch all functions
  models: {
    primary: 'gpt-4o',           // Most capable, fast model
    fallback: 'gpt-4-turbo',     // Fallback - reliable
  },

  // Token limits by function type
  maxTokens: {
    singleRecipe: 4000,
    batchRecipe: 16000,          // 5 recipes need more tokens
    mealPlan: 8000,
  },

  // Temperature settings
  temperature: {
    singleRecipe: 0.7,
    batchRecipe: 0.8,            // More creative for variety
    mealPlan: 0.7,
  },

  // RETRY CONFIGURATION (Exponential Backoff)
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1000,           // 1 second base
    maxDelayMs: 10000,           // 10 second cap
    rateLimitDelayMs: 60000,     // 60 seconds for 429 errors
  },
};

/**
 * Calculate retry delay with exponential backoff and jitter
 * @param attempt - Current attempt number (1-indexed)
 * @param isRateLimit - Whether this is a rate limit error (429)
 * @returns Delay in milliseconds
 */
export function getRetryDelay(attempt: number, isRateLimit: boolean): number {
  if (isRateLimit) {
    return OPENAI_CONFIG.retry.rateLimitDelayMs;
  }

  // Exponential backoff: 1s -> 2s -> 4s -> 8s (capped at maxDelayMs)
  const delay = Math.min(
    OPENAI_CONFIG.retry.baseDelayMs * Math.pow(2, attempt - 1),
    OPENAI_CONFIG.retry.maxDelayMs
  );

  // Add jitter (±25%) to prevent thundering herd
  return delay * (0.75 + Math.random() * 0.5);
}

/**
 * Validate OpenAI API key format
 * @param key - The API key to validate
 * @returns Validation result with trimmed key
 */
export function validateApiKey(key: string | undefined): {
  valid: boolean;
  error?: string;
  trimmed: string;
} {
  if (!key) {
    return { valid: false, error: 'OpenAI API key not configured', trimmed: '' };
  }

  const trimmed = key.trim();

  if (!trimmed) {
    return { valid: false, error: 'OpenAI API key is empty/whitespace', trimmed: '' };
  }

  if (!trimmed.startsWith('sk-')) {
    return { valid: false, error: 'OpenAI API key must start with sk-', trimmed };
  }

  if (trimmed.length < 40) {
    return { valid: false, error: 'OpenAI API key appears too short', trimmed };
  }

  return { valid: true, trimmed };
}

/**
 * Check if an error is a rate limit error (429)
 * @param error - The error to check
 * @returns True if this is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { status?: number; code?: string; type?: string };

  return (
    err.status === 429 ||
    err.code === 'rate_limit_exceeded' ||
    err.type === 'rate_limit_error'
  );
}

/**
 * Check if an error is retryable (transient)
 * @param error - The error to check
 * @returns True if the request should be retried
 */
export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { status?: number; code?: string };

  // Rate limit - retryable with long delay
  if (isRateLimitError(error)) {
    return true;
  }

  // Server errors (5xx) - retryable
  if (err.status && err.status >= 500 && err.status < 600) {
    return true;
  }

  // Timeout errors
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
    return true;
  }

  return false;
}

/**
 * Sleep for a specified duration
 * @param ms - Duration in milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get model from environment variable or config
 * Allows runtime override via OPENAI_MODEL env var
 */
export function getModel(): string {
  return process.env.OPENAI_MODEL || OPENAI_CONFIG.models.primary;
}

/**
 * Get fallback model from config
 */
export function getFallbackModel(): string {
  return OPENAI_CONFIG.models.fallback;
}
