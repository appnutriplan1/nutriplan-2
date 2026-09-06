import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const COOKIE = 'nutriplan_admin_session'
const TTL = 60 * 60 * 8
const ACTIONS = new Set([
  'admin_resumen', 'admin_generar_codigo', 'admin_guardar_paciente', 'admin_guardar_plan',
  'admin_guardar_recurso', 'admin_eliminar_recurso', 'admin_guardar_seguimiento',
  'admin_guardar_permiso_receta', 'admin_guardar_permisos_recetas', 'admin_inicializar_permisos_recetas',
  'admin_suscriptores', 'admin_generar_codigo_suscriptor', 'admin_actualizar_suscriptor',
  'laboral_resumen', 'laboral_guardar_empresa', 'laboral_guardar_jornada',
  'laboral_guardar_evaluacion', 'laboral_eliminar_evaluacion', 'laboral_guardar_checklist',
])

const READ_ONLY_ACTIONS = new Set(['admin_resumen', 'admin_suscriptores', 'laboral_resumen'])

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

function send(response: ServerResponse, status: number, body: object) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store, max-age=0')
  response.end(JSON.stringify(body))
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))
  if (!chunks.length) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown> }
  catch { return {} }
}

function signature(value: string, key: string) {
  return createHmac('sha256', key).update(value).digest('base64url')
}

function sessionFrom(request: IncomingMessage) {
  return request.headers.cookie?.split(';').map((item) => item.trim())
    .find((item) => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? ''
}

function validSession(request: IncomingMessage, key: string) {
  const parts = decodeURIComponent(sessionFrom(request)).split('.')
  if (parts.length !== 3 || parts[0] !== 'admin' || Number(parts[1]) <= Date.now()) return false
  const expected = Buffer.from(signature(`${parts[0]}.${parts[1]}`, key))
  const actual = Buffer.from(parts[2])
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function sameSecret(given: unknown, expected: string) {
  if (typeof given !== 'string') return false
  const a = Buffer.from(given); const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function adminDevApi(env: Record<string, string>): Plugin {
  const password = env.ADMIN_PASSWORD
  const scriptSecret = env.ADMIN_API_SECRET || password
  const scriptUrl = env.APPS_SCRIPT_URL || env.VITE_APPS_SCRIPT_URL
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY
  return {
    name: 'nutriplan-admin-dev-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = request.url?.split('?')[0]
        if (path === '/api/receta') {
          if (request.method !== 'POST') return send(response, 405, { error: 'METODO_NO_PERMITIDO' })
          if (!supabaseUrl || !supabaseKey || !scriptUrl) return send(response, 503, { error: 'RECETAS_PRIVADAS_NO_CONFIGURADAS' })
          const body = await readJson(request)
          const id = typeof body.id === 'string' ? body.id.trim() : ''
          const codigoPaciente = typeof body.codigoPaciente === 'string' ? body.codigoPaciente.trim() : ''
          const codigoSuscriptor = typeof body.codigoSuscriptor === 'string' ? body.codigoSuscriptor.trim().toUpperCase() : ''
          if (!id || id.length > 160 || !/^[a-zA-Z0-9_-]+$/.test(id)) return send(response, 400, { error: 'ID_INVALIDO' })
          try {
            const supabaseHeaders: Record<string, string> = { apikey: supabaseKey }
            if (!supabaseKey.startsWith('sb_secret_')) {
              supabaseHeaders.Authorization = `Bearer ${supabaseKey}`
            }
            const recipeResponse = await fetch(`${supabaseUrl}/rest/v1/recipes?id=eq.${encodeURIComponent(id)}&select=*`, {
              headers: supabaseHeaders,
              signal: AbortSignal.timeout(8_000),
            })
            if (!recipeResponse.ok) return send(response, 502, { error: 'RECETA_NO_DISPONIBLE' })
            const recipes = await recipeResponse.json() as Record<string, unknown>[]
            const recipe = recipes[0]
            if (!recipe) return send(response, 404, { error: 'RECETA_NO_ENCONTRADA' })

            const permisosResponse = await fetch(scriptUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'receta_permisos' }),
              signal: AbortSignal.timeout(8_000),
            })
            const permisosBody = await permisosResponse.json() as {
              permisos?: Array<{ recipe_id?: unknown; tipo?: unknown; mostrar_pacientes?: unknown; visible?: unknown }>
            }
            const permiso = permisosBody.permisos?.find((item) => String(item.recipe_id || '') === id)
            const visible = permiso?.visible !== false && recipe.estado !== 'OCULTO'
            const tipo = String(permiso?.tipo || recipe.estado).toUpperCase() === 'PREMIUM' ? 'PREMIUM' : 'GRATUITO'
            const mostrarPacientes = permiso?.mostrar_pacientes === true
            if (!visible) return send(response, 404, { error: 'RECETA_NO_ENCONTRADA' })

            if (tipo === 'PREMIUM') {
              let autorizado = false
              const validar = async (action: string, codigo: string) => {
                const result = await fetch(scriptUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action, codigo_acceso: codigo }),
                  signal: AbortSignal.timeout(8_000),
                })
                const payload = await result.json() as { ok?: boolean }
                return result.ok && payload.ok === true
              }
              if (codigoSuscriptor) autorizado = await validar('login-suscriptor', codigoSuscriptor)
              if (!autorizado && codigoPaciente && mostrarPacientes) autorizado = await validar('login', codigoPaciente)
              if (!autorizado) return send(response, 401, { error: 'ACCESO_DENEGADO' })
            }
            return send(response, 200, {
              ok: true,
              receta: { ...recipe, estado: tipo, mostrar_a_pacientes: mostrarPacientes, visible },
            })
          } catch {
            return send(response, 502, { error: 'RECETA_NO_DISPONIBLE' })
          }
        }
        if (path !== '/api/admin/session' && path !== '/api/admin/data') return next()
        if (!password || !scriptSecret || !scriptUrl) return send(response, 503, { error: 'ADMIN_NO_CONFIGURADO' })
        if (path === '/api/admin/session') {
          if (request.method === 'GET') return send(response, 200, { authenticated: validSession(request, password) })
          if (request.method === 'DELETE') {
            response.setHeader('Set-Cookie', `${COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`)
            return send(response, 200, { authenticated: false })
          }
          if (request.method !== 'POST') return send(response, 405, { error: 'METODO_NO_PERMITIDO' })
          const body = await readJson(request)
          if (!sameSecret(body.password, password)) return send(response, 401, { error: 'CREDENCIALES_INVALIDAS' })
          const payload = `admin.${Date.now() + TTL * 1000}`
          const token = `${payload}.${signature(payload, password)}`
          response.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Max-Age=${TTL}; Path=/; HttpOnly; SameSite=Strict`)
          return send(response, 200, { authenticated: true })
        }
        if (request.method !== 'POST') return send(response, 405, { error: 'METODO_NO_PERMITIDO' })
        if (!validSession(request, password)) return send(response, 401, { error: 'NO_AUTORIZADO' })
        const body = await readJson(request)
        const action = typeof body.action === 'string' ? body.action : ''
        if (!ACTIONS.has(action)) return send(response, 400, { error: 'ACCION_INVALIDA' })
        const isLaboral = action.startsWith('laboral_')
        const isExtended = action === 'admin_guardar_seguimiento'
        const payload = typeof body.payload === 'object' && body.payload ? body.payload : {}
        try {
          const requestBody = JSON.stringify({
              action: isLaboral || isExtended ? 'admin_resumen' : action,
              ...(isLaboral ? { laboral_action: action } : {}),
              ...(isExtended ? { admin_action: action } : {}),
              admin_password: scriptSecret,
              ...payload,
            })
          const result = await requestAppsScript(scriptUrl, requestBody, action)
          const resultBody = await result.json() as { ok?: boolean }
          return send(response, result.ok && resultBody.ok ? 200 : 400, resultBody)
        } catch {
          return send(response, 502, { error: 'SHEET_NO_DISPONIBLE' })
        }
      })
    },
  }
}
