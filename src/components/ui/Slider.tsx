import { useId } from 'react'
import { cn } from '../../lib/cn'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
  className?: string
}

export function Slider({ label, value, min, max, step = 1, unit, onChange, className }: SliderProps) {
  const id = useId()

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-tinta font-sans">
          {label}
        </label>
        <span className="font-display text-2xl font-semibold text-verde">
          {value}
          {unit && <span className="ml-1 text-sm font-sans font-medium text-muted">{unit}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-pill bg-linea accent-verde"
      />
    </div>
  )
}
