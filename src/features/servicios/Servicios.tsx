import { ArrowRight, CalendarCheck, Check, MessageCircle } from 'lucide-react'

const WHATSAPP_LINK = import.meta.env.VITE_WHATSAPP_LINK || '#'

function enlaceWhatsApp(mensaje: string) {
  if (WHATSAPP_LINK === '#') return '#'
  const separador = WHATSAPP_LINK.includes('?') ? '&' : '?'
  return `${WHATSAPP_LINK}${separador}text=${encodeURIComponent(mensaje)}`
}

const SERVICIOS = [
  {
    titulo: 'Consulta nutricional',
    descripcion: 'Evaluación individual, objetivos claros y una estrategia adaptada a tu rutina.',
    puntos: ['Evaluación nutricional', 'Plan personalizado', 'Material educativo'],
  },
  {
    titulo: 'Seguimiento',
    descripcion: 'Acompañamiento para revisar avances, resolver dificultades y ajustar el plan.',
    puntos: ['Control de progreso', 'Ajustes del plan', 'Orientación profesional'],
  },
]

export function Servicios() {
  return (
    <main className="min-h-svh bg-crema px-5 pb-24 pt-12 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="kicker">SERVICIOS</p>
        <h1 className="mt-3 max-w-3xl font-display text-5xl font-semibold leading-[.98] text-tinta sm:text-6xl">
          Atención nutricional personal
        </h1>
        <p className="mt-5 max-w-2xl font-reading text-xl leading-relaxed text-muted">
          Este espacio se personalizará con la información, servicios y datos de contacto del profesional.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {SERVICIOS.map((servicio) => (
            <article key={servicio.titulo} className="rounded-card border border-linea bg-papel p-7 shadow-soft">
              <h2 className="font-display text-3xl font-semibold text-tinta">{servicio.titulo}</h2>
              <p className="mt-3 font-sans text-sm leading-relaxed text-muted">{servicio.descripcion}</p>
              <ul className="mt-6 space-y-3">
                {servicio.puntos.map((punto) => (
                  <li key={punto} className="flex items-center gap-2 font-sans text-sm text-tinta">
                    <Check size={16} className="text-sage" /> {punto}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href={enlaceWhatsApp('Hola, quisiera información sobre la consulta nutricional.')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-control bg-coral px-5 py-3 font-sans text-sm font-semibold text-white">
            <MessageCircle size={17} /> Consultar <ArrowRight size={16} />
          </a>
          <a href={import.meta.env.VITE_AGENDA_LINK || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-control border border-verde px-5 py-3 font-sans text-sm font-semibold text-verde">
            <CalendarCheck size={17} /> Agendar
          </a>
        </div>
      </section>
    </main>
  )
}
