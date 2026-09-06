import { Sprout } from 'lucide-react'
import { cn } from '../lib/cn'
import { formatearFecha } from '../lib/fecha'

interface PlanCoverProps {
  titulo: string
  vigente?: boolean
  size?: 'lg' | 'sm'
  kcal?: number
  proteinas?: number
  carbohidratos?: number
  grasas?: number
  fechaInicio?: string
  fechaFin?: string
  className?: string
}

// Sin año: en la portada el rango del plan siempre es del período en curso.
// `new Date('2026-07-27')` se interpretaría como medianoche UTC y en Perú
// mostraría el día anterior; por eso el formato sale de `formatearFecha`.
function fmtFecha(iso?: string): string {
  return iso ? formatearFecha(iso, false) : ''
}

function rangoFechas(inicio?: string, fin?: string): string {
  const a = fmtFecha(inicio)
  const b = fmtFecha(fin)
  if (a && b) return `${a} – ${b}`
  if (a) return `Desde ${a}`
  return ''
}

export function PlanCover({
  titulo,
  vigente = true,
  size = 'lg',
  kcal,
  proteinas,
  carbohidratos,
  grasas,
  fechaInicio,
  fechaFin,
  className,
}: PlanCoverProps) {
  const isLg = size === 'lg'
  const rango = rangoFechas(fechaInicio, fechaFin)

  return (
    <div
      className={cn(
        'relative flex aspect-[3/4] shrink-0 flex-col justify-between overflow-hidden rounded-card',
        isLg ? 'w-full p-7' : 'w-36 p-4',
        vigente
          ? 'bg-gradient-to-br from-verde to-[#1e3547] text-crema'
          : 'border border-linea bg-papel text-tinta',
        className,
      )}
      style={{ boxShadow: isLg ? 'var(--shadow-cover)' : 'var(--shadow-soft-lg)' }}
    >
      {/* Marca de agua botánica */}
      {vigente && (
        <Sprout
          size={isLg ? 260 : 120}
          strokeWidth={0.75}
          className="pointer-events-none absolute -bottom-10 -right-10 text-crema opacity-[0.06]"
        />
      )}

      {/* Fila superior: estado + marca */}
      <div className="relative z-10 flex items-start justify-between">
        <span className={cn('kicker', isLg ? 'text-[11px]' : '!text-[9px]', !vigente && '!text-muted')}>
          {vigente ? 'Vigente' : 'Archivado'}
        </span>
        {isLg && vigente && (
          <span className="kicker !text-[10px] !text-crema/45">NutriPlan</span>
        )}
      </div>

      {/* Centro: título + fechas */}
      <div className="relative z-10">
        <p
          className={cn(
            'font-display font-semibold leading-[1.12]',
            isLg ? 'text-[28px]' : 'text-[13px]',
            vigente ? 'text-crema' : 'text-tinta',
          )}
        >
          {titulo}
        </p>
        {isLg && rango && (
          <p className={cn('mt-2 font-reading text-[13px] italic', vigente ? 'text-crema/70' : 'text-muted')}>
            {rango}
          </p>
        )}
      </div>

      {/* Franja inferior: macros del plan */}
      {isLg && vigente && kcal ? (
        <div className="relative z-10 flex items-end justify-between border-t border-crema/15 pt-4">
          <div>
            <p className="font-display text-[24px] leading-none text-crema">{kcal}</p>
            <p className="kicker !text-[9px] !text-crema/50">kcal por día</p>
          </div>
          {(proteinas || carbohidratos || grasas) && (
            <div className="flex gap-3 font-sans text-[11px] text-crema/70">
              {proteinas ? <span>P·{proteinas}g</span> : null}
              {carbohidratos ? <span>C·{carbohidratos}g</span> : null}
              {grasas ? <span>G·{grasas}g</span> : null}
            </div>
          )}
        </div>
      ) : (
        <Sprout
          size={isLg ? 30 : 18}
          strokeWidth={1.5}
          className={cn('relative z-10', vigente ? 'text-sage' : 'text-sage/60')}
        />
      )}
    </div>
  )
}
