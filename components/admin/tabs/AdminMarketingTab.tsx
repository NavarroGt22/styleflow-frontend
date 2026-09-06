'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link2, Megaphone, MessageCircle, Send, Users } from 'lucide-react'
import {
  AdminButton,
  AdminError,
  AdminLoading,
  inputClass,
  labelClass,
  sectionClass,
} from '../ui/AdminUi'
import type { AdminTabProps, SalonSettings } from '@/lib/admin/types'
import {
  broadcastSalonWhatsApp,
  fetchClientGroups,
  fetchSalon,
  sendSalonWhatsAppManual,
  testSalonWhatsApp,
  updateSalon,
  type ClientGroup,
} from '@/lib/admin/api'
import { resolveQueuePublicUrl } from '@/lib/admin/platform-urls'

const DEFAULT_TEMPLATE =
  'Olá {cliente}, seu horário no {estabelecimento} está chegando! Previsão: {tempo}.'

type SendMode = 'one' | 'group' | 'all'

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function checkboxClass(lightMode: boolean) {
  return `size-4 cursor-pointer rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 ${
    lightMode ? '' : 'border-slate-600 bg-slate-800'
  }`
}

function formatPreview(
  template: string,
  cliente: string,
  tempo: string,
  estabelecimento: string,
  posicao: string | number = 1
) {
  return template
    .replace(/{cliente}/g, cliente)
    .replace(/{posicao}/g, String(posicao))
    .replace(/{tempo}/g, tempo)
    .replace(/{estabelecimento}/g, estabelecimento)
}

function modeChipClass(lightMode: boolean, active: boolean) {
  if (active) {
    return lightMode
      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
      : 'border-emerald-500/70 bg-emerald-950/40 text-emerald-300'
  }
  return lightMode
    ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
    : 'border-slate-600 bg-[#142035] text-slate-300 hover:bg-slate-800'
}

export default function AdminMarketingTab({
  salonId,
  salonSlug,
  lightMode = false,
}: AdminTabProps & { salonSlug?: string }) {
  const [salon, setSalon] = useState<SalonSettings | null>(null)
  const [groups, setGroups] = useState<ClientGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [remindEnabled, setRemindEnabled] = useState(false)
  const [remindMinutes, setRemindMinutes] = useState('10')
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [gatewayUrl, setGatewayUrl] = useState('')
  const [gatewayToken, setGatewayToken] = useState('')

  const [sendMode, setSendMode] = useState<SendMode>('one')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualMessage, setManualMessage] = useState('')
  const [testPhone, setTestPhone] = useState('')

  const publicUrl = useMemo(() => {
    const slug = salonSlug || salon?.slug
    if (!slug) return ''
    return resolveQueuePublicUrl(slug, {
      clientDomain: salon?.tenant?.clientDomain,
      customDomain: salon?.tenant?.customDomain,
    })
  }, [salon, salonSlug])

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  )

  async function load() {
    if (!salonId) {
      setLoading(false)
      setError('Salão não identificado.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [data, groupList] = await Promise.all([
        fetchSalon(salonId),
        fetchClientGroups(salonId).catch(() => [] as ClientGroup[]),
      ])
      setSalon(data)
      const activeGroups = groupList.filter((g) => g.isActive !== false)
      setGroups(activeGroups)
      setRemindEnabled(Boolean(data.queueNotifyClient))
      setRemindMinutes(String(data.appointmentRemindMinutes ?? 10))
      setTemplate(data.whatsappTemplate || DEFAULT_TEMPLATE)
      setGatewayUrl(data.whatsappGatewayUrl || '')
      setGatewayToken(data.whatsappGatewayToken || '')
      setSelectedGroupId((current) => current || activeGroups[0]?.id || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar Marketing.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [salonId])

  function insertLink(url: string, label?: string) {
    const chunk = label ? `${label}: ${url}` : url
    setManualMessage((current) => (current.trim() ? `${current.trim()}\n\n${chunk}` : chunk))
  }

  async function handleSaveConfig(event: FormEvent) {
    event.preventDefault()
    if (!salonId) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const minutes = Number(remindMinutes) || 10
      const updated = await updateSalon(salonId, {
        queueNotifyClient: remindEnabled,
        appointmentRemindMinutes: minutes,
        whatsappTemplate: template,
        whatsappGatewayUrl: gatewayUrl.trim() || null,
        whatsappGatewayToken: gatewayToken.trim() || null,
      })
      setSalon(updated)
      setSuccess('Configurações de Marketing salvas.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleManualSend(event: FormEvent) {
    event.preventDefault()
    if (!salonId) return
    if (!manualMessage.trim()) {
      setError('Escreva a mensagem.')
      return
    }
    if (!gatewayUrl.trim()) {
      setError('Salve a URL do webhook n8n antes de disparar.')
      return
    }

    setSending(true)
    setError('')
    setSuccess('')
    try {
      await updateSalon(salonId, {
        whatsappGatewayUrl: gatewayUrl.trim() || null,
        whatsappGatewayToken: gatewayToken.trim() || null,
      })

      if (sendMode === 'one') {
        const digits = onlyDigits(manualPhone)
        if (digits.length < 10) {
          setError('Informe um celular válido com DDD.')
          return
        }
        await sendSalonWhatsAppManual(salonId, digits, manualMessage.trim())
        setSuccess('Mensagem enviada ao n8n. Confira o WhatsApp do destinatário.')
        return
      }

      const targetLabel =
        sendMode === 'group'
          ? `o grupo "${selectedGroup?.name || 'selecionado'}" (${selectedGroup?._count?.members ?? '?'} membros)`
          : 'todos os clientes com telefone'

      if (
        !window.confirm(
          `Enviar esta mensagem para ${targetLabel}?\n\nCada cliente recebe um WhatsApp individual via n8n (não é um grupo do WhatsApp).`
        )
      ) {
        return
      }

      const result = await broadcastSalonWhatsApp(salonId, {
        message: manualMessage.trim(),
        target: sendMode === 'all' ? 'all' : 'group',
        groupId: sendMode === 'group' ? selectedGroupId : undefined,
      })
      setSuccess(result.info || `Enviados: ${result.sent}/${result.total}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <AdminLoading lightMode={lightMode} text="Carregando Marketing..." />

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-start gap-3">
        <div
          className={`grid size-10 place-items-center rounded-xl ${
            lightMode ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-950/40 text-emerald-400'
          }`}
        >
          <Megaphone className="size-5" />
        </div>
        <div>
          <h3 className={`text-base font-bold sm:text-lg ${lightMode ? 'text-slate-900' : 'text-white'}`}>
            Marketing · WhatsApp
          </h3>
          <p className={`mt-1 text-xs sm:text-sm ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
            n8n + disparo individual, por grupo de clientes (aba Clientes) ou lembrete automático da agenda.
          </p>
        </div>
      </div>

      {error ? <AdminError message={error} /> : null}
      {success ? (
        <p className={`rounded-xl border px-4 py-3 text-sm ${lightMode ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'}`}>
          {success}
        </p>
      ) : null}

      <form onSubmit={handleSaveConfig} className={sectionClass(lightMode)}>
        <h4 className={`mb-4 text-sm font-bold uppercase tracking-wide ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
          1. Conexão n8n
        </h4>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass(lightMode)}>URL do webhook n8n</label>
            <input
              type="url"
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder="https://seu-n8n.app/webhook/styleflow-whatsapp"
              className={inputClass(lightMode)}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Guia: projeto-leitura/p3/WhatsApp-n8n-Evolution.md
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass(lightMode)}>Token do gateway (opcional)</label>
            <input
              type="password"
              value={gatewayToken}
              onChange={(e) => setGatewayToken(e.target.value)}
              placeholder="apikey / Bearer"
              className={inputClass(lightMode)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass(lightMode)}>Template do lembrete automático</label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={3}
              className={`${inputClass(lightMode)} h-auto py-3`}
              placeholder={DEFAULT_TEMPLATE}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Variáveis: {'{cliente}'}, {'{estabelecimento}'}, {'{tempo}'}, {'{posicao}'}
            </p>
          </div>
        </div>

        <div className={`mt-5 rounded-xl border p-4 ${lightMode ? 'border-slate-200 bg-slate-50' : 'border-slate-600 bg-[#142035]/60'}`}>
          <h4 className={`mb-3 text-sm font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
            2. Automação da agenda
          </h4>
          <label className={`mb-3 flex cursor-pointer items-center gap-3 text-sm font-medium ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
            <input
              type="checkbox"
              className={checkboxClass(lightMode)}
              checked={remindEnabled}
              onChange={(e) => setRemindEnabled(e.target.checked)}
            />
            Enviar lembrete automático antes do horário
          </label>
          <p className={`mb-3 text-[11px] leading-relaxed ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Ex.: cliente às 9:30 e aviso com 10 min → mensagem sai por volta das 9:20. O n8n entrega no WhatsApp.
          </p>
          <div className="max-w-xs">
            <label className={labelClass(lightMode)}>Minutos antes do horário</label>
            <input
              type="number"
              min={2}
              max={180}
              value={remindMinutes}
              onChange={(e) => setRemindMinutes(e.target.value)}
              disabled={!remindEnabled}
              className={inputClass(lightMode)}
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[5, 10, 15, 30].map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={!remindEnabled}
                  onClick={() => setRemindMinutes(String(m))}
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold disabled:opacity-40 ${
                    remindMinutes === String(m)
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : lightMode
                        ? 'border-slate-200 text-slate-600'
                        : 'border-slate-600 text-slate-300'
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
          {remindEnabled ? (
            <p className={`mt-3 text-[11px] ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Prévia: {formatPreview(template, 'João', '09:30', salon?.name || 'Barbearia')}
            </p>
          ) : null}
        </div>

        <div className={`mt-4 rounded-xl border p-3 ${lightMode ? 'border-slate-200 bg-white' : 'border-slate-600 bg-[#0f1a2a]'}`}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Testar webhook</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className={inputClass(lightMode)}
            />
            <AdminButton
              type="button"
              disabled={testing || !salonId}
              onClick={async () => {
                const digits = onlyDigits(testPhone)
                if (digits.length < 10) {
                  setError('Informe um celular com DDD para testar.')
                  return
                }
                if (!gatewayUrl.trim()) {
                  setError('Informe a URL do webhook n8n.')
                  return
                }
                setTesting(true)
                setError('')
                setSuccess('')
                try {
                  await updateSalon(salonId!, {
                    whatsappGatewayUrl: gatewayUrl.trim() || null,
                    whatsappGatewayToken: gatewayToken.trim() || null,
                    whatsappTemplate: template,
                    queueNotifyClient: remindEnabled,
                    appointmentRemindMinutes: Number(remindMinutes) || 10,
                  })
                  await testSalonWhatsApp(salonId!, digits)
                  setSuccess('Teste enviado. Verifique o WhatsApp.')
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Falha no teste.')
                } finally {
                  setTesting(false)
                }
              }}
            >
              {testing ? 'Enviando…' : 'Testar'}
            </AdminButton>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <AdminButton type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar Marketing'}
          </AdminButton>
        </div>
      </form>

      <form onSubmit={handleManualSend} className={sectionClass(lightMode)}>
        <div className="mb-4 flex items-center gap-2">
          <Send className={`size-4 ${lightMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
          <h4 className={`text-sm font-bold uppercase tracking-wide ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
            3. Disparo (manual / massa)
          </h4>
        </div>
        <p className={`mb-3 text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Use os grupos da aba <strong>Clientes</strong>. O envio é um WhatsApp por pessoa (não cria/entra em grupo do WhatsApp).
          Use {'{cliente}'} e {'{estabelecimento}'} na mensagem em massa.
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              { id: 'one' as const, label: '1 número' },
              { id: 'group' as const, label: 'Grupo de clientes' },
              { id: 'all' as const, label: 'Todos com telefone' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSendMode(opt.id)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${modeChipClass(lightMode, sendMode === opt.id)}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {publicUrl ? (
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => insertLink(publicUrl, 'Agende aqui')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                lightMode ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-slate-600 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Link2 className="size-3.5" />
              Inserir link da página
            </button>
            <button
              type="button"
              onClick={() => insertLink(publicUrl, 'Fila / agendamento')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                lightMode ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-slate-600 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <MessageCircle className="size-3.5" />
              Inserir link da fila
            </button>
          </div>
        ) : null}

        <div className="grid gap-3">
          {sendMode === 'one' ? (
            <div>
              <label className={labelClass(lightMode)}>Celular do cliente</label>
              <input
                type="tel"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className={inputClass(lightMode)}
              />
            </div>
          ) : null}

          {sendMode === 'group' ? (
            <div>
              <label className={labelClass(lightMode)}>Grupo (aba Clientes)</label>
              {groups.length === 0 ? (
                <p className={`rounded-xl border px-3 py-3 text-xs ${lightMode ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-amber-900/40 bg-amber-950/20 text-amber-200'}`}>
                  Nenhum grupo ainda. Crie em <strong>Clientes → Grupos</strong> e vincule os clientes.
                </p>
              ) : (
                <>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className={inputClass(lightMode)}
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g._count?.members ?? 0} membros)
                      </option>
                    ))}
                  </select>
                  {selectedGroup ? (
                    <p className={`mt-1.5 flex items-center gap-1.5 text-[11px] ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Users className="size-3.5" />
                      Dispara para membros com telefone válido neste grupo.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {sendMode === 'all' ? (
            <p className={`rounded-xl border px-3 py-3 text-xs ${lightMode ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-600 bg-[#142035]/60 text-slate-300'}`}>
              Envia para os clientes da lista (com celular), até 150 números por disparo. Ideal para promoções.
            </p>
          ) : null}

          <div>
            <label className={labelClass(lightMode)}>Mensagem</label>
            <textarea
              value={manualMessage}
              onChange={(e) => setManualMessage(e.target.value)}
              rows={5}
              placeholder={
                sendMode === 'one'
                  ? `Oi! Tudo bem? Segue o link para agendar na ${salon?.name || 'barbearia'}:`
                  : `Olá {cliente}! Novidade na {estabelecimento}: agende pelo link abaixo.`
              }
              className={`${inputClass(lightMode)} h-auto py-3`}
              maxLength={2000}
            />
            <p className="mt-1 text-right text-[11px] text-slate-400">{manualMessage.length}/2000</p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <AdminButton
            type="submit"
            disabled={sending || (sendMode === 'group' && groups.length === 0)}
          >
            {sending
              ? 'Enviando…'
              : sendMode === 'one'
                ? 'Enviar via n8n'
                : sendMode === 'group'
                  ? 'Disparar para o grupo'
                  : 'Disparar para todos'}
          </AdminButton>
        </div>
      </form>
    </div>
  )
}
