import bibliotecaRaw from '../../datos/biblioteca-editorial/biblioteca_rutinas.json'
import modeloRaw from '../../datos/biblioteca-editorial/modelo_rutinas.json'

export type Ejercicio = { exercise_id: string; nombre: string; series: string; reps: string; descanso_segundos: number; grupo_muscular: string; notas: string }
export type Rutina = { nombre: string; objetivo: string; nivel: string; frecuencia: string; duracion_por_sesion: string; equipamiento: string; metodo: string; dias: Array<{ nombre: string; enfoque: string; ejercicios: Ejercicio[] }>; calentamiento: string; enfriamiento: string; recomendaciones: string[]; advertencias: string[] }
export type RespuestaRutina = { objetivo: string; nivel: string; dias: string; metodo?: string; musculos?: string[]; equipo: string; seguridad: string }
export type MusculoEditorial = { id: string; label: string; tamano: 'grande' | 'medio' | 'chico'; tren: string }
export type MethodOption = { id: string; title: string; text: string }
type BankExercise = { id: string; nombre: string; zona: string; patron: string; equipo: string; nivel_minimo: string; regresion: string; progresion: string; descripcion: string }
type Dose = { nivel?: string; objetivo?: string; series?: string; reps: string; descanso: string; nota: string }
type MuscleTarget = { id: string; weight: number }
type PlannedDay = { nombre: string; enfoque: string; targets: MuscleTarget[] }
type Plan = { method: string; label: string; days: PlannedDay[] }

const BIB = bibliotecaRaw.ejercicios as BankExercise[]
const MUSCLES = modeloRaw.musculos as MusculoEditorial[]
const LEVEL_DOSES = bibliotecaRaw.matrizDosis.porNivel as Dose[]
const GOAL_DOSES = bibliotecaRaw.matrizDosis.porObjetivo as Dose[]
const LEVEL_DATA: Record<string, string> = { nunca: 'PRINCIPIANTE', principiante: 'PRINCIPIANTE', intermedio: 'MEDIO', avanzado: 'AVANZADO' }
const LEVEL_RANK: Record<string, number> = { INICIAL: 1, INTERMEDIO: 2, AVANZADO: 3 }
const USER_RANK: Record<string, number> = { PRINCIPIANTE: 1, MEDIO: 2, AVANZADO: 3 }
const EQUIPMENT_CONTEXT: Record<string, string[]> = { gimnasio: ['gimnasio', 'mancuernas', 'peso_corporal'], mancuernas: ['mancuernas', 'peso_corporal'], bandas: ['bandas', 'peso_corporal'], peso_corporal: ['peso_corporal'] }
const GOAL_DATA: Record<string, string> = { bajar_grasa: 'Bajar grasa / tonificar', ganar_musculo: 'Ganar musculo', salud_general: 'Salud general / moverse mas' }
const GOAL_LABEL: Record<string, string> = { bajar_grasa: 'Bajar grasa', ganar_musculo: 'Ganar músculo', salud_general: 'Salud general' }
const LEVEL_LABEL: Record<string, string> = { nunca: 'Inicial', principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' }
const EQUIPMENT_LABEL: Record<string, string> = { gimnasio: 'Gimnasio', mancuernas: 'Mancuernas', bandas: 'Bandas elásticas', peso_corporal: 'Peso corporal y apoyos básicos' }
const SESSION_CAP: Record<string, number> = { PRINCIPIANTE: 6, MEDIO: 7, AVANZADO: 8 }
const LEVEL_GUIDANCE: Record<string, string> = { PRINCIPIANTE: 'Técnica primero: termina cada serie con 3–4 repeticiones posibles en reserva.', MEDIO: 'Intensidad moderada: termina normalmente con 1–3 repeticiones posibles en reserva.', AVANZADO: 'Intensidad alta y controlada: trabaja habitualmente con 1–2 repeticiones en reserva.' }
const t = (id: string, weight = 1): MuscleTarget => ({ id, weight })
const day = (nombre: string, enfoque: string, targets: MuscleTarget[]): PlannedDay => ({ nombre, enfoque, targets })

const PLANS: Record<number, Record<string, Plan>> = {
  3: {
    recomendado: { method: 'full_body', label: 'Cuerpo completo A/B/C', days: [
      day('Día 1 · Cuerpo completo A', 'Dominante de rodilla + empuje horizontal', [t('Cuadriceps', 2), t('Pecho', 2), t('Espalda', 1.5), t('Femorales'), t('Abdomen')]),
      day('Día 2 · Cuerpo completo B', 'Cadena posterior + tirón', [t('Gluteos', 2), t('Femorales', 1.5), t('Espalda', 2), t('Hombros'), t('Biceps')]),
      day('Día 3 · Cuerpo completo C', 'Pierna mixta + torso complementario', [t('Cuadriceps', 1.5), t('Gluteos', 1.5), t('Pecho', 1.5), t('Espalda', 1.5), t('Triceps'), t('Pantorrillas')]),
    ] },
    weider: { method: 'weider', label: 'Weider combinado', days: [
      day('Día 1 · Pecho, bíceps y abdomen', 'Pecho prioritario + bíceps', [t('Pecho', 2), t('Biceps', 1.6), t('Abdomen')]),
      day('Día 2 · Piernas completas', 'Cuádriceps, cadena posterior y pantorrillas', [t('Cuadriceps', 1.6), t('Femorales', 1.4), t('Gluteos', 1.5), t('Pantorrillas')]),
      day('Día 3 · Espalda, hombros y tríceps', 'Tirón prioritario + hombros y tríceps', [t('Espalda', 2), t('Hombros', 1.3), t('Triceps', 1.3), t('Trapecios')]),
    ] },
  },
  4: {
    recomendado: { method: 'torso_pierna', label: 'Torso/Pierna ×2', days: [
      day('Día 1 · Torso A', 'Pecho prioritario + espalda', [t('Pecho', 2), t('Espalda', 1.6), t('Hombros'), t('Triceps'), t('Biceps')]),
      day('Día 2 · Pierna A', 'Cuádriceps prioritario', [t('Cuadriceps', 2), t('Gluteos', 1.5), t('Femorales'), t('Pantorrillas'), t('Abdomen')]),
      day('Día 3 · Torso B', 'Espalda prioritaria + hombros', [t('Espalda', 2), t('Pecho', 1.5), t('Hombros', 1.4), t('Biceps'), t('Triceps')]),
      day('Día 4 · Pierna B', 'Cadena posterior prioritaria', [t('Femorales', 1.8), t('Gluteos', 1.8), t('Cuadriceps'), t('Aductores'), t('Abductores'), t('Pantorrillas')]),
    ] },
    weider: { method: 'weider', label: 'Weider combinado', days: [
      day('Día 1 · Pecho y bíceps', 'Pecho prioritario + bíceps', [t('Pecho', 2), t('Biceps', 1.7), t('Abdomen')]),
      day('Día 2 · Cuádriceps y pantorrillas', 'Dominante de rodilla + femoral complementario', [t('Cuadriceps', 2), t('Gluteos'), t('Femorales'), t('Pantorrillas', 1.4)]),
      day('Día 3 · Espalda y tríceps', 'Espalda prioritaria + tríceps y pecho complementario', [t('Espalda', 2), t('Triceps', 1.7), t('Pecho'), t('Trapecios')]),
      day('Día 4 · Femorales, glúteos y hombros', 'Cadena posterior + hombros y cuádriceps complementario', [t('Femorales', 1.7), t('Gluteos', 1.7), t('Hombros', 1.5), t('Cuadriceps')]),
    ] },
  },
  5: {
    recomendado: { method: 'hibrido', label: 'Empuje/Tirón/Pierna + Torso/Pierna', days: [
      day('Día 1 · Empuje', 'Pecho + hombros + tríceps', [t('Pecho', 2), t('Hombros', 1.4), t('Triceps', 1.4)]),
      day('Día 2 · Tirón', 'Espalda + bíceps + trapecios', [t('Espalda', 2), t('Biceps', 1.4), t('Trapecios'), t('Antebrazo')]),
      day('Día 3 · Pierna A', 'Cuádriceps prioritario', [t('Cuadriceps', 2), t('Gluteos', 1.4), t('Femorales'), t('Pantorrillas'), t('Abdomen')]),
      day('Día 4 · Torso mixto', 'Segundo estímulo de torso', [t('Pecho', 1.5), t('Espalda', 1.5), t('Hombros'), t('Biceps'), t('Triceps')]),
      day('Día 5 · Pierna B', 'Cadena posterior prioritaria', [t('Femorales', 1.8), t('Gluteos', 1.8), t('Cuadriceps'), t('Aductores'), t('Abductores'), t('Pantorrillas')]),
    ] },
    weider: { method: 'weider', label: 'Weider con frecuencia mixta', days: [
      day('Día 1 · Pecho y bíceps', 'Pecho prioritario + bíceps', [t('Pecho', 2), t('Biceps', 1.7), t('Abdomen')]),
      day('Día 2 · Espalda y tríceps', 'Espalda prioritaria + tríceps', [t('Espalda', 2), t('Triceps', 1.6), t('Trapecios'), t('Antebrazo')]),
      day('Día 3 · Cuádriceps, glúteos y pantorrillas', 'Dominante de rodilla', [t('Cuadriceps', 1.8), t('Gluteos', 1.5), t('Pantorrillas', 1.2), t('Aductores')]),
      day('Día 4 · Hombros y torso complementario', 'Hombros + segundo estímulo de torso', [t('Hombros', 1.8), t('Pecho', 1.3), t('Espalda', 1.3), t('Biceps'), t('Triceps')]),
      day('Día 5 · Femorales y glúteos', 'Cadena posterior + estabilizadores', [t('Femorales', 1.8), t('Gluteos', 1.8), t('Cuadriceps'), t('Abductores'), t('Pantorrillas'), t('Abdomen')]),
    ] },
  },
  6: {
    recomendado: { method: 'ppl', label: 'Empuje/Tirón/Pierna ×2', days: [
      day('Día 1 · Empuje A', 'Pecho prioritario', [t('Pecho', 2), t('Hombros', 1.3), t('Triceps', 1.4)]),
      day('Día 2 · Tirón A', 'Espalda prioritaria', [t('Espalda', 2), t('Biceps', 1.4), t('Trapecios'), t('Antebrazo')]),
      day('Día 3 · Pierna A', 'Cuádriceps prioritario', [t('Cuadriceps', 2), t('Gluteos', 1.4), t('Femorales'), t('Pantorrillas'), t('Abdomen')]),
      day('Día 4 · Empuje B', 'Hombros y tríceps + pecho', [t('Hombros', 1.7), t('Triceps', 1.5), t('Pecho', 1.6)]),
      day('Día 5 · Tirón B', 'Espalda + bíceps, variantes B', [t('Espalda', 1.8), t('Biceps', 1.5), t('Trapecios', 1.2), t('Antebrazo')]),
      day('Día 6 · Pierna B', 'Cadena posterior prioritaria', [t('Femorales', 1.8), t('Gluteos', 1.8), t('Cuadriceps'), t('Aductores'), t('Abductores'), t('Pantorrillas')]),
    ] },
    weider: { method: 'weider', label: 'Weider con doble estímulo', days: [
      day('Día 1 · Pecho y bíceps A', 'Pecho prioritario', [t('Pecho', 2), t('Biceps', 1.6), t('Abdomen')]),
      day('Día 2 · Cuádriceps y pantorrillas A', 'Dominante de rodilla', [t('Cuadriceps', 2), t('Gluteos'), t('Pantorrillas', 1.4), t('Aductores')]),
      day('Día 3 · Espalda y tríceps A', 'Espalda prioritaria', [t('Espalda', 2), t('Triceps', 1.6), t('Trapecios'), t('Antebrazo')]),
      day('Día 4 · Hombros, pecho y bíceps B', 'Hombros + segundo estímulo', [t('Hombros', 1.8), t('Pecho', 1.5), t('Biceps', 1.2), t('Abdomen')]),
      day('Día 5 · Femorales, glúteos y pantorrillas B', 'Cadena posterior', [t('Femorales', 1.8), t('Gluteos', 1.8), t('Cuadriceps'), t('Pantorrillas'), t('Abductores')]),
      day('Día 6 · Espalda, tríceps y trapecios B', 'Segundo estímulo de tirón', [t('Espalda', 1.8), t('Triceps', 1.4), t('Trapecios', 1.2), t('Antebrazo')]),
    ] },
  },
}

export const routineLibrarySize = BIB.length
export const muscleCatalog = MUSCLES
export const dayChoices = [1, 3, 4, 5, 6]
export const beginnerMuscleGroups = [{ id: 'grupo_brazos', label: 'Brazos completos', muscles: ['Biceps', 'Triceps', 'Antebrazo'] }, { id: 'grupo_piernas', label: 'Piernas completas', muscles: ['Cuadriceps', 'Femorales', 'Gluteos', 'Aductores', 'Abductores', 'Pantorrillas'] }]
export function muscleSelectionLimit(level?: string) { return SESSION_CAP[LEVEL_DATA[level ?? '']] ?? 6 }
export function methodOptions(days: number): MethodOption[] {
  if (days === 1 || !PLANS[days]) return []
  const preferred = PLANS[days].recomendado
  return [{ id: 'recomendado', title: `Recomendado · ${preferred.label}`, text: 'La distribución más equilibrada para esa frecuencia.' }, ...Object.entries(PLANS[days]).filter(([id]) => id !== 'recomendado').map(([id, plan]) => ({ id, title: plan.label, text: id === 'weider' ? 'Grupos combinados por sesión, con frecuencia semanal coherente.' : 'Una estructura alternativa.' }))]
}

function hash(id: string, seed: string) { let value = 2166136261; for (const char of `${seed}:${id}`) value = Math.imul(value ^ char.charCodeAt(0), 16777619); return value >>> 0 }
function numbers(value: string) { return [...value.matchAll(/\d+/g)].map((match) => Number(match[0])) }
function average(value: string, fallback: number) { const values = numbers(value); return values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : fallback }
function restSeconds(value: string) { const values = numbers(value); if (!values.length) return 60; const seconds = Math.max(...values); return /min/i.test(value) ? seconds * 60 : seconds }
function isTimed(item: BankExercise) { return /plancha|colgar|dead hang|isometr|caminata del granjero/i.test(`${item.nombre} ${item.patron}`) }
function resolvedPlan(days: number, method: string | undefined, selected: string[]) { if (days === 1) { const labels = selected.map((id) => MUSCLES.find((item) => item.id === id)?.label ?? id); return { method: 'personalizada', label: 'Selección personalizada', days: [day(`Sesión · ${labels.join(', ')}`, 'Músculos elegidos por ti', selected.map((id) => t(id, MUSCLES.find((item) => item.id === id)?.tamano === 'grande' ? 1.5 : 1)))] } } return PLANS[days]?.[method || 'recomendado'] ?? PLANS[days]?.recomendado }
function exerciseCandidates(muscle: string, equipment: string, level: string) { const allowed = EQUIPMENT_CONTEXT[equipment] ?? ['peso_corporal']; const rank = USER_RANK[level] ?? 1; return BIB.filter((item) => item.zona === muscle && allowed.includes(item.equipo) && (LEVEL_RANK[item.nivel_minimo] ?? 99) <= rank) }
function allocate(targets: MuscleTarget[], cap: number) { const counts = new Map(targets.map((target) => [target.id, 0])); for (const target of targets) if ([...counts.values()].reduce((a, b) => a + b, 0) < cap) counts.set(target.id, 1); while ([...counts.values()].reduce((a, b) => a + b, 0) < cap) { const next = [...targets].sort((a, b) => (counts.get(a.id)! / a.weight) - (counts.get(b.id)! / b.weight))[0]; if (!next) break; counts.set(next.id, counts.get(next.id)! + 1) } return counts }
function selectDay(planned: PlannedDay, level: string, equipment: string, seed: string, weeklyUsed: Map<string, Set<string>>) { const allocation = allocate(planned.targets, SESSION_CAP[level] ?? 6); const selected: BankExercise[] = []; for (const target of planned.targets) { const used = weeklyUsed.get(target.id) ?? new Set<string>(); const ordered = exerciseCandidates(target.id, equipment, level).sort((a, b) => Number(used.has(a.id)) - Number(used.has(b.id)) || hash(a.id, seed) - hash(b.id, seed)); for (const exercise of ordered.slice(0, allocation.get(target.id) ?? 0)) { selected.push(exercise); used.add(exercise.id) } weeklyUsed.set(target.id, used) } return selected.slice(0, SESSION_CAP[level] ?? 6) }
function prescribedSeries(level: string, muscle: string) {
  const size = MUSCLES.find((item) => item.id === muscle)?.tamano
  if (level === 'PRINCIPIANTE') return '2'
  if (level === 'MEDIO') return size === 'grande' ? '3' : '2-3'
  return size === 'grande' ? '3-4' : size === 'medio' ? '3' : '2-3'
}
function dose(level: string, objective: string, exercise: BankExercise) { const base = LEVEL_DOSES.find((item) => item.nivel === level); const goal = GOAL_DOSES.find((item) => item.objetivo === GOAL_DATA[objective]); return { series: prescribedSeries(level, exercise.zona), reps: isTimed(exercise) ? (level === 'PRINCIPIANTE' ? '20-30 s' : level === 'MEDIO' ? '30-45 s' : '40-60 s') : goal?.reps ?? base?.reps ?? '10-12', rest: restSeconds(goal?.descanso ?? base?.descanso ?? '60 s'), goalNote: goal?.nota } }
function duration(exercises: Ejercicio[]) { const seconds = exercises.reduce((sum, item) => sum + average(item.series, 3) * (40 + item.descanso_segundos), 0) + 8 * 60; return Math.ceil(seconds / 300) * 5 }

export function construirRutina(answer: RespuestaRutina, regenIndex = 0): { rutina?: Rutina; error?: string } {
  if (answer.seguridad !== 'ninguna') return { error: 'seguridad' }
  const level = LEVEL_DATA[answer.nivel]; const daysNumber = Number(answer.dias); const selected = [...new Set(answer.musculos ?? [])]
  if (!level || !dayChoices.includes(daysNumber) || (daysNumber === 1 && !selected.length)) return { error: 'datos_incompletos' }
  const plan = resolvedPlan(daysNumber, answer.metodo, selected)
  if (!plan || plan.days.length !== daysNumber) return { error: 'sin_distribucion' }
  const missing: string[] = []; const weeklyUsed = new Map<string, Set<string>>()
  const outputDays = plan.days.map((planned, index) => { const chosen = selectDay(planned, level, answer.equipo, `${answer.objetivo}:${answer.nivel}:${daysNumber}:${plan.method}:${answer.equipo}:${regenIndex}:${index}`, weeklyUsed); for (const target of planned.targets) if (!chosen.some((item) => item.zona === target.id)) missing.push(`${planned.nombre}: ${target.id}`); return { nombre: planned.nombre, enfoque: planned.enfoque, ejercicios: chosen.map((item) => { const prescription = dose(level, answer.objetivo, item); return { exercise_id: item.id, nombre: item.nombre, series: prescription.series, reps: prescription.reps, descanso_segundos: prescription.rest, grupo_muscular: item.zona, notas: `${item.descripcion}${item.regresion ? ` Regresión: ${item.regresion}.` : ''}${item.progresion ? ` Progresión: ${item.progresion}.` : ''}` } }) } })
  if (missing.length || outputDays.some((item) => !item.ejercicios.length)) return { error: `sin_propuesta:${missing.join('|')}` }
  const durations = outputDays.map((item) => duration(item.ejercicios)); const min = Math.min(...durations); const max = Math.max(...durations); const sample = dose(level, answer.objetivo, BIB[0])
  return { rutina: { nombre: `${daysNumber === 1 ? 'Rutina personalizada' : plan.label} · ${GOAL_LABEL[answer.objetivo] ?? answer.objetivo}`, objetivo: GOAL_LABEL[answer.objetivo] ?? answer.objetivo, nivel: LEVEL_LABEL[answer.nivel] ?? answer.nivel, frecuencia: daysNumber === 1 ? '1 sesión' : `${daysNumber} días/semana`, duracion_por_sesion: `${min === max ? min : `${min}-${max}`} min aprox`, equipamiento: EQUIPMENT_LABEL[answer.equipo] ?? answer.equipo, metodo: plan.label, dias: outputDays, calentamiento: '5–8 min de movilidad articular y una serie suave del primer ejercicio de cada grupo.', enfriamiento: '3–5 min de respiración y movilidad suave. Detente si aparece dolor.', recomendaciones: [LEVEL_GUIDANCE[level], sample.goalNote, 'Respeta el orden semanal y deja aproximadamente 48 horas antes de repetir directamente un grupo muscular.', `Método: ${plan.label}. Las sesiones A/B usan variantes distintas cuando la biblioteca y el equipo lo permiten.`].filter(Boolean) as string[], advertencias: ['Rutina educativa para personas sin alertas médicas declaradas.', 'Progresa solo cuando completes la técnica con comodidad.'] } }
}
