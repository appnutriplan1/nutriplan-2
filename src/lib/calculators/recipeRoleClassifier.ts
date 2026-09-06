import type { Receta } from '../../services/supabaseRecetas'

export type RolReceta = 'principal' | 'desayuno' | 'snack' | 'postre_fit' | 'ensalada' | 'sopa' | 'acompanamiento'

const DIACRITICOS = /[\u0300-\u036f]/g
const normalizar = (texto: string) => texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase()
const incluye = (texto: string, palabras: string[]) => palabras.some((palabra) => texto.includes(palabra))

export function clasificarRolReceta(receta: Receta): RolReceta {
  const texto = normalizar(`${receta.titulo} ${receta.categoriaNombre} ${receta.descripcion} ${receta.tags.join(' ')}`)
  if (incluye(texto, ['desayuno', 'tortilla', 'panqueque', 'waffle', 'avena', 'omelette'])) return 'desayuno'
  if (incluye(texto, ['snack', 'colacion', 'bocadito', 'parfait', 'sandwich'])) return 'snack'
  if (incluye(texto, ['postre', 'brownie', 'helado', 'tarta', 'galleta fit'])) return 'postre_fit'
  if (incluye(texto, ['ensalada'])) {
    const completa = receta.nutricion.proteina >= 20 && receta.nutricion.kcal >= 350
    return completa ? 'principal' : 'ensalada'
  }
  if (incluye(texto, ['sopa', 'crema', 'caldo'])) return receta.nutricion.proteina >= 20 ? 'principal' : 'sopa'
  if (incluye(texto, ['pollo', 'pavo', 'pescado', 'atun', 'bonito', 'carne', 'res', 'cerdo', 'huevo', 'tofu']) || receta.nutricion.proteina >= 20) return 'principal'
  return receta.nutricion.kcal < 250 ? 'acompanamiento' : 'principal'
}
