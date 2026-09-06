import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  leftIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, leftIcon, id, disabled, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const hasError = Boolean(error)

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-medium text-tinta font-sans"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={hasError}
            className={cn(
              'h-12 w-full rounded-control border bg-papel/70 px-4 font-sans text-[15px] text-tinta',
              'placeholder:text-muted/70',
              'transition-colors duration-150 ease-out',
              'focus:outline-none focus:ring-4',
              leftIcon && 'pl-11',
              hasError
                ? 'border-coral focus:border-coral focus:ring-coral/15'
                : 'border-linea focus:border-verde focus:ring-verde/15',
              disabled && 'cursor-not-allowed bg-papel/60 text-muted opacity-70',
              className,
            )}
            {...props}
          />
        </div>
        {(helperText || error) && (
          <p className={cn('mt-1.5 text-xs font-sans', hasError ? 'text-coral' : 'text-muted')}>
            {error ?? helperText}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
