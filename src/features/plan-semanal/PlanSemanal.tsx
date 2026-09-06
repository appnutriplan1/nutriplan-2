import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Download, Search, ShieldCheck, Utensils } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { getCachedWeeklyCookbook, getWeeklyCookbook } from '../../services/weeklyCookbookService'
import type { WeeklyCookbook, WeeklyRecipe } from '../../types/weeklyCookbook'
import { Skeleton } from '../../components/ui/Skeleton'
import { getLocalCookbookImageUrls, revokeLocalCookbookImageUrls } from '../../services/weeklyCookbookImageRepository'
import { listLocalCookbookRecords } from '../../services/weeklyCookbookLocalRepository'
import { PlanPdfViewer } from './PlanPdfViewer'

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const

function dateRange(start: string, end: string) {
  const format = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long' })
  return `${format.format(new Date(`${start}T12:00:00`))} — ${format.format(new Date(`${end}T12:00:00`))}`
}

function quantity(value: number | null, unit: string) {
  if (value === null) return unit
  return `${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(value)} ${unit}`
}

function RecipeDetail({ recipe, imageUrl, onClose }: { recipe: WeeklyRecipe; imageUrl: string | null; onClose: () => void }) {
  const [step, setStep] = useState<number | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())

  if (step !== null) {
    const progress = Math.round(((step + 1) / recipe.steps.length) * 100)
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#e8f3f7]">
        <header className="border-b border-verde/15 bg-white/75 px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <button type="button" onClick={() => setStep(null)} className="grid h-10 w-10 place-items-center rounded-full bg-white text-tinta" aria-label="Salir del modo cocina"><ChevronLeft size={20} /></button>
            <div className="min-w-0 flex-1"><p className="truncate font-sans text-xs font-semibold text-muted">{recipe.title}</p><p className="font-display text-base font-bold text-tinta">Paso {step + 1} de {recipe.steps.length}</p></div>
            <span className="font-sans text-xs font-bold text-verde">{progress}%</span>
          </div>
          <div className="mx-auto mt-3 h-1.5 max-w-xl overflow-hidden rounded-full bg-verde/15"><div className="h-full rounded-full bg-coral transition-all" style={{ width: `${progress}%` }} /></div>
        </header>
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-8">
          <p className="kicker !text-verde">Modo cocina · paso {step + 1}</p>
          <p className="mt-4 font-reading text-2xl font-semibold leading-relaxed text-tinta">{recipe.steps[step].instruction}</p>
        </main>
        <footer className="grid grid-cols-2 gap-3 border-t border-verde/15 bg-white/75 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur">
          <button type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, (current ?? 0) - 1))} className="inline-flex items-center justify-center gap-2 rounded-control border border-verde/25 py-3 font-sans text-sm font-bold text-verde disabled:opacity-35"><ChevronLeft size={18} /> Anterior</button>
          <button type="button" onClick={() => step === recipe.steps.length - 1 ? setStep(null) : setStep(step + 1)} className="inline-flex items-center justify-center gap-2 rounded-control bg-coral py-3 font-sans text-sm font-bold text-white">{step === recipe.steps.length - 1 ? 'Finalizar' : 'Siguiente'} {step < recipe.steps.length - 1 && <ChevronRight size={18} />}</button>
        </footer>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-crema">
      <header className="sticky top-0 z-20 border-b border-linea bg-crema/90 px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] backdrop-blur sm:pt-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3"><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white text-tinta shadow-soft" aria-label="Volver"><ArrowLeft size={19} /></button><p className="min-w-0 flex-1 truncate font-display text-lg font-bold text-tinta">{recipe.title}</p></div>
      </header>
      <main className="mx-auto max-w-2xl pb-32">
        {imageUrl && <img src={imageUrl} alt={recipe.title} className="aspect-[4/3] w-full object-cover sm:mt-5 sm:rounded-card" />}
        <div className="space-y-6 px-5 pt-6">
          <div><p className="kicker !text-verde">{recipe.meal_type}</p><h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-tinta">{recipe.title}</h1>{recipe.description && <p className="mt-3 font-reading text-base leading-relaxed text-muted">{recipe.description}</p>}</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-card-sm bg-[#e1f0f5] p-3 text-center"><Clock3 className="mx-auto text-verde" size={18} /><p className="mt-2 font-sans text-sm font-bold text-tinta">{recipe.time_minutes ?? '—'} min</p></div>
            <div className="rounded-card-sm bg-[#fff0e7] p-3 text-center"><Utensils className="mx-auto text-coral" size={18} /><p className="mt-2 font-sans text-sm font-bold text-tinta">{recipe.servings} porción{recipe.servings === 1 ? '' : 'es'}</p></div>
            <div className="rounded-card-sm bg-[#f7edcf] p-3 text-center"><ShieldCheck className="mx-auto text-mandarina" size={18} /><p className="mt-2 font-sans text-sm font-bold text-tinta">Porción fija</p></div>
          </div>
          <div className="rounded-card border border-coral/20 bg-[#fff4ec] p-4"><p className="font-sans text-sm font-semibold leading-relaxed text-tinta">Las cantidades forman parte de tu indicación nutricional. No las modifiques sin consultar a tu nutricionista.</p></div>
          <section><h2 className="font-display text-2xl font-extrabold text-tinta">Ingredientes</h2><ul className="mt-3 overflow-hidden rounded-card border border-linea bg-white">{recipe.ingredients.map((ingredient, index) => <li key={`${ingredient.name}-${index}`} className="flex gap-3 border-b border-linea px-4 py-4 last:border-0"><button type="button" onClick={() => setChecked((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next })} className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${checked.has(index) ? 'border-verde bg-verde text-white' : 'border-sage text-transparent'}`} aria-label={`Marcar ${ingredient.name}`}><Check size={14} /></button><div className={checked.has(index) ? 'opacity-45' : ''}><p className="font-sans text-sm font-bold text-tinta">{quantity(ingredient.quantity, ingredient.unit)} · {ingredient.name}</p>{ingredient.notes && <p className="mt-1 font-reading text-sm text-muted">{ingredient.notes}</p>}</div></li>)}</ul></section>
          <section><h2 className="font-display text-2xl font-extrabold text-tinta">Preparación</h2><ol className="mt-3 space-y-3">{recipe.steps.map((item) => <li key={item.order} className="flex gap-4 rounded-card-sm bg-[#e6f2f6] p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white font-sans text-sm font-extrabold text-coral">{item.order}</span><p className="font-reading text-[15px] leading-relaxed text-tinta">{item.instruction}</p></li>)}</ol></section>
          {recipe.nutrition_per_serving && <section className="rounded-card bg-tinta p-5 text-white"><p className="kicker !text-sage">Información por porción prescrita</p><div className="mt-4 grid grid-cols-5 gap-2 text-center">{[[recipe.nutrition_per_serving.kcal, 'kcal'], [recipe.nutrition_per_serving.protein_g, 'proteína'], [recipe.nutrition_per_serving.carbs_g, 'carbos'], [recipe.nutrition_per_serving.fiber_g, 'fibra'], [recipe.nutrition_per_serving.fat_g, 'grasas']].map(([value, label]) => <div key={label}><p className="font-display text-lg font-extrabold">{value ?? '—'}</p><p className="mt-1 font-sans text-[9px] uppercase text-white/60">{label}</p></div>)}</div></section>}
          {recipe.conservation && <section><h2 className="font-display text-xl font-extrabold text-tinta">Conservación</h2><p className="mt-2 font-reading text-sm leading-relaxed text-muted">{recipe.conservation}</p></section>}
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-crema/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur"><button type="button" onClick={() => setStep(0)} className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2 rounded-control bg-coral py-3.5 font-sans text-sm font-extrabold text-white"><Utensils size={18} /> Iniciar modo cocina</button></div>
    </div>
  )
}

export function PlanSemanal() {
  const { planId = '' } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedWeek = searchParams.get('week') ?? undefined
  const { planes } = useAuth()
  const [cookbook, setCookbook] = useState<WeeklyCookbook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<WeeklyRecipe | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [selectedDay, setSelectedDay] = useState<string>('Todos')
  const plan = planes.find((item) => item.id === planId)

  useEffect(() => {
    let active = true
    const cached = getCachedWeeklyCookbook(planId, requestedWeek)
    setError('')
    setCookbook(cached)
    setLoading(!cached)
    getWeeklyCookbook(planId, requestedWeek).then((result) => {
      if (!active) return
      if (result.ok) setCookbook(result.data)
      else if (!cached) setError(result.errors[0]?.message ?? 'El recetario no está disponible.')
      setLoading(false)
    })
    return () => { active = false }
  }, [planId, requestedWeek])

  useEffect(() => {
    if (import.meta.env.VITE_DATA_MODE === 'remote' || !cookbook) return
    let active = true
    let loaded: Record<string, string> = {}
    void getLocalCookbookImageUrls(planId, cookbook.cookbook.week_start).then((urls) => {
      loaded = urls
      if (active) setImageUrls(urls)
      else revokeLocalCookbookImageUrls(urls)
    }).catch(() => undefined)
    return () => { active = false; revokeLocalCookbookImageUrls(loaded) }
  }, [planId, cookbook])

  const recipes = useMemo(() => cookbook?.recipes.filter((recipe) => {
    const matchesSearch = `${recipe.title} ${recipe.category} ${recipe.meal_type}`.toLowerCase().includes(query.trim().toLowerCase())
    const matchesDay = selectedDay === 'Todos' || recipe.days.length === 0 || recipe.days.includes(selectedDay)
    return matchesSearch && matchesDay
  }) ?? [], [cookbook, query, selectedDay])
  const availableWeeks = useMemo(() => import.meta.env.VITE_DATA_MODE === 'remote' ? [] : listLocalCookbookRecords(planId).filter((record) => record.status === 'PUBLISHED'), [planId])

  const recipeImage = (recipe: WeeklyRecipe) => recipe.image_file ? imageUrls[recipe.image_file] ?? recipe.image_file : null
  if (selected) return <RecipeDetail recipe={selected} imageUrl={recipeImage(selected)} onClose={() => setSelected(null)} />
  if (loading) return <main className="mx-auto max-w-[760px] space-y-5 px-5 py-8"><Skeleton className="h-44 rounded-card" /><Skeleton className="h-12 rounded-control" /><div className="grid grid-cols-2 gap-4"><Skeleton className="aspect-[3/4] rounded-card" /><Skeleton className="aspect-[3/4] rounded-card" /></div></main>
  if (!plan) return <main className="mx-auto max-w-lg px-5 py-16 text-center"><h1 className="font-display text-3xl font-extrabold text-tinta">Plan no disponible</h1><p className="mt-3 font-reading text-muted">Este plan no pertenece a tu sesión.</p><button type="button" onClick={() => navigate('/home')} className="mt-6 rounded-control bg-coral px-6 py-3 font-sans text-sm font-bold text-white">Volver al inicio</button></main>
  if ((error || !cookbook) && plan.urlPdf) return <PlanPdfViewer />
  if (error || !cookbook) return <main className="mx-auto max-w-lg px-5 py-16 text-center"><h1 className="font-display text-3xl font-extrabold text-tinta">Recetario no disponible</h1><p className="mt-3 font-reading text-muted">{error}</p><button type="button" onClick={() => navigate('/home')} className="mt-6 rounded-control bg-coral px-6 py-3 font-sans text-sm font-bold text-white">Volver al inicio</button></main>

  return (
    <main className="mx-auto min-h-svh max-w-[760px] pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <header className="rounded-b-[32px] bg-[#dcecf2] px-5 pb-7 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:mt-6 sm:rounded-card sm:px-7">
        <button type="button" onClick={() => navigate('/home')} className="inline-flex items-center gap-2 font-sans text-xs font-bold text-verde"><ArrowLeft size={16} /> Volver</button>
        <div className="mt-8 grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <p className="kicker !text-verde">Mi plan semanal</p>
            <h1 className="mt-2 max-w-lg font-display text-4xl font-extrabold leading-tight text-tinta">{cookbook.cookbook.title}</h1>
            <p className="mt-4 inline-flex items-center gap-2 font-sans text-sm font-bold text-muted"><CalendarDays size={17} className="text-coral" /> {dateRange(cookbook.cookbook.week_start, cookbook.cookbook.week_end)}</p>
            {cookbook.cookbook.notes && <p className="mt-4 max-w-xl font-reading text-sm leading-relaxed text-muted">{cookbook.cookbook.notes}</p>}
          </div>
          {plan.urlPdf && (
            <button type="button" onClick={() => navigate(`/plan/${planId}/documento`)} className="group rounded-card border border-white/70 bg-white/80 p-4 text-left shadow-soft transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-full bg-verde text-white"><BookOpen size={19} /></span><span className="rounded-pill bg-mandarina/20 px-2.5 py-1 font-sans text-[9px] font-extrabold uppercase tracking-wider text-verde">PDF</span></div>
              <p className="mt-4 font-display text-lg font-extrabold text-tinta">Ver plan</p>
              <p className="mt-1 font-sans text-[11px] font-semibold leading-relaxed text-muted">Documento original</p>
              <p className="mt-3 inline-flex items-center gap-1.5 font-sans text-[10px] font-bold text-coral"><Download size={13} /> Compartir o descargar</p>
            </button>
          )}
        </div>
        {availableWeeks.length > 1 && <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{availableWeeks.map((record) => <button type="button" key={record.id} onClick={() => setSearchParams({ week: record.weekStart })} className={`shrink-0 rounded-pill px-4 py-2 font-sans text-xs font-bold ${record.weekStart === cookbook.cookbook.week_start ? 'bg-coral text-white' : 'bg-white/75 text-verde'}`}>{new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' }).format(new Date(`${record.weekStart}T12:00:00`))}</button>)}</div>}
      </header>
      <section className="px-5 pt-6 sm:px-0">
        <div className="mb-6">
          <div className="mb-3 flex items-baseline justify-between"><h2 className="font-display text-xl font-extrabold text-tinta">Elige tu día</h2><button type="button" onClick={() => setSelectedDay('Todos')} className={`font-sans text-xs font-bold ${selectedDay === 'Todos' ? 'text-coral' : 'text-muted'}`}>Ver toda la semana</button></div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {WEEK_DAYS.map((day) => {
              const count = cookbook.recipes.filter((recipe) => recipe.days.length === 0 || recipe.days.includes(day)).length
              const active = selectedDay === day
              return <button type="button" key={day} onClick={() => setSelectedDay(day)} className={`rounded-control border px-2 py-3 text-center transition-colors ${active ? 'border-coral bg-coral text-white' : count > 0 ? 'border-verde/20 bg-[#e5f1f5] text-tinta' : 'border-linea bg-white text-muted'}`}><span className="block font-sans text-[10px] font-extrabold uppercase tracking-wide">{day.slice(0, 3)}</span><span className={`mt-1 block font-sans text-[10px] font-semibold ${active ? 'text-white/75' : 'text-muted'}`}>{count ? `${count} receta${count === 1 ? '' : 's'}` : 'Sin receta'}</span></button>
            })}
          </div>
        </div>
        <div className="relative"><Search className="absolute left-4 top-3.5 text-sage" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en mis recetas" className="w-full rounded-control border border-linea bg-white py-3 pl-11 pr-4 font-sans text-sm text-tinta outline-none focus:border-verde" /></div>
        <div className="mt-6 flex items-end justify-between"><div><p className="kicker">Recetas prescritas</p><h2 className="mt-1 font-display text-2xl font-extrabold text-tinta">Esta semana</h2></div><span className="font-sans text-xs font-bold text-muted">{recipes.length} recetas</span></div>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">{recipes.map((recipe) => <button type="button" key={recipe.external_id} onClick={() => setSelected(recipe)} className="overflow-hidden rounded-card bg-white text-left shadow-soft transition-transform hover:-translate-y-0.5">{recipeImage(recipe) ? <img src={recipeImage(recipe) ?? ''} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" /> : <div className="aspect-[4/3] bg-[#e1f0f5]" />}<div className="p-3"><p className="font-sans text-[10px] font-extrabold uppercase tracking-wider text-coral">{recipe.meal_type}</p><h3 className="mt-1 line-clamp-2 font-display text-base font-extrabold leading-tight text-tinta">{recipe.title}</h3><p className="mt-2 font-sans text-[11px] font-semibold text-muted">{recipe.servings} porción{recipe.servings === 1 ? '' : 'es'} · cantidad fija</p></div></button>)}</div>
        {recipes.length === 0 && <div className="mt-5 rounded-card border border-linea bg-white p-8 text-center"><p className="font-display text-lg font-extrabold text-tinta">{selectedDay === 'Todos' ? 'No encontramos recetas' : `${selectedDay} no tiene recetas asignadas`}</p><p className="mt-2 font-reading text-sm text-muted">{selectedDay === 'Todos' ? 'Prueba con otro término de búsqueda.' : 'Puedes consultar otro día o ver la semana completa.'}</p></div>}
      </section>
    </main>
  )
}
