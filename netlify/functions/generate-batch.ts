import type { Context } from '@netlify/functions';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  authenticateRequest,
  createAuthResponse,
  unauthorizedResponse,
} from './utils/auth';

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

const BatchResponseSchema = z.object({
  recipes: z.array(RecipeSchema),
});

interface GenerateBatchRequest {
  diners: string[];
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

function buildPrompt(diners: string[]): { prompt: string; dietary: ReturnType<typeof buildDietaryConstraints> } {
  const servings = diners.length;
  const dietary = buildDietaryConstraints(diners);
  const timestamp = Date.now();

  // Determine if we need protein variants
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

    prompt = `You are a creative meal planning assistant. Generate 10 DIVERSE dinner recipes with PROTEIN VARIANTS to accommodate both vegan and meat-eating diners.

${dietary.constraints}

PROTEIN VARIANTS REQUIRED:
- Vegan diners: ${veganNames.join(', ')}
- Meat-eating diners: ${meatNames.join(', ')}

Each recipe should have:
1. SHARED COMPONENTS (sharedIngredients, sharedSteps): Base that everyone eats
2. PROTEIN OPTIONS (proteinOptions): One vegan, one meat option

CRITICAL SHARED SAUCE RULE:
All shared sauces/marinades MUST be vegan-safe! No fish sauce, oyster sauce, or anchovy-based ingredients.

DIVERSITY REQUIREMENTS:
- Different base dishes: bowls, stir-fry, tacos, pasta, curries, etc.
- Different cuisines: Asian, Mediterranean, Latin American, Indian, etc.
- Varied cooking styles

${equipmentSection}

TIME CONSTRAINT: Each recipe <= 45 minutes

RESPONSE FORMAT:
{
  "recipes": [
    {
      "id": "batch-${timestamp}-1",
      "name": "Recipe Name",
      "description": "Appetizing description",
      "servings": ${servings},
      "totalTime": <max 45>,
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
          "name": "Grilled Chicken",
          "suitableFor": ${JSON.stringify(dietary.meatEaters)},
          "ingredients": [{"name": "chicken breast", "amount": 1, "unit": "lb", "section": "meat"}],
          "steps": [{"instruction": "Season and grill chicken", "duration": 12}],
          "dietaryInfo": {"isVegan": false, "isDairyFree": ${dietary.isDairyFree}, "isEggFree": ${dietary.isEggFree}}
        }
      ],
      "tags": ["cuisine", "style"],
      "dietaryInfo": {"isVegan": false, "isDairyFree": ${dietary.isDairyFree}, "isEggFree": ${dietary.isEggFree}, "hasCheese": false},
      "equipment": ["Rice Cooker", "Stovetop"],
      "suitableFor": ${JSON.stringify(diners)},
      "createdAt": "${new Date().toISOString()}"
    }
  ]
}

Generate exactly 10 recipes (batch-${timestamp}-1 through batch-${timestamp}-10).

CRITICAL:
- Each recipe has sharedIngredients/sharedSteps + proteinOptions (no top-level ingredients/steps)
- Each proteinOptions has exactly 2 items: vegan and meat
- Vegan option must have isVegan: true
- Meat option should feature delicious meat/fish/poultry
- Overall dietaryInfo.isVegan must be false
- Return ONLY JSON`;

  } else {
    // Standard mode - compatible dietary needs
    const dietaryReqs = dietary.isVegan
      ? '- FULLY VEGAN: No meat, poultry, fish, seafood, dairy, eggs, honey'
      : dietary.isDairyFree && dietary.isEggFree
      ? '- DAIRY-FREE & EGG-FREE'
      : dietary.isDairyFree
      ? '- DAIRY-FREE'
      : dietary.isEggFree
      ? '- EGG-FREE'
      : '- No restrictions';

    prompt = `You are a creative meal planning assistant. Generate 10 DIVERSE and INTERESTING dinner recipe ideas that meet ALL requirements below.

${dietary.constraints}

COMBINED DIETARY REQUIREMENTS:
${dietaryReqs}

DIVERSITY REQUIREMENTS (CRITICAL - each recipe must be distinctly different):
Generate recipes across these categories:
1. Different proteins: ${dietary.isVegan ? 'tofu, tempeh, chickpeas, lentils, seitan, black beans, edamame' : 'chicken, beef, pork, fish, shrimp, tofu, tempeh'}
2. Different cuisines: Asian, Mediterranean, Latin American, Indian, American comfort, African, Middle Eastern
3. Different cooking styles: stir-fry, baked, soup/stew, bowl/grain, pasta, wrap/taco, curry, salad-based

${equipmentSection}

TIME CONSTRAINT:
- Each recipe must be completable in 45 minutes or less

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "recipes": [
    {
      "id": "batch-${timestamp}-1",
      "name": "Recipe Name",
      "description": "A 1-2 sentence appetizing narrative description of the dish",
      "servings": ${servings},
      "totalTime": <number, max 45>,
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
  ]
}

Generate exactly 10 recipes with unique IDs (batch-${timestamp}-1 through batch-${timestamp}-10).

CRITICAL REQUIREMENTS:
- Exactly 10 recipes in the array
- Each recipe uses a DIFFERENT main protein
- At least 5 different cuisine styles across the 10 recipes
- All recipes are dinner-appropriate (not breakfast items)
- All dietaryInfo fields must match the requirements above
- totalTime must be <= 45 for each recipe
- The description should be an appetizing narrative, not a list
- Return ONLY the JSON object, no other text`;
  }

  return { prompt, dietary };
}

export default async function handler(request: Request, context: Context) {
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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return createAuthResponse(500, { error: 'OpenAI API key not configured' });
  }

  try {
    const body: GenerateBatchRequest = await request.json();
    const { diners } = body;
    console.log('[generate-batch] Request received, diners:', diners);

    if (!diners || diners.length === 0) {
      return createAuthResponse(400, { error: 'At least one diner required' });
    }

    const validDiners = diners.filter(id => id in HOUSEHOLD);
    if (validDiners.length === 0) {
      return createAuthResponse(400, { error: 'No valid diners selected' });
    }

    console.log('[generate-batch] Valid diners:', validDiners);
    const openai = new OpenAI({ apiKey });
    const { prompt, dietary } = buildPrompt(validDiners);

    let attempts = 0;
    const maxAttempts = 3;
    let lastError = '';

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[generate-batch] Attempt ${attempts}/${maxAttempts}`);

      try {
        console.log('[generate-batch] Calling OpenAI API...');
        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a creative meal planning assistant. Always respond with valid JSON only, no markdown. Generate diverse, appetizing recipes with detailed instructions.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 12000,
        });

        let content = response.choices[0]?.message?.content;
        console.log('[generate-batch] OpenAI response received, content length:', content?.length || 0);

        if (!content) {
          lastError = 'No content in response';
          console.log('[generate-batch] No content in response');
          continue;
        }

        // Strip markdown code blocks if present
        content = content.trim();
        if (content.startsWith('```json')) {
          content = content.slice(7);
        } else if (content.startsWith('```')) {
          content = content.slice(3);
        }
        if (content.endsWith('```')) {
          content = content.slice(0, -3);
        }
        content = content.trim();

        const parsed = JSON.parse(content);
        console.log('[generate-batch] JSON parsed, validating schema...');
        const validated = BatchResponseSchema.parse(parsed);
        console.log('[generate-batch] Schema validated, got', validated.recipes.length, 'recipes');

        // Validate we got 10 recipes
        if (validated.recipes.length !== 10) {
          lastError = `Expected 10 recipes, got ${validated.recipes.length}`;
          console.log('[generate-batch]', lastError);
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
          if (recipe.totalTime > 45) {
            lastError = `Recipe "${recipe.name}" exceeds 45 minute time limit`;
            dietaryValid = false;
            break;
          }
        }

        if (!dietaryValid) {
          continue;
        }

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
          JSON.stringify({ recipes: validated.recipes }),
          { status: 200, headers }
        );
      } catch (parseError) {
        console.log('[generate-batch] Caught error:', parseError);
        if (parseError instanceof z.ZodError) {
          lastError = `Validation error: ${parseError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
          console.log('[generate-batch] Zod validation error:', lastError);
        } else if (parseError instanceof SyntaxError) {
          lastError = `JSON parse error: ${parseError.message}`;
          console.log('[generate-batch] JSON parse error:', lastError);
        } else if (parseError instanceof Error) {
          lastError = `API error: ${parseError.message}`;
          console.error('[generate-batch] API error:', parseError.message, parseError.stack);
        } else {
          lastError = 'Unknown error occurred';
          console.log('[generate-batch] Unknown error:', parseError);
        }
      }
    }

    console.log('[generate-batch] All attempts failed, last error:', lastError);
    return createAuthResponse(500, {
      error: `Failed to generate recipes after ${maxAttempts} attempts: ${lastError}`,
    });
  } catch (error) {
    console.error('Generate batch error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createAuthResponse(500, { error: `Generation failed: ${errorMessage}` });
  }
}
