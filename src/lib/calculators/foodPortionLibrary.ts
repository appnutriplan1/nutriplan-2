import type { Alimento } from '../../services/alimentosService'

export type RolAlimento = 'proteina' | 'carbohidrato' | 'verdura' | 'fruta' | 'lacteo' | 'grasa'
export type PorcionAlimento = { alimento: Alimento; gramos: number; descripcion: string; rol: RolAlimento; kcal: number; proteina: number; carbs: number; grasas: number }

const DIACRITICOS = /[\u0300-\u036f]/g
const normalizar = (texto: string) => texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase()
const contiene = (texto: string, palabras: string[]) => palabras.some((palabra) => texto.includes(palabra))

function rolDe(alimento: Alimento): RolAlimento | null {
  const texto = normalizar(`${alimento.nombre} ${alimento.grupo}`)
  if (contiene(texto, ['pollo', 'pavo', 'pescado', 'atun', 'bonito', 'carne', 'res', 'cerdo', 'huevo'])) return 'proteina'
  if (contiene(texto, ['yogur', 'yogurt', 'leche', 'queso'])) return 'lacteo'
  if (contiene(texto, ['palta', 'mani', 'almendra', 'nuez', 'pecana', 'semilla'])) return 'grasa'
  if (normalizar(alimento.grupo).includes('fruta')) return 'fruta'
  if (contiene(texto, ['verdura', 'hortaliza', 'espinaca', 'tomate', 'pepino', 'brocoli', 'coliflor', 'berenjena'])) return 'verdura'
  if (contiene(texto, ['arroz', 'quinua', 'papa', 'camote', 'yuca', 'choclo', 'pan', 'avena', 'cereal', 'galleta'])) return 'carbohidrato'
  return null
}

function porcionHumana(alimento: Alimento, rol: RolAlimento) {
  const nombre = normalizar(alimento.nombre)
  if (['J3', 'J4', 'J16'].includes(alimento.id)) return { gramos: 50, descripcion: '1 unidad' }
  if (nombre.includes('pan')) return { gramos: 30, descripcion: '1 rebanada' }
  if (nombre.includes('galleta')) return { gramos: 24, descripcion: '2 a 3 unidades' }
  if (nombre.includes('yogur')) return { gramos: 150, descripcion: '1 envase' }
  if (nombre.includes('palta')) return { gramos: 50, descripcion: '¼ unidad' }
  if (rol === 'fruta') return { gramos: 120, descripcion: '1 porción' }
  if (rol === 'proteina') return { gramos: 120, descripcion: '1 porción' }
  if (rol === 'carbohidrato') return { gramos: 120, descripcion: '¾ taza o 1 porción' }
  if (rol === 'verdura') return { gramos: 150, descripcion: '1 porción' }
  if (rol === 'lacteo') return { gramos: 80, descripcion: '1 porción' }
  return { gramos: 20, descripcion: '1 cucharada o puñado pequeño' }
}

function servible(alimento: Alimento, rol: RolAlimento) {
  const nombre = normalizar(alimento.nombre)
  if (contiene(nombre, ['harina', 'afrecho', 'polvo', 'deshidratad', 'hojuela frita'])) return false
  if ((rol === 'carbohidrato' || rol === 'proteina') && contiene(nombre, ['crudo', 'seca', 'seco'])) return false
  if (rol === 'carbohidrato' && contiene(nombre, ['arroz', 'quinua', 'papa', 'camote', 'yuca', 'choclo']) && !contiene(nombre, ['cocid', 'sancoch', 'asado'])) return false
  return true
}

export function obtenerPorciones(alimentos: Alimento[], rol: RolAlimento): PorcionAlimento[] {
  return alimentos.flatMap((alimento) => {
    if (rolDe(alimento) !== rol || !servible(alimento, rol) || !Number.isFinite(alimento.energiaKcal)) return []
    const { gramos, descripcion } = porcionHumana(alimento, rol)
    const factor = gramos / 100
    return [{ alimento, gramos, descripcion, rol, kcal: Math.round(alimento.energiaKcal * factor), proteina: alimento.proteinasG * factor, carbs: alimento.carbohidratosG * factor, grasas: alimento.grasaG * factor }]
  })
}
