import { useRef, useState } from 'react'
import { BookOpen, Download, FileText, Loader2, Repeat, Share2, ShoppingBag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getDrivePdfViaApp, getRecursoPdf, type Recurso, type TipoRecurso } from '../services/dataService'
import { entregarArchivo, nombreArchivoSeguro } from '../lib/archivo'
import { cn } from '../lib/cn'
import { useToast } from '../context/useToast'
import { Card } from './ui/Card'

const ICONO: Record<TipoRecurso, LucideIcon> = {
  PLAN: BookOpen,
  COMPRAS: ShoppingBag,
  INTERCAMBIOS: Repeat,
  GUIA: FileText,
  OTRO: FileText,
}

interface DescargasPlanProps {
  recursos: Recurso[]
}

interface RecursoRapidoProps {
  recurso: Recurso
  className?: string
}

/** Acceso individual a un recurso, para ubicar la lista de compras en Mi cocina. */
export function RecursoRapido({ recurso, className }: RecursoRapidoProps) {
  const { addToast } = useToast()
  const [ocupado, setOcupado] = useState(false)
  const [listoParaCompartir, setListoParaCompartir] = useState(false)
  const descargado = useRef<Blob | null>(null)

  async function obtener() {
    if (ocupado) return
    setOcupado(true)
    try {
      const entrega = await entregarArchivo(
        nombreArchivoSeguro(recurso.titulo),
        recurso.titulo,
        async () => {
          const bytes = (await getRecursoPdf(recurso.id)) ?? (await getDrivePdfViaApp(recurso.urlPdf))
          if (!bytes) throw new Error('SIN_PROXY')
          const copia = new ArrayBuffer(bytes.byteLength)
          new Uint8Array(copia).set(bytes)
          return new Blob([copia], { type: 'application/pdf' })
        },
        descargado.current,
      )
      if (entrega.blob) descargado.current = entrega.blob
      setListoParaCompartir(entrega.resultado === 'listo-para-compartir')
    } catch {
      addToast({
        type: 'error',
        title: 'No pudimos preparar el archivo',
        message: 'Revisa tu conexión e inténtalo nuevamente.',
      })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <button type="button" onClick={() => void obtener()} disabled={ocupado} className={cn('text-left disabled:opacity-60', className)}>
      <ShoppingBag size={22} className="text-verde" />
      <p className="mt-6 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-verde">En tu cocina</p>
      <p className="mt-2 font-display text-lg font-semibold text-tinta">{ocupado ? 'Preparando…' : listoParaCompartir ? 'Toca para compartir' : 'Lista de compras'}</p>
    </button>
  )
}

/**
 * Cada documento se entrega igual que el plan: en el celular abre la hoja de
 * compartir con el archivo (para mandarlo por WhatsApp), y en la computadora
 * el cuadro de guardado para elegir carpeta.
 */
export function DescargasPlan({ recursos }: DescargasPlanProps) {
  const { addToast } = useToast()
  // Recurso que se está preparando: el PDF viaja desde Drive y tarda.
  const [ocupado, setOcupado] = useState<string | null>(null)
  // Recursos ya descargados en esta sesión, para no volver a pedirlos.
  const descargados = useRef(new Map<string, Blob>())
  // Recursos listos que esperan un segundo toque para compartirse (ver
  // `entregarArchivo`: la hoja de compartir necesita un gesto reciente).
  const [porCompartir, setPorCompartir] = useState<Set<string>>(new Set())

  if (recursos.length === 0) return null

  function marcarPorCompartir(id: string, activo: boolean) {
    setPorCompartir((previos) => {
      const siguientes = new Set(previos)
      if (activo) siguientes.add(id)
      else siguientes.delete(id)
      return siguientes
    })
  }

  async function obtener(recurso: Recurso) {
    if (ocupado) return
    setOcupado(recurso.id)

    try {
      const entrega = await entregarArchivo(
        nombreArchivoSeguro(recurso.titulo),
        recurso.titulo,
        async () => {
          const bytes = (await getRecursoPdf(recurso.id)) ?? (await getDrivePdfViaApp(recurso.urlPdf))
          if (!bytes) throw new Error('SIN_PROXY')
          // Copia propia del buffer: el original puede quedar transferido.
          const copia = new ArrayBuffer(bytes.byteLength)
          new Uint8Array(copia).set(bytes)
          return new Blob([copia], { type: 'application/pdf' })
        },
        descargados.current.get(recurso.id) ?? null,
      )

      if (entrega.blob) descargados.current.set(recurso.id, entrega.blob)
      marcarPorCompartir(recurso.id, entrega.resultado === 'listo-para-compartir')
    } catch {
      // El proxy todavía no sirve recursos (o estamos en modo demo): se abre
      // el enlace de Drive, que es el comportamiento anterior.
      addToast({
        type: 'error',
        title: 'No pudimos preparar el archivo',
        message: 'Revisa tu conexión e inténtalo nuevamente.',
      })
    } finally {
      setOcupado(null)
    }
  }

  return (
    <Card padding="md" className="divide-y divide-linea p-0">
      {recursos.map((recurso) => {
        const Icono = ICONO[recurso.tipo]
        const preparando = ocupado === recurso.id
        const listo = porCompartir.has(recurso.id)

        return (
          <button
            key={recurso.id}
            type="button"
            onClick={() => void obtener(recurso)}
            disabled={ocupado !== null}
            className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors first:rounded-t-card last:rounded-b-card hover:bg-papel/60 disabled:opacity-60"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-papel text-verde">
              <Icono size={20} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-semibold text-tinta">{recurso.titulo}</p>
              <p className={`font-sans text-xs ${listo ? 'text-coral' : 'text-muted'}`}>
                {preparando ? 'Preparando…' : listo ? 'Listo · toca para compartir' : 'PDF · Descargar o compartir'}
              </p>
            </div>
            {preparando ? (
              <Loader2 size={18} className="shrink-0 animate-spin text-verde" />
            ) : listo ? (
              <Share2 size={18} className="shrink-0 text-coral" />
            ) : (
              <Download size={18} className="shrink-0 text-muted transition-colors group-hover:text-coral" />
            )}
          </button>
        )
      })}
    </Card>
  )
}
