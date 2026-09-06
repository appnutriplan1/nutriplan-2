import { restoreSession } from './dataService'

export type PushState = 'unsupported' | 'unavailable-ios' | 'default' | 'denied' | 'enabled'

const TIMEOUT_MS = 8_000

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_MS)),
  ])
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (('standalone' in navigator) && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

export function pushState(): PushState {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (ios && !isStandalone()) return 'unavailable-ios'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.permission === 'granted' ? 'default' : 'default'
}

function base64Key(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) return existing
  return withTimeout(navigator.serviceWorker.ready)
}

export async function currentPushState(): Promise<PushState> {
  const state = pushState()
  if (state !== 'default' || Notification.permission !== 'granted') return state
  try {
    const subscription = await withTimeout(registration().then((reg) => reg.pushManager.getSubscription()))
    return subscription ? 'enabled' : 'default'
  } catch {
    return 'default'
  }
}

export async function enablePush(): Promise<void> {
  const code = restoreSession()
  if (!code?.startsWith('nc_')) throw new Error('SESION_INVALIDA')
  if (pushState() === 'unavailable-ios') throw new Error('INSTALL_REQUIRED')
  if (pushState() === 'unsupported') throw new Error('UNSUPPORTED')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('PERMISSION_DENIED')

  const keyResponse = await withTimeout(fetch('/api/push/subscription', { cache: 'no-store' }))
  if (!keyResponse.ok) throw new Error('CONFIGURATION_ERROR')
  const { publicKey } = await keyResponse.json() as { publicKey?: string }
  if (!publicKey) throw new Error('CONFIGURATION_ERROR')

  const reg = await withTimeout(registration())
  const existing = await withTimeout(reg.pushManager.getSubscription())
  const subscription = existing || await withTimeout(reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64Key(publicKey),
  }))

  const response = await withTimeout(fetch('/api/push/subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, subscription: subscription.toJSON() }),
  }))
  if (!response.ok) throw new Error('SAVE_FAILED')
}

export async function disablePush(): Promise<void> {
  const code = restoreSession()
  if (!code || !('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.getRegistration()
  const subscription = await reg?.pushManager.getSubscription()
  if (!subscription) return
  await fetch('/api/push/subscription', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, endpoint: subscription.endpoint }),
  }).catch(() => undefined)
  await subscription.unsubscribe()
}
