import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Brain,
  BookOpen,
  CalendarCheck,
  Calculator,
  Check,
  ChartNoAxesCombined,
  Dumbbell,
  KeyRound,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react'
import { InstallAppButton } from '../../components/pwa/InstallAppButton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../context/useAuth'
import { getEducacion, isMockMode, type CodigoError } from '../../services/dataService'
import { obtenerRecetas } from '../../services/supabaseRecetas'

const MENSAJES_ERROR: Record<CodigoError, string> = {
  ACCESO_DENEGADO: 'Código inválido o inactivo. Verifica con tu nutricionista.',
  SUSCRIPCION_EXPIRADA: 'Tu suscripción mensual venció. Renueva el acceso para continuar.',
  ERROR_RED: 'No pudimos conectar. Intenta de nuevo.',
  ERROR_SERVIDOR: 'Ocurrió un error. Intenta de nuevo en unos minutos.',
  NO_AUTENTICADO: 'Ingresa tu código de acceso.',
}

const WHATSAPP_LINK = import.meta.env.VITE_WHATSAPP_LINK || 'https://wa.me/51999999999'

function enlaceWhatsApp(mensaje: string) {
  const separador = WHATSAPP_LINK.includes('?') ? '&' : '?'
  return `${WHATSAPP_LINK}${separador}text=${encodeURIComponent(mensaje)}`
}

const RECURSOS_PUBLICOS = [
  {
    icon: Calculator,
    titulo: 'Calculadoras',
    texto: 'Conoce tus necesidades según tu cuerpo, tu ritmo y tu objetivo.',
    action: 'Calcular ahora',
    to: '/calculadora-clinica',
    color: 'bg-[#d8e5ea]',
  },
  {
    icon: BookOpen,
    titulo: 'Recetas',
    texto: 'Comidas posibles, prácticas y pensadas para la vida real.',
    action: 'Ver recetas',
    to: '/recetas',
    color: 'bg-[#ead7a5]',
  },
  {
    icon: Dumbbell,
    titulo: 'Rutinas',
    texto: 'Encuentra movimiento que se ajuste a tu nivel y a tu tiempo.',
    action: 'Crear rutina',
    to: '/generador-rutinas',
    color: 'bg-[#e5b3a4]',
  },
  {
    icon: Brain,
    titulo: 'Educación',
    texto: 'Aprende a tomar decisiones con más claridad, un concepto a la vez.',
    action: 'Explorar',
    to: '/educacion',
    color: 'bg-[#b8cfdd]',
  },
]

export function Entrada() {
  const [codigo, setCodigo] = useState('')
  const { status, isLoggingIn, loginError, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (status === 'paciente') navigate('/home', { replace: true })
  }, [status, navigate])

  useEffect(() => {
    // Adelanta el catÃ¡logo mientras la persona recorre la portada. La misma
    // promesa se reutiliza si entra a Recetas antes de que termine.
    void obtenerRecetas()
    void getEducacion()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await login(codigo.trim())
  }

  const mensajeConsulta = enlaceWhatsApp('Hola, quisiera agendar mi primera consulta nutricional.')

  return (
    <main className="overflow-hidden bg-[#5d91b5] pb-20 sm:pb-0">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:repeating-radial-gradient(circle_at_30%_20%,transparent_0_2px,#1e3547_3px_4px)] [background-size:13px_15px]" />

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-6 border-b border-[#1e3547]/15 px-6 pb-5 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] sm:px-8">
          <img
            src="/brand/nutriplan-logo-horizontal.svg"
            alt="NutriPlan · Nutricionista Joel Flores"
            className="h-16 w-auto sm:h-14 lg:h-12"
          />
          <nav className="hidden items-center gap-5 font-sans text-xs font-semibold text-[#1e3547] lg:flex">
            <button onClick={() => navigate('/servicios')}>Servicios</button>
            <button onClick={() => navigate('/recetas')}>Recetas</button>
            <button onClick={() => navigate('/educacion')}>Educación</button>
            <button onClick={() => navigate('/generador-rutinas')}>Rutinas</button>
            <button onClick={() => navigate('/calculadora-clinica')}>Calculadoras</button>
            <a href="#acceso" className="rounded-control border border-[#1e3547] px-3 py-2">Ingresar código</a>
            <a href={mensajeConsulta} target="_blank" rel="noreferrer" className="rounded-control bg-[#d95c06] px-4 py-2 text-[#fff8ef]">Agendar</a>
          </nav>
        </header>

        <div className="relative z-[1] mx-auto grid min-h-[620px] max-w-6xl lg:grid-cols-[1.04fr_.96fr]">
          <div className="flex flex-col justify-center px-6 py-16 text-[#fffaf1] sm:px-8 lg:py-20">
            <p className="mb-5 font-sans text-[10px] font-bold uppercase tracking-[.2em] text-[#f1d083]">Nutrición para la vida real</p>
            <h1 className="max-w-3xl font-display text-[48px] font-semibold leading-[.94] tracking-[-.05em] sm:text-[67px] lg:text-[76px]">
              Comer bien también puede sentirse increíble.
            </h1>
            <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-[#e9f1f4] sm:text-lg">
              Recetas, herramientas y orientación para construir una alimentación que funcione contigo, no contra ti.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => navigate('/recetas')} className="inline-flex h-13 items-center gap-2 rounded-control bg-[#dfb44e] px-5 font-sans text-sm font-semibold text-[#1e3547]">
                Explorar recetas <ArrowRight size={17} />
              </button>
              <button onClick={() => navigate('/calculadora-clinica')} className="inline-flex h-13 items-center gap-2 rounded-control bg-[#1e3547] px-5 font-sans text-sm font-semibold text-[#fff7e7]">
                Usar calculadoras
              </button>
              <button onClick={() => navigate('/servicios')} className="inline-flex h-13 items-center gap-2 rounded-control border border-[#fff7e7]/65 px-5 font-sans text-sm font-semibold text-[#fff7e7] transition-colors hover:bg-[#fff7e7]/10">
                Ver mis servicios <ArrowRight size={17} />
              </button>
            </div>
          </div>

          <div className="relative flex min-h-[470px] items-center justify-center bg-[#dfb44e] px-8 py-14 [clip-path:polygon(8%_0,100%_0,100%_100%,3%_100%,7%_91%,3%_82%,9%_72%,5%_62%,10%_51%,5%_40%,9%_28%,4%_17%)] max-lg:[clip-path:polygon(0_8%,10%_4%,20%_9%,31%_3%,42%_8%,54%_4%,66%_9%,78%_3%,89%_8%,100%_4%,100%_100%,0_100%)]">
            <button
              type="button"
              onClick={() => navigate('/recetas/ensaladas-mob-14-ensalada-de-tofu-quinua-y-brocoli-con-salsa-ligera-de-mani')}
              className="group relative flex aspect-[4/5] w-full max-w-[350px] rotate-[2deg] flex-col justify-end overflow-hidden rounded-card text-left text-[#fff7e7] shadow-[0_24px_50px_rgba(30,53,71,.25)] transition-transform hover:rotate-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1e3547]"
              aria-label="Abrir receta: Ensalada de tofu, quinua y brócoli con salsa ligera de maní"
            >
              <img
                src="/images/quinua-tibia-con-verduras.png"
                alt="Bowl de quinua con brócoli y verduras frescas"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#1e3547]/10 via-transparent to-[#1e3547]/95" />
              <span className="absolute left-5 top-5 rounded-pill bg-[#d95c06] px-3 py-1.5 font-sans text-[9px] font-bold uppercase tracking-[.12em]">Receta abierta</span>
              <div className="relative p-6">
                <h2 className="font-display text-[27px] font-semibold leading-[.95]">Ensalada de tofu, quinua y brócoli</h2>
                <p className="mt-2 font-sans text-sm text-[#d8e8f0]">Ver receta completa <ArrowRight className="ml-1 inline-block" size={15} /></p>
              </div>
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 lg:grid-cols-[1fr_.65fr] lg:items-end">
            <div>
              <p className="font-sans text-[10px] font-bold uppercase tracking-[.2em] text-[#8a6829]">Abierto para todos</p>
              <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[1.02] text-[#1e3547] sm:text-5xl">Empieza con lo que necesitas hoy.</h2>
            </div>
            <p className="font-sans text-[15px] leading-relaxed text-[#596a75]">No necesitas una cuenta para explorar las herramientas y contenidos públicos de NutriPlan.</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RECURSOS_PUBLICOS.map(({ icon: Icon, titulo, texto, action, to, color }) => (
              <button key={titulo} onClick={() => navigate(to)} className={`group flex min-h-60 flex-col rounded-card p-5 text-left text-[#1e3547] transition-transform hover:-translate-y-1 ${color}`}>
                <Icon size={22} strokeWidth={1.7} />
                <div className="mt-auto">
                  <h3 className="font-display text-2xl font-semibold leading-tight">{titulo}</h3>
                  <p className="mt-2 font-sans text-xs leading-relaxed text-[#496174]">{texto}</p>
                  <span className="mt-5 flex items-center justify-between font-sans text-xs font-bold">{action}<ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <article className="bg-[#1e3547] px-6 py-16 text-[#fff7e7] sm:px-10 lg:px-[max(2.5rem,calc((100vw-72rem)/2))]">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[.2em] text-[#dfa08e]">Atención personalizada</p>
          <h2 className="mt-3 max-w-lg font-display text-4xl font-semibold leading-[1.02]">Un plan creado especialmente para ti.</h2>
          <p className="mt-4 max-w-lg font-sans text-[15px] leading-relaxed text-[#b9d4e3]">Consulta con Joel, recibe tu estrategia nutricional y accede a tu espacio privado de seguimiento.</p>
          <div className="mt-6 space-y-3 font-sans text-sm">
            <p className="flex items-center gap-2"><Check size={17} /> Consulta nutricional</p>
            <p className="flex items-center gap-2"><Check size={17} /> Plan personal</p>
            <p className="flex items-center gap-2"><Check size={17} /> Seguimiento profesional</p>
          </div>
          <a href={mensajeConsulta} target="_blank" rel="noreferrer" className="mt-8 inline-flex h-12 items-center gap-2 rounded-control bg-[#d95c06] px-5 font-sans text-sm font-semibold text-[#fff8ef]">Agendar con Joel <CalendarCheck size={17} /></a>
        </article>
      </section>

      <section id="acceso" className="bg-[#f3ece1] px-6 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-4xl gap-9 lg:grid-cols-[1fr_380px] lg:items-center">
          <div>
            <p className="font-sans text-[10px] font-bold uppercase tracking-[.2em] text-[#8a6829]">Acceso unificado</p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-[1.02] text-[#1e3547]">¿Ya tienes un código?</h2>
            <p className="mt-4 font-sans text-[15px] leading-relaxed text-[#596a75]">Usa aquí el código que te entregó tu nutricionista para entrar a tu espacio.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="rounded-card bg-[#1e3547] p-5 shadow-[0_18px_35px_rgba(30,53,71,.14)] sm:p-6">
            <Input
              label="Código de acceso"
              placeholder="Ingresa tu código"
              leftIcon={<KeyRound size={18} />}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              error={loginError ? MENSAJES_ERROR[loginError] : undefined}
              helperText={isMockMode ? 'Modo desarrollo — prueba con nc_DEMO-0001' : undefined}
              autoComplete="off"
              className="border-[#45647d] bg-[#294861] text-[#fff7e7] placeholder:text-[#8eb3c9] focus:border-[#dfb44e] focus:ring-[#dfb44e]/15"
            />
            <Button type="submit" size="lg" className="mt-4 w-full bg-[#dfb44e] text-[#1e3547] hover:bg-[#d4a53a] focus-visible:ring-[#dfb44e]/30" disabled={isLoggingIn || !codigo.trim()}>
              {isLoggingIn ? 'Entrando…' : 'Entrar a mi espacio'}
            </Button>
            <a href={enlaceWhatsApp('Hola, olvidé mi código de acceso a NutriPlan y quisiera recuperarlo.')} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 font-sans text-xs text-[#a9c5d5] hover:text-white">
              <MessageCircle size={14} /> ¿Olvidaste tu código?
            </a>
            <p className="mt-4 flex items-center justify-center gap-2 font-sans text-[11px] text-[#8eb3c9]"><ShieldCheck size={14} /> Acceso personal y privado para pacientes.</p>
          </form>
        </div>
      </section>

      <section className="bg-white px-6 py-14 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div><p className="font-sans text-[10px] font-bold uppercase tracking-[.2em] text-[#8a6829]">El método NutriPlan</p><h2 className="mt-3 font-display text-4xl font-semibold leading-[1.03] text-[#1e3547]">Menos reglas. Más hábitos que permanecen.</h2></div>
          <p className="max-w-2xl font-reading text-xl leading-relaxed text-[#596a75]">No se trata de hacer todo perfecto. Se trata de construir una forma de alimentarte que tenga sentido para ti, tu rutina y tus objetivos.</p>
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-start justify-between gap-5 border-t border-[#d9d2c8] pt-7 sm:flex-row sm:items-center">
          <InstallAppButton />
          <div className="flex flex-wrap items-center gap-4 font-sans text-xs text-[#596a75]"><span className="flex items-center gap-2"><ChartNoAxesCombined size={15} /> NutriPlan · Nutricionista Joel Flores</span><a href="/admin" className="font-semibold text-[#1e3547]">Área profesional</a></div>
        </div>
      </section>
    </main>
  )
}
