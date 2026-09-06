import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, BookOpenCheck, Dumbbell, KeyRound, LogOut, NotebookPen, TrendingUp } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { PatientManager } from './PatientManager'
import { PlanCycleNotificationsAdmin } from './PlanCycleNotificationsAdmin'

type SessionStatus = 'loading' | 'guest' | 'authenticated'
type PacienteAdmin = { id: string; nombre: string; correo: string; estado: string; codigo_acceso: string; sexo?: string; fecha_nacimiento?: string; talla_cm?: string | number; objetivo?: string; notas?: string; fecha_actualizacion?: string }
type PlanAdmin = { id: string; paciente_id: string; ciclo_id?: string; numero_semana?: string | number; titulo: string; estado?: string; url_pdf?: string; fecha_inicio?: string; fecha_fin?: string; kcal_objetivo?: string | number; proteinas_g?: string | number; carbohidratos_g?: string | number; grasas_g?: string | number }
type CicloAdmin = { id: string; paciente_id: string; fecha_inicio: string; fecha_fin: string; estado?: string }
type RecursoAdmin = { id: string; plan_id: string; tipo: string; titulo: string; url_pdf: string; orden: number }
type SeguimientoAdmin = { id: string; paciente_id: string; fecha: string; peso_kg?: string | number; cintura_cm?: string | number; talla_cm?: string | number; grasa_pct?: string | number; glucosa?: string | number; hemoglobina?: string | number; notas?: string }
type PanelData = { pacientes: PacienteAdmin[]; planes: PlanAdmin[]; ciclos_plan: CicloAdmin[]; recursos: RecursoAdmin[]; seguimiento: SeguimientoAdmin[]; rutinas?: Array<{ id: string; titulo: string; objetivo?: string; nivel?: string; estado?: string }>; paciente_rutinas?: Array<{ id: string; paciente_id: string; rutina_id: string; fecha_inicio?: string; fecha_fin?: string; estado?: string }>; rutina_ejercicios?: Array<{ id: string; rutina_id: string; ejercicio_id: string; dia?: string }> }
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined
const fileBase64 = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = reject; reader.readAsDataURL(file) })

async function requestSession(method = 'GET', body?: object) {
  try {
    const response = await fetch('/api/admin/session', {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const payload = await response.json().catch(() => ({})) as { authenticated?: boolean; error?: string }
    return { ok: response.ok, ...payload }
  } catch {
    return { ok: false, authenticated: false }
  }
}

async function requestAdmin(action: string, payload?: object) {
  try {
    const response = await fetch('/api/admin/data', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload }) })
    return await response.json().catch(() => ({ ok: false })) as { ok?: boolean; error?: string; pacientes?: PacienteAdmin[]; planes?: PlanAdmin[]; ciclos_plan?: CicloAdmin[]; recursos?: RecursoAdmin[]; seguimiento?: SeguimientoAdmin[]; rutinas?: PanelData['rutinas']; paciente_rutinas?: PanelData['paciente_rutinas']; rutina_ejercicios?: PanelData['rutina_ejercicios']; codigo?: string; token?: string; url?: string; enviados?: number; dispositivos?: number; plan?: PlanAdmin; paciente?: PacienteAdmin }
  } catch {
    return { ok: false, error: 'SIN_CONEXION' }
  }
}

export function AdminPanel() {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [panel, setPanel] = useState<PanelData | null>(null)
  const [panelError, setPanelError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [newPatient, setNewPatient] = useState({ nombre: '', correo: '', sexo: 'F', fecha_nacimiento: '', talla_cm: '', objetivo: '' })
  const [initialWeight, setInitialWeight] = useState('')
  const [newFollowUp, setNewFollowUp] = useState({ paciente_id: '', fecha: new Date().toISOString().slice(0, 10), peso_kg: '', cintura_cm: '', notas: '' })
  const [newPlan, setNewPlan] = useState({ paciente_id: '', numero_semana: '1', titulo: '', url_pdf: '', fecha_inicio: '', fecha_fin: '', kcal_objetivo: '', proteinas_g: '', carbohidratos_g: '', grasas_g: '' })
  const [newResource, setNewResource] = useState({ plan_id: '', titulo: '', tipo: 'COMPRAS', url_pdf: '' })
  const [planFile, setPlanFile] = useState<File | null>(null)
  const [resourceFile, setResourceFile] = useState<File | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    void requestSession().then((result) => setStatus(result.authenticated ? 'authenticated' : 'guest')).catch(() => setStatus('guest'))
  }, [])

  async function loadPanel() {
    setPanelError('')
    const result = await requestAdmin('admin_resumen')
    if (!result.ok || !result.pacientes) {
      setPanel(null)
      setPanelError(result.error === 'NO_AUTORIZADO'
        ? 'La sesión administrativa venció. Cierra sesión y vuelve a ingresar.'
        : 'No pudimos leer pacientes, planes y recursos desde Google Sheets.')
      return
    }
    setPanel({ pacientes: result.pacientes, planes: result.planes || [], ciclos_plan: result.ciclos_plan || [], recursos: result.recursos || [], seguimiento: result.seguimiento || [], rutinas: result.rutinas || [], paciente_rutinas: result.paciente_rutinas || [], rutina_ejercicios: result.rutina_ejercicios || [] })
  }

  useEffect(() => { if (status === 'authenticated') void loadPanel() }, [status])

  async function enter(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setError('')
    try {
      const result = await requestSession('POST', { password })
      if (!result.ok || !result.authenticated) {
        setError(result.error === 'ADMIN_NO_CONFIGURADO' ? 'El acceso aún no está configurado en Vercel.' : 'La contraseña no es correcta.')
        return
      }
      setPassword('')
      setStatus('authenticated')
    } catch {
      setError('No pudimos verificar el acceso. Inténtalo nuevamente.')
    } finally {
      setSending(false)
    }
  }

  async function leave() {
    await requestSession('DELETE')
    setStatus('guest')
    navigate('/')
  }

  async function generateCode(patient: PacienteAdmin) {
    if (busyAction) return
    setBusyAction(`codigo-${patient.id}`); setNotice('Generando código…'); setPanelError('')
    try { const result = await requestAdmin('admin_generar_codigo', { paciente_id: patient.id }); if (!result.ok || !result.codigo) { setPanelError('No pudimos generar el código.'); return }; await navigator.clipboard?.writeText(result.codigo); await loadPanel(); setNotice('Código generado y copiado.') } finally { setBusyAction('') }
  }

  async function createPatient(event: FormEvent) {
    event.preventDefault()
    if (busyAction) return
    setBusyAction('paciente'); setNotice('Creando paciente…'); setPanelError('')
    try {
      const result = await requestAdmin('admin_guardar_paciente', { paciente: newPatient })
      if (!result.ok || !result.paciente?.id) { setPanelError('No pudimos crear el paciente. Revisa los datos.'); return }
      const control = await requestAdmin('admin_guardar_seguimiento', { seguimiento: { paciente_id: result.paciente.id, fecha: new Date().toISOString().slice(0, 10), peso_kg: initialWeight, talla_cm: newPatient.talla_cm, notas: 'Peso inicial' } })
      if (!control.ok) { setPanelError('El paciente se creó, pero no se pudo registrar su peso inicial. Puedes añadirlo desde su ficha.'); await loadPanel(); return }
      setNewPatient({ nombre: '', correo: '', sexo: 'F', fecha_nacimiento: '', talla_cm: '', objetivo: '' }); setInitialWeight(''); await loadPanel(); setNotice('Paciente y peso inicial registrados correctamente.')
    } finally { setBusyAction('') }
  }

  async function createPlan(event: FormEvent) {
    event.preventDefault()
    if (busyAction) return
    setBusyAction('plan'); setNotice('Guardando plan…'); setPanelError('')
    let plan = { ...newPlan }
    if (planFile) { const uploaded = await uploadDocument(planFile, plan.paciente_id, plan.numero_semana); if (!uploaded) { setBusyAction(''); return }; plan = { ...plan, url_pdf: uploaded } }
    if (!plan.url_pdf) { setPanelError('Selecciona el PDF o pega un enlace de Drive.'); setBusyAction(''); return }
    const result = await requestAdmin('admin_guardar_plan', { plan })
    if (!result.ok) { setPanelError('No pudimos crear el plan. Revisa los datos y el enlace del PDF.'); setBusyAction(''); return }
    if (result.plan?.id) {
      sessionStorage.setItem('nutriplan.admin.last-plan-id', result.plan.id)
      setNewResource((current) => ({ ...current, plan_id: result.plan?.id || '' }))
    }
    setNewPlan({ paciente_id: '', numero_semana: '1', titulo: '', url_pdf: '', fecha_inicio: '', fecha_fin: '', kcal_objetivo: '', proteinas_g: '', carbohidratos_g: '', grasas_g: '' }); setPlanFile(null)
    await loadPanel()
    setNotice('Plan guardado correctamente.'); setBusyAction('')
  }

  async function createFollowUp(event: FormEvent) {
    event.preventDefault()
    if (busyAction) return
    setBusyAction('seguimiento'); setNotice('Guardando seguimiento…'); setPanelError('')
    try {
      const result = await requestAdmin('admin_guardar_seguimiento', { seguimiento: newFollowUp })
      if (!result.ok) { setPanelError('No pudimos registrar el seguimiento. Revisa el paciente y los datos.'); return }
      setNewFollowUp({ paciente_id: '', fecha: new Date().toISOString().slice(0, 10), peso_kg: '', cintura_cm: '', notas: '' })
      await loadPanel(); setNotice('Seguimiento registrado. El paciente ya puede verlo en su app.')
    } finally { setBusyAction('') }
  }

  async function createResource(event: FormEvent) {
    event.preventDefault()
    if (busyAction) return
    setBusyAction('recurso'); setNotice('Guardando recurso…'); setPanelError('')
    const defaultTitles: Record<string,string> = { COMPRAS:'Lista de compras', INTERCAMBIOS:'Lista de intercambios', GUIA:'Guía de alimentos', OTRO:'Material adicional' }
    let resource = { ...newResource, titulo: newResource.titulo.trim() || defaultTitles[newResource.tipo] || 'Documento' }; const plan = panel?.planes.find((item)=>item.id===resource.plan_id)
    if (resourceFile && plan) { const uploaded = await uploadDocument(resourceFile, plan.paciente_id, String(plan.numero_semana || 1), plan.id); if (!uploaded) { setBusyAction(''); return }; resource = { ...resource, url_pdf: uploaded } }
    if (!resource.url_pdf) { setPanelError('Selecciona el PDF o pega un enlace de Drive.'); setBusyAction(''); return }
    const result = await requestAdmin('admin_guardar_recurso', { recurso: resource })
    if (!result.ok) { setPanelError('No pudimos guardar el recurso. Revisa sus datos.'); setBusyAction(''); return }
    setNewResource({ plan_id: '', titulo: '', tipo: 'COMPRAS', url_pdf: '' }); setResourceFile(null)
    await loadPanel()
    setNotice('Recurso guardado correctamente.'); setBusyAction('')
  }

  async function uploadDocument(file: File, pacienteId: string, week: string, planId?: string) {
    if (!APPS_SCRIPT_URL || file.type !== 'application/pdf' || file.size > 20 * 1024 * 1024) { setPanelError('El archivo debe ser un PDF de hasta 20 MB.'); return '' }
    setNotice(`Subiendo ${file.name} directamente a Drive…`)
    const token = await requestAdmin('admin_crear_token_subida')
    if (!token.ok || !token.token) { setPanelError('No se pudo autorizar la subida a Drive.'); return '' }
    try {
      await fetch(APPS_SCRIPT_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({ action:'subir_documento', token:token.token, paciente_id:pacienteId, numero_semana:week, plan_id:planId||'', archivo:{ nombre:file.name, mime:file.type, base64:await fileBase64(file) } }) })
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const result = await requestAdmin('admin_estado_subida', { token: token.token }) as { ok?: boolean; pendiente?: boolean; url?: string; error?: string; detalle?: string }
        if (result.url) return result.url
        if (!result.pendiente) { setPanelError(`Drive rechazó el PDF: ${result.detalle || result.error || 'error desconocido'}.`); return '' }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      setPanelError('Drive tardó demasiado en responder. Inténtalo nuevamente.')
      return ''
    } catch { setPanelError('No se pudo enviar el PDF a Drive. Revisa la conexión e inténtalo otra vez.'); return '' }
  }

  if (status === 'loading') {
    return <main className="mx-auto min-h-[70svh] max-w-5xl px-6 py-16 sm:px-8"><div className="skeleton h-72 rounded-card" /></main>
  }

  if (status === 'guest') {
    return (
      <main className="mx-auto flex min-h-[calc(100svh-73px)] max-w-lg items-center px-6 py-12 sm:px-8">
        <section className="w-full rounded-card border border-linea bg-white p-6 shadow-soft sm:p-9">
          <Link to="/" className="inline-flex items-center gap-2 font-sans text-sm font-semibold text-muted hover:text-verde"><ArrowLeft size={16} /> Volver a NutriPlan</Link>
          <p className="kicker mt-10">Área profesional</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-tinta">Panel de nutricionista</h1>
          <p className="mt-4 font-sans text-[15px] leading-relaxed text-muted">Acceso exclusivo para administrar pacientes, planes y contenido de NutriPlan.</p>
          <form onSubmit={enter} className="mt-8">
            <label className="font-sans text-sm font-semibold text-tinta" htmlFor="admin-password">Contraseña de administrador</label>
            <div className="mt-2 flex items-center gap-3 rounded-control border border-linea bg-crema px-3 focus-within:border-verde">
              <KeyRound size={18} className="shrink-0 text-verde" />
              <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full bg-transparent font-sans text-base outline-none" required />
            </div>
            {error && <p className="mt-3 font-sans text-sm text-coral" role="alert">{error}</p>}
            <button type="submit" disabled={sending} className="mt-6 flex h-12 w-full items-center justify-center rounded-control bg-verde font-sans text-sm font-bold text-white transition-colors hover:bg-verde/90 disabled:cursor-wait disabled:opacity-70">{sending ? 'Verificando…' : 'Ingresar al panel'}</button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-svh max-w-5xl px-6 pb-[calc(env(safe-area-inset-bottom,0px)+2.5rem)] pt-10 sm:px-8 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-linea pb-8">
        <div><p className="kicker">Área profesional</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-tinta">Panel de nutricionista</h1><p className="mt-3 max-w-2xl font-sans text-[15px] text-muted">Tu espacio de gestión se está preparando con una conexión privada a tu base de pacientes.</p></div>
        <button type="button" onClick={leave} className="inline-flex items-center gap-2 rounded-control border border-linea bg-white px-4 py-2.5 font-sans text-sm font-semibold text-muted hover:text-coral"><LogOut size={16} /> Cerrar sesión</button>
      </div>
      <section className="mt-8 rounded-card border border-linea bg-papel p-6 shadow-soft">
        <p className="kicker">Nuevo ingreso</p><h2 className="mt-2 font-display text-2xl font-semibold">Crear paciente</h2>
        <form onSubmit={createPatient} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input required placeholder="Nombre completo" value={newPatient.nombre} onChange={(e) => setNewPatient({ ...newPatient, nombre: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde lg:col-span-2" />
          <input type="email" placeholder="Correo" value={newPatient.correo} onChange={(e) => setNewPatient({ ...newPatient, correo: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde" />
          <label className="font-sans text-[11px] font-bold text-muted">Fecha de nacimiento<input required type="date" value={newPatient.fecha_nacimiento} onChange={(e) => setNewPatient({ ...newPatient, fecha_nacimiento: e.target.value })} className="mt-1 h-11 w-full rounded-control border border-linea bg-white px-3 font-sans text-sm text-tinta outline-none focus:border-verde" /></label>
          <input required inputMode="decimal" placeholder="Talla (cm)" value={newPatient.talla_cm} onChange={(e) => setNewPatient({ ...newPatient, talla_cm: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde" />
          <input required inputMode="decimal" placeholder="Peso inicial (kg)" value={initialWeight} onChange={(e) => setInitialWeight(e.target.value)} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde" />
          <button disabled={Boolean(busyAction)} className="h-11 rounded-control bg-verde px-4 font-sans text-sm font-bold text-white hover:bg-verde/90 disabled:cursor-wait disabled:opacity-60">{busyAction==='paciente'?'Creando…':'Crear paciente'}</button>
          <input required placeholder="Objetivo nutricional" value={newPatient.objetivo} onChange={(e) => setNewPatient({ ...newPatient, objetivo: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde sm:col-span-2 lg:col-span-4" />
          <select value={newPatient.sexo} onChange={(e) => setNewPatient({ ...newPatient, sexo: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde"><option value="F">Mujer</option><option value="M">Hombre</option></select>
        </form>
      </section>
      {notice && <p role="status" className="mt-4 rounded-control border border-sage/30 bg-sage/10 px-4 py-3 font-sans text-sm font-bold text-verde">{notice}</p>}
      <div className="mt-7 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <Link to="/admin/crear-plan" className="flex items-center justify-between rounded-card border border-verde/20 bg-white p-6 text-tinta shadow-soft transition-transform hover:-translate-y-0.5">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-coral">Nuevo flujo</p><h2 className="mt-2 font-display text-2xl font-semibold">Crear plan</h2><p className="mt-2 max-w-xl text-sm text-muted">Construye comidas, calcula macros y genera el recetario.</p></div>
          <NotebookPen size={28} className="shrink-0 text-verde" />
        </Link>
        <Link to="/admin/recetarios" className="flex items-center justify-between rounded-card border border-verde/20 bg-[#dcecf2] p-6 text-tinta shadow-soft transition-transform hover:-translate-y-0.5">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-coral">Planes semanales</p><h2 className="mt-2 font-display text-2xl font-semibold">Recetarios</h2><p className="mt-2 max-w-xl text-sm text-muted">Valida, previsualiza y publica el JSON clínico.</p></div>
          <BookOpenCheck size={28} className="shrink-0 text-verde" />
        </Link>
        <Link to="/admin/rutinas" className="flex items-center justify-between rounded-card border border-verde/20 bg-papel p-6 text-tinta shadow-soft transition-transform hover:-translate-y-0.5">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-coral">Movimiento</p><h2 className="mt-2 font-display text-2xl font-semibold">Asignar rutina</h2><p className="mt-2 max-w-xl text-sm text-muted">Construye una rutina y envíala directamente a la paciente.</p></div>
          <Dumbbell size={28} className="shrink-0 text-verde" />
        </Link>
      </div>
      <PlanCycleNotificationsAdmin patients={panel?.pacientes || []} onRequest={requestAdmin} />
      <section id="seguimiento-profesional" className="mt-7 rounded-card border-2 border-sage/35 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sage/15"><TrendingUp className="text-verde" size={24}/></span><div><p className="kicker">Seguimiento profesional</p><h2 className="mt-1 font-display text-2xl font-semibold">Registrar peso y cintura</h2><p className="mt-1 font-sans text-sm text-muted">Se guarda en SEGUIMIENTO y aparece automáticamente en el progreso del paciente.</p></div></div>
        <form onSubmit={createFollowUp} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select required value={newFollowUp.paciente_id} onChange={(e)=>setNewFollowUp({...newFollowUp,paciente_id:e.target.value})} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde lg:col-span-2"><option value="">Selecciona paciente</option>{panel?.pacientes.map((patient)=><option key={patient.id} value={patient.id}>{patient.nombre}</option>)}</select>
          <label className="font-sans text-[11px] font-bold text-muted">Fecha del control<input required type="date" value={newFollowUp.fecha} onChange={(e)=>setNewFollowUp({...newFollowUp,fecha:e.target.value})} className="mt-1 h-11 w-full rounded-control border border-linea bg-white px-3 font-sans text-sm text-tinta outline-none focus:border-verde"/></label>
          <input required inputMode="decimal" placeholder="Peso (kg)" value={newFollowUp.peso_kg} onChange={(e)=>setNewFollowUp({...newFollowUp,peso_kg:e.target.value})} className="h-11 self-end rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde"/>
          <input inputMode="decimal" placeholder="Cintura (cm)" value={newFollowUp.cintura_cm} onChange={(e)=>setNewFollowUp({...newFollowUp,cintura_cm:e.target.value})} className="h-11 self-end rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde"/>
          <textarea placeholder="Notas del control" value={newFollowUp.notas} onChange={(e)=>setNewFollowUp({...newFollowUp,notas:e.target.value})} className="min-h-20 rounded-control border border-linea bg-white p-3 font-sans text-sm outline-none focus:border-verde sm:col-span-2 lg:col-span-4"/>
          <button disabled={Boolean(busyAction)} className="h-11 self-end rounded-control bg-verde px-4 font-sans text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{busyAction==='seguimiento'?'Guardando…':'Guardar seguimiento'}</button>
        </form>
      </section>
      <section className="mt-7 grid gap-7 lg:grid-cols-2">
        <article className="rounded-card border border-linea bg-white p-6 shadow-soft">
          <p className="kicker">Plan nutricional</p><h2 className="mt-2 font-display text-2xl font-semibold">Asignar un plan</h2>
          <form onSubmit={createPlan} className="mt-5 grid gap-3 sm:grid-cols-2">
            <select required value={newPlan.paciente_id} onChange={(e) => setNewPlan({ ...newPlan, paciente_id: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde sm:col-span-2"><option value="">Selecciona paciente</option>{panel?.pacientes.map((patient) => <option key={patient.id} value={patient.id}>{patient.nombre}</option>)}</select>
            <input required placeholder="Título del plan" value={newPlan.titulo} onChange={(e) => setNewPlan({ ...newPlan, titulo: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde sm:col-span-2" />
            <label className="font-sans text-xs font-bold text-muted">Semana<input required min="1" type="number" value={newPlan.numero_semana} onChange={(e)=>setNewPlan({...newPlan,numero_semana:e.target.value})} className="mt-1 h-11 w-full rounded-control border border-linea bg-white px-3"/></label>
            <label className="font-sans text-xs font-bold text-muted">Subir PDF directamente<input type="file" accept="application/pdf,.pdf" onChange={(e)=>setPlanFile(e.target.files?.[0]||null)} className="mt-1 block w-full text-xs"/></label>
            <input type="url" placeholder="O pega el enlace del PDF en Drive" value={newPlan.url_pdf} onChange={(e) => setNewPlan({ ...newPlan, url_pdf: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde sm:col-span-2" />
            <input required type="date" aria-label="Fecha de inicio" value={newPlan.fecha_inicio} onChange={(e) => setNewPlan({ ...newPlan, fecha_inicio: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde" />
            <input type="date" aria-label="Fecha de fin" value={newPlan.fecha_fin} onChange={(e) => setNewPlan({ ...newPlan, fecha_fin: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde" />
            <input inputMode="decimal" placeholder="Kcal" value={newPlan.kcal_objetivo} onChange={(e) => setNewPlan({ ...newPlan, kcal_objetivo: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde" />
            <input inputMode="decimal" placeholder="Proteínas (g)" value={newPlan.proteinas_g} onChange={(e) => setNewPlan({ ...newPlan, proteinas_g: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde" />
            <input inputMode="decimal" placeholder="Carbohidratos (g)" value={newPlan.carbohidratos_g} onChange={(e) => setNewPlan({ ...newPlan, carbohidratos_g: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde" />
            <input inputMode="decimal" placeholder="Grasas (g)" value={newPlan.grasas_g} onChange={(e) => setNewPlan({ ...newPlan, grasas_g: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde" />
            <button disabled={Boolean(busyAction)} className="h-11 rounded-control bg-verde px-4 font-sans text-sm font-bold text-white hover:bg-verde/90 disabled:cursor-wait disabled:opacity-60 sm:col-span-2">{busyAction==='plan'?'Guardando plan…':'Guardar plan'}</button>
          </form>
        </article>
        <article className="rounded-card border border-linea bg-papel p-6 shadow-soft">
          <p className="kicker">Material complementario</p><h2 className="mt-2 font-display text-2xl font-semibold">Agregar recurso</h2>
          <form onSubmit={createResource} className="mt-5 grid gap-3">
            <select required value={newResource.plan_id} onChange={(e) => setNewResource({ ...newResource, plan_id: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde"><option value="">Selecciona el plan asociado</option>{panel?.planes.map((plan) => <option key={plan.id} value={plan.id}>{plan.titulo}</option>)}</select>
            <input placeholder="Título opcional (se completa automáticamente)" value={newResource.titulo} onChange={(e) => setNewResource({ ...newResource, titulo: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde" />
            <label className="rounded-control border border-dashed border-sage bg-white p-3 font-sans text-xs font-bold text-verde">Subir PDF directamente<input type="file" accept="application/pdf,.pdf" onChange={(e)=>setResourceFile(e.target.files?.[0]||null)} className="mt-2 block w-full text-xs text-muted"/></label>
            <input type="url" placeholder="O pega el enlace del PDF en Drive" value={newResource.url_pdf} onChange={(e) => setNewResource({ ...newResource, url_pdf: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde" />
            <select value={newResource.tipo} onChange={(e) => setNewResource({ ...newResource, tipo: e.target.value })} className="h-11 rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde"><option value="COMPRAS">Lista de compras</option><option value="INTERCAMBIOS">Lista de intercambios</option><option value="GUIA">Guía de alimentos</option><option value="OTRO">Material adicional</option></select>
            <button disabled={Boolean(busyAction)} className="h-11 rounded-control bg-verde px-4 font-sans text-sm font-bold text-white hover:bg-verde/90 disabled:cursor-wait disabled:opacity-60">{busyAction==='recurso'?'Guardando recurso…':'Guardar recurso'}</button>
          </form>
        </article>
      </section>
      <section className="mt-10">
        {panelError && <p className="mb-5 rounded-control bg-coral/10 p-4 font-sans text-sm text-coral">{panelError}</p>}
        {!panel ? <div className="skeleton h-72 rounded-card" /> : <PatientManager data={panel} onRefresh={loadPanel} onRequest={requestAdmin} onGenerateCode={generateCode} />}
      </section>
    </main>
  )
}
