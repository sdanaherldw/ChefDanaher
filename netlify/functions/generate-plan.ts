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

const MealPlanResponseSchema = z.object({
  recipes: z.array(RecipeSchema),
  sharedIngredients: z.array(z.string()),
});

interface GeneratePlanRequest {
  diners: string[];
  numberOfDays: number;
  targetDates: string[];
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

function buildPrompt(request: GeneratePlanRequest): { prompt: string; dietary: ReturnType<typeof buildDietaryConstraints> } {
  const { diners, numberOfDays, targetDates } = request;
  const servings = diners.length;
  const dietary = buildDietaryConstraints(diners);
  const timestamp = Date.now();

  const prompt = `You are a meal planning assistant for a family dinner app. Generate a ${numberOfDays}-day meal plan that meets ALL requirements below.

${dietary.constraints}

PROTEIN ROTATION REQUIREMENT (CRITICAL):
Use a DIFFERENT main protein source each day. Choose from:
- Tofu
- Tempeh
- Chickpeas
- Lentils
- Seitan
- Black beans
- Edamame
- Beyond/Impossible meat
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

EQUIPMENT AVAILABLE (in order of preference):
1. **Breville Joule Oven** (PREFERRED) - Countertop convection oven
2. **Vitamix** - High-powered blender for sauces, soups
3. **Rice Cooker** - ALWAYS use for rice
4. **Stovetop** (gas burners) with wok, frying pans
5. **Microwave** - For quick tasks
6. **Wall Oven** (LEAST PREFERRED) - Only if necessary

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
    const body: GeneratePlanRequest = await request.json();
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
    const maxAttempts = 3;
    let lastError = '';

    while (attempts < maxAttempts) {
      attempts++;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful meal planning assistant. Always respond with valid JSON only. Generate detailed, specific instructions for each recipe.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        lastError = 'No content in response';
        continue;
      }

      try {
        const parsed = JSON.parse(content);
        const validated = MealPlanResponseSchema.parse(parsed);

        // Validate we got the right number of recipes
        if (validated.recipes.length !== numberOfDays) {
          lastError = `Expected ${numberOfDays} recipes, got ${validated.recipes.length}`;
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
    return createAuthResponse(500, { error: 'Internal server error' });
  }
}
