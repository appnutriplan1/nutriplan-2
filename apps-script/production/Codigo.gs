/**
 * NutriCook — Apps Script (proxy seguro entre el frontend y Google Sheets)
 *
 * Este archivo NO se compila con la app (React/Vite nunca lo importa). Es el
 * código que se pega en el editor de Apps Script (script.google.com), ligado
 * a la hoja de cálculo de NutriCook.
 *
 * Regla de oro del proyecto (ver CLAUDE.md):
 *   React → DataService → Apps Script (este archivo) → Google Sheets
 * El frontend nunca ve la hoja ni credenciales; solo recibe la fila de la
 * paciente autenticada, nunca la hoja completa.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * ESTRUCTURA ESPERADA DE LAS PESTAÑAS (fila 1 = encabezados exactos)
 * ──────────────────────────────────────────────────────────────────────────
 *
 * PACIENTES
 *   id | codigo_acceso | estado | nombre | correo | sexo | fecha_nacimiento
 *   | talla_cm | objetivo | fecha_actualizacion | notas
 *   - estado ∈ {ACTIVO, SUSPENDIDO, REVOCADO, EXPIRADO}
 *   - codigo_acceso: token aleatorio tipo "nc_8fK3-Qm2P-Zx91", revocable
 *
 * PLANES
 *   id | paciente_id | titulo | url_pdf | estado | fecha_inicio | fecha_fin
 *   | kcal_objetivo | proteinas_g | carbohidratos_g | grasas_g
 *   - estado ∈ {VIGENTE, ARCHIVADO}
 *   - url_pdf: link al archivo en Google Drive (privado), no el PDF en sí
 *
 * SEGUIMIENTO
 *   id | paciente_id | fecha | peso_kg | cintura_cm | notas
 *
 * RECURSOS  (documentos descargables por plan: compras, intercambios, etc.)
 *   id | plan_id | tipo | titulo | url_pdf | orden
 *   - tipo ∈ {PLAN, COMPRAS, INTERCAMBIOS, OTRO}  (define el ícono en la app)
 *   - url_pdf: enlace de Drive; el archivo debe estar "Cualquiera con el
 *     enlace → Lector" porque se descarga con enlace directo.
 *
 * NOTA: el proxy de descarga de PDF del visor ('pdf') vive en el script
 * DESPLEGADO y no está reflejado en este archivo. No lo borres al re-publicar.
 *
 * ALIMENTOS  (Tabla Peruana de Composición de Alimentos — CENAN/INS)
 *   id | nombre | grupo | energia_kcal | proteinas_g | grasa_g | carbohidratos_g
 *   - valores por 100 g
 *
 * COOKBOOKS (también admite la pestaña RECETAS creada antes)
 *   id | titulo | descripcion | url_portada | url_pdf | estado | url_pago | orden
 *   - Una fila es un cookbook completo. url_portada es la imagen del catálogo.
 *   - estado: GRATUITO, GRATUITA, GRATIS o PREMIUM.
 *   - Las portadas y PDF deben estar compartidos como "Cualquiera con el enlace".
 *
 * CONFIG
 *   clave | valor
 *   - ej: link_whatsapp | https://wa.me/51999999999
 *         link_agenda   | https://calendly.com/tu-usuario
 *
 * ──────────────────────────────────────────────────────────────────────────
 */

// ID de la hoja de cálculo de Google Sheets (Archivo → Compartir → Copiar
// enlace; el ID es el segmento largo entre /d/ y /edit).
// NutriPlan 2 — Sheet ID
const SPREADSHEET_ID = '1qSwIU5Sz1f8fJrxbVE21GbvDu3jY6rrcTO1cFze3PQg';
const NUTRIPLAN_APPS_SCRIPT_VERSION = '2026.09.06-nutriplan-2';

// ───────────────────────── Enrutamiento HTTP ─────────────────────────

function doGet(e) {
  return manejarSolicitud(e);
}

function doPost(e) {
  return manejarSolicitud(e);
}

function manejarSolicitud(e) {
  try {
    const params = leerParametros(e);
    const accion = params.action;

    switch (accion) {
      case 'login':
        return responder(login(params.codigo_acceso));
      case 'push_suscribir':
        return responder(pushSuscribir(params.codigo_acceso, params.suscripcion));
      case 'push_desuscribir':
        return responder(pushDesuscribir(params.codigo_acceso, params.endpoint));
      case 'push_suscripciones_paciente':
        return responder(pushSuscripcionesPaciente(params.admin_password, params.paciente_id));
      case 'push_eliminar_endpoints':
        return responder(pushEliminarEndpoints(params.admin_password, params.endpoints));
      case 'push_planes_por_vencer':
        return responder(pushPlanesPorVencer(params.admin_password));
      case 'push_marcar_recordatorio':
        return responder(pushMarcarRecordatorio(params.admin_password, params.plan_id, params.dias));
      case 'planes':
        return responder(obtenerPlanesSeguro(params.codigo_acceso));
      case 'seguimiento':
        return responder(obtenerSeguimientoSeguro(params.codigo_acceso));
      case 'recursos':
        return responder(obtenerRecursosSeguro(params.codigo_acceso));
      case 'recetario_semanal':
        return responder(obtenerRecetarioSemanalSeguro(params.codigo_acceso, params.plan_id, params.week_start));
      case 'pdf':
        return responder(obtenerPlanPdfSeguro(params.codigo_acceso, params.plan_id));
      case 'recurso':
        return responder(obtenerRecursoPdfSeguro(params.codigo_acceso, params.recurso_id));
      case 'alimentos':
        return responder(obtenerAlimentosPublico());
      case 'cookbooks':
        return responder(obtenerCookbooksPublicos());
      case 'educacion':
        return responder(obtenerEducacion(params.codigo_acceso));
      case 'rutinas':
        return responder(obtenerRutinasSeguro(params.codigo_acceso));
      case 'receta_permisos':
        return responder(obtenerPermisosRecetas());
      case 'estado_servicio':
        return responder({ ok: true, version: NUTRIPLAN_APPS_SCRIPT_VERSION });
      // Panel administrativo
      case 'admin_resumen':
        if (params.admin_action) return responder(adminDespachar(params.admin_password, params));
        return responder(adminResumen(params.admin_password));
      case 'admin_guardar_paciente':
        return responder(adminGuardarPaciente(params.admin_password, params.paciente));
      case 'admin_guardar_plan':
        return responder(adminGuardarPlan(params.admin_password, params.plan));
      case 'admin_guardar_ciclo':
        return responder(adminGuardarCiclo(params.admin_password, params.ciclo));
      case 'admin_generar_codigo':
        return responder(adminGenerarCodigo(params.admin_password, params.paciente_id));
      case 'admin_guardar_recurso':
        return responder(adminGuardarRecurso(params.admin_password, params.recurso));
      case 'admin_subir_imagen_recetario':
        return responder(adminSubirImagenRecetario(params.admin_password, params.archivo));
      case 'admin_guardar_recetario':
        return responder(adminGuardarRecetario(params.admin_password, params.recetario));
      case 'admin_publicar_recetario':
        return responder(adminPublicarRecetario(params.admin_password, params.plan_id, params.week_start));
      case 'admin_eliminar_recurso':
        return responder(adminEliminarRecurso(params.admin_password, params.recurso_id));
      case 'admin_guardar_permiso_receta':
        return responder(adminGuardarPermisoReceta(params.admin_password, params.permiso));
      case 'admin_guardar_permisos_recetas':
        return responder(adminGuardarPermisosRecetas(params.admin_password, params.permisos));
      case 'admin_inicializar_permisos_recetas':
        return responder(adminInicializarPermisosRecetas(params.admin_password, params.permisos));
      default:
        return responder({ ok: false, error: 'ACCION_DESCONOCIDA' });
    }
  } catch (err) {
    // Nunca filtrar el mensaje de error interno (puede exponer detalles de
    // la hoja); solo un código genérico.
    return responder({ ok: false, error: 'ERROR_SERVIDOR' });
  }
}

// El frontend llama con POST y Content-Type: text/plain (evita el preflight
// CORS que Apps Script no maneja bien). El body es un JSON string.
function leerParametros(e) {
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      // si el body no es JSON válido, cae a los parámetros de query (doGet)
    }
  }
  return e.parameter || {};
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// ───────────────────────── Acceso a hojas ─────────────────────────

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

// ───────────────────────── Lógica de negocio ─────────────────────────

/**
 * Valida un código de acceso contra PACIENTES. Devuelve la fila de la
 * paciente SOLO si existe y está ACTIVO; en cualquier otro caso, null
 * (código inexistente, SUSPENDIDO, REVOCADO o EXPIRADO se tratan igual
 * de cara al frontend, para no filtrar por qué fue rechazado).
 */
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

/**
 * Valida códigos NCNWTH guardados en PACIENTES. Un suscriptor obtiene
 * acceso reutilizable a recetas, pero no recibe planes ni seguimiento.
 */
function loginSuscriptor(codigoAcceso) {
  const codigo = String(codigoAcceso || '').trim();
  if (codigo.indexOf('NCNWTH-') !== 0) {
    return { ok: false, error: 'ACCESO_DENEGADO' };
  }

  const hoja = obtenerOCrearHojaSuscriptores();
  const datos = hoja.getDataRange().getValues();
  const encabezados = datos[0];
  const colCodigo = encabezados.indexOf('codigo_acceso');
  const colEstado = encabezados.indexOf('estado');
  const colFechaInicio = encabezados.indexOf('fecha_inicio');
  const colFechaFin = encabezados.indexOf('fecha_fin');
  let indice = -1;

  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][colCodigo]).toUpperCase() === codigo.toUpperCase()) {
      indice = i;
      break;
    }
  }
  if (indice === -1 || String(datos[indice][colEstado]).toUpperCase() !== 'ACTIVO') {
    return { ok: false, error: 'ACCESO_DENEGADO' };
  }

  const hoy = inicioDelDia_(new Date());
  let fechaInicio = fechaValida_(datos[indice][colFechaInicio]);
  let fechaFin = fechaValida_(datos[indice][colFechaFin]);

  // Compatibilidad con códigos creados antes de incorporar la mensualidad:
  // al primer acceso reciben una vigencia inicial de un mes.
  if (!fechaInicio) {
    fechaInicio = hoy;
    if (colFechaInicio !== -1) hoja.getRange(indice + 1, colFechaInicio + 1).setValue(fechaInicio);
  }
  if (!fechaFin) {
    fechaFin = sumarMeses_(hoy, 1);
    if (colFechaFin !== -1) hoja.getRange(indice + 1, colFechaFin + 1).setValue(fechaFin);
  }

  if (inicioDelDia_(fechaFin).getTime() < hoy.getTime()) {
    if (colEstado !== -1) hoja.getRange(indice + 1, colEstado + 1).setValue('EXPIRADO');
    return { ok: false, error: 'SUSCRIPCION_EXPIRADA' };
  }

  const suscriptor = {};
  encabezados.forEach((encabezado, columna) => {
    suscriptor[encabezado] = datos[indice][columna];
  });
  suscriptor.fecha_inicio = fechaInicio;
  suscriptor.fecha_fin = fechaFin;

  return {
    ok: true,
    suscriptor: quitarCodigoAcceso(suscriptor),
  };
}

/**
 * Entrega el PDF únicamente después de comprobar que el plan pertenece a la
 * paciente autenticada. El frontend necesita estos bytes para conservar el
 * visor editorial; un enlace de Drive solo permite mostrar su visor genérico.
 */
function obtenerPlanPdfSeguro(codigoAcceso, planId) {
  const paciente = validarCodigo(codigoAcceso);
  if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };

  const planes = planesDePaciente(paciente.id);
  const plan = planes.find((item) => String(item.id) === String(planId));
  if (!plan || !plan.url_pdf) return { ok: false, error: 'ACCESO_DENEGADO' };

  return archivoDriveComoPdf(plan.url_pdf);
}

/**
 * Aplica la misma autorización a los descargables asociados al plan.
 */
function obtenerRecursoPdfSeguro(codigoAcceso, recursoId) {
  const paciente = validarCodigo(codigoAcceso);
  if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };

  const recursos = recursosDePaciente(paciente.id);
  const recurso = recursos.find((item) => String(item.id) === String(recursoId));
  if (!recurso || !recurso.url_pdf) return { ok: false, error: 'ACCESO_DENEGADO' };

  return archivoDriveComoPdf(recurso.url_pdf);
}

function archivoDriveComoPdf(url) {
  const idArchivo = extraerIdDeDrive(url);
  if (!idArchivo) return { ok: false, error: 'ARCHIVO_INVALIDO' };

  const blob = DriveApp.getFileById(idArchivo).getBlob();
  return {
    ok: true,
    base64: Utilities.base64Encode(blob.getBytes()),
    mime: blob.getContentType() || 'application/pdf',
  };
}

function extraerIdDeDrive(url) {
  const patrones = [/\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/];
  for (let i = 0; i < patrones.length; i++) {
    const coincidencia = String(url || '').match(patrones[i]);
    if (coincidencia) return coincidencia[1];
  }
  return null;
}

function fechaValida_(valor) {
  if (!valor) return null;
  const fecha = valor instanceof Date ? new Date(valor.getTime()) : new Date(valor);
  return isNaN(fecha.getTime()) ? null : fecha;
}

function inicioDelDia_(fecha) {
  const copia = new Date(fecha.getTime());
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function sumarMeses_(fecha, meses) {
  const copia = new Date(fecha.getTime());
  const diaOriginal = copia.getDate();
  copia.setDate(1);
  copia.setMonth(copia.getMonth() + meses);
  const ultimoDia = new Date(copia.getFullYear(), copia.getMonth() + 1, 0).getDate();
  copia.setDate(Math.min(diaOriginal, ultimoDia));
  return copia;
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

// Público: no requiere código, es el gancho de captación para visitantes.
function obtenerAlimentosPublico() {
  return { ok: true, alimentos: hojaAObjetos(obtenerHoja('ALIMENTOS')) };
}

// Público. COOKBOOKS es el nombre recomendado; RECETAS mantiene
// compatibilidad con la pestaña inicial que ya pudo haberse creado.
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

/** Biblioteca visual: el filtro de acceso se aplica antes de responder. */
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
  const paciente = validarCodigo(codigoAcceso);
  if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };
  return { ok: true, recursos: recursosDePaciente(paciente.id) };
}

// Solo devuelve recursos de planes que pertenecen a este paciente.
function recursosDePaciente(pacienteId) {
  const idsPlanes = planesDePaciente(pacienteId).map((p) => String(p.id));
  return hojaAObjetos(obtenerHoja('RECURSOS')).filter(
    (r) => idsPlanes.indexOf(String(r.plan_id)) !== -1,
  );
}

function quitarCodigoAcceso(paciente) {
  const copia = Object.assign({}, paciente);
  delete copia.codigo_acceso;
  return copia;
}

function crearSuscriptor(codigo, email, nombre) {
  if (!codigo || !email) {
    return { ok: false, error: 'Código y email requeridos' };
  }

  const hoja = obtenerOCrearHojaSuscriptores();

  const datos = hoja.getDataRange().getValues();
  const encabezados = datos[0];
  const colCodigo = encabezados.indexOf('codigo_acceso');
  const colNombre = encabezados.indexOf('nombre');
  const colEstado = encabezados.indexOf('estado');
  const colCorreo = encabezados.indexOf('correo');
  const colId = encabezados.indexOf('id');
  const colFechaInicio = encabezados.indexOf('fecha_inicio');

  if (colCodigo === -1) return { ok: false, error: 'Columna codigo_acceso no encontrada' };

  // Verificar que no exista el código
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][colCodigo] === codigo) {
      return { ok: false, error: 'Código ya existe' };
    }
  }

  // Crear nueva fila
  const nuevaFila = new Array(encabezados.length).fill('');
  if (colId !== -1) nuevaFila[colId] = `SUB-${Date.now()}`;
  nuevaFila[colCodigo] = codigo;
  if (colCorreo !== -1) nuevaFila[colCorreo] = email;
  if (colNombre !== -1) nuevaFila[colNombre] = nombre || 'Suscriptor';
  if (colEstado !== -1) nuevaFila[colEstado] = 'ACTIVO';
  if (colFechaInicio !== -1) nuevaFila[colFechaInicio] = new Date();

  hoja.appendRow(nuevaFila);

  return { ok: true, mensaje: 'Suscriptor creado', codigo };
}

// Genera un código NCNWTH-XXXX-XXXX-XXXX y lo guarda directamente en Sheets
function generarCodigoSuscriptor(email, nombre) {
  if (!email) {
    return { ok: false, error: 'Email requerido' };
  }

  const hoja = obtenerOCrearHojaSuscriptores();
  const datos = hoja.getDataRange().getValues();
  const encabezados = datos[0];
  const colCodigo = encabezados.indexOf('codigo_acceso');
  const colId = encabezados.indexOf('id');
  const colNombre = encabezados.indexOf('nombre');
  const colEstado = encabezados.indexOf('estado');
  const colCorreo = encabezados.indexOf('correo');
  const colFechaInicio = encabezados.indexOf('fecha_inicio');
  const colFechaFin = encabezados.indexOf('fecha_fin');

  if (colCodigo === -1) return { ok: false, error: 'Columna codigo_acceso no encontrada' };

  const usados = {};
  for (let i = 1; i < datos.length; i++) usados[String(datos[i][colCodigo]).toUpperCase()] = true;
  let codigo;
  do {
    codigo = `NCNWTH-${generarBloqueAleatorio(4)}-${generarBloqueAleatorio(4)}-${generarBloqueAleatorio(4)}`;
  } while (usados[codigo]);

  const nuevaFila = new Array(encabezados.length).fill('');
  if (colId !== -1) nuevaFila[colId] = `SUB-${Date.now()}`;
  nuevaFila[colCodigo] = codigo;
  if (colCorreo !== -1) nuevaFila[colCorreo] = email;
  if (colNombre !== -1) nuevaFila[colNombre] = nombre || 'Suscriptor';
  if (colEstado !== -1) nuevaFila[colEstado] = 'ACTIVO';
  const fechaInicio = new Date();
  if (colFechaInicio !== -1) nuevaFila[colFechaInicio] = fechaInicio;
  if (colFechaFin !== -1) nuevaFila[colFechaFin] = sumarMeses_(fechaInicio, 1);

  hoja.appendRow(nuevaFila);

  return { ok: true, codigo, email, fecha_inicio: fechaInicio, fecha_fin: sumarMeses_(fechaInicio, 1) };
}

function adminListarSuscriptores(clave) {
  if (!esAdminSeguro(clave)) return { ok: false, error: 'NO_AUTORIZADO' };
  const suscriptores = hojaAObjetos(obtenerOCrearHojaSuscriptores()).map((fila) => ({
    id: String(fila.id || ''),
    codigo_acceso: String(fila.codigo_acceso || ''),
    estado: String(fila.estado || 'ACTIVO').toUpperCase(),
    nombre: String(fila.nombre || 'Suscriptor'),
    correo: String(fila.correo || ''),
    fecha_inicio: fila.fecha_inicio || '',
    fecha_fin: fila.fecha_fin || '',
    notas: String(fila.notas || ''),
  }));
  return { ok: true, suscriptores };
}

function adminGenerarCodigoSuscriptor(clave, email, nombre) {
  if (!esAdminSeguro(clave)) return { ok: false, error: 'NO_AUTORIZADO' };
  return generarCodigoSuscriptor(email, nombre);
}

function adminActualizarSuscriptor(clave, suscriptorId, estado, renovar) {
  if (!esAdminSeguro(clave)) return { ok: false, error: 'NO_AUTORIZADO' };
  if (!suscriptorId) return { ok: false, error: 'DATOS_INVALIDOS' };

  const hoja = obtenerOCrearHojaSuscriptores();
  const datos = hoja.getDataRange().getValues();
  const encabezados = datos[0];
  const colId = encabezados.indexOf('id');
  const colEstado = encabezados.indexOf('estado');
  const colFechaInicio = encabezados.indexOf('fecha_inicio');
  const colFechaFin = encabezados.indexOf('fecha_fin');
  let indice = -1;

  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][colId]) === String(suscriptorId)) {
      indice = i;
      break;
    }
  }
  if (indice === -1) return { ok: false, error: 'SUSCRIPTOR_NO_ENCONTRADO' };

  const estadosValidos = ['ACTIVO', 'SUSPENDIDO', 'REVOCADO', 'EXPIRADO'];
  const estadoNormalizado = String(estado || '').toUpperCase();
  if (estadoNormalizado && estadosValidos.indexOf(estadoNormalizado) === -1) {
    return { ok: false, error: 'ESTADO_INVALIDO' };
  }

  if (renovar === true || String(renovar).toUpperCase() === 'TRUE') {
    const inicio = new Date();
    const fin = sumarMeses_(inicio, 1);
    if (colFechaInicio !== -1) hoja.getRange(indice + 1, colFechaInicio + 1).setValue(inicio);
    if (colFechaFin !== -1) hoja.getRange(indice + 1, colFechaFin + 1).setValue(fin);
    if (colEstado !== -1) hoja.getRange(indice + 1, colEstado + 1).setValue('ACTIVO');
  } else if (estadoNormalizado && colEstado !== -1) {
    hoja.getRange(indice + 1, colEstado + 1).setValue(estadoNormalizado);
  }

  return { ok: true, suscriptor_id: String(suscriptorId) };
}

function obtenerOCrearHojaPermisosRecetas() {
  const libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja = libro.getSheetByName('RECETA_PERMISOS');
  if (!hoja) {
    hoja = libro.insertSheet('RECETA_PERMISOS');
    hoja.appendRow([
      'recipe_id', 'tipo', 'mostrar_pacientes', 'visible', 'fecha_actualizacion',
    ]);
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
    try {
      permiso = JSON.parse(permiso);
    } catch (error) {
      return { ok: false, error: 'DATOS_INVALIDOS' };
    }
  }
  if (!permiso || !permiso.recipe_id) return { ok: false, error: 'DATOS_INVALIDOS' };

  const hoja = obtenerOCrearHojaPermisosRecetas();
  const datos = hoja.getDataRange().getValues();
  const encabezados = datos[0];
  const colId = encabezados.indexOf('recipe_id');
  let fila = -1;
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][colId]) === String(permiso.recipe_id)) {
      fila = i + 1;
      break;
    }
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
  if (!Array.isArray(permisos) || permisos.length < 1 || permisos.length > 1000) {
    return { ok: false, error: 'DATOS_INVALIDOS' };
  }

  const normalizados = permisos.map((permiso) => {
    if (!permiso || !permiso.recipe_id) return null;
    return [
      String(permiso.recipe_id),
      String(permiso.tipo).toUpperCase() === 'PREMIUM' ? 'PREMIUM' : 'GRATUITO',
      permiso.mostrar_pacientes === true,
      permiso.visible !== false,
      new Date(),
    ];
  });
  if (normalizados.some((permiso) => permiso === null)) {
    return { ok: false, error: 'DATOS_INVALIDOS' };
  }

  const bloqueo = LockService.getScriptLock();
  try {
    bloqueo.waitLock(15000);
    const hoja = obtenerOCrearHojaPermisosRecetas();
    const datos = hoja.getDataRange().getValues();
    const encabezados = datos[0];
    const colId = encabezados.indexOf('recipe_id');
    if (colId === -1) return { ok: false, error: 'ENCABEZADOS_INVALIDOS' };

    const porId = {};
    for (let i = 1; i < datos.length; i++) {
      porId[String(datos[i][colId])] = datos[i];
    }
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
  }
  if (nuevas.length) CacheService.getScriptCache().remove('receta_permisos_v1');
  return { ok: true, creados: nuevas.length, existentes: permisos.length - nuevas.length };
}

function obtenerOCrearHojaSuscriptores() {
  const libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja = libro.getSheetByName('SUSCRIPTORES');
  if (!hoja) {
    hoja = libro.insertSheet('SUSCRIPTORES');
    hoja.appendRow([
      'id', 'codigo_acceso', 'estado', 'nombre', 'correo',
      'fecha_inicio', 'fecha_fin', 'notas',
    ]);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function migrarSuscriptoresDesdePacientes() {
  const hojaPacientes = obtenerHoja('PACIENTES');
  const hojaSuscriptores = obtenerOCrearHojaSuscriptores();
  const datos = hojaPacientes.getDataRange().getValues();
  const encabezados = datos[0];
  const colCodigo = encabezados.indexOf('codigo_acceso');
  if (colCodigo === -1) return { ok: false, error: 'Columna codigo_acceso no encontrada' };

  const existentes = hojaAObjetos(hojaSuscriptores).reduce((mapa, fila) => {
    mapa[String(fila.codigo_acceso)] = true;
    return mapa;
  }, {});
  const filasEliminar = [];
  let migrados = 0;

  for (let i = 1; i < datos.length; i++) {
    const codigo = String(datos[i][colCodigo] || '').trim();
    if (codigo.indexOf('NCNWTH-') !== 0) continue;

    if (!existentes[codigo]) {
      hojaSuscriptores.appendRow([
        `SUB-${Date.now()}-${i}`,
        codigo,
        datos[i][encabezados.indexOf('estado')] || 'ACTIVO',
        datos[i][encabezados.indexOf('nombre')] || 'Suscriptor',
        datos[i][encabezados.indexOf('correo')] || '',
        new Date(),
        '',
        datos[i][encabezados.indexOf('notas')] || '',
      ]);
      existentes[codigo] = true;
      migrados++;
    }
    filasEliminar.push(i + 1);
  }

  filasEliminar.reverse().forEach((fila) => hojaPacientes.deleteRow(fila));
  return { ok: true, migrados, eliminados_de_pacientes: filasEliminar.length };
}

function generarBloqueAleatorio(largo) {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let resultado = '';
  for (let i = 0; i < largo; i++) {
    const indice = Math.floor(Math.random() * alfabeto.length);
    resultado += alfabeto.charAt(indice);
  }
  return resultado;
}

/**
 * ──────────────────────────────────────────────────────────────────────
 * DESPLIEGUE
 * ──────────────────────────────────────────────────────────────────────
 * 1. Crea el Google Sheet con las 5 pestañas de arriba (PACIENTES, PLANES,
 *    SEGUIMIENTO, ALIMENTOS, CONFIG) y sus encabezados exactos en la fila 1.
 * 2. Extensiones → Apps Script. Borra el contenido por defecto y pega este
 *    archivo completo.
 * 3. Reemplaza SPREADSHEET_ID arriba por el ID real de tu hoja.
 * 4. Deploy → New deployment → tipo "Web app".
 *      - Description: lo que quieras (ej. "NutriCook API v1")
 *      - Execute as: Me (tu cuenta)
 *      - Who has access: Anyone
 * 5. Copia la URL del web app que te da el deploy → pégala en
 *    VITE_APPS_SCRIPT_URL dentro de tu .env del frontend.
 * 6. IMPORTANTE: cada vez que edites este código, tienes que crear un
 *    "New deployment" de nuevo (guardar el script NO actualiza la URL ya
 *    publicada) — o usar "Manage deployments" → editar → nueva versión.
 * ──────────────────────────────────────────────────────────────────────
 */

