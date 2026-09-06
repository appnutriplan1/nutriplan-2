import { lazy, Suspense } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, CalendarCheck } from 'lucide-react'
import { cn } from './lib/cn'
import { useAuth } from './context/useAuth'
import { ToastContainer } from './components/Toast/ToastContainer'
import { Entrada } from './features/entrada/Entrada'
import { RutaPrivada } from './routes/RutaPrivada'
import { BottomNav } from './features/nav/BottomNav'
import { PwaPrompt } from './components/pwa/PwaPrompt'
import { AdminSessionGate } from './routes/AdminSessionGate'

const PlanSemanal = lazy(() => import('./features/plan-semanal/PlanSemanal').then((m) => ({ default: m.PlanSemanal })))
const PlanPdfViewer = lazy(() => import('./features/plan-semanal/PlanPdfViewer').then((m) => ({ default: m.PlanPdfViewer })))
const CalculadoraClinica = lazy(() => import('./features/calculadora-clinica/CalculadoraClinica').then((m) => ({ default: m.CalculadoraClinica })))
const CalculadoraAlimentos = lazy(() => import('./features/calculadora-alimentos/CalculadoraAlimentos').then((m) => ({ default: m.CalculadoraAlimentos })))
const LaboratorioSugerencias = lazy(() => import('./features/calculadora-alimentos/LaboratorioSugerencias').then((m) => ({ default: m.LaboratorioSugerencias })))
const KitchenSink = lazy(() => import('./features/kitchen-sink/KitchenSink').then((m) => ({ default: m.KitchenSink })))
const Home = lazy(() => import('./features/home/Home').then((m) => ({ default: m.Home })))
const Seguimiento = lazy(() => import('./features/seguimiento/Seguimiento').then((m) => ({ default: m.Seguimiento })))
const Perfil = lazy(() => import('./features/perfil/Perfil').then((m) => ({ default: m.Perfil })))
const Cookbooks = lazy(() => import('./features/cookbooks/Cookbooks').then((m) => ({ default: m.Cookbooks })))
const Recetas = lazy(() => import('./features/recetas/Recetas').then((m) => ({ default: m.Recetas })))
const DetalleReceta = lazy(() => import('./features/recetas/DetalleReceta').then((m) => ({ default: m.DetalleReceta })))
const Rutina = lazy(() => import('./features/rutina/Rutina').then((m) => ({ default: m.Rutina })))
const GeneradorRutinas = lazy(() => import('./features/generador-rutinas/GeneradorRutinas').then((m) => ({ default: m.GeneradorRutinas })))
const Educacion = lazy(() => import('./features/educacion/Educacion').then((m) => ({ default: m.Educacion })))
const AdminPanel = lazy(() => import('./features/admin/AdminPanel').then((m) => ({ default: m.AdminPanel })))
const Servicios = lazy(() => import('./features/servicios/Servicios').then((m) => ({ default: m.Servicios })))
const Privacidad = lazy(() => import('./features/privacidad/Privacidad').then((m) => ({ default: m.Privacidad })))
const WeeklyCookbookImporter = lazy(() => import('./features/admin/WeeklyCookbookImporter').then((m) => ({ default: m.WeeklyCookbookImporter })))
const PlanBuilder = lazy(() => import('./features/admin/PlanBuilder').then((m) => ({ default: m.PlanBuilder })))

function VisorFallback() {
  return <div className="fixed inset-0 z-40 bg-crema" />
}

const TABS_PACIENTE = [
  { to: '/calculadora-clinica', label: 'Calculadora clínica', shortLabel: 'Clínica' },
  { to: '/calculadora-alimentos', label: 'Calculadora por alimentos', shortLabel: 'Alimentos' },
  { to: '/generador-rutinas', label: 'Rutinas', shortLabel: 'Rutinas' },
  { to: '/recetas', label: 'Recetas', shortLabel: 'Recetas' },
  { to: '/educacion', label: 'Educación', shortLabel: 'Educación' },
  { to: '/home', label: 'Home', shortLabel: 'Home' },
  { to: '/seguimiento', label: 'Seguimiento', shortLabel: 'Progreso' },
  { to: '/perfil', label: 'Perfil', shortLabel: 'Perfil' },
]

const TABS_PUBLICOS = [
  { to: '/servicios', label: 'Servicios', shortLabel: 'Servicios' },
  { to: '/recetas', label: 'Recetas', shortLabel: 'Recetas' },
  { to: '/educacion', label: 'Educación', shortLabel: 'Educación' },
  { to: '/generador-rutinas', label: 'Rutinas', shortLabel: 'Rutinas' },
  { to: '/calculadora-clinica', label: 'Calculadora clínica', shortLabel: 'Clínica' },
  { to: '/calculadora-alimentos', label: 'Calculadora por alimentos', shortLabel: 'Alimentos' },
]

const WHATSAPP_LINK = import.meta.env.VITE_WHATSAPP_LINK || 'https://wa.me/51999999999'

function enlaceWhatsApp(mensaje: string) {
  const separador = WHATSAPP_LINK.includes('?') ? '&' : '?'
  return `${WHATSAPP_LINK}${separador}text=${encodeURIComponent(mensaje)}`
}

function TopNav() {
  const { status, paciente, logout } = useAuth()
  const navigate = useNavigate()
  const tabs = status === 'paciente' ? TABS_PACIENTE : TABS_PUBLICOS

  return (
    <header className="sticky top-0 z-30 hidden border-b border-linea bg-crema/90 backdrop-blur-sm sm:block">
      <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link to="/" className="flex items-center">
          <img src="/brand/nutriplan-logo-horizontal.svg" alt="NutriPlan · Nutricionista Joel Flores" className="h-10 w-auto" />
        </Link>

        <nav className="flex gap-1 rounded-pill bg-papel p-1">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'rounded-pill px-3 py-1.5 font-sans text-xs font-semibold transition-colors sm:text-sm',
                  isActive ? 'bg-verde text-crema' : 'text-muted hover:text-tinta',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        {status === 'paciente' ? (
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/')
            }}
            className="flex items-center gap-1.5 font-sans text-xs font-semibold text-muted hover:text-coral"
          >
            <LogOut size={14} />
            {paciente?.nombre.split(' ')[0]} · Salir
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <a
              href={enlaceWhatsApp('Hola, quisiera agendar mi primera consulta nutricional.')}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-control bg-coral px-3 py-1.5 font-sans text-xs font-semibold text-white transition-colors hover:bg-coral/90"
            >
              <CalendarCheck size={14} />
              Agendar
            </a>
            <Link to="/" className="font-sans text-xs font-semibold text-verde hover:underline">
              Entrar
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

function BrandFooter() {
  return (
    <footer className="mt-12 hidden bg-verde px-5 py-9 sm:mt-16 sm:block sm:px-8">
      <div className="mx-auto flex max-w-[760px] flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <img src="/brand/nutriplan-logo-white.svg" alt="NutriPlan · Nutricionista Joel Flores" className="h-9 w-auto" />
        <div className="flex items-center gap-5">
          <p className="font-sans text-xs text-white/60">Nutrición personalizada para tu vida real.</p>
          <Link to="/privacidad" className="font-sans text-xs font-semibold text-white/75 transition-colors hover:text-white">Privacidad</Link>
          <Link to="/admin" className="font-sans text-xs font-semibold text-white/75 transition-colors hover:text-white">Área profesional</Link>
        </div>
      </div>
    </footer>
  )
}

function App() {
  const location = useLocation()
  const esVisorInmersivo = location.pathname.startsWith('/plan/')
  const esEntrada = location.pathname === '/'
  const esAdmin = location.pathname.startsWith('/admin')

  return (
    <div className="min-h-svh bg-crema">
      {!esVisorInmersivo && !esAdmin && <TopNav />}
      <Suspense fallback={<div className="mx-auto mt-10 h-64 max-w-6xl rounded-card bg-papel skeleton" aria-label="Cargando pantalla" />}>
      <Routes>
        <Route path="/" element={<Entrada />} />
        <Route path="/mi-plan" element={<Navigate to="/home" replace />} />
        <Route path="/calculadora-clinica" element={<CalculadoraClinica />} />
        <Route path="/calculadora-alimentos" element={<CalculadoraAlimentos />} />
        {import.meta.env.DEV && <Route path="/laboratorio-sugerencias" element={<LaboratorioSugerencias />} />}
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/cookbooks" element={<Cookbooks />} />
        <Route path="/recetas" element={<Recetas />} />
        <Route path="/recetas/:id" element={<DetalleReceta />} />
        <Route path="/educacion" element={<Educacion />} />
        <Route path="/generador-rutinas" element={<GeneradorRutinas />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/recetarios" element={<AdminSessionGate><WeeklyCookbookImporter /></AdminSessionGate>} />
        <Route path="/admin/crear-plan" element={<AdminSessionGate><PlanBuilder /></AdminSessionGate>} />
        <Route path="/admin/rutinas" element={<AdminSessionGate><GeneradorRutinas /></AdminSessionGate>} />
        <Route path="/rutina" element={<RutaPrivada><Rutina /></RutaPrivada>} />
        <Route
          path="/home"
          element={
            <RutaPrivada>
              <Home />
            </RutaPrivada>
          }
        />
        <Route
          path="/plan/:planId"
          element={
            <RutaPrivada>
              <Suspense fallback={<VisorFallback />}>
                <PlanSemanal />
              </Suspense>
            </RutaPrivada>
          }
        />
        <Route
          path="/plan/:planId/documento"
          element={
            <RutaPrivada>
              <Suspense fallback={<VisorFallback />}>
                <PlanPdfViewer />
              </Suspense>
            </RutaPrivada>
          }
        />
        <Route
          path="/seguimiento"
          element={
            <RutaPrivada>
              <Seguimiento />
            </RutaPrivada>
          }
        />
        <Route
          path="/perfil"
          element={
            <RutaPrivada>
              <Perfil />
            </RutaPrivada>
          }
        />
        <Route path="/kitchen-sink" element={<KitchenSink />} />
      </Routes>
      </Suspense>
      {!esVisorInmersivo && !esEntrada && !esAdmin && <BrandFooter />}
      {!esVisorInmersivo && !esEntrada && !esAdmin && <BottomNav />}
      <PwaPrompt />
      <ToastContainer />
    </div>
  )
}

export default App
