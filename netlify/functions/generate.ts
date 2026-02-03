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

interface GenerateRequest {
  mealType: 'dinner' | 'lunch' | 'breakfast';
  diners: string[];
  cuisine?: string;
  mainIngredient?: string;
  specialNotes?: string;
  maxTime?: number;
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
  // Only fully vegan if ALL diners are vegan (no meat eaters)
  const isVegan = hasVeganDiner && !hasMeatEater;

  // If fully vegan, it implies dairy-free and egg-free
  if (isVegan) {
    isDairyFree = true;
    isEggFree = true;
  }

  let constraints = `DINERS AND THEIR DIETARY REQUIREMENTS:\n${dinerDetails.join('\n')}\n\n`;

  return { constraints, isVegan, isDairyFree, isEggFree, hasVeganDiner, hasMeatEater, veganDiners, meatEaters };
}

function buildPrompt(request: GenerateRequest): { prompt: string; dietary: ReturnType<typeof buildDietaryConstraints> } {
  const maxTime = request.maxTime || 40;
  const servings = request.diners.length;
  const dietary = buildDietaryConstraints(request.diners);
  const timestamp = Date.now();

  // Determine if we need protein variants (mixed dietary needs)
  const needsVariants = dietary.hasVeganDiner && dietary.hasMeatEater;

  const equipmentSection = `EQUIPMENT AVAILABLE (in order of preference - use higher-preference items when possible):
1. **Breville Joule Oven** (PREFERRED) - Countertop convection oven with precise temperature control. Use this for roasting, baking, sheet pan meals.
2. **Vitamix** - High-powered blender for sauces, soups, smoothies, dressings.
3. **Rice Cooker** - ALWAYS use this for rice. Never cook rice on the stovetop.
4. **Stovetop** (gas burners) with:
   - Large non-stick frying pan (Teflon-style)
   - Medium frying pan
   - Small Japanese carbon steel pan
   - Japanese carbon steel wok (great for stir-fry)
   - Stainless steel pasta pot
5. **Microwave** - Good for quick tasks like steaming sweet potatoes, reheating, softening vegetables.
6. **Wall Oven** (LEAST PREFERRED) - Only use if the Joule can't handle the job (e.g., very large items).`;

  const requestDetails = `REQUEST DETAILS:
- Meal type: ${request.mealType}
${request.cuisine ? `- Cuisine style: ${request.cuisine}` : ''}
${request.mainIngredient ? `- Feature this ingredient: ${request.mainIngredient}` : ''}
${request.specialNotes ? `- Special notes: ${request.specialNotes}` : ''}
- Servings: ${servings} (cooking for: ${request.diners.map(id => HOUSEHOLD[id as keyof typeof HOUSEHOLD]?.name).filter(Boolean).join(', ')})`;

  let prompt: string;

  if (needsVariants) {
    // PROTEIN VARIANTS MODE - mixed vegan and meat eaters
    const veganNames = dietary.veganDiners.map(id => HOUSEHOLD[id as keyof typeof HOUSEHOLD]?.name).filter(Boolean);
    const meatNames = dietary.meatEaters.map(id => HOUSEHOLD[id as keyof typeof HOUSEHOLD]?.name).filter(Boolean);

    prompt = `You are a recipe generator for a family dinner planning app. Generate a recipe with PROTEIN VARIANTS to accommodate both vegan and meat-eating diners.

${dietary.constraints}

PROTEIN VARIANTS REQUIRED:
This meal has diners with different dietary needs:
- Vegan diners: ${veganNames.join(', ')} (need plant-based protein)
- Meat-eating diners: ${meatNames.join(', ')} (can have animal protein)

Generate ONE recipe with:
1. SHARED COMPONENTS (sharedIngredients, sharedSteps): Rice, vegetables, sauces, garnishes that EVERYONE eats
2. PROTEIN OPTIONS (proteinOptions): Different protein preparations for different diners

CRITICAL SHARED SAUCE RULE:
All shared sauces, marinades, and dressings MUST be vegan-safe since the vegan diners will eat them!
- Use vegan gochujang (no fish sauce)
- Use vegan Worcestershire or substitute
- No fish sauce, oyster sauce, or anchovy-based ingredients in shared components
- Shared components must be: dairy-free=${dietary.isDairyFree}, egg-free=${dietary.isEggFree}

${equipmentSection}

TIME CONSTRAINT:
- Maximum total time: ${maxTime} minutes (from start to food on table)
- Include parallel steps where possible to optimize time

${requestDetails}

RESPONSE FORMAT:
Return a JSON object matching this exact structure:
{
  "id": "recipe-${timestamp}",
  "name": "Recipe Name",
  "description": "Brief appetizing description",
  "servings": ${servings},
  "totalTime": <number in minutes, must be <= ${maxTime}>,
  "sharedIngredients": [
    {
      "name": "ingredient name (rice, vegetables, vegan sauce, etc.)",
      "amount": <number>,
      "unit": "unit (cups, tbsp, etc.)",
      "section": "<one of: produce, meat, pantry, dairy-free, frozen, bakery, other>"
    }
  ],
  "sharedSteps": [
    {
      "instruction": "Step for shared components (cooking rice, making sauce, etc.)",
      "duration": <minutes>
    }
  ],
  "proteinOptions": [
    {
      "id": "vegan",
      "name": "Crispy Glazed Tofu",
      "suitableFor": ${JSON.stringify(dietary.veganDiners)},
      "ingredients": [
        {"name": "extra-firm tofu", "amount": 14, "unit": "oz", "section": "dairy-free"}
      ],
      "steps": [
        {"instruction": "Press and cube tofu, then pan-fry until golden", "duration": 10}
      ],
      "dietaryInfo": {"isVegan": true, "isDairyFree": true, "isEggFree": true}
    },
    {
      "id": "meat",
      "name": "Grilled Steak Strips",
      "suitableFor": ${JSON.stringify(dietary.meatEaters)},
      "ingredients": [
        {"name": "flank steak", "amount": 1, "unit": "lb", "section": "meat"}
      ],
      "steps": [
        {"instruction": "Slice and grill steak to desired doneness", "duration": 8}
      ],
      "dietaryInfo": {"isVegan": false, "isDairyFree": ${dietary.isDairyFree}, "isEggFree": ${dietary.isEggFree}}
    }
  ],
  "tags": ["relevant", "tags", "for", "filtering"],
  "dietaryInfo": {
    "isVegan": false,
    "isDairyFree": ${dietary.isDairyFree},
    "isEggFree": ${dietary.isEggFree},
    "hasCheese": false
  },
  "equipment": ["list of equipment used"],
  "suitableFor": ${JSON.stringify(request.diners)},
  "createdAt": "${new Date().toISOString()}"
}

CRITICAL REQUIREMENTS:
- sharedIngredients and sharedSteps are the base everyone eats (MUST be vegan-safe for sauces!)
- proteinOptions array has exactly 2 options: one "vegan" and one "meat"
- The vegan option must have isVegan: true
- The meat option should feature a delicious meat/fish/poultry protein
- dietaryInfo.isVegan for the overall recipe MUST be false (since meat option exists)
- dietaryInfo.isDairyFree MUST be ${dietary.isDairyFree}
- dietaryInfo.isEggFree MUST be ${dietary.isEggFree}
- dietaryInfo.hasCheese MUST be false
- totalTime MUST be <= ${maxTime}
- Return ONLY the JSON object, no other text`;

  } else {
    // STANDARD MODE - everyone has compatible dietary needs (all vegan OR no vegans)
    prompt = `You are a recipe generator for a family dinner planning app. Generate a recipe that meets ALL requirements below.

${dietary.constraints}

COMBINED DIETARY REQUIREMENTS (recipe MUST satisfy ALL of these):
${dietary.isVegan ? '- FULLY VEGAN: No meat, poultry, fish, seafood, dairy, eggs, honey, or any animal products' : ''}
${!dietary.isVegan && dietary.isDairyFree ? '- DAIRY-FREE: No milk, cheese, butter, cream, yogurt, or any dairy products' : ''}
${!dietary.isVegan && dietary.isEggFree ? '- EGG-FREE: No eggs or egg-based ingredients (mayo, some pastas, etc.)' : ''}
${!dietary.isVegan && !dietary.isDairyFree && !dietary.isEggFree ? '- No dietary restrictions - all ingredients allowed' : ''}

${equipmentSection}

TIME CONSTRAINT:
- Maximum total time: ${maxTime} minutes (from start to food on table)
- Include parallel steps where possible to optimize time

${requestDetails}

RESPONSE FORMAT:
Return a JSON object matching this exact structure:
{
  "id": "recipe-${timestamp}",
  "name": "Recipe Name",
  "description": "Brief appetizing description",
  "servings": ${servings},
  "totalTime": <number in minutes, must be <= ${maxTime}>,
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": <number>,
      "unit": "unit (cups, tbsp, etc.)",
      "section": "<one of: produce, meat, pantry, dairy-free, frozen, bakery, other>"
    }
  ],
  "steps": [
    {
      "instruction": "Detailed step instruction - specific enough that someone can follow without questions",
      "duration": <minutes for this step>
    }
  ],
  "tags": ["relevant", "tags", "for", "filtering"],
  "dietaryInfo": {
    "isVegan": ${dietary.isVegan},
    "isDairyFree": ${dietary.isDairyFree},
    "isEggFree": ${dietary.isEggFree},
    "hasCheese": false
  },
  "equipment": ["list of equipment used from the available equipment"],
  "suitableFor": ${JSON.stringify(request.diners)},
  "createdAt": "${new Date().toISOString()}"
}

CRITICAL REQUIREMENTS:
- dietaryInfo.isVegan MUST be ${dietary.isVegan}
- dietaryInfo.isDairyFree MUST be ${dietary.isDairyFree}
- dietaryInfo.isEggFree MUST be ${dietary.isEggFree}
- dietaryInfo.hasCheese MUST be false${dietary.isDairyFree ? ' (dairy-free requirement)' : ''}
- totalTime MUST be <= ${maxTime}
- Steps must be detailed enough that someone can follow without asking questions
- Prefer Joule Oven over wall oven
- ALWAYS use rice cooker for rice
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

  // Authenticate
  const authResult = await authenticateRequest(request);
  if (!authResult.user) {
    return unauthorizedResponse();
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return createAuthResponse(500, { error: 'OpenAI API key not configured' });
  }

  try {
    const body: GenerateRequest = await request.json();
    const { mealType, diners, cuisine, mainIngredient, maxTime } = body;

    if (!mealType || !diners || diners.length === 0) {
      return createAuthResponse(400, { error: 'mealType and at least one diner required' });
    }

    // Validate diners
    const validDiners = diners.filter(id => id in HOUSEHOLD);
    if (validDiners.length === 0) {
      return createAuthResponse(400, { error: 'No valid diners selected' });
    }

    const openai = new OpenAI({ apiKey });
    const { prompt, dietary } = buildPrompt({ ...body, diners: validDiners });

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: string = '';

    while (attempts < maxAttempts) {
      attempts++;

      const completion = await openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful recipe generator. Always respond with valid JSON only. Generate detailed, specific instructions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        lastError = 'No content in response';
        continue;
      }

      try {
        const parsed = JSON.parse(content);
        const validated = RecipeSchema.parse(parsed);

        // Determine if this is a variant recipe
        const isVariantRecipe = validated.proteinOptions && validated.proteinOptions.length > 0;
        const needsVariants = dietary.hasVeganDiner && dietary.hasMeatEater;

        // Validate dietary requirements match what we requested
        if (needsVariants) {
          // For variant recipes, overall isVegan should be false (we have meat option)
          if (validated.dietaryInfo.isVegan) {
            lastError = 'Variant recipe should not be marked as fully vegan';
            continue;
          }
          // Validate we have protein options
          if (!isVariantRecipe || validated.proteinOptions!.length < 2) {
            lastError = 'Variant recipe must have at least 2 protein options';
            continue;
          }
          // Validate vegan option exists and is actually vegan
          const veganOption = validated.proteinOptions!.find(o => o.id === 'vegan');
          if (!veganOption || !veganOption.dietaryInfo.isVegan) {
            lastError = 'Variant recipe must have a vegan protein option marked as vegan';
            continue;
          }
        } else {
          // Standard recipe validation (only when NOT using variants)
          if (dietary.isVegan && !validated.dietaryInfo.isVegan) {
            lastError = 'Recipe is not vegan but vegan was required';
            continue;
          }

          if (dietary.isDairyFree && !validated.dietaryInfo.isDairyFree) {
            lastError = 'Recipe is not dairy-free but dairy-free was required';
            continue;
          }

          if (dietary.isEggFree && !validated.dietaryInfo.isEggFree) {
            lastError = 'Recipe is not egg-free but egg-free was required';
            continue;
          }

          if (dietary.isDairyFree && validated.dietaryInfo.hasCheese) {
            lastError = 'Recipe has cheese but dairy-free was required';
            continue;
          }
        }

        if (validated.totalTime > (maxTime || 40)) {
          lastError = `Recipe time ${validated.totalTime} exceeds maximum ${maxTime || 40}`;
          continue;
        }

        // Success!
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Handle token refresh
        if (authResult.shouldRefresh && authResult.newToken) {
          const isProduction = process.env.NODE_ENV === 'production';
          const cookieOptions = ['HttpOnly', 'Path=/', 'Max-Age=900', 'SameSite=Strict'];
          if (isProduction) cookieOptions.push('Secure');
          headers['Set-Cookie'] = `session=${authResult.newToken}; ${cookieOptions.join('; ')}`;
        }

        return new Response(
          JSON.stringify({ recipe: validated }),
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
      error: `Failed to generate valid recipe after ${maxAttempts} attempts: ${lastError}`,
    });
  } catch (error) {
    console.error('Generate error:', error);
    return createAuthResponse(500, { error: 'Internal server error' });
  }
}
