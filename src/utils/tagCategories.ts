// Tag categorization utilities for Full Menu page

export type TagCategory = 'protein' | 'cuisine' | 'style' | 'time';

// Canonical alias map for robust matching
export const TAG_ALIASES: Record<string, { category: TagCategory; canonical: string }> = {
  // Protein aliases
  'korean bbq': { category: 'cuisine', canonical: 'korean' },
  'bbq': { category: 'style', canonical: 'grilled' },

  // Style aliases
  'stir-fry': { category: 'style', canonical: 'stir fry' },
  'stirfry': { category: 'style', canonical: 'stir fry' },
  'stir fry': { category: 'style', canonical: 'stir fry' },
  'one pot': { category: 'style', canonical: 'one-pot' },
  'sheet pan': { category: 'style', canonical: 'sheet-pan' },
  'sheetpan': { category: 'style', canonical: 'sheet-pan' },

  // Cuisine aliases
  'tex-mex': { category: 'cuisine', canonical: 'mexican' },
  'texmex': { category: 'cuisine', canonical: 'mexican' },
  'mediterranean': { category: 'cuisine', canonical: 'greek' },
  'med': { category: 'cuisine', canonical: 'greek' },
  'southeast asian': { category: 'cuisine', canonical: 'thai' },
};

// Category definitions
export const PROTEIN_TAGS = [
  'chicken', 'beef', 'pork', 'lamb', 'turkey',
  'fish', 'salmon', 'shrimp', 'scallops', 'seafood',
  'tofu', 'tempeh', 'seitan', 'chickpeas', 'lentils', 'beans',
  'vegan', 'vegetarian',
];

export const CUISINE_TAGS = [
  'thai', 'chinese', 'japanese', 'korean', 'vietnamese', 'asian',
  'italian', 'greek', 'french', 'spanish',
  'mexican', 'latin',
  'indian', 'middle eastern',
  'american', 'southern', 'cajun',
];

export const STYLE_TAGS = [
  'stir fry', 'baked', 'grilled', 'roasted', 'fried', 'sauteed',
  'soup', 'stew', 'curry', 'braised',
  'bowl', 'pasta', 'tacos', 'salad', 'wrap', 'sandwich',
  'one-pot', 'sheet-pan', 'slow cooker', 'instant pot',
  'quick', 'comfort food', 'light', 'hearty',
];

export const TIME_THRESHOLDS = {
  quick: 25,      // <= 25 min
  medium: 40,     // 26-40 min
  // longer: 40+ min
};

// Normalize a tag using alias mapping
export function normalizeTag(tag: string): string {
  const lower = tag.toLowerCase().trim();
  const alias = TAG_ALIASES[lower];
  return alias ? alias.canonical : lower;
}

// Get the category for a given tag
export function getTagCategory(tag: string): TagCategory | null {
  const normalized = normalizeTag(tag);

  if (PROTEIN_TAGS.includes(normalized)) return 'protein';
  if (CUISINE_TAGS.includes(normalized)) return 'cuisine';
  if (STYLE_TAGS.includes(normalized)) return 'style';

  // Check alias map
  const alias = TAG_ALIASES[normalized];
  if (alias) return alias.category;

  return null;
}

// Get time category based on totalTime
export function getTimeCategory(totalTime: number): string {
  if (totalTime <= TIME_THRESHOLDS.quick) return 'Quick';
  if (totalTime <= TIME_THRESHOLDS.medium) return 'Medium';
  return 'Longer';
}

// Categorize a recipe by a specific dimension
export function categorizeRecipe(
  recipe: { tags: string[]; totalTime: number },
  dimension: TagCategory
): string[] {
  if (dimension === 'time') {
    return [getTimeCategory(recipe.totalTime)];
  }

  const matchingTags: string[] = [];
  const categoryTags = dimension === 'protein' ? PROTEIN_TAGS :
                       dimension === 'cuisine' ? CUISINE_TAGS :
                       STYLE_TAGS;

  for (const tag of recipe.tags) {
    const normalized = normalizeTag(tag);
    if (categoryTags.includes(normalized)) {
      // Capitalize first letter
      matchingTags.push(normalized.charAt(0).toUpperCase() + normalized.slice(1));
    }

    // Also check alias mappings
    const alias = TAG_ALIASES[normalized];
    if (alias && alias.category === dimension) {
      const canonical = alias.canonical;
      matchingTags.push(canonical.charAt(0).toUpperCase() + canonical.slice(1));
    }
  }

  return [...new Set(matchingTags)]; // Remove duplicates
}

export interface GroupedRecipes<T> {
  category: string;
  recipes: T[];
}

// Group recipes by a category dimension
export function groupRecipesByCategory<T extends { tags: string[]; totalTime: number }>(
  recipes: T[],
  dimension: TagCategory
): GroupedRecipes<T>[] {
  const groups: Map<string, T[]> = new Map();
  const uncategorized: T[] = [];

  for (const recipe of recipes) {
    const categories = categorizeRecipe(recipe, dimension);

    if (categories.length === 0) {
      uncategorized.push(recipe);
    } else {
      // Add to first matching category
      const primaryCategory = categories[0];
      if (!groups.has(primaryCategory)) {
        groups.set(primaryCategory, []);
      }
      groups.get(primaryCategory)!.push(recipe);
    }
  }

  // Sort groups alphabetically, with "Other" at the end
  const sortedGroups: GroupedRecipes<T>[] = Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, recipes]) => ({ category, recipes }));

  // Add uncategorized as "Other" at the end
  if (uncategorized.length > 0) {
    sortedGroups.push({ category: 'Other', recipes: uncategorized });
  }

  return sortedGroups;
}

// Get the most common tags from a list of recipes (for filter chips)
export function getTopTags(
  recipes: { tags: string[] }[],
  limit: number = 8
): string[] {
  const tagCounts: Map<string, number> = new Map();

  for (const recipe of recipes) {
    for (const tag of recipe.tags) {
      const count = tagCounts.get(tag) || 0;
      tagCounts.set(tag, count + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}
