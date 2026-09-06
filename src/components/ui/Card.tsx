import type { ComponentProps, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'

interface CardProps extends Omit<ComponentProps<typeof motion.div>, 'children'> {
  interactive?: boolean
  padding?: 'sm' | 'md' | 'lg'
  children?: ReactNode
}

const paddingStyles = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ className, interactive = false, padding = 'md', children, ...props }: CardProps) {
  return (
    <motion.div
      whileHover={interactive ? { scale: 1.02, y: -2 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'rounded-card border border-linea bg-papel/65 shadow-soft',
        interactive && 'cursor-pointer hover:shadow-soft-lg',
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}
