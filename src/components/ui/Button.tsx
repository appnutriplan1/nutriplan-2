import { forwardRef } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'cta' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<ComponentProps<typeof motion.button>, 'ref' | 'children'> {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children?: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-verde text-crema hover:bg-verde/90 focus-visible:ring-verde/40 disabled:bg-verde/40',
  cta: 'bg-coral text-white hover:bg-coral/90 focus-visible:ring-coral/40 disabled:bg-coral/40',
  secondary:
    'bg-papel text-verde border border-linea hover:bg-linea/60 focus-visible:ring-verde/30 disabled:text-muted disabled:bg-papel/60',
  ghost:
    'bg-transparent text-tinta hover:bg-papel focus-visible:ring-verde/25 disabled:text-muted',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-12 px-6 text-[15px] gap-2',
  lg: 'h-14 px-8 text-base gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={{ duration: 0.12 }}
        className={cn(
          'inline-flex items-center justify-center rounded-control font-medium font-sans',
          'transition-colors duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-4',
          'disabled:cursor-not-allowed disabled:opacity-70',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {leftIcon}
        {children}
        {rightIcon}
      </motion.button>
    )
  },
)

Button.displayName = 'Button'
