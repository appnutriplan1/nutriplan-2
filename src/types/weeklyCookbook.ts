export const MEAL_TYPES = [
  'Desayuno',
  'Media mañana',
  'Almuerzo',
  'Media tarde',
  'Cena',
  'Snack',
  'Bebida',
  'Postre',
  'Complemento',
] as const

export interface WeeklyIngredient {
  name: string
  quantity: number | null
  unit: string
  notes: string | null
}

export interface WeeklyStep {
  order: number
  instruction: string
}

export interface WeeklyNutrition {
  kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fiber_g: number | null
  fat_g: number | null
}

export interface WeeklyRecipe {
  external_id: string
  title: string
  description: string | null
  category: string
  meal_type: (typeof MEAL_TYPES)[number]
  days: string[]
  image_file: string | null
  time_minutes: number | null
  servings: number
  difficulty: string | null
  tags: string[]
  ingredients: WeeklyIngredient[]
  steps: WeeklyStep[]
  nutrition_per_serving: WeeklyNutrition | null
  nutrition_note: string | null
  conservation: string | null
  clinical_note: string | null
}

export interface WeeklyCookbook {
  schema_version: '1.0'
  cookbook: {
    title: string
    week_start: string
    week_end: string
    notes: string | null
  }
  recipes: WeeklyRecipe[]
}

export interface CookbookValidationIssue {
  path: string
  message: string
}

export type CookbookValidationResult =
  | { ok: true; data: WeeklyCookbook; warnings: CookbookValidationIssue[] }
  | { ok: false; errors: CookbookValidationIssue[] }
