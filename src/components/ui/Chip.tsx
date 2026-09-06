import type { ButtonHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  onRemove?: () => void
}

export function Chip({ className, selected = false, onRemove, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-4 py-1.5 font-sans text-sm font-medium',
        'transition-colors duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-verde/20',
        selected
          ? 'border-verde bg-verde text-crema'
          : 'border-linea bg-papel text-tinta hover:border-sage',
        className,
      )}
      {...props}
    >
      {children}
      {onRemove && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="-mr-1 rounded-full p-0.5 hover:bg-black/10"
        >
          <X size={12} strokeWidth={2.5} />
        </span>
      )}
    </button>
  )
}
