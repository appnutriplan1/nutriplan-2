import { useCallback, useEffect, useState, useMemo } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { Skeleton } from '../../components/ui/Skeleton'
import { actualizarCatalogoRecetas, obtenerCatalogoRecetasGuardado, type Receta } from '../../services/supabaseRecetas'
import { CATEGORIAS } from '../../lib/categorias'
import { TarjetaReceta } from './TarjetaReceta'
import { SiguientesPasos } from '../../components/EmbudoValor/SiguientesPasos'
import { PUBLIC_RECIPE_ID_SET } from '../../lib/publicRecipes'

const RECETAS_POR_LOTE = 24

const SUBCATEGORIAS_MASA = [
  { id: '', nombre: 'Todos', emoji: '✨', aliases: [] },
  { id: 'smoothies-y-batidos', nombre: 'Smoothies y batidos', emoji: '🥤', aliases: ['smoothie', 'smoothies', 'batido', 'batidos', 'licuado', 'licuados'] },
  { id: 'crepes', nombre: 'Crepes', emoji: '🥞', aliases: ['crepe', 'crepes'] },
  { id: 'waffles', nombre: 'Waffles', emoji: '🧇', aliases: ['waffle', 'waffles'] },
  { id: 'pizzas', nombre: 'Pizzas', emoji: '🍕', aliases: ['pizza', 'pizzas'] },
  { id: 'panqueques-y-tortillas', nombre: 'Panqueques y tortillas', emoji: '🍳', aliases: ['panqueque', 'panqueques', 'tortilla', 'tortillas'] },
  { id: 'desayunos', nombre: 'Desayunos', emoji: '🌅', aliases: ['desayuno', 'desayunos'] },
  { id: 'platos-principales', nombre: 'Platos principales', emoji: '🍽️', aliases: ['plato principal', 'platos principales', 'almuerzo', 'almuerzos', 'cena', 'cenas'] },
  { id: 'snacks', nombre: 'Snacks', emoji: '🥜', aliases: ['snack', 'snacks'] },
] as const

const SUBCATEGORIAS_PERDIDA = [
  { id: '', nombre: 'Todas', emoji: '✨', aliases: [] },
  { id: 'desayunos', nombre: 'Desayunos', emoji: '🌅', aliases: ['desayuno', 'desayunos'] },
  { id: 'almuerzos', nombre: 'Almuerzos', emoji: '🍽️', aliases: ['almuerzo', 'almuerzos', 'ensalada', 'ensaladas'] },
  { id: 'cenas', nombre: 'Cenas', emoji: '🌙', aliases: ['cena', 'cenas'] },
  { id: 'snacks', nombre: 'Snacks', emoji: '🥜', aliases: ['snack', 'snacks', 'merienda', 'meriendas'] },
  { id: 'sopas', nombre: 'Sopas', emoji: '🍲', aliases: ['sopa', 'sopas', 'crema', 'cremas', 'gazpacho'] },
  { id: 'postres', nombre: 'Postres', emoji: '🍮', aliases: ['postre', 'postres', 'pudin', 'pudín'] },
] as const

function normalizarFiltro(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function Recetas() {
  const [recetas, setRecetas] = useState<Receta[]>(() => obtenerCatalogoRecetasGuardado())
  const [loading, setLoading] = useState(() => obtenerCatalogoRecetasGuardado().length === 0)
  const [errorCatalogo, setErrorCatalogo] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [subcategoriaMasaFiltro, setSubcategoriaMasaFiltro] = useState('')
  const [subcategoriaPerdidaFiltro, setSubcategoriaPerdidaFiltro] = useState('')
  const [limiteVisible, setLimiteVisible] = useState(RECETAS_POR_LOTE)

  useEffect(() => {
    // La ficha es el siguiente destino natural desde el catálogo. Precargar
    // solo su módulo evita que el primer toque espere la descarga del chunk
    // en conexiones móviles; no solicita ingredientes ni contenido privado.
    void import('./DetalleReceta')
  }, [])

  const cargarRecetas = useCallback(async () => {
    setErrorCatalogo(false)
    const data = await actualizarCatalogoRecetas()
    setRecetas(data)
    setErrorCatalogo(data.length === 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    let activo = true
    if (activo) void cargarRecetas()

    return () => {
      activo = false
    }
  }, [cargarRecetas])

  const filtradas = useMemo(() => {
    let resultado = recetas.filter((receta) => PUBLIC_RECIPE_ID_SET.has(receta.id))

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      resultado = resultado.filter(
        (r) =>
          r.titulo.toLowerCase().includes(q) ||
          r.descripcion.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      )
    }

    if (categoriaFiltro) {
      resultado = resultado.filter((r) => r.categoriaId === categoriaFiltro)
    }

    if (categoriaFiltro === 'masa-muscular' && subcategoriaMasaFiltro) {
      const subcategoria = SUBCATEGORIAS_MASA.find((item) => item.id === subcategoriaMasaFiltro)
      if (subcategoria) {
        resultado = resultado.filter((receta) => {
          const contenido = normalizarFiltro([receta.titulo, ...receta.tags].join(' '))
          return subcategoria.aliases.some((alias) => contenido.includes(normalizarFiltro(alias)))
        })
      }
    }

    if (categoriaFiltro === 'control-de-peso' && subcategoriaPerdidaFiltro) {
      const subcategoria = SUBCATEGORIAS_PERDIDA.find((item) => item.id === subcategoriaPerdidaFiltro)
      if (subcategoria) {
        resultado = resultado.filter((receta) => {
          const contenido = normalizarFiltro([receta.titulo, ...receta.tags].join(' '))
          return subcategoria.aliases.some((alias) => contenido.includes(normalizarFiltro(alias)))
        })
      }
    }

    return resultado.sort((a, b) => a.orden! - b.orden!)
  }, [recetas, busqueda, categoriaFiltro, subcategoriaMasaFiltro, subcategoriaPerdidaFiltro])

  useEffect(() => {
    setLimiteVisible(RECETAS_POR_LOTE)
  }, [busqueda, categoriaFiltro, subcategoriaMasaFiltro, subcategoriaPerdidaFiltro])

  const recetasVisibles = filtradas.slice(0, limiteVisible)

  return (
    <main className="mx-auto min-h-svh max-w-6xl px-5 pb-28 pt-10 sm:px-8 sm:pb-16">
      {/* Encabezado */}
      <div className="mb-8">
        <p className="kicker mb-2">NUTRIPLAN · RECETAS</p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-tinta sm:text-5xl">
          Recetas que sí puedes hacer
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-[15px] leading-relaxed text-muted sm:text-base">
          Ingredientes reales, pasos claros y porciones pensadas para tu día a día. Sin complicaciones.
        </p>
      </div>

      {/* Buscador */}
      <div className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-muted" size={18} />
          <input
            type="text"
            placeholder="Busca recetas o categorías..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-control border border-linea bg-papel/70 pl-10 pr-4 py-2.5 text-sm text-tinta outline-none transition-colors focus:border-verde focus:ring-1 focus:ring-verde"
          />
        </div>
      </div>


      {/* Filtro de categorías */}
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setCategoriaFiltro('')
            setSubcategoriaMasaFiltro('')
            setSubcategoriaPerdidaFiltro('')
          }}
          className={`rounded-pill px-4 py-2 font-sans text-sm font-medium transition-colors ${
            categoriaFiltro === ''
              ? 'bg-verde text-crema'
              : 'border border-linea bg-papel/65 text-tinta hover:border-verde'
          }`}
        >
          Todas
        </button>
        {CATEGORIAS.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setCategoriaFiltro(cat.id)
              setSubcategoriaMasaFiltro('')
              setSubcategoriaPerdidaFiltro('')
            }}
            className={`rounded-pill px-4 py-2 font-sans text-sm font-medium transition-colors ${
              categoriaFiltro === cat.id
                ? 'bg-verde text-crema'
                : 'border border-linea bg-papel/65 text-tinta hover:border-verde'
            }`}
          >
            {cat.emoji} {cat.nombre}
          </button>
        ))}
      </div>

      {categoriaFiltro === 'masa-muscular' && (
        <section className="mb-8 rounded-card border border-sage/25 bg-sage/5 p-4" aria-label="Tipos de recetas para masa muscular">
          <div className="mb-3">
            <p className="font-display text-lg font-semibold text-tinta">Explora Masa Muscular</p>
            <p className="mt-1 font-sans text-xs text-muted">Elige el tipo de preparación que buscas.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtros de Masa Muscular">
            {SUBCATEGORIAS_MASA.map((subcategoria) => (
              <button
                key={subcategoria.id || 'todos-masa'}
                type="button"
                onClick={() => setSubcategoriaMasaFiltro(subcategoria.id)}
                className={`shrink-0 rounded-pill px-4 py-2 font-sans text-sm font-medium transition-colors ${
                  subcategoriaMasaFiltro === subcategoria.id
                    ? 'bg-verde text-crema'
                    : 'border border-linea bg-papel text-tinta hover:border-verde'
                }`}
              >
                {subcategoria.emoji} {subcategoria.nombre}
              </button>
            ))}
          </div>
        </section>
      )}

      {categoriaFiltro === 'control-de-peso' && (
        <section className="mb-8 rounded-card border border-sage/25 bg-sage/5 p-4" aria-label="Tipos de recetas para pérdida de peso">
          <div className="mb-3">
            <p className="font-display text-lg font-semibold text-tinta">Explora Pérdida de peso</p>
            <p className="mt-1 font-sans text-xs text-muted">Elige el momento de comida que buscas.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtros de Pérdida de peso">
            {SUBCATEGORIAS_PERDIDA.map((subcategoria) => (
              <button
                key={subcategoria.id || 'todas-perdida'}
                type="button"
                onClick={() => setSubcategoriaPerdidaFiltro(subcategoria.id)}
                className={`shrink-0 rounded-pill px-4 py-2 font-sans text-sm font-medium transition-colors ${
                  subcategoriaPerdidaFiltro === subcategoria.id
                    ? 'bg-verde text-crema'
                    : 'border border-linea bg-papel text-tinta hover:border-verde'
                }`}
              >
                {subcategoria.emoji} {subcategoria.nombre}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Grid de recetas */}
      <section aria-label="Catálogo de recetas">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4]" />
            ))}
          </div>
        ) : errorCatalogo ? (
          <div className="rounded-card border border-mandarina/30 bg-papel p-8 text-center">
            <p className="font-display text-xl font-semibold text-tinta">El catálogo está tomando un descanso</p>
            <p className="mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-muted">
              No pudimos conectar con las recetas. Tus datos y tu acceso permanecen seguros.
            </p>
            <button
              type="button"
              onClick={() => void cargarRecetas()}
              className="mt-5 inline-flex items-center gap-2 rounded-control bg-verde px-5 py-2.5 font-sans text-sm font-semibold text-crema"
            >
              <RefreshCw size={16} /> Intentar de nuevo
            </button>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="rounded-card border border-linea bg-papel p-8 text-center">
            <p className="font-sans text-muted">
              {busqueda ? 'No encontramos recetas con esos términos.' : 'No hay recetas en esta categoría.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recetasVisibles.map((receta, index) => (
              <TarjetaReceta
                key={receta.id}
                receta={receta}
                bloqueada={false}
                prioridad={index < 4}
              />
            ))}
          </div>
        )}
        {!loading && limiteVisible < filtradas.length && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setLimiteVisible((actual) => actual + RECETAS_POR_LOTE)}
              className="rounded-control border border-verde px-6 py-3 font-sans text-sm font-semibold text-verde transition-colors hover:bg-verde hover:text-crema"
            >
              Mostrar más recetas
            </button>
          </div>
        )}
      </section>

      {filtradas.length > 0 && <SiguientesPasos actual="recetas" />}
    </main>
  )
}
