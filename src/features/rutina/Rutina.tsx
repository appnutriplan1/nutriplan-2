import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Clock3, Dumbbell, PlayCircle, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { getRutinas, type Rutina as RutinaTipo } from '../../services/dataService'

function RutinaAsignada({ rutina }: { rutina: RutinaTipo }) {
  const dias = useMemo(() => [...new Set(rutina.ejercicios.map((ejercicio) => ejercicio.dia))], [rutina])
  const [dia, setDia] = useState(dias[0] ?? '')
  const ejercicios = rutina.ejercicios.filter((ejercicio) => ejercicio.dia === dia)

  return (
    <>
      <section className="rounded-card bg-verde p-6 text-crema shadow-cover sm:p-8">
        <p className="kicker !text-mandarina">Tu rutina asignada</p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">{rutina.titulo}</h1>
        {rutina.descripcion && <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-crema/75">{rutina.descripcion}</p>}
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
          {rutina.objetivo && <span className="rounded-pill bg-white/10 px-3 py-1.5">{rutina.objetivo}</span>}
          {rutina.nivel && <span className="rounded-pill bg-white/10 px-3 py-1.5">Nivel {rutina.nivel}</span>}
          {rutina.duracionEstimadaMin > 0 && <span className="inline-flex items-center gap-1 rounded-pill bg-white/10 px-3 py-1.5"><Clock3 size={13} /> {rutina.duracionEstimadaMin} min</span>}
        </div>
      </section>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {dias.map((nombreDia) => (
          <button
            key={nombreDia}
            type="button"
            onClick={() => setDia(nombreDia)}
            className={`shrink-0 rounded-pill px-4 py-2 font-sans text-sm font-semibold transition-colors ${dia === nombreDia ? 'bg-verde text-crema' : 'bg-papel text-muted hover:text-tinta'}`}
          >
            {nombreDia}
          </button>
        ))}
      </div>

      <section className="mt-5 space-y-3" aria-label={`Ejercicios de ${dia}`}>
        {ejercicios.map((item, index) => (
          <Card key={item.id} padding="md" className="flex items-start gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-papel font-display text-base font-semibold text-verde">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold leading-tight text-tinta">{item.ejercicio.nombre}</h2>
                  {item.ejercicio.zonaCuerpo && <p className="mt-1 font-sans text-xs font-semibold uppercase tracking-wide text-sage">{item.ejercicio.zonaCuerpo}</p>}
                </div>
                {item.ejercicio.urlVideo && (
                  <a href={item.ejercicio.urlVideo} target="_blank" rel="noreferrer" aria-label={`Ver video de ${item.ejercicio.nombre}`} className="shrink-0 text-coral hover:text-verde">
                    <PlayCircle size={25} />
                  </a>
                )}
              </div>
              {item.ejercicio.descripcion && <p className="mt-3 font-sans text-sm leading-relaxed text-muted">{item.ejercicio.descripcion}</p>}
              <div className="mt-4 flex flex-wrap gap-2 font-sans text-xs font-semibold text-verde">
                {item.series && <span className="rounded-control bg-papel px-3 py-1.5">{item.series} series</span>}
                {item.repeticiones && <span className="rounded-control bg-papel px-3 py-1.5">{item.repeticiones} repeticiones</span>}
                {item.descansoSeg && <span className="rounded-control bg-papel px-3 py-1.5">Descanso {item.descansoSeg} s</span>}
              </div>
              {item.notas && <p className="mt-4 border-l-2 border-mandarina pl-3 font-reading text-sm italic text-muted">{item.notas}</p>}
            </div>
          </Card>
        ))}
      </section>
    </>
  )
}

export function Rutina() {
  const [rutinas, setRutinas] = useState<RutinaTipo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let activa = true
    getRutinas().then((respuesta) => {
      if (!activa) return
      if (respuesta.ok) setRutinas(respuesta.data)
      else setError(true)
      setCargando(false)
    })
    return () => { activa = false }
  }, [])

  return (
    <main className="mx-auto min-h-svh max-w-[720px] px-5 pb-28 pt-8 sm:min-h-[calc(100svh-73px)] sm:px-7 sm:pb-16">
      {cargando ? <><Skeleton className="h-52 w-full rounded-card" /><Skeleton className="mt-7 h-20 w-full rounded-card" /></> : error ? (
        <Card padding="lg" className="text-center">
          <p className="font-display text-2xl font-semibold text-tinta">No pudimos cargar tu rutina.</p>
          <p className="mt-2 font-sans text-sm text-muted">Intenta de nuevo en unos minutos.</p>
        </Card>
      ) : rutinas.length === 0 ? (
        <Card padding="lg" className="flex flex-col items-center py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-papel text-sage"><Dumbbell size={25} /></div>
          <p className="mt-5 font-display text-2xl font-semibold text-tinta">Tu rutina llegará cuando corresponda.</p>
          <p className="mt-3 max-w-sm font-sans text-sm leading-relaxed text-muted">Tu nutricionista la activará según tu objetivo y momento del proceso.</p>
          <Link to="/home" className="mt-6 inline-flex items-center gap-1 font-sans text-sm font-semibold text-verde hover:text-coral">Volver a Home <ChevronRight size={16} /></Link>
        </Card>
      ) : (
        <>
          <RutinaAsignada rutina={rutinas[0]} />
          {rutinas.length > 1 && <p className="mt-6 inline-flex items-center gap-2 font-sans text-sm text-muted"><Sparkles size={16} className="text-mandarina" /> Tienes {rutinas.length} rutinas activas. Se muestra la principal.</p>}
        </>
      )}
    </main>
  )
}
