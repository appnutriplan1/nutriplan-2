import { useEffect, useState } from 'react'
import { Bell, BellOff, Smartphone } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { currentPushState, disablePush, enablePush, type PushState } from '../../services/pushNotifications'

export function PushNotificationsCard() {
  const [state, setState] = useState<PushState>('default')
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { void currentPushState().then(setState) }, [])

  async function enable() {
    setWorking(true); setMessage('')
    try {
      await enablePush()
      setState('enabled')
      setMessage('Te avisaremos cuando tengas un plan nuevo o esté por vencer.')
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setMessage(code === 'INSTALL_REQUIRED'
        ? 'En iPhone, agrega NutriPlan a tu pantalla de inicio y ábrelo desde allí.'
        : code === 'PERMISSION_DENIED' ? 'Las notificaciones están bloqueadas en la configuración del navegador.'
          : 'No pudimos activarlas ahora. La app puede seguir usándose normalmente.')
      setState(await currentPushState())
    } finally { setWorking(false) }
  }

  async function disable() {
    setWorking(true); setMessage('')
    try { await disablePush(); setState('default'); setMessage('Notificaciones desactivadas en este dispositivo.') }
    finally { setWorking(false) }
  }

  const unavailable = state === 'unsupported' || state === 'unavailable-ios'
  return (
    <Card padding="md" className="mb-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-papel">
          {state === 'enabled' ? <Bell size={20} className="text-verde" /> : unavailable ? <Smartphone size={20} className="text-verde" /> : <BellOff size={20} className="text-verde" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-tinta">Avisos de tu plan</p>
          <p className="mt-1 font-sans text-xs leading-relaxed text-muted">
            {state === 'enabled' ? 'Notificaciones activas en este dispositivo.' : state === 'unavailable-ios' ? 'Instala NutriPlan en tu pantalla de inicio para activar avisos.' : state === 'unsupported' ? 'Este navegador no admite notificaciones push.' : 'Recibe un aviso cuando Joel publique tu plan y antes de su vencimiento.'}
          </p>
          {!unavailable && state !== 'denied' && (
            <Button variant="secondary" size="sm" className="mt-3" disabled={working} onClick={() => void (state === 'enabled' ? disable() : enable())}>
              {working ? 'Procesando…' : state === 'enabled' ? 'Desactivar' : 'Activar notificaciones'}
            </Button>
          )}
          {state === 'denied' && <p className="mt-2 font-sans text-xs text-coral">Permiso bloqueado. Puedes habilitarlo desde la configuración del navegador.</p>}
          {message && <p className="mt-2 font-sans text-xs text-muted" role="status">{message}</p>}
        </div>
      </div>
    </Card>
  )
}
