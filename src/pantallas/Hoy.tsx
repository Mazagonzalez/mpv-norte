import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { fijarFoco, marcarHecho } from '../acciones'
import { db, type Foco, type Proyecto } from '../db'
import { fechaLocal } from '../fecha'
import { Aviso, Boton, Campo, Dialogo } from '../ui'

/** La app puede quedar abierta de un día para otro: la fecha se recalcula al volver a ella. */
function useFechaDeHoy() {
  const [fecha, setFecha] = useState(fechaLocal)

  useEffect(() => {
    const actualizar = () => setFecha(fechaLocal())
    const intervalo = setInterval(actualizar, 60_000)
    document.addEventListener('visibilitychange', actualizar)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', actualizar)
    }
  }, [])

  return fecha
}

export default function Hoy({ onAjustes, onProyectos }: { onAjustes: () => void; onProyectos: () => void }) {
  const fecha = useFechaDeHoy()
  const foco = useLiveQuery(async () => (await db.focos.get(fecha)) ?? null, [fecha])
  const activos = useLiveQuery(() => db.proyectos.where('estado').equals('activo').toArray())
  const proyectoDelFoco = useLiveQuery(
    async () => (foco ? ((await db.proyectos.get(foco.proyectoId)) ?? null) : null),
    [foco?.proyectoId],
  )

  return (
    <div className="flex h-full flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hoy</h1>
        <button type="button" aria-label="Ajustes" onClick={onAjustes} className="-mr-2 p-2 text-neutral-500">
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </svg>
        </button>
      </header>

      {foco === null && activos && <ElegirFoco fecha={fecha} activos={activos} onProyectos={onProyectos} />}
      {foco && proyectoDelFoco !== undefined && <FocoDelDia foco={foco} proyecto={proyectoDelFoco} />}
    </div>
  )
}

function ElegirFoco({
  fecha,
  activos,
  onProyectos,
}: {
  fecha: string
  activos: Proyecto[]
  onProyectos: () => void
}) {
  const [elegidoId, setElegidoId] = useState<string | null>(null)
  // null = todavía sin editar: se propone el siguiente paso del proyecto elegido
  const [pasoEditado, setPasoEditado] = useState<string | null>(null)
  const [error, setError] = useState('')

  const elegido = activos.find((p) => p.id === elegidoId) ?? (activos.length === 1 ? activos[0] : undefined)
  const paso = pasoEditado ?? elegido?.siguientePaso ?? ''

  if (activos.length === 0) {
    return (
      <>
        <p className="text-neutral-400">Para escoger un foco necesitas un proyecto activo.</p>
        <Boton variante="primario" onClick={onProyectos}>
          Ir a Proyectos
        </Boton>
      </>
    )
  }

  async function guardar() {
    if (!elegido) return
    try {
      await fijarFoco(fecha, elegido.id, paso)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
    }
  }

  return (
    <>
      <p className="text-2xl leading-snug">¿Qué es lo único que hoy te hace sentir que avanzaste?</p>
      {error && <Aviso>{error}</Aviso>}
      <div className="flex flex-col gap-2">
        {activos.map((proyecto) => (
          <button
            key={proyecto.id}
            type="button"
            aria-pressed={elegido?.id === proyecto.id}
            onClick={() => {
              setElegidoId(proyecto.id)
              setPasoEditado(null)
            }}
            className={`min-h-14 rounded-xl border px-4 py-2 text-left ${
              elegido?.id === proyecto.id ? 'border-amber-400 text-amber-400' : 'border-neutral-700'
            }`}
          >
            {proyecto.nombre}
          </button>
        ))}
      </div>
      {elegido && <Campo etiqueta="El paso de hoy" valor={paso} onCambio={setPasoEditado} />}
      <Boton variante="primario" disabled={!elegido || !paso.trim()} onClick={guardar} className="min-h-14 text-lg">
        Este es mi foco
      </Boton>
    </>
  )
}

function FocoDelDia({ foco, proyecto }: { foco: Foco; proyecto: Proyecto | null }) {
  const [marcando, setMarcando] = useState(false)

  return (
    <div className="flex flex-1 flex-col justify-between gap-6">
      <div>
        {proyecto && <p className="mb-2 text-neutral-400">{proyecto.nombre}</p>}
        <p className={`text-4xl leading-tight font-semibold break-words ${foco.hecho ? 'text-neutral-500 line-through' : ''}`}>
          {foco.paso}
        </p>
        {foco.hecho && <p className="mt-6 text-xl text-amber-400">Hecho. Eso era lo de hoy.</p>}
      </div>
      {!foco.hecho && (
        <Boton variante="primario" onClick={() => setMarcando(true)} className="min-h-16 text-xl">
          Hecho
        </Boton>
      )}
      {marcando && !foco.hecho && <DialogoHecho foco={foco} proyecto={proyecto} onCerrar={() => setMarcando(false)} />}
    </div>
  )
}

function DialogoHecho({ foco, proyecto, onCerrar }: { foco: Foco; proyecto: Proyecto | null; onCerrar: () => void }) {
  // Si el foco era justo el siguiente paso, ese ya quedó hecho: se empieza en blanco.
  const [siguiente, setSiguiente] = useState(proyecto && proyecto.siguientePaso !== foco.paso ? proyecto.siguientePaso : '')

  return (
    <Dialogo titulo="¡Hecho! ¿Qué sigue?" onCerrar={onCerrar}>
      <Campo etiqueta={`Siguiente paso de ${proyecto?.nombre ?? 'este proyecto'}`} valor={siguiente} onCambio={setSiguiente} autoFocus />
      <Boton variante="primario" disabled={!siguiente.trim()} onClick={() => marcarHecho(foco.fecha, foco.proyectoId, siguiente)}>
        Guardar
      </Boton>
      <Boton onClick={() => marcarHecho(foco.fecha, foco.proyectoId)}>Ahora no</Boton>
      <Boton variante="fantasma" onClick={onCerrar}>
        Cancelar, aún no está hecho
      </Boton>
    </Dialogo>
  )
}
