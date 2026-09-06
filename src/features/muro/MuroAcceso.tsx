import { Link } from 'react-router-dom'
import { Sprout } from 'lucide-react'
import { Button } from '../../components/ui/Button'

const AGENDA_LINK = import.meta.env.VITE_AGENDA_LINK || 'https://wa.me/51999999999'

export function MuroAcceso() {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-64px)] max-w-[440px] flex-col items-center justify-center px-6 py-16 text-center sm:min-h-[calc(100svh-73px)]">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-papel">
        <Sprout size={32} className="text-sage" strokeWidth={1.5} />
      </div>

      <p className="kicker mb-3">Acceso restringido</p>
      <h1 className="mb-3 font-display text-[28px] font-semibold leading-tight text-tinta sm:text-[32px]">
        Este contenido es para pacientes de Joel Flores
      </h1>
      <p className="mb-8 max-w-[360px] font-sans text-[15px] text-muted">
        Tu plan, tu historial y tu seguimiento se habilitan al activar tu acceso como paciente. Si ya
        tienes un código de acceso, ingrésalo; si aún no, agenda tu consulta.
      </p>

      <a href={AGENDA_LINK} target="_blank" rel="noreferrer" className="w-full">
        <Button variant="cta" size="lg" className="w-full">
          Agendar consulta
        </Button>
      </a>

      <Link
        to="/"
        className="mt-5 font-sans text-sm text-muted underline decoration-linea underline-offset-4 hover:text-verde"
      >
        Ya tengo un código de acceso
      </Link>
    </div>
  )
}
