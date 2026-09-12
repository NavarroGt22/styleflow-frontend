'use client'

import { ReactNode, useCallback, useState } from 'react'
import { AdminConfirm } from './AdminUi'

export type ConfirmOptions = {
  title?: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type PendingConfirm = {
  opts: ConfirmOptions
  resolve: (value: boolean) => void
}

/**
 * Substituto de window.confirm() com diálogo dentro do app.
 * Uso:
 *   const { confirm, confirmDialog } = useConfirm(lightMode)
 *   if (!(await confirm({ message: 'Excluir?' }))) return
 *   ... e renderize {confirmDialog} no JSX.
 */
export function useConfirm(lightMode?: boolean) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options
    return new Promise<boolean>((resolve) => {
      setPending({ opts, resolve })
    })
  }, [])

  const close = useCallback(
    (value: boolean) => {
      setPending((current) => {
        current?.resolve(value)
        return null
      })
    },
    [],
  )

  const confirmDialog = pending ? (
    <AdminConfirm
      lightMode={lightMode}
      title={pending.opts.title ?? 'Você tem certeza?'}
      message={pending.opts.message}
      confirmLabel={pending.opts.confirmLabel ?? 'Sim, confirmar'}
      cancelLabel={pending.opts.cancelLabel ?? 'Cancelar'}
      danger={pending.opts.danger ?? true}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null

  return { confirm, confirmDialog }
}
