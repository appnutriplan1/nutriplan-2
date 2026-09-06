import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, FileJson, ImageOff, Trash2, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { validateWeeklyCookbook } from '../../lib/weeklyCookbookSchema'
import type { CookbookValidationIssue, WeeklyCookbook } from '../../types/weeklyCookbook'
import { getLocalCookbookRecord, publishLocalCookbook, saveLocalCookbookDraft, type LocalCookbookRecord } from '../../services/weeklyCookbookLocalRepository'
import { isMockMode } from '../../services/dataService'
import { saveLocalCookbookImages } from '../../services/weeklyCookbookImageRepository'
import JSZip from 'jszip'

const MAX_JSON_BYTES = 2 * 1024 * 1024
const MAX_ZIP_BYTES = 150 * 1024 * 1024
// Vercel recibe el archivo como Base64 (aprox. 33 % más grande). Mantener el
// binario por debajo de este límite evita que la plataforma rechace la petición
// con 413 antes de que llegue a nuestra función.
const MAX_REMOTE_IMAGE_BYTES = 2.8 * 1024 * 1024
const MAX_REMOTE_IMAGE_DIMENSION = 2048
type PlanOption = { id: string; label: string; weekStart?: string; weekEnd?: string }

function isoDate(value: unknown) {
  if (typeof value !== 'string') return ''
  const clean = value.trim()
  const isoMatch = clean.match(/^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/)
  if (isoMatch) return isoMatch[1]
  const match = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : ''
}

function normalizeImportedCookbook(input: unknown, plan?: PlanOption): unknown {
  if (!input || typeof input !== 'object') return input
  const normalized = structuredClone(input) as Record<string, unknown>
  const cookbook = normalized.cookbook as Record<string, unknown> | undefined
  if (cookbook) {
    cookbook.week_start = isoDate(cookbook.week_start) || plan?.weekStart || ''
    cookbook.week_end = isoDate(cookbook.week_end) || plan?.weekEnd || ''
  }
  if (Array.isArray(normalized.recipes)) {
    normalized.recipes.forEach((recipe) => {
      if (!recipe || typeof recipe !== 'object') return
      const ingredients = (recipe as Record<string, unknown>).ingredients
      if (!Array.isArray(ingredients)) return
      ingredients.forEach((ingredient) => {
        if (!ingredient || typeof ingredient !== 'object') return
        const row = ingredient as Record<string, unknown>
        if (row.unit == null) row.unit = ''
        else if (typeof row.unit !== 'string') row.unit = String(row.unit)
      })
    })
  }
  return normalized
}

async function optimizeImageForRemote(file: File): Promise<File> {
  if (file.size <= MAX_REMOTE_IMAGE_BYTES) return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_REMOTE_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error(`No se pudo procesar ${file.name}.`)
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  let quality = 0.86
  let blob: Blob | null = null
  while (quality >= 0.5) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
    if (blob && blob.size <= MAX_REMOTE_IMAGE_BYTES) break
    quality -= 0.08
  }
  if (!blob || blob.size > MAX_REMOTE_IMAGE_BYTES) {
    throw new Error(`${file.name} sigue siendo demasiado pesada después de optimizarla.`)
  }

  // Se conserva el nombre exacto porque recipes.json lo utiliza como llave.
  return new File([blob], file.name, { type: 'image/webp', lastModified: file.lastModified })
}

function Issues({ title, issues, tone }: { title: string; issues: CookbookValidationIssue[]; tone: 'error' | 'warning' }) {
  if (!issues.length) return null
  const error = tone === 'error'
  return (
    <section className={`rounded-card border p-5 ${error ? 'border-coral/30 bg-[#fff1e8]' : 'border-mandarina/35 bg-[#fbf3d9]'}`}>
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-tinta"><AlertTriangle size={19} className={error ? 'text-coral' : 'text-mandarina'} />{title}</h2>
      <ul className="mt-3 space-y-2">{issues.map((issue, index) => <li key={`${issue.path}-${index}`} className="font-sans text-sm text-muted"><strong className="text-tinta">{issue.path}:</strong> {issue.message}</li>)}</ul>
    </section>
  )
}

export function WeeklyCookbookImporter() {
  const [fileName, setFileName] = useState('')
  const [cookbook, setCookbook] = useState<WeeklyCookbook | null>(null)
  const [errors, setErrors] = useState<CookbookValidationIssue[]>([])
  const [warnings, setWarnings] = useState<CookbookValidationIssue[]>([])
  const [reading, setReading] = useState(false)
  const [planId, setPlanId] = useState(() => new URLSearchParams(window.location.search).get('plan') || sessionStorage.getItem('nutriplan.admin.last-plan-id') || '')
  const [remoteStatus, setRemoteStatus] = useState<'NONE' | 'DRAFT' | 'PUBLISHED'>('NONE')
  const [record, setRecord] = useState<LocalCookbookRecord | null>(null)
  const [actionError, setActionError] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([])

  useEffect(() => {
    if (isMockMode) return
    void fetch('/api/admin/data', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_resumen' }),
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({})) as {
        ok?: boolean
        pacientes?: Array<{ id: string; nombre: string }>
        planes?: Array<{ id: string; paciente_id: string; titulo: string; fecha_inicio?: string; fecha_fin?: string }>
      }
      if (!response.ok || !payload.ok || !payload.planes) return
      const patientNames = new Map((payload.pacientes ?? []).map((patient) => [patient.id, patient.nombre]))
      const options = payload.planes.map((plan) => ({ id: plan.id, label: `${plan.id} · ${plan.titulo} · ${patientNames.get(plan.paciente_id) ?? plan.paciente_id}`, weekStart: isoDate(plan.fecha_inicio), weekEnd: isoDate(plan.fecha_fin) }))
      setPlanOptions(options)
      setPlanId((current) => options.some((option) => option.id === current) ? current : options[0]?.id || '')
    }).catch(() => setActionError('No se pudo cargar la lista remota de planes.'))
  }, [])

  useEffect(() => {
    if (isMockMode || !planId) return
    const plan = planOptions.find((option) => option.id === planId)
    if (!plan?.weekStart) return
    let active = true
    setCheckingStatus(true)
    setConfirmDelete(false)
    void requestRemote('admin_estado_recetario', { plan_id: planId, week_start: plan.weekStart })
      .then((result) => { if (active) setRemoteStatus(result.estado === 'PUBLICADO' ? 'PUBLISHED' : result.estado === 'BORRADOR' ? 'DRAFT' : 'NONE') })
      .catch(() => { if (active) setActionError('No se pudo comprobar si este plan ya tiene recetario.') })
      .finally(() => { if (active) setCheckingStatus(false) })
    return () => { active = false }
  }, [planId, planOptions])

  async function handleFile(file?: File) {
    setCookbook(null)
    setErrors([])
    setWarnings([])
    setRecord(null)
    setActionError('')
    setFileName(file?.name ?? '')
    if (!file) return
    if (!planId) {
      setErrors([{ path: 'plan', message: 'Selecciona primero la paciente y el plan al que pertenece este recetario.' }])
      return
    }
    if (!/\.(json|zip)$/i.test(file.name)) {
      setErrors([{ path: 'archivo', message: 'Selecciona recipes.json o el ZIP completo de la semana.' }])
      return
    }
    const maxBytes = file.name.toLowerCase().endsWith('.zip') ? MAX_ZIP_BYTES : MAX_JSON_BYTES
    if (file.size > maxBytes) {
      setErrors([{ path: 'archivo', message: file.name.toLowerCase().endsWith('.zip') ? 'El ZIP supera el límite de 150 MB.' : 'El JSON supera el límite de 2 MB.' }])
      return
    }

    setReading(true)
    try {
      let parsed: unknown
      if (file.name.toLowerCase().endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file)
        const jsonEntry = Object.values(zip.files).find((entry) => !entry.dir && /(^|\/)recipes\.json$/i.test(entry.name))
        if (!jsonEntry) throw new Error('ZIP_SIN_JSON')
        parsed = JSON.parse(await jsonEntry.async('text'))
        const extracted: File[] = []
        for (const entry of Object.values(zip.files)) {
          if (entry.dir || !/\.(jpe?g|png|webp)$/i.test(entry.name)) continue
          const name = entry.name.split('/').pop() || entry.name
          const blob = await entry.async('blob')
          extracted.push(new File([blob], name, { type: blob.type || (name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg') }))
        }
        setImageFiles(extracted)
      } else parsed = JSON.parse(await file.text())
      const selectedPlan = planOptions.find((option) => option.id === planId)
      const result = validateWeeklyCookbook(normalizeImportedCookbook(parsed, selectedPlan))
      if (result.ok) {
        setCookbook(result.data)
        setWarnings(result.warnings)
        setRecord(getLocalCookbookRecord(planId, result.data.cookbook.week_start))
      } else {
        setErrors(result.errors)
      }
    } catch {
      setErrors([{ path: 'archivo', message: 'El contenido no es un JSON válido.' }])
    } finally {
      setReading(false)
    }
  }

  function fileBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
      reader.readAsDataURL(file)
    })
  }

  async function requestRemote(action: string, payload: object) {
    const response = await fetch('/api/admin/data', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload }) })
    const result = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; url?: string; nombre?: string; estado?: string }
    if (!response.ok) {
      const fallback = response.status === 413 ? 'La fotografía supera el límite de carga.' : `El servidor respondió con error ${response.status}.`
      throw new Error(result.error || fallback)
    }
    return result
  }

  async function saveRemoteDraft() {
    if (!cookbook) return
    setSaving(true); setActionError('')
    try {
      const imageUrls: Record<string, string> = {}
      for (let index = 0; index < imageFiles.length; index += 1) {
        const file = imageFiles[index]
        setActionError(`${file.size > MAX_REMOTE_IMAGE_BYTES ? 'Optimizando y subiendo' : 'Subiendo'} fotografía ${index + 1} de ${imageFiles.length}…`)
        const uploadFile = await optimizeImageForRemote(file)
        const uploaded = await requestRemote('admin_subir_imagen_recetario', { archivo: { nombre: file.name, mime: uploadFile.type, base64: await fileBase64(uploadFile) } })
        if (!uploaded.ok || !uploaded.url) throw new Error(uploaded.error || 'UPLOAD_ERROR')
        imageUrls[file.name] = uploaded.url
      }
      const saved = await requestRemote('admin_guardar_recetario', { recetario: { plan_id: planId, cookbook, image_urls: imageUrls } })
      if (!saved.ok) throw new Error(saved.error || 'SAVE_ERROR')
      setRemoteStatus('DRAFT'); setActionError('')
    } catch (error) {
      setActionError(error instanceof Error ? `No se pudo guardar el recetario: ${error.message}` : 'No se pudo guardar el recetario.')
    }
    finally { setSaving(false) }
  }

  async function publishRemote() {
    if (!cookbook) return
    const result = await requestRemote('admin_publicar_recetario', { plan_id: planId, week_start: cookbook.cookbook.week_start })
    if (!result.ok) { setActionError('No se pudo publicar el recetario.'); return }
    setRemoteStatus('PUBLISHED'); setActionError('')
  }

  async function deleteRemoteCookbook() {
    const plan = planOptions.find((option) => option.id === planId)
    if (!plan?.weekStart) return
    setDeleting(true); setActionError('')
    try {
      const result = await requestRemote('admin_eliminar_recetario', { plan_id: planId, week_start: plan.weekStart })
      if (!result.ok) throw new Error(result.error || 'DELETE_ERROR')
      setRemoteStatus('NONE'); setConfirmDelete(false); setCookbook(null); setFileName(''); setImageFiles([])
      setActionError('Recetario eliminado. El plan PDF, sus recursos y las demás semanas se conservaron.')
    } catch (error) {
      setActionError(error instanceof Error ? `No se pudo eliminar el recetario: ${error.message}` : 'No se pudo eliminar el recetario.')
    } finally { setDeleting(false) }
  }

  const referencedImages = cookbook?.recipes.map((recipe) => recipe.image_file).filter((name): name is string => typeof name === 'string' && !name.startsWith('/')) ?? []
  const selectedImageNames = new Set(imageFiles.map((file) => file.name))
  const missingImages = referencedImages.filter((name) => !selectedImageNames.has(name))

  async function saveDraft() {
    if (!cookbook || !isMockMode) {
      setActionError('El guardado local solo está disponible en modo mock.')
      return
    }
    setSaving(true)
    setActionError('')
    try {
      await saveLocalCookbookImages(planId, cookbook.cookbook.week_start, imageFiles)
      setRecord(saveLocalCookbookDraft(planId, cookbook))
    } catch {
      setActionError('No se pudieron almacenar las fotografías en este navegador.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto min-h-svh max-w-5xl px-5 py-10 sm:px-8">
      <Link to="/admin" className="mb-7 inline-flex min-h-11 items-center gap-2 rounded-control border border-linea bg-white px-4 font-sans text-sm font-bold text-verde shadow-soft" aria-label="Volver al panel administrativo"><ArrowLeft size={18} /> Volver al panel</Link>
      <p className="kicker">Área profesional · Recetarios semanales</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold text-tinta">Nuevo recetario semanal</h1>
      <p className="mt-3 max-w-2xl font-reading text-base leading-relaxed text-muted">Valida el archivo generado por Claude o Kimi antes de asociarlo a una paciente. Podrás revisarlo antes de guardarlo y publicarlo.</p>
      <a href="/examples/weekly-cookbook.example.json" download className="mt-4 inline-flex items-center gap-2 font-sans text-sm font-bold text-verde hover:underline"><FileJson size={16} /> Descargar JSON de ejemplo</a>

      <section className="mt-8 rounded-card border border-verde/20 bg-white p-5 shadow-soft sm:p-6">
        <p className="kicker !text-verde">Paso 1 · Destino</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-tinta">Selecciona la paciente y su plan</h2>
        <p className="mt-2 font-reading text-sm text-muted">El recetario quedará vinculado únicamente al plan elegido.</p>
        <label className="mt-5 block font-sans text-xs font-bold text-muted">Paciente · plan semanal
          <select value={planId} onChange={(event) => { setPlanId(event.target.value); setCookbook(null); setFileName(''); setErrors([]); setWarnings([]); setImageFiles([]); setRemoteStatus('NONE'); setConfirmDelete(false); setActionError('') }} className="mt-2 w-full rounded-control border border-linea bg-crema px-4 py-3 font-sans text-sm font-semibold text-tinta outline-none focus:border-verde">
            <option value="">Selecciona una paciente y un plan</option>
            {planOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        {planOptions.length === 0 && <p className="mt-3 font-sans text-xs font-semibold text-coral">Cargando los planes almacenados…</p>}
        {planId && <p className="mt-3 rounded-control bg-[#e5f1f5] px-4 py-3 font-sans text-sm font-bold text-verde">Plan seleccionado: {planOptions.find((option) => option.id === planId)?.label ?? planId}</p>}
        {!isMockMode && planId && (
          <div className="mt-4 rounded-control border border-linea bg-crema p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-sans text-sm font-bold text-tinta">{checkingStatus ? 'Comprobando recetario…' : remoteStatus === 'PUBLISHED' ? 'Esta semana tiene un recetario publicado.' : remoteStatus === 'DRAFT' ? 'Esta semana tiene un borrador.' : 'Esta semana todavía no tiene recetario.'}</p>
              {remoteStatus !== 'NONE' && !checkingStatus && <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-2 rounded-control border border-coral/40 bg-white px-4 py-2 font-sans text-sm font-extrabold text-coral"><Trash2 size={16} /> Eliminar recetario</button>}
            </div>
            {confirmDelete && <div className="mt-4 rounded-control border border-coral/25 bg-[#fff1e8] p-4"><p className="font-sans text-sm font-semibold text-tinta">Se eliminarán el borrador, la publicación y sus fotografías de esta semana. El PDF del plan, los recursos y las demás semanas se conservarán.</p><div className="mt-3 flex gap-3"><button type="button" disabled={deleting} onClick={() => setConfirmDelete(false)} className="rounded-control border border-linea bg-white px-4 py-2 font-sans text-sm font-bold text-tinta">Cancelar</button><button type="button" disabled={deleting} onClick={() => void deleteRemoteCookbook()} className="rounded-control bg-coral px-4 py-2 font-sans text-sm font-extrabold text-white disabled:opacity-50">{deleting ? 'Eliminando…' : 'Sí, eliminar'}</button></div></div>}
          </div>
        )}
        {actionError && !cookbook && <p className={`mt-4 rounded-control px-4 py-3 font-sans text-sm font-semibold ${actionError.startsWith('Recetario eliminado') ? 'bg-[#e5f1f5] text-verde' : 'bg-[#fff1e8] text-coral'}`}>{actionError}</p>}
      </section>

      <p className="mt-8 kicker !text-verde">Paso 2 · Archivo</p>
      <label className={`mt-3 flex flex-col items-center rounded-card border-2 border-dashed px-6 py-12 text-center transition-colors ${planId ? 'cursor-pointer border-verde/35 bg-[#e5f1f5] hover:border-verde' : 'cursor-not-allowed border-linea bg-papel opacity-55'}`}>
        <Upload size={28} className="text-verde" />
        <span className="mt-3 font-display text-xl font-extrabold text-tinta">Seleccionar ZIP de la semana</span>
        <span className="mt-1 font-sans text-xs text-muted">ZIP con recipes.json y carpeta fotos · también acepta JSON</span>
        <input disabled={!planId} type="file" accept="application/zip,.zip,application/json,.json" className="sr-only" onChange={(event) => void handleFile(event.target.files?.[0])} />
      </label>

      {fileName && <p className="mt-3 flex items-center gap-2 font-sans text-sm font-semibold text-muted"><FileJson size={16} className="text-coral" />{fileName}{reading ? ' · Validando…' : ''}</p>}

      <div className="mt-6 space-y-4">
        <Issues title="Errores que impiden continuar" issues={errors} tone="error" />
        <Issues title="Advertencias para revisar" issues={warnings} tone="warning" />
      </div>

      {cookbook && (
        <section className="mt-8">
          <div className="rounded-card bg-tinta p-6 text-white">
            <p className="flex items-center gap-2 font-sans text-sm font-bold text-[#b9d5e4]"><CheckCircle2 size={18} />JSON válido</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold">{cookbook.cookbook.title}</h2>
            <p className="mt-2 font-sans text-sm text-white/65">{cookbook.cookbook.week_start} — {cookbook.cookbook.week_end} · {cookbook.recipes.length} recetas · {warnings.length} advertencias</p>
          </div>

          <section className="mt-6 rounded-card border border-linea bg-white p-5 sm:p-6">
            <p className="kicker">Fotografías</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-tinta">Relacionar imágenes</h2>
            <p className="mt-2 font-reading text-sm text-muted">Selecciona las fotos mencionadas en <code>image_file</code>. La coincidencia se realiza por el nombre exacto del archivo.</p>
            <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-control border border-verde/30 bg-[#e5f1f5] px-4 py-3 font-sans text-sm font-extrabold text-verde">
              <Upload size={17} /> Seleccionar fotografías
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))} />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {imageFiles.map((file) => <div key={file.name} className="rounded-control border border-linea bg-crema p-3"><p className="truncate font-sans text-xs font-bold text-tinta">{file.name}</p><p className="mt-1 font-sans text-[10px] text-muted">{Math.ceil(file.size / 1024)} KB</p></div>)}
            </div>
            {referencedImages.length === 0 ? <p className="mt-4 font-sans text-xs text-muted">Este JSON usa imágenes públicas o no referencia archivos externos.</p> : missingImages.length ? <div className="mt-4 rounded-control bg-[#fbf3d9] px-4 py-3"><p className="font-sans text-xs font-extrabold text-tinta">Faltan {missingImages.length} fotografías:</p><p className="mt-1 break-words font-sans text-xs text-muted">{missingImages.join(', ')}</p></div> : <p className="mt-4 flex items-center gap-2 font-sans text-sm font-bold text-verde"><CheckCircle2 size={17} /> Todas las fotografías están vinculadas.</p>}
          </section>

          <div className="mt-6 flex items-end justify-between"><div><p className="kicker">Vista previa</p><h2 className="mt-1 font-display text-2xl font-extrabold text-tinta">Contenido detectado</h2></div><span className="font-sans text-xs font-bold text-muted">Sin guardar</span></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cookbook.recipes.map((recipe) => (
              <article key={recipe.external_id} className="rounded-card border border-linea bg-white p-5 shadow-soft">
                <div className="flex items-center justify-between gap-3"><span className="rounded-pill bg-[#e1f0f5] px-3 py-1 font-sans text-[10px] font-extrabold uppercase tracking-wider text-verde">{recipe.meal_type}</span>{!recipe.image_file && <ImageOff size={17} className="text-mandarina" />}</div>
                <h3 className="mt-4 font-display text-xl font-extrabold leading-tight text-tinta">{recipe.title}</h3>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-linea pt-4 font-sans text-xs text-muted"><div><dt>Porciones</dt><dd className="font-bold text-tinta">{recipe.servings} fijas</dd></div><div><dt>Tiempo</dt><dd className="font-bold text-tinta">{recipe.time_minutes ?? '—'} min</dd></div><div><dt>Ingredientes</dt><dd className="font-bold text-tinta">{recipe.ingredients.length}</dd></div><div><dt>Pasos</dt><dd className="font-bold text-tinta">{recipe.steps.length}</dd></div></dl>
              </article>
            ))}
          </div>

          <section className="mt-8 rounded-card border border-verde/20 bg-[#e5f1f5] p-5 sm:p-6">
            <p className="kicker !text-verde">Paso 3 · Publicación</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-tinta">Guardar y publicar</h2>
            <p className="mt-3 rounded-control bg-white px-4 py-3 font-sans text-sm font-bold text-verde">Destino: {planOptions.find((option) => option.id === planId)?.label ?? planId}</p>
            {actionError && <p className="mt-4 rounded-control bg-[#fff1e8] px-4 py-3 font-sans text-sm font-semibold text-coral">{actionError}</p>}
            {record && <p className="mt-4 rounded-control bg-white px-4 py-3 font-sans text-sm font-semibold text-verde">Versión {record.version} · {record.status === 'PUBLISHED' ? 'Publicada localmente' : 'Borrador local guardado'}</p>}
            {!isMockMode && remoteStatus !== 'NONE' && <p className="mt-4 rounded-control bg-white px-4 py-3 font-sans text-sm font-semibold text-verde">{remoteStatus === 'PUBLISHED' ? 'Recetario publicado para la paciente' : 'Borrador guardado en Drive'}</p>}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" disabled={saving || missingImages.length > 0} onClick={() => void (isMockMode ? saveDraft() : saveRemoteDraft())} className="rounded-control border border-verde bg-white py-3 font-sans text-sm font-extrabold text-verde disabled:opacity-40">{saving ? 'Guardando…' : 'Guardar borrador'}</button>
              <button type="button" disabled={isMockMode ? record?.status !== 'DRAFT' : remoteStatus !== 'DRAFT'} onClick={() => void (isMockMode ? (() => { const published = publishLocalCookbook(planId, cookbook.cookbook.week_start); if (published) setRecord(published) })() : publishRemote())} className="rounded-control bg-coral py-3 font-sans text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">Publicar para la paciente</button>
            </div>
          </section>
        </section>
      )}
    </main>
  )
}
