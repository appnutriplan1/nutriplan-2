import { Plus, Search, Trash2, X } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { esNumero } from '../../lib/numero'
import { medidaCaseraBasica } from '../../lib/calculators/foodMeasures'
import type { MealBuilderItem } from './MealPlanSelector'

interface FreeFoodCalculatorProps {
  items: MealBuilderItem[]
  onBuscarAlimento: () => void
  onCambiarGramos: (itemId: string, gramos: number) => void
  onQuitarAlimento: (itemId: string) => void
  onLimpiar: () => void
}

function calcularAporte(item: MealBuilderItem) {
  const factor = item.gramos / 100
  return {
    kcal: item.alimento.energiaKcal * factor,
    proteina: item.alimento.proteinasG * factor,
    carbohidrato: item.alimento.carbohidratosG * factor,
    grasa: item.alimento.grasaG * factor,
  }
}

function fmt(valor: number, unidad = 'g') {
  return esNumero(valor) ? `${valor.toFixed(1)}${unidad}` : '—'
}

export function FreeFoodCalculator({ items, onBuscarAlimento, onCambiarGramos, onQuitarAlimento, onLimpiar }: FreeFoodCalculatorProps) {
  const total = items.reduce((acc, item) => {
    const aporte = calcularAporte(item)
    return {
      kcal: acc.kcal + aporte.kcal,
      proteina: acc.proteina + aporte.proteina,
      carbohidrato: acc.carbohidrato + aporte.carbohidrato,
      grasa: acc.grasa + aporte.grasa,
    }
  }, { kcal: 0, proteina: 0, carbohidrato: 0, grasa: 0 })

  return (
    <section aria-label="Calculadora libre de alimentos" className="space-y-4">
      <Card padding="md" className="border-sage/30 bg-sage/5">
        <p className="kicker mb-1">CÁLCULO LIBRE</p>
        <h2 className="font-display text-2xl font-semibold text-tinta">Combina los alimentos que quieras</h2>
        <p className="mt-2 font-sans text-sm leading-relaxed text-muted">Este cálculo es independiente: no usa grupos, no exige un objetivo y no modifica tus comidas del día.</p>
        <button type="button" onClick={onBuscarAlimento} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-coral px-4 font-sans text-sm font-bold text-white">
          {items.length ? <Plus size={17} /> : <Search size={17} />} {items.length ? 'Agregar otro alimento' : 'Buscar un alimento'}
        </button>
      </Card>

      {items.length > 0 && (
        <>
          <div className="space-y-2">
            {items.map((item) => {
              const aporte = calcularAporte(item)
              const medida = medidaCaseraBasica(item.alimento)
              const valor = medida ? item.gramos / medida.gramos : item.gramos
              return (
                <Card key={item.itemId} padding="sm" className="border-linea/70 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-sm font-bold text-tinta">{item.alimento.nombre}</p>
                      <p className="mt-0.5 font-sans text-xs text-muted">{Math.round(aporte.kcal)} kcal · P {fmt(aporte.proteina)} · C {fmt(aporte.carbohidrato)} · G {fmt(aporte.grasa)}</p>
                    </div>
                    <label className="flex shrink-0 items-center gap-1">
                      <span className="sr-only">{medida ? 'Unidades' : 'Gramos'} de {item.alimento.nombre}</span>
                      <input type="number" inputMode="decimal" min={0} step={medida ? 1 : 1} value={Number(valor.toFixed(1))} onFocus={(event) => event.target.select()} onChange={(event) => onCambiarGramos(item.itemId, Math.max(Number(event.target.value), 0) * (medida?.gramos ?? 1))} className="h-10 w-20 rounded-control border border-linea bg-papel px-2 text-right font-sans text-sm font-bold text-tinta focus:border-verde focus:outline-none focus:ring-4 focus:ring-verde/10" />
                      <span className="font-sans text-xs font-bold text-muted">{medida ? 'un.' : 'g'}</span>
                    </label>
                    <button type="button" onClick={() => onQuitarAlimento(item.itemId)} aria-label={`Quitar ${item.alimento.nombre}`} className="rounded-full p-2 text-muted hover:bg-papel hover:text-coral"><X size={16} /></button>
                  </div>
                  {medida && <p className="mt-2 font-sans text-[11px] font-semibold text-sage">{medida.texto} · {Math.round(item.gramos)} g en total</p>}
                </Card>
              )
            })}
          </div>

          <Card padding="md" className="border-verde/20 bg-verde text-crema">
            <div className="flex items-start justify-between gap-4">
              <div><p className="font-sans text-xs font-bold uppercase tracking-wide text-crema/65">Total de esta combinación</p><p className="mt-1 font-display text-4xl font-semibold">{Math.round(total.kcal)} <span className="font-sans text-sm">kcal</span></p></div>
              <button type="button" onClick={onLimpiar} className="inline-flex items-center gap-1.5 rounded-full border border-crema/25 px-3 py-2 font-sans text-xs font-bold text-crema"><Trash2 size={14} /> Limpiar</button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-crema/20 pt-4 text-center font-sans">
              <div><strong className="block text-base">{fmt(total.proteina)}</strong><span className="text-xs text-crema/70">Proteína</span></div>
              <div><strong className="block text-base">{fmt(total.carbohidrato)}</strong><span className="text-xs text-crema/70">Carbos</span></div>
              <div><strong className="block text-base">{fmt(total.grasa)}</strong><span className="text-xs text-crema/70">Grasas</span></div>
            </div>
          </Card>
        </>
      )}
    </section>
  )
}
