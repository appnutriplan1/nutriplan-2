import { useNavigate } from 'react-router-dom'
import { LogOut, MessageCircle } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../context/useAuth'
import { isMockMode } from '../../services/dataService'
import { calcularEdad } from '../../lib/edad'
import { formatearFecha } from '../../lib/fecha'
import { ControlCard } from '../seguimiento/ControlCard'
import { PushNotificationsCard } from '../../components/pwa/PushNotificationsCard'

const WHATSAPP_LINK = import.meta.env.VITE_WHATSAPP_LINK || 'https://wa.me/51999999999'

export function Perfil() {
  const { paciente, logout } = useAuth()
  const navigate = useNavigate()

  const iniciales = paciente?.nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase()

  const edad = paciente ? calcularEdad(paciente.fechaNacimiento) : null

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="mx-auto max-w-[640px] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))] sm:px-6 sm:pb-28 sm:pt-10">
      <p className="kicker mb-3">Perfil</p>
      <h1 className="mb-8 font-display text-[32px] font-semibold leading-tight text-tinta sm:text-[40px]">
        Tu perfil
      </h1>

      <Card padding="lg" className="mb-6">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-verde font-display text-lg font-semibold text-crema">
            {iniciales}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-tinta">{paciente?.nombre}</p>
            <p className="truncate font-sans text-sm text-muted">{paciente?.correo}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-linea pt-5 font-sans text-sm sm:grid-cols-4">
          <div>
            <p className="mb-0.5 text-xs text-muted">Objetivo</p>
            <p className="font-semibold text-tinta">{paciente?.objetivo}</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-muted">Talla</p>
            <p className="font-semibold text-tinta">{paciente?.tallaCm} cm</p>
          </div>
          <div>
            <p className="mb-0.5 text-xs text-muted">Edad</p>
            <p className="font-semibold text-tinta">{edad} años</p>
          </div>
          {paciente?.inicioPlan && (
            <div>
              <p className="mb-0.5 text-xs text-muted">Inicio del plan</p>
              <p className="font-semibold text-tinta">{formatearFecha(paciente.inicioPlan)}</p>
            </div>
          )}
        </div>
      </Card>

      <PushNotificationsCard />

      {/* Línea base: con lo que empezó el tratamiento. La evolución posterior
          está en Seguimiento, para no repetir los mismos datos en dos sitios. */}
      {paciente && paciente.basal.pesoKg > 0 && (
        <section className="mb-6">
          <p className="mb-3 font-display text-lg font-semibold text-verde">Al empezar tu plan</p>
          <ControlCard
            fecha={paciente.inicioPlan || paciente.fechaActualizacion}
            mediciones={paciente.basal}
            tallaCm={paciente.tallaCm}
          />
        </section>
      )}

      <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">
        <Card interactive padding="md" className="mb-6 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-papel">
            <MessageCircle size={20} className="text-verde" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-tinta">Escríbele a tu nutricionista</p>
            <p className="font-sans text-xs text-muted">Dudas, cambios de cita o de plan</p>
          </div>
        </Card>
      </a>

      <Button variant="secondary" size="lg" className="w-full" leftIcon={<LogOut size={18} />} onClick={handleLogout}>
        Cerrar sesión
      </Button>

      {isMockMode && (
        <p className="mt-6 text-center font-sans text-xs text-muted">Modo desarrollo — datos de ejemplo.</p>
      )}
    </div>
  )
}
