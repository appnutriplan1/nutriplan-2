import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Clock, Flame, Users, CheckCircle2, RefreshCw } from 'lucide-react'
import { obtenerReceta, obtenerRecetaCatalogoGuardada, obtenerRecetaProtegida, type Receta } from '../../services/supabaseRecetas'
import { Skeleton } from '../../components/ui/Skeleton'

export function DetalleReceta() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const recetaGuardada = id ? obtenerRecetaCatalogoGuardada(id) : null
  const [receta, setReceta] = useState<Receta | null>(recetaGuardada)
  const [loading, setLoading] = useState(!recetaGuardada)
  const [imageError, setImageError] = useState(false)
  const [estadoContenido, setEstadoContenido] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [intentoContenido, setIntentoContenido] = useState(0)
  const contenidoSolicitado = useRef<string | null>(null)
  const volverA = searchParams.get('returnTo') === 'calculadora-alimentos' ? '/calculadora-alimentos' : '/recetas'
  const etiquetaVolver = volverA === '/calculadora-alimentos' ? 'Volver a mis comidas' : 'Volver'

  useEffect(() => {
    if (!id) return

    // El catálogo persistido permite pintar la ficha de inmediato. La red
    // revalida los metadatos sin bloquear la pantalla.
    obtenerReceta(id, false).then((data) => {
      if (data) {
        // La ficha completa y los metadatos se solicitan en paralelo. En
        // móviles, la respuesta liviana puede terminar después y no debe
        // borrar ingredientes/pasos que ya llegaron desde el endpoint seguro.
        setReceta((actual) => actual && (actual.ingredientes.length > 0 || actual.pasos.length > 0)
          ? actual
          : data)
      }
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (!id || !receta || contenidoSolicitado.current === id) return
    contenidoSolicitado.current = id
    setEstadoContenido('loading')
    obtenerRecetaProtegida(id, null, null).then((data) => {
      if (data) {
        setReceta(data)
        setEstadoContenido('ready')
      } else {
        setEstadoContenido('error')
      }
    })
  }, [id, receta, intentoContenido])

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-5 pb-10 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:px-8 sm:py-10">
        <Skeleton className="aspect-video w-full rounded-card" />
        <Skeleton className="mt-6 h-12 w-3/4" />
        <Skeleton className="mt-4 h-6 w-full" />
      </main>
    )
  }

  if (!receta || receta.visible === false) {
    return (
      <main className="mx-auto max-w-4xl px-5 pb-10 pt-[calc(env(safe-area-inset-top,0px)+2rem)] text-center sm:py-10">
        <p className="text-muted">Receta no encontrada</p>
        <button
          onClick={() => navigate(volverA)}
          className="mt-4 rounded-control bg-verde px-6 py-2 font-sans text-sm font-semibold text-crema hover:bg-verde/90"
        >
          {etiquetaVolver}
        </button>
      </main>
    )
  }

  if (estadoContenido === 'idle' || estadoContenido === 'loading') {
    return (
      <main className="mx-auto max-w-4xl px-5 pb-10 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:px-8 sm:py-10">
        <Skeleton className="aspect-video w-full rounded-card" />
        <Skeleton className="mt-6 h-12 w-3/4" />
        <Skeleton className="mt-4 h-6 w-full" />
      </main>
    )
  }

  if (estadoContenido === 'error') {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center sm:px-8">
        <div className="rounded-card border border-mandarina/30 bg-papel p-8">
          <h1 className="font-display text-3xl font-semibold text-tinta">No pudimos abrir la receta</h1>
          <p className="mx-auto mt-3 max-w-md font-sans text-sm leading-relaxed text-muted">
            Tu acceso sigue activo. La conexión con el recetario falló temporalmente y no se modificó ningún dato.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                contenidoSolicitado.current = null
                setIntentoContenido((valor) => valor + 1)
              }}
              className="inline-flex items-center gap-2 rounded-control bg-verde px-5 py-2.5 font-sans text-sm font-semibold text-crema"
            >
              <RefreshCw size={16} /> Intentar de nuevo
            </button>
            <button
              type="button"
              onClick={() => navigate(volverA)}
              className="rounded-control border border-linea px-5 py-2.5 font-sans text-sm font-semibold text-tinta"
            >
              {etiquetaVolver}
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-5 pb-10 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:px-8 sm:py-10">
      {/* Botón volver */}
      <button
        onClick={() => navigate(volverA)}
        className="mb-6 flex items-center gap-2 font-sans text-sm font-medium text-verde hover:text-verde/80"
      >
        <ArrowLeft size={18} />
        {etiquetaVolver}
      </button>

      {/* Imagen */}
      <div className="relative mb-8 overflow-hidden rounded-card bg-papel">
        {!imageError ? (
          <img
            src={receta.imagenPrincipal}
            alt={receta.titulo}
            onError={() => setImageError(true)}
            className="h-[400px] w-full object-cover sm:h-[500px]"
          />
        ) : (
          <div className="flex h-[400px] items-center justify-center bg-gradient-to-br from-verde/10 to-mandarina/10 sm:h-[500px]">
            <span className="text-6xl">{receta.categoriaNombre?.[0]}</span>
          </div>
        )}
      </div>

      {/* Encabezado */}
      <div className="mb-8">
        <div className="mb-3 inline-block rounded-pill bg-crema px-3 py-1 font-sans text-xs font-bold uppercase text-verde">
          {receta.categoriaNombre}
        </div>
        <h1 className="font-display text-4xl font-semibold text-tinta sm:text-5xl">
          {receta.titulo}
        </h1>
        <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-muted">
          {receta.descripcion}
        </p>
      </div>

      {/* Macros */}
      <div className="mb-10 grid grid-cols-4 gap-4 sm:grid-cols-4">
        <div className="rounded-card border border-linea bg-papel/70 p-4 text-center">
          <div className="flex items-center justify-center text-2xl">
            <Clock size={20} className="text-verde" />
          </div>
          <p className="mt-2 font-display text-lg font-semibold text-tinta">
            {receta.tiempoMinutos}m
          </p>
          <p className="font-sans text-xs uppercase text-muted">Tiempo</p>
        </div>
        <div className="rounded-card border border-linea bg-papel/70 p-4 text-center">
          <div className="flex items-center justify-center text-2xl">
            <Flame size={20} className="text-coral" />
          </div>
          <p className="mt-2 font-display text-lg font-semibold text-tinta">
            {receta.nutricion.kcal}
          </p>
          <p className="font-sans text-xs uppercase text-muted">kcal</p>
        </div>
        <div className="rounded-card border border-linea bg-papel/70 p-4 text-center">
          <div className="flex items-center justify-center text-2xl">
            <Users size={20} className="text-sage" />
          </div>
          <p className="mt-2 font-display text-lg font-semibold text-tinta">
            {receta.porciones}p
          </p>
          <p className="font-sans text-xs uppercase text-muted">Porciones</p>
        </div>
        <div className="rounded-card border border-linea bg-papel/70 p-4 text-center">
          <p className="font-display text-lg font-semibold text-tinta">{receta.dificultad}</p>
          <p className="font-sans text-xs uppercase text-muted">Dificultad</p>
        </div>
      </div>

      {/* Contenido */}
      <div className="grid gap-8 sm:grid-cols-3">
        {/* Ingredientes */}
        <div className="sm:col-span-2">
          <h2 className="mb-4 font-display text-2xl font-semibold text-tinta">Ingredientes</h2>
          <div className="rounded-card border border-linea bg-papel p-6">
            <ul className="space-y-3">
              {receta.ingredientes.map((ing, i) => (
                <li key={i} className="flex gap-3 font-sans text-sm leading-relaxed text-tinta">
                  <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-verde"></span>
                  {ing}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Nutrición */}
        <div>
          <h3 className="mb-4 font-display text-xl font-semibold text-tinta">Nutrición</h3>
          <div className="space-y-2">
            <div className="rounded-control border border-linea bg-papel/70 p-3">
              <p className="font-sans text-xs uppercase text-muted">Proteína</p>
              <p className="font-display text-2xl font-semibold text-verde">
                {receta.nutricion.proteina}g
              </p>
            </div>
            <div className="rounded-control border border-linea bg-papel/70 p-3">
              <p className="font-sans text-xs uppercase text-muted">Carbohidratos</p>
              <p className="font-display text-2xl font-semibold text-mandarina">
                {receta.nutricion.carbs}g
              </p>
            </div>
            <div className="rounded-control border border-linea bg-papel/70 p-3">
              <p className="font-sans text-xs uppercase text-muted">Grasas</p>
              <p className="font-display text-2xl font-semibold text-coral">
                {receta.nutricion.grasas}g
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pasos */}
      <div className="mt-10">
        <h2 className="mb-6 font-display text-2xl font-semibold text-tinta">Preparación</h2>
        <div className="space-y-4">
          {receta.pasos.map((paso, i) => (
            <div key={i} className="flex gap-4 rounded-card border border-linea bg-papel/70 p-5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-verde font-display font-semibold text-crema">
                {i + 1}
              </div>
              <p className="pt-1 font-sans text-sm leading-relaxed text-tinta">{paso}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      {receta.tipsDelChef && receta.tipsDelChef.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-2xl font-semibold text-tinta">💡 Tips del Chef</h2>
          <div className="rounded-card border-l-4 border-l-mandarina bg-mandarina/5 p-6">
            <ul className="space-y-2">
              {receta.tipsDelChef.map((tip, i) => (
                <li key={i} className="flex gap-3 font-sans text-sm text-tinta">
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-mandarina" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tags */}
      {receta.tags.length > 0 && (
        <div className="mt-10">
          <h3 className="mb-4 font-display text-lg font-semibold text-tinta">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {receta.tags.map((tag, i) => (
              <span
                key={i}
                className="rounded-pill bg-verde/10 px-3 py-1 font-sans text-xs font-medium text-verde"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
