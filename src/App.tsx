import { useState } from 'react'
import Estacionamiento from './pantallas/Estacionamiento'
import Proyectos from './pantallas/Proyectos'

type Pestana = 'hoy' | 'proyectos' | 'estacionamiento'

const PESTANAS: { id: Pestana; nombre: string; icono: React.ReactNode }[] = [
  {
    id: 'hoy',
    nombre: 'Hoy',
    icono: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    id: 'proyectos',
    nombre: 'Proyectos',
    icono: (
      <>
        <rect x="4" y="5" width="16" height="6" rx="1.5" />
        <rect x="4" y="13" width="16" height="6" rx="1.5" />
      </>
    ),
  },
  {
    id: 'estacionamiento',
    nombre: 'Estacionamiento',
    icono: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M10 17V8h3a3 3 0 0 1 0 6h-3" />
      </>
    ),
  },
]

export default function App() {
  const [pestana, setPestana] = useState<Pestana>('hoy')

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <main className="flex-1 overflow-y-auto px-4 pt-6 pb-8">
        {pestana === 'hoy' && <h1 className="text-2xl font-semibold">Hoy</h1>}
        {pestana === 'proyectos' && <Proyectos />}
        {pestana === 'estacionamiento' && <Estacionamiento />}
      </main>
      <nav className="flex border-t border-neutral-800 pb-[env(safe-area-inset-bottom)]">
        {PESTANAS.map(({ id, nombre, icono }) => (
          <button
            key={id}
            type="button"
            aria-label={nombre}
            aria-current={pestana === id ? 'page' : undefined}
            onClick={() => setPestana(id)}
            className={`flex h-16 flex-1 items-center justify-center ${
              pestana === id ? 'text-amber-400' : 'text-neutral-500'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {icono}
            </svg>
          </button>
        ))}
      </nav>
    </div>
  )
}
