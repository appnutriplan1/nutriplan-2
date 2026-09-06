import type { ReactNode } from 'react'
import { useAuth } from '../context/useAuth'
import { MuroAcceso } from '../features/muro/MuroAcceso'
import { Skeleton } from '../components/ui/Skeleton'

function SkeletonSesion() {
  return (
    <div className="mx-auto max-w-[640px] px-5 pt-10">
      <Skeleton className="mb-3 h-3 w-24 rounded-pill" />
      <Skeleton className="mb-6 h-9 w-2/3 rounded-control" />
      <Skeleton className="h-40 w-full rounded-card" />
    </div>
  )
}

export function RutaPrivada({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'cargando') return <SkeletonSesion />
  if (status === 'visitante') return <MuroAcceso />
  return <>{children}</>
}
