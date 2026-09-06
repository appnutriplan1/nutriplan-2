import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Brain, Calculator, ClipboardList, Dumbbell, Salad, Sprout } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { PlanCover } from '../../components/PlanCover'
import { DescargasPlan, RecursoRapido } from '../../components/DescargasPlan'
import { Card } from '../../components/ui/Card'
import { Skeleton } from '../../components/ui/Skeleton'
import { Carousel } from './Carousel'
import { ProgresoPeso } from './ProgresoPeso'
import { obtenerRecetasDestacadas, type Receta } from '../../services/supabaseRecetas'
import { TarjetaReceta } from '../recetas/TarjetaReceta'
import { getWeeklyCookbook } from '../../services/weeklyCookbookService'

function avanceSemana(inicio?: string, fin?: string) {
  if (!inicio || !fin) return null
  const primerDia = new Date(`${inicio}T12:00:00`)
  const ultimoDia = new Date(`${fin}T12:00:00`)
  const hoy = new Date()
  hoy.setHours(12, 0, 0, 0)
  const total = Math.max(1, Math.round((ultimoDia.getTime() - primerDia.getTime()) / 86_400_000) + 1)
  const transcurridos = Math.min(total, Math.max(1, Math.round((hoy.getTime() - primerDia.getTime()) / 86_400_000) + 1))
  return { total, transcurridos, porcentaje: (transcurridos / total) * 100 }
}

function fechaCorta(fecha?: string) {
  if (!fecha) return ''
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' }).format(new Date(`${fecha}T12:00:00`))
}

export function Home() {
  const { paciente, planes, seguimiento, recursos, cargandoDatos, refrescarDatos } = useAuth()
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [recetasLoading, setRecetasLoading] = useState(true)
  const [hasWeeklyCookbook, setHasWeeklyCookbook] = useState(false)

  useEffect(() => {
    void refrescarDatos()
  }, [refrescarDatos])

  useEffect(() => {
    let activo = true
    obtenerRecetasDestacadas(4).then((data) => {
      if (activo) {
        setRecetas(data)
      }
      setRecetasLoading(false)
    })
    return () => {
      activo = false
    }
  }, [])

  const vigente = planes.find((p) => p.estado === 'VIGENTE')
  const vigenteId = vigente?.id
  const anteriores = planes.filter((p) => p.estado === 'ARCHIVADO')
  const descargasDelPlan = vigente ? recursos.filter((r) => r.planId === vigente.id) : []
  const descargas = descargasDelPlan.length > 0 ? descargasDelPlan : recursos
  // Detectar lista de compras por título (funciona para tipo COMPRAS u OTRO)
  const listaCompras = descargas.find((recurso) => recurso.titulo.toLowerCase().includes('compra') || recurso.titulo.toLowerCase().includes('list'))
  const otrosArchivos = listaCompras ? descargas.filter((recurso) => recurso.id !== listaCompras.id) : descargas
  const semana = avanceSemana(vigente?.fechaInicio, vigente?.fechaFin)
  const primerNombre = paciente?.nombre.split(' ')[0] ?? ''

  useEffect(() => {
    let active = true
    if (!vigenteId) { setHasWeeklyCookbook(false); return }
    void getWeeklyCookbook(vigenteId).then((result) => { if (active) setHasWeeklyCookbook(result.ok) })
    return () => { active = false }
  }, [vigenteId])

  return (
    <main className="mx-auto w-full max-w-[500px] pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] sm:pb-28 sm:pt-8">
      <header className="mb-5 px-5 sm:px-6">
        <p className="kicker mb-1">NutriPlan · Nutricionista Joel Flores</p>
        <p className="font-reading text-base italic text-muted">Esta semana, paso a paso{primerNombre ? `, ${primerNombre}` : ''}.</p>
      </header>

      {cargandoDatos ? <HomeSkeleton /> : (
        <>
          <section className="px-5 sm:px-6">
            {vigente ? (
              <>
                <Link
                  to={`/plan/${vigente.id}`}
                  className="group relative block min-h-[292px] overflow-hidden rounded-card bg-gradient-to-br from-verde to-[#1e3547] p-6 text-crema shadow-cover transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <Sprout size={250} strokeWidth={0.7} className="pointer-events-none absolute -bottom-16 -right-12 text-crema opacity-[0.1]" />
                  <div className="relative flex h-full min-h-[244px] flex-col justify-between">
                    <div>
                      <p className="kicker !text-[10px] !text-crema/70">{hasWeeklyCookbook ? 'Recetario interactivo' : (vigente.numeroSemana ? `Semana ${vigente.numeroSemana}` : 'Plan nutricional')} · {semana ? `día ${semana.transcurridos}` : 'vigente'}</p>
                      <h1 className="mt-5 max-w-[270px] font-display text-[34px] font-semibold leading-[1.02] text-crema sm:text-[38px]">{hasWeeklyCookbook ? `Recetas de ${vigente.titulo}` : vigente.titulo}</h1>
                      {vigente.fechaInicio && vigente.fechaFin && <p className="mt-3 font-sans text-xs font-semibold text-crema/70">Periodo activo: {fechaCorta(vigente.fechaInicio)} — {fechaCorta(vigente.fechaFin)}</p>}
                    </div>
                    <div>
                      <div className="flex items-end gap-5 border-b border-crema/20 pb-4">
                        {vigente.kcalObjetivo ? <div><p className="font-display text-[26px] leading-none">{vigente.kcalObjetivo}</p><p className="kicker mt-1 !text-[8px] !text-crema/60">kcal por día</p></div> : null}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 font-sans text-xs font-semibold text-crema/80">
                          {vigente.proteinasG ? <span>P·{vigente.proteinasG}g</span> : null}
                          {vigente.carbohidratosG ? <span>C·{vigente.carbohidratosG}g</span> : null}
                          {vigente.grasasG ? <span>G·{vigente.grasasG}g</span> : null}
                        </div>
                      </div>
                      <span className="mt-4 inline-flex items-center gap-2 rounded-control bg-crema px-4 py-3 font-sans text-sm font-semibold text-verde transition-colors group-hover:bg-white">{hasWeeklyCookbook ? 'Abrir recetario' : 'Ver plan'} <ArrowRight size={16} /></span>
                    </div>
                  </div>
                </Link>

                <section className="mt-8">
                  <div className="mb-3 flex items-baseline justify-between border-b border-linea pb-3">
                    <h2 className="font-display text-[25px] font-semibold text-tinta">Tu semana</h2>
                    <span className="font-sans text-xs text-muted">{semana ? `${semana.transcurridos} de ${semana.total} días` : 'En curso'}</span>
                  </div>
                  <Link to="/seguimiento" className="block rounded-control py-2 transition-colors hover:bg-papel/60">
                    <div className="flex items-center justify-between font-sans text-sm text-tinta"><span>Registro de hoy</span><span className="font-semibold text-verde">Continuar</span></div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-linea"><div className="h-full rounded-full bg-verde" style={{ width: `${semana?.porcentaje ?? 28}%` }} /></div>
                  </Link>
                </section>

                <section className="mt-9">
                  <div className="mb-4 flex items-baseline justify-between"><h2 className="font-display text-[25px] font-semibold text-tinta">Para acompañarte</h2><Link to="/educacion" className="font-sans text-xs font-medium text-muted hover:text-verde">Ver más</Link></div>
                  <div className="grid grid-cols-2 gap-3">
                    {listaCompras ? (
                      <RecursoRapido recurso={listaCompras} className="min-h-32 rounded-card-sm border border-linea bg-[#d8e5ea] p-4 shadow-soft transition-transform hover:-translate-y-0.5" />
                    ) : (
                      <Link to="/calculadora-alimentos" className="min-h-32 rounded-card-sm border border-linea bg-[#d8e5ea] p-4 shadow-soft transition-transform hover:-translate-y-0.5"><ClipboardList size={22} className="text-verde" /><p className="mt-6 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-verde">En tu cocina</p><p className="mt-2 font-display text-lg font-semibold text-tinta">Crea tu menú</p></Link>
                    )}
                    <Link to="/rutina" className="min-h-32 rounded-card-sm border border-linea bg-papel p-4 shadow-soft transition-transform hover:-translate-y-0.5">
                      <Dumbbell size={22} className="text-verde" />
                      <p className="mt-6 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-verde">Movimiento</p>
                      <p className="mt-2 font-display text-lg font-semibold text-tinta">Tu semana activa</p>
                    </Link>
                  </div>
                </section>

                {otrosArchivos.length > 0 && (
                  <section id="descargas-plan" className="mt-9 scroll-mt-24">
                    <div className="mb-3 flex items-baseline justify-between"><h2 className="font-display text-[23px] font-semibold text-tinta">Tus archivos</h2><span className="font-sans text-xs text-muted">Disponibles para ti</span></div>
                    <DescargasPlan recursos={otrosArchivos} />
                  </section>
                )}
              </>
            ) : (
              <Card padding="lg" className="flex flex-col items-center py-12 text-center">
                <BookOpen size={26} className="mb-3 text-sage" strokeWidth={1.5} />
                <p className="mb-1 font-display text-xl font-semibold text-tinta">Aún no tienes un plan vigente</p>
                <p className="max-w-[270px] font-sans text-sm text-muted">Tu nutricionista te asignará uno pronto. Mientras tanto, puedes explorar las herramientas disponibles.</p>
              </Card>
            )}
          </section>

          {anteriores.length > 0 && <Carousel title="Planes anteriores">{anteriores.map((p) => <Link key={p.id} to={`/plan/${p.id}`} className="shrink-0"><PlanCover titulo={p.titulo} vigente={false} size="sm" /></Link>)}</Carousel>}

          <section className="mt-9 px-5 sm:px-6">
            <div className="mb-4 flex items-baseline justify-between"><h2 className="font-display text-[25px] font-semibold text-tinta">Explora</h2><span className="font-sans text-xs text-muted">Herramientas gratuitas</span></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link to="/calculadora-clinica"><Card interactive padding="sm" className="h-full"><Calculator className="mb-3 text-verde" size={21} /><p className="font-display text-base font-semibold text-tinta">Calculadora clínica</p><p className="mt-1 font-sans text-xs text-muted">Descubrí tu peso ideal y cuántas calorías necesitás</p></Card></Link>
              <Link to="/calculadora-alimentos"><Card interactive padding="sm" className="h-full"><Salad className="mb-3 text-verde" size={21} /><p className="font-display text-base font-semibold text-tinta">Planifica tus comidas</p><p className="mt-1 font-sans text-xs text-muted">Sabé exactamente qué estás comiendo cada día</p></Card></Link>
              <Link to="/educacion"><Card interactive padding="sm" className="h-full"><Brain className="mb-3 text-verde" size={21} /><p className="font-display text-base font-semibold text-tinta">Educación nutricional</p><p className="mt-1 font-sans text-xs text-muted">Entiende cómo funciona tu cuerpo para siempre</p></Card></Link>
            </div>
          </section>

          <section className="mt-9 px-5 sm:px-6">
            <div className="mb-4 flex items-baseline justify-between"><h2 className="font-display text-[25px] font-semibold text-tinta">Recetas</h2><Link to="/recetas" className="font-sans text-xs font-medium text-muted hover:text-verde">Explorar todas</Link></div>
            {recetasLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-card" />
                ))}
              </div>
            ) : recetas.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {recetas.slice(0, 4).map((receta) => (
                  <TarjetaReceta key={receta.id} receta={receta} />
                ))}
              </div>
            ) : (
              <Card padding="sm" className="py-6 text-center"><p className="font-sans text-sm text-muted">No hay recetas disponibles</p></Card>
            )}
          </section>

          <section className="mt-9 px-5 sm:px-6"><p className="mb-3 font-display text-[25px] font-semibold text-tinta">Tu progreso</p><ProgresoPeso paciente={paciente} seguimiento={seguimiento} /></section>
        </>
      )}
    </main>
  )
}

function HomeSkeleton() {
  return <div className="px-5 sm:px-6"><Skeleton className="h-[292px] w-full rounded-card" /><Skeleton className="mt-8 h-24 w-full rounded-card" /><div className="mt-8 grid grid-cols-2 gap-3"><Skeleton className="h-32 rounded-card" /><Skeleton className="h-32 rounded-card" /></div></div>
}
