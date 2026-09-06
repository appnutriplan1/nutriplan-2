/**
 * NutriCook — Apps Script COMPLETO (consolidado)
 *
 * ⚠️ ARCHIVO DEFINITIVO PARA PEGAR EN script.google.com
 *
 * Este archivo contiene TODO el código (sin fragmentación en parches).
 * Incluye: proxy seguro, admin CRUD, salud laboral, educación,
 * recursos, rutinas, y generador de códigos de acceso.
 *
 * INSTRUCCIONES:
 * 1. Abre https://script.google.com
 * 2. Copia TODO este archivo (Ctrl+A → Ctrl+C aquí)
 * 3. Abre tu proyecto "NutriCook" en script.google.com
 * 4. Borra TODO el contenido (Ctrl+A → Delete)
 * 5. Pega este archivo completo (Ctrl+V)
 * 6. Guarda (Ctrl+S)
 * 7. Deploy → New deployment → Web app
 * 8. Copia la URL nueva en tu .env
 */

const SPREADSHEET_ID = 'REEMPLAZAR_CON_ID_NUTRIPLAN_1';

// ───────────────────────── ENRUTAMIENTO HTTP ─────────────────────────

function doGet(e) {
  return manejarSolicitud(e);
}

function doPost(e) {
  return manejarSolicitud(e);
}

function manejarSolicitud(e) {
  try {
    var params = leerParametros(e);
    var accion = params.action;
    switch (accion) {
      case 'login': return responder(login(params.codigo_acceso));
      case 'push_suscribir': return responder(pushSuscribir(params.codigo_acceso, params.suscripcion));
      case 'push_desuscribir': return responder(pushDesuscribir(params.codigo_acceso, params.endpoint));
      case 'push_suscripciones_paciente': return responder(pushSuscripcionesPaciente(params.admin_password, params.paciente_id));
      case 'push_eliminar_endpoints': return responder(pushEliminarEndpoints(params.admin_password, params.endpoints));
      case 'push_planes_por_vencer': return responder(pushPlanesPorVencer(params.admin_password));
      case 'push_marcar_recordatorio': return responder(pushMarcarRecordatorio(params.admin_password, params.plan_id, params.dias));
      case 'planes': return responder(obtenerPlanesSeguro(params.codigo_acceso));
      case 'seguimiento': return responder(obtenerSeguimientoSeguro(params.codigo_acceso));
      case 'recursos': return responder(obtenerRecursosSeguro(params.codigo_acceso));
      case 'pdf': return responder(obtenerPlanPdfSeguro_(params.codigo_acceso, params.plan_id));
      case 'recurso': return responder(obtenerRecursoPdf(params.codigo_acceso, params.recurso_id));
      case 'alimentos': return responder(obtenerAlimentosPublico());
      case 'cookbooks': return responder(obtenerCookbooksPublicos());
      case 'educacion': return responder(obtenerEducacion(params.codigo_acceso));
      case 'rutinas': return responder(obtenerRutinasSeguro(params.codigo_acceso));
      case 'generar_codigo_suscriptor': return responder(generarCodigoSuscriptor(params.email, params.nombre));
      case 'crear_suscriptor': return responder(crearSuscriptor(params.codigo, params.email, params.nombre));
      case 'admin_resumen':
        if (params.laboral_action) return responder(laboralDespachar(params.admin_password, params));
        if (params.admin_action) return responder(adminDespachar(params.admin_password, params));
        return responder(adminResumen(params.admin_password));
      case 'admin_guardar_paciente': return responder(adminGuardarPaciente(params.admin_password, params.paciente));
      case 'admin_guardar_plan': return responder(adminGuardarPlan(params.admin_password, params.plan));
      case 'admin_guardar_ciclo': return responder(adminGuardarCiclo(params.admin_password, params.ciclo));
      case 'admin_generar_codigo': return responder(adminGenerarCodigo(params.admin_password, params.paciente_id));
      case 'receta_permisos': return responder(obtenerPermisosRecetas());
      case 'admin_guardar_recurso': return responder(adminGuardarRecurso(params.admin_password, params.recurso));
      case 'admin_eliminar_recurso': return responder(adminEliminarRecurso(params.admin_password, params.recurso_id));
      case 'admin_guardar_permiso_receta': return responder(adminGuardarPermisoReceta(params.admin_password, params.permiso));
      case 'admin_guardar_permisos_recetas': return responder(adminGuardarPermisosRecetas(params.admin_password, params.permisos));
      case 'admin_inicializar_permisos_recetas': return responder(adminInicializarPermisosRecetas(params.admin_password, params.permisos));
      case 'laboral_resumen': return responder(laboralResumen(params.admin_password));
      case 'laboral_guardar_empresa': return responder(laboralGuardarEmpresa(params.admin_password, params.empresa));
      case 'laboral_guardar_jornada': return responder(laboralGuardarJornada(params.admin_password, params.jornada));
      case 'laboral_guardar_evaluacion': return responder(laboralGuardarEvaluacion(params.admin_password, params.evaluacion));
      case 'laboral_eliminar_evaluacion': return responder(laboralEliminarEvaluacion(params.admin_password, params.evaluacion_id));
      case 'laboral_guardar_checklist': return responder(laboralGuardarChecklist(params.admin_password, params.jornada_id, params.checklist_json));
      case 'notif_nuevo_plan': return responder(notifEnviarNuevoPlan(params.admin_password, params.paciente_id, params.titulo));
      case 'notif_renovar_plan': return responder(notifEnviarRenovacion(params.admin_password, params.paciente_id, params.fecha_fin));
      default: return responder({ ok: false, error: 'ACCION_DESCONOCIDA' });
    }
  } catch (err) {
    return responder({ ok: false, error: 'ERROR_SERVIDOR' });
  }
}

function leerParametros(e) {
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      // Caer a parámetros de query si el body no es JSON válido
    }
  }
  return e.parameter || {};
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// ───────────────────────── ACCESO A HOJAS ─────────────────────────

function obtenerHoja(nombre) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(nombre);
}

function hojaAObjetos(hoja) {
  const valores = hoja.getDataRange().getValues();
  const encabezados = valores[0];
  const filas = valores.slice(1);
  return filas
    .filter((fila) => fila.some((celda) => celda !== '' && celda !== null))
    .map((fila) => {
      const obj = {};
      encabezados.forEach((encabezado, i) => {
        obj[encabezado] = fila[i];
      });
      return obj;
    });
}

// ───────────────────────── LÓGICA DE NEGOCIO ─────────────────────────

function validarCodigo(codigoAcceso) {
  if (!codigoAcceso) return null;
  const pacientes = hojaAObjetos(obtenerHoja('PACIENTES'));
  const paciente = pacientes.find((p) => String(p.codigo_acceso) === String(codigoAcceso));
  if (!paciente || paciente.estado !== 'ACTIVO') return null;
  return paciente;
}

function login(codigoAcceso) {
  const paciente = validarCodigo(codigoAcceso);
  if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };

  return {
    ok: true,
    paciente: quitarCodigoAcceso(paciente),
    planes: planesDePaciente(paciente.id),
    seguimiento: seguimientoDePaciente(paciente.id),
  };
}

function obtenerPlanesSeguro(codigoAcceso) {
  const paciente = validarCodigo(codigoAcceso);
  if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };
  return { ok: true, planes: planesDePaciente(paciente.id) };
}

function obtenerSeguimientoSeguro(codigoAcceso) {
  const paciente = validarCodigo(codigoAcceso);
  if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };
  return { ok: true, seguimiento: seguimientoDePaciente(paciente.id) };
}

function obtenerAlimentosPublico() {
  return { ok: true, alimentos: hojaAObjetos(obtenerHoja('ALIMENTOS')) };
}

function obtenerCookbooksPublicos() {
  const libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hoja = libro.getSheetByName('COOKBOOKS') || libro.getSheetByName('RECETAS');
  if (!hoja) return { ok: true, cookbooks: [] };

  const visibles = hojaAObjetos(hoja).filter((c) => {
    const estado = String(c.estado || '').trim().toUpperCase();
    return estado !== 'BORRADOR' && estado !== 'OCULTO' && estado !== 'INACTIVO';
  });
  return { ok: true, cookbooks: visibles };
}

function obtenerEducacion(codigoAcceso) {
  const libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  const hojaTemas = libro.getSheetByName('EDUCACION') || libro.getSheetByName('EDUCACIÓN');
  const hojaLaminas = libro.getSheetByName('EDUCACION_LAMINAS');
  if (!hojaTemas) return { ok: true, educacion: [], laminasEducacion: [] };

  const paciente = validarCodigo(codigoAcceso);
  const temas = hojaAObjetos(hojaTemas).filter((tema) => {
    const estado = String(tema.estado || '').trim().toUpperCase();
    const acceso = String(tema.acceso || '').trim().toUpperCase();
    if (estado !== 'ACTIVO') return false;
    return acceso === 'PUBLICO' || (paciente && acceso === 'PACIENTE');
  }).map((tema) => ({
    id: tema.id,
    titulo: tema.titulo,
    categoria: tema.categoria,
    descripcion: tema.descripcion,
    portada_url: tema.portada_url,
    acceso: tema.acceso,
    orden: tema.orden,
  }));

  const idsVisibles = {};
  temas.forEach((tema) => { idsVisibles[String(tema.id)] = true; });
  const laminas = hojaLaminas ? hojaAObjetos(hojaLaminas).filter((lamina) =>
    idsVisibles[String(lamina.educacion_id)],
  ).map((lamina) => ({
    id: lamina.id,
    educacion_id: lamina.educacion_id,
    imagen_url: lamina.imagen_url,
    orden: lamina.orden,
    descripcion: lamina.descripcion,
  })) : [];

  return { ok: true, educacion: temas, laminasEducacion: laminas };
}

function planesDePaciente(pacienteId) {
  return hojaAObjetos(obtenerHoja('PLANES')).filter(
    (p) => String(p.paciente_id) === String(pacienteId),
  );
}

function seguimientoDePaciente(pacienteId) {
  return hojaAObjetos(obtenerHoja('SEGUIMIENTO')).filter(
    (s) => String(s.paciente_id) === String(pacienteId),
  );
}

function obtenerRecursosSeguro(codigoAcceso) {
  var paciente = validarCodigo(codigoAcceso);
  if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };
  return { ok: true, recursos: recursosDePaciente(paciente.id) };
}

function recursosDePaciente(pacienteId) {
  var idsPlanes = planesDePaciente(pacienteId).map(function (p) {
    return String(p.id);
  });
  return hojaAObjetos(obtenerHoja('RECURSOS')).filter(function (r) {
    return idsPlanes.indexOf(String(r.plan_id)) !== -1;
  });
}

function quitarCodigoAcceso(paciente) {
  const copia = Object.assign({}, paciente);
  delete copia.codigo_acceso;
  return copia;
}

function obtenerPlanPdfSeguro_(codigoAcceso, planId) {
  var paciente = validarCodigo(codigoAcceso);
  if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };
  var planes = planesDePaciente(paciente.id);
  var plan = null;
  for (var i = 0; i < planes.length; i++) {
    if (String(planes[i].id) === String(planId)) {
      plan = planes[i];
      break;
    }
  }
  if (!plan || !plan.url_pdf) return { ok: false, error: 'ACCESO_DENEGADO' };
  var idArchivo = extraerIdDeDrive_(plan.url_pdf);
  if (!idArchivo) return { ok: false, error: 'ERROR_SERVIDOR' };
  var archivo = DriveApp.getFileById(idArchivo);
  return {
    ok: true,
    base64: Utilities.base64Encode(archivo.getBlob().getBytes()),
    mime: 'application/pdf'
  };
}

function obtenerRecursoPdf(codigoAcceso, recursoId) {
  var paciente = validarCodigo(codigoAcceso);
  if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };

  var recursos = recursosDePaciente(paciente.id);
  var recurso = null;
  for (var i = 0; i < recursos.length; i++) {
    if (String(recursos[i].id) === String(recursoId)) {
      recurso = recursos[i];
      break;
    }
  }
  if (!recurso || !recurso.url_pdf) return { ok: false, error: 'ACCESO_DENEGADO' };

  var id = extraerIdDeDrive_(recurso.url_pdf);
  if (!id) return { ok: false, error: 'ERROR_SERVIDOR' };

  var archivo = DriveApp.getFileById(id);
  return {
    ok: true,
    base64: Utilities.base64Encode(archivo.getBlob().getBytes()),
    mime: 'application/pdf',
  };
}

function extraerIdDeDrive_(url) {
  var patrones = [/\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/];
  for (var i = 0; i < patrones.length; i++) {
    var m = String(url).match(patrones[i]);
    if (m) return m[1];
  }
  return null;
}

function obtenerRutinasSeguro(codigoAcceso) {
  var paciente = validarCodigo(codigoAcceso);
  if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };

  var libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  var hojaAsignaciones = libro.getSheetByName('PACIENTE_RUTINAS');
  var hojaRutinas = libro.getSheetByName('RUTINAS');
  var hojaLineas = libro.getSheetByName('RUTINA_EJERCICIOS');
  var hojaEjercicios = libro.getSheetByName('EJERCICIOS');

  if (!hojaAsignaciones || !hojaRutinas || !hojaLineas || !hojaEjercicios) {
    return { ok: true, rutinas: [], rutinaEjercicios: [], ejercicios: [] };
  }

  var asignaciones = hojaAObjetos(hojaAsignaciones).filter(function(asignacion) {
    return String(asignacion.paciente_id) === String(paciente.id) &&
      String(asignacion.estado || '').trim().toUpperCase() === 'ACTIVO';
  });
  var idsRutinaAsignados = asignaciones.map(function(asignacion) {
    return String(asignacion.rutina_id);
  });

  var rutinas = hojaAObjetos(hojaRutinas).filter(function(rutina) {
    return idsRutinaAsignados.indexOf(String(rutina.id)) !== -1 &&
      String(rutina.estado || '').trim().toUpperCase() === 'ACTIVO';
  });
  var idsRutina = rutinas.map(function(rutina) { return String(rutina.id); });

  var rutinaEjercicios = hojaAObjetos(hojaLineas).filter(function(linea) {
    return idsRutina.indexOf(String(linea.rutina_id)) !== -1;
  });
  var idsEjercicio = rutinaEjercicios.map(function(linea) {
    return String(linea.ejercicio_id);
  });

  var ejercicios = hojaAObjetos(hojaEjercicios).filter(function(ejercicio) {
    return idsEjercicio.indexOf(String(ejercicio.id)) !== -1 &&
      String(ejercicio.estado || '').trim().toUpperCase() === 'ACTIVO';
  });

  return {
    ok: true,
    rutinas: rutinas,
    rutinaEjercicios: rutinaEjercicios,
    ejercicios: ejercicios
  };
}

// ───────────────────────── CÓDIGOS DE ACCESO ─────────────────────────

function crearSuscriptor(codigo, email, nombre) {
  if (!codigo || !email) {
    return { ok: false, error: 'Código y email requeridos' };
  }

  const hoja = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('PACIENTES');
  if (!hoja) return { ok: false, error: 'Pestaña PACIENTES no encontrada' };

  const datos = hoja.getDataRange().getValues();
  const encabezados = datos[0];
  const colCodigo = encabezados.indexOf('codigo_acceso');
  const colNombre = encabezados.indexOf('nombre');
  const colEstado = encabezados.indexOf('estado');
  const colCorreo = encabezados.indexOf('correo');

  if (colCodigo === -1) return { ok: false, error: 'Columna codigo_acceso no encontrada' };

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][colCodigo] === codigo) {
      return { ok: false, error: 'Código ya existe' };
    }
  }

  const nuevaFila = new Array(encabezados.length).fill('');
  nuevaFila[colCodigo] = codigo;
  if (colCorreo !== -1) nuevaFila[colCorreo] = email;
  if (colNombre !== -1) nuevaFila[colNombre] = nombre || 'Suscriptor';
  if (colEstado !== -1) nuevaFila[colEstado] = 'ACTIVO';

  hoja.appendRow(nuevaFila);

  return { ok: true, mensaje: 'Suscriptor creado', codigo };
}

function generarCodigoSuscriptor(email, nombre) {
  if (!email) {
    return { ok: false, error: 'Email requerido' };
  }

  const hoja = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('PACIENTES');
  if (!hoja) return { ok: false, error: 'Pestaña PACIENTES no encontrada' };

  const codigo = `NCNWTH-${generarBloqueAleatorio(4)}-${generarBloqueAleatorio(4)}-${generarBloqueAleatorio(4)}`;

  const datos = hoja.getDataRange().getValues();
  const encabezados = datos[0];
  const colCodigo = encabezados.indexOf('codigo_acceso');
  const colNombre = encabezados.indexOf('nombre');
  const colEstado = encabezados.indexOf('estado');
  const colCorreo = encabezados.indexOf('correo');

  if (colCodigo === -1) return { ok: false, error: 'Columna codigo_acceso no encontrada' };

  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][colCodigo]) === codigo) {
      return { ok: false, error: 'Código duplicado, reintenta' };
    }
  }

  const nuevaFila = new Array(encabezados.length).fill('');
  nuevaFila[colCodigo] = codigo;
  if (colCorreo !== -1) nuevaFila[colCorreo] = email;
  if (colNombre !== -1) nuevaFila[colNombre] = nombre || 'Suscriptor';
  if (colEstado !== -1) nuevaFila[colEstado] = 'ACTIVO';

  hoja.appendRow(nuevaFila);

  return { ok: true, codigo, email };
}

function generarBloqueAleatorio(largo) {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let resultado = '';
  for (let i = 0; i < largo; i++) {
    const indice = Math.floor(Math.random() * alfabeto.length);
    resultado += alfabeto.charAt(indice);
  }
  return resultado;
}

// ───────────────────────── PANEL ADMINISTRATIVO ─────────────────────────

function esAdminSeguro(clave) {
  const esperada = PropertiesService.getScriptProperties().getProperty('ADMIN_API_SECRET');
  return !!esperada && !!clave && String(clave) === String(esperada);
}

function adminResumen(clave) {
  if (!esAdminSeguro(clave)) return { ok: false, error: 'NO_AUTORIZADO' };
  const pacientes = hojaAObjetos(obtenerHoja('PACIENTES'));
  const recursos = hojaAObjetos(obtenerHoja('RECURSOS'));
  const planes = hojaAObjetos(planesAsegurarColumnas_());
  const ciclos_plan = hojaAObjetos(ciclosHoja_());
  const seguimiento = hojaAObjetos(obtenerHoja('SEGUIMIENTO'));
  return { ok: true, pacientes: pacientes, recursos: recursos, planes: planes, ciclos_plan: ciclos_plan, seguimiento: seguimiento };
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
  const hoja = planesAsegurarColumnas_();
  const ciclo = cicloActivoPaciente_(plan.paciente_id, plan.ciclo_id);
  const numeroSemana = Number(plan.numero_semana) > 0 ? Number(plan.numero_semana) : siguienteSemana_(plan.paciente_id, ciclo ? ciclo.id : plan.ciclo_id);
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
  const nuevo = { id: id, paciente_id: plan.paciente_id, ciclo_id: ciclo ? ciclo.id : (plan.ciclo_id || ''), numero_semana: numeroSemana, titulo: plan.titulo, url_pdf: plan.url_pdf, estado: 'VIGENTE', fecha_inicio: ciclo ? ciclo.fecha_inicio : plan.fecha_inicio, fecha_fin: ciclo ? ciclo.fecha_fin : (plan.fecha_fin || ''), kcal_objetivo: plan.kcal_objetivo || '', proteinas_g: plan.proteinas_g || '', carbohidratos_g: plan.carbohidratos_g || '', grasas_g: plan.grasas_g || '' };
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

function obtenerOCrearHojaPermisosRecetas() {
  const libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja = libro.getSheetByName('RECETA_PERMISOS');
  if (!hoja) {
    hoja = libro.insertSheet('RECETA_PERMISOS');
    hoja.appendRow(['recipe_id', 'tipo', 'mostrar_pacientes', 'visible', 'fecha_actualizacion']);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function obtenerPermisosRecetas() {
  const cache = CacheService.getScriptCache();
  const guardados = cache.get('receta_permisos_v1');
  if (guardados) {
    try { return { ok: true, permisos: JSON.parse(guardados) }; } catch (error) { /* releer hoja */ }
  }
  const permisos = hojaAObjetos(obtenerOCrearHojaPermisosRecetas()).map((fila) => ({
    recipe_id: String(fila.recipe_id || ''),
    tipo: String(fila.tipo || 'GRATUITO').toUpperCase() === 'PREMIUM' ? 'PREMIUM' : 'GRATUITO',
    mostrar_pacientes: String(fila.mostrar_pacientes).toUpperCase() === 'TRUE',
    visible: String(fila.visible).toUpperCase() !== 'FALSE',
  }));
  cache.put('receta_permisos_v1', JSON.stringify(permisos), 60);
  return { ok: true, permisos };
}

function adminGuardarPermisoReceta(clave, permiso) {
  if (!esAdminSeguro(clave)) return { ok: false, error: 'NO_AUTORIZADO' };
  if (typeof permiso === 'string') {
    try { permiso = JSON.parse(permiso); } catch (error) { return { ok: false, error: 'DATOS_INVALIDOS' }; }
  }
  if (!permiso || !permiso.recipe_id) return { ok: false, error: 'DATOS_INVALIDOS' };

  const hoja = obtenerOCrearHojaPermisosRecetas();
  const datos = hoja.getDataRange().getValues();
  const encabezados = datos[0];
  const colId = encabezados.indexOf('recipe_id');
  let fila = -1;
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][colId]) === String(permiso.recipe_id)) { fila = i + 1; break; }
  }
  const valores = [
    String(permiso.recipe_id),
    String(permiso.tipo).toUpperCase() === 'PREMIUM' ? 'PREMIUM' : 'GRATUITO',
    permiso.mostrar_pacientes === true,
    permiso.visible !== false,
    new Date(),
  ];
  if (fila === -1) hoja.appendRow(valores);
  else hoja.getRange(fila, 1, 1, valores.length).setValues([valores]);
  CacheService.getScriptCache().remove('receta_permisos_v1');
  return { ok: true, permiso: valores };
}

function adminGuardarPermisosRecetas(clave, permisos) {
  if (!esAdminSeguro(clave)) return { ok: false, error: 'NO_AUTORIZADO' };
  if (!Array.isArray(permisos) || permisos.length < 1 || permisos.length > 1000) return { ok: false, error: 'DATOS_INVALIDOS' };

  const normalizados = permisos.map((permiso) => permiso && permiso.recipe_id ? [
    String(permiso.recipe_id),
    String(permiso.tipo).toUpperCase() === 'PREMIUM' ? 'PREMIUM' : 'GRATUITO',
    permiso.mostrar_pacientes === true,
    permiso.visible !== false,
    new Date(),
  ] : null);
  if (normalizados.some((permiso) => permiso === null)) return { ok: false, error: 'DATOS_INVALIDOS' };

  const bloqueo = LockService.getScriptLock();
  try {
    bloqueo.waitLock(15000);
    const hoja = obtenerOCrearHojaPermisosRecetas();
    const datos = hoja.getDataRange().getValues();
    const encabezados = datos[0];
    const colId = encabezados.indexOf('recipe_id');
    if (colId === -1) return { ok: false, error: 'ENCABEZADOS_INVALIDOS' };
    const porId = {};
    for (let i = 1; i < datos.length; i++) porId[String(datos[i][colId])] = datos[i];
    normalizados.forEach((permiso) => { porId[String(permiso[0])] = permiso; });
    const filas = Object.keys(porId).map((id) => porId[id]);
    if (filas.length) hoja.getRange(2, 1, filas.length, 5).setValues(filas);
    CacheService.getScriptCache().remove('receta_permisos_v1');
    return { ok: true, actualizados: normalizados.length };
  } catch (error) {
    return { ok: false, error: 'NO_SE_PUDO_GUARDAR' };
  } finally {
    if (bloqueo.hasLock()) bloqueo.releaseLock();
  }
}

function adminInicializarPermisosRecetas(clave, permisos) {
  if (!esAdminSeguro(clave)) return { ok: false, error: 'NO_AUTORIZADO' };
  if (!Array.isArray(permisos)) return { ok: false, error: 'DATOS_INVALIDOS' };
  const hoja = obtenerOCrearHojaPermisosRecetas();
  const existentes = hojaAObjetos(hoja).reduce((mapa, fila) => {
    mapa[String(fila.recipe_id)] = true;
    return mapa;
  }, {});
  const nuevas = permisos.filter((permiso) => permiso && permiso.recipe_id && !existentes[String(permiso.recipe_id)]);
  if (nuevas.length) {
    hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, 5).setValues(nuevas.map((permiso) => [
      String(permiso.recipe_id),
      String(permiso.tipo).toUpperCase() === 'PREMIUM' ? 'PREMIUM' : 'GRATUITO',
      permiso.mostrar_pacientes === true,
      permiso.visible !== false,
      new Date(),
    ]));
    CacheService.getScriptCache().remove('receta_permisos_v1');
  }
  return { ok: true, creados: nuevas.length, existentes: permisos.length - nuevas.length };
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

// ───────────────────────── SALUD LABORAL ─────────────────────────

const LABORAL_HOJAS = {
  EMPRESAS: ['id', 'ruc', 'nombre', 'contacto', 'correo', 'telefono', 'ciudad', 'direccion', 'notas'],
  JORNADAS_LABORALES: ['id', 'empresa_id', 'fecha', 'sede', 'paquete', 'capacidad', 'precio', 'estado', 'hora_inicio', 'hora_fin', 'checklist_json', 'notas'],
  EVALUACIONES_LABORALES: [
    'id', 'jornada_id', 'codigo', 'area', 'sexo', 'edad', 'peso_kg', 'talla_cm', 'imc',
    'cintura_cm', 'presion_sistolica', 'presion_diastolica', 'glucosa_mg_dl',
    'hemoglobina_g_dl', 'spo2', 'riesgo_pa', 'riesgo_glucosa', 'riesgo_anemia',
    'riesgo_spo2', 'notas', 'fecha_registro',
  ],
};

function laboralPrepararHojas() {
  const libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(LABORAL_HOJAS).forEach((nombre) => {
    let hoja = libro.getSheetByName(nombre);
    if (!hoja) hoja = libro.insertSheet(nombre);
    const encabezados = LABORAL_HOJAS[nombre];
    if (hoja.getLastRow() === 0) hoja.appendRow(encabezados);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, encabezados.length).setFontWeight('bold').setBackground('#2D6A4F').setFontColor('#FFFFFF');
  });
}

function laboralHoja(nombre) {
  const hoja = obtenerHoja(nombre);
  if (!hoja) throw new Error('HOJA_NO_CONFIGURADA_' + nombre);
  return hoja;
}

function laboralGuardarObjeto(nombreHoja, prefijo, objeto) {
  const hoja = laboralHoja(nombreHoja);
  const valores = hoja.getDataRange().getValues();
  const encabezados = valores[0];
  const colId = encabezados.indexOf('id');
  const id = objeto.id || (prefijo + '_' + new Date().getTime());
  let numeroFila = -1;
  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][colId]) === String(id)) numeroFila = i + 1;
  }
  if (numeroFila < 0) numeroFila = hoja.getLastRow() + 1;
  const guardado = Object.assign({}, objeto, { id: id });
  encabezados.forEach((campo, indice) => {
    if (Object.prototype.hasOwnProperty.call(guardado, campo)) {
      hoja.getRange(numeroFila, indice + 1).setValue(guardado[campo]);
    }
  });
  return guardado;
}

function laboralResumen(clave) {
  if (!esAdminSeguro(clave)) return { ok: false, error: 'NO_AUTORIZADO' };
  return {
    ok: true,
    empresas: hojaAObjetos(laboralHoja('EMPRESAS')),
    jornadas: hojaAObjetos(laboralHoja('JORNADAS_LABORALES')),
    evaluaciones: hojaAObjetos(laboralHoja('EVALUACIONES_LABORALES')),
  };
}

function laboralDespachar(clave, params) {
  switch (params.laboral_action) {
    case 'laboral_resumen':
      return laboralResumen(clave);
    case 'laboral_guardar_empresa':
      return laboralGuardarEmpresa(clave, params.empresa);
    case 'laboral_guardar_jornada':
      return laboralGuardarJornada(clave, params.jornada);
    case 'laboral_guardar_evaluacion':
      return laboralGuardarEvaluacion(clave, params.evaluacion);
    case 'laboral_eliminar_evaluacion':
      return laboralEliminarEvaluacion(clave, params.evaluacion_id);
    case 'laboral_guardar_checklist':
      return laboralGuardarChecklist(clave, params.jornada_id, params.checklist_json);
    default:
      return { ok: false, error: 'ACCION_LABORAL_DESCONOCIDA' };
  }
}

function laboralGuardarEmpresa(clave, empresa) {
  if (!esAdminSeguro(clave) || !empresa || !empresa.nombre) return { ok: false, error: 'DATOS_INVALIDOS' };
  return { ok: true, empresa: laboralGuardarObjeto('EMPRESAS', 'emp', empresa) };
}

function laboralGuardarJornada(clave, jornada) {
  if (!esAdminSeguro(clave) || !jornada || !jornada.empresa_id || !jornada.fecha || !jornada.paquete) {
    return { ok: false, error: 'DATOS_INVALIDOS' };
  }
  const guardada = Object.assign({ estado: 'PROGRAMADA', checklist_json: '{}', notas: '' }, jornada);
  return { ok: true, jornada: laboralGuardarObjeto('JORNADAS_LABORALES', 'jor', guardada) };
}

function laboralGuardarEvaluacion(clave, evaluacion) {
  if (!esAdminSeguro(clave) || !evaluacion || !evaluacion.jornada_id || !evaluacion.codigo) {
    return { ok: false, error: 'DATOS_INVALIDOS' };
  }
  const existentes = hojaAObjetos(laboralHoja('EVALUACIONES_LABORALES'));
  const duplicada = existentes.some((item) =>
    String(item.jornada_id) === String(evaluacion.jornada_id) &&
    String(item.codigo).toUpperCase() === String(evaluacion.codigo).trim().toUpperCase() &&
    String(item.id || '') !== String(evaluacion.id || '')
  );
  if (duplicada) return { ok: false, error: 'CODIGO_DUPLICADO' };

  const tallaM = Number(evaluacion.talla_cm) / 100;
  const peso = Number(evaluacion.peso_kg);
  const imc = tallaM > 0 && peso > 0 ? Math.round((peso / (tallaM * tallaM)) * 10) / 10 : '';
  const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const guardada = Object.assign({}, evaluacion, { imc: imc, fecha_registro: evaluacion.fecha_registro || hoy });
  return { ok: true, evaluacion: laboralGuardarObjeto('EVALUACIONES_LABORALES', 'eva', guardada) };
}

function laboralEliminarEvaluacion(clave, evaluacionId) {
  if (!esAdminSeguro(clave) || !evaluacionId) return { ok: false, error: 'NO_AUTORIZADO' };
  const hoja = laboralHoja('EVALUACIONES_LABORALES');
  const valores = hoja.getDataRange().getValues();
  const colId = valores[0].indexOf('id');
  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][colId]) === String(evaluacionId)) {
      hoja.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'EVALUACION_NO_ENCONTRADA' };
}

function laboralGuardarChecklist(clave, jornadaId, checklistJson) {
  if (!esAdminSeguro(clave) || !jornadaId) return { ok: false, error: 'NO_AUTORIZADO' };
  const hoja = laboralHoja('JORNADAS_LABORALES');
  const valores = hoja.getDataRange().getValues();
  const encabezados = valores[0];
  const colId = encabezados.indexOf('id');
  const colChecklist = encabezados.indexOf('checklist_json');
  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][colId]) === String(jornadaId)) {
      hoja.getRange(i + 1, colChecklist + 1).setValue(checklistJson || '{}');
      return { ok: true };
    }
  }
  return { ok: false, error: 'JORNADA_NO_ENCONTRADA' };
}

// ───────────────────────── NOTIFICACIONES PUSH ─────────────────────────

function notifEnviarNuevoPlan(clave, pacienteId, titulo) {
  if (!esAdminSeguro(clave) || !pacienteId) return { ok: false, error: 'NO_AUTORIZADO' };

  try {
    const hoja = obtenerHoja('NOTIFICACIONES_LOG');
    if (!hoja) return { ok: false, error: 'TABLA_NOTIFICACIONES_NO_ENCONTRADA' };

    const ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const fila = [
      'notif_' + new Date().getTime(),
      pacienteId,
      'NUEVO_PLAN',
      titulo || 'Tu nutricionista cargó tu nuevo plan',
      ahora,
      'PENDIENTE'
    ];

    hoja.appendRow(fila);
    return { ok: true, mensaje: 'Notificación registrada para envío' };
  } catch (err) {
    return { ok: false, error: 'ERROR_AL_GUARDAR_NOTIFICACION' };
  }
}

function notifEnviarRenovacion(clave, pacienteId, fechaFin) {
  if (!esAdminSeguro(clave) || !pacienteId) return { ok: false, error: 'NO_AUTORIZADO' };

  try {
    const hoja = obtenerHoja('NOTIFICACIONES_LOG');
    if (!hoja) return { ok: false, error: 'TABLA_NOTIFICACIONES_NO_ENCONTRADA' };

    const ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const mensaje = fechaFin ? 'Tu plan vence el ' + fechaFin : 'Es hora de renovar tu plan';
    const fila = [
      'notif_' + new Date().getTime(),
      pacienteId,
      'RENOVAR_PLAN',
      mensaje,
      ahora,
      'PENDIENTE'
    ];

    hoja.appendRow(fila);
    return { ok: true, mensaje: 'Recordatorio de renovación registrado' };
  } catch (err) {
    return { ok: false, error: 'ERROR_AL_GUARDAR_NOTIFICACION' };
  }
}

