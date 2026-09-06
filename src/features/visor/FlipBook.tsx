import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import HTMLFlipBook from 'react-pageflip'
import type { HTMLFlipBookRef } from 'react-pageflip'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { cn } from '../../lib/cn'

export interface FlipBookHandle {
  next: () => void
  prev: () => void
  goTo: (page1: number) => void
}

interface FlipBookProps {
  pdfDoc: PDFDocumentProxy
  portrait: boolean
  oscuro: boolean
  onFlip: (page1: number) => void
  onReady: (totalPaginas: number) => void
}

/** Lado largo al que se rasteriza cada página, en píxeles. */
const LADO_LARGO = 1500

const Pagina = forwardRef<HTMLDivElement, { src: string; oscuro: boolean }>(function Pagina(
  { src, oscuro },
  ref,
) {
  return (
    <div ref={ref} className={cn('h-full w-full overflow-hidden', oscuro ? 'bg-tinta' : 'bg-white')}>
      {src ? (
        <img src={src} alt="" className="h-full w-full object-contain" draggable={false} />
      ) : (
        // Aún sin rasterizar: el hueco mantiene el tamaño de la página para
        // que el libro no salte cuando la imagen llega.
        <div className="skeleton h-full w-full" />
      )}
    </div>
  )
})

export const FlipBook = forwardRef<FlipBookHandle, FlipBookProps>(function FlipBook(
  { pdfDoc, portrait, oscuro, onFlip, onReady },
  ref,
) {
  const bookRef = useRef<HTMLFlipBookRef>(null)
  const [imagenes, setImagenes] = useState<string[]>([])
  const [ratio, setRatio] = useState(0.72)
  const urlsRef = useRef<string[]>([])

  useImperativeHandle(ref, () => ({
    next: () => bookRef.current?.pageFlip().flipNext(),
    prev: () => bookRef.current?.pageFlip().flipPrev(),
    goTo: (page1: number) => bookRef.current?.pageFlip().flip(page1 - 1),
  }))

  /**
   * Rasterizado progresivo.
   *
   * Antes se convertían las 26 páginas del plan a imagen ANTES de mostrar
   * nada, y la paciente miraba "Cargando tu plan..." durante más de medio
   * minuto. Ahora se rasteriza la primera, se monta el libro con ella, y las
   * demás van llegando de fondo mientras ya se puede leer.
   *
   * El libro se monta una sola vez con todas sus páginas (en hueco) porque
   * PageFlip no admite que le agreguen páginas después de arrancar; lo que
   * cambia luego es solo el `src` de cada imagen, que no lo reinicia.
   */
  useEffect(() => {
    let cancelado = false
    const urls: string[] = []
    urlsRef.current = urls

    async function rasterizar(numero: number): Promise<string | null> {
      const page = await pdfDoc.getPage(numero)
      if (cancelado) return null

      const base = page.getViewport({ scale: 1 })
      const escala = LADO_LARGO / Math.max(base.width, base.height)
      const viewport = page.getViewport({ scale: escala })

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      if (cancelado) return null

      // Blob en vez de data URL: una data URL de estas guarda ~500 KB de
      // texto por página en memoria; con 26 páginas eso son megas de cadenas
      // que el teléfono acaba pagando.
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
      // Liberar el lienzo cuanto antes: en iOS la memoria de canvas es escasa.
      canvas.width = 0
      canvas.height = 0
      if (!blob || cancelado) return null

      const url = URL.createObjectURL(blob)
      urls.push(url)
      return url
    }

    void (async () => {
      const total = pdfDoc.numPages

      const primera = await pdfDoc.getPage(1)
      if (cancelado) return
      const vp = primera.getViewport({ scale: 1 })
      setRatio(vp.width / vp.height)

      const primeraUrl = await rasterizar(1)
      if (cancelado || !primeraUrl) return

      // El libro aparece aquí, con la primera página lista y el resto en hueco.
      const inicial = new Array<string>(total).fill('')
      inicial[0] = primeraUrl
      setImagenes(inicial)
      onReady(total)

      for (let i = 2; i <= total; i++) {
        const url = await rasterizar(i)
        if (cancelado) return
        if (!url) continue
        setImagenes((previas) => {
          const siguientes = [...previas]
          siguientes[i - 1] = url
          return siguientes
        })
        // Ceder el hilo entre páginas: sin esto el rasterizado bloquea los
        // gestos y el pase de página se siente trabado mientras carga.
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    })()

    return () => {
      cancelado = true
      for (const url of urls) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc])

  if (imagenes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="skeleton aspect-[3/4] w-56 rounded-card-sm" />
        <p className={cn('font-sans text-xs', oscuro ? 'text-crema/60' : 'text-muted')}>Cargando tu plan…</p>
      </div>
    )
  }

  const alto = 1000
  const ancho = Math.round(alto * ratio)

  return (
    <HTMLFlipBook
      width={ancho}
      height={alto}
      size="stretch"
      minWidth={200}
      maxWidth={2200}
      minHeight={300}
      maxHeight={2200}
      maxShadowOpacity={0.4}
      drawShadow
      flippingTime={700}
      showCover={false}
      usePortrait={portrait}
      mobileScrollSupport={false}
      className="mx-auto"
      // El zoom y el desplazamiento los aplica el visor sobre el contenedor
      // (VisorPlan): PageFlip no recalcula su tamaño al cambiar props, así que
      // ampliar aquí dentro dejaba el libro descuadrado y sin forma de moverlo.
      ref={bookRef}
      onFlip={(e) => onFlip(e.data + 1)}
    >
      {imagenes.map((src, i) => (
        <Pagina key={i} src={src} oscuro={oscuro} />
      ))}
    </HTMLFlipBook>
  )
})
