import { useEffect, useRef, useState } from 'react'
import { BookOpen, Download, Loader2, LockKeyhole, Share2, ShoppingBag } from 'lucide-react'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  driveFileId,
  driveViewUrl,
  getCookbooksPublicos,
  type Cookbook,
} from '../../services/dataService'
import { entregarArchivo, nombreArchivoSeguro } from '../../lib/archivo'

function Portada({ cookbook }: { cookbook: Cookbook }) {
  const [imageError, setImageError] = useState(false)

  if (!imageError) {
    return (
      <img
        src={driveViewUrl(cookbook.urlPortada)}
        alt={`Portada de ${cookbook.titulo}`}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
      />
    )
  }

  return (
    <div className="flex h-full w-full flex-col justify-end bg-verde p-5 text-crema">
      <BookOpen size={26} className="mb-auto text-mandarina" />
      <p className="font-display text-2xl leading-tight">{cookbook.titulo}</p>
    </div>
  )
}

function TarjetaCookbook({ cookbook }: { cookbook: Cookbook }) {
  const [ocupado, setOcupado] = useState(false)
  const [listoParaCompartir, setListoParaCompartir] = useState(false)
  const blob = useRef<Blob | null>(null)
  const gratis = cookbook.estado === 'GRATUITO'
  const puedeDescargar = gratis && cookbook.urlPdf !== ''
  const puedeComprar = !gratis && cookbook.urlPago !== ''

  async function entregarPdf() {
    const id = driveFileId(cookbook.urlPdf)
    if (!id || ocupado) return
    setOcupado(true)
    try {
      const entrega = await entregarArchivo(
        nombreArchivoSeguro(cookbook.titulo, 'receta'),
        cookbook.titulo,
        async () => {
          const respuesta = await fetch(`/api/drive-file?id=${encodeURIComponent(id)}`)
          if (!respuesta.ok) throw new Error('PDF_NO_DISPONIBLE')
          return respuesta.blob()
        },
        blob.current,
      )
      blob.current = entrega.blob
      setListoParaCompartir(entrega.resultado === 'listo-para-compartir')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <article className="group overflow-hidden rounded-card border border-linea bg-white shadow-[0_8px_24px_rgba(29,62,54,0.06)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-papel">
        <Portada cookbook={cookbook} />
        <span className={`absolute left-3 top-3 rounded-pill px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wide ${
          gratis ? 'bg-crema text-verde' : 'bg-tinta text-crema'
        }`}>
          {gratis ? 'Disponible' : 'Próximamente'}
        </span>
      </div>

      <div className="p-4">
        <h2 className="font-display text-xl font-semibold leading-tight text-tinta">{cookbook.titulo}</h2>
        {cookbook.descripcion && <p className="mt-2 line-clamp-2 font-sans text-sm leading-relaxed text-muted">{cookbook.descripcion}</p>}

        {puedeDescargar ? (
          <button
            type="button"
            onClick={() => void entregarPdf()}
            disabled={ocupado}
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-control bg-coral px-4 font-sans text-sm font-semibold text-white transition-colors hover:bg-coral/90 disabled:cursor-wait disabled:opacity-70"
          >
            {ocupado ? <Loader2 size={17} className="animate-spin" /> : listoParaCompartir ? <Share2 size={17} /> : <Download size={17} />}
            {ocupado ? 'Preparando…' : listoParaCompartir ? 'Toca para compartir' : 'Descargar o compartir'}
          </button>
        ) : puedeComprar ? (
          <a
            href={cookbook.urlPago}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-control bg-coral px-4 font-sans text-sm font-semibold text-white transition-colors hover:bg-coral/90"
          >
            <ShoppingBag size={17} />
            Comprar receta
          </a>
        ) : (
          <span className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-control border border-linea bg-papel font-sans text-sm font-semibold text-muted">
            <LockKeyhole size={16} />
            Próximamente
          </span>
        )}
      </div>
    </article>
  )
}

function CatalogoSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="aspect-[4/6]" />)}
    </div>
  )
}

export function Cookbooks() {
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let activo = true
    getCookbooksPublicos().then((respuesta) => {
      if (!activo) return
      if (respuesta.ok) setCookbooks(respuesta.data)
      else setError(true)
      setLoading(false)
    })
    return () => { activo = false }
  }, [])

  return (
    <main className="mx-auto min-h-svh max-w-6xl px-5 pb-28 pt-10 sm:min-h-[calc(100svh-73px)] sm:px-8 sm:pb-16">
      <p className="kicker mb-4">NutriPlan · Recetas</p>
      <h1 className="max-w-2xl font-display text-4xl font-semibold leading-[1.04] text-tinta sm:text-5xl">Recetas saludables</h1>
      <p className="mt-4 max-w-xl font-sans text-[15px] leading-relaxed text-muted sm:text-base">
        Recetas creadas para disfrutar, cuidar tu alimentación y volver a cocinar con calma.
      </p>

      <section className="mt-10" aria-label="Catálogo de recetas">
        {loading ? <CatalogoSkeleton /> : error ? (
          <div className="rounded-card border border-linea bg-papel p-6 font-sans text-muted">
            No pudimos cargar las recetas. Intenta de nuevo en unos minutos.
          </div>
        ) : cookbooks.length === 0 ? (
          <div className="rounded-card border border-dashed border-linea bg-papel/60 px-6 py-12 text-center">
            <BookOpen size={30} className="mx-auto text-sage" />
            <p className="mt-4 font-display text-2xl text-tinta">Pronto habrá novedades por aquí.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cookbooks.map((cookbook) => <TarjetaCookbook key={cookbook.id} cookbook={cookbook} />)}
          </div>
        )}
      </section>
    </main>
  )
}
