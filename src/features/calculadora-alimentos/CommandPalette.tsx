import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { searchAlimentos, listGrupos, type Alimento } from '../../services/alimentosService'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onSelect: (alimento: Alimento) => void
}

export function CommandPalette({ open, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState<string | null>(null)
  const [resultados, setResultados] = useState<Alimento[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const [grupos, setGrupos] = useState<string[]>([])

  useEffect(() => {
    listGrupos().then(setGrupos)
  }, [])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setGrupoFiltro(null)
    setActiveIndex(0)
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    let cancelado = false
    searchAlimentos(query).then((res) => {
      if (!cancelado) setResultados(res)
    })
    return () => {
      cancelado = true
    }
  }, [query])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const visibles = grupoFiltro ? resultados.filter((a) => a.grupo === grupoFiltro) : resultados

  function handleInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, visibles.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && visibles[activeIndex]) {
      onSelect(visibles[activeIndex])
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-tinta/50 px-4 pt-[8vh] backdrop-blur-sm sm:pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg overflow-hidden rounded-card bg-white shadow-soft-lg"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-linea px-5 py-4">
              <Search size={20} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Busca un alimento…"
                className="w-full bg-transparent font-sans text-[15px] text-tinta placeholder:text-muted/70 focus:outline-none"
              />
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full p-1 text-muted hover:bg-papel"
                aria-label="Cerrar buscador"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto border-b border-linea px-5 py-3">
              <FiltroChip active={grupoFiltro === null} onClick={() => setGrupoFiltro(null)}>
                Todos
              </FiltroChip>
              {grupos.map((g) => (
                <FiltroChip key={g} active={grupoFiltro === g} onClick={() => setGrupoFiltro(g)}>
                  {g}
                </FiltroChip>
              ))}
            </div>

            <div className="max-h-[50vh] overflow-y-auto py-2">
              {visibles.length === 0 && (
                <p className="px-5 py-8 text-center font-sans text-sm text-muted">
                  No encontramos alimentos con ese criterio.
                </p>
              )}
              {visibles.map((alimento, i) => (
                <button
                  key={alimento.id}
                  type="button"
                  onClick={() => onSelect(alimento)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    'flex w-full items-center justify-between px-5 py-3 text-left transition-colors',
                    i === activeIndex ? 'bg-papel' : 'bg-transparent',
                  )}
                >
                  <span>
                    <span className="block font-sans text-[15px] font-medium text-tinta">{alimento.nombre}</span>
                    <span className="block font-sans text-xs text-muted">{alimento.grupo}</span>
                  </span>
                  <span className="shrink-0 font-sans text-xs text-muted">{alimento.energiaKcal} kcal /100g</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FiltroChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-pill border px-3 py-1 font-sans text-xs font-medium transition-colors',
        active ? 'border-verde bg-verde text-crema' : 'border-linea bg-papel text-tinta hover:border-sage',
      )}
    >
      {children}
    </button>
  )
}
