import type { ComponenteEditorial } from './editorialFoodLibrary'

export type CalidadCarbohidrato = 'integral_fibra' | 'menestra' | 'tuberculo' | 'fruta_entera' | 'refinado' | 'no_aplica'
export type FamiliaProteica = 'huevo' | 'ave' | 'pescado_marisco' | 'carne_roja' | 'lacteo' | 'vegetal' | 'otra'

const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Clasificación editorial; no pretende estimar un índice glucémico numérico. */
export function clasificarCalidadCarbohidrato(componente: ComponenteEditorial): CalidadCarbohidrato {
  if (componente.rol === 'fruta') return 'fruta_entera'
  if (componente.rol !== 'carbohidrato') return 'no_aplica'
  const texto = normalizar(`${componente.nombreVisible} ${componente.preparacion}`)
  if (/frejol|frijol|garbanzo|pallar|lenteja|arveja partida|menestra/.test(texto)) return 'menestra'
  if (/papa|camote|yuca|olluco|mashua|oca/.test(texto)) return 'tuberculo'
  if (/integral|avena|quinua|kiwicha|mote/.test(texto)) return 'integral_fibra'
  if (/pan frances|pan de molde blanco|fideo|tallarin|pasta|arroz blanco/.test(texto)) return 'refinado'
  return 'integral_fibra'
}

export function clasificarFamiliaProteica(componente: ComponenteEditorial): FamiliaProteica {
  const texto = normalizar(componente.nombreVisible)
  if (/huevo/.test(texto)) return 'huevo'
  if (/pollo|pavo|pavita|sangrecita/.test(texto)) return 'ave'
  if (/pescado|atun|jurel|caballa|sardina|trucha|cojinova|tilapia|perico|bonito|marisco|camaron/.test(texto)) return 'pescado_marisco'
  if (/res|vacuno|cerdo/.test(texto)) return 'carne_roja'
  if (/queso|yogur|leche|ricotta|cottage/.test(texto)) return 'lacteo'
  if (/tofu|soya|frejol|frijol|garbanzo|lenteja|pallar/.test(texto)) return 'vegetal'
  return 'otra'
}

export function esCarbohidratoRefinado(componente: ComponenteEditorial) {
  return clasificarCalidadCarbohidrato(componente) === 'refinado'
}
