import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  getPlanes as fetchPlanes,
  getRecursos as fetchRecursos,
  getSeguimiento as fetchSeguimiento,
  login as loginRequest,
  logout as logoutSesion,
  restoreSession,
  type CodigoError,
  type Paciente,
  type Plan,
  type Recurso,
  type Seguimiento,
} from '../services/dataService'
import { AuthContext, type AuthStatus } from './useAuth'
import { clearCachedWeeklyCookbooks, getWeeklyCookbook } from '../services/weeklyCookbookService'

/**
 * Estado de sesión y caché en memoria de los datos de la paciente.
 *
 * Cada llamada a Apps Script tarda lo suyo, así que los datos se guardan aquí
 * y las pantallas los leen de inmediato. Antes, salir del plan y volver al
 * Home disparaba tres consultas y dejaba la pantalla en esqueleto hasta que
 * respondían, aunque la información ya estuviera cargada.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('cargando')
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [planes, setPlanes] = useState<Plan[]>([])
  const [seguimiento, setSeguimiento] = useState<Seguimiento[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [cargandoDatos, setCargandoDatos] = useState(true)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<CodigoError | null>(null)

  // Evita que dos pantallas montadas a la vez pidan lo mismo en paralelo.
  const refrescoEnCurso = useRef<Promise<void> | null>(null)

  function precargarRecetario(plans: Plan[]) {
    const vigente = plans.find((plan) => plan.estado === 'VIGENTE')
    if (!vigente) return
    // La paciente ve Home de inmediato mientras su recetario se prepara en
    // segundo plano. Al abrirlo, normalmente ya estará en la caché local.
    window.setTimeout(() => { void getWeeklyCookbook(vigente.id) }, 400)
  }

  useEffect(() => {
    const codigoGuardado = restoreSession()
    if (!codigoGuardado) {
      setStatus('visitante')
      setCargandoDatos(false)
      return
    }
    // Revalida en el servidor: si mientras tanto la paciente fue
    // suspendida/revocada, la sesión se cierra sola.
    loginRequest(codigoGuardado).then((resultado) => {
      if (resultado.ok) {
        aplicarSesion(resultado.data.paciente, resultado.data.planes, resultado.data.seguimiento)
        setStatus('paciente')
        precargarRecetario(resultado.data.planes)
        // Los documentos descargables no vienen en el login: se piden una vez,
        // sin bloquear la pantalla.
        void fetchRecursos().then((r) => {
          if (r.ok) setRecursos(r.data)
        })
      } else {
        logoutSesion()
        setStatus('visitante')
      }
      setCargandoDatos(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function aplicarSesion(p: Paciente, pl: Plan[], sg: Seguimiento[]) {
    setPaciente(p)
    setPlanes(pl)
    setSeguimiento(sg)
  }

  async function login(codigo: string): Promise<boolean> {
    setIsLoggingIn(true)
    setLoginError(null)
    const resultado = await loginRequest(codigo)
    setIsLoggingIn(false)

    if (!resultado.ok) {
      setLoginError(resultado.error)
      return false
    }

    aplicarSesion(resultado.data.paciente, resultado.data.planes, resultado.data.seguimiento)
    setStatus('paciente')
    precargarRecetario(resultado.data.planes)
    setCargandoDatos(false)
    void fetchRecursos().then((r) => {
      if (r.ok) setRecursos(r.data)
    })
    return true
  }

  function logout() {
    logoutSesion()
    clearCachedWeeklyCookbooks()
    setPaciente(null)
    setPlanes([])
    setSeguimiento([])
    setRecursos([])
    setStatus('visitante')
    setCargandoDatos(false)
  }

  /**
   * Vuelve a pedir planes, seguimiento y recursos. No bloquea: las pantallas
   * siguen mostrando lo que ya tenían y los datos se sustituyen al llegar.
   */
  const refrescarDatos = useCallback(async () => {
    if (refrescoEnCurso.current) return refrescoEnCurso.current

    const tarea = (async () => {
      const [rPlanes, rSeguimiento, rRecursos] = await Promise.all([
        fetchPlanes(),
        fetchSeguimiento(),
        fetchRecursos(),
      ])
      if (rPlanes.ok) setPlanes(rPlanes.data)
      if (rSeguimiento.ok) setSeguimiento(rSeguimiento.data)
      if (rRecursos.ok) setRecursos(rRecursos.data)
    })().finally(() => {
      refrescoEnCurso.current = null
    })

    refrescoEnCurso.current = tarea
    return tarea
  }, [])

  return (
    <AuthContext.Provider
      value={{
        status,
        paciente,
        planes,
        seguimiento,
        recursos,
        cargandoDatos,
        isLoggingIn,
        loginError,
        login,
        logout,
        refrescarDatos,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
