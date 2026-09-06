import { TrendingDown, TrendingUp, Minus, LineChart } from 'lucide-react'

interface PuntoSeguimiento {
  fecha: string
  pesoKg: number
}

const W = 320
const H = 140
const PAD_X = 6
const PAD_TOP = 14
const PAD_BOTTOM = 4

function formatFecha(iso: string): string {
  const [anio, mes, dia] = iso.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).replace('.', '')
}

export function WeightTrendChart({ datos }: { datos: PuntoSeguimiento[] }) {
  const ordenados = [...datos].sort((a, b) => a.fecha.localeCompare(b.fecha))

  if (ordenados.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center rounded-card-sm bg-papel/60 py-10 text-center">
        <LineChart size={22} className="mb-2 text-sage" strokeWidth={1.5} />
        <p className="font-sans text-sm text-muted">
          Aún no hay suficientes registros para ver tu tendencia.
        </p>
      </div>
    )
  }

  const pesos = ordenados.map((d) => d.pesoKg)
  const min = Math.min(...pesos)
  const max = Math.max(...pesos)
  const rango = Math.max(max - min, 0.5)
  const plotW = W - PAD_X * 2
  const plotH = H - PAD_TOP - PAD_BOTTOM

  const puntos = ordenados.map((d, i) => ({
    x: PAD_X + (i / (ordenados.length - 1)) * plotW,
    y: PAD_TOP + (1 - (d.pesoKg - min) / rango) * plotH,
    ...d,
  }))

  const linePath = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${puntos[puntos.length - 1].x.toFixed(1)},${PAD_TOP + plotH} L${puntos[0].x.toFixed(1)},${PAD_TOP + plotH} Z`

  const primero = ordenados[0]
  const ultimo = ordenados[ordenados.length - 1]
  const delta = Math.round((ultimo.pesoKg - primero.pesoKg) * 10) / 10
  const Icono = delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5 font-sans text-sm text-muted">
        <Icono size={16} className="text-verde" />
        <span>
          {delta === 0 ? 'Sin cambio' : `${delta > 0 ? '+' : ''}${delta} kg`} desde tu primer control
        </span>
      </div>

      <div className="aspect-[2.3/1] w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="tendenciaPeso" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5D91B5" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#5D91B5" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#tendenciaPeso)" />
          <path d={linePath} fill="none" stroke="#1E3547" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {puntos.map((p, i) => {
            const esUltimo = i === puntos.length - 1
            return (
              <circle
                key={p.fecha}
                cx={p.x}
                cy={p.y}
                r={esUltimo ? 5 : 3}
                fill={esUltimo ? '#D95C06' : '#1E3547'}
                stroke="#F3ECE1"
                strokeWidth={esUltimo ? 2 : 0}
              />
            )
          })}
        </svg>
      </div>

      <div className="mt-1.5 flex justify-between font-sans text-xs text-muted">
        <span>{formatFecha(primero.fecha)}</span>
        <span>{formatFecha(ultimo.fecha)}</span>
      </div>
    </div>
  )
}
