import { useEffect, useRef, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaPrompt() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const [updating, setUpdating] = useState(false)
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration || null
      void registration?.update()
    },
  })

  useEffect(() => {
    const checkForUpdates = () => void registrationRef.current?.update()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdates()
    }
    const interval = window.setInterval(checkForUpdates, 30 * 60 * 1000)
    window.addEventListener('focus', checkForUpdates)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', checkForUpdates)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    // El aviso de disponibilidad offline es informativo: desaparece solo para
    // no tapar acciones importantes ni la navegación inferior en móvil.
    if (!offlineReady || needRefresh) return
    const timeout = window.setTimeout(() => setOfflineReady(false), 5000)
    return () => window.clearTimeout(timeout)
  }, [offlineReady, needRefresh, setOfflineReady])

  const closeStatus = () => {
    setOfflineReady(false)
  }

  const installUpdate = async () => {
    if (updating) return
    setUpdating(true)
    try {
      if ('caches' in window) {
        const names = await window.caches.keys()
        await Promise.all(names.map((name) => window.caches.delete(name)))
      }
      await updateServiceWorker(true)
    } catch {
      setUpdating(false)
      window.location.reload()
    }
  }

  const showStatus = offlineReady || needRefresh
  if (!showStatus) return null

  return (
    <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+8rem)] z-50 mx-auto max-w-md sm:bottom-6">
      <section className="rounded-card border border-linea bg-crema p-3 shadow-soft-lg sm:p-4" aria-live="polite">
        {showStatus ? (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-control bg-verde p-2 text-crema">
              <RefreshCw size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm font-semibold text-tinta">
                {needRefresh ? 'Hay una nueva versión lista.' : 'NutriPlan ya está disponible sin conexión.'}
              </p>
              {needRefresh && <p className="mt-0.5 text-xs text-muted">Se eliminará la caché anterior y se abrirá la versión más reciente.</p>}
              {needRefresh && (
                <button
                  type="button"
                  onClick={() => void installUpdate()}
                  disabled={updating}
                  className="mt-3 rounded-control bg-verde px-3 py-2 text-xs font-semibold text-crema transition-colors hover:bg-verde/90"
                >
                  {updating ? 'Actualizando…' : 'Actualizar ahora'}
                </button>
              )}
            </div>
            {!needRefresh && (
              <button type="button" onClick={closeStatus} className="text-muted hover:text-tinta" aria-label="Cerrar aviso">
                <X size={18} />
              </button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  )
}
