import { z } from 'zod'
import rawLibrary from '../../../datos/biblioteca-editorial/recetas_100_plantillas_local.json'
import type { FamiliaProteica } from './editorialNutritionRules'

const momentoSchema = z.enum(['desayuno', 'media_manana', 'almuerzo', 'media_tarde', 'cena'])
const familiaSchema = z.enum(['huevo', 'ave', 'pescado_marisco', 'carne_roja', 'lacteo', 'vegetal', 'otra'])
const templateSchema = z.object({
  id: z.string().min(1), recipeId: z.string().min(1), nombre: z.string().min(1), descripcion: z.string(), momento: momentoSchema, familiaProteica: familiaSchema,
  modoEscala: z.literal('PORCION_COMPLETA'), gramosPorcionBase: z.number().positive(), escalaMinima: z.number().positive(), escalaMaxima: z.number().positive(),
  nutricionBase: z.object({ kcal: z.number().positive(), proteina: z.number().nonnegative(), carbohidratos: z.number().nonnegative(), grasas: z.number().nonnegative() }),
  ingredientes: z.array(z.object({ texto: z.string().min(1), gramos: z.number().positive().nullable() })).min(2), pasos: z.array(z.string().min(1)).min(1), fuenteLocal: z.string().min(1),
})
const librarySchema = z.object({ version: z.string().min(1), nota: z.string().min(1), counts: z.object({ desayuno: z.literal(20), almuerzo: z.literal(20), cena: z.literal(20), media_manana: z.literal(20), media_tarde: z.literal(20) }), templates: z.array(templateSchema).length(100) })
const parsed = librarySchema.parse(rawLibrary)
export type RecetaPlantilla = z.infer<typeof templateSchema> & { familiaProteica: FamiliaProteica }
export const RECETAS_PLANTILLA = parsed.templates as RecetaPlantilla[]
