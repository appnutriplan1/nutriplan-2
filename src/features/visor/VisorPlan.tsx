import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Download, List, Moon, Share2, Sun, Volume2, VolumeX, X, ZoomIn, ZoomOut } from 'lucide-react'
import pdfjsLib from '../../lib/pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { drivePreviewUrl, getDrivePdfViaApp, getPlanPdf, isMockMode } from '../../services/dataService'
import { entregarArchivo, nombreArchivoSeguro } from '../../lib/archivo'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { cn } from '../../lib/cn'
import { FlipBook, type FlipBookHandle } from './FlipBook'

export function VisorPlan() {
  const { planId } = useParams()
  const { planes } = useAuth()
  const { addToast } = useToast()
  const plan = planes.find((p) => p.id === planId)

  const anchoDesktop = useMediaQuery('(min-width: 1024px)')

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visorDrive, setVisorDrive] = useState<string | null>(null)

  const [oscuro, setOscuro] = useState(false)
  const [silenciado, setSilenciado] = useState(true)
  const [tocAbierto, setTocAbierto] = useState(false)
  const [compartiendo, setCompartiendo] = useState(false)
  const [zoom, setZoom] = useState(1)

  const [pan, setPan] = useState({ x: 0, y: 0 })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const flipRef = useRef<FlipBookHandle>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const lienzoRef = useRef<HTMLDivElement>(null)
  const arrastrando = useRef(false)
  const origen = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  /**
   * Impide arrastrar la página fuera de la pantalla: el desplazamiento máximo
   * es la mitad de lo que sobresale al ampliar. Con zoom 1 no sobresale nada,
   * así que todo queda en 0 y la página vuelve al centro sola.
   */
  function limitar(x: number, y: number, escala: number) {
    const area = areaRef.current
    const lienzo = lienzoRef.current
    if (!area || !lienzo) return { x: 0, y: 0 }

    const maxX = Math.max(0, (lienzo.offsetWidth * escala - area.clientWidth) / 2)
    const maxY = Math.max(0, (lienzo.offsetHeight * escala - area.clientHeight) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    }
  }

  function cambiarZoom(siguiente: number) {
    const escala = Math.min(2, Math.max(1, siguiente))
    setZoom(escala)
    setPan((actual) => (escala === 1 ? { x: 0, y: 0 } : limitar(actual.x, actual.y, escala)))
  }

  function iniciarArrastre(e: React.PointerEvent<HTMLDivElement>) {
    arrastrando.current = true
    origen.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function moverArrastre(e: React.PointerEvent<HTMLDivElement>) {
    if (!arrastrando.current) return
    const dx = e.clientX - origen.current.x
    const dy = e.clientY - origen.current.y
    setPan(limitar(origen.current.panX + dx, origen.current.panY + dy, zoom))
  }

  function terminarArrastre(e: React.PointerEvent<HTMLDivElement>) {
    arrastrando.current = false
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  useEffect(() => {
    const planActual = plan
    if (!planActual) return
    let cancelado = false
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null
    setCargando(true)
    setError(null)
    setVisorDrive(null)
    setPdfBytes(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })

    void (async () => {
      try {
        if (isMockMode) {
          loadingTask = pdfjsLib.getDocument({ url: planActual.urlPdf })
        } else {
          // La vía autenticada es la principal. Si el Apps Script publicado
          // todavía no tiene la acción `pdf` o tarda demasiado, intentamos el
          // proxy del mismo dominio para conservar la experiencia de ebook.
          let bytes: Uint8Array | null = null
          try {
            bytes = await getPlanPdf(planActual.id)
          } catch {
            bytes = null
          }
          if (!bytes) bytes = await getDrivePdfViaApp(planActual.urlPdf)
          if (cancelado) return
          if (!bytes) {
            setVisorDrive(drivePreviewUrl(planActual.urlPdf))
            setCargando(false)
            return
          }
          // pdf.js puede transferir su buffer al worker. Conservamos una copia
          // para poder abrir la hoja nativa de compartir sin volver a pedir el PDF.
          setPdfBytes(bytes.slice())
          loadingTask = pdfjsLib.getDocument({ data: bytes })
        }
        const doc = await loadingTask.promise
        if (cancelado) return
        setPdfDoc(doc)
        setNumPages(doc.numPages)
        setPageNum(1)
        setCargando(false)
      } catch {
        if (!cancelado) {
          const respaldo = drivePreviewUrl(planActual.urlPdf)
          if (respaldo) setVisorDrive(respaldo)
          else setError('No pudimos cargar tu plan. Intenta de nuevo.')
          setCargando(false)
        }
      }
    })()

    return () => {
      cancelado = true
      loadingTask?.destroy()
    }
  }, [plan])

  function reproducirSonidoPasarPagina() {
    if (silenciado) return
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/page-turn.wav')
        audioRef.current.volume = 0.6
      }
      audioRef.current.currentTime = 0
      void audioRef.current.play()
    } catch {
      // sin audio disponible: falla en silencio, no es crítico
    }
  }

  function handleFlip(page1: number) {
    setPageNum(page1)
    reproducirSonidoPasarPagina()
  }

  async function compartirPdf() {
    if (!plan || compartiendo) return
    setCompartiendo(true)

    try {
      // Los bytes suelen estar ya en memoria (el visor los usó para dibujar),
      // así que el cuadro de guardado se abre sin espera.
      const listo = pdfBytes
        ? (() => {
            const copia = new ArrayBuffer(pdfBytes.byteLength)
            new Uint8Array(copia).set(pdfBytes)
            return new Blob([copia], { type: 'application/pdf' })
          })()
        : null

      // En el celular abre la hoja de compartir (WhatsApp); en la computadora,
      // el cuadro de guardado para elegir carpeta. Ver `lib/archivo.ts`.
      await entregarArchivo(
        nombreArchivoSeguro(plan.titulo, 'plan-nutricional'),
        plan.titulo,
        async () => {
          // En modo demo el PDF es público y se obtiene desde la misma app.
          if (isMockMode) {
            const respuesta = await fetch(plan.urlPdf)
            if (!respuesta.ok) throw new Error('No se pudo obtener el PDF')
            return respuesta.blob()
          }

          const bytes = (await getPlanPdf(plan.id)) ?? (await getDrivePdfViaApp(plan.urlPdf))
          if (!bytes) throw new Error('No se pudo obtener el PDF')
          const copia = new ArrayBuffer(bytes.byteLength)
          new Uint8Array(copia).set(bytes)
          return new Blob([copia], { type: 'application/pdf' })
        },
        listo,
      )
    } catch {
      addToast({
        type: 'error',
        title: 'No pudimos preparar el PDF',
        message: 'Revisa tu conexión e inténtalo nuevamente.',
      })
    } finally {
      setCompartiendo(false)
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') flipRef.current?.next()
      if (e.key === 'ArrowLeft') flipRef.current?.prev()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!plan) {
    return (
      <div className="mx-auto flex min-h-svh max-w-[440px] flex-col items-center justify-center px-6 text-center">
        <p className="mb-3 font-display text-xl font-semibold text-tinta">Plan no encontrado</p>
        <p className="mb-6 font-sans text-sm text-muted">Puede que el enlace ya no esté disponible.</p>
        <Link to="/home" className="font-sans text-sm font-semibold text-verde hover:underline">
          Volver a tu Home
        </Link>
      </div>
    )
  }

  const botonRedondo = cn('flex h-9 w-9 items-center justify-center rounded-full')

  return (
    <div className={cn('fixed inset-0 z-40 flex flex-col transition-colors duration-300', oscuro ? 'bg-tinta' : 'bg-crema')}>
      {/* Barra superior */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 isolate flex items-center justify-between px-4 pb-3 backdrop-blur-sm sm:px-6',
          oscuro ? 'bg-tinta/92' : 'bg-crema/92',
        )}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <Link to={`/plan/${plan.id}`} className={cn(botonRedondo, 'shrink-0', oscuro ? 'bg-crema/10 text-crema' : 'bg-white text-tinta')} aria-label="Volver al recetario">
          <X size={18} />
        </Link>
        <p className={cn('truncate px-3 font-sans text-xs font-medium', oscuro ? 'text-crema/70' : 'text-muted')}>
          {plan.titulo}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTocAbierto(true)}
            className={cn(botonRedondo, oscuro ? 'bg-crema/10 text-crema' : 'bg-white/80 text-tinta')}
            aria-label="Índice"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => setSilenciado((s) => !s)}
            className={cn(botonRedondo, oscuro ? 'bg-crema/10 text-crema' : 'bg-white/80 text-tinta')}
            aria-label={silenciado ? 'Activar sonido de pase de página' : 'Silenciar sonido de pase de página'}
          >
            {silenciado ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            type="button"
            onClick={() => cambiarZoom(zoom - 0.25)}
            disabled={zoom <= 1}
            className={cn(botonRedondo, 'disabled:opacity-30', oscuro ? 'bg-crema/10 text-crema' : 'bg-white/80 text-tinta')}
            aria-label="Alejar el plan"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={() => cambiarZoom(zoom + 0.25)}
            disabled={zoom >= 2}
            className={cn(botonRedondo, 'disabled:opacity-30', oscuro ? 'bg-crema/10 text-crema' : 'bg-white/80 text-tinta')}
            aria-label="Acercar el plan"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() => setOscuro((o) => !o)}
            className={cn(botonRedondo, oscuro ? 'bg-crema/10 text-crema' : 'bg-white/80 text-tinta')}
            aria-label={oscuro ? 'Modo claro' : 'Modo oscuro de lectura'}
          >
            {oscuro ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Libro */}
      <div ref={areaRef} className="relative flex flex-1 items-center justify-center overflow-hidden px-2 py-16 sm:px-8">
        {cargando && (
          <div className="flex flex-col items-center gap-3">
            <div className="skeleton aspect-[3/4] w-56 rounded-card-sm" />
            <p className={cn('font-sans text-xs', oscuro ? 'text-crema/60' : 'text-muted')}>Cargando tu plan…</p>
          </div>
        )}

        {error && <p className="font-sans text-sm text-coral">{error}</p>}

        {!cargando && !error && visorDrive && (
          <iframe
            src={visorDrive}
            title={plan.titulo}
            className="h-[calc(100%-2rem)] w-full max-w-5xl rounded-control border-0 bg-white shadow-soft"
            allow="autoplay"
          />
        )}

        {!cargando && !error && pdfDoc && (
          <>
            <div
              ref={lienzoRef}
              className="flex h-full w-full items-center justify-center"
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: arrastrando.current ? 'none' : 'transform 180ms ease-out',
              }}
            >
              <FlipBook
                ref={flipRef}
                pdfDoc={pdfDoc}
                portrait={!anchoDesktop}
                oscuro={oscuro}
                onFlip={handleFlip}
                onReady={(total) => setNumPages(total)}
              />
            </div>

            {/* Con zoom, esta capa se queda con el gesto: arrastrar mueve la
                página en vez de pasarla. Sin ella el libro se ampliaba, se
                salía del cuadro y no había forma de reencuadrarlo. Las páginas
                se pasan con las flechas de abajo o el índice. */}
            {zoom > 1 && (
              <div
                className="absolute inset-0 z-20 cursor-grab touch-none active:cursor-grabbing"
                onPointerDown={iniciarArrastre}
                onPointerMove={moverArrastre}
                onPointerUp={terminarArrastre}
                onPointerCancel={terminarArrastre}
              />
            )}
          </>
        )}

        {zoom > 1 && (
          <p
            className={cn(
              'pointer-events-none absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-pill px-3 py-1 font-sans text-[11px]',
              oscuro ? 'bg-crema/10 text-crema/70' : 'bg-white/80 text-muted',
            )}
          >
            Arrastra para mover · usa las flechas para pasar de página
          </p>
        )}
      </div>

      {/* Barra inferior */}
      {!visorDrive && <div
        className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 px-4 pt-4 sm:px-6"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => flipRef.current?.prev()}
            disabled={pageNum <= 1}
            className={cn(botonRedondo, 'disabled:opacity-30', oscuro ? 'bg-crema/10 text-crema' : 'bg-white/80 text-tinta')}
          >
            <ChevronLeft size={16} />
          </button>
          <p className={cn('font-sans text-xs font-medium', oscuro ? 'text-crema/70' : 'text-muted')}>
            {numPages > 0 ? `Página ${pageNum} de ${numPages}` : ''}
          </p>
          <button
            type="button"
            onClick={() => flipRef.current?.next()}
            disabled={pageNum >= numPages}
            className={cn(botonRedondo, 'disabled:opacity-30', oscuro ? 'bg-crema/10 text-crema' : 'bg-white/80 text-tinta')}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={compartirPdf}
          disabled={compartiendo}
          className="flex h-9 items-center gap-1.5 rounded-pill bg-coral px-4 font-sans text-xs font-semibold text-white disabled:opacity-70"
        >
          {compartiendo ? <Download size={14} /> : <Share2 size={14} />}
          {compartiendo ? 'Preparando…' : 'Compartir / descargar'}
        </button>
      </div>}

      {/* Índice */}
      <AnimatePresence>
        {tocAbierto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-tinta/50"
              onClick={() => setTocAbierto(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-card bg-white p-6"
            >
              <p className="mb-4 font-display text-lg font-semibold text-tinta">Índice</p>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      flipRef.current?.goTo(n)
                      setTocAbierto(false)
                    }}
                    className={cn(
                      'rounded-control border py-2 font-sans text-sm',
                      n === pageNum ? 'border-verde bg-papel font-semibold text-verde' : 'border-linea text-muted',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
