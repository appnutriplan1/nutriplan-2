/**
 * Normalización y formato de fechas.
 *
 * Google Sheets guarda las fechas como celdas de fecha, y Apps Script las
 * serializa a JSON como marca de tiempo ISO completa
 * ("2026-06-16T05:00:00.000Z"). Si eso llega crudo a la pantalla, la paciente
 * ve la marca de tiempo entera en vez de la fecha.
 *
 * `soloFecha` recorta a "AAAA-MM-DD" cortando la cadena, sin construir un
 * Date: convertir a Date y volver a leerlo aplicaría la zona horaria del
 * navegador y podría correr el día (una paciente en otro huso vería el día
 * anterior). El corte de texto conserva el día tal como se escribió en la hoja.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Deja cualquier fecha en "AAAA-MM-DD". Si no la reconoce, devuelve el texto tal cual. */
export function soloFecha(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  if (valor instanceof Date) {
    const mes = String(valor.getMonth() + 1).padStart(2, '0')
    const dia = String(valor.getDate()).padStart(2, '0')
    return `${valor.getFullYear()}-${mes}-${dia}`
  }
  const texto = String(valor).trim()
  const iso = texto.match(/^(\d{4}-\d{2}-\d{2})/)
  return iso ? iso[1] : texto
}

/** Formato de lectura: "16 jun 2026". Sin año cuando `conAnio` es false. */
export function formatearFecha(valor: unknown, conAnio = true): string {
  const fecha = soloFecha(valor)
  const partes = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!partes) return fecha
  const [, anio, mes, dia] = partes
  const nombreMes = MESES[Number(mes) - 1] ?? mes
  return conAnio ? `${Number(dia)} ${nombreMes} ${anio}` : `${Number(dia)} ${nombreMes}`
}
