import { useState, type ChangeEvent } from 'react'
import { exportar, importar, leerRespaldo, type Respaldo } from '../respaldo'
import { Aviso, Boton, Dialogo } from '../ui'

export default function Ajustes({ onVolver }: { onVolver: () => void }) {
  const [mensaje, setMensaje] = useState('')
  const [porImportar, setPorImportar] = useState<Respaldo | null>(null)

  async function elegirArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = '' // para poder volver a escoger el mismo archivo
    if (!archivo) return
    setMensaje('')
    try {
      setPorImportar(leerRespaldo(await archivo.text()))
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo leer el archivo.')
    }
  }

  async function confirmarImportacion(respaldo: Respaldo) {
    try {
      await importar(respaldo)
      setMensaje('Datos importados.')
    } catch {
      setMensaje('No se pudo importar. Tus datos quedaron como estaban.')
    }
    setPorImportar(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <Boton variante="fantasma" onClick={onVolver} className="-mr-4">
          Volver
        </Boton>
      </header>

      <p className="text-sm text-neutral-400">Tus datos solo están en este dispositivo. Exporta un respaldo de vez en cuando.</p>
      {mensaje && <Aviso>{mensaje}</Aviso>}

      <Boton variante="primario" onClick={exportar}>
        Exportar datos
      </Boton>
      <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-neutral-800 px-4 py-2 focus-within:outline-2 focus-within:outline-amber-400">
        Importar datos
        <input type="file" accept="application/json,.json" onChange={elegirArchivo} className="sr-only" />
      </label>

      {porImportar && (
        <Dialogo titulo="¿Reemplazar tus datos?" onCerrar={() => setPorImportar(null)}>
          <p>Se borrará todo lo que hay en este dispositivo y quedará lo del respaldo:</p>
          <p className="text-neutral-400">
            Proyectos: {porImportar.proyectos.length} · Focos: {porImportar.focos.length} · Ideas: {porImportar.ideas.length}
          </p>
          <Boton variante="primario" onClick={() => confirmarImportacion(porImportar)}>
            Reemplazar
          </Boton>
          <Boton variante="fantasma" onClick={() => setPorImportar(null)}>
            Cancelar
          </Boton>
        </Dialogo>
      )}
    </div>
  )
}
