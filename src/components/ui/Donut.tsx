import type { ReactNode } from 'react'

interface DonutProps {
  percentage: number
  color: string
  size?: number
  strokeWidth?: number
  trackColor?: string
  children?: ReactNode
}

export function Donut({
  percentage,
  color,
  size = 96,
  strokeWidth = 9,
  trackColor = '#D8CFC2',
  children,
}: DonutProps) {
  const clamped = Math.min(Math.max(percentage, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
