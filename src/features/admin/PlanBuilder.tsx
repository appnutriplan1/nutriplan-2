import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpenCheck, Download, FileText, ImagePlus, Save, Search, Trash2, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CommandPalette } from '../calculadora-alimentos/CommandPalette'
import { listAlimentosReferencia, type Alimento } from '../../services/alimentosService'
import type { WeeklyCookbook, WeeklyRecipe } from '../../types/weeklyCookbook'
import { extractDocxText, extractPdfText, parsePlanText } from './planPdfImporter'

type Macro = { kcal: number; protein: number; carbs: number; fat: number }
type Distribution = { protein: number; carbs: number; fat: number }
type Ingredient = { key: string; food: Alimento; grams: number; household: string }
type Meal = { key: string; type: WeeklyRecipe['meal_type']; name: string; preparation: string; imageName: string; ingredients: Ingredient[]; targetPct: number; servings: number; tip: string; conservation: string }
type DayMeals = Record<string, Meal[]>
type PlanOption = { id: string; paciente_id: string; titulo: string }
type PatientOption = { id: string; nombre: string }
type SavedDraft = { weekStart: string; targets: Macro; distribution?: Distribution; macroMode?: 'percentage' | 'manual'; patientId: string; planId: string; days: DayMeals }
type BuildResult = { cookbook: WeeklyCookbook; includedDays: readonly string[] } | null

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const
const DRAFT_KEY = 'nutriplan.admin.plan-builder.v4'

const MEAL_PRESETS: Array<{ type: Meal['type']; name: string; pct: number }> = [
  { type: 'Desayuno', name: 'Desayuno', pct: 22 }, { type: 'Media mañana', name: 'Media mañana', pct: 10 },
  { type: 'Almuerzo', name: 'Almuerzo', pct: 33 }, { type: 'Media tarde', name: 'Media tarde', pct: 10 },
  { type: 'Cena', name: 'Cena', pct: 20 }, { type: 'Snack', name: 'Snack', pct: 5 },
]

const id = () => Math.random().toString(36).slice(2, 10)
const round = (value: number, digits = 1) => Number(value.toFixed(digits))
const slug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `preparacion-${id()}`
const fileBase64 = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = reject; reader.readAsDataURL(file) })

async function requestAdmin(action: string, payload: object) {
  const response = await fetch('/api/admin/data', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload }) })
  return await response.json().catch(() => ({ ok: false })) as { ok?: boolean; error?: string; url?: string }
}

function createMeals(count: number): Meal[] {
  const selected = count === 3 ? [MEAL_PRESETS[0], MEAL_PRESETS[2], MEAL_PRESETS[4]]
    : count === 4 ? [MEAL_PRESETS[0], MEAL_PRESETS[1], MEAL_PRESETS[2], MEAL_PRESETS[4]]
      : MEAL_PRESETS.slice(0, count)
  const total = selected.reduce((sum, item) => sum + item.pct, 0)
  let assigned = 0
  return selected.map((item, index) => {
    const targetPct = index === selected.length - 1 ? 100 - assigned : round(item.pct * 100 / total, 0)
    assigned += targetPct
    return { key: id(), type: item.type, name: '', preparation: '', imageName: '', ingredients: [], targetPct, servings: 1, tip: '', conservation: '' }
  })
}

function ingredientMacro(item: Ingredient): Macro {
  const factor = Math.max(0, item.grams) / 100
  return { kcal: item.food.energiaKcal * factor, protein: item.food.proteinasG * factor, carbs: item.food.carbohidratosG * factor, fat: item.food.grasaG * factor }
}

function mealMacro(meal: Meal): Macro {
  const total = meal.ingredients.reduce((sum, item) => { const m = ingredientMacro(item); return { kcal: sum.kcal + m.kcal, protein: sum.protein + m.protein, carbs: sum.carbs + m.carbs, fat: sum.fat + m.fat } }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })
  const servings = Math.max(1, Number(meal.servings) || 1)
  return { kcal: total.kcal / servings, protein: total.protein / servings, carbs: total.carbs / servings, fat: total.fat / servings }
}

const METRICS: Array<{ key: keyof Macro; label: string; unit: string }> = [
  { key: 'kcal', label: 'Energía', unit: 'kcal' }, { key: 'protein', label: 'Proteínas', unit: 'g' },
  { key: 'carbs', label: 'Carbohidratos', unit: 'g' }, { key: 'fat', label: 'Grasas', unit: 'g' },
]

function AdequacyGrid({ target, current, compact = false }: { target: Macro; current: Macro; compact?: boolean }) {
  return <div className={`grid gap-2 ${compact ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
    {METRICS.map(({ key, label, unit }) => {
      const objective = target[key]; const achieved = current[key]; const percent = objective > 0 ? achieved / objective * 100 : 0; const difference = achieved - objective
      const state = percent < 90 ? 'low' : percent <= 110 ? 'ok' : 'high'
      const tone = state === 'low' ? 'border-mandarina/35 bg-[#fff8e9]' : state === 'ok' ? 'border-sage/35 bg-sage/10' : 'border-coral/30 bg-coral/10'
      const detail = state === 'low' ? `Faltan ${round(Math.abs(difference), key === 'kcal' ? 0 : 1)} ${unit}` : state === 'high' ? `Excede ${round(Math.abs(difference), key === 'kcal' ? 0 : 1)} ${unit}` : 'Objetivo alcanzado'
      return <article key={key} className={`rounded-control border p-3 ${tone}`}><div className="flex items-start justify-between gap-2"><div><p className="font-sans text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p><p className="mt-1 font-sans text-sm font-bold text-tinta">{round(achieved, key === 'kcal' ? 0 : 1)} / {round(objective, key === 'kcal' ? 0 : 1)} {unit}</p></div><strong className="font-sans text-lg text-verde">{round(percent, 0)}%</strong></div><p className={`mt-2 font-sans text-xs font-bold ${state === 'high' ? 'text-coral' : state === 'ok' ? 'text-verde' : 'text-[#a56b13]'}`}>{detail}</p></article>
    })}
  </div>
}

function targetsFromDistribution(kcal: number, distribution: Distribution): Macro {
  return { kcal, protein: round(kcal * distribution.protein / 100 / 4), carbs: round(kcal * distribution.carbs / 100 / 4), fat: round(kcal * distribution.fat / 100 / 9) }
}
function distributionFromTargets(kcal: number, targets: Macro): Distribution {
  if (kcal <= 0) return { protein: 0, carbs: 0, fat: 0 }
  return { protein: round(targets.protein * 4 / kcal * 100), carbs: round(targets.carbs * 4 / kcal * 100), fat: round(targets.fat * 9 / kcal * 100) }
}

export function PlanBuilder() {
  const [day, setDay] = useState('Lunes')
  const [weekStart, setWeekStart] = useState(new Date().toISOString().slice(0, 10))
  const [distribution, setDistribution] = useState<Distribution>({ carbs: 50, protein: 20, fat: 30 })
  const [macroMode, setMacroMode] = useState<'percentage' | 'manual'>('percentage')
  const [targets, setTargets] = useState<Macro>(() => targetsFromDistribution(1450, { carbs: 50, protein: 20, fat: 30 }))
  const [days, setDays] = useState<DayMeals>(() => ({ Lunes: createMeals(5) }))
  const [patientId, setPatientId] = useState('')
  const [planId, setPlanId] = useState('')
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [photos, setPhotos] = useState<Record<string, File>>({})
  const [saving, setSaving] = useState(false)
  const [paletteFor, setPaletteFor] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [importingPdf, setImportingPdf] = useState(false)
  const meals = days[day] ?? []
  const count = meals.length || 5
  const totals = meals.reduce((sum, meal) => { const m = mealMacro(meal); return { kcal: sum.kcal + m.kcal, protein: sum.protein + m.protein, carbs: sum.carbs + m.carbs, fat: sum.fat + m.fat } }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') as SavedDraft | null
      if (!saved?.days) return
      setWeekStart(saved.weekStart); setTargets(saved.targets); setDistribution(saved.distribution || { carbs: 50, protein: 20, fat: 30 }); setMacroMode(saved.macroMode || 'manual'); setPatientId(saved.patientId || ''); setPlanId(saved.planId || ''); setDays(saved.days)
    } catch { /* Un borrador dañado no debe impedir abrir el constructor. */ }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => localStorage.setItem(DRAFT_KEY, JSON.stringify({ weekStart, targets, distribution, macroMode, patientId, planId, days } satisfies SavedDraft)), 350)
    return () => window.clearTimeout(timer)
  }, [weekStart, targets, distribution, macroMode, patientId, planId, days])

  useEffect(() => {
    void fetch('/api/admin/data', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'admin_resumen' }) })
      .then((response) => response.json()).then((data: { pacientes?: PatientOption[]; planes?: PlanOption[] }) => { setPatients(data.pacientes || []); setPlans(data.planes || []) }).catch(() => undefined)
  }, [])

  const setMeals = (updater: (current: Meal[]) => Meal[]) => setDays((current) => ({ ...current, [day]: updater(current[day] ?? createMeals(5)) }))
  const updateMeal = (key: string, patch: Partial<Meal>) => setMeals((current) => current.map((meal) => meal.key === key ? { ...meal, ...patch } : meal))
  const targetFor = (meal: Meal): Macro => ({ kcal: targets.kcal * meal.targetPct / 100, protein: targets.protein * meal.targetPct / 100, carbs: targets.carbs * meal.targetPct / 100, fat: targets.fat * meal.targetPct / 100 })
  const distributionTotal = distribution.protein + distribution.carbs + distribution.fat
  const macroEnergy = targets.protein * 4 + targets.carbs * 4 + targets.fat * 9
  const macroEnergyDifference = macroEnergy - targets.kcal
  const mealPercentageTotal = meals.reduce((sum, meal) => sum + Number(meal.targetPct || 0), 0)
  const updateKcal = (kcal: number) => {
    if (macroMode === 'percentage') setTargets(targetsFromDistribution(kcal, distribution))
    else { const next = { ...targets, kcal }; setTargets(next); setDistribution(distributionFromTargets(kcal, next)) }
  }
  const updateDistribution = (key: keyof Distribution, value: number) => {
    const next = { ...distribution, [key]: value }; setDistribution(next)
    if (macroMode === 'percentage') setTargets(targetsFromDistribution(targets.kcal, next))
  }
  const updateManualTarget = (key: keyof Distribution, value: number) => {
    const next = { ...targets, [key]: value }; setTargets(next); setDistribution(distributionFromTargets(targets.kcal, next))
  }
  const changeMacroMode = (mode: 'percentage' | 'manual') => { setMacroMode(mode); if (mode === 'percentage') setTargets(targetsFromDistribution(targets.kcal, distribution)); else setDistribution(distributionFromTargets(targets.kcal, targets)) }
  const addFood = (food: Alimento) => {
    if (!paletteFor) return
    setMeals((current) => current.map((meal) => meal.key === paletteFor ? { ...meal, ingredients: [...meal.ingredients, { key: id(), food, grams: 100, household: '' }] } : meal))
    setPaletteFor(null)
  }

  function selectDay(nextDay: string) { setDay(nextDay); setDays((current) => current[nextDay] ? current : { ...current, [nextDay]: createMeals(count) }); setMessage('') }
  function changeCount(next: number) { setMeals(() => createMeals(next)); setMessage('Se reinició la distribución de este día.') }
  function downloadTemplate() {
    const anchor = document.createElement('a'); anchor.href = '/plantilla-plan-nutriplan.docx'; anchor.download = 'plantilla-plan-nutriplan.docx'; anchor.click()
  }
  async function importPlanFile(file: File) {
    setImportingPdf(true); setMessage('Leyendo y organizando el plan…')
    try {
      const text = file.name.toLowerCase().endsWith('.docx') ? await extractDocxText(file) : await extractPdfText(file)
      const result = parsePlanText(text, await listAlimentosReferencia())
      if (!result.meals.length) { setMessage('No se reconoció el formato. Descarga la plantilla y conserva sus encabezados.'); return }
      const next: DayMeals = {}
      for (const imported of result.meals) {
        const matchedDay = DAYS.find(name => slug(name) === slug(imported.day)); if (!matchedDay) continue
        const preset = MEAL_PRESETS.find(item => slug(item.name) === slug(imported.type)) || MEAL_PRESETS[0]
        const meal: Meal = { key: id(), type: preset.type, name: imported.name, preparation: imported.preparation, imageName: '', targetPct: preset.pct, servings: imported.servings, tip: imported.tip, conservation: imported.conservation, ingredients: imported.ingredients.map(item => ({ key: id(), ...item })) }
        next[matchedDay] = [...(next[matchedDay] || []), meal]
      }
      Object.keys(next).forEach(name => { const total = next[name].reduce((sum, meal) => sum + meal.targetPct, 0); let assigned = 0; next[name] = next[name].map((meal, index) => { const pct = index === next[name].length - 1 ? 100 - assigned : round(meal.targetPct * 100 / total, 0); assigned += pct; return { ...meal, targetPct: pct } }) })
      setDays(next); setDay(Object.keys(next)[0] || 'Lunes')
      setMessage(`Se importaron ${result.meals.length} comidas. Revisa cantidades y completa las fotos.${result.unmatched.length ? ` No se reconocieron: ${result.unmatched.join(', ')}.` : ''}`)
    } catch { setMessage('No pudimos leer el archivo. Comprueba que sea un Word de la plantilla o un PDF con texto seleccionable.') } finally { setImportingPdf(false) }
  }
  function buildCookbook(): BuildResult {
    if (Math.abs(distributionTotal - 100) >= 0.2) { setMessage(`La distribución de macronutrientes suma ${round(distributionTotal)}%. Debe sumar 100%.`); return null }
    const includedDays = DAYS.filter((name) => (days[name] ?? []).some((meal) => meal.name.trim() || meal.ingredients.length || meal.preparation.trim()))
    if (!includedDays.length) { setMessage('Completa al menos un día antes de generar el plan.'); return null }
    const invalidDay = includedDays.find((name) => (days[name] ?? []).some((meal) => !meal.name.trim() || !meal.preparation.trim() || meal.ingredients.length === 0 || meal.ingredients.some((item) => item.grams <= 0) || Number(meal.servings || 0) < 1))
    if (invalidDay) { setMessage(`Completa el nombre, los ingredientes, cantidades y la preparación de todas las comidas de ${invalidDay}.`); return null }
    const invalidDistributionDay = includedDays.find((name) => Math.abs((days[name] ?? []).reduce((sum, meal) => sum + Number(meal.targetPct || 0), 0) - 100) > 0.01)
    if (invalidDistributionDay) { setMessage(`Los porcentajes de las comidas de ${invalidDistributionDay} deben sumar 100%.`); return null }
    const end = new Date(`${weekStart}T12:00:00`); end.setDate(end.getDate() + 6)
    const recipes: WeeklyRecipe[] = includedDays.flatMap((dayName) => days[dayName].map((meal, index) => { const macro = mealMacro(meal); return {
      external_id: `${slug(dayName)}-${index + 1}-${slug(meal.name)}`, title: meal.name.trim(), description: null, category: 'Plan personalizado', meal_type: meal.type, days: [dayName], image_file: meal.imageName || null, time_minutes: null, servings: Math.max(1, Number(meal.servings) || 1), difficulty: null, tags: ['plan-personalizado'],
      ingredients: meal.ingredients.map((item) => ({ name: item.food.nombre, quantity: item.grams, unit: 'g', notes: item.household.trim() || null })),
      steps: meal.preparation.split(/\n+/).map((step) => step.replace(/^\s*\d+[.)-]?\s*/, '').trim()).filter(Boolean).map((instruction, stepIndex) => ({ order: stepIndex + 1, instruction })),
      nutrition_per_serving: { kcal: round(macro.kcal), protein_g: round(macro.protein), carbs_g: round(macro.carbs), fiber_g: null, fat_g: round(macro.fat) }, nutrition_note: 'Valores por porción, calculados desde la tabla de alimentos y las cantidades totales ingresadas.', conservation: meal.conservation?.trim() || null, clinical_note: meal.tip?.trim() || null,
    } }))
    const selectedPatient = patients.find((patient) => patient.id === patientId)?.nombre
    const selectedPlan = plans.find((plan) => plan.id === planId)?.titulo
    const cookbook: WeeklyCookbook = { schema_version: '1.0', cookbook: { title: selectedPlan || `Plan semanal${selectedPatient ? ` · ${selectedPatient}` : ''}`, week_start: weekStart, week_end: end.toISOString().slice(0, 10), notes: `Objetivo: ${targets.kcal} kcal · P ${targets.protein} g · C ${targets.carbs} g · G ${targets.fat} g · Distribución C ${distribution.carbs}% / P ${distribution.protein}% / G ${distribution.fat}%${planId ? ` · plan_id: ${planId}` : ''}` }, recipes }
    return { cookbook, includedDays }
  }

  function exportJson() {
    const built = buildCookbook(); if (!built) return
    const { cookbook, includedDays } = built
    const blob = new Blob([JSON.stringify(cookbook, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${slug(cookbook.cookbook.title)}.json`; anchor.click(); URL.revokeObjectURL(url); sessionStorage.setItem('nutriplan.admin.last-plan-id', planId); setMessage(`Plan semanal generado con ${includedDays.length} día(s) y ${cookbook.recipes.length} preparaciones.`)
  }

  async function createCookbook() {
    if (!planId) { setMessage('Selecciona el paciente y el plan original antes de crear el recetario.'); return }
    const built = buildCookbook(); if (!built) return
    const missingPhotos = built.cookbook.recipes.map((recipe) => recipe.image_file).filter((name): name is string => Boolean(name && !photos[name]))
    if (missingPhotos.length) { setMessage(`Vuelve a adjuntar estas fotografías antes de crear el recetario: ${missingPhotos.join(', ')}`); return }
    setSaving(true); setMessage('Subiendo fotografías y creando el recetario…')
    try {
      const imageUrls: Record<string, string> = {}
      for (const [name, file] of Object.entries(photos)) {
        const uploaded = await requestAdmin('admin_subir_imagen_recetario', { archivo: { nombre: name, mime: file.type, base64: await fileBase64(file) } })
        if (!uploaded.ok || !uploaded.url) throw new Error('FOTO')
        imageUrls[name] = uploaded.url
      }
      const saved = await requestAdmin('admin_guardar_recetario', { recetario: { plan_id: planId, cookbook: built.cookbook, image_urls: imageUrls } })
      if (!saved.ok) throw new Error(saved.error || 'GUARDAR')
      sessionStorage.setItem('nutriplan.admin.last-plan-id', planId)
      setMessage(`Recetario creado como borrador con ${built.cookbook.recipes.length} preparaciones. Ya puedes revisarlo y publicarlo.`)
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'FOTO' ? 'No se pudo subir una fotografía. Revisa su formato y tamaño.' : 'No se pudo crear el recetario. Comprueba la conexión del panel profesional.')
    } finally { setSaving(false) }
  }

  return <main className="mx-auto min-h-svh max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
    <Link to="/admin" className="inline-flex items-center gap-2 font-sans text-sm font-bold text-verde"><ArrowLeft size={16}/> Volver al panel</Link>
    <div className="mt-7 border-b border-linea pb-7"><p className="kicker">Área profesional</p><h1 className="mt-2 font-display text-4xl font-semibold text-tinta">Constructor de planes</h1><p className="mt-3 max-w-3xl font-reading text-base text-muted">Arma cada preparación con cantidades reales. NutriPlan calcula el balance y genera el archivo del recetario.</p></div>
    <section className="mt-7 grid gap-5 rounded-card border border-linea bg-white p-5 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
      <label className="font-sans text-xs font-bold text-muted">Paciente<select value={patientId} onChange={(e)=>{setPatientId(e.target.value);setPlanId('')}} className="mt-2 h-11 w-full rounded-control border border-linea px-3 text-sm text-tinta"><option value="">Sin asociar todavía</option>{patients.map((patient)=><option key={patient.id} value={patient.id}>{patient.nombre}</option>)}</select></label>
      <label className="font-sans text-xs font-bold text-muted">PDF asociado<select value={planId} onChange={(e)=>setPlanId(e.target.value)} className="mt-2 h-11 w-full rounded-control border border-linea px-3 text-sm text-tinta"><option value="">Seleccionar después</option>{plans.filter((plan)=>!patientId||plan.paciente_id===patientId).map((plan)=><option key={plan.id} value={plan.id}>{plan.titulo}</option>)}</select></label>
      <label className="font-sans text-xs font-bold text-muted">Inicio de semana<input type="date" value={weekStart} onChange={(e)=>setWeekStart(e.target.value)} className="mt-2 h-11 w-full rounded-control border border-linea px-3 text-sm text-tinta"/></label>
      <label className="font-sans text-xs font-bold text-muted">Número de comidas<select value={count} onChange={(e)=>changeCount(Number(e.target.value))} className="mt-2 h-11 w-full rounded-control border border-linea px-3 text-sm text-tinta">{[3,4,5,6].map(n=><option key={n}>{n}</option>)}</select></label>
      <div className="border-t border-linea pt-5 sm:col-span-2 lg:col-span-4">
        <div className="flex flex-wrap items-end justify-between gap-4"><label className="font-sans text-xs font-bold text-muted">Objetivo energético<input type="number" min="0" value={targets.kcal} onChange={(e)=>updateKcal(Number(e.target.value))} className="mt-2 h-11 w-36 rounded-control border border-linea px-3 text-base font-bold text-tinta"/></label><div className="flex rounded-pill bg-papel p-1"><button type="button" onClick={()=>changeMacroMode('percentage')} className={`rounded-pill px-4 py-2 font-sans text-xs font-bold ${macroMode==='percentage'?'bg-verde text-white':'text-muted'}`}>Calcular por distribución</button><button type="button" onClick={()=>changeMacroMode('manual')} className={`rounded-pill px-4 py-2 font-sans text-xs font-bold ${macroMode==='manual'?'bg-verde text-white':'text-muted'}`}>Editar gramos</button></div></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-control bg-papel p-4"><div className="flex items-center justify-between"><div><p className="font-display text-xl font-semibold text-tinta">Distribución de macronutrientes</p><p className="mt-1 font-sans text-xs text-muted">{macroMode==='percentage'?'Edita los porcentajes':'Calculada automáticamente desde los gramos'}</p></div><strong className={`font-sans text-sm ${Math.abs(distributionTotal-100)<0.2?'text-verde':'text-coral'}`}>{round(distributionTotal)}% de 100%</strong></div><div className="mt-4 grid grid-cols-3 gap-3">{(['carbs','protein','fat'] as const).map((key)=><label key={key} className="font-sans text-[10px] font-bold uppercase text-muted">{key==='carbs'?'Carbohidratos':key==='protein'?'Proteínas':'Grasas'}<div className="mt-1 flex items-center rounded-control border border-linea bg-white px-2"><input type="number" min="0" max="100" step="0.1" disabled={macroMode==='manual'} value={distribution[key]} onChange={(e)=>updateDistribution(key,Number(e.target.value))} className="h-10 w-full bg-transparent text-sm font-bold text-tinta outline-none disabled:text-muted"/><span>%</span></div></label>)}</div>{Math.abs(distributionTotal-100)>=0.2&&<p className="mt-3 font-sans text-xs font-bold text-coral">La distribución debe sumar 100%. Diferencia: {round(distributionTotal-100)} puntos.</p>}</div>
          <div className="rounded-control border border-linea p-4"><p className="font-display text-xl font-semibold text-tinta">Gramos objetivo</p><p className="mt-1 font-sans text-xs text-muted">{macroMode==='percentage'?'Calculados automáticamente desde las kcal':'Editables; los porcentajes cambian automáticamente'}</p><div className="mt-4 grid grid-cols-3 gap-3">{(['carbs','protein','fat'] as const).map((key)=><label key={key} className="font-sans text-[10px] font-bold uppercase text-muted">{key==='carbs'?'Carbohidratos':key==='protein'?'Proteínas':'Grasas'}<div className="mt-1 flex items-center rounded-control border border-linea px-2"><input type="number" min="0" step="0.1" disabled={macroMode==='percentage'} value={targets[key]} onChange={(e)=>updateManualTarget(key,Number(e.target.value))} className="h-10 w-full bg-transparent text-sm font-bold text-tinta outline-none disabled:text-muted"/><span>g</span></div></label>)}</div>{macroMode==='manual'&&<p className={`mt-3 font-sans text-xs font-bold ${Math.abs(macroEnergyDifference)<=5?'text-verde':'text-coral'}`}>Los gramos aportan {round(macroEnergy,0)} kcal. {Math.abs(macroEnergyDifference)<=5?'Coinciden con el objetivo.':macroEnergyDifference>0?`Exceden el objetivo por ${round(macroEnergyDifference,0)} kcal.`:`Faltan ${round(Math.abs(macroEnergyDifference),0)} kcal para el objetivo.`}</p>}</div>
        </div>
      </div>
    </section>
    <section className="mt-5 rounded-card border border-verde/20 bg-white p-5 shadow-soft"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="kicker">Carga asistida</p><h2 className="mt-1 font-display text-2xl font-semibold text-tinta">Importar un plan desde Word o PDF</h2><p className="mt-2 max-w-2xl font-sans text-sm text-muted">Descarga el Word, reemplaza los ejemplos y repite los bloques para los demás días. NutriPlan reconoce días, comidas, alimentos, gramos, medidas caseras y preparación. Todo queda editable.</p></div><FileText className="text-verde" size={30}/></div><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-control border border-verde/30 px-4 py-2.5 font-sans text-sm font-bold text-verde"><Download size={16}/> Descargar plantilla Word</button><label className="inline-flex cursor-pointer items-center gap-2 rounded-control bg-verde px-4 py-2.5 font-sans text-sm font-bold text-white"><Upload size={16}/>{importingPdf?'Leyendo plan…':'Subir Word o PDF'}<input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf" disabled={importingPdf} className="sr-only" onChange={(e)=>{const file=e.target.files?.[0];if(file)void importPlanFile(file);e.target.value='' }}/></label></div></section>
    <section className="mt-5 overflow-x-auto rounded-card border border-linea bg-papel p-2"><div className="flex min-w-max gap-2">{DAYS.map((name)=>{const started=(days[name]??[]).some((meal)=>meal.name||meal.ingredients.length||meal.preparation);return <button type="button" key={name} onClick={()=>selectDay(name)} className={`rounded-control px-4 py-2.5 font-sans text-sm font-bold transition-colors ${day===name?'bg-verde text-white':started?'bg-white text-verde':'text-muted hover:bg-white'}`}>{name}{started&&day!==name?' •':''}</button>})}</div></section>
    <section className="mt-5 rounded-card bg-verde p-5 text-white shadow-soft sm:p-6"><p className="font-sans text-xs font-bold uppercase tracking-[.2em] text-mandarina">{day}</p><h2 className="mt-1 font-display text-3xl font-semibold">Objetivo del día</h2><p className="mt-2 font-sans text-sm text-white/75">{round(targets.kcal,0)} kcal · {round(targets.protein)} g proteína · {round(targets.carbs)} g carbohidratos · {round(targets.fat)} g grasas</p></section>
    <section className="mt-4 rounded-card border border-linea bg-white p-5 shadow-soft"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="kicker">Balance en vivo</p><h2 className="mt-1 font-display text-2xl font-semibold text-tinta">Total construido del día</h2></div><p className="font-sans text-xs font-bold text-muted">Adecuación frente al objetivo diario</p></div><div className="mt-4"><AdequacyGrid target={targets} current={totals}/></div></section>
    {mealPercentageTotal!==100&&<p className="mt-4 rounded-control bg-coral/10 px-4 py-3 font-sans text-sm font-bold text-coral">Los porcentajes de las comidas suman {mealPercentageTotal}%. Deben sumar 100%.</p>}
    <section className="mt-7 space-y-5">{meals.map((meal, mealIndex) => { const macro=mealMacro(meal); return <article key={meal.key} className="rounded-card border border-linea bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="kicker">{day} · comida {mealIndex+1}</p><h2 className="mt-1 font-display text-2xl font-semibold">{meal.type}</h2><p className="mt-2 font-sans text-xs font-bold text-verde">Objetivo por porción: {round(targetFor(meal).kcal,0)} kcal · P {round(targetFor(meal).protein)} g · C {round(targetFor(meal).carbs)} g · G {round(targetFor(meal).fat)} g</p></div><div className="grid grid-cols-2 gap-2 rounded-control bg-papel p-2"><label className="font-sans text-[10px] font-bold uppercase text-muted">% del día<input type="number" min="1" max="100" value={meal.targetPct} onChange={(e)=>updateMeal(meal.key,{targetPct:Number(e.target.value)})} className="mt-1 h-9 w-20 rounded-control border border-linea bg-white px-2 text-tinta"/></label><label className="font-sans text-[10px] font-bold uppercase text-muted">Porciones<input type="number" min="1" step="1" value={meal.servings ?? 1} onChange={(e)=>updateMeal(meal.key,{servings:Math.max(1,Number(e.target.value))})} className="mt-1 h-9 w-20 rounded-control border border-linea bg-white px-2 text-tinta"/></label></div></div>
      <input value={meal.name} onChange={(e)=>updateMeal(meal.key,{name:e.target.value})} placeholder="Nombre de la preparación: pollo a la plancha con camote…" className="mt-5 h-12 w-full rounded-control border border-linea px-4 font-sans text-sm outline-none focus:border-verde"/>
      <p className="mt-4 font-sans text-xs font-bold text-muted">Ingredientes y cantidades totales para {meal.servings ?? 1} porción(es)</p><div className="mt-2 space-y-2">{meal.ingredients.map((item)=><div key={item.key} className="grid grid-cols-[1fr_82px_1fr_36px] items-center gap-2 rounded-control bg-papel p-2"><span className="truncate font-sans text-sm font-semibold text-tinta">{item.food.nombre}</span><input aria-label={`Gramos de ${item.food.nombre}`} type="number" min="1" value={item.grams} onChange={(e)=>updateMeal(meal.key,{ingredients:meal.ingredients.map(i=>i.key===item.key?{...i,grams:Number(e.target.value)}:i)})} className="h-9 rounded-control border border-linea bg-white px-2 text-sm"/><input value={item.household} onChange={(e)=>updateMeal(meal.key,{ingredients:meal.ingredients.map(i=>i.key===item.key?{...i,household:e.target.value}:i)})} placeholder="Medida casera opcional" className="h-9 min-w-0 rounded-control border border-linea bg-white px-2 text-sm"/><button type="button" onClick={()=>updateMeal(meal.key,{ingredients:meal.ingredients.filter(i=>i.key!==item.key)})} aria-label="Eliminar ingrediente" className="text-coral"><Trash2 size={17}/></button></div>)}</div>
      <button type="button" onClick={()=>setPaletteFor(meal.key)} className="mt-3 inline-flex items-center gap-2 rounded-control border border-verde/30 px-4 py-2.5 font-sans text-sm font-bold text-verde"><Search size={16}/> Agregar alimento</button>
      <div className="mt-4"><p className="mb-2 font-sans text-xs font-bold uppercase tracking-wide text-muted">Adecuación de esta comida</p><AdequacyGrid target={targetFor(meal)} current={macro} compact/></div>
      <textarea value={meal.preparation} onChange={(e)=>updateMeal(meal.key,{preparation:e.target.value})} rows={5} placeholder={'Preparación, un paso por línea:\n1. Sazona el pollo…\n2. Cocina a la plancha…'} className="mt-4 w-full rounded-control border border-linea p-4 font-reading text-sm outline-none focus:border-verde"/>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="font-sans text-xs font-bold text-muted">Tip o consejo opcional<textarea value={meal.tip ?? ''} onChange={(e)=>updateMeal(meal.key,{tip:e.target.value})} rows={3} placeholder="Ej.: Puedes sustituir el camote por papa…" className="mt-2 w-full rounded-control border border-linea p-3 font-reading text-sm font-normal text-tinta outline-none focus:border-verde"/></label><label className="font-sans text-xs font-bold text-muted">Conservación opcional<textarea value={meal.conservation ?? ''} onChange={(e)=>updateMeal(meal.key,{conservation:e.target.value})} rows={3} placeholder="Ej.: Refrigerar hasta 2 días…" className="mt-2 w-full rounded-control border border-linea p-3 font-reading text-sm font-normal text-tinta outline-none focus:border-verde"/></label></div>
      <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-control border border-dashed border-verde/30 bg-papel px-4 py-3 font-sans text-xs font-bold text-verde"><ImagePlus size={18}/><span className="flex-1">{meal.imageName ? `Foto: ${meal.imageName}` : 'Adjuntar fotografía de esta preparación'}</span><Upload size={16}/><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e)=>{const file=e.target.files?.[0];if(!file)return;setPhotos((current)=>({...current,[file.name]:file}));updateMeal(meal.key,{imageName:file.name})}}/></label>
    </article>})}</section>
    <section className="mt-7 rounded-card bg-verde p-5 text-white sm:p-7"><div><p className="flex items-center gap-2 font-sans text-sm font-bold"><Save size={18}/> Borrador guardado automáticamente</p><p className="mt-2 max-w-2xl font-reading text-sm text-white/70">Adjunta aquí las fotos y crea el recetario directamente. El JSON queda disponible solo como alternativa.</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={exportJson} className="inline-flex items-center justify-center gap-2 rounded-control border border-white/30 px-5 py-3 font-sans text-sm font-bold text-white"><Download size={17}/> Descargar JSON opcional</button><button type="button" disabled={saving} onClick={()=>void createCookbook()} className="inline-flex items-center justify-center gap-2 rounded-control bg-coral px-5 py-3 font-sans text-sm font-bold text-white disabled:opacity-60"><BookOpenCheck size={18}/>{saving?'Creando recetario…':'Crear recetario'}</button></div></section>
    {message&&<p role="status" className="mt-4 rounded-control bg-papel p-4 font-sans text-sm font-bold text-verde">{message}</p>}
    <CommandPalette open={paletteFor!==null} onClose={()=>setPaletteFor(null)} onSelect={addFood}/>
  </main>
}
