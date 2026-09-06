import { useState, useCallback } from 'react'
import { ToastContext, type Toast } from './useToast'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`
    const fullToast: Toast = { ...toast, id, duration: toast.duration ?? 6000 }

    // Los avisos son efímeros: uno nuevo reemplaza al anterior para evitar
    // que varias interacciones rápidas terminen cubriendo toda la pantalla.
    setToasts([fullToast])

    if (fullToast.duration && fullToast.duration > 0) {
      setTimeout(() => removeToast(id), fullToast.duration)
    }
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}
