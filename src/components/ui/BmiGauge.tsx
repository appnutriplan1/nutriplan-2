const SCALE_MIN = 15
const SCALE_MAX = 40

const ZONES = [
  { hasta: 18.5, color: '#D7A536' },
  { hasta: 25, color: '#8FAFC1' },
  { hasta: 30, color: '#D7A536' },
  { hasta: 40, color: '#D95C06' },
]

export function BmiGauge({ imc }: { imc: number }) {
  const clamped = Math.min(Math.max(imc, SCALE_MIN), SCALE_MAX)
  const markerPos = ((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100

  let anterior = SCALE_MIN
  const segments = ZONES.map((zona) => {
    const width = ((zona.hasta - anterior) / (SCALE_MAX - SCALE_MIN)) * 100
    anterior = zona.hasta
    return { width, color: zona.color }
  })

  return (
    <div className="relative pt-3">
      <div
        className="absolute top-0 -translate-x-1/2 transition-[left] duration-300 ease-out"
        style={{ left: `${markerPos}%` }}
      >
        <div className="h-3 w-3 rounded-full border-2 border-white bg-tinta shadow-soft" />
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-pill">
        {segments.map((seg, i) => (
          <div key={i} style={{ width: `${seg.width}%`, backgroundColor: seg.color }} />
        ))}
      </div>
    </div>
  )
}
