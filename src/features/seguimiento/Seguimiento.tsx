import { useEffect, useMemo } from 'react'
import { Activity, Flame, PieChart } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Donut } from '../../components/ui/Donut'
import { BmiGauge } from '../../components/ui/BmiGauge'
import { Skeleton } from '../../components/ui/Skeleton'
import { useAuth } from '../../context/useAuth'
import { calcularAporteMacro, calcularImc, categorizarImc } from '../../lib/calculators/clinical'
import { calcularEdad } from '../../lib/edad'
import { esNumero } from '../../lib/numero'
import { WeightTrendChart } from './WeightTrendChart'
import { ControlCard } from './ControlCard'

const MACRO_COLOR = {
  proteina: '#1E3547',
  carbohidrato: '#D7A536',
  grasa: '#D95C06',
}

function calcularRacha(seguimientoOrdenado: { fecha: string }[]): number {
  if (seguimientoOrdenado.length === 0) return 0
  let racha = 1
  for (let i = seguimientoOrdenado.length - 1; i > 0; i--) {
    const actual = new Date(seguimientoOrdenado[i].fecha).getTime()
    const anterior = new Date(seguimientoOrdenado[i - 1].fecha).getTime()
    const diffDias = (actual - anterior) / (1000 * 60 * 60 * 24)
    if (diffDias <= 14) racha++
    else break
  }
  return racha
}

export function Seguimiento() {
  const { paciente, planes, seguimiento, cargandoDatos, refrescarDatos } = useAuth()

  // Igual que en el Home: se pinta con lo que ya hay y se refresca por detrás.
  useEffect(() => {
    void refrescarDatos()
  }, [refrescarDatos])

  const loading = cargandoDatos

  const seguimientoOrdenado = useMemo(
    () => [...seguimiento].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [seguimiento],
  )
  // Del más reciente al más antiguo: es el orden en que se lee el historial.
  const controles = useMemo(() => [...seguimientoOrdenado].reverse(), [seguimientoOrdenado])

  const planVigente = planes.find((p) => p.estado === 'VIGENTE')
  const racha = calcularRacha(seguimientoOrdenado)

  const edad = paciente ? calcularEdad(paciente.fechaNacimiento) : null
  const esMenor = edad !== null && edad < 18

  // El IMC destacado se calcula sobre la medición más reciente que tenga peso
  // (un control puede registrar solo cintura o solo análisis).
  const ultimoConPeso = useMemo(
    () => [...seguimientoOrdenado].reverse().find((s) => esNumero(s.pesoKg) && s.pesoKg > 0),
    [seguimientoOrdenado],
  )
  // La talla se re-mide en cada control; si ese control no la trae, se usa la
  // de la ficha de la paciente.
  const tallaVigente = ultimoConPeso?.tallaCm && ultimoConPeso.tallaCm > 0 ? ultimoConPeso.tallaCm : paciente?.tallaCm ?? 0

  const imc = ultimoConPeso && tallaVigente > 0 ? calcularImc(ultimoConPeso.pesoKg, tallaVigente) : null
  const imcRedondeado = imc !== null ? Math.round(imc * 10) / 10 : null

  // La línea base solo se muestra aparte si no está ya registrada como el
  // primer control (en la hoja suele copiarse en ambos sitios).
  const fechaBasal = paciente?.inicioPlan || paciente?.fechaActualizacion || ''
  const mostrarBasal =
    !!paciente &&
    paciente.basal.pesoKg > 0 &&
    !seguimientoOrdenado.some(
      (s) => s.fecha === fechaBasal || (s.pesoKg === paciente.basal.pesoKg && s.cinturaCm === paciente.basal.cinturaCm),
    )

  if (loading) return <SeguimientoSkeleton />

  return (
    <div className="mx-auto max-w-[640px] px-5 pb-24 pt-10 sm:px-6">
      <p className="kicker mb-3">Mi seguimiento</p>
      <h1 className="mb-8 font-display text-[32px] font-semibold leading-tight text-tinta sm:text-[40px]">
        Tu progreso
      </h1>

      {imcRedondeado !== null ? (
        <Card padding="lg" className="mb-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="kicker mb-1">Índice de masa corporal</p>
              <p className="font-display text-5xl font-semibold text-tinta">{imcRedondeado}</p>
            </div>
            {/* En menores de edad el IMC no se clasifica con los cortes de
                adulto: en pediatría va por percentiles según edad y sexo.
                Se muestra el número, pero no una categoría que sería falsa. */}
            {esMenor ? (
              <span className="max-w-[170px] rounded-pill bg-papel px-3 py-1.5 text-right font-sans text-[11px] leading-tight text-muted">
                En menores se interpreta por percentiles; lo revisa tu nutricionista
              </span>
            ) : (
              <span className="rounded-pill bg-papel px-3 py-1 font-sans text-xs font-semibold text-verde">
                {categorizarImc(imc as number)}
              </span>
            )}
          </div>
          {!esMenor && <BmiGauge imc={imcRedondeado} />}
        </Card>
      ) : (
        <Card padding="lg" className="mb-6 flex flex-col items-center py-10 text-center">
          <Activity size={26} className="mb-3 text-sage" strokeWidth={1.5} />
          <p className="mb-1 font-display text-base font-semibold text-tinta">Aún sin controles</p>
          <p className="max-w-[260px] font-sans text-sm text-muted">
            En tu próxima consulta, tu nutricionista registrará tu primer peso y vas a ver tu IMC
            aquí.
          </p>
        </Card>
      )}

      {/* Historial: el control más reciente arriba, los anteriores debajo. */}
      {controles.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 font-display text-lg font-semibold text-verde">Tus controles</p>
          {controles.map((control, i) => (
            <ControlCard
              key={control.id}
              fecha={control.fecha}
              mediciones={control}
              tallaCm={control.tallaCm > 0 ? control.tallaCm : paciente?.tallaCm ?? 0}
              kicker={i === 0 ? 'Control más reciente' : undefined}
              destacado={i === 0}
            />
          ))}

          {/* El punto de partida vive en la ficha de la paciente, no en los
              controles: es con lo que entró al plan. Si además se registró
              como control de esa misma fecha, se muestra una sola vez. */}
          {mostrarBasal && paciente && (
            <ControlCard
              fecha={fechaBasal}
              mediciones={paciente.basal}
              tallaCm={paciente.tallaCm}
              kicker="Al empezar el plan"
            />
          )}
        </section>
      )}

      <Card padding="lg" className="mb-6">
        <p className="mb-4 font-display text-lg font-semibold text-verde">Tendencia de peso</p>
        <WeightTrendChart
          datos={seguimientoOrdenado
            .filter((s) => esNumero(s.pesoKg) && s.pesoKg > 0)
            .map((s) => ({ fecha: s.fecha, pesoKg: s.pesoKg }))}
        />
      </Card>

      {racha > 1 && (
        <Card padding="md" className="mb-6 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-papel">
            <Flame size={20} className="text-mandarina" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-tinta">{racha} controles seguidos</p>
            <p className="font-sans text-xs text-muted">
              Sigue registrando cada 1–2 semanas para mantener tu racha.
            </p>
          </div>
        </Card>
      )}

      <Card padding="lg">
        <p className="mb-5 font-display text-lg font-semibold text-verde">Macros de tu plan vigente</p>
        {planVigente ? (
          <div className="grid grid-cols-3 gap-4">
            <MacroDonut
              label="Proteína"
              color={MACRO_COLOR.proteina}
              gramos={planVigente.proteinasG}
              porcentaje={calcularAporteMacro(planVigente.proteinasG, 4, planVigente.kcalObjetivo).porcentaje}
            />
            <MacroDonut
              label="Carbos"
              color={MACRO_COLOR.carbohidrato}
              gramos={planVigente.carbohidratosG}
              porcentaje={calcularAporteMacro(planVigente.carbohidratosG, 4, planVigente.kcalObjetivo).porcentaje}
            />
            <MacroDonut
              label="Grasa"
              color={MACRO_COLOR.grasa}
              gramos={planVigente.grasasG}
              porcentaje={calcularAporteMacro(planVigente.grasasG, 9, planVigente.kcalObjetivo).porcentaje}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 text-center">
            <PieChart size={24} className="mb-3 text-sage" strokeWidth={1.5} />
            <p className="max-w-[260px] font-sans text-sm text-muted">
              Cuando tengas un plan vigente, vas a ver aquí el reparto de sus macros.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}

function MacroDonut({
  label,
  color,
  gramos,
  porcentaje,
}: {
  label: string
  color: string
  gramos: number
  porcentaje: number
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Donut percentage={porcentaje} color={color}>
        <div>
          <p className="font-display text-xl font-semibold text-tinta">{gramos}</p>
          <p className="-mt-0.5 font-sans text-[10px] text-muted">g</p>
        </div>
      </Donut>
      <p className="mt-2 font-sans text-sm font-medium text-tinta">{label}</p>
      <p className="font-sans text-xs text-muted">{porcentaje}%</p>
    </div>
  )
}

function SeguimientoSkeleton() {
  return (
    <div className="mx-auto max-w-[640px] px-5 pb-24 pt-10 sm:px-6">
      <Skeleton className="mb-3 h-3 w-28 rounded-pill" />
      <Skeleton className="mb-8 h-9 w-48 rounded-control" />
      <Skeleton className="mb-6 h-40 w-full rounded-card" />
      <Skeleton className="mb-3 h-32 w-full rounded-card" />
      <Skeleton className="mb-6 h-24 w-full rounded-card" />
      <Skeleton className="h-48 w-full rounded-card" />
    </div>
  )
}
