import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { actualizarSiguientePaso, cerrar, crearProyecto, estacionar, pausar, reanudar, terminar } from '../acciones'
import { db, MAX_ACTIVOS, type EstadoProyecto, type Proyecto } from '../db'
import { fechaLocal } from '../fecha'
import { Aviso, Boton, Campo, Dialogo } from '../ui'

type DialogoAbierto =
  | { tipo: 'crear' }
  | { tipo: 'felicitar'; nombre: string }
  | { tipo: 'paso' | 'pausar' | 'estacionar' | 'cerrar' | 'terminar' | 'reanudar'; proyecto: Proyecto }

const GRUPOS: { estado: EstadoProyecto; titulo: string }[] = [
  { estado: 'pausado', titulo: 'Pausados' },
  { estado: 'estacionado', titulo: 'Estacionados' },
  { estado: 'terminado', titulo: 'Terminados' },
  { estado: 'cerrado', titulo: 'Cerrados' },
]

export default function Proyectos() {
  const proyectos = useLiveQuery(() => db.proyectos.toArray())
  const foco = useLiveQuery(() => db.focos.get(fechaLocal()))
  const [dialogo, setDialogo] = useState<DialogoAbierto | null>(null)
  const [error, setError] = useState('')

  if (!proyectos) return null

  const activos = proyectos.filter((p) => p.estado === 'activo')
  const hayCupo = activos.length < MAX_ACTIVOS

  async function ejecutar(accion: () => Promise<unknown>, siguiente: DialogoAbierto | null = null) {
    try {
      setError('')
      await accion()
      setDialogo(siguiente)
    } catch (e) {
      setDialogo(null)
      setError(e instanceof Error ? e.message : 'No se pudo guardar.')
    }
  }

  const cerrarDialogo = () => setDialogo(null)
  const avisoFoco = (proyecto: Proyecto) =>
    foco && !foco.hecho && foco.proyectoId === proyecto.id ? (
      <Aviso>El foco de hoy es de este proyecto: se quitará y podrás escoger otro.</Aviso>
    ) : null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Proyectos</h1>
        <span className="text-sm text-neutral-400">
          {activos.length} de {MAX_ACTIVOS} activos
        </span>
      </header>

      {error && <Aviso>{error}</Aviso>}

      <section className="flex flex-col gap-3">
        {activos.map((proyecto) => (
          <article key={proyecto.id} className="rounded-2xl border border-neutral-800 p-4">
            <h2 className="text-lg font-semibold">{proyecto.nombre}</h2>
            {proyecto.porQue && (
              <details className="mt-1 text-sm text-neutral-400">
                <summary>Por qué</summary>
                <p className="mt-1 whitespace-pre-line">{proyecto.porQue}</p>
              </details>
            )}
            <button
              type="button"
              onClick={() => setDialogo({ tipo: 'paso', proyecto })}
              className="mt-3 block min-h-12 w-full rounded-xl bg-neutral-900 p-3 text-left"
            >
              <span className="block text-xs text-neutral-400">Siguiente paso · tocar para editar</span>
              {proyecto.siguientePaso || <span className="text-amber-400">Define el siguiente paso</span>}
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Boton onClick={() => setDialogo({ tipo: 'pausar', proyecto })}>Pausar</Boton>
              <Boton onClick={() => setDialogo({ tipo: 'estacionar', proyecto })}>Estacionar</Boton>
              <Boton onClick={() => setDialogo({ tipo: 'cerrar', proyecto })}>Cerrar</Boton>
              <Boton onClick={() => setDialogo({ tipo: 'terminar', proyecto })}>Terminar</Boton>
            </div>
          </article>
        ))}
        {activos.length === 0 && <p className="text-neutral-400">Sin proyectos activos.</p>}
        <Boton variante={hayCupo ? 'primario' : 'secundario'} onClick={() => setDialogo({ tipo: 'crear' })}>
          Nuevo proyecto
        </Boton>
      </section>

      {GRUPOS.map(({ estado, titulo }) => {
        const delGrupo = proyectos.filter((p) => p.estado === estado)
        if (delGrupo.length === 0) return null
        return (
          <section key={estado}>
            <h2 className="mb-2 text-sm font-semibold text-neutral-400">{titulo}</h2>
            <ul className="divide-y divide-neutral-800">
              {delGrupo.map((proyecto) => (
                <li key={proyecto.id} className="py-3">
                  <p>{proyecto.nombre}</p>
                  {estado === 'pausado' && <p className="text-sm whitespace-pre-line text-neutral-400">{proyecto.notaPausa}</p>}
                  {estado === 'cerrado' && <p className="text-sm whitespace-pre-line text-neutral-400">{proyecto.aprendizaje}</p>}
                  {(estado === 'pausado' || estado === 'estacionado') && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Boton disabled={!hayCupo} onClick={() => setDialogo({ tipo: 'reanudar', proyecto })}>
                        Reanudar
                      </Boton>
                      {estado === 'pausado' && (
                        <Boton onClick={() => setDialogo({ tipo: 'estacionar', proyecto })}>Estacionar</Boton>
                      )}
                      <Boton onClick={() => setDialogo({ tipo: 'cerrar', proyecto })}>Cerrar</Boton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {(estado === 'pausado' || estado === 'estacionado') && !hayCupo && (
              <p className="mt-1 text-xs text-neutral-500">Para reanudar, primero libera un cupo.</p>
            )}
          </section>
        )
      })}

      {dialogo?.tipo === 'crear' && (
        <DialogoCrear
          hayCupo={hayCupo}
          onCerrar={cerrarDialogo}
          onGuardar={(datos) => ejecutar(() => crearProyecto(datos, hayCupo ? 'activo' : 'estacionado'))}
        />
      )}
      {dialogo?.tipo === 'paso' && (
        <DialogoTexto
          titulo={dialogo.proyecto.nombre}
          etiqueta="Siguiente paso"
          inicial={dialogo.proyecto.siguientePaso}
          confirmar="Guardar"
          onCerrar={cerrarDialogo}
          onGuardar={(texto) => ejecutar(() => actualizarSiguientePaso(dialogo.proyecto.id, texto))}
        />
      )}
      {dialogo?.tipo === 'pausar' && (
        <DialogoTexto
          titulo={`Pausar ${dialogo.proyecto.nombre}`}
          etiqueta="¿Dónde quedé y qué sigue?"
          confirmar="Pausar"
          aviso={avisoFoco(dialogo.proyecto)}
          onCerrar={cerrarDialogo}
          onGuardar={(texto) => ejecutar(() => pausar(dialogo.proyecto.id, texto))}
        />
      )}
      {dialogo?.tipo === 'cerrar' && (
        <DialogoTexto
          titulo={`Cerrar ${dialogo.proyecto.nombre}`}
          etiqueta="¿Qué aprendí?"
          confirmar="Cerrar proyecto"
          aviso={avisoFoco(dialogo.proyecto)}
          onCerrar={cerrarDialogo}
          onGuardar={(texto) => ejecutar(() => cerrar(dialogo.proyecto.id, texto))}
        />
      )}
      {dialogo?.tipo === 'reanudar' && (
        <DialogoTexto
          titulo={`Reanudar ${dialogo.proyecto.nombre}`}
          etiqueta="Siguiente paso"
          inicial={dialogo.proyecto.siguientePaso}
          confirmar="Reanudar"
          opcional
          aviso={dialogo.proyecto.notaPausa ? <Aviso>{`Dónde quedaste:\n${dialogo.proyecto.notaPausa}`}</Aviso> : null}
          onCerrar={cerrarDialogo}
          onGuardar={(texto) => ejecutar(() => reanudar(dialogo.proyecto.id, texto))}
        />
      )}
      {dialogo?.tipo === 'estacionar' && (
        <Dialogo titulo={`¿Estacionar ${dialogo.proyecto.nombre}?`} onCerrar={cerrarDialogo}>
          {avisoFoco(dialogo.proyecto)}
          <Boton variante="primario" onClick={() => ejecutar(() => estacionar(dialogo.proyecto.id))}>
            Estacionar
          </Boton>
          <Boton variante="fantasma" onClick={cerrarDialogo}>
            Cancelar
          </Boton>
        </Dialogo>
      )}
      {dialogo?.tipo === 'terminar' && (
        <Dialogo titulo={`¿Terminaste ${dialogo.proyecto.nombre}?`} onCerrar={cerrarDialogo}>
          {avisoFoco(dialogo.proyecto)}
          <Boton
            variante="primario"
            onClick={() =>
              ejecutar(() => terminar(dialogo.proyecto.id), { tipo: 'felicitar', nombre: dialogo.proyecto.nombre })
            }
          >
            Sí, terminado
          </Boton>
          <Boton variante="fantasma" onClick={cerrarDialogo}>
            Cancelar
          </Boton>
        </Dialogo>
      )}
      {dialogo?.tipo === 'felicitar' && (
        <Dialogo titulo="¡Felicitaciones!" onCerrar={cerrarDialogo}>
          <p>Terminaste {dialogo.nombre}. Bien hecho.</p>
          <Boton variante="primario" onClick={cerrarDialogo}>
            Listo
          </Boton>
        </Dialogo>
      )}
    </div>
  )
}

function DialogoTexto({
  titulo,
  etiqueta,
  inicial = '',
  confirmar,
  opcional,
  aviso,
  onCerrar,
  onGuardar,
}: {
  titulo: string
  etiqueta: string
  inicial?: string
  confirmar: string
  opcional?: boolean
  aviso?: React.ReactNode
  onCerrar: () => void
  onGuardar: (texto: string) => void
}) {
  const [texto, setTexto] = useState(inicial)
  return (
    <Dialogo titulo={titulo} onCerrar={onCerrar}>
      {aviso}
      <Campo etiqueta={etiqueta} valor={texto} onCambio={setTexto} autoFocus />
      <Boton variante="primario" disabled={!opcional && !texto.trim()} onClick={() => onGuardar(texto)}>
        {confirmar}
      </Boton>
      <Boton variante="fantasma" onClick={onCerrar}>
        Cancelar
      </Boton>
    </Dialogo>
  )
}

function DialogoCrear({
  hayCupo,
  onCerrar,
  onGuardar,
}: {
  hayCupo: boolean
  onCerrar: () => void
  onGuardar: (datos: Pick<Proyecto, 'nombre' | 'porQue' | 'siguientePaso'>) => void
}) {
  const [nombre, setNombre] = useState('')
  const [porQue, setPorQue] = useState('')
  const [siguientePaso, setSiguientePaso] = useState('')
  return (
    <Dialogo titulo="Nuevo proyecto" onCerrar={onCerrar}>
      {!hayCupo && (
        <Aviso>
          Ya tienes {MAX_ACTIVOS} proyectos activos, así que este no se puede activar. Puedes mandarlo al estacionamiento
          y reanudarlo cuando haya cupo.
        </Aviso>
      )}
      <Campo etiqueta="Nombre" valor={nombre} onCambio={setNombre} autoFocus />
      <Campo etiqueta="¿Por qué?" valor={porQue} onCambio={setPorQue} />
      <Campo etiqueta="Siguiente paso" valor={siguientePaso} onCambio={setSiguientePaso} />
      <Boton variante="primario" disabled={!nombre.trim()} onClick={() => onGuardar({ nombre, porQue, siguientePaso })}>
        {hayCupo ? 'Crear y activar' : 'Mandar al estacionamiento'}
      </Boton>
      <Boton variante="fantasma" onClick={onCerrar}>
        Cancelar
      </Boton>
    </Dialogo>
  )
}
