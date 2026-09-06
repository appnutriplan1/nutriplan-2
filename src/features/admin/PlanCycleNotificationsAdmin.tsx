import { useState } from 'react'
import type { FormEvent } from 'react'
import { BellRing } from 'lucide-react'

type Patient = { id: string; nombre: string }
type RequestResult = { ok?: boolean; error?: string; enviados?: number; dispositivos?: number }

const input = 'h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde'

export function PlanCycleNotificationsAdmin({ patients, onRequest }: {
  patients: Patient[]
  onRequest: (action: string, payload?: object) => Promise<RequestResult>
}) {
  const [notification, setNotification] = useState({ paciente_id: '', semana: '1', mensaje: '' })
  const [pushMessage, setPushMessage] = useState('')
  const [working, setWorking] = useState(false)

  async function sendNotification(event: FormEvent) {
    event.preventDefault(); setWorking(true); setPushMessage('')
    const week = Number(notification.semana)
    const body = notification.mensaje.trim() || `La dieta de la semana ${week} ya está disponible en NutriPlan.`
    const result = await onRequest('admin_enviar_notificacion', {
      paciente_id: notification.paciente_id,
      titulo: `Tu nutricionista subió la semana ${week}`,
      mensaje: body,
      url: '/home',
    })
    setWorking(false)
    if (!result.ok) return setPushMessage('No pudimos enviar el aviso.')
    setPushMessage(result.enviados ? `Aviso enviado a ${result.enviados} dispositivo${result.enviados === 1 ? '' : 's'}.` : 'La paciente todavía no activó notificaciones en ningún dispositivo.')
  }

  return (
    <section className="mt-7">
      <article className="rounded-card border border-linea bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3"><BellRing className="text-coral" /><div><p className="kicker">Envío opcional</p><h2 className="mt-1 font-display text-2xl font-semibold">Enviar notificación</h2></div></div>
        <p className="mt-3 font-sans text-sm text-muted">Úsalo para reenviar un aviso. Al guardar una dieta semanal, el aviso sale automáticamente.</p>
        <form onSubmit={sendNotification} className="mt-5 grid gap-3 sm:grid-cols-[1fr_110px]">
          <select required value={notification.paciente_id} onChange={(event) => setNotification({ ...notification, paciente_id: event.target.value })} className={input}><option value="">Selecciona paciente</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.nombre}</option>)}</select>
          <input required min="1" type="number" aria-label="Número de semana" value={notification.semana} onChange={(event) => setNotification({ ...notification, semana: event.target.value })} className={input} />
          <textarea maxLength={180} placeholder="Mensaje opcional" value={notification.mensaje} onChange={(event) => setNotification({ ...notification, mensaje: event.target.value })} className="min-h-20 rounded-control border border-linea p-3 font-sans text-sm outline-none focus:border-verde sm:col-span-2" />
          <button disabled={working} className="h-11 rounded-control bg-coral px-4 font-sans text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 sm:col-span-2">{working ? 'Enviando…' : 'Enviar ahora'}</button>
        </form>
        {pushMessage && <p className="mt-3 font-sans text-xs text-muted" role="status">{pushMessage}</p>}
      </article>
    </section>
  )
}
