import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Calculator, CircleUser, Home, BookOpen, Salad, TrendingUp, BriefcaseBusiness } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../context/useAuth'

function NavItem({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn('flex flex-col items-center gap-1 py-2 font-sans', isActive ? 'text-verde' : 'text-muted')
      }
    >
      <Icon size={20} strokeWidth={2} />
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  )
}

function NavegacionPublica() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-crema/95 backdrop-blur-sm sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto grid max-w-[520px] grid-cols-5 px-4 pt-1.5">
        <NavItem to="/" icon={Home} label="Inicio" />
        <NavItem to="/servicios" icon={BriefcaseBusiness} label="Servicios" />
        <NavItem to="/recetas" icon={BookOpen} label="Recetas" />
        <NavItem to="/calculadora-clinica" icon={Calculator} label="Clínica" />
        <NavItem to="/calculadora-alimentos" icon={Salad} label="Alimentos" />
      </div>
    </nav>
  )
}

export function BottomNav() {
  const [fabAbierto, setFabAbierto] = useState(false)
  const { planes, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const vigente = planes.find((p) => p.estado === 'VIGENTE')
  const esPlanActivo = location.pathname.startsWith('/plan/')

  function irAMiPlan() {
    setFabAbierto(false)
    navigate(vigente ? `/plan/${vigente.id}` : '/home')
  }

  // Una visitante no debe ver los accesos privados: al tocar Home, Progreso o
  // Perfil parecía que la app se había colgado porque todos llevan al muro.
  if (status !== 'paciente') return <NavegacionPublica />

  return (
    <>
      <AnimatePresence>
        {fabAbierto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFabAbierto(false)}
              className="fixed inset-0 z-40 bg-tinta/30 sm:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="fixed inset-x-6 bottom-[104px] z-50 flex flex-col gap-2 sm:hidden"
            >
              <Link
                to="/calculadora-clinica"
                onClick={() => setFabAbierto(false)}
                className="flex items-center gap-3 rounded-control bg-white px-4 py-3 shadow-soft-lg"
              >
                <Calculator size={18} className="text-verde" />
                <span className="font-sans text-sm font-medium text-tinta">Calculadora clínica</span>
              </Link>
              <Link
                to="/calculadora-alimentos"
                onClick={() => setFabAbierto(false)}
                className="flex items-center gap-3 rounded-control bg-white px-4 py-3 shadow-soft-lg"
              >
                <Salad size={18} className="text-verde" />
                <span className="font-sans text-sm font-medium text-tinta">Calculadora por alimentos</span>
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-crema/95 backdrop-blur-sm sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="relative mx-auto flex max-w-[420px] items-center justify-between px-5 pt-1.5">
          <NavItem to="/home" icon={Home} label="Home" />
          <NavItem to="/seguimiento" icon={TrendingUp} label="Progreso" />

          <div className="w-14 shrink-0" />

          <button
            type="button"
            onClick={irAMiPlan}
            className={cn('flex flex-col items-center gap-1 py-2 font-sans', esPlanActivo ? 'text-verde' : 'text-muted')}
          >
            <BookOpen size={20} />
            <span className="text-[10px] font-medium">Mi Plan</span>
          </button>
          <NavItem to="/perfil" icon={CircleUser} label="Perfil" />

          <button
            type="button"
            onClick={() => setFabAbierto((v) => !v)}
            aria-label="Abrir calculadoras"
            aria-expanded={fabAbierto}
            className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-coral text-white transition-transform active:scale-95"
            style={{ boxShadow: 'var(--shadow-cover)' }}
          >
            <Calculator size={22} />
          </button>
        </div>
      </nav>
    </>
  )
}
