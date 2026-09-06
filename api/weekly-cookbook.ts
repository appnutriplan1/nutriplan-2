import { createClient } from '@supabase/supabase-js'

type Request = { method?: string; body?: { codigo?: unknown; planId?: unknown; weekStart?: unknown } }
type Response = { status: (code: number) => Response; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  if (req.method !== 'POST') return res.status(405).json({ error: 'METODO_NO_PERMITIDO' })
  const codigo = typeof req.body?.codigo === 'string' ? req.body.codigo.trim() : ''
  const planId = typeof req.body?.planId === 'string' ? req.body.planId.trim() : ''
  const requestedWeek = typeof req.body?.weekStart === 'string' ? req.body.weekStart.trim() : ''
  const scriptUrl = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!codigo || !planId || !scriptUrl || !supabaseUrl || !serviceKey) return res.status(400).json({ error: 'DATOS_INVALIDOS' })
  const loginResponse = await fetch(scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'login', codigo_acceso: codigo }), signal: AbortSignal.timeout(12_000) })
  const login = await loginResponse.json() as { ok?: boolean; planes?: Array<{ id?: string }> }
  if (!login.ok || !login.planes?.some((plan) => String(plan.id) === planId)) return res.status(401).json({ error: 'ACCESO_DENEGADO' })
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const dataBucket = 'weekly-cookbooks-data'
  let weekStart = requestedWeek
  if (!weekStart) {
    const { data, error } = await supabase.storage.from(dataBucket).list(`published/${planId}`, { limit: 100, sortBy: { column: 'name', order: 'desc' } })
    if (error) return res.status(502).json({ error: 'ALMACENAMIENTO_NO_DISPONIBLE' })
    weekStart = data?.find((file) => file.name.endsWith('.json'))?.name.replace(/\.json$/, '') || ''
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return res.status(404).json({ error: 'RECETARIO_NO_ENCONTRADO' })
  const { data, error } = await supabase.storage.from(dataBucket).download(`published/${planId}/${weekStart}.json`)
  if (error || !data) return res.status(404).json({ error: 'RECETARIO_NO_ENCONTRADO' })
  return res.status(200).json({ ok: true, cookbook: JSON.parse(await data.text()) })
}
