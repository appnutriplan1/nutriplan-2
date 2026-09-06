import { Link } from 'react-router-dom'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { formatearFecha } from '../../lib/fecha'
import { esNumero } from '../../lib/numero'
import type { Paciente, Seguimiento } from '../../services/dataService'

/**
 * Compara el peso con el que la paciente empezó (línea base de PACIENTES)
 * contra su último control, y lo traduce a una frase.
 *
 * Los tramos y los textos son provisionales: los definió el desarrollo, no
 * la consulta. Joel tiene que revisarlos antes de que esto llegue a una
 * paciente real — sobre todo el tono cuando el peso sube.
 */

interface MensajeProgreso {
  titulo: string
  detalle: string
  tono: 'logro' | 'neutro'
}

/** Peso perdido (positivo) o ganado (negativo), en kg. */
function mensajeParaBajarGrasa(diferencia: number): MensajeProgreso {
  const kg = Math.abs(diferencia).toFixed(1).replace(/\.0$/, '')

  if (diferencia >= 10) {
    return { titulo: '¡Extraordinario!', detalle: `Llevas ${kg} kg menos desde que empezaste.`, tono: 'logro' }
  }
  if (diferencia >= 5) {
    return { titulo: '¡Excelente!', detalle: `Llevas ${kg} kg perdidos desde tu inicio.`, tono: 'logro' }
  }
  if (diferencia >= 2) {
    return { titulo: 'Vas muy bien', detalle: `Ya son ${kg} kg menos que al empezar.`, tono: 'logro' }
  }
  if (diferencia >= 0.5) {
    return { titulo: 'Buen comienzo', detalle: `${kg} kg menos desde tu primer registro.`, tono: 'logro' }
  }
  // Sin cambio o con subida: nada de celebrar, pero tampoco un reproche.
  if (diferencia > -0.5) {
    return { titulo: 'Te mantienes', detalle: 'Tu peso está estable desde que empezaste.', tono: 'neutro' }
  }
  return { titulo: 'Sigue adelante', detalle: 'Los procesos tienen altibajos; lo importante es la constancia.', tono: 'neutro' }
}

/** Para quien busca ganar masa, el logro es el inverso. */
function mensajeParaSubirMasa(diferencia: number): MensajeProgreso {
  const ganado = -diferencia
  const kg = Math.abs(ganado).toFixed(1).replace(/\.0$/, '')

  if (ganado >= 5) {
    return { titulo: '¡Excelente!', detalle: `Llevas ${kg} kg ganados desde que empezaste.`, tono: 'logro' }
  }
  if (ganado >= 2) {
    return { titulo: 'Vas muy bien', detalle: `Ya son ${kg} kg más que al empezar.`, tono: 'logro' }
  }
  if (ganado >= 0.5) {
    return { titulo: 'Buen comienzo', detalle: `${kg} kg más desde tu primer registro.`, tono: 'logro' }
  }
  if (ganado > -0.5) {
    return { titulo: 'Te mantienes', detalle: 'Tu peso está estable desde que empezaste.', tono: 'neutro' }
  }
  return { titulo: 'Sigue adelante', detalle: 'Los procesos tienen altibajos; lo importante es la constancia.', tono: 'neutro' }
}

// Objetivos de la hoja escritos a mano; se compara en minúsculas y sin
// depender de la redacción exacta.
function buscaSubirPeso(objetivo: string): boolean {
  const o = objetivo.toLowerCase()
  return o.includes('masa') || o.includes('aumentar') || o.includes('subir')
}

interface ProgresoPesoProps {
  paciente: Paciente | null
  seguimiento: Seguimiento[]
}

export function ProgresoPeso({ paciente, seguimiento }: ProgresoPesoProps) {
  const controles = [...seguimiento]
    .filter((s) => esNumero(s.pesoKg) && s.pesoKg > 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  const ultimo = controles[controles.length - 1]

  // El punto de partida es el peso basal de PACIENTES. Si aún no está
  // cargado, se usa el primer control como referencia.
  const pesoInicial = paciente && paciente.basal.pesoKg > 0 ? paciente.basal.pesoKg : controles[0]?.pesoKg

  if (!ultimo || !pesoInicial) {
    return (
      <Link to="/seguimiento">
        <Card interactive padding="lg" className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-papel">
            <Minus size={22} className="text-sage" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-tinta">Aún sin controles</p>
            <p className="font-sans text-xs text-muted">
              Tu nutricionista registrará tu peso en la próxima consulta.
            </p>
          </div>
        </Card>
      </Link>
    )
  }

  const diferencia = pesoInicial - ultimo.pesoKg
  const mensaje = buscaSubirPeso(paciente?.objetivo ?? '')
    ? mensajeParaSubirMasa(diferencia)
    : mensajeParaBajarGrasa(diferencia)

  const esLogro = mensaje.tono === 'logro'
  const Icono = diferencia > 0.05 ? TrendingDown : diferencia < -0.05 ? TrendingUp : Minus

  return (
    <Link to="/seguimiento">
      <Card interactive padding="lg">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              esLogro ? 'bg-verde/10' : 'bg-papel'
            }`}
          >
            <Icono size={22} className={esLogro ? 'text-verde' : 'text-sage'} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-base font-semibold text-tinta">{mensaje.titulo}</p>
            <p className="font-sans text-sm text-muted">{mensaje.detalle}</p>
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-linea pt-4 font-sans">
          <div>
            <p className="mb-0.5 text-xs text-muted">Al empezar</p>
            <p className="font-display text-xl font-semibold text-muted">{pesoInicial} kg</p>
          </div>
          <div className="text-right">
            <p className="mb-0.5 text-xs text-muted">Hoy · {formatearFecha(ultimo.fecha, false)}</p>
            <p className="font-display text-2xl font-semibold text-verde">{ultimo.pesoKg} kg</p>
          </div>
        </div>
      </Card>
    </Link>
  )
}
