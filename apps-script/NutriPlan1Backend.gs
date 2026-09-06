const SPREADSHEET_ID = '1CdKbdHFnsMBOMGUoerRVJr1osozcwsKuwASyHKhb7qQ';
const NUTRIPLAN_APPS_SCRIPT_VERSION = '2026.09.05-rutinas-admin-v3';

function doGet(e) { return manejarSolicitud(e); }
function doPost(e) { return manejarSolicitud(e); }

function manejarSolicitud(e) {
  try {
    const p = leerParametros(e);
    switch (String(p.action || '')) {
      case 'estado_servicio': return responder({ ok: true, version: NUTRIPLAN_APPS_SCRIPT_VERSION });
      case 'login': return responder(login(p.codigo_acceso));
      case 'planes': return responder(listaAutorizada(p.codigo_acceso, 'planes'));
      case 'seguimiento': return responder(listaAutorizada(p.codigo_acceso, 'seguimiento'));
      case 'recursos': return responder(listaAutorizada(p.codigo_acceso, 'recursos'));
      case 'pdf': return responder(pdfAutorizado(p.codigo_acceso, p.plan_id, false));
      case 'recurso': return responder(pdfAutorizado(p.codigo_acceso, p.recurso_id, true));
      case 'alimentos': return responder({ ok: true, alimentos: filas('ALIMENTOS') });
      case 'educacion': return responder(obtenerEducacion(p.codigo_acceso));
      case 'rutinas': return responder(obtenerRutinasSeguro(p.codigo_acceso));
      case 'subir_documento': return responder(procesarSubidaDocumento(p));
      case 'admin_resumen': return responder(p.admin_action ? adminDespachar(p.admin_password, p) : adminResumen(p.admin_password));
      case 'admin_guardar_paciente': return responder(adminGuardarPaciente(p.admin_password, p.paciente));
      case 'admin_guardar_plan': return responder(adminGuardarPlan(p.admin_password, p.plan));
      case 'admin_eliminar_paciente': return responder(adminEliminarPaciente(p.admin_password, p.paciente_id));
      case 'admin_eliminar_plan': return responder(adminEliminarPlan(p.admin_password, p.plan_id));
      case 'admin_guardar_ciclo': return responder(adminGuardarCiclo(p.admin_password, p.ciclo));
      case 'admin_generar_codigo': return responder(adminGenerarCodigo(p.admin_password, p.paciente_id));
      case 'admin_guardar_recurso': return responder(adminGuardarRecurso(p.admin_password, p.recurso));
      case 'admin_eliminar_recurso': return responder(adminEliminarRecurso(p.admin_password, p.recurso_id));
      case 'admin_crear_token_subida': return responder(adminCrearTokenSubida(p.admin_password));
      case 'admin_estado_subida': return responder(adminEstadoSubida(p.admin_password, p.token));
      case 'admin_guardar_rutina': return responder(adminGuardarRutina(p.admin_password, p.rutina));
      case 'admin_eliminar_rutina': return responder(adminEliminarRutina(p.admin_password, p.rutina_id));
      default: return responder({ ok: false, error: 'ACCION_DESCONOCIDA' });
    }
  } catch (error) { return responder({ ok: false, error: 'ERROR_SERVIDOR' }); }
}

function leerParametros(e) {
  if (e && e.postData && e.postData.contents) try { return JSON.parse(e.postData.contents); } catch (error) {}
  return (e && e.parameter) || {};
}
function responder(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function libro() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function hoja(nombre) { const h = libro().getSheetByName(nombre); if (!h) throw new Error('HOJA_NO_ENCONTRADA'); return h; }
function filas(nombre) {
  const values = hoja(nombre).getDataRange().getValues();
  if (!values.length) return [];
  return values.slice(1).filter(r => r.some(v => v !== '' && v !== null)).map(r => {
    const o = {}; values[0].forEach((key, i) => { o[String(key)] = normalizar(r[i]); }); return o;
  });
}
function normalizar(value) { return value instanceof Date ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd') : value; }
function validarCodigo(codigo) {
  if (!codigo) return null;
  return filas('PACIENTES').find(p => String(p.codigo_acceso) === String(codigo) && String(p.estado).toUpperCase() === 'ACTIVO') || null;
}
function sinCodigo(p) { const o = Object.assign({}, p); delete o.codigo_acceso; return o; }
function planesPaciente(id) { return filas('PLANES').filter(p => String(p.paciente_id) === String(id)); }
function seguimientoPaciente(id) { return filas('SEGUIMIENTO').filter(s => String(s.paciente_id) === String(id)); }
function recursosPaciente(id) { const ids = planesPaciente(id).map(p => String(p.id)); return filas('RECURSOS').filter(r => ids.indexOf(String(r.plan_id)) >= 0); }
function login(codigo) {
  const p = validarCodigo(codigo); if (!p) return { ok: false, error: 'ACCESO_DENEGADO' };
  return { ok: true, paciente: sinCodigo(p), planes: planesPaciente(p.id), seguimiento: seguimientoPaciente(p.id) };
}
function listaAutorizada(codigo, tipo) {
  const p = validarCodigo(codigo); if (!p) return { ok: false, error: 'ACCESO_DENEGADO' };
  if (tipo === 'planes') return { ok: true, planes: planesPaciente(p.id) };
  if (tipo === 'seguimiento') return { ok: true, seguimiento: seguimientoPaciente(p.id) };
  return { ok: true, recursos: recursosPaciente(p.id) };
}
function obtenerEducacion(codigo) {
  const book = libro(), topicsSheet = book.getSheetByName('EDUCACION') || book.getSheetByName('EDUCACIÓN'), slidesSheet = book.getSheetByName('EDUCACION_LAMINAS');
  if (!topicsSheet) return { ok: true, educacion: [], laminasEducacion: [] };
  const patient = validarCodigo(codigo), topics = filas(topicsSheet.getName()).filter(t => String(t.estado).toUpperCase() === 'ACTIVO' && (String(t.acceso).toUpperCase() === 'PUBLICO' || (patient && String(t.acceso).toUpperCase() === 'PACIENTE')));
  const ids = topics.map(t => String(t.id)), slides = slidesSheet ? filas(slidesSheet.getName()).filter(s => ids.indexOf(String(s.educacion_id)) >= 0) : [];
  return { ok: true, educacion: topics, laminasEducacion: slides };
}
function asegurarHoja(nombre, headers) {
  const book = libro(); let h = book.getSheetByName(nombre);
  if (!h) { h = book.insertSheet(nombre); h.getRange(1, 1, 1, headers.length).setValues([headers]); h.setFrozenRows(1); }
  return h;
}
function obtenerRutinasSeguro(codigo) {
  const paciente = validarCodigo(codigo); if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };
  const book = libro(), ah = book.getSheetByName('PACIENTE_RUTINAS'), rh = book.getSheetByName('RUTINAS'), lh = book.getSheetByName('RUTINA_EJERCICIOS'), eh = book.getSheetByName('EJERCICIOS');
  if (!ah || !rh || !lh || !eh) return { ok: true, rutinas: [], rutinaEjercicios: [], ejercicios: [] };
  const asignaciones = filas('PACIENTE_RUTINAS').filter(a => String(a.paciente_id) === String(paciente.id) && String(a.estado).toUpperCase() === 'ACTIVO');
  const ids = asignaciones.map(a => String(a.rutina_id));
  const rutinas = filas('RUTINAS').filter(r => ids.indexOf(String(r.id)) >= 0 && String(r.estado).toUpperCase() === 'ACTIVO');
  const rutinaIds = rutinas.map(r => String(r.id));
  const rutinaEjercicios = filas('RUTINA_EJERCICIOS').filter(l => rutinaIds.indexOf(String(l.rutina_id)) >= 0);
  const ejercicioIds = rutinaEjercicios.map(l => String(l.ejercicio_id));
  const ejercicios = filas('EJERCICIOS').filter(e => ejercicioIds.indexOf(String(e.id)) >= 0 && String(e.estado).toUpperCase() === 'ACTIVO');
  return { ok: true, rutinas: rutinas, rutinaEjercicios: rutinaEjercicios, ejercicios: ejercicios };
}
function driveId(url) { const m = String(url || '').match(/\/d\/([\w-]+)/) || String(url || '').match(/[?&]id=([\w-]+)/); return m ? m[1] : ''; }
function pdfAutorizado(codigo, id, recurso) {
  const p = validarCodigo(codigo); if (!p) return { ok: false, error: 'ACCESO_DENEGADO' };
  const items = recurso ? recursosPaciente(p.id) : planesPaciente(p.id);
  const item = items.find(x => String(x.id) === String(id));
  if (!item || !item.url_pdf) return { ok: false, error: 'ACCESO_DENEGADO' };
  const fileId = driveId(item.url_pdf); if (!fileId) return { ok: false, error: 'ARCHIVO_INVALIDO' };
  const blob = DriveApp.getFileById(fileId).getBlob();
  return { ok: true, base64: Utilities.base64Encode(blob.getBytes()), mime: blob.getContentType() || 'application/pdf' };
}

function esAdmin(clave) { const s = PropertiesService.getScriptProperties().getProperty('ADMIN_API_SECRET'); return !!s && String(clave || '') === String(s); }
function adminResumen(clave) {
  if (!esAdmin(clave)) return { ok: false, error: 'NO_AUTORIZADO' };
  const book = libro();
  function opcional(nombre) { return book.getSheetByName(nombre) ? filas(nombre) : []; }
  return { ok: true, pacientes: filas('PACIENTES'), planes: filas('PLANES'), ciclos_plan: filas('CICLOS_PLAN'), recursos: filas('RECURSOS'), seguimiento: filas('SEGUIMIENTO'), rutinas: opcional('RUTINAS'), ejercicios: opcional('EJERCICIOS'), rutina_ejercicios: opcional('RUTINA_EJERCICIOS'), paciente_rutinas: opcional('PACIENTE_RUTINAS') };
}
function guardar(nombre, data, prefijo) {
  const h = hoja(nombre), headers = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0];
  const id = data.id || prefijo + '_' + Date.now(), values = h.getDataRange().getValues(), idCol = headers.indexOf('id');
  let row = h.getLastRow() + 1;
  for (let i = 1; i < values.length; i++) if (String(values[i][idCol]) === String(id)) { row = i + 1; break; }
  const merged = Object.assign({}, data, { id: id });
  h.getRange(row, 1, 1, headers.length).setValues([headers.map(k => Object.prototype.hasOwnProperty.call(merged, k) ? merged[k] : '')]);
  return merged;
}
function adminGuardarPaciente(clave, p) {
  if (!esAdmin(clave) || !p || !p.nombre || !p.talla_cm || !p.objetivo) return { ok: false, error: 'DATOS_INVALIDOS' };
  const nuevo = guardar('PACIENTES', Object.assign({ codigo_acceso: '', estado: 'ACTIVO', correo: '', sexo: 'F', fecha_nacimiento: '', notas: '' }, p, { fecha_actualizacion: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd') }), 'pac');
  return { ok: true, paciente: nuevo };
}
function adminGuardarPlan(clave, p) {
  if (!esAdmin(clave) || !p || !p.paciente_id || !p.titulo || !p.url_pdf || !p.fecha_inicio) return { ok: false, error: 'DATOS_INVALIDOS' };
  const h = hoja('PLANES'), values = h.getDataRange().getValues(), headers = values[0], pc = headers.indexOf('paciente_id'), ec = headers.indexOf('estado');
  if (String(p.estado || 'VIGENTE').toUpperCase() === 'VIGENTE') for (let i = 1; i < values.length; i++) if (String(values[i][pc]) === String(p.paciente_id) && String(values[i][ec]).toUpperCase() === 'VIGENTE' && String(values[i][headers.indexOf('id')]) !== String(p.id || '')) h.getRange(i + 1, ec + 1).setValue('ARCHIVADO');
  const nuevo = guardar('PLANES', Object.assign({ estado: 'VIGENTE', fecha_fin: '', kcal_objetivo: '', proteinas_g: '', carbohidratos_g: '', grasas_g: '' }, p), 'plan');
  return { ok: true, plan: nuevo };
}
function borrarFilas(nombre, campo, valoresBuscados) {
  const h = hoja(nombre), values = h.getDataRange().getValues(), col = values[0].indexOf(campo), wanted = valoresBuscados.map(String); let deleted = 0;
  if (col < 0) return deleted;
  for (let i = values.length - 1; i >= 1; i--) if (wanted.indexOf(String(values[i][col])) >= 0) { h.deleteRow(i + 1); deleted++; }
  return deleted;
}
function adminEliminarPlan(clave, planId) {
  if (!esAdmin(clave) || !planId) return { ok: false, error: 'NO_AUTORIZADO' };
  borrarFilas('RECURSOS', 'plan_id', [planId]);
  const deleted = borrarFilas('PLANES', 'id', [planId]);
  return deleted ? { ok: true } : { ok: false, error: 'PLAN_NO_ENCONTRADO' };
}
function adminEliminarPaciente(clave, pacienteId) {
  if (!esAdmin(clave) || !pacienteId) return { ok: false, error: 'NO_AUTORIZADO' };
  const planIds = filas('PLANES').filter(p => String(p.paciente_id) === String(pacienteId)).map(p => p.id);
  if (planIds.length) borrarFilas('RECURSOS', 'plan_id', planIds);
  borrarFilas('PLANES', 'paciente_id', [pacienteId]); borrarFilas('SEGUIMIENTO', 'paciente_id', [pacienteId]); borrarFilas('CICLOS_PLAN', 'paciente_id', [pacienteId]);
  const deleted = borrarFilas('PACIENTES', 'id', [pacienteId]);
  return deleted ? { ok: true } : { ok: false, error: 'PACIENTE_NO_ENCONTRADO' };
}
function adminGenerarCodigo(clave, pacienteId) {
  if (!esAdmin(clave) || !pacienteId) return { ok: false, error: 'NO_AUTORIZADO' };
  const h = hoja('PACIENTES'), values = h.getDataRange().getValues(), headers = values[0], ic = headers.indexOf('id'), cc = headers.indexOf('codigo_acceso');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  function block() { let x = ''; for (let i = 0; i < 4; i++) x += chars.charAt(Math.floor(Math.random() * chars.length)); return x; }
  const used = values.slice(1).map(r => String(r[cc])); let code; do { code = 'nc_' + block() + '-' + block() + '-' + block(); } while (used.indexOf(code) >= 0);
  for (let i = 1; i < values.length; i++) if (String(values[i][ic]) === String(pacienteId)) { h.getRange(i + 1, cc + 1).setValue(code); return { ok: true, codigo: code }; }
  return { ok: false, error: 'PACIENTE_NO_ENCONTRADO' };
}
function adminGuardarRecurso(clave, r) {
  if (!esAdmin(clave) || !r || !r.plan_id || !r.titulo || !r.url_pdf) return { ok: false, error: 'DATOS_INVALIDOS' };
  const prioridad = { PLAN: 0, COMPRAS: 1, LISTA_COMPRAS: 1, INTERCAMBIOS: 2, GUIA: 3, OTRO: 4 };
  const tipo = String(r.tipo || 'OTRO').toUpperCase();
  return { ok: true, recurso: guardar('RECURSOS', Object.assign({ tipo: tipo, orden: prioridad[tipo] == null ? 4 : prioridad[tipo] }, r), 'rec') };
}
function adminEliminarRecurso(clave, id) {
  if (!esAdmin(clave) || !id) return { ok: false, error: 'NO_AUTORIZADO' };
  const h = hoja('RECURSOS'), values = h.getDataRange().getValues(), c = values[0].indexOf('id');
  for (let i = 1; i < values.length; i++) if (String(values[i][c]) === String(id)) { h.deleteRow(i + 1); return { ok: true }; }
  return { ok: false, error: 'RECURSO_NO_ENCONTRADO' };
}
function adminGuardarCiclo(clave, c) {
  if (!esAdmin(clave) || !c || !c.paciente_id || !c.fecha_inicio || !c.fecha_fin) return { ok: false, error: 'DATOS_INVALIDOS' };
  const inicio = new Date(c.fecha_inicio + 'T00:00:00'), fin = new Date(c.fecha_fin + 'T00:00:00'); if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin < inicio) return { ok: false, error: 'FECHAS_INVALIDAS' };
  const h = hoja('CICLOS_PLAN'), values = h.getDataRange().getValues(), headers = values[0], pc = headers.indexOf('paciente_id'), ec = headers.indexOf('estado');
  for (let i = 1; i < values.length; i++) if (String(values[i][pc]) === String(c.paciente_id) && String(values[i][ec]).toUpperCase() === 'ACTIVO') h.getRange(i + 1, ec + 1).setValue('FINALIZADO');
  const nuevo = guardar('CICLOS_PLAN', Object.assign({ estado: 'ACTIVO', creado_en: new Date(), actualizado_en: new Date() }, c), 'ciclo'); return { ok: true, ciclo: nuevo };
}
function adminDespachar(clave, p) {
  if (String(p.admin_action) === 'admin_guardar_seguimiento') return adminGuardarSeguimiento(clave, p.seguimiento);
  if (String(p.admin_action) === 'admin_eliminar_seguimiento') return adminEliminarSeguimiento(clave, p.seguimiento_id);
  return { ok: false, error: 'ACCION_DESCONOCIDA' };
}
function adminGuardarSeguimiento(clave, s) {
  if (!esAdmin(clave) || !s || !s.paciente_id || !s.fecha) return { ok: false, error: 'DATOS_INVALIDOS' };
  return { ok: true, seguimiento: guardar('SEGUIMIENTO', s, 'seg') };
}
function adminEliminarSeguimiento(clave, id) {
  if (!esAdmin(clave) || !id) return { ok: false, error: 'NO_AUTORIZADO' };
  const deleted = borrarFilas('SEGUIMIENTO', 'id', [id]);
  return deleted ? { ok: true } : { ok: false, error: 'SEGUIMIENTO_NO_ENCONTRADO' };
}
function adminGuardarRutina(clave, r) {
  if (!esAdmin(clave) || !r || !r.paciente_id || !r.nombre || !r.fecha_inicio || !Array.isArray(r.dias)) return { ok: false, error: 'DATOS_INVALIDOS' };
  const rutinas = asegurarHoja('RUTINAS', ['id','titulo','descripcion','objetivo','nivel','duracion_estimada_min','estado']);
  const ejercicios = asegurarHoja('EJERCICIOS', ['id','nombre','descripcion','zona_cuerpo','nivel','duracion_min','url_video','url_imagen','estado']);
  const lineas = asegurarHoja('RUTINA_EJERCICIOS', ['id','rutina_id','ejercicio_id','dia','orden','series','repeticiones','descanso_seg','notas']);
  const asignaciones = asegurarHoja('PACIENTE_RUTINAS', ['id','paciente_id','rutina_id','fecha_inicio','fecha_fin','estado']);
  const seleccionados = [];
  r.dias.forEach(dia => (dia.ejercicios || []).forEach(e => seleccionados.push({ dia: dia, ejercicio: e })));
  if (!seleccionados.length) return { ok: false, error: 'SELECCIONA_AL_MENOS_UN_EJERCICIO' };
  const av = asignaciones.getDataRange().getValues(), ah = av[0], pc = ah.indexOf('paciente_id'), ec = ah.indexOf('estado');
  const rutinaId = String(r.rutina_id || ('rut_' + Date.now()));
  for (let i = 1; i < av.length; i++) if (String(av[i][pc]) === String(r.paciente_id) && String(av[i][ec]).toUpperCase() === 'ACTIVO' && String(av[i][ah.indexOf('rutina_id')]) !== rutinaId) av[i][ec] = 'ARCHIVADO';
  if (av.length > 1) asignaciones.getRange(2, 1, av.length - 1, ah.length).setValues(av.slice(1));
  const duracion = Number((String(r.duracion_por_sesion || '').match(/\d+/) || ['0'])[0]);
  guardar('RUTINAS', { id: rutinaId, titulo: r.nombre, descripcion: [r.metodo, r.equipamiento, r.calentamiento, r.enfriamiento].filter(Boolean).join(' · '), objetivo: r.objetivo || '', nivel: r.nivel || '', duracion_estimada_min: duracion, estado: 'ACTIVO' }, 'rut');
  borrarFilas('RUTINA_EJERCICIOS', 'rutina_id', [rutinaId]);
  const ev = ejercicios.getDataRange().getValues(), eh = ev[0], eid = eh.indexOf('id'), existing = {};
  for (let i = 1; i < ev.length; i++) existing[String(ev[i][eid])] = i;
  const nuevosEjercicios = [], lineasNuevas = [];
  seleccionados.forEach((item, index) => {
    const e = item.ejercicio, data = { id: e.exercise_id, nombre: e.nombre, descripcion: e.notas || '', zona_cuerpo: e.grupo_muscular || '', nivel: r.nivel || '', duracion_min: '', url_video: '', url_imagen: '', estado: 'ACTIVO' };
    const row = eh.map(k => Object.prototype.hasOwnProperty.call(data, k) ? data[k] : '');
    if (existing[String(e.exercise_id)] != null) ev[existing[String(e.exercise_id)]] = row; else { existing[String(e.exercise_id)] = ev.length + nuevosEjercicios.length; nuevosEjercicios.push(row); }
    lineasNuevas.push(['re_' + Date.now() + '_' + index, rutinaId, e.exercise_id, item.dia.nombre, index + 1, e.series, e.reps, e.descanso_segundos, e.notas || '']);
  });
  if (ev.length > 1) ejercicios.getRange(2, 1, ev.length - 1, eh.length).setValues(ev.slice(1));
  if (nuevosEjercicios.length) ejercicios.getRange(ejercicios.getLastRow() + 1, 1, nuevosEjercicios.length, eh.length).setValues(nuevosEjercicios);
  if (lineasNuevas.length) lineas.getRange(lineas.getLastRow() + 1, 1, lineasNuevas.length, 9).setValues(lineasNuevas);
  const asignacionExistente = av.slice(1).find(row => String(row[ah.indexOf('rutina_id')]) === rutinaId);
  guardar('PACIENTE_RUTINAS', { id: asignacionExistente ? asignacionExistente[ah.indexOf('id')] : '', paciente_id: r.paciente_id, rutina_id: rutinaId, fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin || '', estado: 'ACTIVO' }, 'pr');
  return { ok: true, rutina_id: rutinaId };
}
function adminEliminarRutina(clave, rutinaId) {
  if (!esAdmin(clave) || !rutinaId) return { ok: false, error: 'NO_AUTORIZADO' };
  borrarFilas('PACIENTE_RUTINAS', 'rutina_id', [rutinaId]);
  borrarFilas('RUTINA_EJERCICIOS', 'rutina_id', [rutinaId]);
  const deleted = borrarFilas('RUTINAS', 'id', [rutinaId]);
  return deleted ? { ok: true } : { ok: false, error: 'RUTINA_NO_ENCONTRADA' };
}
function adminCrearTokenSubida(clave) {
  if (!esAdmin(clave)) return { ok: false, error: 'NO_AUTORIZADO' };
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('upload_' + token, '1', 600);
  return { ok: true, token: token };
}
function nombreSeguro(texto) { return String(texto || '').replace(/[\\/:*?"<>|]/g, '-').trim().slice(0, 80) || 'Paciente'; }
function carpetaHija(padre, nombre) { const it = padre.getFoldersByName(nombre); return it.hasNext() ? it.next() : padre.createFolder(nombre); }
function autorizarDrive() {
  const properties = PropertiesService.getScriptProperties();
  let rootId = properties.getProperty('DRIVE_DOCUMENTOS_ROOT_ID'), root;
  try { root = rootId ? DriveApp.getFolderById(rootId) : null; } catch (error) { root = null; }
  if (!root) {
    root = DriveApp.createFolder('NutriPlan 1 - Documentos de pacientes');
    properties.setProperty('DRIVE_DOCUMENTOS_ROOT_ID', root.getId());
  }
  return root.getId();
}
function procesarSubidaDocumento(p) {
  const token = String(p.token || ''), cache = CacheService.getScriptCache();
  try {
    const resultado = subirDocumentoConToken(p);
    if (token) cache.put('upload_result_' + token, JSON.stringify(resultado), 600);
    return resultado;
  } catch (error) {
    const resultado = { ok: false, error: 'ERROR_SUBIDA', detalle: String(error && error.message ? error.message : error) };
    if (token) cache.put('upload_result_' + token, JSON.stringify(resultado), 600);
    return resultado;
  }
}
function adminEstadoSubida(clave, token) {
  if (!esAdmin(clave)) return { ok: false, error: 'NO_AUTORIZADO' };
  const value = CacheService.getScriptCache().get('upload_result_' + String(token || ''));
  return value ? JSON.parse(value) : { ok: true, pendiente: true };
}
function subirDocumentoConToken(p) {
  const cache = CacheService.getScriptCache(), key = 'upload_' + String(p.token || '');
  if (!p.token || cache.get(key) !== '1') return { ok: false, error: 'TOKEN_INVALIDO' };
  if (!p.archivo || !p.archivo.nombre || !p.archivo.base64 || String(p.archivo.mime || '') !== 'application/pdf') return { ok: false, error: 'ARCHIVO_INVALIDO' };
  const bytes = Utilities.base64Decode(String(p.archivo.base64));
  if (bytes.length > 20 * 1024 * 1024) return { ok: false, error: 'ARCHIVO_MUY_GRANDE' };
  const paciente = filas('PACIENTES').find(x => String(x.id) === String(p.paciente_id));
  if (!paciente) return { ok: false, error: 'PACIENTE_NO_ENCONTRADO' };
  let semana = Number(p.numero_semana) || 1;
  if (p.plan_id) { const plan = filas('PLANES').find(x => String(x.id) === String(p.plan_id)); if (plan) semana = Number(plan.numero_semana) || semana; }
  let rootId = PropertiesService.getScriptProperties().getProperty('DRIVE_DOCUMENTOS_ROOT_ID'), root;
  try { root = rootId ? DriveApp.getFolderById(rootId) : null; } catch (error) { root = null; }
  if (!root) { root = DriveApp.createFolder('NutriPlan 1 - Documentos de pacientes'); PropertiesService.getScriptProperties().setProperty('DRIVE_DOCUMENTOS_ROOT_ID', root.getId()); }
  const folder = carpetaHija(root, nombreSeguro(paciente.nombre) + ' - Semana ' + semana);
  const blob = Utilities.newBlob(bytes, 'application/pdf', nombreSeguro(p.archivo.nombre));
  const file = folder.createFile(blob); cache.remove(key);
  return { ok: true, url: 'https://drive.google.com/file/d/' + file.getId() + '/view', carpeta: folder.getName() };
}
