import webpush from 'web-push'

type StoredSubscription = { endpoint: string; p256dh: string; auth: string }

function config() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:soporte@nutriplan.pe'
  if (!publicKey || !privateKey) throw new Error('PUSH_NO_CONFIGURADO')
  webpush.setVapidDetails(subject, publicKey, privateKey)
  return { publicKey }
}

async function scriptRequest(action: string, payload: Record<string, unknown>) {
  const scriptUrl = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
  const secret = process.env.ADMIN_API_SECRET || process.env.ADMIN_PASSWORD
  if (!scriptUrl || !secret) throw new Error('BACKEND_NO_CONFIGURADO')
  const response = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, admin_password: secret, ...payload }),
  })
  if (!response.ok) throw new Error('SHEET_NO_DISPONIBLE')
  return response.json() as Promise<{ ok?: boolean; suscripciones?: StoredSubscription[] }>
}

export async function expiringPlans() {
  const result = await scriptRequest('push_planes_por_vencer', {}) as { ok?: boolean; recordatorios?: Array<{ plan_id: string; paciente_id: string; titulo: string; fecha_fin: string; dias: number }> }
  return result.recordatorios || []
}

export async function markReminder(planId: string, days: number) {
  await scriptRequest('push_marcar_recordatorio', { plan_id: planId, dias: days })
}

export function vapidPublicKey() { return config().publicKey }

export async function sendPatientPush(pacienteId: string, notification: Record<string, string>) {
  config()
  const result = await scriptRequest('push_suscripciones_paciente', { paciente_id: pacienteId })
  const subscriptions = result.suscripciones || []
  const invalid: string[] = []
  let sent = 0
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify(notification), { TTL: 60 * 60 * 24 })
      sent += 1
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) invalid.push(subscription.endpoint)
    }
  }))
  if (invalid.length) await scriptRequest('push_eliminar_endpoints', { endpoints: invalid }).catch(() => undefined)
  return { sent, subscriptions: subscriptions.length }
}
