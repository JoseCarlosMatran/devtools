import { Outlet } from 'react-router-dom'
import { ScaleIcon } from '@heroicons/react/24/outline'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12">
        <div className="max-w-md text-center">
          <ScaleIcon className="h-20 w-20 text-white mx-auto mb-8" />
          <h1 className="text-4xl font-bold text-white mb-4">LegalRAG</h1>
          <p className="text-xl text-primary-200 mb-8">
            Prepara la defensa o ataque de tu caso judicial en minutos
          </p>
          <div className="space-y-4 text-left">
            <Feature text="Análisis automático de documentos legales" />
            <Feature text="Jurisprudencia relevante adaptada a tu caso" />
            <Feature text="Estrategias de defensa listas para juicio" />
            <Feature text="Generación de informes profesionales" />
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <ScaleIcon className="h-12 w-12 text-white mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-white">LegalRAG</h1>
          </div>

          {/* Auth card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <Outlet />
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-primary-300">
            © 2024 LegalRAG. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-primary-100">
      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent-success/20 flex items-center justify-center">
        <svg className="w-3 h-3 text-accent-success" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <span>{text}</span>
    </div>
  )
}
