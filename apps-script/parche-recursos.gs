/**
 * NutriCook — PARCHE: descargas por plan (RECURSOS)
 * ──────────────────────────────────────────────────────────────────────────
 * Este NO es un archivo nuevo ni reemplaza tu script. Son cambios ADITIVOS
 * que agregas a tu Apps Script YA DESPLEGADO (el que tiene el proxy de PDF).
 * No borres nada de lo que ya tienes.
 *
 * PASO 1 — Crea la hoja RECURSOS en tu Google Sheet
 * ──────────────────────────────────────────────────────────────────────────
 * Nueva pestaña llamada exactamente:  RECURSOS
 * Fila 1 (encabezados EXACTOS, en este orden):
 *
 *   id | plan_id | tipo | titulo | url_pdf | orden
 *
 *   - id       → correlativo (R001, R002, ...) o cualquier id único
 *   - plan_id  → el id del plan al que pertenece (columna id de la hoja PLANES)
 *   - tipo     → PLAN | COMPRAS | INTERCAMBIOS | OTRO   (define el ícono)
 *   - titulo   → texto que ve la paciente (ej. "Lista de compras de la semana")
 *   - url_pdf  → enlace de Google Drive al PDF (ver nota de compartir abajo)
 *   - orden    → número para ordenar la lista (1, 2, 3...). Opcional.
 *
 * NOTA IMPORTANTE (compartir): estos PDFs se descargan con un enlace directo,
 * así que el archivo en Drive debe estar como "Cualquier persona con el
 * enlace → Lector". Basta pegar el enlace normal de "Compartir" de Drive; la
 * app lo convierte sola en enlace de descarga.
 *
 * PASO 2 — Agrega UNA línea al switch de manejarSolicitud()
 * ──────────────────────────────────────────────────────────────────────────
 * Busca el bloque switch (donde están 'login', 'planes', 'seguimiento',
 * 'alimentos', 'pdf'...) y agrega este case junto a los demás:
 *
 *       case 'recursos':
 *         return responder(obtenerRecursosSeguro(params.codigo_acceso));
 *
 * PASO 3 — Pega estas DOS funciones al final del archivo
 * ──────────────────────────────────────────────────────────────────────────
 * (Reusan validarCodigo, planesDePaciente, hojaAObjetos y obtenerHoja, que
 *  ya existen en tu script. No dupliques esas.)
 */

function obtenerRecursosSeguro(codigoAcceso) {
  var paciente = validarCodigo(codigoAcceso);
  if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };
  return { ok: true, recursos: recursosDePaciente(paciente.id) };
}

function recursosDePaciente(pacienteId) {
  // Solo devuelve recursos de planes que pertenecen a este paciente.
  var idsPlanes = planesDePaciente(pacienteId).map(function (p) {
    return String(p.id);
  });
  return hojaAObjetos(obtenerHoja('RECURSOS')).filter(function (r) {
    return idsPlanes.indexOf(String(r.plan_id)) !== -1;
  });
}

/**
 * PASO 4 — (opcional pero recomendado) Servir el PDF del recurso
 * ──────────────────────────────────────────────────────────────────────────
 * Sin esto, los documentos descargables se abren con el enlace de Drive. En
 * el celular eso comparte un ENLACE por WhatsApp, no el archivo — que es
 * justo lo que se quería evitar. El navegador no puede leer el PDF de Drive
 * por su cuenta (Drive no responde CORS), así que tiene que pasar por aquí,
 * igual que ya pasa el plan.
 *
 * Con esta acción, la app abre la hoja de compartir con el PDF de verdad en
 * el celular, y el cuadro de "Guardar como" en la computadora.
 *
 * Agrega este case al switch de manejarSolicitud(), junto a los demás:
 *
 *       case 'recurso':
 *         return responder(obtenerRecursoPdf(params.codigo_acceso, params.recurso_id));
 *
 * Y pega esta función al final del archivo:
 */

function obtenerRecursoPdf(codigoAcceso, recursoId) {
  var paciente = validarCodigo(codigoAcceso);
  if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };

  // Solo entre los recursos de esta paciente: pedir un id ajeno no devuelve
  // nada, aunque el código de acceso sea válido.
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

/** Saca el id del archivo de cualquiera de los formatos de enlace de Drive. */
function extraerIdDeDrive_(url) {
  var patrones = [/\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/];
  for (var i = 0; i < patrones.length; i++) {
    var m = String(url).match(patrones[i]);
    if (m) return m[1];
  }
  return null;
}

/**
 * PASO 5 — Vuelve a publicar
 * ──────────────────────────────────────────────────────────────────────────
 * Guarda (💾) y luego: Implementar → Administrar implementaciones →
 * editar (lápiz) → Versión: "Nueva versión" → Implementar.
 * La URL del web app NO cambia; solo se actualiza el código detrás.
 *
 * Mientras no hagas esto, la app sigue funcionando: cae sola al enlace de
 * Drive, que es el comportamiento que tenía antes.
 */
