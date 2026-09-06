import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

interface PdfPageCanvasProps {
  pdfDoc: PDFDocumentProxy
  pageNumber: number
}

export function PdfPageCanvas({ pdfDoc, pageNumber }: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelado = false
    let renderTask: RenderTask | null = null

    async function render() {
      const canvas = canvasRef.current
      if (!canvas) return

      const page = await pdfDoc.getPage(pageNumber)
      if (cancelado) return

      const base = page.getViewport({ scale: 1 })
      // Render a alta resolución fija; el CSS (max-h/max-w) lo escala para
      // caber en su caja conservando la proporción (sirve vertical u horizontal).
      const scale = 2000 / Math.max(base.width, base.height)
      const viewport = page.getViewport({ scale })
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)

      renderTask = page.render({ canvas, canvasContext: ctx, viewport })
      await renderTask.promise
    }

    render().catch(() => {
      // páginas canceladas al cambiar rápido no deben loggear error
    })

    return () => {
      cancelado = true
      renderTask?.cancel()
    }
  }, [pdfDoc, pageNumber])

  return <canvas ref={canvasRef} className="max-h-full max-w-full rounded-sm" />
}
