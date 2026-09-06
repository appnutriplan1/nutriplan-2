export type NumComidas = 3 | 4 | 5
export type TipoComida = 'desayuno' | 'media_mañana' | 'almuerzo' | 'media_tarde' | 'cena'

export interface DistribucionComida {
  tipo: TipoComida
  nombre: string
  kcalObjetivo: number
  proteinaObjetivo: number
  carbsObjetivo: number
  grasasObjetivo: number
}

export interface DistribucionPlan {
  comidas: DistribucionComida[]
  kcalTotal: number
}

// Distribuciones de calorías por tipo de plan
const DISTRIBUCIONES = {
  3: {
    desayuno: 0.28,
    almuerzo: 0.42,
    cena: 0.30,
  },
  4: {
    desayuno: 0.25,
    media_mañana: 0.12,
    almuerzo: 0.38,
    cena: 0.25,
  },
  5: {
    desayuno: 0.22,
    media_mañana: 0.12,
    almuerzo: 0.35,
    media_tarde: 0.12,
    cena: 0.19,
  },
}

// Macros por tipo de comida (distribución de proteína especialmente)
const MACROS_POR_TIPO = {
  desayuno: { proteina: 0.25, carbs: 0.40, grasas: 0.35 },
  media_mañana: { proteina: 0.20, carbs: 0.50, grasas: 0.30 },
  almuerzo: { proteina: 0.30, carbs: 0.40, grasas: 0.30 },
  media_tarde: { proteina: 0.18, carbs: 0.52, grasas: 0.30 },
  cena: { proteina: 0.28, carbs: 0.35, grasas: 0.37 },
}

const NOMBRES_COMIDA = {
  desayuno: 'Desayuno',
  media_mañana: 'Media mañana',
  almuerzo: 'Almuerzo',
  media_tarde: 'Media tarde',
  cena: 'Cena',
}

export function distribuirComidas(kcalObjetivo: number, numComidas: NumComidas): DistribucionPlan {
  const distribucion = DISTRIBUCIONES[numComidas]
  const tipos = Object.keys(distribucion) as TipoComida[]

  const comidas: DistribucionComida[] = tipos.map((tipo) => {
    const porcentajeKcal = distribucion[tipo as keyof typeof distribucion]
    const kcalComida = Math.round(kcalObjetivo * porcentajeKcal)
    const macrosRatio = MACROS_POR_TIPO[tipo]

    return {
      tipo,
      nombre: NOMBRES_COMIDA[tipo],
      kcalObjetivo: kcalComida,
      proteinaObjetivo: Math.round((kcalComida * macrosRatio.proteina) / 4),
      carbsObjetivo: Math.round((kcalComida * macrosRatio.carbs) / 4),
      grasasObjetivo: Math.round((kcalComida * macrosRatio.grasas) / 9),
    }
  })

  return {
    comidas,
    kcalTotal: kcalObjetivo,
  }
}
