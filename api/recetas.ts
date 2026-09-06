import { PUBLIC_RECIPE_ID_SET } from '../src/lib/publicRecipes.js'

type Request = { method?: string }
type Response = {
  status: (code: number) => Response
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

const CAMPOS_CATALOGO = [
  'id', 'numero', 'titulo', 'categoria_id', 'categoria_nombre', 'descripcion',
  'imagen_principal', 'tiempo_minutos', 'dificultad', 'porciones', 'nutricion',
  'tags', 'proteina_principal', 'estado',
].join(',')

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  if (req.method !== 'GET') return res.status(405).json({ error: 'METODO_NO_PERMITIDO' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'CATALOGO_NO_CONFIGURADO' })

  const headers: Record<string, string> = { apikey: serviceKey }
  if (!serviceKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${serviceKey}`

  try {
    const query = new URLSearchParams({
      select: CAMPOS_CATALOGO,
      estado: 'neq.OCULTO',
      order: 'numero.asc',
      limit: '1000',
    })
    const response = await fetch(`${supabaseUrl}/rest/v1/recipes?${query}`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return res.status(502).json({ error: 'CATALOGO_NO_DISPONIBLE', upstreamStatus: response.status })
    const recetas = await response.json() as Record<string, unknown>[]
    return res.status(200).json({
      ok: true,
      recetas: recetas
        .filter((receta) => PUBLIC_RECIPE_ID_SET.has(String(receta.id)))
        .map((receta) => ({ ...receta, estado: 'GRATUITO' })),
    })
  } catch (error) {
    const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    return res.status(502).json({ error: timeout ? 'CATALOGO_TIMEOUT' : 'CATALOGO_NO_DISPONIBLE' })
  }
}
