import { z } from 'zod'
import lote1Raw from '../../../datos/biblioteca-editorial/lote1_componentes.json'
import lote2Raw from '../../../datos/biblioteca-editorial/lote2_componentes_corregido.json'
import aprobacionRaw from '../../../datos/biblioteca-editorial/biblioteca_aprobada.json'

export const MOMENTOS_COMIDA = ['desayuno', 'media_mañana', 'almuerzo', 'media_tarde', 'cena'] as const
export const ROLES_CULINARIOS = ['proteina', 'carbohidrato', 'verdura', 'fruta', 'lacteo', 'grasa', 'preparacion_completa'] as const

const porcionSchema = z.object({
  gramos: z.number().finite().positive(),
  medidaCasera: z.string().trim().min(1),
  esPredeterminada: z.boolean(),
}).strict()

const componenteSchema = z.object({
  id: z.string().trim().regex(/^[A-Z]{3}\d?-\d{2}$/),
  cenanId: z.string().trim().min(1),
  nombreVisible: z.string().trim().min(1),
  preparacion: z.string().trim().min(1),
  estadoServicio: z.enum(['listo', 'cocido', 'sancochado', 'asado', 'plancha', 'otro_aprobado']),
  rol: z.enum(ROLES_CULINARIOS),
  momentosPermitidos: z.array(z.enum(MOMENTOS_COMIDA)),
  momentosProhibidos: z.array(z.enum(MOMENTOS_COMIDA)),
  porciones: z.array(porcionSchema).min(1),
  formatosPermitidos: z.array(z.string().trim().min(1)),
  compatibilidades: z.array(z.string().trim().min(1)),
  exclusiones: z.array(z.string().trim().min(1)),
  notasEditoriales: z.string(),
  estadoRevision: z.enum(['APROBADO', 'REVISAR', 'PENDIENTE_DECISION']),
  dependeDecision: z.array(z.number().int().positive()).optional(),
}).strict().superRefine((value, context) => {
  if (value.porciones.filter((porcion) => porcion.esPredeterminada).length !== 1) {
    context.addIssue({ code: 'custom', path: ['porciones'], message: 'Debe existir exactamente una porción predeterminada.' })
  }
  const prohibidos = new Set(value.momentosProhibidos)
  value.momentosPermitidos.forEach((momento, index) => {
    if (prohibidos.has(momento)) context.addIssue({ code: 'custom', path: ['momentosPermitidos', index], message: 'El momento también figura como prohibido.' })
  })
})

export const editorialFoodLibrarySchema = z.object({
  lote: z.number().int().positive(),
  version: z.string().trim().min(1),
  aprobadoPor: z.string().trim().min(1).optional(),
  fechaAprobacion: z.iso.date().optional(),
  fuenteNutricional: z.string().trim().min(1),
  archivoFuenteCenan: z.string().trim().min(1),
  nota: z.string().trim().min(1),
  decisionesPendientes: z.array(z.object({
    id: z.number().int().positive(),
    tema: z.string().trim().min(1),
    estado: z.literal('PENDIENTE'),
    afecta: z.array(z.string().trim().min(1)).optional(),
    detalle: z.string().trim().min(1),
  }).strict()).length(3),
  totalComponentes: z.literal(50),
  componentes: z.array(componenteSchema).length(50),
}).strict().superRefine((value, context) => {
  const ids = new Set<string>()
  value.componentes.forEach((componente, index) => {
    if (ids.has(componente.id)) context.addIssue({ code: 'custom', path: ['componentes', index, 'id'], message: 'Identificador editorial duplicado.' })
    ids.add(componente.id)
  })
})

const validarLote = (raw: unknown, lote: number) => {
  const resultado = editorialFoodLibrarySchema.safeParse(raw)
  if (!resultado.success) throw new Error(`Lote editorial ${lote} inválido: ${resultado.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`)
  if (resultado.data.lote !== lote) throw new Error(`El archivo del lote ${lote} declara lote ${resultado.data.lote}.`)
  return resultado.data
}

const validacionLote1 = validarLote(lote1Raw, 1)
const validacionLote2 = validarLote(lote2Raw, 2)

export type MomentoComidaEditorial = typeof MOMENTOS_COMIDA[number]
export type RolCulinarioEditorial = typeof ROLES_CULINARIOS[number]
export type ComponenteEditorial = z.infer<typeof componenteSchema>
export type BibliotecaEditorial = z.infer<typeof editorialFoodLibrarySchema>

export const BIBLIOTECA_EDITORIAL_LOTE_1: BibliotecaEditorial = validacionLote1
export const BIBLIOTECA_EDITORIAL_LOTE_2: BibliotecaEditorial = validacionLote2
export const BIBLIOTECA_EDITORIAL_APROBACION = aprobacionRaw
export const COMPONENTES_EDITORIALES = [...validacionLote1.componentes, ...validacionLote2.componentes]
export const COMPONENTES_EDITORIALES_HABILITADOS = COMPONENTES_EDITORIALES.filter((componente) => componente.estadoRevision !== 'PENDIENTE_DECISION')
export const BIBLIOTECA_EDITORIAL_TIENE_DECISIONES_PENDIENTES = [validacionLote1, validacionLote2].some((lote) => lote.decisionesPendientes.length > 0)

/**
 * El lote queda incorporado y validado, pero no puede alimentar sugerencias
 * mientras existan decisiones editoriales pendientes ni formatos sin definir.
 */
export function bibliotecaEditorialListaParaSugerencias() {
  return !BIBLIOTECA_EDITORIAL_TIENE_DECISIONES_PENDIENTES
    && COMPONENTES_EDITORIALES.every((componente) => componente.estadoRevision === 'APROBADO' && componente.formatosPermitidos.length > 0)
}
