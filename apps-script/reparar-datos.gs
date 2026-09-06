/**
 * NutriCook — REPARACIÓN Y PREPARACIÓN DE DATOS (se ejecuta una sola vez)
 * ──────────────────────────────────────────────────────────────────────────
 * Este archivo NO forma parte de la API. Son utilidades de mantenimiento que
 * se pegan en el editor de Apps Script y se ejecutan a mano desde el menú de
 * funciones. No tocan nada de lo que ya está desplegado.
 *
 * QUÉ ARREGLA
 * ──────────────────────────────────────────────────────────────────────────
 * 1. ALIMENTOS: Google Sheets interpretó los nutrientes como fechas al
 *    pegarlos. "12.8" g de proteína se guardó como "12 de agosto de 2026".
 *    La app no puede leer eso y muestra NaN.
 *
 *    La conversión es reversible: la fecha conserva el día (12) y el mes (8),
 *    que son las dos partes del número original. `repararAlimentos()` los
 *    vuelve a unir y deja la columna formateada como número, para que no
 *    vuelva a pasar.
 *
 * 2. Prepara las columnas nuevas de análisis en PACIENTES y SEGUIMIENTO,
 *    formateadas como TEXTO PLANO. Esto es lo que impide que hemoglobina
 *    "12.8" o colesterol "5.2" se conviertan en fechas como pasó con la
 *    tabla de alimentos.
 *
 * 3. Limpia duplicados y filas vacías.
 *
 * CÓMO USARLO — IMPORTANTE
 * ──────────────────────────────────────────────────────────────────────────
 * Cada reparación tiene una función `revisar…` que NO modifica nada y solo
 * informa qué haría. Ejecuta siempre primero la de revisar, lee el resultado
 * en "Registro de ejecución", y recién entonces la de reparar.
 *
 * Antes de la primera reparación conviene tener una copia:
 * Archivo → Hacer una copia. (Google Sheets también guarda historial de
 * versiones en Archivo → Historial de versiones, por si acaso.)
 */

var SS_ID = 'REEMPLAZAR_CON_ID_NUTRIPLAN_1';

function hoja_(nombre) {
  var h = SpreadsheetApp.openById(SS_ID).getSheetByName(nombre);
  if (!h) throw new Error('No existe la pestaña "' + nombre + '"');
  return h;
}

/** Índice (base 1) de una columna por su encabezado. 0 si no existe. */
function columna_(hoja, encabezado) {
  var cabeceras = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  for (var i = 0; i < cabeceras.length; i++) {
    if (String(cabeceras[i]).trim() === encabezado) return i + 1;
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. ALIMENTOS — deshacer la conversión a fecha
// ═══════════════════════════════════════════════════════════════════════

var COLUMNAS_NUTRIENTES = ['energia_kcal', 'proteinas_g', 'grasa_g', 'carbohidratos_g'];

/**
 * Una celda que Sheets convirtió en fecha guarda el número original partido
 * en día y mes: 12.8 → 12 de agosto. Se vuelven a unir.
 * Devuelve null si el valor no era una fecha (no hay nada que reparar).
 */
function fechaANumero_(valor) {
  if (!(valor instanceof Date)) return null;
  var dia = valor.getDate();
  var mes = valor.getMonth() + 1;
  return Number(dia + '.' + mes);
}

/** NO MODIFICA NADA. Informa cuántas celdas están dañadas y da ejemplos. */
function revisarAlimentos() {
  var h = hoja_('ALIMENTOS');
  var datos = h.getDataRange().getValues();
  var cabeceras = datos[0];

  var reporte = ['REVISIÓN DE ALIMENTOS (no se modificó nada)', ''];
  var ejemplos = [];
  var totalDanadas = 0;

  for (var c = 0; c < COLUMNAS_NUTRIENTES.length; c++) {
    var idx = cabeceras.indexOf(COLUMNAS_NUTRIENTES[c]);
    if (idx === -1) {
      reporte.push('  ⚠ No se encontró la columna "' + COLUMNAS_NUTRIENTES[c] + '"');
      continue;
    }
    var danadas = 0;
    for (var f = 1; f < datos.length; f++) {
      var reparado = fechaANumero_(datos[f][idx]);
      if (reparado === null) continue;
      danadas++;
      totalDanadas++;
      if (ejemplos.length < 5) {
        ejemplos.push(
          '    ' + datos[f][0] + ' ' + datos[f][1] + ' → ' + COLUMNAS_NUTRIENTES[c] + ': ' + reparado,
        );
      }
    }
    var pct = datos.length > 1 ? Math.round((danadas / (datos.length - 1)) * 100) : 0;
    reporte.push('  ' + COLUMNAS_NUTRIENTES[c] + ': ' + danadas + ' celdas dañadas (' + pct + '%)');
  }

  reporte.push('', '  TOTAL a reparar: ' + totalDanadas + ' celdas en ' + (datos.length - 1) + ' alimentos');
  if (ejemplos.length) reporte.push('', '  Ejemplos de lo que quedaría:', ejemplos.join('\n'));
  reporte.push('', '  Si se ve bien, ejecuta repararAlimentos().');

  Logger.log(reporte.join('\n'));
  return reporte.join('\n');
}

/**
 * Repara las cuatro columnas de nutrientes y las deja formateadas como
 * número, para que Sheets no vuelva a interpretarlas como fechas.
 */
function repararAlimentos() {
  var h = hoja_('ALIMENTOS');
  var datos = h.getDataRange().getValues();
  var cabeceras = datos[0];
  var filas = datos.length - 1;
  if (filas < 1) return 'La hoja ALIMENTOS está vacía.';

  var reparadas = 0;

  for (var c = 0; c < COLUMNAS_NUTRIENTES.length; c++) {
    var idx = cabeceras.indexOf(COLUMNAS_NUTRIENTES[c]);
    if (idx === -1) continue;

    var columna = [];
    for (var f = 1; f < datos.length; f++) {
      var valor = datos[f][idx];
      var reparado = fechaANumero_(valor);
      if (reparado !== null) {
        columna.push([reparado]);
        reparadas++;
      } else if (valor === '' || valor === null) {
        columna.push(['']);
      } else {
        // Texto numérico ("69.1") o número: se normaliza a número.
        var n = Number(String(valor).replace(',', '.'));
        columna.push([isNaN(n) ? valor : n]);
      }
    }

    var rango = h.getRange(2, idx + 1, filas, 1);
    // El formato se cambia ANTES de escribir: si la columna sigue con
    // formato de fecha, el número se volvería a mostrar como fecha.
    rango.setNumberFormat('0.0#');
    rango.setValues(columna);
  }

  var msg =
    'ALIMENTOS reparada: ' + reparadas + ' celdas devueltas a número, en ' + filas + ' alimentos.\n' +
    'Abre la calculadora por alimentos y comprueba que ya no aparece "—" ni "NaN".';
  Logger.log(msg);
  return msg;
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Columnas nuevas de medidas y análisis (a prueba de la conversión a fecha)
// ═══════════════════════════════════════════════════════════════════════

// Mismas medidas en las dos hojas: en PACIENTES son la línea base (con lo que
// la paciente empezó el plan) y en SEGUIMIENTO son las de cada control.
var COLUMNAS_MEDICION = [
  'peso_kg',
  'cintura_cm',
  'grasa_pct',
  'glucosa',
  'trigliceridos',
  'colesterol',
  'hemoglobina',
];

/**
 * Agrega las columnas que falten al final de la hoja y formatea TODAS las
 * columnas de medición como texto plano.
 *
 * El formato de texto es la parte importante: es lo que evita que
 * "hemoglobina 12.8" se convierta en "12 de agosto" igual que pasó con la
 * tabla de alimentos. La app lee ese texto y lo convierte a número sola.
 */
function prepararColumnasDeMedicion() {
  var resultado = [];

  var hojas = [
    { nombre: 'PACIENTES', columnas: COLUMNAS_MEDICION },
    // En SEGUIMIENTO se re-mide también la talla: en pacientes que aún
    // crecen cambia entre controles, y el IMC de cada control la necesita.
    { nombre: 'SEGUIMIENTO', columnas: ['talla_cm'].concat(COLUMNAS_MEDICION) },
  ];

  for (var i = 0; i < hojas.length; i++) {
    var h = hoja_(hojas[i].nombre);
    var columnas = hojas[i].columnas;
    var agregadas = [];

    for (var c = 0; c < columnas.length; c++) {
      var idx = columna_(h, columnas[c]);
      if (idx === 0) {
        idx = h.getLastColumn() + 1;
        h.getRange(1, idx).setValue(columnas[c]);
        agregadas.push(columnas[c]);
      }
      // Texto plano de la fila 2 hacia abajo (el encabezado no se toca).
      h.getRange(2, idx, Math.max(h.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    }

    resultado.push(
      hojas[i].nombre +
        ': ' +
        (agregadas.length ? 'columnas agregadas → ' + agregadas.join(', ') : 'ya tenía todas las columnas') +
        '. Todas formateadas como texto.',
    );
  }

  var msg = resultado.join('\n') + '\n\nYa puedes escribir valores con decimales sin que se conviertan en fechas.';
  Logger.log(msg);
  return msg;
}

// ═══════════════════════════════════════════════════════════════════════
// 3. Limpieza de duplicados y filas vacías
// ═══════════════════════════════════════════════════════════════════════

/**
 * NO MODIFICA NADA. Lista encabezados repetidos, columnas vacías que
 * duplican a otra, y filas reservadas sin contenido.
 */
function revisarDuplicados() {
  var reporte = ['REVISIÓN DE DUPLICADOS (no se modificó nada)', ''];
  var pestanas = ['PACIENTES', 'PLANES', 'SEGUIMIENTO', 'RECURSOS', 'ALIMENTOS', 'CONFIG'];

  for (var p = 0; p < pestanas.length; p++) {
    var h = SpreadsheetApp.openById(SS_ID).getSheetByName(pestanas[p]);
    if (!h) continue;
    var datos = h.getDataRange().getValues();
    if (!datos.length) continue;
    var cabeceras = datos[0];

    reporte.push(pestanas[p] + ':');

    // Encabezados repetidos: el proxy arma cada fila usando el encabezado
    // como nombre de campo, así que el segundo pisa al primero en silencio.
    var vistos = {};
    var hayRepetidos = false;
    for (var i = 0; i < cabeceras.length; i++) {
      var nombre = String(cabeceras[i]).trim();
      if (!nombre) continue;
      if (vistos[nombre]) {
        var letra = String.fromCharCode(65 + i);
        var vacia = true;
        for (var f = 1; f < datos.length; f++) {
          if (String(datos[f][i]).trim() !== '') { vacia = false; break; }
        }
        reporte.push(
          '  ⚠ encabezado repetido "' + nombre + '" en la columna ' + letra +
            (vacia ? ' (está vacía: se puede borrar sin perder nada)' : ' (TIENE DATOS: revísala a mano)'),
        );
        hayRepetidos = true;
      }
      vistos[nombre] = true;
    }

    // Filas con id pero sin ningún otro contenido.
    var reservadas = 0;
    for (var f2 = 1; f2 < datos.length; f2++) {
      var soloId = String(datos[f2][0]).trim() !== '';
      for (var c2 = 1; c2 < cabeceras.length; c2++) {
        if (String(datos[f2][c2]).trim() !== '') { soloId = false; break; }
      }
      if (soloId) reservadas++;
    }
    if (reservadas) reporte.push('  ⚠ ' + reservadas + ' filas con id pero sin datos');
    if (!hayRepetidos && !reservadas) reporte.push('  ✓ sin problemas');
    reporte.push('');
  }

  Logger.log(reporte.join('\n'));
  return reporte.join('\n');
}

/**
 * Borra las filas que solo tienen id y ninguna otra celda con contenido.
 * Se recorre de abajo hacia arriba para que borrar una fila no desplace las
 * que faltan por revisar.
 */
function limpiarFilasVacias(nombreHoja) {
  var h = hoja_(nombreHoja || 'RECURSOS');
  var datos = h.getDataRange().getValues();
  var borradas = 0;

  for (var f = datos.length - 1; f >= 1; f--) {
    var soloId = String(datos[f][0]).trim() !== '';
    for (var c = 1; c < datos[f].length; c++) {
      if (String(datos[f][c]).trim() !== '') { soloId = false; break; }
    }
    if (soloId) {
      h.deleteRow(f + 1);
      borradas++;
    }
  }

  var msg = h.getName() + ': ' + borradas + ' filas vacías eliminadas.';
  Logger.log(msg);
  return msg;
}

/**
 * Uniforma el tipo de recurso a las palabras que la app reconoce.
 * (La app ya acepta "INTERCAMBIO" en singular, pero dejar la hoja pareja
 * evita futuras sorpresas con otras variantes.)
 */
function normalizarTiposDeRecurso() {
  var h = hoja_('RECURSOS');
  var idx = columna_(h, 'tipo');
  if (!idx) return 'RECURSOS no tiene columna "tipo".';

  var filas = h.getLastRow() - 1;
  if (filas < 1) return 'RECURSOS no tiene datos.';

  var rango = h.getRange(2, idx, filas, 1);
  var valores = rango.getValues();
  var cambios = 0;

  for (var i = 0; i < valores.length; i++) {
    var t = String(valores[i][0]).trim().toUpperCase();
    if (!t) continue;
    var normalizado = t;
    if (t === 'INTERCAMBIO') normalizado = 'INTERCAMBIOS';
    if (t !== 'PLAN' && t !== 'COMPRAS' && t !== 'INTERCAMBIOS') normalizado = normalizado === 'INTERCAMBIOS' ? 'INTERCAMBIOS' : 'OTRO';
    if (normalizado !== valores[i][0]) {
      valores[i][0] = normalizado;
      cambios++;
    }
  }

  rango.setValues(valores);
  var msg = 'RECURSOS: ' + cambios + ' tipos normalizados.';
  Logger.log(msg);
  return msg;
}

/**
 * ──────────────────────────────────────────────────────────────────────
 * ORDEN SUGERIDO
 * ──────────────────────────────────────────────────────────────────────
 *   1. revisarAlimentos()             ← lee el informe, no cambia nada
 *   2. repararAlimentos()             ← arregla la tabla de alimentos
 *   3. revisarDuplicados()            ← lee el informe, no cambia nada
 *   4. limpiarFilasVacias('RECURSOS') ← borra las filas R010–R075 vacías
 *   5. normalizarTiposDeRecurso()
 *   6. prepararColumnasDeMedicion()   ← crea las columnas de análisis
 *
 * Lo que queda para hacer a mano en la hoja (son decisiones, no automatismos):
 *   · PACIENTES tiene "notas" dos veces. Si revisarDuplicados() dice que la
 *     segunda está vacía, bórrala (clic derecho en la columna → Eliminar).
 *   · PACIENTES tiene una columna "imc": la app lo calcula sola a partir de
 *     peso y talla, así que se puede eliminar para no mantener dos verdades.
 *   · SEGUIMIENTO tiene "fecha_evaluación" vacía, que duplica a "fecha".
 *   · Los id de SEGUIMIENTO están repetidos (varios controles con id 3).
 *     Conviene numerarlos correlativos (S001, S002…).
 *   · RECURSOS R001 y R007 no tienen título ni enlace: complétalos o
 *     bórralos. Mientras estén sin enlace, la app ya no los muestra.
 * ──────────────────────────────────────────────────────────────────────
 */

