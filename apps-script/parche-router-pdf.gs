/*
 * Router completo NutriPlan.
 * Se mantiene al final de Código.gs para que sea la definición efectiva.
 */
function manejarSolicitud(e) {
  try {
    var params = leerParametros(e);
    var accion = params.action;
    switch (accion) {
      case 'login': return responder(login(params.codigo_acceso));
      case 'planes': return responder(obtenerPlanesSeguro(params.codigo_acceso));
      case 'seguimiento': return responder(obtenerSeguimientoSeguro(params.codigo_acceso));
      case 'recursos': return responder(obtenerRecursosSeguro(params.codigo_acceso));
      case 'pdf': return responder(obtenerPlanPdfSeguro_(params.codigo_acceso, params.plan_id));
      case 'recurso': return responder(obtenerRecursoPdf(params.codigo_acceso, params.recurso_id));
      case 'alimentos': return responder(obtenerAlimentosPublico());
      case 'cookbooks': return responder(obtenerCookbooksPublicos());
      case 'educacion': return responder(obtenerEducacion(params.codigo_acceso));
      case 'rutinas': return responder(obtenerRutinasSeguro(params.codigo_acceso));
      case 'admin_resumen':
        if (params.laboral_action) return responder(laboralDespachar(params.admin_password, params));
        if (params.admin_action) return responder(adminDespachar(params.admin_password, params));
        return responder(adminResumen(params.admin_password));
      case 'admin_guardar_paciente': return responder(adminGuardarPaciente(params.admin_password, params.paciente));
      case 'admin_guardar_plan': return responder(adminGuardarPlan(params.admin_password, params.plan));
      case 'admin_generar_codigo': return responder(adminGenerarCodigo(params.admin_password, params.paciente_id));
      case 'admin_guardar_recurso': return responder(adminGuardarRecurso(params.admin_password, params.recurso));
      case 'admin_eliminar_recurso': return responder(adminEliminarRecurso(params.admin_password, params.recurso_id));
      case 'laboral_resumen': return responder(laboralResumen(params.admin_password));
      case 'laboral_guardar_empresa': return responder(laboralGuardarEmpresa(params.admin_password, params.empresa));
      case 'laboral_guardar_jornada': return responder(laboralGuardarJornada(params.admin_password, params.jornada));
      case 'laboral_guardar_evaluacion': return responder(laboralGuardarEvaluacion(params.admin_password, params.evaluacion));
      case 'laboral_eliminar_evaluacion': return responder(laboralEliminarEvaluacion(params.admin_password, params.evaluacion_id));
      case 'laboral_guardar_checklist': return responder(laboralGuardarChecklist(params.admin_password, params.jornada_id, params.checklist_json));
      default: return responder({ ok: false, error: 'ACCION_DESCONOCIDA' });
    }
  } catch (err) {
    return responder({ ok: false, error: 'ERROR_SERVIDOR' });
  }
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
