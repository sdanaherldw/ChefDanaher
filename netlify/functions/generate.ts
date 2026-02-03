import type { Context } from '@netlify/functions';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  authenticateRequest,
  createAuthResponse,
  unauthorizedResponse,
} from './utils/auth';

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
    hasCheese: z.boolean(),
  }),
  equipment: z.array(z.string()),
  createdAt: z.string(),
});

interface GenerateRequest {
  mealType: 'dinner' | 'lunch' | 'breakfast';
  cuisine?: string;
  mainIngredient?: string;
  servings: number;
  maxTime?: number;
}

function buildPrompt(request: GenerateRequest): string {
  const maxTime = request.maxTime || 40;

  return `You are a recipe generator for a family dinner planning app. Generate a recipe that meets ALL of the following constraints:

DIETARY REQUIREMENTS (MANDATORY):
- Shane: STRICTLY VEGAN (no meat, dairy, eggs, honey, or any animal products)
- Lauren: Dairy-free (no milk, cheese, butter, cream, or dairy products)
- Tucker: Can have cheese, but the recipe must work for Shane and Lauren too

This means the recipe MUST be fully vegan. No exceptions.

EQUIPMENT AVAILABLE:
- Joule oven (countertop convection oven with precise temperature control)
- Vitamix blender
- Stovetop (gas burners)
- Standard kitchen tools (knives, pans, pots, etc.)

TIME CONSTRAINT:
- Maximum total time: ${maxTime} minutes (from start to food on table)
- Include parallel steps where possible to optimize time

REQUEST DETAILS:
- Meal type: ${request.mealType}
${request.cuisine ? `- Cuisine style: ${request.cuisine}` : ''}
${request.mainIngredient ? `- Feature this ingredient: ${request.mainIngredient}` : ''}
- Servings: ${request.servings}

RESPONSE FORMAT:
Return a JSON object matching this exact structure:
{
  "id": "unique-id-string",
  "name": "Recipe Name",
  "description": "Brief appetizing description",
  "servings": ${request.servings},
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
      "instruction": "Clear step instruction",
      "duration": <minutes for this step>,
      "parallel": ["step-ids that can run simultaneously"] // optional
    }
  ],
  "tags": ["vegan", "dairy-free", ...relevant tags],
  "dietaryInfo": {
    "isVegan": true,
    "isDairyFree": true,
    "hasCheese": false
  },
  "equipment": ["list of equipment used"],
  "createdAt": "${new Date().toISOString()}"
}

IMPORTANT:
- dietaryInfo.isVegan MUST be true
- dietaryInfo.isDairyFree MUST be true
- dietaryInfo.hasCheese MUST be false
- totalTime MUST be <= ${maxTime}
- Return ONLY the JSON object, no other text`;
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
    const { mealType, cuisine, mainIngredient, servings, maxTime } = body;

    if (!mealType || !servings) {
      return createAuthResponse(400, { error: 'mealType and servings required' });
    }

    const openai = new OpenAI({ apiKey });
    const prompt = buildPrompt(body);

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: string = '';

    while (attempts < maxAttempts) {
      attempts++;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful recipe generator. Always respond with valid JSON only.',
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

        // Additional validation
        if (!validated.dietaryInfo.isVegan) {
          lastError = 'Recipe is not vegan';
          continue;
        }

        if (!validated.dietaryInfo.isDairyFree) {
          lastError = 'Recipe is not dairy-free';
          continue;
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
