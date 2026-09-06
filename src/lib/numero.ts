/**
 * Conversión de celdas de Google Sheets a número.
 *
 * Una celda puede llegar como número, como texto ("69.1"), con coma decimal
 * ("69,1"), vacía, o con basura. Devuelve:
 *   - el número, cuando se puede leer
 *   - 0 cuando la celda está vacía (dato que aún no se registró)
 *   - NaN cuando hay contenido pero no es un número
 *
 * La distinción importa: un dato ausente vale 0, pero un dato ilegible NO
 * debe mostrarse como 0 — eso convertiría un error en un valor nutricional
 * falso. Quien consume el valor decide qué mostrar (ver `esNumero`).
 */
export function aNumero(valor: unknown): number {
  if (typeof valor === 'number') return valor
  if (valor === null || valor === undefined) return 0

  const texto = String(valor).trim()
  if (texto === '') return 0

  // Coma decimal ("12,8") — habitual al escribir a mano en la hoja.
  const normalizado = texto.replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return Number.NaN
  return Number(normalizado)
}

/** true si el valor es utilizable para calcular o mostrar. */
export function esNumero(valor: number): boolean {
  return Number.isFinite(valor)
}
