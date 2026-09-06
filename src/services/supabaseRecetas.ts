import { RECETAS_MOCK } from '../data/recetas.mock'
import { PUBLIC_RECIPE_ID_SET } from '../lib/publicRecipes'

const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_DATA_MODE !== 'remote'
const CATALOGO_CACHE_MS = 5 * 60 * 1000
const CATALOGO_STORAGE_KEY = 'nutriplan.recipe-catalog.v2'

let catalogoCache: { recetas: Receta[]; vence: number } | null = null
let catalogoEnCurso: Promise<Receta[]> | null = null
const contenidoCache = new Map<string, { receta: Receta; vence: number }>()
const CONTENIDO_CACHE_MS = 5 * 60 * 1000

function limpiarTagsAcceso(tags: unknown, id: string) {
  const lista = Array.isArray(tags) ? tags.map(String) : []
  return PUBLIC_RECIPE_ID_SET.has(id)
    ? lista.filter((tag) => tag.trim().toLowerCase() !== 'premium')
    : lista
}

function leerCatalogoPersistido(): Receta[] {
  try {
    const value = localStorage.getItem(CATALOGO_STORAGE_KEY)
    if (!value) return []
    const parsed = JSON.parse(value) as { recetas?: Receta[] }
    return Array.isArray(parsed.recetas) ? parsed.recetas : []
  } catch {
    return []
  }
}

function guardarCatalogoPersistido(recetas: Receta[]) {
  try {
    localStorage.setItem(CATALOGO_STORAGE_KEY, JSON.stringify({ recetas, actualizadoEn: Date.now() }))
  } catch {
    // El catálogo seguirá funcionando en memoria si el navegador limita el almacenamiento.
  }
}

export function obtenerCatalogoRecetasGuardado(): Receta[] {
  return catalogoCache?.recetas ?? leerCatalogoPersistido()
}

export function obtenerRecetaCatalogoGuardada(id: string): Receta | null {
  return obtenerCatalogoRecetasGuardado().find((receta) => receta.id === id) ?? null
}

async function consultarCatalogo() {
  try {
    const response = await fetch('/api/recetas', { headers: { Accept: 'application/json' } })
    const payload = await response.json() as { ok?: boolean; recetas?: any[]; error?: string }
    if (!response.ok || !payload.ok || !Array.isArray(payload.recetas)) {
      return { data: null, error: new Error(payload.error || 'CATALOGO_NO_DISPONIBLE') }
    }
    return { data: payload.recetas, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('CATALOGO_NO_DISPONIBLE') }
  }
}

async function consultarFichaPublica(id: string) {
  try {
    const response = await fetch('/api/receta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const payload = await response.json() as { ok?: boolean; receta?: any; error?: string }
    if (!response.ok || !payload.ok || !payload.receta) {
      return { data: null, error: new Error(payload.error || 'RECETA_NO_DISPONIBLE') }
    }
    return { data: payload.receta, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('RECETA_NO_DISPONIBLE') }
  }
}

export type Receta = {
  id: string
  numero: number
  titulo: string
  categoriaId: string
  categoriaNombre: string
  descripcion: string
  imagenPrincipal: string
  tiempoMinutos: number
  dificultad: string
  porciones: number
  nutricion: {
    kcal: number
    proteina: number
    carbs: number
    grasas: number
  }
  ingredientes: string[]
  pasos: string[]
  tags: string[]
  tipsDelChef?: string[]
  proteinaPrincipal?: {
    id: string
    nombre: string
    emoji: string
  }
  estado: 'GRATUITO' | 'PREMIUM'
  mostrarAPacientes: boolean
  visible?: boolean
  orden?: number
}

/**
 * Traer todas las recetas desde Supabase (sin fallback a Sheet)
 */
async function cargarRecetas(): Promise<Receta[]> {
  // Solo usar mock si Supabase no está configurado
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(RECETAS_MOCK.map((receta) => ({ ...receta, visible: true }))), 300)
    })
  }

  try {
    const recetasResult = await consultarCatalogo()
    const { data, error } = recetasResult

    if (error) {
      console.error('❌ Error fetching recipes:', error)
      return [] // No usar fallback al Sheet
    }

    const recetas = (data || []).map((r: any) => {
      return ({
      id: r.id,
      numero: r.numero,
      titulo: r.titulo,
      categoriaId: r.categoria_id,
      categoriaNombre: r.categoria_nombre,
      descripcion: r.descripcion,
      imagenPrincipal: r.imagen_principal || `/platos/${r.id}.webp`,
      tiempoMinutos: r.tiempo_minutos || 30,
      dificultad: r.dificultad || 'Fácil',
      porciones: r.porciones || 2,
      nutricion: {
        kcal: r.nutricion?.kcal || 0,
        proteina: r.nutricion?.proteina || 0,
        carbs: r.nutricion?.carbs || 0,
        grasas: r.nutricion?.grasas || 0,
      },
      ingredientes: [],
      pasos: [],
      tags: limpiarTagsAcceso(r.tags, String(r.id)),
      tipsDelChef: [],
      proteinaPrincipal: r.proteina_principal,
      estado: 'GRATUITO' as const,
      mostrarAPacientes: true,
      visible: true,
      orden: r.numero,
    })})
    guardarCatalogoPersistido(recetas)
    return recetas
  } catch (e) {
    console.error('Unexpected error fetching recipes:', e)
    // En producción no mezclar datos ficticios con el catálogo real.
    return []
  }
}

/**
 * Traer una receta por ID
 */
export async function obtenerReceta(id: string, incluirContenido = true): Promise<Receta | null> {
  if (USE_MOCK) {
    const receta = RECETAS_MOCK.find((r) => r.id === id)
    return receta ? { ...receta, visible: true } : null
  }

  try {
    const { data, error } = await consultarFichaPublica(id)

    if (error || !data) {
      // No usar fallback al Sheet
      return null
    }

    // Supabase no puede inferir un tipo único cuando la selección depende
    // del nivel de acceso; normalizamos la fila después de comprobar errores.
    const fila = data as any
    return {
      id: fila.id,
      numero: fila.numero,
      titulo: fila.titulo,
      categoriaId: fila.categoria_id,
      categoriaNombre: fila.categoria_nombre,
      descripcion: fila.descripcion,
      imagenPrincipal: fila.imagen_principal || `/platos/${fila.id}.webp`,
      tiempoMinutos: fila.tiempo_minutos || 30,
      dificultad: fila.dificultad || 'Fácil',
      porciones: fila.porciones || 2,
      nutricion: {
        kcal: fila.nutricion?.kcal || 0,
        proteina: fila.nutricion?.proteina || 0,
        carbs: fila.nutricion?.carbs || 0,
        grasas: fila.nutricion?.grasas || 0,
      },
      ingredientes: incluirContenido ? fila.ingredientes || [] : [],
      pasos: incluirContenido ? fila.pasos || [] : [],
      tags: limpiarTagsAcceso(fila.tags, String(fila.id)),
      tipsDelChef: incluirContenido ? fila.tips_del_chef || [] : [],
      proteinaPrincipal: fila.proteina_principal,
      estado: 'GRATUITO',
      mostrarAPacientes: true,
      visible: true,
      orden: fila.numero,
    }
  } catch (e) {
    console.error('Error fetching recipe:', e)
    return null
  }
}

/**
 * El contenido completo se obtiene del servidor, que vuelve a validar el
 * código y usa la service role. En desarrollo los códigos DEMO conservan la
 * consulta directa para poder probar sin secretos de producción.
 */
export async function obtenerRecetaProtegida(
  id: string,
  codigoPaciente: string | null,
  codigoSuscriptor: string | null,
): Promise<Receta | null> {
  if (import.meta.env.DEV && codigoSuscriptor?.startsWith('NCNWTH-DEMO-')) {
    return obtenerReceta(id, true)
  }
  try {
    const claveCache = `${id}:${codigoPaciente || ''}:${codigoSuscriptor || ''}`
    const cache = contenidoCache.get(claveCache)
    if (cache && cache.vence > Date.now()) return cache.receta
    const response = await fetch('/api/receta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, codigoPaciente, codigoSuscriptor }),
    })
    if (!response.ok) return null
    const payload = await response.json() as { ok?: boolean; receta?: any }
    const fila = payload.receta
    if (!payload.ok || !fila) return null
    const receta: Receta = {
      id: fila.id,
      numero: fila.numero,
      titulo: fila.titulo,
      categoriaId: fila.categoria_id,
      categoriaNombre: fila.categoria_nombre,
      descripcion: fila.descripcion,
      imagenPrincipal: fila.imagen_principal || `/platos/${fila.id}.webp`,
      tiempoMinutos: fila.tiempo_minutos || 30,
      dificultad: fila.dificultad || 'Fácil',
      porciones: fila.porciones || 2,
      nutricion: {
        kcal: fila.nutricion?.kcal || 0,
        proteina: fila.nutricion?.proteina || 0,
        carbs: fila.nutricion?.carbs || 0,
        grasas: fila.nutricion?.grasas || 0,
      },
      ingredientes: fila.ingredientes || [],
      pasos: fila.pasos || [],
      tags: limpiarTagsAcceso(fila.tags, String(fila.id)),
      tipsDelChef: fila.tips_del_chef || [],
      proteinaPrincipal: fila.proteina_principal,
      estado: fila.estado === 'PREMIUM' ? 'PREMIUM' : 'GRATUITO',
      mostrarAPacientes: fila.mostrar_a_pacientes === true,
      visible: fila.visible !== false,
      orden: fila.numero,
    }
    contenidoCache.set(claveCache, { receta, vence: Date.now() + CONTENIDO_CACHE_MS })
    return receta
  } catch {
    return null
  }
}

export function obtenerRecetas(): Promise<Receta[]> {
  if (catalogoCache && catalogoCache.vence > Date.now()) {
    return Promise.resolve(catalogoCache.recetas)
  }
  if (catalogoEnCurso) return catalogoEnCurso

  catalogoEnCurso = cargarRecetas()
    .then((recetas) => {
      if (recetas.length > 0) {
        catalogoCache = {
          recetas,
          vence: Date.now() + CATALOGO_CACHE_MS,
        }
      }
      return recetas
    })
    .finally(() => {
      catalogoEnCurso = null
    })

  return catalogoEnCurso
}

/** Fuerza una revalidación de red conservando el catálogo visible anterior. */
export function actualizarCatalogoRecetas(): Promise<Receta[]> {
  catalogoCache = null
  return obtenerRecetas()
}

export function invalidarCacheRecetas() {
  catalogoCache = null
}

/** Home solo necesita cuatro tarjetas; evita descargar las 252 fichas. */
export async function obtenerRecetasDestacadas(limite = 4): Promise<Receta[]> {
  if (catalogoCache && catalogoCache.vence > Date.now()) {
    return catalogoCache.recetas.filter((receta) => receta.visible !== false).slice(0, limite)
  }
  if (USE_MOCK) return RECETAS_MOCK.slice(0, limite).map((receta) => ({ ...receta, visible: true }))

  try {
    const recetas = await obtenerRecetas()
    return recetas
      .filter((receta) => receta.visible !== false)
      .slice(0, limite)
  } catch {
    return []
  }
}

