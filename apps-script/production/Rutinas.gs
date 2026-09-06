/**
 * PARCHE ADITIVO — Rutinas personalizadas de pacientes
 *
 * No reemplaza Codigo.gs. En el Apps Script publicado:
 * 1. Añade el `case 'rutinas'` de abajo dentro de manejarSolicitud(e).
 * 2. Pega la función obtenerRutinasSeguro al FINAL del archivo.
 * 3. Guarda y crea una nueva versión de la implementación web existente.
 */

// Dentro del switch (accion):
// case 'rutinas':
//   return responder(obtenerRutinasSeguro(params.codigo_acceso));

function obtenerRutinasSeguro(codigoAcceso) {
  var paciente = validarCodigo(codigoAcceso);
  if (!paciente) return { ok: false, error: 'ACCESO_DENEGADO' };

  var libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  var hojaAsignaciones = libro.getSheetByName('PACIENTE_RUTINAS');
  var hojaRutinas = libro.getSheetByName('RUTINAS');
  var hojaLineas = libro.getSheetByName('RUTINA_EJERCICIOS');
  var hojaEjercicios = libro.getSheetByName('EJERCICIOS');

  // Si una hoja todavía no existe, la paciente ve el estado vacío, nunca datos ajenos.
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
