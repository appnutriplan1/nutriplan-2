import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { isMockMode } from '../services/dataService'
import { Skeleton } from '../components/ui/Skeleton'

export function AdminSessionGate({ children }: { children: ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean | null>(isMockMode ? true : null)

  useEffect(() => {
    if (isMockMode) return
    void fetch('/api/admin/session', { credentials: 'same-origin' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { authenticated?: boolean }
        setAuthorized(response.ok && payload.authenticated === true)
      })
      .catch(() => setAuthorized(false))
  }, [])

  if (authorized === null) return <main className="mx-auto max-w-4xl px-5 py-12"><Skeleton className="h-72 rounded-card" /></main>
  if (!authorized) return <main className="mx-auto max-w-lg px-5 py-16 text-center"><h1 className="font-display text-3xl font-extrabold text-tinta">Acceso administrativo requerido</h1><p className="mt-3 font-reading text-muted">Ingresa primero al panel profesional.</p><Link to="/admin" className="mt-6 inline-flex rounded-control bg-verde px-6 py-3 font-sans text-sm font-bold text-white">Ir al panel</Link></main>
  return <>{children}</>
}
