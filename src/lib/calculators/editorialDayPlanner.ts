import type { Alimento } from '../../services/alimentosService'
import { distribuirComidas, type NumComidas, type TipoComida } from './mealPlanDistribution'
import { COMPONENTES_EDITORIALES, type MomentoComidaEditorial } from './editorialFoodLibrary'
import { esCarbohidratoRefinado, type FamiliaProteica } from './editorialNutritionRules'
import { generarSugerenciaEditorial, type PerfilSugerencia, type SugerenciaComidaEditorial } from './editorialMealGenerator'

export type PlanDiarioEditorial = {
  objetivoKcal: number
  numComidas: NumComidas
  perfil: PerfilSugerencia
  comidas: SugerenciaComidaEditorial[]
  kcal: number
  diferenciaKcal: number
  valido: boolean
  observaciones: string[]
}

const editorialPorId = new Map(COMPONENTES_EDITORIALES.map((item) => [item.id, item]))

function auditarPlan(comidas: SugerenciaComidaEditorial[], objetivoKcal: number) {
  const observaciones: string[] = []
  const ids = comidas.flatMap((comida) => comida.componentes.map((item) => item.id))
  if (new Set(comidas.map((comida) => comida.preparacionId)).size !== comidas.length) observaciones.push('Hay preparaciones completas repetidas durante el día.')
  const almuerzo = comidas.find((comida) => comida.momento === 'almuerzo')
  const cena = comidas.find((comida) => comida.momento === 'cena')
  const proteinaDe = (comida?: SugerenciaComidaEditorial) => comida?.familiaProteica
  if (proteinaDe(almuerzo) && proteinaDe(almuerzo) === proteinaDe(cena)) observaciones.push('Almuerzo y cena repiten la proteína principal.')
  for (const comida of comidas.filter((item) => item.momento === 'almuerzo' || item.momento === 'cena')) {
    const esRecetaAuditada = comida.preparacionId.startsWith('REC-')
    if (!esRecetaAuditada && !comida.componentes.some((item) => item.rol === 'proteina')) observaciones.push(`${comida.momento} no contiene proteína principal.`)
    if (!esRecetaAuditada && !comida.componentes.some((item) => item.rol === 'verdura')) observaciones.push(`${comida.momento} no contiene verduras.`)
  }
  const refinados = ids.map((id) => editorialPorId.get(id)).filter((item) => item && esCarbohidratoRefinado(item)).length
  if (refinados > 1) observaciones.push('El día contiene más de una fuente principal de carbohidrato refinado.')
  if (comidas.some((comida) => Math.abs(comida.diferenciaKcal) > comida.objetivoKcal * 0.15)) observaciones.push('Alguna comida está fuera del margen operativo del ±15 %.')
  const kcal = comidas.reduce((suma, comida) => suma + comida.kcal, 0)
  if (Math.abs(kcal - objetivoKcal) > objetivoKcal * 0.1) observaciones.push('El total diario está fuera de la tolerancia del ±10 %.')
  return { observaciones, kcal }
}

export function generarPlanDiarioEditorial(args: {
  alimentos: Alimento[]
  objetivoKcal: number
  numComidas: NumComidas
  perfil?: PerfilSugerencia
  rotacion?: number
}): PlanDiarioEditorial | null {
  const { alimentos, objetivoKcal, numComidas, perfil = 'equilibrado', rotacion = 0 } = args
  if (!Number.isFinite(objetivoKcal) || objetivoKcal < 1200 || objetivoKcal > 3000) return null
  const distribucion = distribuirComidas(objetivoKcal, numComidas)
  let mejorInvalido: PlanDiarioEditorial | null = null

  for (let intentoPlan = 0; intentoPlan < 8; intentoPlan += 1) {
    const usadasColaciones = new Set<string>()
    const usadasPrincipales = new Set<string>()
    const familiasColaciones = new Set<FamiliaProteica>()
    const familiasPrincipales = new Set<FamiliaProteica>()
    let familiaDesayuno: FamiliaProteica | null = null
    const comidas: SugerenciaComidaEditorial[] = []
    let fallo = false
    for (const [indice, objetivo] of distribucion.comidas.entries()) {
      const familiasBloqueadas = new Set<FamiliaProteica>()
      const idsBloqueados = new Set<string>()
      if (objetivo.tipo === 'media_mañana' || objetivo.tipo === 'media_tarde') {
        familiasColaciones.forEach((familia) => familiasBloqueadas.add(familia))
        usadasColaciones.forEach((id) => idsBloqueados.add(id))
        if (familiaDesayuno === 'huevo') familiasBloqueadas.add('huevo')
      }
      if (objetivo.tipo === 'almuerzo' || objetivo.tipo === 'cena') {
        familiasPrincipales.forEach((familia) => familiasBloqueadas.add(familia))
        usadasPrincipales.forEach((id) => idsBloqueados.add(id))
      }
      let sugerencia: SugerenciaComidaEditorial | null = null
      for (let intento = 0; intento < 8 && !sugerencia; intento += 1) {
        const candidata = generarSugerenciaEditorial({
          alimentos,
          momento: objetivo.tipo as MomentoComidaEditorial,
          objetivoKcal: objetivo.kcalObjetivo,
          perfil,
          rotacion: rotacion * 7 + intentoPlan * 5 + indice * 3 + intento,
          idsExcluidos: idsBloqueados,
          familiasProteicasExcluidas: familiasBloqueadas,
        })
        if (!candidata || Math.abs(candidata.diferenciaKcal) > candidata.objetivoKcal * 0.15) continue
        const refinadosPrevios = comidas.flatMap((comida) => comida.componentes).map((item) => editorialPorId.get(item.id)).filter((item) => item && esCarbohidratoRefinado(item)).length
        const refinadosNuevos = candidata.componentes.map((item) => editorialPorId.get(item.id)).filter((item) => item && esCarbohidratoRefinado(item)).length
        if (refinadosPrevios + refinadosNuevos > 1) continue
        sugerencia = candidata
      }
      if (!sugerencia) { fallo = true; break }
      comidas.push(sugerencia)
      if (objetivo.tipo === 'media_mañana' || objetivo.tipo === 'media_tarde') usadasColaciones.add(sugerencia.preparacionId)
      if (objetivo.tipo === 'almuerzo' || objetivo.tipo === 'cena') usadasPrincipales.add(sugerencia.preparacionId)
      if (objetivo.tipo === 'desayuno') familiaDesayuno = sugerencia.familiaProteica
      else if (objetivo.tipo === 'media_mañana' || objetivo.tipo === 'media_tarde') familiasColaciones.add(sugerencia.familiaProteica)
      else familiasPrincipales.add(sugerencia.familiaProteica)
    }
    if (fallo) continue
    const auditoria = auditarPlan(comidas, objetivoKcal)
    const candidato: PlanDiarioEditorial = {
      objetivoKcal, numComidas, perfil, comidas, kcal: auditoria.kcal,
      diferenciaKcal: auditoria.kcal - objetivoKcal, valido: auditoria.observaciones.length === 0, observaciones: auditoria.observaciones,
    }
    if (candidato.valido) return candidato
    if (!mejorInvalido || candidato.observaciones.length < mejorInvalido.observaciones.length) mejorInvalido = candidato
  }
  return mejorInvalido
}

export function nombreMomento(tipo: TipoComida) {
  return tipo.replace('_', ' ')
}
