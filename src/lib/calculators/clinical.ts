export type Sexo = 'M' | 'F'

export type NivelActividad = 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy_activo'

export type Objetivo = 'bajar_grasa' | 'mantener' | 'subir_masa'

export interface DatosClinicos {
  sexo: Sexo
  edad: number
  pesoKg: number
  tallaCm: number
  actividad: NivelActividad
  objetivo: Objetivo
}

export interface ResultadoMacro {
  gramos: number
  kcal: number
  porcentaje: number
}

export interface ResultadoClinico {
  imc: number
  categoriaImc: string
  tmb: number
  gastoTotal: number
  kcalObjetivo: number
  proteina: ResultadoMacro
  carbohidrato: ResultadoMacro
  grasa: ResultadoMacro
}

export const ACTIVIDAD_LABELS: Record<NivelActividad, string> = {
  sedentario: 'Sedentario',
  ligero: 'Ligero',
  moderado: 'Moderado',
  activo: 'Activo',
  muy_activo: 'Muy activo',
}

export const ACTIVIDAD_DESCRIPCION: Record<NivelActividad, string> = {
  sedentario: 'Poco o nada de ejercicio',
  ligero: 'Ejercicio 1–3 días/semana',
  moderado: 'Ejercicio 3–5 días/semana',
  activo: 'Ejercicio 6–7 días/semana',
  muy_activo: 'Ejercicio intenso + trabajo físico',
}

const FACTOR_ACTIVIDAD: Record<NivelActividad, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  activo: 1.725,
  muy_activo: 1.9,
}

export const OBJETIVO_LABELS: Record<Objetivo, string> = {
  bajar_grasa: 'Bajar grasa',
  mantener: 'Mantener',
  subir_masa: 'Subir masa',
}

const AJUSTE_OBJETIVO: Record<Objetivo, number> = {
  bajar_grasa: 0.8,
  mantener: 1,
  subir_masa: 1.1,
}

const PROTEINA_G_POR_KG: Record<Objetivo, number> = {
  bajar_grasa: 2.2,
  mantener: 1.8,
  subir_masa: 2.0,
}

const GRASA_PORCENTAJE_KCAL = 0.25

export function calcularTMB(sexo: Sexo, pesoKg: number, tallaCm: number, edad: number): number {
  const base = 10 * pesoKg + 6.25 * tallaCm - 5 * edad
  return sexo === 'M' ? base + 5 : base - 161
}

export function calcularImc(pesoKg: number, tallaCm: number): number {
  const tallaM = tallaCm / 100
  return pesoKg / (tallaM * tallaM)
}

export function categorizarImc(imc: number): string {
  if (imc < 18.5) return 'Bajo peso'
  if (imc < 25) return 'Normal'
  if (imc < 30) return 'Sobrepeso'
  if (imc < 35) return 'Obesidad I'
  if (imc < 40) return 'Obesidad II'
  return 'Obesidad III'
}

export function calcularAporteMacro(gramos: number, kcalPorGramo: number, kcalObjetivo: number): ResultadoMacro {
  const kcal = gramos * kcalPorGramo
  return {
    gramos: Math.round(gramos),
    kcal: Math.round(kcal),
    porcentaje: kcalObjetivo > 0 ? Math.round((kcal / kcalObjetivo) * 100) : 0,
  }
}

export function calcularResultadoClinico(datos: DatosClinicos): ResultadoClinico {
  const { sexo, edad, pesoKg, tallaCm, actividad, objetivo } = datos

  const imc = calcularImc(pesoKg, tallaCm)

  const tmb = calcularTMB(sexo, pesoKg, tallaCm, edad)
  const gastoTotal = tmb * FACTOR_ACTIVIDAD[actividad]
  const kcalObjetivo = gastoTotal * AJUSTE_OBJETIVO[objetivo]

  const proteinaG = PROTEINA_G_POR_KG[objetivo] * pesoKg
  const grasaKcal = kcalObjetivo * GRASA_PORCENTAJE_KCAL
  const grasaG = grasaKcal / 9
  const carbKcalRestante = Math.max(kcalObjetivo - proteinaG * 4 - grasaKcal, 0)
  const carbG = carbKcalRestante / 4

  return {
    imc: Math.round(imc * 10) / 10,
    categoriaImc: categorizarImc(imc),
    tmb: Math.round(tmb),
    gastoTotal: Math.round(gastoTotal),
    kcalObjetivo: Math.round(kcalObjetivo),
    proteina: calcularAporteMacro(proteinaG, 4, kcalObjetivo),
    carbohidrato: calcularAporteMacro(carbG, 4, kcalObjetivo),
    grasa: calcularAporteMacro(grasaG, 9, kcalObjetivo),
  }
}
