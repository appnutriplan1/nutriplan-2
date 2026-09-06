import { z } from 'zod'
import { MEAL_TYPES, type CookbookValidationIssue, type CookbookValidationResult } from '../types/weeklyCookbook'

const nullableNonNegative = z.number().finite().nonnegative().nullable()

const cookbookSchema = z.object({
  schema_version: z.literal('1.0'),
  cookbook: z.object({
    title: z.string().trim().min(1),
    week_start: z.iso.date(),
    week_end: z.iso.date(),
    notes: z.string().trim().nullable(),
  }),
  recipes: z.array(z.object({
    external_id: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1),
    description: z.string().trim().nullable(),
    category: z.string().trim().min(1),
    meal_type: z.enum(MEAL_TYPES),
    days: z.array(z.string().trim().min(1)),
    image_file: z.string().trim().min(1).nullable(),
    time_minutes: nullableNonNegative,
    servings: z.number().int().positive(),
    difficulty: z.string().trim().nullable(),
    tags: z.array(z.string().trim().min(1)),
    ingredients: z.array(z.object({
      name: z.string().trim().min(1),
      quantity: nullableNonNegative,
      unit: z.string().trim(),
      notes: z.string().trim().nullable(),
    })).min(1),
    steps: z.array(z.object({
      order: z.number().int().positive(),
      instruction: z.string().trim().min(1),
    })).min(1),
    nutrition_per_serving: z.object({
      kcal: nullableNonNegative,
      protein_g: nullableNonNegative,
      carbs_g: nullableNonNegative,
      fiber_g: nullableNonNegative,
      fat_g: nullableNonNegative,
    }).nullable(),
    nutrition_note: z.string().trim().nullable(),
    conservation: z.string().trim().nullable(),
    clinical_note: z.string().trim().nullable(),
  })).min(1).max(100),
}).superRefine((value, context) => {
  if (value.cookbook.week_end < value.cookbook.week_start) {
    context.addIssue({ code: 'custom', path: ['cookbook', 'week_end'], message: 'Debe ser igual o posterior al inicio de la semana.' })
  }

  const recipeIds = new Set<string>()
  value.recipes.forEach((recipe, recipeIndex) => {
    if (recipeIds.has(recipe.external_id)) {
      context.addIssue({ code: 'custom', path: ['recipes', recipeIndex, 'external_id'], message: 'El identificador está duplicado.' })
    }
    recipeIds.add(recipe.external_id)

    const orders = recipe.steps.map((step) => step.order)
    if (new Set(orders).size !== orders.length || orders.some((order, index) => order !== index + 1)) {
      context.addIssue({ code: 'custom', path: ['recipes', recipeIndex, 'steps'], message: 'Los pasos deben estar ordenados desde 1, sin saltos ni duplicados.' })
    }
  })
})

function pathLabel(path: PropertyKey[]) {
  return path.length ? path.map(String).join('.') : 'archivo'
}

export function validateWeeklyCookbook(input: unknown): CookbookValidationResult {
  const result = cookbookSchema.safeParse(input)
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => ({ path: pathLabel(issue.path), message: issue.message })),
    }
  }

  const warnings: CookbookValidationIssue[] = []
  result.data.recipes.forEach((recipe, index) => {
    if (!recipe.image_file) warnings.push({ path: `recipes.${index}.image_file`, message: 'La receta no tiene fotografía.' })
    if (recipe.time_minutes === null) warnings.push({ path: `recipes.${index}.time_minutes`, message: 'No se informó el tiempo.' })
    if (!recipe.nutrition_per_serving) warnings.push({ path: `recipes.${index}.nutrition_per_serving`, message: 'No se informó la nutrición por porción.' })
  })

  return { ok: true, data: result.data, warnings }
}
