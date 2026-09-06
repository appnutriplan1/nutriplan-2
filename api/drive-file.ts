/**
 * Proxy mínimo para PDFs públicos de Drive.
 *
 * La app necesita los bytes para abrir el selector "Guardar como" en PC y la
 * hoja nativa de compartir en celular. El navegador no puede leer Drive por
 * CORS, por eso este endpoint devuelve únicamente IDs válidos de Drive.
 */
export default async function handler(req: { query?: Record<string, string | string[] | undefined> }, res: {
  status: (code: number) => { json: (body: unknown) => void; end: (body?: Uint8Array) => void }
  setHeader: (name: string, value: string) => void
}) {
  const idRaw = req.query?.id
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    res.status(400).json({ error: 'ID_INVALIDO' })
    return
  }

  const respuesta = await fetch(`https://drive.google.com/uc?export=download&id=${id}`)
  if (!respuesta.ok) {
    res.status(502).json({ error: 'ARCHIVO_NO_DISPONIBLE' })
    return
  }

  const bytes = new Uint8Array(await respuesta.arrayBuffer())
  // Drive suele devolver application/octet-stream aunque el archivo sea PDF;
  // declararlo evita que iOS/Android lo traten como archivo genérico al compartir.
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'inline')
  res.setHeader('Cache-Control', 'private, max-age=300')
  res.status(200).end(bytes)
}
