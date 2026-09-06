import { vapidPublicKey } from '../_lib/push.js'

type Request = { method?: string; body?: { code?: unknown; endpoint?: unknown; subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } } }
type Response = { status: (code: number) => Response; json: (body: unknown) => void; setHeader: (name: string, value: string) => void }

async function script(action: string, payload: Record<string, unknown>) {
  const url = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
  if (!url) throw new Error('NO_CONFIGURADO')
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...payload }) })
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method === 'GET') {
    try { return res.status(200).json({ publicKey: vapidPublicKey() }) }
    catch { return res.status(503).json({ error: 'PUSH_NO_CONFIGURADO' }) }
  }
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
  if (!code.startsWith('nc_')) return res.status(401).json({ error: 'ACCESO_DENEGADO' })
  try {
    if (req.method === 'POST') {
      const sub = req.body?.subscription
      if (typeof sub?.endpoint !== 'string' || typeof sub.keys?.p256dh !== 'string' || typeof sub.keys.auth !== 'string') return res.status(400).json({ error: 'SUSCRIPCION_INVALIDA' })
      const result = await script('push_suscribir', { codigo_acceso: code, suscripcion: { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth } })
      const body = await result.json() as { ok?: boolean }
      return res.status(body.ok ? 200 : 401).json(body)
    }
    if (req.method === 'DELETE') {
      const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : ''
      const result = await script('push_desuscribir', { codigo_acceso: code, endpoint })
      return res.status(result.ok ? 200 : 502).json(await result.json())
    }
    return res.status(405).json({ error: 'METODO_NO_PERMITIDO' })
  } catch { return res.status(502).json({ error: 'SHEET_NO_DISPONIBLE' }) }
}
