import { useState } from 'react'
import { Clock, Flame, Lock, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Receta } from '../../services/supabaseRecetas'

export function TarjetaReceta({
  receta,
  bloqueada = false,
  prioridad = false,
}: {
  receta: Receta
  bloqueada?: boolean
  prioridad?: boolean
}) {
  const [imageError, setImageError] = useState(false)

  return (
    <Link
      to={`/recetas/${receta.id}`}
      className="group overflow-hidden rounded-card border border-linea bg-papel/70 transition-all hover:border-verde hover:shadow-soft-lg"
    >
      {/* Imagen */}
      <div className="relative aspect-[3/4] overflow-hidden bg-papel">
        {!imageError ? (
          <img
            src={receta.imagenPrincipal}
            alt={receta.titulo}
            loading={prioridad ? 'eager' : 'lazy'}
            fetchPriority={prioridad ? 'high' : 'auto'}
            decoding="async"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-verde/10 to-mandarina/10">
            <span className="text-4xl">{receta.categoriaNombre?.[0]}</span>
          </div>
        )}

        {/* Badge de categoría */}
        <span className="absolute left-2 top-2 rounded-full bg-crema/90 px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-wide text-tinta backdrop-blur-sm">
          {receta.categoriaNombre}
        </span>

        {/* Badge de estado */}
        <span
          className={`absolute right-2 top-2 rounded-full px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${
            receta.estado === 'GRATUITO'
              ? 'bg-crema text-verde'
              : 'bg-coral text-white'
          }`}
        >
          RECETA
        </span>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h3 className="line-clamp-2 font-display text-sm font-semibold text-tinta group-hover:text-verde transition-colors">
          {receta.titulo}
        </h3>

        {/* Macros */}
        <div className="mt-2.5 flex gap-2 text-[11px] text-muted">
          <div className="flex items-center gap-0.5">
            <Clock size={13} />
            <span>{receta.tiempoMinutos}m</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Flame size={13} />
            <span>{receta.nutricion.kcal}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Users size={13} />
            <span>{receta.porciones}p</span>
          </div>
        </div>

        {/* CTA */}
        <button
          className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-control py-2 font-sans text-xs font-semibold transition-colors active:scale-95 ${
            bloqueada
              ? 'border border-coral/30 bg-coral/10 text-coral hover:bg-coral/15'
              : 'bg-verde text-crema hover:bg-verde/90'
          }`}
        >
          {bloqueada && <Lock size={13} aria-hidden="true" />}
          {bloqueada ? 'Ver acceso' : 'Ver receta'}
        </button>
      </div>
    </Link>
  )
}
