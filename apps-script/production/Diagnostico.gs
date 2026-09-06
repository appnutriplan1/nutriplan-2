/**
 * Verificación manual y no destructiva de la integración con RECETA_PERMISOS.
 * Reescribe el estado actual de una receta, primero de forma individual y luego
 * masiva, y confirma que Sheets devuelve exactamente los mismos valores.
 */
function diagnosticarPermisosRecetas() {
  const clave = PropertiesService.getScriptProperties().getProperty('ADMIN_API_SECRET');
  if (!clave) return { ok: false, error: 'ADMIN_API_SECRET_NO_CONFIGURADO' };

  const actuales = obtenerPermisosRecetas();
  if (!actuales.ok || !actuales.permisos || !actuales.permisos.length) {
    return { ok: false, error: 'SIN_PERMISOS_PARA_VERIFICAR' };
  }

  const original = actuales.permisos[0];
  const individual = adminGuardarPermisoReceta(clave, original);
  if (!individual.ok) return { ok: false, etapa: 'individual', error: individual.error };

  const masiva = adminGuardarPermisosRecetas(clave, [original]);
  if (!masiva.ok) return { ok: false, etapa: 'masiva', error: masiva.error };

  const verificacion = obtenerPermisosRecetas();
  const guardado = verificacion.permisos.find(function(permiso) {
    return String(permiso.recipe_id) === String(original.recipe_id);
  });
  const coincide = !!guardado &&
    String(guardado.tipo) === String(original.tipo) &&
    Boolean(guardado.mostrar_pacientes) === Boolean(original.mostrar_pacientes) &&
    Boolean(guardado.visible) === Boolean(original.visible);

  const resultado = {
    ok: coincide,
    receta: original.recipe_id,
    individual: individual.ok,
    masiva: masiva.ok,
    estado_preservado: coincide,
  };
  console.log(JSON.stringify(resultado));
  return resultado;
}
