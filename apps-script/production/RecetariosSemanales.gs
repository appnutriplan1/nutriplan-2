/* Recetarios semanales: JSON e imágenes en Drive, índice y estado en Sheets. */
function carpetaRecetarios_() {
  const props = PropertiesService.getScriptProperties();
  const existente = props.getProperty('RECETARIOS_FOLDER_ID');
  if (existente) return DriveApp.getFolderById(existente);
  const carpeta = DriveApp.createFolder('NutriPlan - Recetarios semanales');
  props.setProperty('RECETARIOS_FOLDER_ID', carpeta.getId());
  return carpeta;
}

function hojaRecetarios_() {
  const libro = SpreadsheetApp.openById(SPREADSHEET_ID);
  let hoja = libro.getSheetByName('RECETARIOS_SEMANALES');
  if (!hoja) {
    hoja = libro.insertSheet('RECETARIOS_SEMANALES');
    hoja.appendRow(['id','plan_id','week_start','week_end','estado','json_file_id','version','fecha_actualizacion']);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function adminSubirImagenRecetario(clave, archivo) {
  if (!esAdminSeguro(clave) || !archivo || !archivo.nombre || !archivo.base64) return { ok:false, error:'DATOS_INVALIDOS' };
  const bytes = Utilities.base64Decode(String(archivo.base64));
  const blob = Utilities.newBlob(bytes, archivo.mime || 'image/jpeg', String(archivo.nombre));
  const file = carpetaRecetarios_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { ok:true, nombre:String(archivo.nombre), url:'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600' };
}

function adminGuardarRecetario(clave, recetario) {
  if (!esAdminSeguro(clave) || !recetario || !recetario.plan_id || !recetario.cookbook) return { ok:false, error:'DATOS_INVALIDOS' };
  const cookbook = typeof recetario.cookbook === 'string' ? JSON.parse(recetario.cookbook) : recetario.cookbook;
  const urls = recetario.image_urls || {};
  (cookbook.recipes || []).forEach(function(r){ if (r.image_file && urls[r.image_file]) r.image_file = urls[r.image_file]; });
  const nombre = String(recetario.plan_id) + '-' + String(cookbook.cookbook.week_start) + '.json';
  const file = carpetaRecetarios_().createFile(Utilities.newBlob(JSON.stringify(cookbook), 'application/json', nombre));
  const hoja = hojaRecetarios_(); const datos = hoja.getDataRange().getValues();
  let fila = -1; let version = 1;
  for (let i=1;i<datos.length;i++) if(String(datos[i][1])===String(recetario.plan_id) && String(datos[i][2])===String(cookbook.cookbook.week_start)){ fila=i+1; version=Number(datos[i][6]||0)+1; }
  const valores=['cookbook_'+new Date().getTime(),recetario.plan_id,cookbook.cookbook.week_start,cookbook.cookbook.week_end,'BORRADOR',file.getId(),version,new Date()];
  if(fila<0) hoja.appendRow(valores); else hoja.getRange(fila,1,1,valores.length).setValues([valores]);
  return { ok:true, plan_id:recetario.plan_id, week_start:cookbook.cookbook.week_start, estado:'BORRADOR', version:version };
}

function adminPublicarRecetario(clave, planId, weekStart) {
  if (!esAdminSeguro(clave)) return { ok:false,error:'NO_AUTORIZADO' };
  const hoja=hojaRecetarios_(); const datos=hoja.getDataRange().getValues();
  for(let i=1;i<datos.length;i++) if(String(datos[i][1])===String(planId)&&String(datos[i][2])===String(weekStart)){ hoja.getRange(i+1,5).setValue('PUBLICADO'); hoja.getRange(i+1,8).setValue(new Date()); return {ok:true,estado:'PUBLICADO'}; }
  return {ok:false,error:'RECETARIO_NO_ENCONTRADO'};
}

function obtenerRecetarioSemanalSeguro(codigo, planId, weekStart) {
  const paciente=validarCodigo(codigo); if(!paciente) return {ok:false,error:'ACCESO_DENEGADO'};
  const permitido=planesDePaciente(paciente.id).some(function(p){return String(p.id)===String(planId);});
  if(!permitido) return {ok:false,error:'ACCESO_DENEGADO'};
  const datos=hojaRecetarios_().getDataRange().getValues(); let elegida=null;
  for(let i=1;i<datos.length;i++) if(String(datos[i][1])===String(planId)&&String(datos[i][4]).toUpperCase()==='PUBLICADO'&&(!weekStart||String(datos[i][2])===String(weekStart))) { if(!elegida||String(datos[i][2])>String(elegida[2])) elegida=datos[i]; }
  if(!elegida) return {ok:false,error:'RECETARIO_NO_ENCONTRADO'};
  return {ok:true,cookbook:JSON.parse(DriveApp.getFileById(String(elegida[5])).getBlob().getDataAsString('UTF-8'))};
}
