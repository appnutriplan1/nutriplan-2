import { useMemo, useState } from 'react'
import { Lock, LockOpen, Plus, RefreshCw, RotateCcw, Search, X } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Chip } from '../../components/ui/Chip'
import { esNumero } from '../../lib/numero'
import { distribuirComidas, type NumComidas, type TipoComida } from '../../lib/calculators/mealPlanDistribution'
import type { Alimento } from '../../services/alimentosService'
import { medidaCaseraBasica } from '../../lib/calculators/foodMeasures'

export interface MealBuilderItem {
  itemId: string
  alimento: Alimento
  gramos: number
}

export type ItemsPorComida = Partial<Record<TipoComida, MealBuilderItem[]>>
export type SugerenciasPorComida = Partial<Record<TipoComida, { preparacionId: string; titulo: string; descripcion: string; gramosPreparacion: number; ingredientes: Array<{ nombre: string; gramos: number | null }> }>>

interface MealPlanSelectorProps {
  kcalObjetivo: number | null
  itemsPorComida: ItemsPorComida
  sugerenciasPorComida?: SugerenciasPorComida
  onBuscarAlimento: (tipo: TipoComida) => void
  onCambiarGramos: (tipo: TipoComida, itemId: string, gramos: number) => void
  onQuitarAlimento: (tipo: TipoComida, itemId: string) => void
  onSugerirDia?: (numComidas: NumComidas, reemplazar?: boolean, comidasProtegidas?: TipoComida[]) => Promise<boolean>
  onRecomponerComida?: (tipo: TipoComida, kcalObjetivo: number) => Promise<boolean>
  onDeshacerRecomposicion?: (tipo: TipoComida) => void
  puedeDeshacer?: (tipo: TipoComida) => boolean
  onCambiarDistribucion?: () => void
}

function calcularAporte(alimento: Alimento, gramos: number) {
  const factor = gramos / 100
  return { kcal: alimento.energiaKcal * factor, proteina: alimento.proteinasG * factor, grasa: alimento.grasaG * factor, carbohidrato: alimento.carbohidratosG * factor }
}

function totalDe(items: MealBuilderItem[]) {
  return items.reduce((total, item) => {
    const aporte = calcularAporte(item.alimento, item.gramos)
    return { kcal: total.kcal + aporte.kcal, proteina: total.proteina + aporte.proteina, grasa: total.grasa + aporte.grasa, carbohidrato: total.carbohidrato + aporte.carbohidrato }
  }, { kcal: 0, proteina: 0, grasa: 0, carbohidrato: 0 })
}

function fmtGramos(valor: number) {
  return esNumero(valor) ? valor.toFixed(1) + 'g' : '—'
}

/** Cada bloque es una calculadora independiente: nunca genera comidas. */
export function MealPlanSelector({ kcalObjetivo, itemsPorComida, sugerenciasPorComida = {}, onBuscarAlimento, onCambiarGramos, onQuitarAlimento, onSugerirDia, onRecomponerComida, onDeshacerRecomposicion, puedeDeshacer, onCambiarDistribucion }: MealPlanSelectorProps) {
  const [numComidas, setNumComidas] = useState<NumComidas | null>(() => {
    const stored = Number(sessionStorage.getItem('nutriplan.food-meal-count.v1'))
    return stored === 3 || stored === 4 || stored === 5 ? stored : null
  })
  const [generando, setGenerando] = useState(false)
  const [recomponiendo, setRecomponiendo] = useState<TipoComida | null>(null)
  const [protegidas, setProtegidas] = useState<Set<TipoComida>>(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem('nutriplan.food-locked-meals.v1') || '[]')) } catch { return new Set() }
  })
  const plan = useMemo(() => (numComidas && kcalObjetivo ? distribuirComidas(kcalObjetivo, numComidas) : null), [kcalObjetivo, numComidas])

  function seleccionarCantidad(value: NumComidas) {
    onCambiarDistribucion?.()
    sessionStorage.setItem('nutriplan.food-meal-count.v1', String(value))
    setNumComidas(value)
  }

  function alternarProteccion(tipo: TipoComida) {
    setProtegidas((prev) => {
      const next = new Set(prev)
      if (next.has(tipo)) next.delete(tipo); else next.add(tipo)
      sessionStorage.setItem('nutriplan.food-locked-meals.v1', JSON.stringify([...next]))
      return next
    })
  }

  if (!kcalObjetivo) return null

  if (!numComidas) return (
    <Card padding="md" className="mb-6 border-verde/30 bg-verde/5">
      <p className="mb-1 font-sans text-xs font-bold uppercase tracking-wide text-verde">Distribuye tus kcal</p>
      <p className="mb-3 font-sans text-sm text-muted">Elige cuántas comidas haces al día para calcular cada una por separado.</p>
      <div className="flex gap-2">{[3, 4, 5].map((num) => <Chip key={num} selected={false} onClick={() => seleccionarCantidad(num as NumComidas)} className="!flex-1 !justify-center !rounded-lg !py-2 !font-bold">{num} comidas</Chip>)}</div>
    </Card>
  )

  if (!plan) return null
  const hayItems = Object.values(itemsPorComida).some((items) => (items?.length ?? 0) > 0)
  const haySugerencias = Object.keys(sugerenciasPorComida).length > 0

  return (
    <section className="mb-6 space-y-3" aria-label="Calculadoras por comida">
      <div className="flex items-center justify-between gap-3">
        <div><p className="kicker mb-1">DISTRIBUCIÓN DIARIA</p><h2 className="font-display text-xl font-semibold text-tinta">Tu día en {numComidas} comidas</h2></div>
        <button type="button" onClick={() => setNumComidas(null)} className="font-sans text-xs font-bold text-muted transition-colors hover:text-tinta">Cambiar</button>
      </div>
      <p className="font-sans text-sm text-muted">Cada comida tiene su propio cálculo. Agrega alimentos dentro de la que quieras completar.</p>
      {onSugerirDia && <button type="button" disabled={generando} onClick={async () => { setGenerando(true); await onSugerirDia(numComidas, haySugerencias, [...protegidas]); setGenerando(false) }} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-coral px-4 font-sans text-sm font-bold text-white disabled:opacity-60" data-testid="suggest-day-button">{haySugerencias && <RefreshCw size={17} />}{generando ? 'Buscando nuevas recetas…' : haySugerencias ? (protegidas.size ? 'Recomponer comidas libres' : 'Recomponer todo el día') : hayItems ? 'Completar comidas vacías con sugerencias' : 'Sugerir un día completo'}</button>}

      <div className="space-y-3">
        {plan.comidas.map((comida) => {
          const items = itemsPorComida[comida.tipo] ?? []
          const sugerencia = sugerenciasPorComida[comida.tipo]
          const total = totalDe(items)
          const porcentaje = Math.min((total.kcal / comida.kcalObjetivo) * 100, 100)
          const diferencia = comida.kcalObjetivo - total.kcal
          const completo = Math.abs(diferencia) <= comida.kcalObjetivo * 0.1
          const factorIngredientes = sugerencia?.gramosPreparacion && items[0] ? items[0].gramos / sugerencia.gramosPreparacion : 1

          return (
            <Card key={comida.tipo} padding="md" className="border-linea/60 bg-white" data-testid={'meal-' + comida.tipo}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-display text-xl font-semibold text-tinta">{comida.nombre}</p><p className="mt-1 font-sans text-xs text-muted">Objetivo: {comida.kcalObjetivo} kcal · P {comida.proteinaObjetivo}g · C {comida.carbsObjetivo}g · G {comida.grasasObjetivo}g</p></div>
                <div className="text-right"><p className="font-display text-2xl font-semibold text-verde">{Math.round(total.kcal)} <span className="font-sans text-xs font-bold text-muted">kcal</span></p><button type="button" onClick={() => alternarProteccion(comida.tipo)} aria-pressed={protegidas.has(comida.tipo)} className="mt-1 inline-flex items-center gap-1 font-sans text-[11px] font-bold text-muted hover:text-verde">{protegidas.has(comida.tipo) ? <Lock size={13} /> : <LockOpen size={13} />}{protegidas.has(comida.tipo) ? 'Conservar' : 'Se puede cambiar'}</button></div>
              </div>
              {sugerencia && <div className="mt-3 rounded-control border border-sage/25 bg-sage/5 px-3 py-2.5"><p className="font-sans text-[11px] font-bold uppercase tracking-wide text-sage">Sugerencia · porciones ajustadas</p><p className="mt-1 font-sans text-sm font-bold text-verde">{sugerencia.titulo}</p><p className="mt-0.5 font-sans text-xs leading-relaxed text-muted">{sugerencia.descripcion}</p><div className="mt-3 border-t border-sage/20 pt-2"><p className="font-sans text-[11px] font-bold uppercase tracking-wide text-verde">Ingredientes para esta porción</p><ul className="mt-1.5 grid gap-1 sm:grid-cols-2">{sugerencia.ingredientes.map((ingredient, index) => <li key={`${ingredient.nombre}-${index}`} className="flex justify-between gap-3 font-sans text-xs text-tinta"><span>{ingredient.nombre}</span><strong className="shrink-0 text-verde">{ingredient.gramos == null ? 'Según receta' : `${Math.round(ingredient.gramos * factorIngredientes * 10) / 10} g`}</strong></li>)}</ul></div></div>}
              {items.length > 0 && onRecomponerComida && <button type="button" disabled={recomponiendo === comida.tipo} onClick={async () => { setRecomponiendo(comida.tipo); await onRecomponerComida(comida.tipo, comida.kcalObjetivo); setRecomponiendo(null) }} aria-label={`Recomponer solo ${comida.nombre}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-sage/35 bg-white px-3 font-sans text-sm font-bold text-verde disabled:opacity-60"><RefreshCw size={16} />{recomponiendo === comida.tipo ? 'Recomponiendo…' : `Recomponer solo ${comida.nombre.toLowerCase()}`}</button>}
              {puedeDeshacer?.(comida.tipo) && <button type="button" onClick={() => onDeshacerRecomposicion?.(comida.tipo)} className="mt-2 inline-flex items-center gap-1.5 font-sans text-xs font-bold text-verde"><RotateCcw size={14} /> Deshacer último cambio</button>}
              {items.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 rounded-control bg-papel p-2 text-center font-sans text-[11px] text-muted"><span><strong className="block text-sm text-tinta">{fmtGramos(total.proteina)}</strong>de {comida.proteinaObjetivo}g P</span><span><strong className="block text-sm text-tinta">{fmtGramos(total.carbohidrato)}</strong>de {comida.carbsObjetivo}g C</span><span><strong className="block text-sm text-tinta">{fmtGramos(total.grasa)}</strong>de {comida.grasasObjetivo}g G</span></div>}
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-linea"><div className="h-full rounded-full bg-gradient-to-r from-mandarina to-coral transition-[width] duration-300" style={{ width: String(porcentaje) + '%' }} /></div>
              <p className="mt-2 font-sans text-xs text-muted">{completo ? 'Dentro del rango recomendado (±10 %).' : diferencia > 0 ? <>Faltan <span className="font-bold text-tinta">{Math.round(diferencia)} kcal</span> para esta comida.</> : <>Superaste esta comida por <span className="font-bold text-tinta">{Math.round(Math.abs(diferencia))} kcal</span>.</>}</p>

              {items.length > 0 && <div className="mt-4 space-y-2">{items.map((item) => {
                const aporte = calcularAporte(item.alimento, item.gramos)
                const medida = medidaCaseraBasica(item.alimento)
                return <div key={item.itemId} className="flex items-center gap-2 rounded-control bg-papel px-3 py-2.5">
                  <div className="min-w-0 flex-1"><p className="truncate font-sans text-sm font-bold text-tinta">{item.alimento.nombre}</p><p className="font-sans text-xs text-muted">{Math.round(aporte.kcal)} kcal · P {fmtGramos(aporte.proteina)} · C {fmtGramos(aporte.carbohidrato)} · G {fmtGramos(aporte.grasa)}</p>{medida && <p className="mt-1 font-sans text-[11px] font-semibold text-sage">{medida.texto}</p>}</div>
                  <div className="flex shrink-0 items-center gap-1"><input type="number" inputMode="numeric" min={0} value={item.gramos} onChange={(event) => onCambiarGramos(comida.tipo, item.itemId, Number(event.target.value))} onFocus={(event) => event.target.select()} aria-label={'Gramos de ' + item.alimento.nombre + ' en ' + comida.nombre} className="h-9 w-16 rounded-control border border-linea bg-white px-2 text-right font-sans text-sm text-tinta focus:border-verde focus:outline-none focus:ring-4 focus:ring-verde/15" /><span className="font-sans text-xs text-muted">g</span></div>
                  <button type="button" onClick={() => onQuitarAlimento(comida.tipo, item.itemId)} aria-label={'Quitar ' + item.alimento.nombre + ' de ' + comida.nombre} className="shrink-0 rounded-full p-1.5 text-muted hover:bg-white hover:text-coral"><X size={16} /></button>
                </div>
              })}</div>}

              <button type="button" onClick={() => onBuscarAlimento(comida.tipo)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-verde/25 bg-verde/5 px-4 font-sans text-sm font-bold text-verde transition-colors hover:border-verde hover:bg-verde/10">
                {items.length > 0 ? <Plus size={16} /> : <Search size={16} />} {items.length > 0 ? 'Agregar alimento' : 'Buscar alimento para ' + comida.nombre.toLowerCase()}
              </button>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
