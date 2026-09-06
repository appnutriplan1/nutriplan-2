import { listAlimentos as fetchAlimentos, type Alimento } from './dataService'

export type { Alimento }

/**
 * Capa de búsqueda/filtro sobre ALIMENTOS. La fuente de datos ya no se lee
 * directo del mock: viene de DataService (única puerta a datos remotos),
 * que hoy sirve el mock y mañana el Apps Script sin que este archivo cambie.
 */
const DIACRITICOS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g')

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLowerCase()
}

let cache: Alimento[] | null = null

// La Tabla Peruana usa el nombre técnico «pasta untable de maní». Conservamos
// esa denominación oficial, pero aceptamos los nombres cotidianos con los que
// una persona normalmente busca este alimento.
const SINONIMOS_POR_ID: Record<string, readonly string[]> = {
  D48: ['mantequilla de maní', 'crema de maní', 'peanut butter'],
}

async function obtenerTodos(): Promise<Alimento[]> {
  if (!cache) cache = await fetchAlimentos()
  return cache
}

export async function listAlimentos(): Promise<Alimento[]> {
  return obtenerTodos()
}

/** Tabla CENAN completa para validaciones y laboratorios editoriales locales. */
export async function listAlimentosReferencia(): Promise<Alimento[]> {
  const { TABLA_ALIMENTOS } = await import('../data/alimentos.tabla')
  return TABLA_ALIMENTOS.map((raw) => ({
    id: raw.id,
    nombre: raw.nombre,
    grupo: raw.grupo,
    energiaKcal: raw.energia_kcal,
    proteinasG: raw.proteinas_g,
    grasaG: raw.grasa_g,
    carbohidratosG: raw.carbohidratos_g,
  }))
}

export async function searchAlimentos(query: string): Promise<Alimento[]> {
  const todos = await obtenerTodos()
  const q = normalizar(query.trim())
  if (!q) return todos
  return todos.filter((a) => (
    normalizar(a.nombre).includes(q)
    || normalizar(a.grupo).includes(q)
    || (SINONIMOS_POR_ID[a.id] ?? []).some((sinonimo) => normalizar(sinonimo).includes(q))
  ))
}

export async function listGrupos(): Promise<string[]> {
  const todos = await obtenerTodos()
  return Array.from(new Set(todos.map((a) => a.grupo))).sort()
}
