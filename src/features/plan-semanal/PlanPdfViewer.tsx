import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, Share2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import pdfjsLib from '../../lib/pdf'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { entregarArchivo, nombreArchivoSeguro } from '../../lib/archivo'
import { drivePreviewUrl, getDrivePdfViaApp, getPlanPdf, isMockMode } from '../../services/dataService'

function ContinuousPage({ pdf, pageNumber }: { pdf: PDFDocumentProxy; pageNumber: number }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null

    async function render() {
      const wrapper = wrapperRef.current
      const canvas = canvasRef.current
      if (!wrapper || !canvas) return
      const page = await pdf.getPage(pageNumber)
      if (cancelled) return
      const base = page.getViewport({ scale: 1 })
      const cssWidth = Math.min(wrapper.clientWidth, 920)
      const scale = cssWidth / base.width
      const viewport = page.getViewport({ scale })
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(viewport.width * pixelRatio)
      canvas.height = Math.floor(viewport.height * pixelRatio)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      const context = canvas.getContext('2d')
      if (!context) return
      renderTask = page.render({ canvas, canvasContext: context, viewport, transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0] })
      await renderTask.promise
    }

    void render().catch(() => undefined)
    return () => { cancelled = true; renderTask?.cancel() }
  }, [pdf, pageNumber])

  return <figure ref={wrapperRef} className="flex w-full justify-center overflow-hidden bg-white shadow-[0_8px_28px_rgba(0,0,0,.22)]"><canvas ref={canvasRef} aria-label={`Página ${pageNumber}`} className="block max-w-full" /></figure>
}

export function PlanPdfViewer() {
  const { planId = '' } = useParams<{ planId: string }>()
  const { planes } = useAuth()
  const { addToast } = useToast()
  const plan = planes.find((item) => item.id === planId)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [fallbackUrl, setFallbackUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [readyBlob, setReadyBlob] = useState<Blob | null>(null)

  useEffect(() => {
    if (!plan?.urlPdf) { setLoading(false); return }
    let cancelled = false
    let task: ReturnType<typeof pdfjsLib.getDocument> | null = null
    setLoading(true)
    setPdf(null)
    setFallbackUrl('')

    void (async () => {
      try {
        if (isMockMode) task = pdfjsLib.getDocument({ url: plan.urlPdf })
        else {
          const loaded = (await getPlanPdf(plan.id)) ?? (await getDrivePdfViaApp(plan.urlPdf))
          if (!loaded) { if (!cancelled) setFallbackUrl(drivePreviewUrl(plan.urlPdf)); return }
          setBytes(loaded.slice())
          task = pdfjsLib.getDocument({ data: loaded })
        }
        const document = await task.promise
        if (!cancelled) setPdf(document)
      } catch {
        if (!cancelled) setFallbackUrl(drivePreviewUrl(plan.urlPdf))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true; void task?.destroy() }
  }, [plan])

  async function shareOrDownload() {
    if (!plan || sharing) return
    setSharing(true)
    try {
      const delivery = await entregarArchivo(
        nombreArchivoSeguro(plan.titulo, 'plan-nutricional'),
        plan.titulo,
        async () => {
          if (bytes) return new Blob([bytes.slice().buffer], { type: 'application/pdf' })
          if (isMockMode) {
            const response = await fetch(plan.urlPdf)
            if (!response.ok) throw new Error('PDF no disponible')
            return response.blob()
          }
          const loaded = (await getPlanPdf(plan.id)) ?? (await getDrivePdfViaApp(plan.urlPdf))
          if (!loaded) throw new Error('PDF no disponible')
          return new Blob([loaded.slice().buffer], { type: 'application/pdf' })
        },
        readyBlob,
      )
      if (delivery.blob) setReadyBlob(delivery.blob)
    } catch {
      addToast({ type: 'error', title: 'No pudimos preparar el PDF', message: 'Revisa tu conexión e inténtalo nuevamente.' })
    } finally {
      setSharing(false)
    }
  }

  if (!plan) return <main className="grid min-h-svh place-items-center bg-crema px-6 text-center"><div><h1 className="font-display text-2xl font-extrabold text-tinta">Plan no encontrado</h1><Link to="/home" className="mt-5 inline-block font-sans text-sm font-bold text-verde">Volver al inicio</Link></div></main>

  return (
    <section className="fixed inset-0 z-50 flex flex-col bg-[#292929]">
      <header className="relative z-10 flex items-center gap-3 border-b border-linea bg-crema px-3 pb-3 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] shadow-soft sm:px-5 sm:pt-3">
        <Link to="/home" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-papel text-tinta" aria-label="Volver al inicio"><ArrowLeft size={21} /></Link>
        <div className="min-w-0 flex-1"><p className="truncate font-display text-sm font-extrabold text-tinta">{plan.titulo}</p><p className="font-sans text-[10px] font-semibold text-muted">Documento original en PDF</p></div>
        <button type="button" onClick={() => void shareOrDownload()} disabled={sharing} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-coral px-3 font-sans text-xs font-bold text-white disabled:opacity-60">
          {sharing ? <Download size={17} /> : <Share2 size={17} />}<span className="hidden sm:inline">{sharing ? 'Preparando…' : 'Compartir o guardar'}</span><span className="sm:hidden">{sharing ? 'Preparando…' : 'Compartir'}</span>
        </button>
      </header>
      {loading && <main className="mx-auto w-full max-w-[920px] flex-1 space-y-3 overflow-hidden px-2 py-3"><div className="skeleton h-[75vh] w-full rounded-sm" /></main>}
      {!loading && fallbackUrl && <iframe src={fallbackUrl} title={plan.titulo} className="min-h-0 flex-1 border-0 bg-white" />}
      {!loading && pdf && <main className="min-h-0 flex-1 overflow-y-auto px-1 py-3 sm:px-5" aria-label={`Plan completo, ${pdf.numPages} páginas`}><div className="mx-auto flex max-w-[920px] flex-col gap-3">{Array.from({ length: pdf.numPages }, (_, index) => <ContinuousPage key={index + 1} pdf={pdf} pageNumber={index + 1} />)}</div></main>}
    </section>
  )
}
