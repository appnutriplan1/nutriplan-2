/**
 * Entrega de un PDF a la paciente, con el gesto que corresponde al aparato.
 *
 * En el celular lo que se quiere es la hoja de compartir del sistema: desde
 * ahí el archivo va directo a WhatsApp y el destinatario lo recibe como
 * archivo, no como enlace.
 *
 * En la computadora se quiere lo contrario: el cuadro de "Guardar como" para
 * elegir carpeta. Ojo — Chrome también ofrece hoja de compartir en Windows,
 * así que no basta con preguntar si `navigator.share` existe: se distingue
 * por el tipo de puntero (grueso = dedo).
 *
 * EL ORDEN IMPORTA
 * ────────────────────────────────────────────────────────────────────────
 * Tanto el cuadro de guardado como la hoja de compartir solo se pueden abrir
 * "dentro" del clic de la paciente. Si antes hay que descargar el PDF desde
 * Drive, esos segundos vencen el permiso del clic y el navegador se niega.
 *
 * Por eso el cuadro de guardado se pide ANTES de descargar el archivo, y los
 * bytes se escriben después, cuando llegan. En el celular no se puede hacer
 * lo mismo (la hoja de compartir necesita el archivo ya armado), así que
 * cuando el permiso vence se devuelve 'listo-para-compartir': el archivo
 * queda preparado y el segundo toque lo comparte de inmediato.
 *
 * `showSaveFilePicker` solo existe en Chrome y Edge de escritorio. En Firefox
 * y Safari no hay forma de abrir el cuadro de guardado desde una página web,
 * y el archivo baja directo a Descargas.
 */

export type ResultadoArchivo =
  | 'compartido'
  | 'guardado'
  | 'descargado'
  | 'cancelado'
  | 'listo-para-compartir'

export interface EntregaArchivo {
  resultado: ResultadoArchivo
  /** El PDF ya descargado, para que un segundo toque no lo vuelva a pedir. */
  blob: Blob | null
}

interface VentanaConPicker extends Window {
  showSaveFilePicker?: (opciones: {
    suggestedName?: string
    types?: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<{ createWritable: () => Promise<{ write: (dato: Blob) => Promise<void>; close: () => Promise<void> }> }>
}

function esCancelacion(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/** El navegador rechazó la acción por falta de gesto reciente. */
function esPermisoVencido(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')
}

/** Un dedo, no un ratón: teléfono o tablet. */
function esTactil(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true
}

/** Nombre de archivo válido en Windows, macOS y Android. */
export function nombreArchivoSeguro(titulo: string, porDefecto = 'documento'): string {
  const limpio = titulo
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return `${limpio || porDefecto}.pdf`
}

function descargaDirecta(blob: Blob, nombre: string): ResultadoArchivo {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  // Se libera después del click: revocar de inmediato cancela la descarga
  // en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'descargado'
}

/**
 * @param obtenerBlob  Descarga el PDF. Puede tardar (pasa por el proxy).
 * @param blobListo    Si ya se descargó antes, se reutiliza y no se vuelve a pedir.
 */
export async function entregarArchivo(
  nombre: string,
  titulo: string,
  obtenerBlob: () => Promise<Blob>,
  blobListo: Blob | null = null,
): Promise<EntregaArchivo> {
  // ── Celular y tablet: hoja de compartir con el archivo ──
  if (esTactil()) {
    const blob = blobListo ?? (await obtenerBlob())
    const archivo = new File([blob], nombre, { type: 'application/pdf' })

    if (navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: titulo })
        return { resultado: 'compartido', blob }
      } catch (error) {
        if (esCancelacion(error)) return { resultado: 'cancelado', blob }
        // El clic venció mientras se descargaba: el archivo ya está listo, así
        // que el siguiente toque comparte sin espera.
        if (esPermisoVencido(error)) return { resultado: 'listo-para-compartir', blob }
      }
    }

    return { resultado: descargaDirecta(blob, nombre), blob }
  }

  // ── Computadora: cuadro de guardado ──
  const picker = (window as VentanaConPicker).showSaveFilePicker
  if (picker) {
    try {
      // Primero el cuadro, mientras el clic todavía vale.
      const handle = await picker({
        suggestedName: nombre,
        types: [{ description: 'Documento PDF', accept: { 'application/pdf': ['.pdf'] } }],
      })
      const blob = blobListo ?? (await obtenerBlob())
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return { resultado: 'guardado', blob }
    } catch (error) {
      if (esCancelacion(error)) return { resultado: 'cancelado', blob: blobListo }
      // Cualquier otro fallo: no dejar a la paciente sin su archivo.
    }
  }

  // Firefox, Safari y navegadores antiguos: descarga directa a la carpeta
  // de Descargas, sin poder preguntar dónde.
  const blob = blobListo ?? (await obtenerBlob())
  return { resultado: descargaDirecta(blob, nombre), blob }
}
