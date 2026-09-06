import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Info } from 'lucide-react'
import { driveThumbnailUrl, getEducacion, obtenerEducacionGuardada, type Educacion as TemaEducacion } from '../../services/dataService'
import { Skeleton } from '../../components/ui/Skeleton'

// Artículos educativos de ejemplo para visitantes
const ARTICULOS_EJEMPLO: Array<TemaEducacion> = [
  {
    id: 'art-macros-1',
    titulo: 'Entiende tus macronutrientes',
    descripcion: 'Proteína, carbohidratos y grasas: qué son y por qué tu cuerpo los necesita.',
    categoria: 'Nutrición',
    acceso: 'PUBLICO',
    orden: 1,
    portadaUrl: 'https://via.placeholder.com/400x500/6B8F7D/FFFFFF?text=Macros',
    laminas: [
      {
        id: 'lam-1',
        imagenUrl: 'https://via.placeholder.com/800x600/6B8F7D/FFFFFF?text=Proteína+Construcción',
        descripcion: 'La proteína es el bloque de construcción del cuerpo',
        orden: 1,
      },
      {
        id: 'lam-2',
        imagenUrl: 'https://via.placeholder.com/800x600/F2A65A/FFFFFF?text=Carbos+Energía',
        descripcion: 'Los carbohidratos son tu fuente principal de energía',
        orden: 2,
      },
      {
        id: 'lam-3',
        imagenUrl: 'https://via.placeholder.com/800x600/FF6B4A/FFFFFF?text=Grasas+Hormonas',
        descripcion: 'Las grasas son esenciales para hormonas y vitaminas',
        orden: 3,
      },
    ],
  },
  {
    id: 'art-etiquetas-1',
    titulo: 'Cómo leer las etiquetas de alimentos',
    descripcion: 'Guía práctica para entender lo que realmente comes. Tamaño de porción, ingredientes y declaraciones nutricionales explicadas.',
    categoria: 'Lectura de etiquetas',
    acceso: 'PUBLICO',
    orden: 2,
    portadaUrl: 'https://via.placeholder.com/400x500/1F4A3F/FFFFFF?text=Etiquetas',
    laminas: [
      {
        id: 'lam-4',
        imagenUrl: 'https://via.placeholder.com/800x600/1F4A3F/FFFFFF?text=1.+Tamaño+de+porción',
        descripcion: 'El tamaño de porción es la base de toda información nutricional',
        orden: 1,
      },
      {
        id: 'lam-5',
        imagenUrl: 'https://via.placeholder.com/800x600/1F4A3F/FFFFFF?text=2.+Información+nutricional',
        descripcion: 'Calorías, macros y micronutrientes por porción',
        orden: 2,
      },
      {
        id: 'lam-6',
        imagenUrl: 'https://via.placeholder.com/800x600/1F4A3F/FFFFFF?text=3.+Ingredientes',
        descripcion: 'Listados en orden de cantidad. Los primeros 3 son los más importantes.',
        orden: 3,
      },
    ],
  },
  {
    id: 'art-hidratacion-1',
    titulo: 'Agua: tu nutriente más importante',
    descripcion: 'Descubre cuánta agua necesitas beber, cuándo, y por qué es crítica para tu metabolismo y energía.',
    categoria: 'Hidratación',
    acceso: 'PUBLICO',
    orden: 3,
    portadaUrl: 'https://via.placeholder.com/400x500/6B8F7D/FFFFFF?text=Hidratación',
    laminas: [
      {
        id: 'lam-7',
        imagenUrl: 'https://via.placeholder.com/800x600/6B8F7D/FFFFFF?text=Funciones+del+agua',
        descripcion: 'Transporte de nutrientes, regulación térmica, digestión',
        orden: 1,
      },
      {
        id: 'lam-8',
        imagenUrl: 'https://via.placeholder.com/800x600/6B8F7D/FFFFFF?text=Cuánto+necesitas',
        descripcion: 'Cálculo personalizado según peso corporal y actividad',
        orden: 2,
      },
      {
        id: 'lam-9',
        imagenUrl: 'https://via.placeholder.com/800x600/6B8F7D/FFFFFF?text=Señales+de+deshidratación',
        descripcion: 'Cansancio, hambre falsa, dolor de cabeza: todos son signos',
        orden: 3,
      },
    ],
  },
]

const TEMAS_POR_LOTE = 12

function ImagenTema({ tema, prioridad = false }: { tema: TemaEducacion; prioridad?: boolean }) {
  const [fallida, setFallida] = useState(false)
  if (fallida) {
    return <div className="flex h-full w-full items-end bg-verde p-5"><span className="font-display text-2xl leading-tight text-crema">{tema.titulo}</span></div>
  }
  return <img src={driveThumbnailUrl(tema.portadaUrl)} alt={`Portada: ${tema.titulo}`} loading={prioridad ? 'eager' : 'lazy'} fetchPriority={prioridad ? 'high' : 'auto'} decoding="async" referrerPolicy="no-referrer" onError={() => setFallida(true)} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
}

function VisorEducacion({ tema, cerrar }: { tema: TemaEducacion; cerrar: () => void }) {
  const imagenes = useMemo(
    () => tema.laminas.length > 0 ? tema.laminas : [{ id: `${tema.id}-portada`, imagenUrl: tema.portadaUrl, orden: 1, descripcion: tema.titulo }],
    [tema],
  )
  const [indice, setIndice] = useState(0)
  const [zoom, setZoom] = useState(1)
  const gestoPinza = useRef<{ distancia: number; zoomInicial: number } | null>(null)
  const lamina = imagenes[indice]
  const varias = imagenes.length > 1

  useEffect(() => {
    function tecla(event: KeyboardEvent) {
      if (event.key === 'Escape') cerrar()
      if (event.key === 'ArrowRight' && varias) setIndice((actual) => Math.min(actual + 1, imagenes.length - 1))
      if (event.key === 'ArrowLeft' && varias) setIndice((actual) => Math.max(actual - 1, 0))
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [cerrar, imagenes.length, varias])

  useEffect(() => {
    const siguiente = imagenes[indice + 1]
    if (!siguiente) return
    const precarga = new Image()
    precarga.src = driveThumbnailUrl(siguiente.imagenUrl, 960)
  }, [imagenes, indice])

  function distanciaEntreDedos(toques: React.TouchList) {
    const horizontal = toques[0].clientX - toques[1].clientX
    const vertical = toques[0].clientY - toques[1].clientY
    return Math.hypot(horizontal, vertical)
  }

  function iniciarPinza(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2) return
    gestoPinza.current = {
      distancia: distanciaEntreDedos(event.touches),
      zoomInicial: zoom,
    }
  }

  function moverPinza(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2 || !gestoPinza.current) return
    event.preventDefault()
    const factor = distanciaEntreDedos(event.touches) / gestoPinza.current.distancia
    setZoom(Math.min(4, Math.max(1, gestoPinza.current.zoomInicial * factor)))
  }

  function terminarPinza(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length < 2) gestoPinza.current = null
  }

  function cambiar(delta: number) {
    setIndice((actual) => Math.max(0, Math.min(actual + delta, imagenes.length - 1)))
    setZoom(1)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex flex-col bg-tinta/95 text-crema" role="dialog" aria-modal="true" aria-label={tema.titulo}>
      <header className="flex items-center justify-between gap-3 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:gap-4 sm:px-7 sm:pt-5">
        <div className="min-w-0"><p className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-mandarina">Educación nutricional</p><h2 className="truncate font-display text-xl font-semibold sm:text-2xl">{tema.titulo}</h2></div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setZoom((actual) => Math.max(1, Number((actual - 0.25).toFixed(2))))} disabled={zoom <= 1} aria-label="Alejar imagen" className="flex size-11 items-center justify-center rounded-control bg-white/10 disabled:opacity-35"><ZoomOut size={19} /></button>
          <button type="button" onClick={() => setZoom((actual) => Math.min(4, Number((actual + 0.25).toFixed(2))))} disabled={zoom >= 4} aria-label="Acercar imagen" className="flex size-11 items-center justify-center rounded-control bg-white/10 disabled:opacity-35"><ZoomIn size={19} /></button>
          <button type="button" onClick={cerrar} aria-label="Cerrar visor" className="flex size-12 items-center justify-center rounded-control bg-crema text-tinta"><X size={22} /></button>
        </div>
      </header>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto px-3 pb-5 sm:px-10"
        style={{ touchAction: 'pan-x pan-y' }}
        onTouchStart={iniciarPinza}
        onTouchMove={moverPinza}
        onTouchEnd={terminarPinza}
        onTouchCancel={terminarPinza}
      >
        <img key={lamina.id} src={driveThumbnailUrl(lamina.imagenUrl, 960)} srcSet={`${driveThumbnailUrl(lamina.imagenUrl, 640)} 640w, ${driveThumbnailUrl(lamina.imagenUrl, 960)} 960w, ${driveThumbnailUrl(lamina.imagenUrl, 1280)} 1280w`} sizes="100vw" alt={lamina.descripcion || tema.titulo} decoding="async" referrerPolicy="no-referrer" className="max-h-full max-w-full rounded-card-sm object-contain shadow-cover transition-transform duration-200" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }} />
        {varias && indice > 0 && <button type="button" onClick={() => cambiar(-1)} aria-label="Lámina anterior" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-crema p-3 text-tinta shadow-soft sm:left-8"><ChevronLeft size={25} /></button>}
        {varias && indice < imagenes.length - 1 && <button type="button" onClick={() => cambiar(1)} aria-label="Lámina siguiente" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-crema p-3 text-tinta shadow-soft sm:right-8"><ChevronRight size={25} /></button>}
      </div>
      <footer className="flex min-h-14 items-center justify-center border-t border-white/10 px-5 text-center font-sans text-xs text-crema/70">{varias ? `Lámina ${indice + 1} de ${imagenes.length}` : 'Infografía educativa'}</footer>
    </motion.div>
  )
}

function TarjetaTema({ tema, abrir, prioridad = false }: { tema: TemaEducacion; abrir: () => void; prioridad?: boolean }) {
  return (
    <button type="button" onClick={abrir} className="group overflow-hidden rounded-card border border-linea bg-white text-left shadow-soft transition-all hover:-translate-y-1 hover:shadow-soft-lg">
      <div className="relative aspect-[4/5] overflow-hidden bg-papel"><ImagenTema tema={tema} prioridad={prioridad} /><span className="absolute left-3 top-3 rounded-pill bg-crema px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-wide text-verde">Gratis</span></div>
      <div className="p-4"><p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-mandarina">{tema.categoria}</p><h2 className="mt-2 font-display text-xl font-semibold leading-tight text-tinta">{tema.titulo}</h2>{tema.descripcion && <p className="mt-2 line-clamp-2 font-sans text-sm leading-relaxed text-muted">{tema.descripcion}</p>}<span className="mt-4 inline-flex items-center gap-2 font-sans text-sm font-semibold text-verde">Ver infografía <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span></div>
    </button>
  )
}

export function Educacion() {
  const temasGuardados = obtenerEducacionGuardada()
  const temasIniciales = temasGuardados.length > 0 ? temasGuardados : ARTICULOS_EJEMPLO
  const [temas, setTemas] = useState<TemaEducacion[]>(temasIniciales)
  const [cargando, setCargando] = useState(temasIniciales.length === 0)
  const [error, setError] = useState(false)
  const [seleccionado, setSeleccionado] = useState<TemaEducacion | null>(null)
  const [limiteVisible, setLimiteVisible] = useState(TEMAS_POR_LOTE)

  useEffect(() => {
    let activa = true
    getEducacion().then((respuesta) => {
      if (!activa) return
      if (respuesta.ok && respuesta.data.length > 0) {
        setTemas(respuesta.data)
      } else if (!respuesta.ok && temasGuardados.length > 0) {
        // Mantener la biblioteca ya descargada si la actualización falla.
      } else if (!respuesta.ok) {
        setTemas(ARTICULOS_EJEMPLO)
      } else if (respuesta.ok && respuesta.data.length === 0) {
        setTemas(ARTICULOS_EJEMPLO)
      } else {
        setError(true)
      }
      setCargando(false)
    })
    return () => { activa = false }
  }, [temasGuardados.length])

  return (
    <main className="mx-auto min-h-svh max-w-6xl px-5 pb-28 pt-10 sm:min-h-[calc(100svh-73px)] sm:px-8 sm:pb-16">
      <div className="max-w-2xl"><p className="kicker mb-4">NutriPlan · Educación</p><h1 className="font-display text-4xl font-semibold leading-[1.04] text-tinta sm:text-5xl">Educación nutricional para tu vida real.</h1><p className="mt-4 font-sans text-[15px] leading-relaxed text-muted sm:text-base">Infografías breves y prácticas para entender mejor tu alimentación, sin reglas rígidas ni ruido.</p></div>

      <section className="mt-8 flex gap-3 rounded-card border border-verde/20 bg-verde/5 p-5"><Info size={20} className="mt-0.5 shrink-0 text-verde" /><div><p className="font-display text-lg font-semibold text-tinta">Biblioteca gratuita</p><p className="mt-1 font-sans text-sm text-muted">Todo el contenido educativo de esta sección está disponible sin suscripción.</p></div></section>

      <section className="mt-10" aria-label="Biblioteca de educación nutricional">
        {cargando ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="aspect-[4/6]" />)}</div> : error ? (
          <div className="rounded-card border border-linea bg-papel p-6 font-sans text-muted">No pudimos cargar la biblioteca. Intenta de nuevo en unos minutos.</div>
        ) : temas.length === 0 ? (
          <div className="rounded-card border border-dashed border-linea bg-papel/60 px-6 py-14 text-center"><BookOpen size={30} className="mx-auto text-sage" /><p className="mt-4 font-display text-2xl text-tinta">Pronto habrá nuevos temas por aquí.</p><p className="mx-auto mt-2 max-w-md font-sans text-sm text-muted">Cuando agregues una infografía activa en la hoja EDUCACION, aparecerá automáticamente en esta biblioteca.</p></div>
        ) : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{temas.slice(0, limiteVisible).map((tema, index) => <TarjetaTema key={tema.id} tema={tema} abrir={() => setSeleccionado(tema)} prioridad={index < 4} />)}</div>}
        {!cargando && !error && limiteVisible < temas.length && (
          <div className="mt-8 text-center">
            <button type="button" onClick={() => setLimiteVisible((actual) => actual + TEMAS_POR_LOTE)} className="rounded-control border border-verde px-6 py-3 font-sans text-sm font-semibold text-verde transition-colors hover:bg-verde hover:text-crema">
              Mostrar más temas
            </button>
          </div>
        )}
      </section>

      <AnimatePresence>{seleccionado && <VisorEducacion tema={seleccionado} cerrar={() => setSeleccionado(null)} />}</AnimatePresence>
    </main>
  )
}
