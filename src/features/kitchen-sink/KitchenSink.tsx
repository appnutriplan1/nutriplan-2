import { useState } from 'react'
import type { ReactNode } from 'react'
import { Search, ArrowRight, Mail } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { Chip } from '../../components/ui/Chip'
import { Skeleton } from '../../components/ui/Skeleton'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-linea py-12 first:pt-0 last:border-b-0">
      <h2 className="mb-6 font-display text-2xl font-semibold text-verde">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export function KitchenSink() {
  const [selectedChip, setSelectedChip] = useState('proteinas')
  const [chips, setChips] = useState(['Sin lácteos', 'Bajo en sodio'])

  return (
    <div className="mx-auto max-w-[860px] px-6 pb-24">
      <header className="border-b border-linea py-14">
        <p className="kicker mb-4">Design System · Fundaciones</p>
        <h1 className="font-display text-[44px] font-semibold leading-[1.05] text-tinta sm:text-[56px]">
          Kitchen sink
        </h1>
        <p className="mt-4 max-w-[520px] font-sans text-[15px] text-muted">
          Componentes base de NutriPlan con todos sus estados. Revisión visual antes de avanzar a
          las calculadoras.
        </p>
      </header>

      <Section title="Botones">
        <Row label="Variantes">
          <Button variant="primary">Continuar</Button>
          <Button variant="cta" rightIcon={<ArrowRight size={18} />}>
            Descargar PDF
          </Button>
          <Button variant="secondary">Agendar consulta</Button>
          <Button variant="ghost">Cancelar</Button>
        </Row>
        <Row label="Tamaños">
          <Button size="sm">Pequeño</Button>
          <Button size="md">Mediano</Button>
          <Button size="lg">Grande</Button>
        </Row>
        <Row label="Estados">
          <Button variant="cta">Default</Button>
          <Button variant="cta" disabled>
            Deshabilitado
          </Button>
        </Row>
        <Row label="Con icono">
          <Button variant="primary" leftIcon={<Mail size={18} />}>
            Entrar con código
          </Button>
        </Row>
      </Section>

      <Section title="Inputs">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Input label="Código de acceso" placeholder="nc_8fK3-Qm2P-Zx91" />
          <Input
            label="Buscando (focus)"
            placeholder="Busca un alimento…"
            leftIcon={<Search size={18} />}
            autoFocus
          />
          <Input
            label="Correo"
            placeholder="tucorreo@email.com"
            error="Ingresa un correo válido"
            defaultValue="no-es-un-correo"
          />
          <Input label="Peso (kg)" placeholder="58" disabled helperText="Bloqueado por el nutricionista" />
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Card>
            <p className="kicker mb-2">Plan vigente</p>
            <h3 className="mb-2 font-display text-xl font-semibold text-tinta">
              Plan de reducción de grasa · Julio
            </h3>
            <p className="font-sans text-sm text-muted">
              Card estática, sombra suave tintada de verde, radio 20px.
            </p>
          </Card>
          <Card interactive>
            <p className="kicker mb-2">Herramienta</p>
            <h3 className="mb-2 font-display text-xl font-semibold text-tinta">
              Calculadora por alimentos
            </h3>
            <p className="font-sans text-sm text-muted">
              Card interactiva — pasa el cursor para ver la elevación + escala 1.02.
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Chips / pills">
        <Row label="Selección única">
          <Chip selected={selectedChip === 'proteinas'} onClick={() => setSelectedChip('proteinas')}>
            Proteínas
          </Chip>
          <Chip selected={selectedChip === 'carbohidratos'} onClick={() => setSelectedChip('carbohidratos')}>
            Carbohidratos
          </Chip>
          <Chip selected={selectedChip === 'grasas'} onClick={() => setSelectedChip('grasas')}>
            Grasas
          </Chip>
        </Row>
        <Row label="Filtros removibles">
          {chips.map((chip) => (
            <Chip key={chip} onRemove={() => setChips((c) => c.filter((x) => x !== chip))}>
              {chip}
            </Chip>
          ))}
          {chips.length === 0 && <p className="text-sm text-muted">Sin filtros activos.</p>}
        </Row>
      </Section>

      <Section title="Skeleton (shimmer)">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-card border border-linea bg-white p-5 shadow-soft">
            <Skeleton className="mb-4 h-32 w-full" />
            <Skeleton className="mb-2 h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex items-center gap-4 rounded-card border border-linea bg-white p-5 shadow-soft">
            <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
            <div className="flex-1">
              <Skeleton className="mb-2 h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Tipografía">
        <div className="space-y-4">
          <div>
            <p className="kicker mb-2">Fraunces · Display</p>
            <p className="font-display text-4xl font-semibold text-tinta">Tu plan, siempre contigo</p>
          </div>
          <div>
            <p className="kicker mb-2">Newsreader · Lectura larga</p>
            <p className="max-w-[520px] font-reading text-lg text-tinta">
              La lectura del plan debe sentirse cómoda como un libro, con márgenes generosos y
              tono papel.
            </p>
          </div>
          <div>
            <p className="kicker mb-2">Inter · UI</p>
            <p className="font-sans text-[15px] text-tinta">
              Texto de interfaz: botones, labels, inputs y datos.
            </p>
          </div>
        </div>
      </Section>
    </div>
  )
}
