import { createHmac, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { sendPatientPush } from '../_lib/push.js'

export const config = { maxDuration: 60 }

type Request = { method?: string; headers: Record<string, string | string[] | undefined>; body?: { action?: unknown; payload?: unknown } }
type Response = { status: (code: number) => Response; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }

const COOKIE = 'nutriplan_admin_session'
const ACTIONS = new Set([
  'admin_resumen', 'admin_generar_codigo', 'admin_guardar_paciente', 'admin_guardar_plan',
  'admin_eliminar_paciente', 'admin_eliminar_plan',
  'admin_guardar_ciclo', 'admin_enviar_notificacion',
  'admin_guardar_recurso', 'admin_eliminar_recurso', 'admin_guardar_seguimiento', 'admin_eliminar_seguimiento',
  'admin_crear_token_subida', 'admin_estado_subida',
  'admin_subir_imagen_recetario', 'admin_guardar_recetario', 'admin_publicar_recetario',
  'admin_estado_recetario', 'admin_eliminar_recetario',
  'admin_guardar_rutina', 'admin_eliminar_rutina',
])

const READ_ONLY_ACTIONS = new Set(['admin_resumen'])

async function requestAppsScript(url: string, body: string, action: string) {
  const attempts = READ_ONLY_ACTIONS.has(action) ? 3 : 1
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body,
        signal: AbortSignal.timeout(15_000),
      })
      if (response.ok || response.status < 500 || attempt === attempts) return response
      lastError = new Error(`Apps Script HTTP ${response.status}`)
    } catch (error) {
      lastError = error
      if (attempt === attempts) throw error
    }
    await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
  }

  throw lastError
}

function cookie(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header
  return value?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? null
}

function validSession(token: string | null, key: string) {
  if (!token) return false
  const parts = decodeURIComponent(token).split('.')
  if (parts.length !== 3 || parts[0] !== 'admin' || Number(parts[1]) <= Date.now()) return false
  const payload = `${parts[0]}.${parts[1]}`
  const expected = createHmac('sha256', key).update(payload).digest('base64url')
  const actual = parts[2]
  const a = Buffer.from(expected); const b = Buffer.from(actual)
  return a.length === b.length && timingSafeEqual(a, b)
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method !== 'POST') return res.status(405).json({ error: 'METODO_NO_PERMITIDO' })
  const password = process.env.ADMIN_PASSWORD
  const scriptSecret = process.env.ADMIN_API_SECRET || password
  const scriptUrl = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
  if (!password || !scriptSecret) return res.status(503).json({ error: 'ADMIN_NO_CONFIGURADO' })
  if (!validSession(cookie(req.headers.cookie), password)) return res.status(401).json({ error: 'NO_AUTORIZADO' })
  const action = typeof req.body?.action === 'string' ? req.body.action : ''
  if (!ACTIONS.has(action)) return res.status(400).json({ error: 'ACCION_INVALIDA' })
  try {
    if (action === 'admin_subir_imagen_recetario') {
      const body = (typeof req.body?.payload === 'object' && req.body.payload ? req.body.payload : {}) as { archivo?: { nombre?: string; mime?: string; base64?: string } }
      const file = body.archivo
      const supabaseUrl = process.env.SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!file?.nombre || !file.base64 || !supabaseUrl || !serviceKey) return res.status(400).json({ ok: false, error: 'DATOS_INVALIDOS' })
      const safeName = file.nombre.replace(/[^a-zA-Z0-9._-]/g, '-')
      const bucket = 'weekly-cookbooks'
      const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data: bucketInfo, error: bucketError } = await supabase.storage.getBucket(bucket)
      if (bucketError && !String(bucketError.message).toLowerCase().includes('not found')) return res.status(502).json({ ok: false, error: 'ALMACENAMIENTO_NO_DISPONIBLE' })
      if (!bucketInfo) {
        const { error } = await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: 8 * 1024 * 1024, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] })
        if (error && !String(error.message).toLowerCase().includes('already exists')) return res.status(502).json({ ok: false, error: 'ALMACENAMIENTO_NO_DISPONIBLE' })
      }
      const path = `images/${Date.now()}-${safeName}`
      const bytes = Buffer.from(file.base64, 'base64')
      const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: file.mime || 'image/jpeg', upsert: false })
      if (error) return res.status(502).json({ ok: false, error: 'NO_SE_PUDO_SUBIR_IMAGEN' })
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      return res.status(200).json({ ok: true, nombre: file.nombre, url: data.publicUrl })
    }
    if (action === 'admin_guardar_recetario') {
      const body = (typeof req.body?.payload === 'object' && req.body.payload ? req.body.payload : {}) as { recetario?: { plan_id?: string; cookbook?: Record<string, unknown>; image_urls?: Record<string, string> } }
      const item = body.recetario
      const cookbook = item?.cookbook
      const meta = cookbook?.cookbook as { week_start?: string } | undefined
      const supabaseUrl = process.env.SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!item?.plan_id || !cookbook || !meta?.week_start || !supabaseUrl || !serviceKey) return res.status(400).json({ ok: false, error: 'DATOS_INVALIDOS' })
      const recipes = cookbook.recipes as Array<{ image_file?: string }> | undefined
      for (const recipe of recipes ?? []) if (recipe.image_file && item.image_urls?.[recipe.image_file]) recipe.image_file = item.image_urls[recipe.image_file]
      const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const dataBucket = 'weekly-cookbooks-data'
      const { data: bucketInfo } = await supabase.storage.getBucket(dataBucket)
      if (!bucketInfo) {
        const { error: bucketCreateError } = await supabase.storage.createBucket(dataBucket, { public: false, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: ['application/json'] })
        if (bucketCreateError && !String(bucketCreateError.message).toLowerCase().includes('already exists')) return res.status(502).json({ ok: false, error: 'ALMACENAMIENTO_NO_DISPONIBLE' })
      }
      const path = `drafts/${item.plan_id}/${meta.week_start}.json`
      const { error } = await supabase.storage.from(dataBucket).upload(path, Buffer.from(JSON.stringify(cookbook)), { contentType: 'application/json', upsert: true })
      if (error) return res.status(502).json({ ok: false, error: 'NO_SE_PUDO_GUARDAR' })
      return res.status(200).json({ ok: true, plan_id: item.plan_id, week_start: meta.week_start, estado: 'BORRADOR' })
    }
    if (action === 'admin_publicar_recetario') {
      const body = (typeof req.body?.payload === 'object' && req.body.payload ? req.body.payload : {}) as { plan_id?: string; week_start?: string }
      const supabaseUrl = process.env.SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!body.plan_id || !body.week_start || !supabaseUrl || !serviceKey) return res.status(400).json({ ok: false, error: 'DATOS_INVALIDOS' })
      const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const dataBucket = 'weekly-cookbooks-data'
      const draftPath = `drafts/${body.plan_id}/${body.week_start}.json`
      const { data: draft, error: readError } = await supabase.storage.from(dataBucket).download(draftPath)
      if (readError || !draft) return res.status(404).json({ ok: false, error: 'RECETARIO_NO_ENCONTRADO' })
      const publishedPath = `published/${body.plan_id}/${body.week_start}.json`
      const { error } = await supabase.storage.from(dataBucket).upload(publishedPath, Buffer.from(await draft.arrayBuffer()), { contentType: 'application/json', upsert: true })
      if (error) return res.status(502).json({ ok: false, error: 'NO_SE_PUDO_PUBLICAR' })
      return res.status(200).json({ ok: true, estado: 'PUBLICADO' })
    }
    if (action === 'admin_estado_recetario') {
      const body = (typeof req.body?.payload === 'object' && req.body.payload ? req.body.payload : {}) as { plan_id?: string; week_start?: string }
      const supabaseUrl = process.env.SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!body.plan_id || !body.week_start || !supabaseUrl || !serviceKey) return res.status(400).json({ ok: false, error: 'DATOS_INVALIDOS' })
      const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const bucket = supabase.storage.from('weekly-cookbooks-data')
      const draftPath = `drafts/${body.plan_id}/${body.week_start}.json`
      const publishedPath = `published/${body.plan_id}/${body.week_start}.json`
      const [draft, published] = await Promise.all([bucket.download(draftPath), bucket.download(publishedPath)])
      const estado = published.data ? 'PUBLICADO' : draft.data ? 'BORRADOR' : 'NINGUNO'
      return res.status(200).json({ ok: true, estado, borrador: Boolean(draft.data), publicado: Boolean(published.data) })
    }
    if (action === 'admin_eliminar_recetario') {
      const body = (typeof req.body?.payload === 'object' && req.body.payload ? req.body.payload : {}) as { plan_id?: string; week_start?: string }
      const supabaseUrl = process.env.SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!body.plan_id || !body.week_start || !supabaseUrl || !serviceKey) return res.status(400).json({ ok: false, error: 'DATOS_INVALIDOS' })
      const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      const dataBucket = supabase.storage.from('weekly-cookbooks-data')
      const paths = [`drafts/${body.plan_id}/${body.week_start}.json`, `published/${body.plan_id}/${body.week_start}.json`]
      const stored = await Promise.all(paths.map((path) => dataBucket.download(path)))
      const imagePaths = new Set<string>()
      for (const item of stored) {
        if (!item.data) continue
        try {
          const parsed = JSON.parse(await item.data.text()) as { recipes?: Array<{ image_file?: string }> }
          for (const recipe of parsed.recipes ?? []) {
            if (!recipe.image_file) continue
            const marker = '/storage/v1/object/public/weekly-cookbooks/'
            const markerIndex = recipe.image_file.indexOf(marker)
            if (markerIndex >= 0) imagePaths.add(decodeURIComponent(recipe.image_file.slice(markerIndex + marker.length).split('?')[0]))
          }
        } catch { /* Un JSON inválido no debe impedir eliminar el archivo solicitado. */ }
      }
      const { error: deleteError } = await dataBucket.remove(paths)
      if (deleteError) return res.status(502).json({ ok: false, error: 'NO_SE_PUDO_ELIMINAR_RECETARIO' })
      if (imagePaths.size) {
        const { error: imageError } = await supabase.storage.from('weekly-cookbooks').remove([...imagePaths])
        if (imageError) console.error('NutriPlan cookbook image cleanup error', imageError.message)
      }
      return res.status(200).json({ ok: true, estado: 'ELIMINADO', imagenes_eliminadas: imagePaths.size })
    }
    if (action === 'admin_enviar_notificacion') {
      const manual = (typeof req.body?.payload === 'object' && req.body.payload ? req.body.payload : {}) as { paciente_id?: string; titulo?: string; mensaje?: string; url?: string }
      if (!manual.paciente_id || !manual.titulo || !manual.mensaje) return res.status(400).json({ error: 'DATOS_INVALIDOS' })
      const delivery = await sendPatientPush(manual.paciente_id, {
        title: manual.titulo.slice(0, 80),
        body: manual.mensaje.slice(0, 180),
        tag: `manual-${Date.now()}`,
        url: manual.url || '/home',
      })
      return res.status(200).json({ ok: true, enviados: delivery.sent, dispositivos: delivery.subscriptions })
    }
    if (!scriptUrl) return res.status(503).json({ error: 'SHEET_NO_CONFIGURADO' })
    const isExtendedAdmin = action === 'admin_guardar_seguimiento' || action === 'admin_eliminar_seguimiento'
    const requestPayload = { action: isExtendedAdmin ? 'admin_resumen' : action, ...(isExtendedAdmin ? { admin_action: action } : {}), ...(typeof req.body?.payload === 'object' && req.body.payload ? req.body.payload : {}) }
    let result = await requestAppsScript(scriptUrl, JSON.stringify({ ...requestPayload, admin_password: scriptSecret }), action)
    if (!result.ok) return res.status(502).json({ error: 'SHEET_NO_DISPONIBLE' })
    let payload = await result.json() as { ok?: boolean; error?: string }
    // Algunos despliegues antiguos de Apps Script comparten la contraseña del
    // panel en vez de ADMIN_API_SECRET. Solo se reintenta cuando Google rechaza
    // la autenticación, antes de que la acción pueda modificar datos.
    if (!payload.ok && payload.error === 'NO_AUTORIZADO' && scriptSecret !== password) {
      result = await requestAppsScript(scriptUrl, JSON.stringify({ ...requestPayload, admin_password: password }), action)
      if (!result.ok) return res.status(502).json({ error: 'SHEET_NO_DISPONIBLE' })
      payload = await result.json() as { ok?: boolean; error?: string }
    }
    if (!payload.ok) console.error('NutriPlan admin Apps Script error', { action, error: payload.error ?? 'DESCONOCIDO' })
    if (payload.ok && action === 'admin_guardar_plan') {
      const plan = (typeof req.body?.payload === 'object' && req.body.payload ? req.body.payload : {}) as { plan?: { paciente_id?: string; titulo?: string; id?: string; numero_semana?: string | number } }
      if (plan.plan?.paciente_id) {
        const semana = Number(plan.plan.numero_semana)
        await sendPatientPush(plan.plan.paciente_id, {
          title: Number.isFinite(semana) && semana > 0 ? `Tu nutricionista subió la semana ${semana}` : 'Tu nuevo plan está listo',
          body: Number.isFinite(semana) && semana > 0 ? `La dieta de la semana ${semana} ya está disponible en NutriPlan.` : `Joel publicó ${plan.plan.titulo || 'tu nuevo plan nutricional'}.`,
          tag: `plan-${plan.plan.id || Date.now()}`,
          url: '/home',
        }).catch((error) => console.error('NutriPlan push error', error))
      }
    }
    return res.status(payload.ok ? 200 : 400).json(payload)
  } catch (error) {
    console.error('NutriPlan admin connection error', { action, error: error instanceof Error ? error.message : String(error) })
    return res.status(502).json({ error: 'SHEET_NO_DISPONIBLE' })
  }
}
