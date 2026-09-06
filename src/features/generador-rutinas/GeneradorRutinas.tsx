import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Circle, Clipboard, Dumbbell, RefreshCw, Save, Share2, Sparkles } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useToast } from '../../context/useToast'
import { SiguientesPasos } from '../../components/EmbudoValor/SiguientesPasos'
import { beginnerMuscleGroups, construirRutina, dayChoices, methodOptions, muscleCatalog, muscleSelectionLimit, type Rutina, type RespuestaRutina } from '../../lib/routineBuilder'

type Key = keyof RespuestaRutina
type Option = { id: string; title: string; text: string; muscles?: string[] }
type Step = { key: Key; question: string; helper?: string; options: Option[]; multiple?: boolean }

const OBJECTIVES: Option[] = [
  { id: 'bajar_grasa', title: 'Bajar grasa y tonificar', text: 'Más repeticiones y descansos breves.' },
  { id: 'ganar_musculo', title: 'Ganar fuerza y masa', text: 'Volumen progresivo y técnica controlada.' },
  { id: 'salud_general', title: 'Sentirme mejor y moverme más', text: 'Movimientos básicos y constancia.' },
]
const LEVELS: Option[] = [
  { id: 'nunca', title: 'Nunca entrené', text: 'Grupos amplios, ejercicios básicos y técnica primero.' },
  { id: 'principiante', title: 'Principiante', text: 'Menos de seis meses; volumen inicial.' },
  { id: 'intermedio', title: 'Intermedio', text: 'Ya conoces los músculos y los movimientos básicos.' },
  { id: 'avanzado', title: 'Avanzado', text: 'Experiencia sólida y mayor volumen controlado.' },
]
const DAYS: Option[] = dayChoices.map((days) => ({
  id: String(days),
  title: days === 1 ? 'Una sesión' : `${days} días por semana`,
  text: days === 1 ? 'Tú eliges uno o varios músculos.' : 'La app separa y distribuye automáticamente los músculos.',
}))
const EQUIPMENT: Option[] = [
  { id: 'gimnasio', title: 'Gimnasio completo', text: 'Máquinas, barras, mancuernas y bandas.' },
  { id: 'mancuernas', title: 'Mancuernas', text: 'Mancuernas más movimientos de peso corporal.' },
  { id: 'bandas', title: 'Bandas elásticas', text: 'Bandas más movimientos de peso corporal.' },
  { id: 'peso_corporal', title: 'Peso corporal y apoyos básicos', text: 'Puede requerir pared, banco, barra fija o apoyo estable.' },
]
const SAFETY: Option[] = [
  { id: 'ninguna', title: 'Ninguna', text: 'Me siento bien para actividad física general.' },
  { id: 'dolor', title: 'Tengo dolor', text: 'Actual o persistente.' },
  { id: 'lesion', title: 'Lesión o cirugía reciente', text: 'Necesita revisión profesional.' },
  { id: 'embarazo_postparto', title: 'Embarazo o postparto', text: 'Necesita acompañamiento profesional.' },
  { id: 'condicion_medica', title: 'Condición médica', text: 'Por seguridad, consulta antes.' },
  { id: 'otra', title: 'Otra situación', text: 'Te orientaremos a una consulta.' },
]
const WHATSAPP = import.meta.env.VITE_WHATSAPP_LINK || 'https://wa.me/51999999999'
const consultationLink = () => `${WHATSAPP}${WHATSAPP.includes('?') ? '&' : '?'}text=${encodeURIComponent('Hola, quisiera una rutina de ejercicio personalizada con seguimiento.')}`

function muscleOptions(level?: string): Option[] {
  if (level === 'nunca') {
    const groups = beginnerMuscleGroups.map((group) => ({ id: group.id, title: group.label, text: 'Selección agrupada para comenzar.', muscles: group.muscles }))
    const basics = muscleCatalog.filter((item) => ['Pecho', 'Espalda', 'Hombros', 'Abdomen'].includes(item.id))
    return [...groups, ...basics.map((item) => ({ id: item.id, title: item.label, text: 'Grupo muscular.', muscles: [item.id] }))]
  }
  return muscleCatalog.map((item) => ({ id: item.id, title: item.label, text: `${item.tren === 'superior' ? 'Tren superior' : item.tren === 'inferior' ? 'Tren inferior' : 'Zona media'} · músculo ${item.tamano}.`, muscles: [item.id] }))
}

function stepsFor(answer: Partial<RespuestaRutina>): Step[] {
  const steps: Step[] = [
    { key: 'objetivo', question: '¿Cuál es tu objetivo?', options: OBJECTIVES },
    { key: 'nivel', question: '¿Cuál es tu nivel de entrenamiento?', options: LEVELS },
    { key: 'dias', question: '¿Cuántos días quieres entrenar?', helper: 'Con una sesión eliges los músculos. Con 3, 4, 5 o 6 días, los distribuimos automáticamente.', options: DAYS },
  ]
  if (answer.dias === '1') steps.push({ key: 'musculos', question: '¿Qué músculos quieres entrenar?', helper: 'Puedes seleccionar uno, dos o varios.', options: muscleOptions(answer.nivel), multiple: true })
  if (answer.dias && answer.dias !== '1') steps.push({ key: 'metodo', question: '¿Cómo quieres distribuir la semana?', helper: 'El nivel ajusta el volumen y la intensidad; no bloquea ningún método. Si dudas, elige Recomendado.', options: methodOptions(Number(answer.dias)) })
  steps.push(
    { key: 'equipo', question: '¿Con qué equipamiento entrenas?', options: EQUIPMENT },
    { key: 'seguridad', question: 'Antes de continuar, ¿hay alguna alerta de salud?', options: SAFETY },
  )
  return steps
}

function RoutineResult({ routine, onRegenerate, regeneration, adminAction, selectable = false, selected, onToggle }: { routine: Rutina; onRegenerate: () => void; regeneration: number; adminAction?: ReactNode; selectable?: boolean; selected?: Set<string>; onToggle?: (key: string) => void }) {
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator.share === 'function'
  const text = `${routine.nombre}\n${routine.dias.map((day) => `${day.nombre}\n${day.ejercicios.map((item) => `• ${item.grupo_muscular}: ${item.nombre} — ${item.series} × ${item.reps}`).join('\n')}`).join('\n\n')}`
  async function share() { if (canShare) await navigator.share({ title: routine.nombre, text }); else { await navigator.clipboard.writeText(text); setCopied(true) } }
  return <>
    <section className="rounded-card bg-verde p-6 text-crema shadow-cover sm:p-8">
      <p className="kicker !text-mandarina">Tu punto de partida</p>
      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">{routine.nombre}</h1>
      <div className="mt-5 grid grid-cols-2 gap-2 font-sans text-xs sm:grid-cols-4">{[[routine.nivel, 'Nivel'], [routine.frecuencia, 'Frecuencia'], [routine.duracion_por_sesion, 'Sesión'], [routine.equipamiento, 'Equipo']].map(([value, label]) => <div key={label} className="rounded-control bg-white/10 p-3"><p className="text-crema/65">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}</div>
    </section>
    <div className="mt-7 space-y-4">{routine.dias.map((day, dayIndex) => <Card key={day.nombre} padding="md">
      <h2 className="font-display text-2xl font-semibold text-tinta">{day.nombre}</h2>
      <p className="mt-1 font-sans text-xs font-medium text-sage">{day.enfoque}</p>
      <div className="mt-4 space-y-3">{day.ejercicios.map((item) => { const key = `${dayIndex}:${item.exercise_id}`; const checked = selected?.has(key) ?? true; return <div key={item.exercise_id} className={`rounded-control border p-3 transition ${selectable && checked ? 'border-verde bg-sage/10' : 'border-linea bg-papel/50'}`}>
        <div className="flex justify-between gap-3"><div className="flex gap-3">{selectable && <button type="button" onClick={() => onToggle?.(key)} aria-label={`${checked ? 'Quitar' : 'Seleccionar'} ${item.nombre}`} className="mt-0.5 shrink-0 text-verde">{checked ? <CheckCircle2 size={21}/> : <Circle size={21}/>}</button>}<div><p className="mb-1 font-sans text-[10px] font-bold uppercase tracking-wider text-sage">{item.grupo_muscular}</p><h3 className="font-sans text-sm font-semibold text-tinta">{item.nombre}</h3></div></div><p className="shrink-0 text-right font-sans text-xs font-semibold text-verde">{item.series} × {item.reps}<br /><span className="font-normal text-muted">Descanso {item.descanso_segundos}s</span></p></div>
        <p className="mt-2 font-sans text-xs leading-relaxed text-muted">{item.notas}</p>
      </div>})}</div>
    </Card>)}</div>
    <Card padding="md" className="mt-4"><p className="font-sans text-sm font-semibold text-verde">Antes y después</p><p className="mt-2 font-sans text-sm text-muted"><strong>Calentamiento:</strong> {routine.calentamiento}</p><p className="mt-2 font-sans text-sm text-muted"><strong>Enfriamiento:</strong> {routine.enfriamiento}</p><ul className="mt-3 space-y-1 font-sans text-xs text-muted">{routine.recomendaciones.map((item) => <li key={item}>• {item}</li>)}</ul></Card>
    <div className="mt-5 grid gap-3 sm:grid-cols-2"><Button variant="secondary" size="lg" onClick={onRegenerate} leftIcon={<RefreshCw size={18} />}>Regenerar variante {regeneration > 0 ? `(${regeneration})` : ''}</Button><Button variant="secondary" size="lg" onClick={() => void share()} leftIcon={canShare ? <Share2 size={18} /> : <Clipboard size={18} />}>{copied ? 'Rutina copiada' : canShare ? 'Compartir rutina' : 'Copiar rutina'}</Button></div>
    {adminAction}
  </>
}

export function GeneradorRutinas() {
  const location = useLocation()
  const adminMode = location.pathname.startsWith('/admin/')
  const requestedPatient = new URLSearchParams(location.search).get('patient') || ''
  const [step, setStep] = useState(0)
  const [answer, setAnswer] = useState<Partial<RespuestaRutina>>({})
  const [status, setStatus] = useState<'formulario' | 'resultado' | 'seguridad' | 'error'>('formulario')
  const [routine, setRoutine] = useState<Rutina | null>(null)
  const [message, setMessage] = useState('')
  const [regeneration, setRegeneration] = useState(0)
  const [patients, setPatients] = useState<Array<{ id: string; nombre: string }>>([])
  const [patientId, setPatientId] = useState('')
  const [weekStart, setWeekStart] = useState(() => new Date().toISOString().slice(0, 10))
  const [weekEnd, setWeekEnd] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set())
  const { addToast } = useToast()
  const steps = useMemo(() => stepsFor(answer), [answer])
  const index = Math.min(step, steps.length - 1)
  const current = steps[index]
  const selectedMuscles = answer.musculos ?? []
  const ready = current.multiple ? selectedMuscles.length > 0 : Boolean(answer[current.key])

  useEffect(() => {
    if (!adminMode) return
    void fetch('/api/admin/data', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'admin_resumen' }) })
      .then((response) => response.json()).then((data: { pacientes?: Array<{ id: string; nombre: string }> }) => { setPatients(data.pacientes ?? []); if (requestedPatient) setPatientId(requestedPatient) })
      .catch(() => addToast({ type: 'error', title: 'No se cargaron los pacientes', message: 'Regresa al panel e inténtalo nuevamente.' }))
  }, [adminMode, addToast, requestedPatient])

  async function assignRoutine() {
    if (!routine || !patientId || !weekStart) return
    const filteredRoutine = { ...routine, dias: routine.dias.map((day, dayIndex) => ({ ...day, ejercicios: day.ejercicios.filter((item) => selectedExercises.has(`${dayIndex}:${item.exercise_id}`)) })).filter((day) => day.ejercicios.length > 0) }
    if (!filteredRoutine.dias.length) return addToast({ type: 'warning', title: 'Selecciona ejercicios', message: 'Elige al menos un ejercicio antes de asignar la rutina.' })
    setAssigning(true)
    try {
      const response = await fetch('/api/admin/data', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'admin_guardar_rutina', payload: { rutina: { paciente_id: patientId, fecha_inicio: weekStart, fecha_fin: weekEnd, ...filteredRoutine } } }) })
      const result = await response.json().catch(() => ({})) as { ok?: boolean; error?: string }
      if (!response.ok || !result.ok) throw new Error(result.error || 'NO_SE_PUDO_ASIGNAR')
      addToast({ type: 'success', title: 'Rutina asignada', message: 'Ya aparece en Movimiento para esta paciente.', duration: 5000 })
    } catch (error) {
      addToast({ type: 'error', title: 'No se pudo asignar', message: error instanceof Error ? error.message : 'Inténtalo nuevamente.' })
    } finally { setAssigning(false) }
  }

  function optionSelected(option: Option) {
    if (!current.multiple) return answer[current.key] === option.id
    const muscles = option.muscles ?? [option.id]
    return muscles.every((muscle) => selectedMuscles.includes(muscle))
  }
  function choose(option: Option) {
    if (current.multiple) {
      const muscles = option.muscles ?? [option.id]
      const allSelected = muscles.every((muscle) => selectedMuscles.includes(muscle))
      const next = allSelected ? selectedMuscles.filter((muscle) => !muscles.includes(muscle)) : [...new Set([...selectedMuscles, ...muscles])]
      if (next.length > muscleSelectionLimit(answer.nivel)) {
        addToast({ type: 'warning', title: 'Demasiados músculos para una sesión', message: `Puedes seleccionar hasta ${muscleSelectionLimit(answer.nivel)} para mantener una rutina realizable.`, duration: 4000 })
        return
      }
      setAnswer((previous) => ({ ...previous, musculos: next }))
      return
    }
    setAnswer((previous) => {
      const next = { ...previous, [current.key]: option.id }
      if (current.key === 'nivel') delete next.musculos
      if (current.key === 'dias') { delete next.metodo; if (option.id !== '1') delete next.musculos }
      return next
    })
  }
  function generate(nextRegeneration = 0) {
    if (answer.seguridad !== 'ninguna') { setStatus('seguridad'); return }
    const result = construirRutina(answer as RespuestaRutina, nextRegeneration)
    if (!result.rutina) { setMessage('No encontramos suficientes ejercicios compatibles para todos los músculos elegidos y ese equipamiento. Prueba otro equipo o una selección menor.'); setStatus('error'); return }
    setRoutine(result.rutina); setSelectedExercises(new Set(result.rutina.dias.flatMap((day, dayIndex) => day.ejercicios.map((item) => `${dayIndex}:${item.exercise_id}`)))); setRegeneration(nextRegeneration); setStatus('resultado')
    addToast({ type: 'success', title: 'Tu rutina está lista', message: `${result.rutina.frecuencia} • ${result.rutina.duracion_por_sesion}`, duration: 4500 })
  }
  function continueFlow() { if (!ready) return; if (index < steps.length - 1) { setStep(index + 1); return } generate(0) }
  function restart() { setStep(0); setAnswer({}); setRoutine(null); setMessage(''); setRegeneration(0); setStatus('formulario') }

  return <main className="mx-auto min-h-svh max-w-[720px] px-5 pb-28 pt-8 sm:min-h-[calc(100svh-73px)] sm:px-7 sm:pb-16">
    {adminMode && <><Link to="/admin" className="mb-7 inline-flex min-h-11 items-center gap-2 rounded-control border border-linea bg-white px-4 font-sans text-sm font-bold text-verde shadow-soft"><ArrowLeft size={18} /> Volver al panel</Link><section className="mb-7 rounded-card border border-verde/20 bg-papel p-5 shadow-soft"><p className="kicker">Área profesional · Movimiento</p><h1 className="mt-2 font-display text-3xl font-semibold text-tinta">Asignar una rutina</h1><p className="mt-2 font-sans text-sm text-muted">Elige primero la paciente y la vigencia. Después construye la rutina normalmente.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><select value={patientId} onChange={(event) => setPatientId(event.target.value)} className="h-12 rounded-control border border-linea bg-white px-3 font-sans text-sm"><option value="">Selecciona paciente</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.nombre}</option>)}</select><label className="font-sans text-[11px] font-bold text-muted">Desde<input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="mt-1 h-9 w-full rounded-control border border-linea bg-white px-3" /></label><label className="font-sans text-[11px] font-bold text-muted">Hasta (opcional)<input type="date" min={weekStart} value={weekEnd} onChange={(event) => setWeekEnd(event.target.value)} className="mt-1 h-9 w-full rounded-control border border-linea bg-white px-3" /></label></div></section></>}
    {status === 'formulario' && <>
      <p className="kicker">RUTINAS GRATUITAS</p>
      <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-tinta">Construye tu semana de entrenamiento</h1>
      <p className="mt-3 max-w-lg font-sans text-sm leading-relaxed text-muted">Elige los días. Para una sola sesión tú seleccionas los músculos; para una semana completa los separamos y distribuimos por ti.</p>
      <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-linea"><div className="h-full bg-coral transition-all" style={{ width: `${((index + 1) / steps.length) * 100}%` }} /></div>
      <p className="mt-3 font-sans text-xs font-semibold text-muted">Paso {index + 1} de {steps.length}</p>
      <h2 className="mt-8 font-display text-2xl font-semibold text-tinta">{current.question}</h2>
      {current.helper && <p className="mt-2 font-sans text-sm text-muted">{current.helper}</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{current.options.map((option) => <button key={option.id} type="button" onClick={() => choose(option)} className={`min-h-20 rounded-card-sm border p-4 text-left transition-colors ${optionSelected(option) ? 'border-verde bg-papel ring-2 ring-verde/20' : 'border-linea bg-crema hover:border-sage'}`}>
        <p className="font-sans text-sm font-semibold text-tinta">{option.title}</p><p className="mt-1 font-sans text-xs leading-relaxed text-muted">{option.text}</p>
      </button>)}</div>
      {current.multiple && <p className="mt-4 font-sans text-xs font-semibold text-verde">{selectedMuscles.length} músculo{selectedMuscles.length === 1 ? '' : 's'} seleccionado{selectedMuscles.length === 1 ? '' : 's'} · máximo {muscleSelectionLimit(answer.nivel)}</p>}
      <div className="mt-7 flex gap-3"><Button variant="ghost" size="lg" disabled={index === 0} onClick={() => setStep(Math.max(0, index - 1))} leftIcon={<ArrowLeft size={18} />}>Anterior</Button><Button variant="cta" size="lg" className="flex-1" disabled={!ready} onClick={continueFlow} rightIcon={<ChevronRight size={18} />}>{index === steps.length - 1 ? 'Ver mi rutina' : 'Siguiente'}</Button></div>
    </>}
    {status === 'resultado' && routine && <><RoutineResult routine={routine} regeneration={regeneration} onRegenerate={() => generate(regeneration + 1)} selectable={adminMode} selected={selectedExercises} onToggle={(key) => setSelectedExercises((previous) => { const next = new Set(previous); if (next.has(key)) next.delete(key); else next.add(key); return next })} adminAction={adminMode ? <Button variant="cta" size="lg" className="mt-4 w-full" disabled={!patientId || !weekStart || assigning || selectedExercises.size === 0} onClick={() => void assignRoutine()} leftIcon={<Save size={18} />}>{assigning ? 'Asignando…' : `Asignar ${selectedExercises.size} ejercicio${selectedExercises.size === 1 ? '' : 's'} a la paciente`}</Button> : undefined} /><Button variant="ghost" size="md" className="mt-4 w-full" onClick={restart}>Crear otra rutina</Button></>}
    {(status === 'seguridad' || status === 'error') && <Card padding="lg" className="mt-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-papel text-coral"><AlertTriangle size={26} /></div><h1 className="mt-5 font-display text-3xl font-semibold text-tinta">{status === 'seguridad' ? 'Primero, cuida tu seguridad.' : 'No pudimos generar la rutina.'}</h1><p className="mt-3 font-sans text-sm leading-relaxed text-muted">{status === 'seguridad' ? 'Si tienes dolor, lesión, embarazo, postparto o una condición médica, necesitas orientación profesional antes de comenzar.' : message}</p><a href={consultationLink()} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-control bg-coral px-6 font-sans text-base font-semibold text-white"><Sparkles size={18} /> Agendar consulta</a><Button variant="ghost" size="md" className="mt-3 w-full" onClick={restart}><Dumbbell size={17} /> Volver a empezar</Button></Card>}
    <p className="mt-8 border-t border-linea pt-5 font-sans text-xs leading-relaxed text-muted">⚠️ Herramienta educativa para personas sin alertas médicas declaradas. Detente ante dolor y consulta antes de iniciar si tienes dudas.</p>
    {status === 'resultado' && !adminMode && <SiguientesPasos actual="generador-rutinas" />}
  </main>
}
