import type { Alimento } from '../../services/alimentosService'
import type { Receta } from '../../services/supabaseRecetas'
import type { TipoComida } from './mealPlanDistribution'

export type ObjetivosMacroComida = { proteina: number; carbs: number; grasas: number }
export type SugerenciaComplemento = {
  alimento: Alimento
  gramos: number
  kcal: number
  etiqueta: string
  motivo: string
}

type Rol = 'fruta' | 'lacteo' | 'pan_cereal' | 'tuberculo' | 'menestra' | 'proteina' | 'verdura' | 'grasa' | 'otro'

const DIACRITICOS = /[\u0300-\u036f]/g
const normalizar = (texto: string) => texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase()
const contiene = (texto: string, palabras: string[]) => palabras.some((palabra) => texto.includes(palabra))

function clasificar(alimento: Alimento): Rol {
  const texto = normalizar(`${alimento.nombre} ${alimento.grupo}`)
  if (contiene(texto, ['yogurt', 'yogur', 'leche', 'queso', 'lacteo'])) return 'lacteo'
  if (contiene(texto, ['lenteja', 'frejol', 'frijol', 'garbanzo', 'pallar', 'menestra', 'leguminosa'])) return 'menestra'
  if (contiene(texto, ['pollo', 'pavo', 'pescado', 'bonito', 'atun', 'carne', 'huevo', 'marisco'])) return 'proteina'
  if (contiene(texto, ['palta', 'almendra', 'nuez', 'pecana', 'mani', 'semilla', 'fruto seco'])) return 'grasa'
  if (contiene(texto, ['pan', 'avena', 'cereal', 'quinua', 'arroz', 'maiz'])) return 'pan_cereal'
  if (contiene(texto, ['papa', 'camote', 'yuca', 'olluco', 'tuberculo', 'raiz'])) return 'tuberculo'
  if (contiene(texto, ['verdura', 'hortaliza', 'espinaca', 'tomate', 'pepino', 'zanahoria', 'brocoli'])) return 'verdura'
  if (normalizar(alimento.grupo).includes('fruta')) return 'fruta'
  return 'otro'
}

function esFormaServible(alimento: Alimento, rol: Rol) {
  const nombre = normalizar(alimento.nombre)
  if (contiene(nombre, ['afrecho', 'harina', 'polvo', 'deshidratad', 'hojuela frita'])) return false
  if ((rol === 'pan_cereal' || rol === 'tuberculo' || rol === 'menestra') && contiene(nombre, ['crudo', 'seca', 'seco'])) return false
  if ((rol === 'pan_cereal' || rol === 'tuberculo' || rol === 'menestra') && !contiene(nombre, ['cocid', 'sancoch', 'asado', 'pan', 'avena en hojuela'])) return false
  return true
}

const ROLES_POR_COMIDA: Record<TipoComida, Rol[]> = {
  desayuno: ['fruta', 'lacteo', 'pan_cereal', 'grasa'],
  media_mañana: ['fruta', 'lacteo', 'grasa', 'pan_cereal'],
  almuerzo: ['verdura', 'tuberculo', 'pan_cereal', 'menestra', 'proteina', 'grasa'],
  media_tarde: ['fruta', 'lacteo', 'grasa', 'pan_cereal'],
  cena: ['verdura', 'tuberculo', 'pan_cereal', 'proteina', 'grasa', 'menestra'],
}

function macroPrioritario(receta: Receta, objetivos: ObjetivosMacroComida) {
  const deficit = {
    proteina: objetivos.proteina - receta.nutricion.proteina,
    carbs: objetivos.carbs - receta.nutricion.carbs,
    grasas: objetivos.grasas - receta.nutricion.grasas,
  }
  return (Object.entries(deficit).sort((a, b) => b[1] - a[1])[0]?.[0] || 'carbs') as keyof typeof deficit
}

function etiquetaPara(rol: Rol, macro: 'proteina' | 'carbs' | 'grasas') {
  if (rol === 'fruta' || rol === 'verdura') return 'Algo fresco'
  if (macro === 'proteina' && (rol === 'lacteo' || rol === 'proteina' || rol === 'menestra')) return 'Más proteína'
  if (rol === 'grasa') return 'Más saciedad'
  return 'Más energía'
}

export function sugerirComplementosCoherentes(args: {
  alimentos: Alimento[]
  tipoComida: TipoComida
  receta: Receta
  kcalFaltantes: number
  objetivosMacro: ObjetivosMacroComida
  alimentosUsados?: Alimento[]
  limite?: number
}): SugerenciaComplemento[] {
  const { alimentos, tipoComida, receta, kcalFaltantes, objetivosMacro, alimentosUsados = [], limite = 4 } = args
  if (kcalFaltantes < 20) return []
  const macro = macroPrioritario(receta, objetivosMacro)
  const usados = new Set(alimentosUsados.map((alimento) => alimento.id))
  const rolesPermitidos = ROLES_POR_COMIDA[tipoComida]
  const titulo = normalizar(`${receta.titulo} ${receta.descripcion} ${receta.tags.join(' ')}`)

  const candidatas = alimentos.flatMap((alimento) => {
    if (!Number.isFinite(alimento.energiaKcal) || alimento.energiaKcal <= 20 || usados.has(alimento.id)) return []
    const rol = clasificar(alimento)
    if (!rolesPermitidos.includes(rol) || !esFormaServible(alimento, rol)) return []
    const gramos = Math.round(kcalFaltantes / alimento.energiaKcal * 100)
    const maximo = rol === 'grasa' ? 50 : rol === 'pan_cereal' ? 160 : 250
    if (gramos < 10 || gramos > maximo) return []

    let score = 100 - Math.abs(gramos - (rol === 'grasa' ? 25 : 100)) * 0.35
    if (macro === 'proteina') score += alimento.proteinasG * 2.2
    if (macro === 'carbs') score += alimento.carbohidratosG * 0.45
    if (macro === 'grasas') score += alimento.grasaG * 1.4
    if (tipoComida === 'desayuno' && contiene(titulo, ['tortilla', 'huevo'])) {
      if (rol === 'pan_cereal' || rol === 'fruta') score += 28
      if (rol === 'lacteo') score += 12
    }
    if ((tipoComida === 'media_mañana' || tipoComida === 'media_tarde') && (rol === 'fruta' || rol === 'lacteo')) score += 22

    return [{ alimento, gramos, kcal: Math.round(alimento.energiaKcal * gramos / 100), rol, score }]
  }).sort((a, b) => b.score - a.score)

  const etiquetas = new Set<string>()
  const seleccion: SugerenciaComplemento[] = []
  for (const candidata of candidatas) {
    const etiqueta = etiquetaPara(candidata.rol, macro)
    if (etiquetas.has(etiqueta) && seleccion.length < 3) continue
    etiquetas.add(etiqueta)
    seleccion.push({ alimento: candidata.alimento, gramos: candidata.gramos, kcal: candidata.kcal, etiqueta, motivo: `Compatible con ${tipoComida.replace('_', ' ')}` })
    if (seleccion.length >= limite) break
  }
  return seleccion
}
