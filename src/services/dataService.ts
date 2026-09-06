import { ALIMENTOS_MOCK, type Alimento, type AlimentoRaw } from '../data/alimentos.mock'
import { SESIONES_MOCK } from '../data/sesion.mock'
import { soloFecha } from '../lib/fecha'
import { aNumero } from '../lib/numero'

export type { Alimento }

/**
 * Única puerta a los datos remotos. Hoy (VITE_DATA_MODE=mock) sirve fixtures
 * locales; cuando el Apps Script esté desplegado, cambia VITE_DATA_MODE a
 * "remote" y VITE_APPS_SCRIPT_URL — ningún componente de la UI se toca.
 *
 * Arquitectura: React → DataService (este archivo) → Apps Script → Sheets.
 */

const DATA_MODE: 'mock' | 'remote' = import.meta.env.VITE_DATA_MODE === 'remote' ? 'remote' : 'mock'
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL

export const isMockMode = DATA_MODE === 'mock'

// ───────────────────────── Tipos de dominio ─────────────────────────

export type EstadoPaciente = 'ACTIVO' | 'SUSPENDIDO' | 'REVOCADO' | 'EXPIRADO'

/**
 * Medidas y análisis de un momento dado. Las mismas para la línea base
 * (PACIENTES, al empezar el plan) y para cada control posterior
 * (SEGUIMIENTO), para poder compararlas sin traducir nada.
 * Un 0 significa "no registrado": se muestra como "—", no como cero.
 */
export interface Mediciones {
  pesoKg: number
  cinturaCm: number
  grasaPct: number
  glucosa: number
  trigliceridos: number
  colesterol: number
  hemoglobina: number
}

export interface Paciente {
  id: string
  estado: EstadoPaciente
  nombre: string
  correo: string
  sexo: 'M' | 'F'
  fechaNacimiento: string
  tallaCm: number
  objetivo: string
  fechaActualizacion: string
  notas: string
  /** Fecha en que empezó el tratamiento (columna `inicio_plan`). */
  inicioPlan: string
  /** Medidas y análisis con los que entró. */
  basal: Mediciones
}

export type EstadoPlan = 'VIGENTE' | 'ARCHIVADO'

export interface Plan {
  id: string
  pacienteId: string
  cicloId?: string
  numeroSemana?: number
  titulo: string
  urlPdf: string
  estado: EstadoPlan
  fechaInicio: string
  fechaFin: string
  kcalObjetivo: number
  proteinasG: number
  carbohidratosG: number
  grasasG: number
}

export interface Seguimiento extends Mediciones {
  id: string
  pacienteId: string
  fecha: string
  /** La talla se re-mide en cada control: en pacientes que aún crecen cambia. */
  tallaCm: number
  notas: string
}

// Documentos descargables asociados a un plan (lista de compras, plan con
// kcal, lista de intercambios, u otros). Cada uno es un PDF en Drive que Joel
// sube igual que el plan; el `tipo` solo decide el ícono que muestra la UI.
export type TipoRecurso = 'PLAN' | 'COMPRAS' | 'INTERCAMBIOS' | 'GUIA' | 'OTRO'

export interface Recurso {
  id: string
  planId: string
  tipo: TipoRecurso
  titulo: string
  urlPdf: string
}

/** Producto editorial público; una fila representa un cookbook completo. */
export type EstadoCookbook = 'GRATUITO' | 'PREMIUM'

export interface Cookbook {
  id: string
  titulo: string
  descripcion: string
  urlPortada: string
  urlPdf: string
  estado: EstadoCookbook
  urlPago: string
  orden: number
}

/** Material visual de educación nutricional. Puede ser abierto o exclusivo. */
export type AccesoEducacion = 'PUBLICO' | 'PACIENTE'

export interface LaminaEducacion {
  id: string
  imagenUrl: string
  orden: number
  descripcion: string
}

export interface Educacion {
  id: string
  titulo: string
  categoria: string
  descripcion: string
  portadaUrl: string
  acceso: AccesoEducacion
  orden: number
  laminas: LaminaEducacion[]
}

export interface Ejercicio {
  id: string
  nombre: string
  descripcion: string
  zonaCuerpo: string
  nivel: string
  duracionMin: number
  urlVideo: string
  urlImagen: string
}

export interface RutinaEjercicio {
  id: string
  dia: string
  orden: number
  series: string
  repeticiones: string
  descansoSeg: string
  notas: string
  ejercicio: Ejercicio
}

export interface Rutina {
  id: string
  titulo: string
  descripcion: string
  objetivo: string
  nivel: string
  duracionEstimadaMin: number
  ejercicios: RutinaEjercicio[]
}

export interface SesionPaciente {
  paciente: Paciente
  planes: Plan[]
  seguimiento: Seguimiento[]
}

export interface Suscriptor {
  id: string
  nombre: string
  correo: string
  estado: string
  fechaInicio?: string
  fechaFin?: string
}

// Forma cruda tal como la devuelve Apps Script (encabezados de la hoja,
// snake_case). Los fixtures mock también usan esta forma para que los
// mismos mappers sirvan en ambos modos.
export interface PacienteRaw extends MedicionesRaw {
  id: string | number
  codigo_acceso?: string
  estado: string
  nombre: string
  correo: string
  sexo: string
  fecha_nacimiento: string
  talla_cm: number
  objetivo: string
  fecha_actualizacion: string
  notas?: string
  inicio_plan?: string
}

/**
 * Columnas de medición, tal como se llaman en la hoja. Se aceptan alias
 * porque las columnas se fueron agregando a mano y no siempre con el mismo
 * nombre (`% grasa` fue el primero); así un encabezado viejo no rompe la app.
 */
export interface MedicionesRaw {
  peso_kg?: string | number
  cintura_cm?: string | number
  grasa_pct?: string | number
  '% grasa'?: string | number
  glucosa?: string | number
  trigliceridos?: string | number
  'triglicéridos'?: string | number
  colesterol?: string | number
  hemoglobina?: string | number
}

export interface PlanRaw {
  id: string | number
  paciente_id: string | number
  ciclo_id?: string | number
  numero_semana?: string | number
  titulo: string
  url_pdf: string
  estado: string
  fecha_inicio: string
  fecha_fin?: string
  kcal_objetivo: number
  proteinas_g: number
  carbohidratos_g: number
  grasas_g: number
}

export interface SeguimientoRaw extends MedicionesRaw {
  id: string | number
  paciente_id: string | number
  fecha: string
  talla_cm?: string | number
  notas?: string
}

export interface RecursoRaw {
  id: string | number
  plan_id: string | number
  tipo: string
  titulo: string
  url_pdf: string
  orden?: string | number
}

/** Acepta los encabezados actuales y los nombres usados al prototipar. */
export interface CookbookRaw {
  id: string | number
  titulo?: string
  descripcion?: string
  url_portada?: string
  url_foto?: string
  imagen_portada?: string
  url_pdf?: string
  estado?: string
  url_pago?: string
  orden?: string | number
}

export interface EducacionRaw {
  id: string | number
  titulo?: string
  categoria?: string
  descripcion?: string
  portada_url?: string
  url_portada?: string
  acceso?: string
  orden?: string | number
  estado?: string
}

export interface LaminaEducacionRaw {
  id: string | number
  educacion_id?: string | number
  imagen_url?: string
  url_imagen?: string
  orden?: string | number
  descripcion?: string
}

export interface EjercicioRaw {
  id: string | number
  nombre?: string
  descripcion?: string
  zona_cuerpo?: string
  nivel?: string
  duracion_min?: string | number
  url_video?: string
  url_imagen?: string
  estado?: string
}

export interface RutinaRaw {
  id: string | number
  titulo?: string
  descripcion?: string
  objetivo?: string
  nivel?: string
  duracion_estimada_min?: string | number
  estado?: string
}

export interface RutinaEjercicioRaw {
  id: string | number
  rutina_id: string | number
  ejercicio_id: string | number
  dia?: string
  orden?: string | number
  series?: string | number
  repeticiones?: string | number
  descanso_seg?: string | number
  notas?: string
}

export type CodigoError = 'ACCESO_DENEGADO' | 'SUSCRIPCION_EXPIRADA' | 'ERROR_RED' | 'ERROR_SERVIDOR' | 'NO_AUTENTICADO'

export type Resultado<T> = { ok: true; data: T } | { ok: false; error: CodigoError }

// ───────────────────────── Mappers (raw → dominio) ─────────────────────────

/** Primera clave presente: tolera encabezados renombrados en la hoja. */
function primeraClave(raw: MedicionesRaw, ...claves: (keyof MedicionesRaw)[]): unknown {
  for (const clave of claves) {
    const valor = raw[clave]
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') return valor
  }
  return 0
}

function mapMediciones(raw: MedicionesRaw): Mediciones {
  return {
    pesoKg: aNumero(raw.peso_kg),
    cinturaCm: aNumero(raw.cintura_cm),
    grasaPct: aNumero(primeraClave(raw, 'grasa_pct', '% grasa')),
    glucosa: aNumero(raw.glucosa),
    trigliceridos: aNumero(primeraClave(raw, 'trigliceridos', 'triglicéridos')),
    colesterol: aNumero(raw.colesterol),
    hemoglobina: aNumero(raw.hemoglobina),
  }
}

function mapPaciente(raw: PacienteRaw): Paciente {
  return {
    id: String(raw.id),
    estado: raw.estado as EstadoPaciente,
    nombre: raw.nombre,
    correo: raw.correo,
    sexo: raw.sexo === 'M' ? 'M' : 'F',
    fechaNacimiento: soloFecha(raw.fecha_nacimiento),
    tallaCm: aNumero(raw.talla_cm),
    objetivo: raw.objetivo,
    fechaActualizacion: soloFecha(raw.fecha_actualizacion),
    notas: raw.notas ?? '',
    // Línea base: lo que la paciente tenía al empezar el plan. La evolución
    // posterior vive en SEGUIMIENTO (ver mapSeguimiento).
    inicioPlan: soloFecha(raw.inicio_plan),
    basal: mapMediciones(raw),
  }
}

function mapPlan(raw: PlanRaw): Plan {
  return {
    id: String(raw.id),
    pacienteId: String(raw.paciente_id),
    cicloId: String(raw.ciclo_id || ''),
    numeroSemana: aNumero(raw.numero_semana),
    titulo: raw.titulo,
    urlPdf: raw.url_pdf,
    estado: String(raw.estado ?? '').trim().toUpperCase() === 'ARCHIVADO' ? 'ARCHIVADO' : 'VIGENTE',
    fechaInicio: soloFecha(raw.fecha_inicio),
    fechaFin: soloFecha(raw.fecha_fin),
    kcalObjetivo: aNumero(raw.kcal_objetivo),
    proteinasG: aNumero(raw.proteinas_g),
    carbohidratosG: aNumero(raw.carbohidratos_g),
    grasasG: aNumero(raw.grasas_g),
  }
}

function mapSeguimiento(raw: SeguimientoRaw, indice: number): Seguimiento {
  const fecha = soloFecha(raw.fecha)
  return {
    ...mapMediciones(raw),
    // Los ids de la hoja se repiten (se copió la fila entera al agregar un
    // control). Como identifican filas en la lista del historial, se
    // completan con fecha y posición para que sean únicos de verdad.
    id: `${String(raw.id ?? 's')}-${fecha || indice}`,
    pacienteId: String(raw.paciente_id),
    fecha,
    tallaCm: aNumero(raw.talla_cm),
    notas: raw.notas ?? '',
  }
}

function normalizeTipoRecurso(valor: unknown): TipoRecurso {
  const t = String(valor ?? '').trim().toUpperCase()
  if (t === 'PLAN') return t
  if (t === 'COMPRAS' || t === 'LISTA_COMPRAS') return 'COMPRAS'
  // En la hoja se escribe en singular; se acepta cualquiera de las dos formas
  // para que el ícono no dependa de una "s".
  if (t === 'INTERCAMBIOS' || t === 'INTERCAMBIO') return 'INTERCAMBIOS'
  if (t === 'GUIA' || t === 'GUÍA') return 'GUIA'
  return 'OTRO'
}

const TITULO_POR_TIPO: Record<TipoRecurso, string> = {
  PLAN: 'Plan nutricional',
  COMPRAS: 'Lista de compras',
  INTERCAMBIOS: 'Lista de intercambios',
  GUIA: 'Guía de alimentos',
  OTRO: 'Documento',
}

function mapRecurso(raw: RecursoRaw): Recurso {
  const tipo = normalizeTipoRecurso(raw.tipo)
  return {
    id: String(raw.id),
    planId: String(raw.plan_id),
    tipo,
    // Si la fila de la hoja quedó sin título, la descarga aparecía sin nombre.
    // Mejor un nombre genérico según el tipo que una tarjeta en blanco.
    titulo: String(raw.titulo ?? '').trim() || TITULO_POR_TIPO[tipo],
    urlPdf: String(raw.url_pdf ?? '').trim(),
  }
}

function mapEstadoCookbook(valor: unknown): EstadoCookbook {
  const estado = String(valor ?? '').trim().toUpperCase()
  return ['GRATIS', 'GRATUITA', 'GRATUITO', 'FREE'].includes(estado) ? 'GRATUITO' : 'PREMIUM'
}

function urlExterna(valor: unknown): string {
  const url = String(valor ?? '').trim()
  return /^https?:\/\//i.test(url) ? url : ''
}

function mapCookbook(raw: CookbookRaw): Cookbook {
  return {
    id: String(raw.id),
    titulo: String(raw.titulo ?? '').trim() || 'Cookbook saludable',
    descripcion: String(raw.descripcion ?? '').trim(),
    urlPortada: String(raw.url_portada ?? raw.url_foto ?? raw.imagen_portada ?? '').trim(),
    urlPdf: String(raw.url_pdf ?? '').trim(),
    estado: mapEstadoCookbook(raw.estado),
    // "enlace de pago" es una nota frecuente mientras se prepara el cobro;
    // no debe convertir el botón en un enlace roto. Solo una URL real activa
    // la compra.
    urlPago: urlExterna(raw.url_pago),
    orden: aNumero(raw.orden),
  }
}

function mapAccesoEducacion(valor: unknown): AccesoEducacion {
  return String(valor ?? '').trim().toUpperCase() === 'PACIENTE' ? 'PACIENTE' : 'PUBLICO'
}

function mapEducacion(raw: EducacionRaw, laminasRaw: LaminaEducacionRaw[]): Educacion {
  const id = String(raw.id)
  return {
    id,
    titulo: String(raw.titulo ?? '').trim() || 'Educación nutricional',
    categoria: String(raw.categoria ?? '').trim() || 'Nutrición práctica',
    descripcion: String(raw.descripcion ?? '').trim(),
    portadaUrl: String(raw.portada_url ?? raw.url_portada ?? '').trim(),
    acceso: mapAccesoEducacion(raw.acceso),
    orden: aNumero(raw.orden),
    laminas: laminasRaw
      .filter((lamina) => String(lamina.educacion_id ?? '') === id)
      .map((lamina) => ({
        id: String(lamina.id),
        imagenUrl: String(lamina.imagen_url ?? lamina.url_imagen ?? '').trim(),
        orden: aNumero(lamina.orden),
        descripcion: String(lamina.descripcion ?? '').trim(),
      }))
      .filter((lamina) => lamina.imagenUrl !== '')
      .sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id, 'es')),
  }
}

function mapEjercicio(raw: EjercicioRaw): Ejercicio {
  return {
    id: String(raw.id),
    nombre: String(raw.nombre ?? '').trim() || 'Ejercicio',
    descripcion: String(raw.descripcion ?? '').trim(),
    zonaCuerpo: String(raw.zona_cuerpo ?? '').trim(),
    nivel: String(raw.nivel ?? '').trim(),
    duracionMin: aNumero(raw.duracion_min),
    urlVideo: urlExterna(raw.url_video),
    urlImagen: String(raw.url_imagen ?? '').trim(),
  }
}

function mapRutinas(rawRutinas: RutinaRaw[], rawLineas: RutinaEjercicioRaw[], rawEjercicios: EjercicioRaw[]): Rutina[] {
  const ejercicios = new Map(rawEjercicios.map((ejercicio) => [String(ejercicio.id), mapEjercicio(ejercicio)]))
  return rawRutinas.map((rutina) => ({
    id: String(rutina.id),
    titulo: String(rutina.titulo ?? '').trim() || 'Tu rutina',
    descripcion: String(rutina.descripcion ?? '').trim(),
    objetivo: String(rutina.objetivo ?? '').trim(),
    nivel: String(rutina.nivel ?? '').trim(),
    duracionEstimadaMin: aNumero(rutina.duracion_estimada_min),
    ejercicios: rawLineas
      .filter((linea) => String(linea.rutina_id) === String(rutina.id))
      .map((linea) => ({
        id: String(linea.id),
        dia: String(linea.dia ?? '').trim() || 'Rutina',
        orden: aNumero(linea.orden),
        series: String(linea.series ?? '').trim(),
        repeticiones: String(linea.repeticiones ?? '').trim(),
        descansoSeg: String(linea.descanso_seg ?? '').trim(),
        notas: String(linea.notas ?? '').trim(),
        ejercicio: ejercicios.get(String(linea.ejercicio_id)) ?? mapEjercicio({ id: linea.ejercicio_id }),
      }))
      .sort((a, b) => a.orden - b.orden),
  }))
}

/**
 * Convierte un enlace de Google Drive ("compartir") en un enlace de descarga
 * directa, para que el botón baje el PDF en vez de abrir la vista previa.
 * Si no reconoce el formato, devuelve la URL tal cual (funciona con enlaces
 * locales del modo mock).
 */
export function driveDownloadUrl(url: string): string {
  if (!url) return url
  const patrones = [/\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/]
  for (const p of patrones) {
    const m = url.match(p)
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`
  }
  return url
}

/** Extrae el ID tanto de enlaces compartidos como de descarga de Drive. */
export function driveFileId(url: string): string | null {
  if (!url) return null
  const patrones = [/\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/]
  for (const p of patrones) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

/** Convierte un enlace compartido de Drive en una URL apta para una portada. */
export function driveViewUrl(url: string): string {
  const id = driveFileId(url)
  // El endpoint thumbnail se comporta de forma consistente como <img> en
  // Safari/iPhone y Chrome. `uc?export=view` falla silenciosamente en algunos
  // navegadores móviles aunque el archivo sea público.
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1600` : url
}

/** Miniatura ligera para tarjetas; el visor conserva la versiÃ³n grande. */
export function driveThumbnailUrl(url: string, ancho = 480): string {
  const id = driveFileId(url)
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w${ancho}` : url
}

/** Visor de Google Drive para PDFs grandes que no conviene convertir a Base64. */
export function drivePreviewUrl(url: string): string {
  const id = driveFileId(url)
  return id ? `https://drive.google.com/file/d/${id}/preview` : url
}

/**
 * Segunda vía para leer un PDF público de Drive sin abandonar el visor
 * editorial. El endpoint del mismo dominio evita el bloqueo CORS de Drive.
 * Si el archivo es privado o el proxy no está disponible, devuelve null.
 */
export async function getDrivePdfViaApp(url: string): Promise<Uint8Array | null> {
  const id = driveFileId(url)
  if (!id) return null

  try {
    const respuesta = await fetch(`/api/drive-file?id=${encodeURIComponent(id)}`)
    if (!respuesta.ok) return null
    return new Uint8Array(await respuesta.arrayBuffer())
  } catch {
    return null
  }
}

function mapAlimento(raw: AlimentoRaw): Alimento {
  return {
    id: String(raw.id),
    nombre: raw.nombre,
    grupo: raw.grupo,
    energiaKcal: aNumero(raw.energia_kcal),
    proteinasG: aNumero(raw.proteinas_g),
    grasaG: aNumero(raw.grasa_g),
    carbohidratosG: aNumero(raw.carbohidratos_g),
  }
}

// ───────────────────────── Sesión (codigo_acceso persistido) ─────────────────────────

// Se conserva el nombre anterior a propósito, aunque la app pase a llamarse
// NutriPlan: cambiar la clave cerraría la sesión de todas las pacientes que ya
// tienen su código guardado, y tendrían que volver a escribirlo.
const STORAGE_KEY = 'nutricook_codigo_acceso'
let codigoEnMemoria: string | null = null

export function restoreSession(): string | null {
  if (codigoEnMemoria) return codigoEnMemoria
  codigoEnMemoria = localStorage.getItem(STORAGE_KEY)
  return codigoEnMemoria
}

function guardarSesion(codigo: string) {
  codigoEnMemoria = codigo
  localStorage.setItem(STORAGE_KEY, codigo)
}

export function logout(): void {
  codigoEnMemoria = null
  planEnCache = null
  localStorage.removeItem(STORAGE_KEY)
}

// ───────────────────────── Transporte Apps Script ─────────────────────────

interface RespuestaGAS {
  ok: boolean
  error?: string
  codigo?: string
  suscriptor?: Suscriptor
  paciente?: PacienteRaw
  planes?: PlanRaw[]
  seguimiento?: SeguimientoRaw[]
  recursos?: RecursoRaw[]
  cookbooks?: CookbookRaw[]
  educacion?: EducacionRaw[]
  laminasEducacion?: LaminaEducacionRaw[]
  rutinas?: RutinaRaw[]
  rutinaEjercicios?: RutinaEjercicioRaw[]
  ejercicios?: EjercicioRaw[]
  alimentos?: AlimentoRaw[]
  base64?: string
  mime?: string
  cookbook?: unknown
}

export async function getWeeklyCookbookRemote(planId: string, weekStart?: string): Promise<unknown | null> {
  if (DATA_MODE === 'mock') return null
  const codigo = restoreSession()
  if (!codigo) return null
  const response = await fetch('/api/weekly-cookbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo, planId, weekStart: weekStart || '' }) })
  if (!response.ok) return null
  const respuesta = await response.json() as { ok?: boolean; cookbook?: unknown }
  return respuesta.ok ? respuesta.cookbook ?? null : null
}

// POST con Content-Type: text/plain evita el preflight CORS que Apps Script
// no sabe responder (doOptions no existe). El body es un JSON string.
async function llamarAppsScript(
  action: string,
  payload: Record<string, unknown> = {},
  timeoutMs?: number,
): Promise<RespuestaGAS> {
  if (!APPS_SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL no está configurada')
  }
  const controller = timeoutMs ? new AbortController() : null
  const timeout = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      signal: controller?.signal,
    })
    if (!res.ok) throw new Error(`Apps Script respondió ${res.status}`)
    return res.json()
  } finally {
    if (timeout !== null) window.clearTimeout(timeout)
  }
}

// ───────────────────────── Mock: latencia simulada ─────────────────────────

function retrasoMock<T>(valor: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms))
}

/** Garantiza que una operación lenta no mantenga bloqueada la interfaz. */
async function conTiempoLimite<T>(operacion: Promise<T>, ms: number): Promise<T | null> {
  let timeout: number | undefined
  const limite = new Promise<null>((resolve) => {
    timeout = window.setTimeout(() => resolve(null), ms)
  })
  try {
    return await Promise.race([operacion, limite])
  } finally {
    if (timeout !== undefined) window.clearTimeout(timeout)
  }
}

// ───────────────────────── API pública ─────────────────────────

export async function login(codigoInput: string): Promise<Resultado<SesionPaciente>> {
  const codigo = codigoInput.trim()
  if (!codigo.startsWith('nc_')) return { ok: false, error: 'ACCESO_DENEGADO' }

  // Detectar tipo de código por prefijo
  try {
    const respuesta = DATA_MODE === 'mock'
      ? await retrasoMock(loginMock(codigo))
      : await llamarAppsScript('login', { codigo_acceso: codigo })

    if (!respuesta.ok || !respuesta.paciente) {
      return { ok: false, error: (respuesta.error as CodigoError) ?? 'ACCESO_DENEGADO' }
    }

    guardarSesion(codigo)
    return {
      ok: true,
      data: {
        paciente: mapPaciente(respuesta.paciente),
        planes: (respuesta.planes ?? []).map(mapPlan),
        seguimiento: (respuesta.seguimiento ?? []).map(mapSeguimiento),
      },
    }
  } catch {
    return { ok: false, error: 'ERROR_RED' }
  }
}

const SUBSCRIBER_STORAGE_KEY = 'nutriplan_suscriptor'
const SUBSCRIBER_REVALIDATE_MS = 12 * 60 * 60 * 1000

interface SesionSuscriptorGuardada {
  codigo: string
  suscriptor?: Suscriptor
  validadoEn: number
}

function leerSesionSuscriptor(): SesionSuscriptorGuardada | null {
  const valor = localStorage.getItem(SUBSCRIBER_STORAGE_KEY) || sessionStorage.getItem(SUBSCRIBER_STORAGE_KEY)
  if (!valor) return null
  try {
    const sesion = JSON.parse(valor) as SesionSuscriptorGuardada
    if (!sesion.codigo) return null
    return sesion
  } catch {
    // Compatibilidad con la versiÃ³n anterior, que guardaba solo el cÃ³digo.
    return { codigo: valor, validadoEn: 0 }
  }
}

export function restoreSubscriberSession(): string | null {
  return leerSesionSuscriptor()?.codigo ?? null
}

export function getStoredSubscriber(): Suscriptor | null {
  return leerSesionSuscriptor()?.suscriptor ?? null
}

export function logoutSubscriber(): void {
  localStorage.removeItem(SUBSCRIBER_STORAGE_KEY)
  sessionStorage.removeItem(SUBSCRIBER_STORAGE_KEY)
}

export async function loginSubscriber(codigoInput: string): Promise<Resultado<Suscriptor>> {
  const codigo = codigoInput.trim().toUpperCase()
  if (!/^NCNWTH-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codigo)) {
    return { ok: false, error: 'ACCESO_DENEGADO' }
  }
  if (DATA_MODE === 'mock' || (import.meta.env.DEV && codigo.startsWith('NCNWTH-DEMO-'))) {
    await retrasoMock(null, 250)
    const hoy = new Date()
    const fecha = (dias: number) => new Date(hoy.getTime() + dias * 86_400_000).toISOString()
    const pruebas: Record<string, Suscriptor> = {
      'NCNWTH-DEMO-ACTI-0001': {
        id: 'SUB-DEMO-ACTIVO',
        nombre: 'Suscriptor Demo',
        correo: 'demo.activo@nutriplan.pe',
        estado: 'ACTIVO',
        fechaInicio: fecha(-3),
        fechaFin: fecha(27),
      },
      'NCNWTH-DEMO-EXPI-0001': {
        id: 'SUB-DEMO-EXPIRADO',
        nombre: 'Suscriptor Vencido',
        correo: 'demo.vencido@nutriplan.pe',
        estado: 'EXPIRADO',
        fechaInicio: fecha(-35),
        fechaFin: fecha(-5),
      },
      'NCNWTH-DEMO-SUSP-0001': {
        id: 'SUB-DEMO-SUSPENDIDO',
        nombre: 'Suscriptor Suspendido',
        correo: 'demo.suspendido@nutriplan.pe',
        estado: 'SUSPENDIDO',
        fechaInicio: fecha(-10),
        fechaFin: fecha(20),
      },
    }
    const prueba = pruebas[codigo]
    if (!prueba) return { ok: false, error: 'ACCESO_DENEGADO' }
    if (prueba.estado === 'EXPIRADO') return { ok: false, error: 'SUSCRIPCION_EXPIRADA' }
    if (prueba.estado !== 'ACTIVO') return { ok: false, error: 'ACCESO_DENEGADO' }
    const sesion: SesionSuscriptorGuardada = { codigo, suscriptor: prueba, validadoEn: Date.now() }
    localStorage.setItem(SUBSCRIBER_STORAGE_KEY, JSON.stringify(sesion))
    sessionStorage.removeItem(SUBSCRIBER_STORAGE_KEY)
    return { ok: true, data: prueba }
  }
  try {
    const respuesta = await llamarAppsScript('login-suscriptor', { codigo_acceso: codigo })
    if (!respuesta.ok || !respuesta.suscriptor) {
      return { ok: false, error: (respuesta.error as CodigoError) ?? 'ACCESO_DENEGADO' }
    }
    const raw = respuesta.suscriptor as Suscriptor & { fecha_inicio?: string; fecha_fin?: string }
    const suscriptor: Suscriptor = {
      id: String(raw.id),
      nombre: String(raw.nombre || 'Suscriptor'),
      correo: String(raw.correo || ''),
      estado: String(raw.estado || 'ACTIVO'),
      fechaInicio: raw.fechaInicio || raw.fecha_inicio,
      fechaFin: raw.fechaFin || raw.fecha_fin,
    }
    const sesion: SesionSuscriptorGuardada = { codigo, suscriptor, validadoEn: Date.now() }
    localStorage.setItem(SUBSCRIBER_STORAGE_KEY, JSON.stringify(sesion))
    sessionStorage.removeItem(SUBSCRIBER_STORAGE_KEY)
    return { ok: true, data: suscriptor }
  } catch {
    return { ok: false, error: 'ERROR_RED' }
  }
}

export async function revalidateSubscriberSession(force = false): Promise<Resultado<Suscriptor> | null> {
  const sesion = leerSesionSuscriptor()
  if (!sesion) return null
  if (sesion.suscriptor?.fechaFin) {
    const fechaFin = new Date(sesion.suscriptor.fechaFin)
    fechaFin.setHours(23, 59, 59, 999)
    if (!Number.isNaN(fechaFin.getTime()) && fechaFin.getTime() < Date.now()) {
      force = true
    }
  }
  if (!force && sesion.suscriptor && Date.now() - sesion.validadoEn < SUBSCRIBER_REVALIDATE_MS) {
    return { ok: true, data: sesion.suscriptor }
  }
  const resultado = await loginSubscriber(sesion.codigo)
  if (!resultado.ok && resultado.error !== 'ERROR_RED') logoutSubscriber()
  return resultado
}

export async function getPlanes(): Promise<Resultado<Plan[]>> {
  const codigo = restoreSession()
  if (!codigo) return { ok: false, error: 'NO_AUTENTICADO' }

  try {
    const respuesta =
      DATA_MODE === 'mock' ? await retrasoMock(planesMock(codigo)) : await llamarAppsScript('planes', { codigo_acceso: codigo })

    if (!respuesta.ok) return { ok: false, error: (respuesta.error as CodigoError) ?? 'ACCESO_DENEGADO' }
    return { ok: true, data: (respuesta.planes ?? []).map(mapPlan) }
  } catch {
    return { ok: false, error: 'ERROR_RED' }
  }
}

// Último plan descargado, para no volver a pedirlo si la paciente sale del
// visor y entra de nuevo. Solo uno: guardar varios PDF en memoria es caro en
// un teléfono. Vive en memoria, así que se pierde al cerrar la pestaña — no
// deja el plan de nadie guardado en el dispositivo.
let planEnCache: { id: string; bytes: Uint8Array } | null = null

// Descarga el PDF del plan a través del proxy Apps Script (el frontend no
// puede leer Drive directamente por CORS). Devuelve los bytes para pdf.js.
// En modo mock devuelve null → el visor usa el url local del plan.
export async function getPlanPdf(planId: string): Promise<Uint8Array | null> {
  if (DATA_MODE === 'mock') return null
  const codigo = restoreSession()
  if (!codigo) return null

  if (planEnCache?.id === planId) return planEnCache.bytes.slice()

  const respuesta = await conTiempoLimite(
    // Drive puede tardar en despertar y codificar un ebook grande. Cortar a
    // los ocho segundos hacía caer planes válidos al visor genérico de Drive.
    llamarAppsScript('pdf', { codigo_acceso: codigo, plan_id: planId }, 25_000),
    26_000,
  )
  if (!respuesta) return null
  if (!respuesta.ok || !respuesta.base64) return null

  const bytes = base64ABytes(respuesta.base64)
  planEnCache = { id: planId, bytes: bytes.slice() }
  return bytes
}

/**
 * Bytes de un documento descargable (lista de compras, intercambios…).
 *
 * Los PDF de RECURSOS viven en Drive y el navegador no puede leerlos con
 * `fetch` (Drive no responde CORS), así que hacen falta a través del proxy,
 * igual que el plan. Solo teniendo los bytes se puede abrir la hoja nativa
 * de compartir y mandar el archivo por WhatsApp.
 *
 * Devuelve null si el Apps Script desplegado todavía no tiene la acción
 * 'recurso' — en ese caso la UI cae al enlace directo de Drive, que es el
 * comportamiento anterior. Ver `apps-script/parche-recursos.gs`.
 */
export async function getRecursoPdf(recursoId: string): Promise<Uint8Array | null> {
  if (DATA_MODE === 'mock') return null
  const codigo = restoreSession()
  if (!codigo) return null

  try {
    const respuesta = await conTiempoLimite(
      llamarAppsScript('recurso', { codigo_acceso: codigo, recurso_id: recursoId }, 8_000),
      8_500,
    )
    if (!respuesta) return null
    if (!respuesta.ok || !respuesta.base64) return null
    return base64ABytes(respuesta.base64)
  } catch {
    return null
  }
}

function base64ABytes(base64: string): Uint8Array {
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

// Documentos descargables del paciente (asociados a sus planes). Se filtran
// por plan en la UI. En modo mock salen de los fixtures.
export async function getRecursos(): Promise<Resultado<Recurso[]>> {
  const codigo = restoreSession()
  if (!codigo) return { ok: false, error: 'NO_AUTENTICADO' }

  try {
    const respuesta =
      DATA_MODE === 'mock'
        ? await retrasoMock(recursosMock(codigo))
        : await llamarAppsScript('recursos', { codigo_acceso: codigo })

    if (!respuesta.ok) return { ok: false, error: (respuesta.error as CodigoError) ?? 'ACCESO_DENEGADO' }
    // La hoja tiene filas reservadas (id sin contenido) y filas a medio
    // llenar. Un recurso sin enlace no se puede descargar: no se muestra.
    const prioridad: Record<TipoRecurso, number> = { PLAN: 0, COMPRAS: 1, INTERCAMBIOS: 2, GUIA: 3, OTRO: 4 }
    const recursos = (respuesta.recursos ?? []).map(mapRecurso).filter((r) => r.urlPdf.trim() !== '').sort((a, b) => prioridad[a.tipo] - prioridad[b.tipo] || a.titulo.localeCompare(b.titulo, 'es'))
    return { ok: true, data: recursos }
  } catch {
    return { ok: false, error: 'ERROR_RED' }
  }
}

/** Catálogo público. Las filas nuevas aparecen sin tocar el frontend. */
export async function getCookbooksPublicos(): Promise<Resultado<Cookbook[]>> {
  try {
    const respuesta = DATA_MODE === 'mock'
      ? await retrasoMock({ ok: true, cookbooks: [] } satisfies RespuestaGAS, 150)
      : await llamarAppsScript('cookbooks')

    if (!respuesta.ok) return { ok: false, error: (respuesta.error as CodigoError) ?? 'ERROR_SERVIDOR' }
    const cookbooks = (respuesta.cookbooks ?? [])
      .map(mapCookbook)
      .filter((cookbook) => cookbook.urlPortada !== '')
      .sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo, 'es'))
    return { ok: true, data: cookbooks }
  } catch {
    return { ok: false, error: 'ERROR_RED' }
  }
}

/**
 * Biblioteca visual. Sin código devuelve solo PUBLICO; con una sesión válida
 * Apps Script añade PACIENTE antes de enviar la respuesta.
 */
const educacionCache = new Map<string, { resultado: Resultado<Educacion[]>; vence: number }>()
const educacionEnCurso = new Map<string, Promise<Resultado<Educacion[]>>>()
const EDUCACION_CACHE_MS = 5 * 60 * 1000
const EDUCACION_STORAGE_PREFIX = 'nutriplan.educacion.v1.'

function claveEducacion() {
  return restoreSession() || 'PUBLICO'
}

export function obtenerEducacionGuardada(): Educacion[] {
  const clave = claveEducacion()
  const memoria = educacionCache.get(clave)?.resultado
  if (memoria?.ok) return memoria.data
  try {
    const raw = localStorage.getItem(`${EDUCACION_STORAGE_PREFIX}${clave}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { temas?: Educacion[] }
    return Array.isArray(parsed.temas) ? parsed.temas : []
  } catch {
    return []
  }
}

function guardarEducacion(clave: string, temas: Educacion[]) {
  try {
    localStorage.setItem(`${EDUCACION_STORAGE_PREFIX}${clave}`, JSON.stringify({ temas, actualizadoEn: Date.now() }))
  } catch {
    // En modo privado se conserva al menos la caché en memoria.
  }
}

async function cargarEducacion(): Promise<Resultado<Educacion[]>> {
  try {
    const codigo = restoreSession()
    const respuesta = DATA_MODE === 'mock'
      ? await retrasoMock({ ok: true, educacion: [], laminasEducacion: [] } satisfies RespuestaGAS, 150)
      : await llamarAppsScript('educacion', codigo ? { codigo_acceso: codigo } : {})

    // La pantalla puede publicarse antes de que Apps Script se actualice. En
    // vez de mostrar un error técnico, queda vacía hasta conectar la pestaña.
    if (!respuesta.ok && respuesta.error === 'ACCION_DESCONOCIDA') return { ok: true, data: [] }
    if (!respuesta.ok) return { ok: false, error: (respuesta.error as CodigoError) ?? 'ERROR_SERVIDOR' }
    const educacion = (respuesta.educacion ?? [])
      .map((tema) => mapEducacion(tema, respuesta.laminasEducacion ?? []))
      .filter((tema) => tema.portadaUrl !== '')
      .sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo, 'es'))
    return { ok: true, data: educacion }
  } catch {
    return { ok: false, error: 'ERROR_RED' }
  }
}

export function getEducacion(): Promise<Resultado<Educacion[]>> {
  const clave = claveEducacion()
  const cache = educacionCache.get(clave)
  if (cache && cache.vence > Date.now()) return Promise.resolve(cache.resultado)

  const enCurso = educacionEnCurso.get(clave)
  if (enCurso) return enCurso

  const solicitud = cargarEducacion()
    .then((resultado) => {
      if (resultado.ok) {
        educacionCache.set(clave, {
          resultado,
          vence: Date.now() + EDUCACION_CACHE_MS,
        })
        guardarEducacion(clave, resultado.data)
      }
      return resultado
    })
    .finally(() => {
      educacionEnCurso.delete(clave)
    })

  educacionEnCurso.set(clave, solicitud)
  return solicitud
}

/** Rutinas privadas: Apps Script ya filtra por la paciente autenticada. */
export async function getRutinas(): Promise<Resultado<Rutina[]>> {
  const codigo = restoreSession()
  if (!codigo) return { ok: false, error: 'NO_AUTENTICADO' }
  try {
    const respuesta = DATA_MODE === 'mock'
      ? await retrasoMock({ ok: true, rutinas: [], rutinaEjercicios: [], ejercicios: [] } satisfies RespuestaGAS, 150)
      : await llamarAppsScript('rutinas', { codigo_acceso: codigo })
    // La pantalla puede publicarse antes de que el endpoint de rutinas sea desplegado.
    // En ese caso conservamos una experiencia amable: simplemente no hay rutina aún.
    if (!respuesta.ok && respuesta.error === 'ACCION_DESCONOCIDA') return { ok: true, data: [] }
    if (!respuesta.ok) return { ok: false, error: (respuesta.error as CodigoError) ?? 'ERROR_SERVIDOR' }
    return { ok: true, data: mapRutinas(respuesta.rutinas ?? [], respuesta.rutinaEjercicios ?? [], respuesta.ejercicios ?? []) }
  } catch {
    return { ok: false, error: 'ERROR_RED' }
  }
}

export async function getSeguimiento(): Promise<Resultado<Seguimiento[]>> {
  const codigo = restoreSession()
  if (!codigo) return { ok: false, error: 'NO_AUTENTICADO' }

  try {
    const respuesta =
      DATA_MODE === 'mock'
        ? await retrasoMock(seguimientoMock(codigo))
        : await llamarAppsScript('seguimiento', { codigo_acceso: codigo })

    if (!respuesta.ok) return { ok: false, error: (respuesta.error as CodigoError) ?? 'ACCESO_DENEGADO' }
    return { ok: true, data: (respuesta.seguimiento ?? []).map(mapSeguimiento) }
  } catch {
    return { ok: false, error: 'ERROR_RED' }
  }
}

/**
 * Tabla de alimentos — pública (no requiere código): es el gancho de
 * captación para visitantes.
 *
 * A diferencia del resto, NO viaja por Apps Script: la Tabla Peruana es una
 * referencia oficial y fija, así que se sirve desde el propio bundle
 * (`alimentos.tabla.ts`). Eso la vuelve instantánea, disponible sin conexión,
 * y a salvo de que una edición de la hoja la dañe — que fue justo lo que
 * pasó: al pegarla, Sheets convirtió los decimales en fechas ("12.8" g de
 * proteína quedó como "12 de agosto") y la calculadora mostraba NaN.
 *
 * Para actualizarla se regenera desde `datos/tabla_peruana_alimentos.csv`.
 *
 * Se importa de forma diferida: son 1118 alimentos que solo hacen falta al
 * abrir la calculadora, así que no lastran la carga inicial de la app.
 */
export async function listAlimentos(): Promise<Alimento[]> {
  if (DATA_MODE === 'mock') return (await retrasoMock(ALIMENTOS_MOCK, 150)).map(mapAlimento)
  const { TABLA_ALIMENTOS } = await import('../data/alimentos.tabla')
  return TABLA_ALIMENTOS.map(mapAlimento)
}

// ───────────────────────── Implementación mock ─────────────────────────

function loginMock(codigo: string): RespuestaGAS {
  const sesion = SESIONES_MOCK[codigo]
  if (!sesion || sesion.paciente.estado !== 'ACTIVO') {
    return { ok: false, error: 'ACCESO_DENEGADO' }
  }
  return { ok: true, paciente: sesion.paciente, planes: sesion.planes, seguimiento: sesion.seguimiento }
}

function planesMock(codigo: string): RespuestaGAS {
  const sesion = SESIONES_MOCK[codigo]
  if (!sesion || sesion.paciente.estado !== 'ACTIVO') return { ok: false, error: 'ACCESO_DENEGADO' }
  return { ok: true, planes: sesion.planes }
}

function seguimientoMock(codigo: string): RespuestaGAS {
  const sesion = SESIONES_MOCK[codigo]
  if (!sesion || sesion.paciente.estado !== 'ACTIVO') return { ok: false, error: 'ACCESO_DENEGADO' }
  return { ok: true, seguimiento: sesion.seguimiento }
}

function recursosMock(codigo: string): RespuestaGAS {
  const sesion = SESIONES_MOCK[codigo]
  if (!sesion || sesion.paciente.estado !== 'ACTIVO') return { ok: false, error: 'ACCESO_DENEGADO' }
  return { ok: true, recursos: sesion.recursos ?? [] }
}
