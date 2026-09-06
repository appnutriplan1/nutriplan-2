import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { generarSugerenciaEditorial, type PerfilSugerencia } from '../../lib/calculators/editorialMealGenerator'
import { generarPlanDiarioEditorial } from '../../lib/calculators/editorialDayPlanner'
import type { MomentoComidaEditorial } from '../../lib/calculators/editorialFoodLibrary'
import type { NumComidas } from '../../lib/calculators/mealPlanDistribution'
import { listAlimentosReferencia, type Alimento } from '../../services/alimentosService'

const MOMENTOS: { id: MomentoComidaEditorial; nombre: string }[] = [
  { id: 'desayuno', nombre: 'Desayuno' }, { id: 'media_mañana', nombre: 'Media mañana' },
  { id: 'almuerzo', nombre: 'Almuerzo' }, { id: 'media_tarde', nombre: 'Media tarde' }, { id: 'cena', nombre: 'Cena' },
]

export function LaboratorioSugerencias() {
  const [alimentos, setAlimentos] = useState<Alimento[]>([])
  const [momento, setMomento] = useState<MomentoComidaEditorial>('almuerzo')
  const [objetivo, setObjetivo] = useState(600)
  const [perfil, setPerfil] = useState<PerfilSugerencia>('equilibrado')
  const [rotacion, setRotacion] = useState(0)
  const [objetivoDiario, setObjetivoDiario] = useState(1800)
  const [numComidas, setNumComidas] = useState<NumComidas>(5)
  const [rotacionDia, setRotacionDia] = useState(0)
  useEffect(() => { void listAlimentosReferencia().then(setAlimentos) }, [])
  const sugerencia = useMemo(() => generarSugerenciaEditorial({ alimentos, momento, objetivoKcal: objetivo, perfil, rotacion }), [alimentos, momento, objetivo, perfil, rotacion])
  const planDiario = useMemo(() => generarPlanDiarioEditorial({ alimentos, objetivoKcal: objetivoDiario, numComidas, perfil, rotacion: rotacionDia }), [alimentos, objetivoDiario, numComidas, perfil, rotacionDia])

  return <main className="mx-auto max-w-[680px] px-5 pb-32 pt-8 sm:px-6">
    <Link to="/calculadora-alimentos" className="mb-6 inline-flex items-center gap-2 font-sans text-sm font-bold text-verde"><ArrowLeft size={18} /> Volver a la calculadora</Link>
    <p className="kicker mb-2">LABORATORIO LOCAL</p>
    <h1 className="font-display text-3xl font-semibold text-tinta">Sugerencias coherentes</h1>
    <p className="mt-2 font-sans text-sm text-muted">Prototipo interno con porciones discretas de los lotes aprobados. No está disponible en producción.</p>

    <Card padding="md" className="mt-6 border-verde/20 bg-verde/5">
      <p className="font-sans text-xs font-bold uppercase tracking-wide text-verde">Día completo</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="font-sans text-xs font-bold text-muted">Kcal diarias<input type="number" min={1200} max={3000} step={50} value={objetivoDiario} onChange={(event) => setObjetivoDiario(Number(event.target.value))} className="mt-2 h-12 w-full rounded-control border border-linea bg-white px-3 text-lg text-tinta outline-none focus:border-verde" /></label>
        <label className="font-sans text-xs font-bold text-muted">Comidas<select value={numComidas} onChange={(event) => setNumComidas(Number(event.target.value) as NumComidas)} className="mt-2 h-12 w-full rounded-control border border-linea bg-white px-3 text-sm text-tinta"><option value={3}>3 comidas</option><option value={4}>4 comidas</option><option value={5}>5 comidas</option></select></label>
        <label className="col-span-2 font-sans text-xs font-bold text-muted sm:col-span-1">Perfil<select value={perfil} onChange={(event) => setPerfil(event.target.value as PerfilSugerencia)} className="mt-2 h-12 w-full rounded-control border border-linea bg-white px-3 text-sm text-tinta"><option value="equilibrado">Equilibrado</option><option value="alta_proteina">Alta proteína</option></select></label>
      </div>
    </Card>

    {planDiario ? <section className="mt-5 space-y-3" data-testid="editorial-day-plan">
      <div className="flex items-end justify-between gap-3"><div><p className="kicker mb-1">PROPUESTA DEL DÍA</p><h2 className="font-display text-2xl font-semibold text-tinta">{planDiario.kcal} kcal en {numComidas} comidas</h2></div><p className="font-sans text-xs font-bold text-sage">{planDiario.diferenciaKcal >= 0 ? '+' : ''}{planDiario.diferenciaKcal} kcal</p></div>
      {planDiario.comidas.map((comida) => <Card key={comida.momento} padding="md" className="bg-white" data-day-meal={comida.momento}>
        <div className="flex items-start justify-between gap-3"><div><p className="font-sans text-xs font-bold uppercase tracking-wide text-sage">{comida.momento.replace('_', ' ')}</p><h3 className="mt-1 font-display text-lg font-semibold text-tinta">{comida.titulo}</h3></div><p className="shrink-0 font-sans text-sm font-bold text-verde">{comida.kcal} kcal</p></div>
        <div className="mt-3 flex flex-wrap gap-2">{comida.componentes.map((item) => <span key={item.id} data-day-component-id={item.id} data-day-component-role={item.rol} className="rounded-pill bg-papel px-3 py-1.5 font-sans text-xs text-tinta">{item.medidaCasera} de {item.nombre}</span>)}</div>
      </Card>)}
      {!planDiario.valido && <Card padding="md" className="border-mandarina/30 bg-mandarina/10"><p className="font-sans text-xs font-bold uppercase tracking-wide text-tinta">Propuesta rechazada por el control</p><ul className="mt-2 list-disc space-y-1 pl-5 font-sans text-xs text-muted">{planDiario.observaciones.map((observacion) => <li key={observacion}>{observacion}</li>)}</ul></Card>}
      <button type="button" onClick={() => setRotacionDia((actual) => actual + 1)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-coral px-4 font-sans text-sm font-bold text-white"><RefreshCw size={16} /> Generar otro día completo</button>
    </section> : <Card padding="md" className="mt-5 border-mandarina/30 bg-mandarina/10"><p className="font-sans text-sm text-tinta">No encontramos un día completo que supere todas las reglas con esta configuración. No se rellenarán calorías arbitrariamente.</p></Card>}

    <div className="my-9 border-t border-linea" />
    <p className="kicker mb-2">PRUEBA POR COMIDA</p>

    <Card padding="md" className="mt-3 bg-white">
      <label className="font-sans text-xs font-bold uppercase tracking-wide text-muted">Momento</label>
      <div className="mt-2 flex flex-wrap gap-2">{MOMENTOS.map((item) => <button key={item.id} onClick={() => { setMomento(item.id); setRotacion(0) }} className={`rounded-pill px-3 py-2 font-sans text-xs font-bold ${momento === item.id ? 'bg-verde text-white' : 'bg-papel text-tinta'}`}>{item.nombre}</button>)}</div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="font-sans text-xs font-bold text-muted">Objetivo kcal<input type="number" min={100} max={1200} step={10} value={objetivo} onChange={(event) => setObjetivo(Number(event.target.value))} className="mt-2 h-12 w-full rounded-control border border-linea bg-crema px-3 text-lg text-tinta outline-none focus:border-verde" /></label>
        <label className="font-sans text-xs font-bold text-muted">Perfil<select value={perfil} onChange={(event) => setPerfil(event.target.value as PerfilSugerencia)} className="mt-2 h-12 w-full rounded-control border border-linea bg-crema px-3 text-sm text-tinta outline-none focus:border-verde"><option value="equilibrado">Equilibrado</option><option value="alta_proteina">Alta proteína</option></select></label>
      </div>
    </Card>

    {sugerencia ? <Card padding="lg" className="mt-5 border-verde/20 bg-papel" data-testid="editorial-suggestion">
      <div className="flex items-start justify-between gap-4"><div><p className="font-sans text-xs font-bold uppercase tracking-wide text-sage">{sugerencia.formato}</p><h2 className="mt-1 font-display text-2xl font-semibold text-tinta">{sugerencia.titulo}</h2></div><div className="text-right"><p className="font-display text-2xl font-semibold text-verde">{sugerencia.kcal}</p><p className="font-sans text-xs text-muted">de {objetivo} kcal</p></div></div>
      <div className="mt-5 space-y-2">{sugerencia.componentes.map((item) => <div key={item.id} data-component-id={item.id} data-component-role={item.rol} className="rounded-control bg-white px-4 py-3"><div className="flex justify-between gap-3"><div><p className="font-sans text-sm font-bold text-tinta">{item.nombre}</p><p className="mt-1 font-sans text-xs text-muted">{item.medidaCasera} · {item.gramos} g</p></div><p className="font-sans text-sm font-bold text-verde">{Math.round(item.kcal)} kcal</p></div></div>)}</div>
      <div className={`mt-4 flex items-start gap-2 rounded-control px-3 py-2 font-sans text-xs ${sugerencia.dentroDeTolerancia ? 'bg-sage/10 text-verde' : 'bg-mandarina/15 text-tinta'}`}><ShieldCheck size={16} className="shrink-0" />{sugerencia.dentroDeTolerancia ? `Dentro de la tolerancia: ${sugerencia.diferenciaKcal >= 0 ? '+' : ''}${sugerencia.diferenciaKcal} kcal.` : sugerencia.advertencias[0]}</div>
      <button type="button" onClick={() => setRotacion((actual) => actual + 1)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-coral px-4 font-sans text-sm font-bold text-white"><RefreshCw size={16} /> Probar otra combinación</button>
    </Card> : <Card padding="md" className="mt-5"><p className="font-sans text-sm text-muted">No existe una propuesta válida para esta configuración.</p></Card>}
  </main>
}
