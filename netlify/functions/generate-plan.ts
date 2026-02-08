import type { Context } from '@netlify/functions';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  authenticateRequest,
  createAuthResponse,
  unauthorizedResponse,
} from './utils/auth';
import {
  OPENAI_CONFIG,
  validateApiKey,
  getRetryDelay,
  isRateLimitError,
  isRetryableError,
  sleep,
  getModel,
  getFallbackModel,
} from './config';

// Household members with dietary restrictions
const HOUSEHOLD = {
  shane: {
    name: 'Shane',
    restrictions: ['no-meat', 'no-fish', 'no-dairy', 'no-eggs', 'no-honey'],
    description: 'Vegan - no meat, fish, dairy, eggs, or honey'
  },
  lauren: {
    name: 'Lauren',
    restrictions: ['no-dairy'],
    description: 'Dairy-free - eats meat, fish, and eggs but NO dairy'
  },
  tucker: {
    name: 'Tucker',
    restrictions: [],
    description: 'No restrictions - eats everything'
  },
  brady: {
    name: 'Brady',
    restrictions: ['no-dairy', 'no-eggs'],
    description: 'Dairy-free and egg-free - eats meat and fish but NO dairy or eggs'
  }
};

const StoreSectionSchema = z.enum([
  'produce',
  'meat',
  'pantry',
  'dairy-free',
  'frozen',
  'bakery',
  'other',
]);
type StoreSection = z.infer<typeof StoreSectionSchema>;
const STORE_SECTIONS = new Set(StoreSectionSchema.options);

function normalizeSection(value: unknown): StoreSection {
  if (typeof value !== 'string') return 'other';
  const raw = value.trim().toLowerCase();
  if (STORE_SECTIONS.has(raw as StoreSection)) return raw as StoreSection;

  if (raw.includes('spice') || raw.includes('canned') || raw.includes('grain') || raw.includes('pasta')) {
    return 'pantry';
  }
  if (raw.includes('seafood') || raw.includes('fish')) {
    return 'meat';
  }
  if (raw.includes('dairy')) {
    return 'dairy-free';
  }
  if (raw.includes('produce') || raw.includes('veg') || raw.includes('vegetable')) {
    return 'produce';
  }
  if (raw.includes('bakery') || raw.includes('bread')) {
    return 'bakery';
  }
  if (raw.includes('frozen')) {
    return 'frozen';
  }

  return 'other';
}

function normalizeIngredients(list: unknown): void {
  if (!Array.isArray(list)) return;
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const ingredient = item as { section?: unknown };
    ingredient.section = normalizeSection(ingredient.section);
  }
}

function normalizeRecipeSections(parsed: unknown): void {
  if (!parsed || typeof parsed !== 'object') return;
  const root = parsed as { recipes?: unknown };
  if (!Array.isArray(root.recipes)) return;

  for (const recipe of root.recipes) {
    if (!recipe || typeof recipe !== 'object') continue;
    const r = recipe as {
      ingredients?: unknown;
      sharedIngredients?: unknown;
      proteinOptions?: unknown;
    };

    normalizeIngredients(r.ingredients);
    normalizeIngredients(r.sharedIngredients);

    if (Array.isArray(r.proteinOptions)) {
      for (const option of r.proteinOptions) {
        if (!option || typeof option !== 'object') continue;
        const opt = option as { ingredients?: unknown };
        normalizeIngredients(opt.ingredients);
      }
    }
  }
}

const IngredientSchema = z.object({
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
  section: StoreSectionSchema,
});

const RecipeStepSchema = z.object({
  instruction: z.string(),
  duration: z.number(),
  parallel: z.array(z.string()).optional(),
});

// Protein option schema for variant recipes
const ProteinOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  suitableFor: z.array(z.string()),
  ingredients: z.array(IngredientSchema),
  steps: z.array(RecipeStepSchema),
  dietaryInfo: z.object({
    isVegan: z.boolean(),
    isDairyFree: z.boolean(),
    isEggFree: z.boolean(),
  }),
});

const RecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  servings: z.number(),
  totalTime: z.number(),
  // Legacy fields (optional for new variant recipes)
  ingredients: z.array(IngredientSchema).optional(),
  steps: z.array(RecipeStepSchema).optional(),
  // New variant fields
  sharedIngredients: z.array(IngredientSchema).optional(),
  sharedSteps: z.array(RecipeStepSchema).optional(),
  proteinOptions: z.array(ProteinOptionSchema).optional(),
  tags: z.array(z.string()),
  dietaryInfo: z.object({
    isVegan: z.boolean(),
    isDairyFree: z.boolean(),
    isEggFree: z.boolean(),
    hasCheese: z.boolean(),
  }),
  equipment: z.array(z.string()),
  suitableFor: z.array(z.string()),
  createdAt: z.string(),
});

const MealPlanResponseSchema = z.object({
  recipes: z.array(RecipeSchema),
  sharedIngredients: z.array(z.string()),
});

interface GeneratePlanRequest {
  diners: string[];
  numberOfDays: number;
  targetDates: string[];
}

function buildDietaryConstraints(diners: string[]): {
  constraints: string;
  isVegan: boolean;
  isDairyFree: boolean;
  isEggFree: boolean;
  hasVeganDiner: boolean;
  hasMeatEater: boolean;
  veganDiners: string[];
  meatEaters: string[];
} {
  let isDairyFree = false;
  let isEggFree = false;

  const dinerDetails: string[] = [];
  const veganDiners: string[] = [];
  const meatEaters: string[] = [];

  for (const dinerId of diners) {
    const diner = HOUSEHOLD[dinerId as keyof typeof HOUSEHOLD];
    if (!diner) continue;

    dinerDetails.push(`- ${diner.name}: ${diner.description}`);

    if (diner.restrictions.includes('no-meat') && diner.restrictions.includes('no-fish')) {
      veganDiners.push(dinerId);
    } else {
      meatEaters.push(dinerId);
    }
    if (diner.restrictions.includes('no-dairy')) {
      isDairyFree = true;
    }
    if (diner.restrictions.includes('no-eggs')) {
      isEggFree = true;
    }
  }

  const hasVeganDiner = veganDiners.length > 0;
  const hasMeatEater = meatEaters.length > 0;
  const isVegan = hasVeganDiner && !hasMeatEater;

  if (isVegan) {
    isDairyFree = true;
    isEggFree = true;
  }

  let constraints = `DINERS AND THEIR DIETARY REQUIREMENTS:\n${dinerDetails.join('\n')}\n\n`;

  return { constraints, isVegan, isDairyFree, isEggFree, hasVeganDiner, hasMeatEater, veganDiners, meatEaters };
}

function buildPrompt(request: GeneratePlanRequest): { prompt: string; dietary: ReturnType<typeof buildDietaryConstraints> } {
  const { diners, numberOfDays, targetDates } = request;
  const servings = diners.length;
  const dietary = buildDietaryConstraints(diners);
  const timestamp = Date.now();

  const needsVariants = dietary.hasVeganDiner && dietary.hasMeatEater;

  const equipmentSection = `EQUIPMENT AVAILABLE (in order of preference):
1. **Breville Joule Oven** (PREFERRED) - Countertop convection oven
2. **Vitamix** - High-powered blender for sauces, soups
3. **Rice Cooker** - ALWAYS use for rice
4. **Stovetop** (gas burners) with wok, frying pans
5. **Microwave** - For quick tasks
6. **Wall Oven** (LEAST PREFERRED) - Only if necessary`;

  let prompt: string;

  if (needsVariants) {
    const veganNames = dietary.veganDiners.map(id => HOUSEHOLD[id as keyof typeof HOUSEHOLD]?.name).filter(Boolean);
    const meatNames = dietary.meatEaters.map(id => HOUSEHOLD[id as keyof typeof HOUSEHOLD]?.name).filter(Boolean);

    prompt = `You are a meal planning assistant. Generate a ${numberOfDays}-day meal plan with PROTEIN VARIANTS for mixed dietary needs.

${dietary.constraints}

PROTEIN VARIANTS REQUIRED:
- Vegan diners: ${veganNames.join(', ')}
- Meat-eating diners: ${meatNames.join(', ')}

Each recipe has shared components + protein options (one vegan, one meat).

CRITICAL SHARED SAUCE RULE:
All shared sauces/marinades MUST be vegan-safe! No fish sauce, oyster sauce, or anchovy-based ingredients.

VARIETY REQUIREMENTS:
- Different base dishes each day (bowls, stir-fry, tacos, pasta, etc.)
- Different cuisines (Asian, Mediterranean, Latin American, Indian, etc.)
- Different meat proteins (chicken, beef, pork, fish, shrimp)
- Different vegan proteins (tofu, tempeh, chickpeas, seitan)

INGREDIENT EFFICIENCY:
- 3-5 "hero ingredients" should appear in multiple recipes
- Fresh herbs in at least 2 recipes
- This reduces waste and shopping complexity

${equipmentSection}

TIME CONSTRAINT: Each recipe <= 40 minutes

DATES:
${targetDates.map((date, i) => `- Day ${i + 1}: ${date}`).join('\n')}

RESPONSE FORMAT:
{
  "recipes": [
    {
      "id": "plan-${timestamp}-day1",
      "name": "Recipe Name",
      "description": "Appetizing description",
      "servings": ${servings},
      "totalTime": <max 40>,
      "sharedIngredients": [
        {"name": "jasmine rice", "amount": 2, "unit": "cups", "section": "pantry"}
      ],
      "sharedSteps": [
        {"instruction": "Cook rice in rice cooker", "duration": 20}
      ],
      "proteinOptions": [
        {
          "id": "vegan",
          "name": "Crispy Tofu",
          "suitableFor": ${JSON.stringify(dietary.veganDiners)},
          "ingredients": [{"name": "extra-firm tofu", "amount": 14, "unit": "oz", "section": "dairy-free"}],
          "steps": [{"instruction": "Press and pan-fry tofu", "duration": 10}],
          "dietaryInfo": {"isVegan": true, "isDairyFree": true, "isEggFree": true}
        },
        {
          "id": "meat",
          "name": "Grilled Steak",
          "suitableFor": ${JSON.stringify(dietary.meatEaters)},
          "ingredients": [{"name": "flank steak", "amount": 1, "unit": "lb", "section": "meat"}],
          "steps": [{"instruction": "Season and grill steak", "duration": 12}],
          "dietaryInfo": {"isVegan": false, "isDairyFree": ${dietary.isDairyFree}, "isEggFree": ${dietary.isEggFree}}
        }
      ],
      "tags": ["cuisine", "style"],
      "dietaryInfo": {"isVegan": false, "isDairyFree": ${dietary.isDairyFree}, "isEggFree": ${dietary.isEggFree}, "hasCheese": false},
      "equipment": ["Rice Cooker", "Stovetop"],
      "suitableFor": ${JSON.stringify(diners)},
      "createdAt": "${new Date().toISOString()}"
    }
  ],
  "sharedIngredients": ["ingredients", "used", "in", "multiple", "recipes"]
}

Generate exactly ${numberOfDays} recipes (plan-${timestamp}-day1, etc.).

CRITICAL:
- Each recipe uses sharedIngredients/sharedSteps + proteinOptions format
- Each proteinOptions has vegan and meat options
- Vegan option must have isVegan: true
- Overall dietaryInfo.isVegan must be false
- Ingredient.section must be ONE OF: produce, meat, pantry, dairy-free, frozen, bakery, other (no other categories)
- Return ONLY JSON`;

  } else {
    const dietaryReqs = dietary.isVegan
      ? '- FULLY VEGAN: No meat, poultry, fish, seafood, dairy, eggs, honey'
      : dietary.isDairyFree && dietary.isEggFree
      ? '- DAIRY-FREE & EGG-FREE'
      : dietary.isDairyFree
      ? '- DAIRY-FREE'
      : dietary.isEggFree
      ? '- EGG-FREE'
      : '- No restrictions';

    const proteinList = dietary.isVegan
      ? 'Tofu, Tempeh, Chickpeas, Lentils, Seitan, Black beans, Edamame'
      : 'Chicken, Beef, Pork, Fish, Shrimp, Tofu, Tempeh';

    prompt = `You are a meal planning assistant for a family dinner app. Generate a ${numberOfDays}-day meal plan that meets ALL requirements below.

${dietary.constraints}

COMBINED DIETARY REQUIREMENTS:
${dietaryReqs}

PROTEIN ROTATION REQUIREMENT (CRITICAL):
Use a DIFFERENT main protein source each day. Choose from:
${proteinList}
DO NOT repeat the same protein on consecutive days.

CUISINE ROTATION REQUIREMENT:
Vary the cuisine style across the days. Rotate through:
- Asian (Thai, Chinese, Japanese, Korean, Vietnamese)
- Mediterranean (Italian, Greek, Middle Eastern)
- Latin American (Mexican, Tex-Mex, Cuban)
- Indian/South Asian
- American/Comfort food

INGREDIENT EFFICIENCY REQUIREMENT (CRITICAL):
- Select 3-5 "hero ingredients" that appear in MULTIPLE recipes across the plan
- Fresh herbs should appear in at least 2 recipes
- Example: Buy one bunch of cilantro for Thai noodles (Day 1) and Mexican bowls (Day 3)
- This reduces waste and shopping complexity

${equipmentSection}

TIME CONSTRAINT:
- Each recipe must be completable in 40 minutes or less

DATES FOR THE PLAN:
${targetDates.map((date, i) => `- Day ${i + 1}: ${date}`).join('\n')}

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "recipes": [
    {
      "id": "plan-${timestamp}-day1",
      "name": "Recipe Name",
      "description": "Brief appetizing description",
      "servings": ${servings},
      "totalTime": <number, max 40>,
      "ingredients": [
        {
          "name": "ingredient name",
          "amount": <number>,
          "unit": "cups/tbsp/etc",
          "section": "<produce|meat|pantry|dairy-free|frozen|bakery|other>"
        }
      ],
      "steps": [
        {
          "instruction": "Detailed step instruction",
          "duration": <minutes>
        }
      ],
      "tags": ["protein-type", "cuisine", "other-relevant-tags"],
      "dietaryInfo": {
        "isVegan": ${dietary.isVegan},
        "isDairyFree": ${dietary.isDairyFree},
        "isEggFree": ${dietary.isEggFree},
        "hasCheese": false
      },
      "equipment": ["equipment used"],
      "suitableFor": ${JSON.stringify(diners)},
      "createdAt": "${new Date().toISOString()}"
    }
    // ... one recipe per day
  ],
  "sharedIngredients": ["list", "of", "ingredients", "used", "in", "multiple", "recipes"]
}

Generate exactly ${numberOfDays} recipes, one for each day. Use unique IDs like "plan-${timestamp}-day1", "plan-${timestamp}-day2", etc.

CRITICAL REQUIREMENTS:
- Exactly ${numberOfDays} recipes in the array
- Different protein each day
- Different cuisine style each day
- At least 3 shared ingredients across the plan
- All dietaryInfo fields must match the requirements above
- totalTime must be <= 40 for each recipe
- Ingredient.section must be ONE OF: produce, meat, pantry, dairy-free, frozen, bakery, other (no other categories)
- Return ONLY the JSON object, no other text`;
  }

  return { prompt, dietary };
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    const name = error.name || 'Error';
    const message = error.message || '';
    const cause = (error as { cause?: unknown }).cause;
    const causeMsg = cause ? ` | cause=${formatError(cause)}` : '';
    return `${name}: ${message}${causeMsg}`.trim();
  }
  return String(error);
}

async function readJsonBody<T>(request: Request): Promise<{ ok: true; value: T } | { ok: false; error: string; bodySnippet?: string }> {
  let text = '';
  try {
    text = await request.text();
  } catch (err) {
    return { ok: false, error: `BODY_READ_ERR: ${formatError(err)}` };
  }
  if (!text) {
    return { ok: false, error: 'EMPTY_BODY' };
  }
  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch (err) {
    return {
      ok: false,
      error: `BAD_JSON: ${formatError(err)}`,
      bodySnippet: text.slice(0, 200),
    };
  }
}

async function handleRequest(request: Request, context: Context) {
  // DEBUG: Disabled - function confirmed working

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authResult = await authenticateRequest(request);
  if (!authResult.user) {
    return unauthorizedResponse();
  }

  const keyValidation = validateApiKey(process.env.OPENAI_API_KEY);
  if (!keyValidation.valid) {
    return createAuthResponse(500, { error: keyValidation.error });
  }
  const apiKey = keyValidation.trimmed;

  try {
    const bodyResult = await readJsonBody<GeneratePlanRequest>(request);
    if (!bodyResult.ok) {
      return createAuthResponse(400, {
        error: bodyResult.error,
        ...(bodyResult.bodySnippet ? { bodySnippet: bodyResult.bodySnippet } : {}),
      });
    }
    const body = bodyResult.value;
    const { diners, numberOfDays, targetDates } = body;

    if (!diners || diners.length === 0) {
      return createAuthResponse(400, { error: 'At least one diner required' });
    }

    if (!numberOfDays || numberOfDays < 1 || numberOfDays > 5) {
      return createAuthResponse(400, { error: 'numberOfDays must be between 1 and 5' });
    }

    if (!targetDates || targetDates.length !== numberOfDays) {
      return createAuthResponse(400, { error: 'targetDates must match numberOfDays' });
    }

    const validDiners = diners.filter(id => id in HOUSEHOLD);
    if (validDiners.length === 0) {
      return createAuthResponse(400, { error: 'No valid diners selected' });
    }

    const openai = new OpenAI({ apiKey });
    const { prompt, dietary } = buildPrompt({ ...body, diners: validDiners });

    let attempts = 0;
    const maxAttempts = OPENAI_CONFIG.retry.maxAttempts;
    let lastError = '';
    let currentModel = getModel();

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[generate-plan] Attempt ${attempts}/${maxAttempts} with model ${currentModel}`);

      let response;
      try {
        const completion = await openai.chat.completions.create({
          model: currentModel,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful meal planning assistant. Always respond with valid JSON only.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: OPENAI_CONFIG.temperature.mealPlan,
          max_completion_tokens: OPENAI_CONFIG.maxTokens.mealPlan,
        });
        response = { output_text: completion.choices[0]?.message?.content };
      } catch (apiError) {
        console.error('[generate-plan] API error:', apiError);

        // Handle retryable errors with exponential backoff
        if (isRetryableError(apiError)) {
          const isRateLimit = isRateLimitError(apiError);
          const delayMs = getRetryDelay(attempts, isRateLimit);
          console.log(`[generate-plan] Retryable error, waiting ${Math.round(delayMs)}ms before retry...`);
          await sleep(delayMs);

          // On last attempt with primary model, try fallback
          if (attempts === maxAttempts - 1 && currentModel === getModel()) {
            currentModel = getFallbackModel();
            console.log(`[generate-plan] Switching to fallback model: ${currentModel}`);
          }
          lastError = `API error: ${apiError instanceof Error ? apiError.message : String(apiError)}`;
          continue;
        }

        // Non-retryable error - fail immediately
        const err = apiError as Record<string, unknown>;
        const details = [
          err.status ? `status=${err.status}` : null,
          err.code ? `code=${err.code}` : null,
          err.type ? `type=${err.type}` : null,
          `msg=${String(err.message || apiError)}`,
        ].filter(Boolean).join(', ');
        return createAuthResponse(500, { error: `API_ERR: ${details}` });
      }

      const content = response.output_text;

      if (!content) {
        lastError = 'No content in response';
        continue;
      }

      try {
        const parsed = JSON.parse(content);
        normalizeRecipeSections(parsed);
        const validationResult = MealPlanResponseSchema.safeParse(parsed);

        if (!validationResult.success) {
          const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
          lastError = `Schema validation failed: ${errors}`;
          console.error('Validation errors:', JSON.stringify(validationResult.error.errors, null, 2));
          console.error('Raw response:', content.substring(0, 500));
          continue;
        }

        const validated = validationResult.data;

        // Validate we got the right number of recipes
        if (validated.recipes.length !== numberOfDays) {
          lastError = `Expected ${numberOfDays} recipes, got ${validated.recipes.length}`;
          continue;
        }

        // Validate dietary requirements for each recipe
        const needsVariants = dietary.hasVeganDiner && dietary.hasMeatEater;
        let dietaryValid = true;
        for (const recipe of validated.recipes) {
          const isVariantRecipe = recipe.proteinOptions && recipe.proteinOptions.length > 0;

          if (needsVariants) {
            // Variant recipe validation
            if (recipe.dietaryInfo.isVegan) {
              lastError = `Recipe "${recipe.name}" should not be marked fully vegan (has meat option)`;
              dietaryValid = false;
              break;
            }
            if (!isVariantRecipe || recipe.proteinOptions!.length < 2) {
              lastError = `Recipe "${recipe.name}" must have protein options`;
              dietaryValid = false;
              break;
            }
            const veganOption = recipe.proteinOptions!.find(o => o.id === 'vegan');
            if (!veganOption || !veganOption.dietaryInfo.isVegan) {
              lastError = `Recipe "${recipe.name}" must have a vegan protein option`;
              dietaryValid = false;
              break;
            }
          } else {
            // Standard recipe validation (only when NOT using variants)
            if (dietary.isVegan && !recipe.dietaryInfo.isVegan) {
              lastError = `Recipe "${recipe.name}" is not vegan`;
              dietaryValid = false;
              break;
            }
            if (dietary.isDairyFree && !recipe.dietaryInfo.isDairyFree) {
              lastError = `Recipe "${recipe.name}" is not dairy-free`;
              dietaryValid = false;
              break;
            }
            if (dietary.isEggFree && !recipe.dietaryInfo.isEggFree) {
              lastError = `Recipe "${recipe.name}" is not egg-free`;
              dietaryValid = false;
              break;
            }
            if (dietary.isDairyFree && recipe.dietaryInfo.hasCheese) {
              lastError = `Recipe "${recipe.name}" has cheese but dairy-free required`;
              dietaryValid = false;
              break;
            }
          }
          if (recipe.totalTime > 40) {
            lastError = `Recipe "${recipe.name}" exceeds 40 minute time limit`;
            dietaryValid = false;
            break;
          }
        }

        if (!dietaryValid) {
          continue;
        }

        // Build the response with date assignments
        const plan = validated.recipes.map((recipe, index) => ({
          date: targetDates[index],
          recipe,
        }));

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (authResult.shouldRefresh && authResult.newToken) {
          const isProduction = process.env.NODE_ENV === 'production';
          const cookieOptions = ['HttpOnly', 'Path=/', 'Max-Age=900', 'SameSite=Strict'];
          if (isProduction) cookieOptions.push('Secure');
          headers['Set-Cookie'] = `session=${authResult.newToken}; ${cookieOptions.join('; ')}`;
        }

        return new Response(
          JSON.stringify({
            plan,
            sharedIngredients: validated.sharedIngredients,
          }),
          { status: 200, headers }
        );
      } catch (parseError) {
        if (parseError instanceof z.ZodError) {
          lastError = `Validation error: ${parseError.errors.map(e => e.message).join(', ')}`;
        } else {
          lastError = 'Failed to parse response';
        }
      }
    }

    return createAuthResponse(500, {
      error: `Failed to generate valid meal plan after ${maxAttempts} attempts: ${lastError}`,
    });
  } catch (error) {
    console.error('Generate plan error:', error);
    let errorDetails = error instanceof Error ? error.message : String(error);
    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>;
      if (err.status) errorDetails += ` [status: ${err.status}]`;
      if (err.code) errorDetails += ` [code: ${err.code}]`;
      if (err.type) errorDetails += ` [type: ${err.type}]`;
    }
    return createAuthResponse(500, { error: `Generation failed: ${errorDetails}` });
  }
}

export default async function handler(request: Request, context: Context) {
  try {
    return await handleRequest(request, context);
  } catch (error) {
    console.error('Generate plan unhandled error:', error);
    return createAuthResponse(500, { error: `UNHANDLED: ${formatError(error)}` });
  }
}
