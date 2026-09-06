import type { ReactNode } from 'react'

export function Carousel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-9">
      <p className="mb-3 px-5 font-display text-xl font-semibold text-tinta sm:px-6">{title}</p>
      <div className="scrollbar-hide flex gap-4 overflow-x-auto px-5 pb-1 sm:px-6">{children}</div>
    </section>
  )
}
