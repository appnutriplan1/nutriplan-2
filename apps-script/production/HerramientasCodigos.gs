/**
 * NutriCook — Generador de códigos de acceso
 *
 * Archivo independiente (no se compila con la app). Se pega en el MISMO
 * proyecto de Apps Script que Codigo.gs (o en uno nuevo, siempre que apunte
 * a la misma hoja) y se ejecuta a mano desde el editor cuando Joel necesita
 * códigos nuevos.
 *
 * ──────────────────────────────────────────────────────────────────────
 * CÓMO USARLO
 * ──────────────────────────────────────────────────────────────────────
 * 1. Abre script.google.com → el proyecto de NutriCook (o crea uno nuevo
 *    ligado a la misma hoja: Extensiones → Apps Script desde el Sheet).
 * 2. Pega este archivo completo (puede convivir en el mismo proyecto que
 *    Codigo.gs, cada archivo .gs es independiente).
 * 3. Verifica que SPREADSHEET_ID de abajo sea el mismo ID que usa Codigo.gs.
 * 4. Arriba del editor, en el desplegable de funciones, elige la función
 *    que quieras correr:
 *      - rellenarCodigosFaltantes  → recorre PACIENTES y le pone código a
 *                                    toda fila que tenga la columna
 *                                    codigo_acceso vacía. Es la que más vas
 *                                    a usar.
 *      - generarUnCodigo           → genera un único código y lo muestra en
 *                                    los registros, sin tocar el Sheet, por
 *                                    si prefieres copiarlo y pegarlo tú.
 * 5. Click en "Ejecutar" (▶). La primera vez Google te va a pedir
 *    autorizar permisos sobre la hoja — acepta (es tu propio proyecto).
 * 6. Para ver el resultado: menú "Ver" → "Registros" (o Ctrl+Enter /
 *    Cmd+Enter). Ahí sale cuántos códigos se generaron o el código único.
 * 7. Vuelve al Google Sheet y confirma que la columna codigo_acceso se
 *    llenó en las filas correspondientes.
 * ──────────────────────────────────────────────────────────────────────
 */

// Debe ser el mismo ID de hoja que SPREADSHEET_ID en Codigo.gs.
const SPREADSHEET_ID_CODIGOS = 'REEMPLAZAR_CON_ID_NUTRIPLAN_1';

/**
 * Genera un código aleatorio tipo "nc_8fK3-Qm2P-Zx91".
 * Usa un alfabeto sin caracteres ambiguos (sin 0/O, sin 1/l/I) para que se
 * pueda leer y tipear a mano sin confusiones.
 */
function generarCodigoAcceso() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

  function bloqueAleatorio(largo) {
    let resultado = '';
    for (let i = 0; i < largo; i++) {
      const indice = Math.floor(Math.random() * alfabeto.length);
      resultado += alfabeto.charAt(indice);
    }
    return resultado;
  }

  return 'nc_' + bloqueAleatorio(4) + '-' + bloqueAleatorio(4) + '-' + bloqueAleatorio(4);
}

/**
 * Recorre PACIENTES y genera un código nuevo para cada fila que tenga la
 * columna codigo_acceso vacía. No toca las filas que ya tienen código.
 * Verifica que el código generado no se repita con uno ya existente.
 */
function rellenarCodigosFaltantes() {
  const hoja = SpreadsheetApp.openById(SPREADSHEET_ID_CODIGOS).getSheetByName('PACIENTES');
  if (!hoja) {
    throw new Error('No se encontró la pestaña "PACIENTES" en la hoja.');
  }

  const datos = hoja.getDataRange().getValues();
  const encabezados = datos[0];
  const colCodigo = encabezados.indexOf('codigo_acceso');

  if (colCodigo === -1) {
    throw new Error('No se encontró la columna "codigo_acceso" en PACIENTES.');
  }

  const codigosExistentes = {};
  for (let i = 1; i < datos.length; i++) {
    const existente = datos[i][colCodigo];
    if (existente) codigosExistentes[existente] = true;
  }

  let generados = 0;

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const filaVacia = fila.every(function (celda) {
      return celda === '' || celda === null;
    });
    if (filaVacia) continue;
    if (fila[colCodigo]) continue; // ya tiene código, no se toca

    let nuevoCodigo;
    do {
      nuevoCodigo = generarCodigoAcceso();
    } while (codigosExistentes[nuevoCodigo]);
    codigosExistentes[nuevoCodigo] = true;

    hoja.getRange(i + 1, colCodigo + 1).setValue(nuevoCodigo);
    generados++;
  }

  Logger.log('Códigos generados: ' + generados);
  return generados;
}

/**
 * Genera un único código y lo deja en los registros (Ver → Registros) sin
 * escribir nada en el Sheet. Útil si prefieres pegarlo tú mismo en una fila
 * puntual en vez de correr el rellenado completo.
 */
function generarUnCodigo() {
  const codigo = generarCodigoAcceso();
  Logger.log('Código generado: ' + codigo);
  return codigo;
}

