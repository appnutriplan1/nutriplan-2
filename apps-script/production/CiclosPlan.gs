/**
 * Ciclos mensuales y entregas semanales.
 * Es compatible con PLANES existentes: agrega ciclo_id y numero_semana si faltan.
 */

function ciclosHoja_() {
  var libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  var hoja = libro.getSheetByName('CICLOS_PLAN');
  if (!hoja) {
    hoja = libro.insertSheet('CICLOS_PLAN');
    hoja.appendRow(['id', 'paciente_id', 'fecha_inicio', 'fecha_fin', 'estado', 'creado_en', 'actualizado_en']);
  }
  return hoja;
}

function planesAsegurarColumnas_() {
  var hoja = obtenerHoja('PLANES');
  var ultima = Math.max(hoja.getLastColumn(), 1);
  var encabezados = hoja.getRange(1, 1, 1, ultima).getValues()[0];
  ['ciclo_id', 'numero_semana'].forEach(function(campo) {
    if (encabezados.indexOf(campo) < 0) {
      hoja.getRange(1, hoja.getLastColumn() + 1).setValue(campo);
      encabezados.push(campo);
    }
  });
  return hoja;
}

function inicializarModeloCiclosPlan() {
  ciclosHoja_();
  planesAsegurarColumnas_();
  return 'CICLOS_PLAN creada y PLANES actualizado';
}

function adminGuardarCiclo(clave, ciclo) {
  if (!esAdminSeguro(clave) || !ciclo || !ciclo.paciente_id || !ciclo.fecha_inicio || !ciclo.fecha_fin) return { ok: false, error: 'DATOS_INVALIDOS' };
  var inicio = new Date(String(ciclo.fecha_inicio) + 'T00:00:00');
  var fin = new Date(String(ciclo.fecha_fin) + 'T00:00:00');
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin < inicio) return { ok: false, error: 'FECHAS_INVALIDAS' };
  var hoja = ciclosHoja_();
  var datos = hoja.getDataRange().getValues();
  var ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][1]) === String(ciclo.paciente_id) && String(datos[i][4]).toUpperCase() === 'ACTIVO') hoja.getRange(i + 1, 5).setValue('FINALIZADO');
  }
  var id = ciclo.id || ('ciclo_' + new Date().getTime());
  hoja.appendRow([id, ciclo.paciente_id, ciclo.fecha_inicio, ciclo.fecha_fin, 'ACTIVO', ahora, ahora]);
  planesAsegurarColumnas_();
  return { ok: true, ciclo: { id: id, paciente_id: ciclo.paciente_id, fecha_inicio: ciclo.fecha_inicio, fecha_fin: ciclo.fecha_fin, estado: 'ACTIVO' } };
}

function cicloActivoPaciente_(pacienteId, cicloId) {
  var ciclos = hojaAObjetos(ciclosHoja_());
  for (var i = 0; i < ciclos.length; i++) {
    if (String(ciclos[i].paciente_id) === String(pacienteId) && String(ciclos[i].estado).toUpperCase() === 'ACTIVO' && (!cicloId || String(ciclos[i].id) === String(cicloId))) return ciclos[i];
  }
  return null;
}

function siguienteSemana_(pacienteId, cicloId) {
  var planes = hojaAObjetos(planesAsegurarColumnas_());
  var mayor = 0;
  planes.forEach(function(plan) {
    if (String(plan.paciente_id) === String(pacienteId) && (!cicloId || String(plan.ciclo_id) === String(cicloId))) mayor = Math.max(mayor, Number(plan.numero_semana) || 0);
  });
  return mayor + 1;
}
