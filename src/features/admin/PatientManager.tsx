import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Check, Clipboard, Copy, Dumbbell, FileText, Pencil, Search, Trash2, TrendingUp, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

type Patient = { id: string; nombre: string; correo: string; estado: string; codigo_acceso: string; sexo?: string; fecha_nacimiento?: string; talla_cm?: string | number; objetivo?: string; notas?: string; fecha_actualizacion?: string }
type Plan = { id: string; paciente_id: string; titulo: string; estado?: string; url_pdf?: string; fecha_inicio?: string; fecha_fin?: string; kcal_objetivo?: string | number; proteinas_g?: string | number; carbohidratos_g?: string | number; grasas_g?: string | number }
type Resource = { id: string; plan_id: string; tipo: string; titulo: string; url_pdf: string; orden: number }
type FollowUp = { id: string; paciente_id: string; fecha: string; peso_kg?: string | number; cintura_cm?: string | number; notas?: string }
type Routine = { id: string; titulo: string; objetivo?: string; nivel?: string; estado?: string }
type RoutineAssignment = { id: string; paciente_id: string; rutina_id: string; fecha_inicio?: string; fecha_fin?: string; estado?: string }
type RoutineLine = { id: string; rutina_id: string; ejercicio_id: string; dia?: string }
type Data = { pacientes: Patient[]; planes: Plan[]; recursos: Resource[]; seguimiento: FollowUp[]; rutinas?: Routine[]; paciente_rutinas?: RoutineAssignment[]; rutina_ejercicios?: RoutineLine[] }
type Result = { ok?: boolean; error?: string; codigo?: string }

const input = 'h-11 w-full rounded-control border border-linea bg-white px-3 font-sans text-sm outline-none focus:border-verde'

function dateOnly(value?: string) {
  if (!value) return ''
  return String(value).slice(0, 10)
}
function ageFrom(value?: string) {
  if (!value) return null
  const birth = new Date(`${dateOnly(value)}T12:00:00`); if (Number.isNaN(birth.getTime())) return null
  const today = new Date(); let age = today.getFullYear() - birth.getFullYear(); const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()); if (beforeBirthday) age -= 1
  return age >= 0 ? age : null
}

function PlanCard({ plan, current = false, pending, onEdit, onDelete }: { plan: Plan; current?: boolean; pending: string; onEdit: (plan: Plan) => void; onDelete: (plan: Plan) => Promise<void> }) {
  const busy = pending === `plan-${plan.id}`
  return <div className={`rounded-control border bg-white p-4 ${current ? 'border-verde/30' : 'border-linea opacity-90'}`}>
    {current && <span className="rounded-pill bg-sage/15 px-2 py-1 font-sans text-[10px] font-bold text-verde">PLAN ACTUAL</span>}
    <p className="mt-2 font-sans text-sm font-bold">{plan.titulo}</p><p className="mt-1 font-sans text-xs text-muted">{dateOnly(plan.fecha_inicio)}{!current ? ' · Archivado' : ''}</p>
    <div className="mt-3 flex flex-wrap items-center gap-2">{plan.url_pdf && <a href={plan.url_pdf} target="_blank" rel="noreferrer" className="mr-auto font-sans text-xs font-bold text-verde">Abrir PDF</a>}<button type="button" disabled={Boolean(pending)} onClick={()=>onEdit({...plan,fecha_inicio:dateOnly(plan.fecha_inicio),fecha_fin:dateOnly(plan.fecha_fin)})} className="inline-flex items-center gap-1 rounded-control border border-linea px-2.5 py-1.5 font-sans text-xs font-bold text-verde disabled:opacity-40"><Pencil size={13}/> Editar</button><button type="button" disabled={Boolean(pending)} onClick={()=>void onDelete(plan)} className="inline-flex items-center gap-1 rounded-control border border-coral/30 px-2.5 py-1.5 font-sans text-xs font-bold text-coral disabled:opacity-40"><Trash2 size={13}/>{busy?'Eliminando…':'Eliminar'}</button></div>
  </div>
}

export function PatientManager({ data, onRefresh, onRequest, onGenerateCode }: {
  data: Data
  onRefresh: () => Promise<void>
  onRequest: (action: string, payload?: object) => Promise<Result>
  onGenerateCode: (patient: Patient) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [pending, setPending] = useState('')
  const [planDraft, setPlanDraft] = useState<Plan | null>(null)
  const [focusFollowUp, setFocusFollowUp] = useState(false)
  const emptyFollowUp = () => ({ id: '', fecha: new Date().toISOString().slice(0, 10), peso_kg: '', cintura_cm: '', notas: '' })
  const [followUp, setFollowUp] = useState(emptyFollowUp)

  const patients = useMemo(() => data.pacientes
    .filter((patient) => `${patient.nombre} ${patient.correo} ${patient.codigo_acceso}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es')), [data.pacientes, query])
  const selected = data.pacientes.find((patient) => patient.id === selectedId)
  const [draft, setDraft] = useState<Patient | null>(null)

  function open(patient: Patient) {
    setSelectedId(patient.id)
    setDraft({ ...patient, fecha_nacimiento: dateOnly(patient.fecha_nacimiento) })
    setEditing(false)
    setMessage('')
  }

  function openFollowUp(patient: Patient) {
    open(patient)
    setFocusFollowUp(true)
  }

  useEffect(() => {
    if (!focusFollowUp || !selectedId) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('seguimiento-profesional')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setFocusFollowUp(false)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [focusFollowUp, selectedId])

  async function savePatient(event: FormEvent) {
    event.preventDefault()
    if (!draft) return
    setSaving(true)
    const result = await onRequest('admin_guardar_paciente', { paciente: draft })
    setSaving(false)
    if (!result.ok) return setMessage('No se pudieron guardar los cambios.')
    setMessage('Datos actualizados correctamente.')
    setEditing(false)
    await onRefresh()
  }

  async function saveFollowUp(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    const result = await onRequest('admin_guardar_seguimiento', { seguimiento: { ...followUp, paciente_id: selected.id } })
    setSaving(false)
    if (!result.ok) return setMessage('No se pudo registrar el control.')
    setMessage('Nuevo control registrado.')
    setFollowUp(emptyFollowUp())
    await onRefresh()
  }
  async function removePatient(patient: Patient | undefined = selected) {
    if (!patient || !window.confirm(`¿Eliminar a ${patient.nombre}? También se eliminarán sus planes, recursos y controles. Esta acción no se puede deshacer.`)) return
    setPending('paciente'); setMessage('Eliminando paciente…')
    const result = await onRequest('admin_eliminar_paciente', { paciente_id: patient.id })
    if (!result.ok) { setMessage('No se pudo eliminar el paciente.'); setPending(''); return }
    setSelectedId(''); setDraft(null); await onRefresh(); setPending('')
  }
  async function removeFollowUp(item: FollowUp) {
    if (!window.confirm(`¿Eliminar el control del ${dateOnly(item.fecha)}?`)) return
    setPending(`seguimiento-${item.id}`); setMessage('Eliminando control…')
    const result = await onRequest('admin_eliminar_seguimiento', { seguimiento_id: item.id })
    if (!result.ok) setMessage('No se pudo eliminar el control.'); else { setMessage('Control eliminado correctamente.'); if (followUp.id === item.id) setFollowUp(emptyFollowUp()); await onRefresh() }
    setPending('')
  }
  async function savePlan(event: FormEvent) {
    event.preventDefault(); if (!planDraft) return
    setPending(`plan-${planDraft.id}`); setMessage('Guardando cambios del plan…')
    const result = await onRequest('admin_guardar_plan', { plan: planDraft })
    if (!result.ok) setMessage('No se pudo actualizar el plan.'); else { setMessage('Plan actualizado correctamente.'); setPlanDraft(null); await onRefresh() }
    setPending('')
  }
  async function removePlan(plan: Plan) {
    if (!window.confirm(`¿Eliminar el plan “${plan.titulo}”? Sus recursos asociados también se eliminarán.`)) return
    setPending(`plan-${plan.id}`); setMessage('Eliminando plan…')
    const result = await onRequest('admin_eliminar_plan', { plan_id: plan.id })
    if (!result.ok) setMessage('No se pudo eliminar el plan.'); else { setMessage('Plan eliminado correctamente.'); setPlanDraft(null); await onRefresh() }
    setPending('')
  }
  async function removeResource(resource: Resource) {
    if (!window.confirm(`¿Eliminar el recurso “${resource.titulo}”?`)) return
    setPending(`recurso-${resource.id}`); setMessage('Eliminando recurso…')
    const result = await onRequest('admin_eliminar_recurso', { recurso_id: resource.id })
    if (!result.ok) setMessage('No se pudo eliminar el recurso.'); else { setMessage('Recurso eliminado correctamente.'); await onRefresh() }
    setPending('')
  }
  async function removeRoutine(routine: Routine) {
    if (!window.confirm(`¿Eliminar la rutina “${routine.titulo}”? Dejará de aparecer para la paciente.`)) return
    setPending(`rutina-${routine.id}`); setMessage('Eliminando rutina…')
    const result = await onRequest('admin_eliminar_rutina', { rutina_id: routine.id })
    if (!result.ok) setMessage('No se pudo eliminar la rutina.'); else { setMessage('Rutina eliminada correctamente.'); await onRefresh() }
    setPending('')
  }
  async function generate(patient: Patient) {
    if (pending) return
    setPending(`codigo-${patient.id}`); setMessage('Generando código de acceso…')
    try { await onGenerateCode(patient); setMessage('Código generado y copiado.') } finally { setPending('') }
  }

  if (!selected || !draft) {
    return (
      <article className="rounded-card border border-linea bg-white p-5 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="kicker">Directorio clínico</p><h2 className="mt-2 font-display text-3xl font-semibold">Pacientes</h2><p className="mt-2 font-sans text-sm text-muted">{data.pacientes.length} registros en total</p></div>
          <label className="flex h-11 min-w-64 items-center gap-2 rounded-control border border-linea bg-crema px-3"><Search size={17} className="text-verde" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar paciente" className="w-full bg-transparent font-sans text-sm outline-none" /></label>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {patients.map((patient) => (
            <div key={patient.id} className="rounded-card-sm border border-linea bg-crema p-4 transition hover:border-verde/40 hover:shadow-soft">
              <button type="button" onClick={() => open(patient)} className="flex w-full items-center gap-4 text-left">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-verde text-white"><UserRound size={20} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate font-sans text-sm font-bold text-tinta">{patient.nombre || 'Paciente sin nombre'}</span><span className="mt-1 block truncate font-sans text-xs text-muted">{patient.correo || 'Sin correo'}</span></span>
              <span className={`rounded-pill px-2.5 py-1 font-sans text-[10px] font-bold ${patient.estado === 'ACTIVO' ? 'bg-sage/15 text-verde' : 'bg-mandarina/15 text-muted'}`}>{patient.estado || 'SIN ESTADO'}</span>
              </button>
              <div className="mt-3 flex items-center justify-between border-t border-linea pt-3">
                <span className="truncate font-mono text-[11px] text-muted">{patient.codigo_acceso || 'Sin código de acceso'}</span>
                <div className="ml-3 flex flex-wrap justify-end gap-2"><button type="button" disabled={Boolean(pending)} onClick={() => openFollowUp(patient)} className="rounded-control bg-sage px-3 py-2 font-sans text-xs font-bold text-white"><TrendingUp size={13} className="inline"/> Seguimiento</button><button type="button" disabled={Boolean(pending)} onClick={() => { open(patient); setEditing(true) }} className="rounded-control border border-linea bg-white px-3 py-2 font-sans text-xs font-bold text-verde"><Pencil size={13} className="inline"/> Editar</button><button type="button" disabled={Boolean(pending)} onClick={() => void removePatient(patient)} className="rounded-control border border-coral/30 bg-white px-3 py-2 font-sans text-xs font-bold text-coral"><Trash2 size={13} className="inline"/> Borrar</button><button type="button" disabled={Boolean(pending)} onClick={() => void generate(patient)} className="rounded-control bg-verde px-3 py-2 font-sans text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60">{pending===`codigo-${patient.id}`?'Generando…':patient.codigo_acceso ? 'Renovar' : 'Generar código'}</button></div>
              </div>
            </div>
          ))}
        </div>
      </article>
    )
  }

  const plans = data.planes.filter((plan) => plan.paciente_id === selected.id)
  const currentPlans = plans.filter((plan) => (plan.estado || 'VIGENTE') === 'VIGENTE')
  const previousPlans = plans.filter((plan) => plan.estado === 'ARCHIVADO')
  const planIds = new Set(plans.map((plan) => plan.id))
  const resources = data.recursos.filter((resource) => planIds.has(resource.plan_id))
  const followUps = data.seguimiento.filter((item) => item.paciente_id === selected.id).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
  const routineAssignments = (data.paciente_rutinas ?? []).filter((item) => item.paciente_id === selected.id).sort((a, b) => String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)))
  const assignedRoutines = routineAssignments.map((assignment) => ({ assignment, routine: (data.rutinas ?? []).find((item) => item.id === assignment.rutina_id) })).filter((item): item is { assignment: RoutineAssignment; routine: Routine } => Boolean(item.routine))

  return (
    <div>
      <button type="button" onClick={() => setSelectedId('')} className="inline-flex items-center gap-2 font-sans text-sm font-bold text-verde"><ArrowLeft size={17} /> Volver al directorio</button>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <section className="rounded-card border border-linea bg-white p-5 shadow-soft sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="kicker">Ficha del paciente</p><h2 className="mt-2 font-display text-3xl font-semibold">{selected.nombre || 'Paciente sin nombre'}</h2><p className="mt-2 font-sans text-sm text-muted">{ageFrom(selected.fecha_nacimiento) !== null ? `${ageFrom(selected.fecha_nacimiento)} años · ` : ''}Actualizado: {dateOnly(selected.fecha_actualizacion) || 'Sin fecha'}</p></div>
            <div className="flex gap-2"><button type="button" disabled={Boolean(pending)} onClick={() => setEditing(!editing)} className="rounded-control border border-verde px-4 py-2 font-sans text-sm font-bold text-verde">{editing ? 'Cancelar' : 'Editar ficha'}</button><button type="button" disabled={Boolean(pending)} onClick={()=>void removePatient()} className="inline-flex items-center gap-2 rounded-control border border-coral/40 px-3 py-2 font-sans text-sm font-bold text-coral disabled:opacity-50"><Trash2 size={15}/>{pending==='paciente'?'Eliminando…':'Eliminar'}</button></div>
          </div>
          <form onSubmit={savePatient} className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className="font-sans text-xs font-bold text-muted sm:col-span-2">Nombre completo<input disabled={!editing} required value={draft.nombre} onChange={(e) => setDraft({ ...draft, nombre: e.target.value })} className={`${input} mt-1 disabled:bg-papel/50`} /></label>
            <label className="font-sans text-xs font-bold text-muted">Correo<input disabled={!editing} type="email" value={draft.correo || ''} onChange={(e) => setDraft({ ...draft, correo: e.target.value })} className={`${input} mt-1 disabled:bg-papel/50`} /></label>
            <label className="font-sans text-xs font-bold text-muted">Estado<select disabled={!editing} value={draft.estado || 'ACTIVO'} onChange={(e) => setDraft({ ...draft, estado: e.target.value })} className={`${input} mt-1 disabled:bg-papel/50`}><option>ACTIVO</option><option>SUSPENDIDO</option><option>REVOCADO</option><option>EXPIRADO</option></select></label>
            <label className="font-sans text-xs font-bold text-muted">Sexo<select disabled={!editing} value={draft.sexo || 'F'} onChange={(e) => setDraft({ ...draft, sexo: e.target.value })} className={`${input} mt-1 disabled:bg-papel/50`}><option value="F">Mujer</option><option value="M">Hombre</option></select></label>
            <label className="font-sans text-xs font-bold text-muted">Fecha de nacimiento<input disabled={!editing} type="date" value={draft.fecha_nacimiento || ''} onChange={(e) => setDraft({ ...draft, fecha_nacimiento: e.target.value })} className={`${input} mt-1 disabled:bg-papel/50`} /></label>
            <label className="font-sans text-xs font-bold text-muted">Talla (cm)<input disabled={!editing} required inputMode="decimal" value={draft.talla_cm || ''} onChange={(e) => setDraft({ ...draft, talla_cm: e.target.value })} className={`${input} mt-1 disabled:bg-papel/50`} /></label>
            <label className="font-sans text-xs font-bold text-muted sm:col-span-2">Objetivo<input disabled={!editing} required value={draft.objetivo || ''} onChange={(e) => setDraft({ ...draft, objetivo: e.target.value })} className={`${input} mt-1 disabled:bg-papel/50`} /></label>
            <label className="font-sans text-xs font-bold text-muted sm:col-span-2">Notas<textarea disabled={!editing} value={draft.notas || ''} onChange={(e) => setDraft({ ...draft, notas: e.target.value })} className="mt-1 min-h-24 w-full rounded-control border border-linea bg-white p-3 font-sans text-sm outline-none focus:border-verde disabled:bg-papel/50" /></label>
            {editing && <button disabled={saving} className="h-11 rounded-control bg-verde font-sans text-sm font-bold text-white sm:col-span-2">{saving ? 'Guardando…' : 'Guardar cambios'}</button>}
          </form>
          <div className="mt-6 rounded-card-sm bg-papel p-4">
            <p className="font-sans text-xs font-bold uppercase tracking-wide text-muted">Código de acceso</p><p className="mt-2 break-all font-mono text-sm text-verde">{selected.codigo_acceso || 'Aún no generado'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.codigo_acceso && <button type="button" onClick={() => void navigator.clipboard.writeText(selected.codigo_acceso)} className="inline-flex items-center gap-2 rounded-control border border-linea bg-white px-3 py-2 font-sans text-xs font-bold text-verde"><Copy size={14} /> Copiar</button>}
              <button type="button" disabled={Boolean(pending)} onClick={() => void generate(selected)} className="inline-flex items-center gap-2 rounded-control bg-verde px-3 py-2 font-sans text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60"><Check size={14} /> {pending===`codigo-${selected.id}`?'Generando…':selected.codigo_acceso ? 'Renovar código' : 'Generar código'}</button>
            </div>
          </div>
          {message && <p className="mt-4 rounded-control bg-sage/10 p-3 font-sans text-sm text-verde">{message}</p>}
        </section>

        <div className="space-y-6">
          <section className="rounded-card border border-linea bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-sage/15"><Dumbbell className="text-verde" /></span><div><p className="kicker">Movimiento</p><h3 className="mt-1 font-display text-2xl font-semibold">Rutinas asignadas</h3></div></div>
            <div className="mt-4 space-y-3">{assignedRoutines.map(({ assignment, routine }) => { const days = new Set((data.rutina_ejercicios ?? []).filter((line) => line.rutina_id === routine.id).map((line) => line.dia)).size; const count = (data.rutina_ejercicios ?? []).filter((line) => line.rutina_id === routine.id).length; return <div key={assignment.id} className="rounded-control border border-linea bg-crema p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className={`rounded-pill px-2 py-1 font-sans text-[10px] font-bold ${assignment.estado === 'ACTIVO' ? 'bg-sage/15 text-verde' : 'bg-papel text-muted'}`}>{assignment.estado || 'ARCHIVADA'}</span><p className="mt-2 font-sans text-sm font-bold text-tinta">{routine.titulo}</p><p className="mt-1 font-sans text-xs text-muted">{dateOnly(assignment.fecha_inicio)}{assignment.fecha_fin ? ` al ${dateOnly(assignment.fecha_fin)}` : ''} · {days} día{days === 1 ? '' : 's'} · {count} ejercicios</p></div><div className="flex gap-2"><Link to={`/admin/rutinas?patient=${selected.id}`} className="inline-flex items-center gap-1 rounded-control border border-linea bg-white px-2.5 py-1.5 font-sans text-xs font-bold text-verde"><Pencil size={13}/> Editar</Link><button type="button" disabled={Boolean(pending)} onClick={() => void removeRoutine(routine)} className="inline-flex items-center gap-1 rounded-control border border-coral/30 bg-white px-2.5 py-1.5 font-sans text-xs font-bold text-coral disabled:opacity-40"><Trash2 size={13}/>{pending === `rutina-${routine.id}` ? 'Eliminando…' : 'Eliminar'}</button></div></div></div> })}{assignedRoutines.length === 0 && <p className="font-sans text-sm text-muted">Todavía no tiene rutinas asignadas.</p>}</div>
            {assignedRoutines.length > 0 ? <div className="mt-4 grid gap-2 sm:grid-cols-2"><Link to={`/admin/rutinas?patient=${selected.id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-verde px-4 font-sans text-sm font-bold text-white"><Pencil size={15}/> Editar o reemplazar rutina</Link><button type="button" disabled={Boolean(pending)} onClick={() => void removeRoutine((assignedRoutines.find((item) => item.assignment.estado === 'ACTIVO') ?? assignedRoutines[0]).routine)} className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-coral/40 bg-white px-4 font-sans text-sm font-bold text-coral disabled:opacity-50"><Trash2 size={15}/>{pending.startsWith('rutina-') ? 'Eliminando…' : 'Eliminar rutina actual'}</button></div> : <Link to={`/admin/rutinas?patient=${selected.id}`} className="mt-4 inline-flex h-11 items-center justify-center rounded-control bg-verde px-4 font-sans text-sm font-bold text-white">Crear rutina</Link>}
          </section>
          <section className="rounded-card border border-linea bg-papel p-5 shadow-soft">
            <div className="flex items-center gap-3"><FileText className="text-verde" /><div><p className="kicker">Contenido asignado</p><h3 className="mt-1 font-display text-2xl font-semibold">{plans.length} planes · {resources.length} archivos</h3></div></div>
            <div className="mt-4 space-y-3">
              {currentPlans.map((plan) => <PlanCard key={plan.id} plan={plan} current pending={pending} onEdit={setPlanDraft} onDelete={removePlan}/>)}
              {previousPlans.length > 0 && <p className="pt-2 font-sans text-xs font-bold uppercase tracking-wide text-muted">Historial de planes</p>}
              {previousPlans.map((plan) => <PlanCard key={plan.id} plan={plan} pending={pending} onEdit={setPlanDraft} onDelete={removePlan}/>)}
              {plans.length === 0 && <p className="font-sans text-sm text-muted">Todavía no tiene planes asignados.</p>}
            </div>
            {resources.length > 0 && <div className="mt-4 border-t border-linea pt-4">{resources.map((resource) => <div key={resource.id} className="flex items-center gap-2 py-1 font-sans text-sm text-tinta"><Clipboard size={14} className="text-verde" /><span className="flex-1">{resource.titulo}</span><button type="button" disabled={Boolean(pending)} onClick={()=>void removeResource(resource)} aria-label={`Eliminar ${resource.titulo}`} className="p-2 text-coral disabled:opacity-40"><Trash2 size={15}/></button></div>)}</div>}
          </section>

          {planDraft && <section className="rounded-card border border-verde/25 bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><h3 className="font-display text-2xl font-semibold">Editar plan</h3><button type="button" onClick={()=>setPlanDraft(null)} className="font-sans text-xs font-bold text-muted">Cancelar</button></div><form onSubmit={savePlan} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="font-sans text-xs font-bold text-muted sm:col-span-2">Título<input required value={planDraft.titulo} onChange={e=>setPlanDraft({...planDraft,titulo:e.target.value})} className={`${input} mt-1`}/></label><label className="font-sans text-xs font-bold text-muted sm:col-span-2">Enlace del PDF<input required type="url" value={planDraft.url_pdf||''} onChange={e=>setPlanDraft({...planDraft,url_pdf:e.target.value})} className={`${input} mt-1`}/></label><label className="font-sans text-xs font-bold text-muted">Inicio<input required type="date" value={dateOnly(planDraft.fecha_inicio)} onChange={e=>setPlanDraft({...planDraft,fecha_inicio:e.target.value})} className={`${input} mt-1`}/></label><label className="font-sans text-xs font-bold text-muted">Fin<input type="date" value={dateOnly(planDraft.fecha_fin)} onChange={e=>setPlanDraft({...planDraft,fecha_fin:e.target.value})} className={`${input} mt-1`}/></label><label className="font-sans text-xs font-bold text-muted">Estado<select value={planDraft.estado||'VIGENTE'} onChange={e=>setPlanDraft({...planDraft,estado:e.target.value})} className={`${input} mt-1`}><option>VIGENTE</option><option>ARCHIVADO</option></select></label><button disabled={Boolean(pending)} className="h-11 self-end rounded-control bg-verde font-sans text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{pending===`plan-${planDraft.id}`?'Guardando…':'Guardar cambios'}</button></form></section>}

          <section id="seguimiento-profesional" className="scroll-mt-6 rounded-card border-2 border-sage/40 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-sage/15"><TrendingUp className="text-verde" /></span><div><p className="kicker">Seguimiento profesional</p><h3 className="mt-1 font-display text-2xl font-semibold">Registrar nuevo control</h3><p className="mt-1 font-sans text-xs text-muted">Los datos se guardan en la pestaña SEGUIMIENTO del paciente.</p></div></div>
            <form onSubmit={saveFollowUp} className="mt-4 grid gap-3 grid-cols-2">
              <input required type="date" value={followUp.fecha} onChange={(e) => setFollowUp({ ...followUp, fecha: e.target.value })} className={`${input} col-span-2`} />
              <input inputMode="decimal" placeholder="Peso (kg)" value={followUp.peso_kg} onChange={(e) => setFollowUp({ ...followUp, peso_kg: e.target.value })} className={input} />
              <input inputMode="decimal" placeholder="Cintura (cm)" value={followUp.cintura_cm} onChange={(e) => setFollowUp({ ...followUp, cintura_cm: e.target.value })} className={input} />
              <textarea placeholder="Notas del control" value={followUp.notas} onChange={(e) => setFollowUp({ ...followUp, notas: e.target.value })} className="col-span-2 min-h-20 rounded-control border border-linea p-3 font-sans text-sm outline-none focus:border-verde" />
              <button disabled={saving} className="col-span-2 h-11 rounded-control bg-verde font-sans text-sm font-bold text-white">{saving ? 'Guardando…' : followUp.id ? 'Actualizar control' : 'Guardar control'}</button>
            </form>
            <div className="mt-5 space-y-2">{followUps.slice(0, 8).map((item) => <div key={item.id} className="rounded-control bg-crema p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-sans text-xs font-bold text-verde">{dateOnly(item.fecha)}</p><p className="mt-1 font-sans text-sm text-tinta">{item.peso_kg ? `${item.peso_kg} kg` : 'Sin peso'}{item.cintura_cm ? ` · cintura ${item.cintura_cm} cm` : ''}</p>{item.notas && <p className="mt-1 font-sans text-xs text-muted">{item.notas}</p>}</div><div className="flex gap-1"><button type="button" disabled={Boolean(pending)} onClick={()=>setFollowUp({ id:item.id, fecha:dateOnly(item.fecha), peso_kg:String(item.peso_kg||''), cintura_cm:String(item.cintura_cm||''), notas:item.notas||'' })} aria-label="Editar control" className="p-2 text-verde"><Pencil size={15}/></button><button type="button" disabled={Boolean(pending)} onClick={()=>void removeFollowUp(item)} aria-label="Eliminar control" className="p-2 text-coral"><Trash2 size={15}/></button></div></div></div>)}{followUps.length === 0 && <p className="font-sans text-sm text-muted">Aún no hay controles registrados.</p>}</div>
          </section>
        </div>
      </div>
    </div>
  )
}
