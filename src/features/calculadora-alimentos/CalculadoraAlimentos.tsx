import { useEffect, useMemo, useState } from 'react'
import { Calculator, LayoutList, Pencil, Scale, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { CommandPalette } from './CommandPalette'
import { MealPlanSelector, type ItemsPorComida, type SugerenciasPorComida } from './MealPlanSelector'
import { distribuirComidas, type NumComidas, type TipoComida } from '../../lib/calculators/mealPlanDistribution'
import { esNumero } from '../../lib/numero'
import { useToast } from '../../context/useToast'
import { SiguientesPasos } from '../../components/EmbudoValor/SiguientesPasos'
import { listAlimentosReferencia, type Alimento } from '../../services/alimentosService'
import { medidaCaseraBasica } from '../../lib/calculators/foodMeasures'
import { generarPlanDiarioEditorial } from '../../lib/calculators/editorialDayPlanner'
import { generarSugerenciaEditorial, type SugerenciaComidaEditorial } from '../../lib/calculators/editorialMealGenerator'
import { COMPONENTES_EDITORIALES } from '../../lib/calculators/editorialFoodLibrary'
import type { FamiliaProteica } from '../../lib/calculators/editorialNutritionRules'
import { FreeFoodCalculator } from './FreeFoodCalculator'

const BUILDER_DRAFT_KEY = 'nutriplan.food-meal-builder.draft.v1'
const SUGGESTIONS_DRAFT_KEY = 'nutriplan.food-meal-suggestions.draft.v1'
const FREE_DRAFT_KEY = 'nutriplan.food-free-calculator.draft.v1'

type ObjetivoDiario = { kcal: number; proteina: number | null; carbohidrato: number | null; grasa: number | null }

function completarObjetivo(datos: { kcalObjetivo?: unknown; proteinas?: unknown; carbohidratos?: unknown; grasas?: unknown }): ObjetivoDiario | null {
  const kcal = Number(datos.kcalObjetivo)
  if (!Number.isFinite(kcal) || kcal <= 0) return null
  const proteinaGuardada = Number(datos.proteinas)
  const carbohidratoGuardado = Number(datos.carbohidratos)
  const grasaGuardada = Number(datos.grasas)
  return {
    kcal,
    proteina: Number.isFinite(proteinaGuardada) && proteinaGuardada > 0 ? Math.round(proteinaGuardada) : Math.round((kcal * 0.30) / 4),
    carbohidrato: Number.isFinite(carbohidratoGuardado) && carbohidratoGuardado > 0 ? Math.round(carbohidratoGuardado) : Math.round((kcal * 0.40) / 4),
    grasa: Number.isFinite(grasaGuardada) && grasaGuardada > 0 ? Math.round(grasaGuardada) : Math.round((kcal * 0.30) / 9),
  }
}

function leerItemsLibres(): import('./MealPlanSelector').MealBuilderItem[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(FREE_DRAFT_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function leerItemsGuardados(): ItemsPorComida {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(BUILDER_DRAFT_KEY) || '[]')
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {}
  } catch { return {} }
}

function leerSugerenciasGuardadas(): SugerenciasPorComida {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SUGGESTIONS_DRAFT_KEY) || '{}')
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {}
  } catch { return {} }
}

function calcularAporte(alimento: Alimento, gramos: number) {
  const factor = gramos / 100
  return {
    kcal: alimento.energiaKcal * factor,
    proteina: alimento.proteinasG * factor,
    grasa: alimento.grasaG * factor,
    carbohidrato: alimento.carbohidratosG * factor,
  }
}

/**
 * Un valor que no se pudo leer de la tabla se muestra como "—", nunca como
 * un número: mostrar 0 g de proteína cuando el dato falta sería inventar
 * información nutricional.
 */
function fmtGramos(valor: number): string {
  return esNumero(valor) ? `${valor.toFixed(1)}g` : '—'
}

function fmtKcal(valor: number): string {
  return esNumero(valor) ? `${Math.round(valor)}` : '—'
}


export function CalculadoraAlimentos() {
  const [modo, setModo] = useState<'comidas' | 'libre'>('comidas')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [itemsPorComida, setItemsPorComida] = useState<ItemsPorComida>(leerItemsGuardados)
  const [sugerenciasPorComida, setSugerenciasPorComida] = useState<SugerenciasPorComida>(leerSugerenciasGuardadas)
  const [comidaActiva, setComidaActiva] = useState<TipoComida | null>(null)
  const [itemsLibres, setItemsLibres] = useState<import('./MealPlanSelector').MealBuilderItem[]>(leerItemsLibres)
  const [busquedaLibre, setBusquedaLibre] = useState(false)
  const [anterioresPorComida, setAnterioresPorComida] = useState<Partial<Record<TipoComida, { items: import('./MealPlanSelector').MealBuilderItem[]; sugerencia: SugerenciasPorComida[TipoComida] }>>>({})
  const [mostroToast, setMostroToast] = useState(false)
  const [objetivo, setObjetivo] = useState<ObjetivoDiario | null>(null)
  const [objetivoManual, setObjetivoManual] = useState('2000')
  const [proteinaManual, setProteinaManual] = useState('100')
  const [carbohidratoManual, setCarbohidratoManual] = useState('250')
  const [grasaManual, setGrasaManual] = useState('67')
  const [modalObjetivoOpen, setModalObjetivoOpen] = useState(false)
  const [errorObjetivo, setErrorObjetivo] = useState('')
  const { addToast } = useToast()

  useEffect(() => {
    const stored = localStorage.getItem('nutriplan_objetivo_calorias')
    if (stored) {
      try {
        const datos = JSON.parse(stored)
        setObjetivo(completarObjetivo(datos))
      } catch (e) {
        console.error('Error parsing stored objective', e)
      }
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem(BUILDER_DRAFT_KEY, JSON.stringify(itemsPorComida))
  }, [itemsPorComida])

  useEffect(() => {
    sessionStorage.setItem(SUGGESTIONS_DRAFT_KEY, JSON.stringify(sugerenciasPorComida))
  }, [sugerenciasPorComida])

  useEffect(() => {
    sessionStorage.setItem(FREE_DRAFT_KEY, JSON.stringify(itemsLibres))
  }, [itemsLibres])

  function handleSelect(alimento: Alimento) {
    if (busquedaLibre) {
      const medida = medidaCaseraBasica(alimento)
      setItemsLibres((prev) => [...prev, { itemId: alimento.id + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), alimento, gramos: medida?.gramos ?? 100 }])
      setPaletteOpen(false)
      setBusquedaLibre(false)
      return
    }
    if (!comidaActiva) return
    const medida = medidaCaseraBasica(alimento)
    setItemsPorComida((prev) => ({
      ...prev,
      [comidaActiva]: [...(prev[comidaActiva] ?? []), { itemId: alimento.id + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), alimento, gramos: medida?.gramos ?? 100 }],
    }))
    setPaletteOpen(false)
    setComidaActiva(null)
  }

  function abrirBuscador(tipo: TipoComida) {
    setBusquedaLibre(false)
    setComidaActiva(tipo)
    setPaletteOpen(true)
  }

  function abrirBuscadorLibre() {
    setComidaActiva(null)
    setBusquedaLibre(true)
    setPaletteOpen(true)
  }

  function handleGramosChange(tipo: TipoComida, itemId: string, gramos: number) {
    setItemsPorComida((prev) => ({ ...prev, [tipo]: (prev[tipo] ?? []).map((it) => it.itemId === itemId ? { ...it, gramos: Math.max(gramos, 0) } : it) }))
  }

  function handleRemove(tipo: TipoComida, itemId: string) {
    setItemsPorComida((prev) => ({ ...prev, [tipo]: (prev[tipo] ?? []).filter((it) => it.itemId !== itemId) }))
  }

  function cambiarDistribucion() {
    setItemsPorComida({})
    setSugerenciasPorComida({})
  }

  function convertirSugerencia(comida: SugerenciaComidaEditorial, alimentos: Alimento[]) {
    const alimentosPorId = new Map(alimentos.map((alimento) => [alimento.id, alimento]))
    const editorialesPorId = new Map(COMPONENTES_EDITORIALES.map((componente) => [componente.id, componente]))
    return comida.componentes.flatMap((item, index) => {
      const editorial = editorialesPorId.get(item.id)
      const alimento = item.alimento ?? (editorial ? alimentosPorId.get(editorial.cenanId) : undefined)
      return alimento ? [{ itemId: `sugerido-${comida.momento}-${item.id}-${index}`, alimento, gramos: item.gramos }] : []
    })
  }

  async function sugerirDiaCompleto(numComidas: NumComidas, reemplazar = false, comidasProtegidas: TipoComida[] = []) {
    if (!objetivo) return false
    const alimentos = await listAlimentosReferencia()
    const plan = reemplazar ? null : generarPlanDiarioEditorial({ alimentos, objetivoKcal: objetivo.kcal, numComidas, perfil: 'equilibrado', rotacion: Date.now() % 97 })
    const propuestas = plan?.comidas.length ? plan.comidas : []
    if (propuestas.length === 0) {
      const idsUsados = new Set<string>(reemplazar ? Object.values(sugerenciasPorComida).flatMap((item) => item?.preparacionId ? [item.preparacionId] : []) : [])
      const familiasColaciones = new Set<FamiliaProteica>()
      const familiasPrincipales = new Set<FamiliaProteica>()
      const semilla = Date.now() % 31
      for (const [index, comida] of distribuirComidas(objetivo.kcal, numComidas).comidas.entries()) {
        const esColacion = comida.tipo === 'media_mañana' || comida.tipo === 'media_tarde'
        const esPrincipal = comida.tipo === 'almuerzo' || comida.tipo === 'cena'
        const sugerencia = generarSugerenciaEditorial({
          alimentos,
          momento: comida.tipo,
          objetivoKcal: comida.kcalObjetivo,
          perfil: 'equilibrado',
          rotacion: index * 7 + semilla,
          idsExcluidos: idsUsados,
          familiasProteicasExcluidas: esColacion ? familiasColaciones : esPrincipal ? familiasPrincipales : undefined,
        })
        if (!sugerencia) continue
        propuestas.push(sugerencia)
        idsUsados.add(sugerencia.preparacionId)
        if (esColacion) familiasColaciones.add(sugerencia.familiaProteica)
        if (esPrincipal) familiasPrincipales.add(sugerencia.familiaProteica)
      }
    }
    if (propuestas.length === 0) {
      addToast({ type: 'error', title: 'No encontramos una propuesta segura', message: 'Puedes seguir calculando manualmente o probar otra distribución de comidas.' })
      return false
    }
    setItemsPorComida((prev) => {
      const siguiente = { ...prev }
      for (const comida of propuestas) {
        if (comidasProtegidas.includes(comida.momento)) continue
        if (!reemplazar && (siguiente[comida.momento]?.length ?? 0) > 0) continue
        siguiente[comida.momento] = convertirSugerencia(comida, alimentos)
      }
      return siguiente
    })
    setSugerenciasPorComida((prev) => {
      const siguiente = { ...prev }
      for (const comida of propuestas) {
        if (comidasProtegidas.includes(comida.momento)) continue
        if (!reemplazar && (siguiente[comida.momento] || (itemsPorComida[comida.momento]?.length ?? 0) > 0)) continue
        siguiente[comida.momento] = { preparacionId: comida.preparacionId, titulo: comida.titulo, descripcion: comida.descripcion, gramosPreparacion: comida.gramosPreparacion, ingredientes: comida.ingredientesAjustados }
      }
      return siguiente
    })
    addToast({
      type: 'success',
      title: plan?.valido ? 'Propuesta agregada' : 'Bases de comida agregadas',
      message: plan?.valido ? 'Puedes cambiar gramos, quitar alimentos o agregar otros libremente.' : 'Algunas comidas pueden quedar por debajo del objetivo. Completa las kcal faltantes con el buscador manual.',
    })
    return true
  }

  async function recomponerComida(tipo: TipoComida, kcalObjetivoComida: number) {
    const alimentos = await listAlimentosReferencia()
    const idsExcluidos = new Set(Object.values(sugerenciasPorComida).flatMap((item) => item?.preparacionId ? [item.preparacionId] : []))
    const sugerencia = generarSugerenciaEditorial({ alimentos, momento: tipo, objetivoKcal: kcalObjetivoComida, perfil: 'equilibrado', rotacion: Date.now() % 97, idsExcluidos })
    if (!sugerencia) {
      addToast({ type: 'error', title: 'No encontramos otra receta', message: 'Conservamos la preparación actual para que puedas seguir editándola.' })
      return false
    }
    setAnterioresPorComida((prev) => ({ ...prev, [tipo]: { items: itemsPorComida[tipo] ?? [], sugerencia: sugerenciasPorComida[tipo] } }))
    setItemsPorComida((prev) => ({ ...prev, [tipo]: convertirSugerencia(sugerencia, alimentos) }))
    setSugerenciasPorComida((prev) => ({ ...prev, [tipo]: { preparacionId: sugerencia.preparacionId, titulo: sugerencia.titulo, descripcion: sugerencia.descripcion, gramosPreparacion: sugerencia.gramosPreparacion, ingredientes: sugerencia.ingredientesAjustados } }))
    addToast({ type: 'success', title: 'Receta cambiada', message: `Solo recompusimos ${tipo.replace('_', ' ')}; las demás comidas se conservaron.` })
    return true
  }

  function deshacerRecomposicion(tipo: TipoComida) {
    const anterior = anterioresPorComida[tipo]
    if (!anterior) return
    setItemsPorComida((prev) => ({ ...prev, [tipo]: anterior.items }))
    setSugerenciasPorComida((prev) => ({ ...prev, [tipo]: anterior.sugerencia }))
    setAnterioresPorComida((prev) => ({ ...prev, [tipo]: undefined }))
  }

  // Si a un alimento le falta un macro, ese total queda como desconocido y se
  // muestra "—". Sumarlo como 0 daría una cifra que parece cierta y no lo es.
  const total = useMemo(
    () =>
      Object.values(itemsPorComida).flat().reduce(
        (acc, it) => {
          const aporte = calcularAporte(it.alimento, it.gramos)
          return {
            kcal: acc.kcal + aporte.kcal,
            proteina: acc.proteina + aporte.proteina,
            grasa: acc.grasa + aporte.grasa,
            carbohidrato: acc.carbohidrato + aporte.carbohidrato,
          }
        },
        { kcal: 0, proteina: 0, grasa: 0, carbohidrato: 0 },
      ),
    [itemsPorComida],
  )

  const cantidadItems = useMemo(
    () => Object.values(itemsPorComida).flat().length,
    [itemsPorComida],
  )

  const totalIncompleto = !esNumero(total.proteina) || !esNumero(total.grasa) || !esNumero(total.carbohidrato)

  const comparativa = objetivo ? {
    porcentaje: (total.kcal / objetivo.kcal) * 100,
    kcalRestantes: objetivo.kcal - total.kcal,
  } : null

  function guardarObjetivoManual() {
    const num = Number(objetivoManual)
    const proteina = Number(proteinaManual)
    const carbohidrato = Number(carbohidratoManual)
    const grasa = Number(grasaManual)
    if (!Number.isInteger(num) || num < 1200 || num > 5000) {
      setErrorObjetivo('Ingresa un valor entre 1200 y 5000 kcal.')
      return
    }
    if (![proteina, carbohidrato, grasa].every((valor) => Number.isFinite(valor) && valor > 0 && valor <= 1000)) {
      setErrorObjetivo('Ingresa objetivos válidos para proteínas, carbohidratos y grasas.')
      return
    }
    setObjetivo({ kcal: num, proteina, carbohidrato, grasa })
    localStorage.setItem('nutriplan_objetivo_calorias', JSON.stringify({
      kcalObjetivo: num,
      proteinas: proteina,
      carbohidratos: carbohidrato,
      grasas: grasa,
      fuente: 'manual',
      guardadoEn: new Date().toISOString(),
    }))
    setErrorObjetivo('')
    setModalObjetivoOpen(false)
  }

  useEffect(() => {
    if (cantidadItems > 0 && !mostroToast) {
      setMostroToast(true)
      addToast({
        type: 'success',
        title: `Tu día: ${Math.round(total.kcal)} kcal`,
        message: 'P ' + (total.proteina.toFixed(1)) + 'g · C ' + (total.carbohidrato.toFixed(1)) + 'g · G ' + (total.grasa.toFixed(1)) + 'g',
        action: {
          label: 'Ver planes con estos macros',
          href: 'https://wa.me/51982928488?text=Hola%2C%20me%20gustar%C3%ADa%20un%20plan%20con%20estos%20macros%3A%20' + Math.round(total.kcal) + '%20kcal%2C%20' + total.proteina.toFixed(1) + 'g%20proteína.',
        },
        duration: 0,
      })
    }
    if (cantidadItems === 0) {
      setMostroToast(false)
    }
  }, [cantidadItems, total.kcal, total.proteina, total.carbohidrato, total.grasa, addToast, mostroToast])

  return (
    <div className="mx-auto max-w-[640px] px-5 pb-56 pt-10 sm:px-6 sm:pb-40">
      <p className="kicker mb-3">HERRAMIENTA NUTRIPLAN</p>
      <h1 className="mb-2 font-display text-[32px] font-semibold leading-tight text-tinta sm:text-[40px]">
        Arma tu plato y conoce sus macros
      </h1>
      <p className="mb-8 max-w-[480px] font-sans text-[15px] text-muted">
        Construye tu día según tus objetivos o calcula una combinación libre sin afectar tus comidas.
      </p>

      <div className="mb-6 grid grid-cols-2 rounded-card bg-papel p-1" role="tablist" aria-label="Tipo de cálculo">
        <button type="button" role="tab" aria-selected={modo === 'comidas'} onClick={() => setModo('comidas')} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-3 font-sans text-sm font-bold transition-colors ${modo === 'comidas' ? 'bg-white text-verde shadow-soft' : 'text-muted'}`}><LayoutList size={17} /> Construir comidas</button>
        <button type="button" role="tab" aria-selected={modo === 'libre'} onClick={() => setModo('libre')} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-3 font-sans text-sm font-bold transition-colors ${modo === 'libre' ? 'bg-white text-verde shadow-soft' : 'text-muted'}`}><Scale size={17} /> Cálculo libre</button>
      </div>

      {modo === 'comidas' && <><Card padding="md" className="mb-6 border-sage/30 bg-sage/5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="font-sans text-xs uppercase tracking-wide text-muted">Tu objetivo diario</p>
              {objetivo ? (
                <><p className="mt-1 font-display text-2xl font-semibold text-verde">{objetivo.kcal}<span className="ml-1 text-sm font-sans font-medium text-muted">kcal</span></p>
                <div className="mt-3 grid grid-cols-3 gap-2 font-sans text-xs text-muted" aria-label="Objetivos diarios de macronutrientes"><span><strong className="block text-base text-tinta">{objetivo.proteina}g</strong>Proteína</span><span><strong className="block text-base text-tinta">{objetivo.carbohidrato}g</strong>Carbos</span><span><strong className="block text-base text-tinta">{objetivo.grasa}g</strong>Grasas</span></div></>
              ) : (
                <p className="mt-1 max-w-sm font-sans text-sm text-muted">Define tus calorías para distribuirlas entre tus comidas y calcular tus platos manualmente.</p>
              )}
            </div>
            {objetivo && <button type="button" onClick={() => { setObjetivoManual(String(objetivo.kcal)); setProteinaManual(String(objetivo.proteina ?? '')); setCarbohidratoManual(String(objetivo.carbohidrato ?? '')); setGrasaManual(String(objetivo.grasa ?? '')); setModalObjetivoOpen(true) }} className="shrink-0 rounded-full p-2 text-muted transition-colors hover:bg-white hover:text-verde" aria-label="Cambiar objetivo"><Pencil size={16} /></button>}
          </div>

          {!objetivo && (
            <div className="grid gap-2 pt-1 sm:grid-cols-2">
              <Link to="/calculadora-clinica?returnTo=alimentos" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-coral px-4 font-sans text-sm font-bold text-white transition-transform hover:-translate-y-0.5">
                <Calculator size={17} /> Calcula tu objetivo
              </Link>
              <button type="button" onClick={() => setModalObjetivoOpen(true)} className="min-h-12 rounded-control border border-verde/25 bg-white px-4 font-sans text-sm font-bold text-verde hover:border-verde">
                Ingresar manualmente
              </button>
            </div>
          )}

          {comparativa && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-sans text-sm text-tinta">
                  Tu día: <span className="font-semibold text-verde">{Math.round(total.kcal)} kcal</span> <span className="text-xs text-muted">({comparativa.porcentaje.toFixed(0)}%)</span>
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-linea">
                <div className="h-full rounded-full bg-gradient-to-r from-mandarina to-coral transition-[width] duration-300" style={{ width: `${Math.min(comparativa.porcentaje, 100)}%` }} />
              </div>
              <p className="font-sans text-xs text-muted">
                Te quedan <span className="font-semibold text-tinta">{Math.max(comparativa.kcalRestantes, 0).toFixed(0)} kcal</span>
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 font-sans text-[11px] text-muted"><span><strong className="block text-sm text-tinta">{fmtGramos(total.proteina)}</strong>de {objetivo?.proteina}g P</span><span><strong className="block text-sm text-tinta">{fmtGramos(total.carbohidrato)}</strong>de {objetivo?.carbohidrato}g C</span><span><strong className="block text-sm text-tinta">{fmtGramos(total.grasa)}</strong>de {objetivo?.grasa}g G</span></div>
            </div>
          )}
          {objetivo && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <span className="inline-flex min-h-10 items-center justify-center rounded-control bg-verde/10 px-3 font-sans text-xs font-bold text-verde">Mantener este objetivo</span>
              <Link to="/calculadora-clinica?returnTo=alimentos" className="inline-flex min-h-10 items-center justify-center rounded-control border border-linea bg-white px-3 font-sans text-xs font-bold text-verde hover:border-verde">Recalcular objetivo</Link>
            </div>
          )}
        </div>
      </Card>

      <MealPlanSelector
        kcalObjetivo={objetivo?.kcal ?? null}
        itemsPorComida={itemsPorComida}
        sugerenciasPorComida={sugerenciasPorComida}
        onBuscarAlimento={abrirBuscador}
        onCambiarGramos={handleGramosChange}
        onQuitarAlimento={handleRemove}
        onSugerirDia={sugerirDiaCompleto}
        onRecomponerComida={recomponerComida}
        onDeshacerRecomposicion={deshacerRecomposicion}
        puedeDeshacer={(tipo) => Boolean(anterioresPorComida[tipo])}
        onCambiarDistribucion={cambiarDistribucion}
      />

      {cantidadItems > 0 && (

        <div
          className="fixed inset-x-0 z-40 border-t border-linea bg-crema/95 px-5 pb-4 pt-4 backdrop-blur-sm sm:!bottom-0 sm:px-6 sm:pb-[max(1rem,env(safe-area-inset-bottom))]"
          // La barra inferior mide 4rem más el área segura del teléfono (la
          // franja del gesto de inicio). Sin sumarla, el total quedaba debajo
          // de la navegación y no se leía.
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {totalIncompleto && (
            <p className="mx-auto mb-2 max-w-[640px] font-sans text-[11px] text-mandarina">
              Algún alimento no tiene todos sus valores en la tabla.
            </p>
          )}
          <div className="mx-auto flex max-w-[640px] items-center justify-between gap-4">
            <div>
              <p className="font-sans text-xs uppercase tracking-wide text-muted">Total</p>
              <p className="font-display text-3xl font-semibold text-verde">
                {fmtKcal(total.kcal)}
                <span className="ml-1 text-sm font-sans font-medium text-muted">kcal</span>
              </p>
            </div>
            <div className="flex gap-4 text-right font-sans text-xs text-muted">
              <span>
                <span className="block font-semibold text-tinta">{fmtGramos(total.proteina)}</span>
                Proteína
              </span>
              <span>
                <span className="block font-semibold text-tinta">{fmtGramos(total.carbohidrato)}</span>
                Carbos
              </span>
              <span>
                <span className="block font-semibold text-tinta">{fmtGramos(total.grasa)}</span>
                Grasa
              </span>
            </div>
          </div>
        </div>
      )}</>}

      {modo === 'libre' && <FreeFoodCalculator items={itemsLibres} onBuscarAlimento={abrirBuscadorLibre} onCambiarGramos={(itemId, gramos) => setItemsLibres((prev) => prev.map((item) => item.itemId === itemId ? { ...item, gramos } : item))} onQuitarAlimento={(itemId) => setItemsLibres((prev) => prev.filter((item) => item.itemId !== itemId))} onLimpiar={() => setItemsLibres([])} />}

      <CommandPalette open={paletteOpen} onClose={() => { setPaletteOpen(false); setComidaActiva(null); setBusquedaLibre(false) }} onSelect={handleSelect} />

      {modalObjetivoOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-tinta/45 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="titulo-objetivo-manual" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalObjetivoOpen(false) }}>
          <Card padding="lg" className="w-full max-w-md bg-crema shadow-soft-lg">
            <div className="flex items-start justify-between gap-4">
              <div><p className="kicker mb-2">OBJETIVO MANUAL</p><h2 id="titulo-objetivo-manual" className="font-display text-2xl font-semibold text-tinta">Define tu objetivo diario completo</h2></div>
              <button type="button" onClick={() => setModalObjetivoOpen(false)} className="rounded-full p-2 text-muted hover:bg-papel" aria-label="Cerrar"><X size={18} /></button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[{ id: 'objetivo-proteina', label: 'Proteína', value: proteinaManual, set: setProteinaManual }, { id: 'objetivo-carbohidrato', label: 'Carbos', value: carbohidratoManual, set: setCarbohidratoManual }, { id: 'objetivo-grasa', label: 'Grasas', value: grasaManual, set: setGrasaManual }].map((campo) => <label key={campo.id} className="font-sans text-xs font-bold text-muted" htmlFor={campo.id}>{campo.label}<span className="mt-1 flex items-center rounded-control border border-linea bg-white px-2"><input id={campo.id} type="number" min={1} max={1000} value={campo.value} onChange={(event) => { campo.set(event.target.value); setErrorObjetivo('') }} className="h-11 min-w-0 flex-1 bg-transparent text-right text-sm font-bold text-tinta outline-none" /><span className="ml-1">g</span></span></label>)}
            </div>
            <label className="mt-6 block font-sans text-xs font-bold uppercase tracking-wide text-muted" htmlFor="objetivo-kcal">Objetivo diario</label>
            <div className="mt-2 flex items-center rounded-control border border-linea bg-white px-4 focus-within:border-verde focus-within:ring-4 focus-within:ring-verde/10">
              <input id="objetivo-kcal" type="number" min={1200} max={5000} step={1} value={objetivoManual} onChange={(event) => { setObjetivoManual(event.target.value); setErrorObjetivo('') }} onKeyDown={(event) => { if (event.key === 'Enter') guardarObjetivoManual() }} autoFocus className="h-14 min-w-0 flex-1 bg-transparent font-display text-2xl font-semibold text-tinta outline-none" />
              <span className="font-sans text-sm font-bold text-muted">kcal</span>
            </div>
            {errorObjetivo && <p className="mt-2 font-sans text-xs font-semibold text-coral" role="alert">{errorObjetivo}</p>}
            <button type="button" onClick={guardarObjetivoManual} className="mt-5 min-h-12 w-full rounded-control bg-coral px-5 font-sans text-sm font-bold text-white">Usar este objetivo</button>
          </Card>
        </div>
      )}

      <SiguientesPasos actual="calculadora-alimentos" />
    </div>
  )
}
