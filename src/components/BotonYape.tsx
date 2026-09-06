import { DollarSign } from 'lucide-react'

interface BotonYapeProps {
  recetaTitulo: string
  usuario: string
  monto?: string
}

export function BotonYape({ usuario, monto = 'S/ 39.90' }: Omit<BotonYapeProps, 'recetaTitulo'>) {
  // Link de Yape: yape://usuario (en app) o web fallback
  const linkYape = `https://yape.pe/${usuario}`

  const handleClick = () => {
    // Intenta abrir app de Yape, si no está disponible va a web
    window.open(linkYape, '_blank')
  }

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-2 rounded-control bg-gradient-to-r from-[#A023C0] to-[#7B1F8D] px-6 py-3 font-sans font-semibold text-white transition-all hover:shadow-lg hover:scale-105 active:scale-95"
    >
      <DollarSign size={18} />
      Pagar con Yape — {monto}
    </button>
  )
}
