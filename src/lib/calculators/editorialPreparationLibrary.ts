import { z } from 'zod'
import rawLibrary from '../../../datos/biblioteca-editorial/preparaciones_lote1_local.json'

const ingredientSchema = z.object({ componentId: z.string().min(1), gramosBase: z.number().positive(), medidaCasera: z.string().min(1), funcion: z.string().min(1), opcional: z.boolean(), ajustable: z.boolean() })
const preparationSchema = z.object({
  id: z.string().min(1), nombre: z.string().min(1), tipo: z.enum(['Desayuno', 'Colacion dulce', 'Colacion salada', 'Almuerzo', 'Cena']),
  formato: z.string().min(1), descripcion: z.string().min(1), momentosPermitidos: z.array(z.string()).min(1), momentosProhibidos: z.array(z.string()),
  fuenteProteicaPrincipal: z.string().min(1), familiaProteica: z.enum(['huevo', 'ave', 'pescado_marisco', 'carne_roja', 'lacteo', 'vegetal']),
  calidadCarbohidrato: z.string().min(1), contieneCarbohidratoRefinado: z.boolean(), contieneVerdura: z.boolean(), contieneFrutaEntera: z.boolean(),
  porcionBase: z.string().min(1), instrucciones: z.array(z.string()).min(1), compatibilidades: z.string(), exclusiones: z.string(), notasEditoriales: z.string(),
  estadoRevision: z.string(), ingredientes: z.array(ingredientSchema).min(2), estadoOperativo: z.enum(['ACTIVA_LOCAL', 'BLOQUEADA_DECISION_3']),
})
const librarySchema = z.object({ lote: z.literal(1), version: z.string(), fuente: z.string(), nota: z.string(), toleranciaObjetivo: z.number().positive(), preparaciones: z.array(preparationSchema).length(50) })

export type PreparacionEditorial = z.infer<typeof preparationSchema>
export const BIBLIOTECA_PREPARACIONES_LOCAL = librarySchema.parse(rawLibrary)
export const PREPARACIONES_EDITORIALES = BIBLIOTECA_PREPARACIONES_LOCAL.preparaciones
export const PREPARACIONES_ACTIVAS = PREPARACIONES_EDITORIALES.filter((item) => item.estadoOperativo === 'ACTIVA_LOCAL')
