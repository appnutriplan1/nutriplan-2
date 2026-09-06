import { ArrowLeft, Database, ExternalLink, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

const EMAIL_PROFESIONAL = 'jnutricionysalud@gmail.com'

export function Privacidad() {
  return (
    <main className="pb-24 sm:pb-0">
      <section className="border-b border-linea bg-papel/50">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:px-8 sm:py-20">
          <Link to="/servicios" className="mb-8 inline-flex items-center gap-2 font-sans text-sm font-semibold text-verde hover:underline">
            <ArrowLeft size={16} /> Volver a servicios
          </Link>
          <p className="kicker mb-4">Transparencia y confianza</p>
          <h1 className="font-display text-4xl font-semibold leading-[1.02] text-tinta sm:text-6xl">Aviso de privacidad</h1>
          <p className="mt-5 max-w-2xl font-sans text-base leading-relaxed text-muted">
            Aquí explicamos, en lenguaje sencillo, cómo se utiliza la información cuando visitas NutriPlan o solicitas un servicio.
          </p>
          <p className="mt-5 font-sans text-xs text-muted">Última actualización: 30 de julio de 2026</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-4xl gap-8 px-6 py-14 sm:px-8 sm:py-20">
        <section className="rounded-card border border-linea bg-crema p-6 sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-verde text-crema"><ShieldCheck size={21} /></div>
          <h2 className="mt-6 font-display text-2xl font-semibold text-tinta">Responsable del servicio</h2>
          <p className="mt-4 font-sans text-sm leading-relaxed text-muted">
            NutriPlan es una plataforma utilizada por el nutricionista Joel Roberto Flores Espinoza, CNP 6920, para brindar información, recursos y acompañamiento nutricional.
          </p>
        </section>

        <section className="rounded-card border border-linea bg-papel/45 p-6 sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-verde text-crema"><Database size={21} /></div>
          <h2 className="mt-6 font-display text-2xl font-semibold text-tinta">Información que puede utilizarse</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <h3 className="font-sans text-sm font-semibold text-tinta">Visitantes y solicitudes</h3>
              <ul className="mt-3 space-y-2 font-sans text-sm leading-relaxed text-muted">
                <li>Nombre y datos de contacto.</li>
                <li>Servicio de interés.</li>
                <li>Información incluida voluntariamente en el mensaje.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-sans text-sm font-semibold text-tinta">Pacientes registrados</h3>
              <ul className="mt-3 space-y-2 font-sans text-sm leading-relaxed text-muted">
                <li>Datos de identificación y contacto.</li>
                <li>Información necesaria para la atención nutricional.</li>
                <li>Planes, controles y registros de seguimiento.</li>
                <li>Código personal de acceso.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-card bg-verde p-6 text-crema sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-crema/10"><ExternalLink size={21} /></div>
          <h2 className="mt-6 font-display text-2xl font-semibold">Formulario y WhatsApp</h2>
          <p className="mt-4 font-sans text-sm leading-relaxed text-crema/75">
            El formulario de servicios no envía ni almacena automáticamente la información en NutriPlan. Al pulsar “Enviar consulta”, se prepara un mensaje y se abre WhatsApp. Tú puedes revisarlo, modificarlo o cancelar antes de enviarlo.
          </p>
          <p className="mt-4 font-sans text-sm leading-relaxed text-crema/75">
            Cuando decides enviar el mensaje, la información también queda sujeta a las condiciones y prácticas de privacidad de WhatsApp.
          </p>
        </section>

        <section className="rounded-card border border-linea bg-crema p-6 sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-verde text-crema"><LockKeyhole size={21} /></div>
          <h2 className="mt-6 font-display text-2xl font-semibold text-tinta">Para qué se utiliza la información</h2>
          <ul className="mt-5 grid gap-3 font-sans text-sm leading-relaxed text-muted sm:grid-cols-2">
            <li>Responder consultas y solicitudes.</li>
            <li>Preparar propuestas de servicios.</li>
            <li>Brindar atención y seguimiento nutricional.</li>
            <li>Administrar el acceso privado de pacientes.</li>
            <li>Mejorar los recursos y funcionamiento de NutriPlan.</li>
            <li>Cumplir obligaciones relacionadas con el servicio profesional.</li>
          </ul>
        </section>

        <section className="rounded-card border border-linea bg-crema p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-tinta">Consultas sobre tu información</h2>
          <p className="mt-4 font-sans text-sm leading-relaxed text-muted">
            Puedes solicitar información, corrección o eliminación de datos que correspondan contactando directamente al profesional.
          </p>
          <a href={`mailto:${EMAIL_PROFESIONAL}?subject=Consulta%20sobre%20privacidad%20en%20NutriPlan`} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-verde px-5 py-3 font-sans text-sm font-semibold text-crema hover:bg-verde/90">
            <Mail size={17} /> {EMAIL_PROFESIONAL}
          </a>
        </section>
      </div>
    </main>
  )
}
