/*
  PARCHE: Biblioteca de educación nutricional.

  Pega el case y la función siguiente en el Apps Script que YA está desplegado.
  Dentro de switch (accion), antes de default, agrega:

  case 'educacion':
    return responder(obtenerEducacion(params.codigo_acceso));
*/

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
