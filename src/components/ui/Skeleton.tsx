import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type SkeletonProps = HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn('skeleton rounded-card-sm', className)} {...props} />
}
