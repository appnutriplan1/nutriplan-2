import { createContext, useContext } from 'react'
import type { CodigoError, Paciente, Plan, Recurso, Seguimiento } from '../services/dataService'

export type AuthStatus = 'cargando' | 'visitante' | 'paciente'

export interface AuthContextValue {
  status: AuthStatus
  paciente: Paciente | null
  planes: Plan[]
  seguimiento: Seguimiento[]
  recursos: Recurso[]
  /** true mientras no se haya recibido ninguna respuesta todavía. Las
   *  pantallas solo muestran esqueleto en ese caso: si ya hay datos en
   *  memoria se pintan de inmediato y el refresco ocurre por detrás. */
  cargandoDatos: boolean
  isLoggingIn: boolean
  loginError: CodigoError | null
  login: (codigo: string) => Promise<boolean>
  logout: () => void
  refrescarDatos: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
