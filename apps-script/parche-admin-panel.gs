/*
 * Panel privado NutriPlan. Pegar al final de Codigo.gs.
 * Añade también estos casos dentro de switch (accion) en manejarSolicitud:
 * case 'admin_resumen': return responder(adminResumen(params.admin_password));
 * case 'admin_guardar_paciente': return responder(adminGuardarPaciente(params.admin_password, params.paciente));
 * case 'admin_guardar_plan': return responder(adminGuardarPlan(params.admin_password, params.plan));
 * case 'admin_generar_codigo': return responder(adminGenerarCodigo(params.admin_password, params.paciente_id));
 * case 'admin_guardar_recurso': return responder(adminGuardarRecurso(params.admin_password, params.recurso));
 * case 'admin_eliminar_recurso': return responder(adminEliminarRecurso(params.admin_password, params.recurso_id));
 */
function esAdminSeguro(clave) {
  const esperada = PropertiesService.getScriptProperties().getProperty('ADMIN_API_SECRET');
  return !!esperada && !!clave && String(clave) === String(esperada);
}

function adminResumen(clave) {
  if (!esAdminSeguro(clave)) return { ok: false, error: 'NO_AUTORIZADO' };
  const pacientes = hojaAObjetos(obtenerHoja('PACIENTES'));
  const recursos = hojaAObjetos(obtenerHoja('RECURSOS'));
  const planes = hojaAObjetos(obtenerHoja('PLANES'));
  const seguimiento = hojaAObjetos(obtenerHoja('SEGUIMIENTO'));
  return { ok: true, pacientes: pacientes, recursos: recursos, planes: planes, seguimiento: seguimiento };
}

function adminGuardarPaciente(clave, paciente) {
  if (!esAdminSeguro(clave) || !paciente || !paciente.nombre || !paciente.talla_cm || !paciente.objetivo) return { ok: false, error: 'DATOS_INVALIDOS' };
  const hoja = obtenerHoja('PACIENTES');
  const encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const valores = hoja.getDataRange().getValues();
  const id = paciente.id || ('pac_' + new Date().getTime());
  const colId = encabezados.indexOf('id');
  let fila = -1;
  for (let i = 1; i < valores.length; i++) if (String(valores[i][colId]) === String(id)) fila = i + 1;
  if (fila < 0) fila = hoja.getLastRow() + 1;
  const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const nuevo = { id: id, codigo_acceso: paciente.codigo_acceso || '', estado: paciente.estado || 'ACTIVO', nombre: paciente.nombre, correo: paciente.correo || '', sexo: paciente.sexo === 'M' ? 'M' : 'F', fecha_nacimiento: paciente.fecha_nacimiento || '', talla_cm: paciente.talla_cm, objetivo: paciente.objetivo, fecha_actualizacion: hoy, notas: paciente.notas || '' };
  encabezados.forEach((campo, indice) => { if (Object.prototype.hasOwnProperty.call(nuevo, campo)) hoja.getRange(fila, indice + 1).setValue(nuevo[campo]); });
  return { ok: true, paciente: nuevo };
}

function adminGuardarPlan(clave, plan) {
  if (!esAdminSeguro(clave) || !plan || !plan.paciente_id || !plan.titulo || !plan.url_pdf || !plan.fecha_inicio) return { ok: false, error: 'DATOS_INVALIDOS' };
  const hoja = obtenerHoja('PLANES');
  const encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const valores = hoja.getDataRange().getValues();
  const colPaciente = encabezados.indexOf('paciente_id');
  const colEstado = encabezados.indexOf('estado');
  if (colPaciente >= 0 && colEstado >= 0) {
    for (let i = 1; i < valores.length; i++) {
      if (String(valores[i][colPaciente]) === String(plan.paciente_id) && String(valores[i][colEstado]).toUpperCase() === 'VIGENTE') {
        hoja.getRange(i + 1, colEstado + 1).setValue('ARCHIVADO');
      }
    }
  }
  const id = 'plan_' + new Date().getTime();
  const nuevo = { id: id, paciente_id: plan.paciente_id, titulo: plan.titulo, url_pdf: plan.url_pdf, estado: 'VIGENTE', fecha_inicio: plan.fecha_inicio, fecha_fin: plan.fecha_fin || '', kcal_objetivo: plan.kcal_objetivo || '', proteinas_g: plan.proteinas_g || '', carbohidratos_g: plan.carbohidratos_g || '', grasas_g: plan.grasas_g || '' };
  hoja.appendRow(encabezados.map((campo) => Object.prototype.hasOwnProperty.call(nuevo, campo) ? nuevo[campo] : ''));
  return { ok: true, plan: nuevo };
}

function codigoPanelAleatorio() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bloque = function () { let salida = ''; for (let i = 0; i < 4; i++) salida += alfabeto.charAt(Math.floor(Math.random() * alfabeto.length)); return salida; };
  return 'nc_' + bloque() + '-' + bloque() + '-' + bloque();
}

function adminGenerarCodigo(clave, pacienteId) {
  if (!esAdminSeguro(clave) || !pacienteId) return { ok: false, error: 'NO_AUTORIZADO' };
  const hoja = obtenerHoja('PACIENTES'); const valores = hoja.getDataRange().getValues(); const encabezados = valores[0];
  const colId = encabezados.indexOf('id'); const colCodigo = encabezados.indexOf('codigo_acceso');
  if (colId < 0 || colCodigo < 0) return { ok: false, error: 'COLUMNAS_INVALIDAS' };
  const usados = {}; valores.slice(1).forEach((fila) => { if (fila[colCodigo]) usados[String(fila[colCodigo])] = true; });
  for (let i = 1; i < valores.length; i++) if (String(valores[i][colId]) === String(pacienteId)) {
    let codigo; do { codigo = codigoPanelAleatorio(); } while (usados[codigo]);
    hoja.getRange(i + 1, colCodigo + 1).setValue(codigo);
    return { ok: true, codigo: codigo };
  }
  return { ok: false, error: 'PACIENTE_NO_ENCONTRADO' };
}

function adminGuardarRecurso(clave, recurso) {
  if (!esAdminSeguro(clave) || !recurso || !recurso.plan_id || !recurso.titulo || !recurso.url_pdf) return { ok: false, error: 'DATOS_INVALIDOS' };
  const hoja = obtenerHoja('RECURSOS'); const valores = hoja.getDataRange().getValues(); const encabezados = valores[0]; const colId = encabezados.indexOf('id');
  const id = recurso.id || ('rec_' + new Date().getTime()); let fila = -1;
  for (let i = 1; i < valores.length; i++) if (String(valores[i][colId]) === String(id)) fila = i + 1;
  if (fila < 0) fila = hoja.getLastRow() + 1;
  const objeto = { id: id, plan_id: recurso.plan_id, tipo: recurso.tipo || 'OTRO', titulo: recurso.titulo, url_pdf: recurso.url_pdf, orden: recurso.orden || 1 };
  encabezados.forEach((campo, indice) => { if (Object.prototype.hasOwnProperty.call(objeto, campo)) hoja.getRange(fila, indice + 1).setValue(objeto[campo]); });
  return { ok: true, recurso: objeto };
}

function adminEliminarRecurso(clave, recursoId) {
  if (!esAdminSeguro(clave) || !recursoId) return { ok: false, error: 'NO_AUTORIZADO' };
  const hoja = obtenerHoja('RECURSOS'); const valores = hoja.getDataRange().getValues(); const colId = valores[0].indexOf('id');
  for (let i = 1; i < valores.length; i++) if (String(valores[i][colId]) === String(recursoId)) { hoja.deleteRow(i + 1); return { ok: true }; }
  return { ok: false, error: 'RECURSO_NO_ENCONTRADO' };
}

function adminDespachar(clave, params) {
  switch (String(params.admin_action || '')) {
    case 'admin_guardar_seguimiento': return adminGuardarSeguimiento(clave, params.seguimiento);
    default: return { ok: false, error: 'ACCION_DESCONOCIDA' };
  }
}

function adminGuardarSeguimiento(clave, seguimiento) {
  if (!esAdminSeguro(clave) || !seguimiento || !seguimiento.paciente_id || !seguimiento.fecha) return { ok: false, error: 'DATOS_INVALIDOS' };
  const hoja = obtenerHoja('SEGUIMIENTO');
  const encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const id = seguimiento.id || ('seg_' + new Date().getTime());
  const nuevo = {
    id: id, paciente_id: seguimiento.paciente_id, fecha: seguimiento.fecha,
    peso_kg: seguimiento.peso_kg || '', cintura_cm: seguimiento.cintura_cm || '',
    talla_cm: seguimiento.talla_cm || '', grasa_pct: seguimiento.grasa_pct || '',
    glucosa: seguimiento.glucosa || '', trigliceridos: seguimiento.trigliceridos || '',
    colesterol: seguimiento.colesterol || '', hemoglobina: seguimiento.hemoglobina || '',
    notas: seguimiento.notas || ''
  };
  hoja.appendRow(encabezados.map((campo) => Object.prototype.hasOwnProperty.call(nuevo, campo) ? nuevo[campo] : ''));
  return { ok: true, seguimiento: nuevo };
}
