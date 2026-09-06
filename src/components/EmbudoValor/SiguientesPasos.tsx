import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

type Paso = {
  titulo: string
  descripcion: string
  icon: string
  to: string
  cta: string
}

const PASOS_COMPLETOS: Record<string, Paso> = {
  'calculadora-clinica': {
    titulo: 'Ahora conoce recetas que se adapten',
    descripcion: 'Usa tu gasto calórico para encontrar recetas con los macros perfectos para ti.',
    icon: '🍽️',
    to: '/recetas',
    cta: 'Ver recetas',
  },
  'calculadora-alimentos': {
    titulo: 'Completa con una rutina de ejercicio',
    descripcion: 'Un plan de entrenamiento personalizado que se ajuste a tu tiempo y objetivo.',
    icon: '💪',
    to: '/generador-rutinas',
    cta: 'Generar rutina',
  },
  'generador-rutinas': {
    titulo: 'Entiende la ciencia detrás del cambio',
    descripcion: 'Artículos educativos para entender cómo tu cuerpo responde al entrenamiento y la nutrición.',
    icon: '🧠',
    to: '/educacion',
    cta: 'Explorar educación',
  },
  'recetas': {
    titulo: 'Genera una rutina que complemente tu plan',
    descripcion: 'Un programa de ejercicio personalizado para potenciar tu plan nutricional.',
    icon: '💪',
    to: '/generador-rutinas',
    cta: 'Crear rutina',
  },
}

export function SiguientesPasos({ actual }: { actual: keyof typeof PASOS_COMPLETOS }) {
  const paso = PASOS_COMPLETOS[actual]
  if (!paso) return null

  return (
    <section className="mt-12 rounded-card border border-verde/20 bg-gradient-to-br from-verde/5 to-mandarina/5 p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start gap-4">
          <span className="text-4xl">{paso.icon}</span>
          <div className="flex-1">
            <h3 className="font-display text-2xl font-semibold text-tinta sm:text-3xl">
              {paso.titulo}
            </h3>
            <p className="mt-2 font-sans text-[15px] leading-relaxed text-muted">
              {paso.descripcion}
            </p>
            <Link
              to={paso.to}
              className="mt-4 inline-flex items-center gap-2 rounded-control bg-verde px-5 py-2.5 font-sans text-sm font-semibold text-crema transition-colors hover:bg-verde/90"
            >
              {paso.cta}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
