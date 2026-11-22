'use client'
import { useState } from 'react'
import { Modal } from './management/primitives'
import { useMutation } from './management/use-resource'
import { enterPlatformSupport } from '@/lib/platform/client'
type Target = { id: string; name: string; isActive: boolean; deletedAt: string | null; primarySalonSlug: string | null; billing: { adminLocked: boolean } }
export function PlatformSupportButton({ tenant }: { tenant: Target }) {
  const [open, setOpen] = useState(false), mutation = useMutation()
  const [entering, setEntering] = useState(false), [entryError, setEntryError] = useState('')
  const busy = entering || mutation.busy
  const disabled = !tenant.isActive || !!tenant.deletedAt || !tenant.primarySalonSlug || tenant.billing.adminLocked
  return <><button type="button" className="rounded-lg bg-lime-300 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40" disabled={disabled} title={disabled ? 'A conta precisa estar ativa, com salão disponível e acesso financeiro liberado.' : 'Iniciar atendimento auditado nesta conta'} onClick={() => { mutation.clearError(); setEntryError(''); setOpen(true) }}>Acessar como admin</button><Modal open={open} onClose={() => { if (!busy) setOpen(false) }} title={`Acessar ${tenant.name}`} description="Sessão temporária de suporte, com registro das suas operações."><form className="lead-form" onSubmit={async event => {
    event.preventDefault()
    if (busy) return
    setEntering(true); setEntryError('')
    try {
      const result = await mutation.mutate<{ code: string; sessionId: string; enterUrl: string }>(`/api/platform/admin/tenants/${tenant.id}/support-sessions`, 'POST', { reason: String(new FormData(event.currentTarget).get('reason')) })
      if (!result) return
      await enterPlatformSupport(result)
    } catch (cause) { setEntryError(cause instanceof Error ? cause.message : 'Falha ao iniciar o suporte.') }
    finally { setEntering(false) }
  }}><fieldset className="production-fieldset" disabled={busy}><label className="field">Motivo do acesso<textarea name="reason" minLength={5} maxLength={500} required rows={3} /></label>{(entryError || mutation.error) && <p className="form-error" role="alert">{entryError || mutation.error}</p>}<button className="button button-primary">{busy ? 'Preparando…' : 'Entrar no painel como suporte'}</button></fieldset></form></Modal></>
}
