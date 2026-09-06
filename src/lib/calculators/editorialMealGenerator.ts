import type { Alimento } from '../../services/alimentosService'
import type { MomentoComidaEditorial, RolCulinarioEditorial } from './editorialFoodLibrary'
import type { FamiliaProteica } from './editorialNutritionRules'
import { RECETAS_PLANTILLA, type RecetaPlantilla } from './recipeTemplateLibrary'

export type PerfilSugerencia = 'equilibrado' | 'alta_proteina'
export type ComponenteSugerido = { id: string; nombre: string; rol: RolCulinarioEditorial; gramos: number; medidaCasera: string; kcal: number; proteina: number; carbohidratos: number; grasas: number; alimento?: Alimento }
export type SugerenciaComidaEditorial = {
  preparacionId: string; familiaProteica: FamiliaProteica; momento: MomentoComidaEditorial; titulo: string; descripcion: string; formato: string; objetivoKcal: number; kcal: number;
  diferenciaKcal: number; dentroDeTolerancia: boolean; componentes: ComponenteSugerido[]; advertencias: string[];
  gramosPreparacion: number; ingredientesAjustados: Array<{ nombre: string; gramos: number | null }>
}

function momentoBiblioteca(momento: MomentoComidaEditorial) { return momento === 'media_mañana' ? 'media_manana' : momento }

function nombreIngrediente(texto: string) {
  const etiqueta = texto.match(/^\s*([^:]{2,40}):/)?.[1]
  if (etiqueta) return etiqueta.trim()
  const despuesDeGuion = texto.split(/\s+[—–]\s+/)[1]
  const base = despuesDeGuion ?? texto
  return base
    .replace(/\d+(?:[.,]\d+)?\s*(?:g\s*\/\s*ml|kg|mg|ml|g)\b/gi, '')
    .replace(/\s*[·|]\s*.*$/, '')
    .replace(/^[—–-]?\s*(?:de\s+)?/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function alimentoDeReceta(template: RecetaPlantilla): Alimento {
  const factor = 100 / template.gramosPorcionBase
  return { id: `receta:${template.recipeId}`, nombre: template.nombre, grupo: 'Preparación sugerida', energiaKcal: template.nutricionBase.kcal * factor, proteinasG: template.nutricionBase.proteina * factor, grasaG: template.nutricionBase.grasas * factor, carbohidratosG: template.nutricionBase.carbohidratos * factor }
}

export function generarSugerenciaEditorial(args: {
  alimentos: Alimento[]; momento: MomentoComidaEditorial; objetivoKcal: number; perfil?: PerfilSugerencia; rotacion?: number;
  idsExcluidos?: ReadonlySet<string>; familiasProteicasExcluidas?: ReadonlySet<FamiliaProteica>
}): SugerenciaComidaEditorial | null {
  const { momento, objetivoKcal, rotacion = 0, idsExcluidos = new Set<string>(), familiasProteicasExcluidas = new Set<FamiliaProteica>() } = args
  if (!Number.isFinite(objetivoKcal) || objetivoKcal < 100 || objetivoKcal > 1200) return null
  const candidates = RECETAS_PLANTILLA.filter((item) => item.momento === momentoBiblioteca(momento) && !idsExcluidos.has(item.id) && !familiasProteicasExcluidas.has(item.familiaProteica))
  if (!candidates.length) return null
  const scalableCandidates = candidates.filter((item) => {
    const requiredScale = objetivoKcal / item.nutricionBase.kcal
    return requiredScale >= item.escalaMinima && requiredScale <= item.escalaMaxima
  })
  const pool = scalableCandidates.length ? scalableCandidates : [...candidates].sort((a, b) => {
    const distance = (item: RecetaPlantilla) => {
      const requiredScale = objetivoKcal / item.nutricionBase.kcal
      return requiredScale < item.escalaMinima ? item.escalaMinima - requiredScale : requiredScale - item.escalaMaxima
    }
    return distance(a) - distance(b)
  })
  const template = pool[((rotacion % pool.length) + pool.length) % pool.length]
  const rawScale = objetivoKcal / template.nutricionBase.kcal
  const scale = Math.min(template.escalaMaxima, Math.max(template.escalaMinima, rawScale))
  const grams = Math.round(template.gramosPorcionBase * scale)
  const food = alimentoDeReceta(template)
  const kcal = Math.round(template.nutricionBase.kcal * scale)
  const differenceKcal = kcal - objetivoKcal
  const withinTolerance = Math.abs(differenceKcal) <= objetivoKcal * 0.1
  const component: ComponenteSugerido = { id: template.id, nombre: template.nombre, rol: 'preparacion_completa', gramos: grams, medidaCasera: `${scale.toFixed(2)} porción`, kcal, proteina: template.nutricionBase.proteina * scale, carbohidratos: template.nutricionBase.carbohidratos * scale, grasas: template.nutricionBase.grasas * scale, alimento: food }
  const gramosConocidos = template.ingredientes.reduce((sum, ingredient) => sum + (ingredient.gramos ?? 0), 0)
  const porcionesReceta = gramosConocidos > 0 ? gramosConocidos / template.gramosPorcionBase : 1
  const ingredientesAjustados = template.ingredientes.map((ingredient) => ({
    nombre: nombreIngrediente(ingredient.texto),
    gramos: ingredient.gramos == null ? null : Math.round((ingredient.gramos / porcionesReceta) * scale * 10) / 10,
  }))
  return {
    preparacionId: template.id, familiaProteica: template.familiaProteica, momento, titulo: template.nombre,
    descripcion: template.descripcion || `Preparación completa ajustada a ${grams} g para acercarse a tu objetivo.`, formato: 'receta escalable', objetivoKcal, kcal, diferenciaKcal: differenceKcal,
    dentroDeTolerancia: withinTolerance, componentes: [component], gramosPreparacion: grams, ingredientesAjustados,
    advertencias: withinTolerance ? [] : [`La porción disponible queda a ${Math.abs(differenceKcal)} kcal del objetivo; puedes completarla manualmente.`],
  }
}

export function preparacionesEditorialesDisponibles(momento: MomentoComidaEditorial) { return RECETAS_PLANTILLA.filter((item) => item.momento === momentoBiblioteca(momento)) }
