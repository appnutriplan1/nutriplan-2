import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function yaEstaInstalada() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export function InstallAppButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [mostrarGuiaIOS, setMostrarGuiaIOS] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    setIos(esIOS())
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstallEvent(null)
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (yaEstaInstalada() || (!ios && !installEvent)) return null

  async function instalarAndroid() {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') setInstallEvent(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (ios ? setMostrarGuiaIOS(true) : void instalarAndroid())}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-control border border-linea bg-papel px-5 py-3 font-sans text-sm font-semibold text-verde transition-colors hover:bg-linea/60"
      >
        <Download size={17} />
        Instalar NutriPlan
      </button>

      {mostrarGuiaIOS && (
        <div className="fixed inset-0 z-[60] flex items-end bg-tinta/45 p-4 sm:items-center sm:justify-center" onClick={() => setMostrarGuiaIOS(false)}>
          <section
            className="w-full max-w-sm rounded-card bg-crema p-6 shadow-soft-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="instalar-ios-titulo"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="kicker mb-2">En iPhone</p>
                <h2 id="instalar-ios-titulo" className="font-display text-xl font-semibold text-tinta">Añádela a tu inicio</h2>
              </div>
              <button type="button" onClick={() => setMostrarGuiaIOS(false)} className="text-muted hover:text-tinta" aria-label="Cerrar guía">
                <X size={20} />
              </button>
            </div>
            <ol className="space-y-3 font-sans text-sm text-muted">
              <li className="flex gap-3"><span className="font-semibold text-verde">1.</span><span>Abre esta página con <strong className="text-tinta">Safari</strong>.</span></li>
              <li className="flex gap-3"><span className="font-semibold text-verde">2.</span><span>Pulsa <Share className="inline-block text-verde" size={16} aria-label="Compartir" /> <strong className="text-tinta">Compartir</strong>.</span></li>
              <li className="flex gap-3"><span className="font-semibold text-verde">3.</span><span>Elige <strong className="text-tinta">“Añadir a pantalla de inicio”</strong>.</span></li>
            </ol>
          </section>
        </div>
      )}
    </>
  )
}
