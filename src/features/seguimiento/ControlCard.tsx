import { Card } from '../../components/ui/Card'
import { formatearFecha } from '../../lib/fecha'
import { esNumero } from '../../lib/numero'
import { calcularImc } from '../../lib/calculators/clinical'
import type { Mediciones } from '../../services/dataService'

/**
 * Un control: la fecha y todo lo que se midió ese día. Se usa igual para el
 * control más reciente (destacado) y para los anteriores.
 *
 * Un valor en 0 significa "no se registró" y no se muestra: en un control de
 * rutina no se piden análisis, y una fila de ceros haría pensar que sí se
 * midieron y salieron en cero.
 */

interface Dato {
  etiqueta: string
  valor: string
}

function dato(etiqueta: string, valor: number, unidad: string, decimales = 1): Dato | null {
  if (!esNumero(valor) || valor <= 0) return null
  const texto = Number.isInteger(valor) ? String(valor) : valor.toFixed(decimales)
  return { etiqueta, valor: `${texto} ${unidad}` }
}

export interface ControlCardProps {
  fecha: string
  mediciones: Mediciones
  tallaCm: number
  /** Etiqueta opcional sobre la fecha ("Al empezar el plan", "Último control"). */
  kicker?: string
  destacado?: boolean
}

export function ControlCard({ fecha, mediciones, tallaCm, kicker, destacado = false }: ControlCardProps) {
  const imc = mediciones.pesoKg > 0 && tallaCm > 0 ? calcularImc(mediciones.pesoKg, tallaCm) : 0

  const datos = [
    dato('Peso', mediciones.pesoKg, 'kg'),
    dato('Talla', tallaCm, 'cm', 0),
    dato('IMC', imc, ''),
    dato('Cintura', mediciones.cinturaCm, 'cm', 0),
    dato('% grasa', mediciones.grasaPct, '%'),
    dato('Glucosa', mediciones.glucosa, 'mg/dL', 0),
    dato('Triglicéridos', mediciones.trigliceridos, 'mg/dL', 0),
    dato('Colesterol', mediciones.colesterol, 'mg/dL', 0),
    dato('Hemoglobina', mediciones.hemoglobina, 'g/dL'),
  ].filter((d): d is Dato => d !== null)

  return (
    <Card padding={destacado ? 'lg' : 'md'} className="mb-3">
      {kicker && <p className="kicker mb-1">{kicker}</p>}
      <p
        className={
          destacado
            ? 'mb-4 font-display text-xl font-semibold text-tinta'
            : 'mb-3 font-display text-base font-semibold text-tinta'
        }
      >
        {formatearFecha(fecha)}
      </p>

      {datos.length === 0 ? (
        <p className="font-sans text-sm text-muted">Sin mediciones registradas en este control.</p>
      ) : (
        <div className="grid grid-cols-3 gap-x-4 gap-y-4 sm:grid-cols-4">
          {datos.map((d) => (
            <div key={d.etiqueta}>
              <p className="mb-0.5 font-sans text-xs text-muted">{d.etiqueta}</p>
              <p
                className={
                  destacado
                    ? 'font-display text-lg font-semibold text-tinta'
                    : 'font-sans text-sm font-semibold text-tinta'
                }
              >
                {d.valor}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
