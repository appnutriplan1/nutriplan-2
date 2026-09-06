import { Check, Info, AlertCircle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useToast, type ToastType } from '../../context/useToast'

function getToastConfig(type: ToastType) {
  const configs = {
    success: { icon: Check, bgColor: 'bg-sage', textColor: 'text-white', iconColor: 'text-white' },
    info: { icon: Info, bgColor: 'bg-verde', textColor: 'text-white', iconColor: 'text-white' },
    warning: { icon: AlertCircle, bgColor: 'bg-mandarina', textColor: 'text-white', iconColor: 'text-white' },
    error: { icon: AlertCircle, bgColor: 'bg-coral', textColor: 'text-white', iconColor: 'text-white' },
  }
  return configs[type]
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none flex flex-col gap-3 px-5 pb-20 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96 sm:pb-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const config = getToastConfig(toast.type)
          const Icon = config.icon

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-card ${config.bgColor} ${config.textColor} p-4 shadow-soft-lg`}
            >
              <Icon size={20} className={`mt-0.5 shrink-0 ${config.iconColor}`} />

              <div className="flex-1">
                <p className="font-sans text-sm font-semibold">{toast.title}</p>
                {toast.message && (
                  <p className="mt-1 font-sans text-xs opacity-90">{toast.message}</p>
                )}
                {toast.action && (
                  <a
                    href={toast.action.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block font-sans text-xs font-semibold underline hover:opacity-80 transition-opacity"
                  >
                    {toast.action.label} →
                  </a>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 rounded-full p-1 hover:bg-white/20 transition-colors"
                aria-label="Cerrar notificación"
              >
                <X size={16} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
