import { useMemo, useState, useEffect } from 'react'
import { Activity, Info } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { SiguientesPasos } from '../../components/EmbudoValor/SiguientesPasos'
import { Chip } from '../../components/ui/Chip'
import { BmiGauge } from '../../components/ui/BmiGauge'
import { cn } from '../../lib/cn'
import {
  ACTIVIDAD_DESCRIPCION,
  ACTIVIDAD_LABELS,
  OBJETIVO_LABELS,
  calcularResultadoClinico,
  type DatosClinicos,
  type NivelActividad,
  type Objetivo,
  type Sexo,
} from '../../lib/calculators/clinical'

const NIVELES_ACTIVIDAD = Object.keys(ACTIVIDAD_LABELS) as NivelActividad[]
const OBJETIVOS = Object.keys(OBJETIVO_LABELS) as Objetivo[]

const MACROS = [
  { key: 'proteina', label: 'Proteína', color: 'bg-verde' },
  { key: 'carbohidrato', label: 'Carbohidratos', color: 'bg-sage' },
  { key: 'grasa', label: 'Grasas', color: 'bg-coral' },
] as const

interface CampoNumericoProps {
  label: string
  unit: string
  example: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}

function CampoNumerico({ label, unit, example, min, max, step, value, onChange }: CampoNumericoProps) {
  const [texto, setTexto] = useState(String(value))

  useEffect(() => setTexto(String(value)), [value])

  function actualizar(nuevoTexto: string) {
    setTexto(nuevoTexto)
    const numero = Number(nuevoTexto.replace(',', '.'))
    if (nuevoTexto.trim() !== '' && Number.isFinite(numero) && numero >= min && numero <= max) onChange(numero)
  }

  function validar() {
    const numero = Number(texto.replace(',', '.'))
    if (!Number.isFinite(numero) || numero < min || numero > max) {
      setTexto(String(value))
      return
    }
    const ajustado = Math.round(numero / step) * step
    onChange(Number(ajustado.toFixed(step < 1 ? 1 : 0)))
    setTexto(String(Number(ajustado.toFixed(step < 1 ? 1 : 0))))
  }

  return (
    <label className="block">
      <span className="font-sans text-sm font-bold text-tinta">{label}</span>
      <span className="mt-2 flex min-h-14 overflow-hidden rounded-xl border border-linea bg-white shadow-sm transition-within focus-within:border-sage focus-within:ring-2 focus-within:ring-sage/20">
        <input
          type="text"
          inputMode={step < 1 ? 'decimal' : 'numeric'}
          value={texto}
          onChange={(event) => actualizar(event.target.value)}
          onBlur={validar}
          aria-label={`${label} en ${unit}`}
          className="min-w-0 flex-1 bg-transparent px-4 text-right font-sans text-xl font-extrabold text-verde outline-none"
        />
        <span className="flex min-w-16 items-center justify-center border-l border-linea bg-papel px-3 font-sans text-sm font-bold text-muted">{unit}</span>
      </span>
      <span className="mt-1.5 block font-sans text-xs text-muted">Ejemplo: {example}</span>
    </label>
  )
}

export function CalculadoraClinica() {
  const [datos, setDatos] = useState<DatosClinicos>({
    sexo: 'F', edad: 30, pesoKg: 65, tallaCm: 165, actividad: 'moderado', objetivo: 'bajar_grasa',
  })
  const [searchParams] = useSearchParams()

  const resultado = useMemo(() => calcularResultadoClinico(datos), [datos])

  useEffect(() => {
    const storageKey = 'nutriplan_objetivo_calorias'

    // Save to localStorage so CalculadoraAlimentos can read it
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        kcalObjetivo: resultado.kcalObjetivo,
        proteinas: resultado.proteina.gramos,
        carbohidratos: resultado.carbohidrato.gramos,
        grasas: resultado.grasa.gramos,
        guardadoEn: new Date().toISOString(),
      }),
    )

  }, [resultado.kcalObjetivo, resultado.proteina.gramos, resultado.carbohidrato.gramos, resultado.grasa.gramos])

  function set<K extends keyof DatosClinicos>(key: K, value: DatosClinicos[K]) {
    setDatos((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <main className="mx-auto max-w-[760px] px-5 pb-28 pt-10 sm:px-8 sm:pt-14">
      <header className="mb-10 max-w-xl">
        <p className="kicker mb-3">HERRAMIENTA NUTRIPLAN</p>
        <h1 className="font-display text-[32px] font-extrabold tracking-[-0.055em] text-verde sm:text-[44px]">Descubre cuánto necesita tu cuerpo</h1>
        <p className="mt-3 font-sans text-[15px] leading-relaxed text-muted">Responde 4 preguntas y obtén tu gasto calórico estimado, ajustado a tu ritmo de vida y tu meta.</p>
      </header>

      <section aria-label="Datos para calcular tu energía" className="border-y border-linea py-7 sm:py-8">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-papel font-sans text-xs font-extrabold text-verde">01</span>
          <div><p className="font-sans text-sm font-extrabold tracking-[-0.025em] text-verde">Tus datos</p><p className="font-sans text-xs text-muted">Ajusta cuando quieras, los resultados se actualizan en vivo.</p></div>
        </div>

        <div className="grid gap-7 sm:grid-cols-2 sm:gap-x-10">
          <div>
            <p className="mb-3 font-sans text-xs font-extrabold uppercase tracking-[0.13em] text-muted">Sexo</p>
            <div className="flex gap-2">
              {(['F', 'M'] as Sexo[]).map((sexo) => <Chip key={sexo} selected={datos.sexo === sexo} onClick={() => set('sexo', sexo)} className="flex-1 justify-center !rounded-xl !py-3 !font-bold">{sexo === 'F' ? 'Mujer' : 'Hombre'}</Chip>)}
            </div>
          </div>
          <CampoNumerico label="Edad" unit="años" example="37" min={15} max={80} step={1} value={datos.edad} onChange={(valor) => set('edad', valor)} />
          <CampoNumerico label="Peso" unit="kg" example="60.7 kg" min={35} max={150} step={0.1} value={datos.pesoKg} onChange={(valor) => set('pesoKg', valor)} />
          <CampoNumerico label="Talla" unit="cm" example="178.3 cm" min={130} max={210} step={0.1} value={datos.tallaCm} onChange={(valor) => set('tallaCm', valor)} />
        </div>
      </section>

      <section aria-label="Movimiento y objetivo" className="border-b border-linea py-7 sm:py-8">
        <div className="mb-6 flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-papel font-sans text-xs font-extrabold text-verde">02</span><p className="font-sans text-sm font-extrabold tracking-[-0.025em] text-verde">Tu ritmo</p></div>
        <p className="mb-3 font-sans text-xs font-extrabold uppercase tracking-[0.13em] text-muted">Nivel de actividad</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {NIVELES_ACTIVIDAD.map((nivel) => <button key={nivel} type="button" onClick={() => set('actividad', nivel)} className={cn('rounded-2xl border p-4 text-left transition-all', datos.actividad === nivel ? 'border-verde bg-verde text-white shadow-soft' : 'border-linea bg-transparent text-tinta hover:border-sage')}><p className="font-sans text-sm font-extrabold">{ACTIVIDAD_LABELS[nivel]}</p><p className={cn('mt-1 font-sans text-xs leading-relaxed', datos.actividad === nivel ? 'text-white/70' : 'text-muted')}>{ACTIVIDAD_DESCRIPCION[nivel]}</p></button>)}
        </div>
        <p className="mb-3 mt-7 font-sans text-xs font-extrabold uppercase tracking-[0.13em] text-muted">Objetivo</p>
        <div className="flex flex-wrap gap-2">{OBJETIVOS.map((objetivo) => <Chip key={objetivo} selected={datos.objetivo === objetivo} onClick={() => set('objetivo', objetivo)} className="!rounded-xl !py-3 !font-bold">{OBJETIVO_LABELS[objetivo]}</Chip>)}</div>
      </section>

      <section aria-label="Resultado de energía" className="mt-10 overflow-hidden rounded-[28px] bg-verde p-6 text-white shadow-soft-lg sm:p-9">
        <div className="flex items-center justify-between"><p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/60">Resultado de hoy</p><span className="h-2.5 w-2.5 rounded-full bg-coral" /></div>
        <div className="mt-8 flex items-end gap-3"><p className="font-display text-[clamp(76px,18vw,128px)] font-extrabold leading-[0.8] tracking-[-0.09em]">{resultado.kcalObjetivo}</p><p className="mb-1.5 font-sans text-lg font-semibold text-white/75 sm:text-xl">kcal / día</p></div>
        <p className="mt-6 border-t border-white/15 pt-4 font-sans text-sm text-white/70">Gasto estimado {resultado.gastoTotal} kcal <span className="mx-2 text-white/30">·</span> TMB {resultado.tmb} kcal</p>
        {searchParams.get('returnTo') === 'alimentos' && (
          <Link to="/calculadora-alimentos" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-control bg-coral px-5 font-sans text-sm font-extrabold text-white transition-transform hover:-translate-y-0.5">
            Usar este objetivo en mis comidas
          </Link>
        )}
      </section>

      <section aria-label="Distribución de macros" className="mt-10">
        <div className="mb-6 flex items-center justify-between"><div><p className="kicker mb-1">Tu balance</p><h2 className="font-display text-2xl font-extrabold tracking-[-0.05em] text-verde sm:text-3xl">Distribución de macros</h2></div><Activity size={23} strokeWidth={1.8} className="text-sage" /></div>
        <div className="divide-y divide-linea border-y border-linea">
          {MACROS.map(({ key, label, color }) => {
            const dato = resultado[key]
            return <div key={key} className="py-5"><div className="flex items-baseline justify-between gap-4"><p className="font-sans text-[15px] font-bold text-tinta">{label}</p><p className="font-sans text-xl font-extrabold tracking-[-0.05em] text-verde">{dato.gramos}<span className="ml-1 text-sm font-semibold text-muted">g</span></p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-linea"><div className={cn('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${dato.porcentaje}%` }} /></div></div>
          })}
        </div>
      </section>

      <section aria-label="Índice de masa corporal" className="mt-10 rounded-[24px] border border-linea bg-papel/65 p-6 sm:p-7">
        <div className="flex items-start justify-between gap-5"><div><p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">Índice de masa corporal</p><p className="mt-2 font-display text-4xl font-extrabold tracking-[-0.07em] text-verde">{resultado.imc}</p></div><span className="rounded-full bg-white px-3 py-1.5 font-sans text-xs font-extrabold text-verde">{resultado.categoriaImc}</span></div>
        <div className="mt-5"><BmiGauge imc={resultado.imc} /></div>
        <p className="mt-5 flex gap-2 font-sans text-xs leading-relaxed text-muted"><Info size={15} className="mt-0.5 shrink-0 text-sage" />Es una estimación orientativa. Tu plan personalizado considera más aspectos de tu salud y estilo de vida.</p>
      </section>

      <SiguientesPasos actual="calculadora-clinica" />
    </main>
  )
}
