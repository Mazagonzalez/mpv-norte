import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react'

const VARIANTES = {
  primario: 'bg-amber-400 font-semibold text-neutral-950',
  secundario: 'bg-neutral-800 text-neutral-100',
  fantasma: 'text-neutral-400',
}

export function Boton({
  variante = 'secundario',
  className = '',
  ...props
}: ComponentProps<'button'> & { variante?: keyof typeof VARIANTES }) {
  return (
    <button
      type="button"
      {...props}
      className={`min-h-12 rounded-xl px-4 py-2 disabled:opacity-40 ${VARIANTES[variante]} ${className}`}
    />
  )
}

export function Campo({
  etiqueta,
  valor,
  onCambio,
  autoFocus,
}: {
  etiqueta: string
  valor: string
  onCambio: (valor: string) => void
  autoFocus?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-neutral-300">{etiqueta}</span>
      <textarea
        rows={2}
        value={valor}
        autoFocus={autoFocus}
        onChange={(e) => onCambio(e.target.value)}
        className="w-full resize-none rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-base outline-none focus:border-amber-400"
      />
    </label>
  )
}

export function Aviso({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-neutral-900 p-3 text-sm whitespace-pre-line text-neutral-300">{children}</p>
}

/** Hoja modal sobre <dialog>. Se abre al montarse; Esc y "atrás" la cierran sin guardar. */
export function Dialogo({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      className="mx-auto mt-auto mb-0 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-neutral-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-neutral-100"
    >
      <h2 className="mb-4 text-xl font-semibold">{titulo}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </dialog>
  )
}
