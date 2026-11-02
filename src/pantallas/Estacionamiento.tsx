import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { activarIdea, capturarIdea } from '../acciones'
import { db, MAX_ACTIVOS, type Idea } from '../db'
import { Aviso, Boton, Campo, Dialogo } from '../ui'

export default function Estacionamiento() {
  const ideas = useLiveQuery(() => db.ideas.orderBy('fecha').reverse().toArray())
  const activos = useLiveQuery(() => db.proyectos.where('estado').equals('activo').count())
  const [titulo, setTitulo] = useState('')
  const [activando, setActivando] = useState<Idea | null>(null)
  const [mensaje, setMensaje] = useState('')

  if (!ideas || activos === undefined) return null

  const hayCupo = activos < MAX_ACTIVOS

  async function capturar(e: FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    await capturarIdea(titulo)
    setTitulo('')
  }

  async function activar(idea: Idea, porQue: string) {
    try {
      await activarIdea(idea, porQue)
      setMensaje(`${idea.titulo} ya es un proyecto activo.`)
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo activar.')
    }
    setActivando(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Estacionamiento</h1>

      <form onSubmit={capturar}>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Una idea nueva…"
          aria-label="Una idea nueva"
          enterKeyHint="done"
          className="min-h-12 w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-base outline-none focus:border-amber-400"
        />
      </form>

      {mensaje && <Aviso>{mensaje}</Aviso>}
      {!hayCupo && ideas.length > 0 && (
        <p className="text-sm text-neutral-400">Sin cupo: ya tienes {MAX_ACTIVOS} proyectos activos.</p>
      )}

      <ul className="divide-y divide-neutral-800">
        {ideas.map((idea) => (
          <li key={idea.id} className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0 break-words">{idea.titulo}</span>
            <Boton
              disabled={!hayCupo}
              onClick={() => {
                setMensaje('')
                setActivando(idea)
              }}
              className="shrink-0"
            >
              Activar
            </Boton>
          </li>
        ))}
      </ul>

      {activando && (
        <DialogoActivar idea={activando} onCerrar={() => setActivando(null)} onActivar={(porQue) => activar(activando, porQue)} />
      )}
    </div>
  )
}

const PREGUNTAS = ['¿Para quién es?', '¿La termino en unas semanas?', '¿Me emociona aunque la haga solo?']

function DialogoActivar({
  idea,
  onCerrar,
  onActivar,
}: {
  idea: Idea
  onCerrar: () => void
  onActivar: (porQue: string) => void
}) {
  const [respuestas, setRespuestas] = useState(['', '', ''])
  const completas = respuestas.every((r) => r.trim())

  return (
    <Dialogo titulo={`Activar ${idea.titulo}`} onCerrar={onCerrar}>
      {PREGUNTAS.map((pregunta, i) => (
        <Campo
          key={pregunta}
          etiqueta={pregunta}
          valor={respuestas[i]}
          autoFocus={i === 0}
          onCambio={(valor) => setRespuestas(respuestas.map((r, j) => (j === i ? valor : r)))}
        />
      ))}
      <Boton
        variante="primario"
        disabled={!completas}
        onClick={() => onActivar(PREGUNTAS.map((p, i) => `${p} ${respuestas[i].trim()}`).join('\n'))}
      >
        Activar
      </Boton>
      <Boton variante="fantasma" onClick={onCerrar}>
        Cancelar
      </Boton>
    </Dialogo>
  )
}
