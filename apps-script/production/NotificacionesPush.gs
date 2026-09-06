/**
 * NutriPlan — almacenamiento de suscripciones Web Push.
 * Crear/usar la pestaña PUSH_SUBSCRIPTIONS automáticamente.
 * Encabezados: id | paciente_id | endpoint | p256dh | auth | creado_en | actualizado_en
 */

function pushHoja_() {
  var libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  var hoja = libro.getSheetByName('PUSH_SUBSCRIPTIONS');
  if (!hoja) {
    hoja = libro.insertSheet('PUSH_SUBSCRIPTIONS');
    hoja.appendRow(['id', 'paciente_id', 'endpoint', 'p256dh', 'auth', 'creado_en', 'actualizado_en']);
  }
  return hoja;
}

function pushSuscribir(codigo, suscripcion) {
  var paciente = validarCodigo(codigo);
  if (!paciente || !suscripcion || !suscripcion.endpoint || !suscripcion.p256dh || !suscripcion.auth) return { ok: false, error: 'ACCESO_DENEGADO' };
  var hoja = pushHoja_();
  var datos = hoja.getDataRange().getValues();
  var ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][2]) === String(suscripcion.endpoint)) {
      hoja.getRange(i + 1, 2, 1, 6).setValues([[paciente.id, suscripcion.endpoint, suscripcion.p256dh, suscripcion.auth, datos[i][5] || ahora, ahora]]);
      return { ok: true };
    }
  }
  hoja.appendRow(['push_' + new Date().getTime(), paciente.id, suscripcion.endpoint, suscripcion.p256dh, suscripcion.auth, ahora, ahora]);
  return { ok: true };
}

function pushDesuscribir(codigo, endpoint) {
  var paciente = validarCodigo(codigo);
  if (!paciente || !endpoint) return { ok: false, error: 'ACCESO_DENEGADO' };
  var hoja = pushHoja_();
  var datos = hoja.getDataRange().getValues();
  for (var i = datos.length - 1; i >= 1; i--) {
    if (String(datos[i][1]) === String(paciente.id) && String(datos[i][2]) === String(endpoint)) hoja.deleteRow(i + 1);
  }
  return { ok: true };
}

function pushSuscripcionesPaciente(clave, pacienteId) {
  if (!esAdminSeguro(clave) || !pacienteId) return { ok: false, error: 'NO_AUTORIZADO' };
  var datos = pushHoja_().getDataRange().getValues();
  var suscripciones = [];
  for (var i = 1; i < datos.length; i++) if (String(datos[i][1]) === String(pacienteId)) suscripciones.push({ endpoint: datos[i][2], p256dh: datos[i][3], auth: datos[i][4] });
  return { ok: true, suscripciones: suscripciones };
}

function pushEliminarEndpoints(clave, endpoints) {
  if (!esAdminSeguro(clave) || !endpoints) return { ok: false, error: 'NO_AUTORIZADO' };
  var mapa = {}; endpoints.forEach(function(endpoint) { mapa[String(endpoint)] = true; });
  var hoja = pushHoja_(); var datos = hoja.getDataRange().getValues();
  for (var i = datos.length - 1; i >= 1; i--) if (mapa[String(datos[i][2])]) hoja.deleteRow(i + 1);
  return { ok: true };
}

function pushLogHoja_() {
  var libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  var hoja = libro.getSheetByName('PUSH_LOG');
  if (!hoja) { hoja = libro.insertSheet('PUSH_LOG'); hoja.appendRow(['id', 'plan_id', 'tipo', 'enviado_en']); }
  return hoja;
}

function pushPlanesPorVencer(clave) {
  if (!esAdminSeguro(clave)) return { ok: false, error: 'NO_AUTORIZADO' };
  var ciclos = hojaAObjetos(ciclosHoja_());
  var logs = pushLogHoja_().getDataRange().getValues();
  var enviados = {};
  for (var i = 1; i < logs.length; i++) enviados[String(logs[i][1]) + '|' + String(logs[i][2])] = true;
  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  var recordatorios = [];
  ciclos.forEach(function(ciclo) {
    if (String(ciclo.estado).toUpperCase() !== 'ACTIVO' || !ciclo.fecha_fin) return;
    var fin = ciclo.fecha_fin instanceof Date ? new Date(ciclo.fecha_fin) : new Date(String(ciclo.fecha_fin) + 'T00:00:00');
    fin.setHours(0, 0, 0, 0);
    var dias = Math.round((fin.getTime() - hoy.getTime()) / 86400000);
    if ((dias === 7 || dias === 1) && !enviados[String(ciclo.id) + '|VENCE_' + dias]) recordatorios.push({ plan_id: ciclo.id, paciente_id: ciclo.paciente_id, titulo: 'Plan nutricional', fecha_fin: Utilities.formatDate(fin, Session.getScriptTimeZone(), 'dd/MM/yyyy'), dias: dias });
  });
  return { ok: true, recordatorios: recordatorios };
}

function pushMarcarRecordatorio(clave, planId, dias) {
  if (!esAdminSeguro(clave) || !planId) return { ok: false, error: 'NO_AUTORIZADO' };
  var ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  pushLogHoja_().appendRow(['log_' + new Date().getTime(), planId, 'VENCE_' + dias, ahora]);
  return { ok: true };
}

// Compatibilidad con clientes administrativos anteriores. Las notificaciones
// se entregan desde Vercel; Apps Script valida y devuelve los destinatarios.
function notifEnviarNuevoPlan(clave, pacienteId, titulo) {
  if (!esAdminSeguro(clave) || !pacienteId) return { ok: false, error: 'NO_AUTORIZADO' };
  return { ok: true, paciente_id: String(pacienteId), titulo: String(titulo || 'Tu nuevo plan esta listo') };
}

function notifEnviarRenovacion(clave, pacienteId, fechaFin) {
  if (!esAdminSeguro(clave) || !pacienteId) return { ok: false, error: 'NO_AUTORIZADO' };
  return { ok: true, paciente_id: String(pacienteId), fecha_fin: fechaFin || '' };
}
