import { PUBLIC_RECIPE_ID_SET } from '../src/lib/publicRecipes.js'

type Request = { method?: string; body?: { id?: unknown } }
type Response = {
  status: (code: number) => Response
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  if (req.method !== 'POST') return res.status(405).json({ error: 'METODO_NO_PERMITIDO' })
  const id = typeof req.body?.id === 'string' ? req.body.id.trim() : ''
  if (!id || !PUBLIC_RECIPE_ID_SET.has(id)) return res.status(404).json({ error: 'RECETA_NO_ENCONTRADA' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'RECETAS_NO_CONFIGURADAS' })
  const headers: Record<string, string> = { apikey: serviceKey }
  if (!serviceKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${serviceKey}`

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/recipes?id=eq.${encodeURIComponent(id)}&select=*`, {
      headers,
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return res.status(502).json({ error: 'RECETA_NO_DISPONIBLE' })
    const recipes = await response.json() as Record<string, unknown>[]
    if (!recipes[0]) return res.status(404).json({ error: 'RECETA_NO_ENCONTRADA' })
    return res.status(200).json({ ok: true, receta: { ...recipes[0], estado: 'GRATUITO', visible: true } })
  } catch (error) {
    const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    return res.status(502).json({ error: timeout ? 'RECETA_TIMEOUT' : 'RECETA_NO_DISPONIBLE' })
  }
}
