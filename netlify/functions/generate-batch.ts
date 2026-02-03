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

const RecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  servings: z.number(),
  totalTime: z.number(),
  ingredients: z.array(IngredientSchema),
  steps: z.array(RecipeStepSchema),
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

function buildDietaryConstraints(diners: string[]): { constraints: string; isVegan: boolean; isDairyFree: boolean; isEggFree: boolean } {
  let isVegan = false;
  let isDairyFree = false;
  let isEggFree = false;

  const dinerDetails: string[] = [];

  for (const dinerId of diners) {
    const diner = HOUSEHOLD[dinerId as keyof typeof HOUSEHOLD];
    if (!diner) continue;

    dinerDetails.push(`- ${diner.name}: ${diner.description}`);

    if (diner.restrictions.includes('no-meat') && diner.restrictions.includes('no-fish')) {
      isVegan = true;
    }
    if (diner.restrictions.includes('no-dairy')) {
      isDairyFree = true;
    }
    if (diner.restrictions.includes('no-eggs')) {
      isEggFree = true;
    }
  }

  if (isVegan) {
    isDairyFree = true;
    isEggFree = true;
  }

  let constraints = `DINERS AND THEIR DIETARY REQUIREMENTS:\n${dinerDetails.join('\n')}\n\n`;

  constraints += 'COMBINED DIETARY REQUIREMENTS (ALL recipes MUST satisfy ALL of these):\n';

  if (isVegan) {
    constraints += '- FULLY VEGAN: No meat, poultry, fish, seafood, dairy, eggs, honey, or any animal products\n';
  } else {
    if (isDairyFree) {
      constraints += '- DAIRY-FREE: No milk, cheese, butter, cream, yogurt, or any dairy products\n';
    }
    if (isEggFree) {
      constraints += '- EGG-FREE: No eggs or egg-based ingredients (mayo, some pastas, etc.)\n';
    }
    if (!isDairyFree && !isEggFree) {
      constraints += '- No dietary restrictions - all ingredients allowed\n';
    }
  }

  return { constraints, isVegan, isDairyFree, isEggFree };
}

function buildPrompt(diners: string[]): { prompt: string; dietary: ReturnType<typeof buildDietaryConstraints> } {
  const servings = diners.length;
  const dietary = buildDietaryConstraints(diners);
  const timestamp = Date.now();

  const prompt = `You are a creative meal planning assistant. Generate 10 DIVERSE and INTERESTING dinner recipe ideas that meet ALL requirements below.

${dietary.constraints}

DIVERSITY REQUIREMENTS (CRITICAL - each recipe must be distinctly different):
Generate recipes across these categories:
1. Different proteins: tofu, tempeh, chickpeas, lentils, seitan, black beans, edamame, Beyond meat
2. Different cuisines: Asian, Mediterranean, Latin American, Indian, American comfort, African, Middle Eastern
3. Different cooking styles: stir-fry, baked, soup/stew, bowl/grain, pasta, wrap/taco, curry, salad-based

EQUIPMENT AVAILABLE (in order of preference):
1. **Breville Joule Oven** (PREFERRED) - Countertop convection oven
2. **Vitamix** - High-powered blender for sauces, soups
3. **Rice Cooker** - ALWAYS use for rice
4. **Stovetop** (gas burners) with wok, frying pans
5. **Microwave** - For quick tasks
6. **Wall Oven** (LEAST PREFERRED) - Only if necessary

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

    if (!diners || diners.length === 0) {
      return createAuthResponse(400, { error: 'At least one diner required' });
    }

    const validDiners = diners.filter(id => id in HOUSEHOLD);
    if (validDiners.length === 0) {
      return createAuthResponse(400, { error: 'No valid diners selected' });
    }

    const openai = new OpenAI({ apiKey });
    const { prompt, dietary } = buildPrompt(validDiners);

    let attempts = 0;
    const maxAttempts = 3;
    let lastError = '';

    while (attempts < maxAttempts) {
      attempts++;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a creative meal planning assistant. Always respond with valid JSON only. Generate diverse, appetizing recipes with detailed instructions.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.9,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        lastError = 'No content in response';
        continue;
      }

      try {
        const parsed = JSON.parse(content);
        const validated = BatchResponseSchema.parse(parsed);

        // Validate we got 10 recipes
        if (validated.recipes.length !== 10) {
          lastError = `Expected 10 recipes, got ${validated.recipes.length}`;
          continue;
        }

        // Validate dietary requirements for each recipe
        let dietaryValid = true;
        for (const recipe of validated.recipes) {
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
        if (parseError instanceof z.ZodError) {
          lastError = `Validation error: ${parseError.errors.map(e => e.message).join(', ')}`;
        } else {
          lastError = 'Failed to parse response';
        }
      }
    }

    return createAuthResponse(500, {
      error: `Failed to generate recipes after ${maxAttempts} attempts: ${lastError}`,
    });
  } catch (error) {
    console.error('Generate batch error:', error);
    return createAuthResponse(500, { error: 'Internal server error' });
  }
}
