'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Copy,
  Link2,
  Megaphone,
  MessageCircle,
  QrCode,
  RefreshCw,
  Send,
  Smartphone,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react'
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
  connectEvolutionWhatsApp,
  disconnectEvolutionWhatsApp,
  fetchClientGroups,
  fetchEvolutionWhatsAppStatus,
  fetchSalon,
  sendSalonWhatsAppManual,
  testSalonWhatsApp,
  updateSalon,
  type ClientGroup,
  type EvolutionWhatsAppStatus,
} from '@/lib/admin/api'
import { resolveQueuePublicUrl } from '@/lib/admin/platform-urls'

const DEFAULT_TEMPLATE =
  'Olá {cliente}, seu horário no {estabelecimento} está chegando! Dia {data} às {tempo}. Te esperamos!'

const LEGACY_QUEUE_TEMPLATE_HINT = /fila|posi[cç][aã]o|previs[aã]o para as/i

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
  data: string,
  posicao: string | number = 1
) {
  return template
    .replace(/{cliente}/g, cliente)
    .replace(/{posicao}/g, String(posicao))
    .replace(/{tempo}/g, tempo)
    .replace(/{data}/g, data)
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

function EvolutionStatusBadge({
  status,
  lightMode,
}: {
  status: EvolutionWhatsAppStatus | null
  lightMode: boolean
}) {
  if (!status) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
          lightMode ? 'border-slate-200 text-slate-500' : 'border-slate-600 text-slate-400'
        }`}
      >
        …
      </span>
    )
  }
  if (!status.configured) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
          lightMode
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-amber-900/40 bg-amber-950/30 text-amber-200'
        }`}
      >
        <WifiOff className="size-3.5" /> Servidor sem Evolution
      </span>
    )
  }
  if (status.connected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
        <Wifi className="size-3.5" /> Conectado
      </span>
    )
  }
  if (status.state === 'connecting') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
        <QrCode className="size-3.5" /> Aguardando QR
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        lightMode ? 'border-slate-200 text-slate-600' : 'border-slate-600 text-slate-300'
      }`}
    >
      <WifiOff className="size-3.5" /> Desconectado
    </span>
  )
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

  const [evoStatus, setEvoStatus] = useState<EvolutionWhatsAppStatus | null>(null)
  const [evoQr, setEvoQr] = useState<string | null>(null)
  const [evoPairingCode, setEvoPairingCode] = useState<string | null>(null)
  const [pairingCopied, setPairingCopied] = useState(false)
  const [evoPhone, setEvoPhone] = useState('')
  const [evoBusy, setEvoBusy] = useState(false)
  const [showEvoQr, setShowEvoQr] = useState(false)

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

  async function loadEvolutionStatus(silent = false) {
    if (!salonId) return
    try {
      const status = await fetchEvolutionWhatsAppStatus(salonId)
      setEvoStatus(status)
      if (status.connected) {
        setEvoQr(null)
        setEvoPairingCode(null)
      }
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Erro ao consultar WhatsApp.')
      }
    }
  }

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
      const loadedTemplate = data.whatsappTemplate || DEFAULT_TEMPLATE
      // Templates antigos de fila → troca pelo texto padrão da agenda
      setTemplate(
        LEGACY_QUEUE_TEMPLATE_HINT.test(loadedTemplate) ? DEFAULT_TEMPLATE : loadedTemplate
      )
      setGatewayUrl(data.whatsappGatewayUrl || '')
      setGatewayToken(data.whatsappGatewayToken || '')
      setEvoPhone((current) => current || data.phone || '')
      setSelectedGroupId((current) => current || activeGroups[0]?.id || '')
      await loadEvolutionStatus(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar Marketing.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [salonId])

  useEffect(() => {
    if (!salonId || (!evoQr && !evoPairingCode) || evoStatus?.connected) return
    const id = window.setInterval(() => {
      void loadEvolutionStatus(true)
    }, 4000)
    return () => window.clearInterval(id)
  }, [salonId, evoQr, evoPairingCode, evoStatus?.connected])

  function insertLink(url: string, label?: string) {
    const chunk = label ? `${label}: ${url}` : url
    setManualMessage((current) => (current.trim() ? `${current.trim()}\n\n${chunk}` : chunk))
  }

  async function handleConnectWhatsApp() {
    if (!salonId) return
    const digits = onlyDigits(evoPhone)
    if (digits.length < 10) {
      setError('Informe o celular do WhatsApp do salão (com DDD) para gerar o código de pareamento.')
      return
    }
    setEvoBusy(true)
    setError('')
    setSuccess('')
    try {
      const result = await connectEvolutionWhatsApp(salonId, digits)
      setEvoStatus(result)
      setEvoQr(result.qrBase64 || null)
      setEvoPairingCode(result.pairingCode || null)
      setPairingCopied(false)
      setShowEvoQr(false)
      if (result.connected) {
        setSuccess('WhatsApp conectado na Evolution.')
      } else if (result.pairingCode) {
        setSuccess('Código gerado. No celular: WhatsApp → Aparelhos conectados → Vincular com número.')
      } else if (result.qrBase64) {
        setSuccess('Abra este admin no computador/tablet para escanear o QR, ou tente de novo com o número.')
        setShowEvoQr(true)
      } else {
        setSuccess(result.label || 'Aguardando conexão…')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar pareamento da Evolution.')
    } finally {
      setEvoBusy(false)
    }
  }

  async function handleDisconnectWhatsApp() {
    if (!salonId) return
    if (!window.confirm('Desconectar o WhatsApp deste salão na Evolution?')) return
    setEvoBusy(true)
    setError('')
    setSuccess('')
    try {
      const result = await disconnectEvolutionWhatsApp(salonId)
      setEvoStatus(result)
      setEvoQr(null)
      setEvoPairingCode(null)
      setSuccess('WhatsApp desconectado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao desconectar.')
    } finally {
      setEvoBusy(false)
    }
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
            Parear número (Evolution), n8n, disparos e lembrete da agenda. O QR da fila do cliente fica na aba
            Fila.
          </p>
        </div>
      </div>

      {error ? <AdminError message={error} /> : null}
      {success ? (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            lightMode
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
          }`}
        >
          {success}
        </p>
      ) : null}

      <div className={sectionClass(lightMode)}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4
              className={`text-sm font-bold uppercase tracking-wide ${
                lightMode ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              1. Conectar WhatsApp (Evolution)
            </h4>
            <p className={`mt-1 max-w-xl text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Para barbeiro <strong>só com celular</strong>: use o <strong>código de pareamento</strong> (não dá
              para escanear o QR na mesma tela). O QR da fila do cliente continua na aba Fila.
            </p>
          </div>
          <EvolutionStatusBadge status={evoStatus} lightMode={lightMode} />
        </div>

        {evoStatus?.instanceName ? (
          <p className={`mb-3 text-[11px] ${lightMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Instância: <code className="rounded bg-black/10 px-1 py-0.5">{evoStatus.instanceName}</code>
          </p>
        ) : null}

        {!evoStatus?.configured ? (
          <p
            className={`rounded-xl border px-3 py-3 text-xs ${
              lightMode
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-amber-900/40 bg-amber-950/20 text-amber-100'
            }`}
          >
            A Evolution ainda não está ligada neste servidor (faltam <code>EVOLUTION_API_URL</code> e{' '}
            <code>EVOLUTION_API_KEY</code>). Com a VPS no ar (HTTPS <code>evo.…</code> ou API na mesma máquina),
            o botão passa a gerar o código aqui.
          </p>
        ) : null}

        <div className="mb-3 max-w-sm">
          <label className={labelClass(lightMode)}>Celular do WhatsApp do salão</label>
          <input
            type="tel"
            value={evoPhone}
            onChange={(e) => setEvoPhone(e.target.value)}
            placeholder="(71) 98888-0000"
            className={inputClass(lightMode)}
            disabled={evoBusy || evoStatus?.configured === false}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            É o número que vai receber/enviar as mensagens (não o do cliente).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <AdminButton
            type="button"
            disabled={evoBusy || !salonId || evoStatus?.configured === false}
            onClick={handleConnectWhatsApp}
          >
            {evoBusy ? (
              'Aguarde…'
            ) : evoStatus?.connected ? (
              <>
                <RefreshCw className="size-3.5" /> Reconectar / atualizar
              </>
            ) : (
              <>
                <Smartphone className="size-3.5" /> Gerar código de pareamento
              </>
            )}
          </AdminButton>
          {evoStatus?.connected || evoQr || evoPairingCode ? (
            <AdminButton type="button" variant="ghost" disabled={evoBusy} onClick={handleDisconnectWhatsApp}>
              Desconectar
            </AdminButton>
          ) : null}
          <AdminButton
            type="button"
            variant="ghost"
            disabled={evoBusy || !salonId}
            onClick={() => loadEvolutionStatus(false)}
          >
            Atualizar status
          </AdminButton>
        </div>

        {evoPairingCode ? (
          <div
            className={`mt-4 rounded-xl border p-4 ${
              lightMode ? 'border-emerald-200 bg-emerald-50' : 'border-emerald-900/40 bg-emerald-950/30'
            }`}
          >
            <p className={`text-xs font-semibold ${lightMode ? 'text-emerald-900' : 'text-emerald-200'}`}>
              PIN de 8 caracteres (formato ABCD-EFGH)
            </p>
            <ol className={`mt-2 list-decimal space-y-1 pl-4 text-[11px] ${lightMode ? 'text-emerald-800' : 'text-emerald-100/90'}`}>
              <li>Abra o WhatsApp neste mesmo celular</li>
              <li>Menu → Aparelhos conectados → Conectar um aparelho</li>
              <li>
                Escolha <strong>Vincular com número de telefone</strong>
              </li>
              <li>Digite ou cole o PIN abaixo (só 8 letras/números)</li>
            </ol>

            <p className="mt-4 text-center font-mono text-3xl font-black tracking-[0.2em] text-emerald-400 sm:text-4xl">
              {evoPairingCode}
            </p>

            <button
              type="button"
              onClick={async () => {
                try {
                  // WhatsApp tem 8 caixas — copia sem hífen
                  await navigator.clipboard.writeText(evoPairingCode.replace(/[^A-Za-z0-9]/g, ''))
                  setPairingCopied(true)
                  window.setTimeout(() => setPairingCopied(false), 2200)
                } catch {
                  setError('Não foi possível copiar. Segure o código e escolha Copiar.')
                }
              }}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition hover:text-emerald-300 active:scale-[0.98]"
            >
              {pairingCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {pairingCopied ? 'Código copiado!' : 'Copiar código'}
            </button>

            <p className={`mt-2 text-[11px] ${lightMode ? 'text-emerald-700/80' : 'text-slate-400'}`}>
              O status atualiza sozinho após vincular.
            </p>
          </div>
        ) : null}

        {evoQr ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowEvoQr((v) => !v)}
              className={`text-xs font-semibold underline-offset-2 hover:underline ${
                lightMode ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              {showEvoQr ? 'Ocultar QR (PC/tablet)' : 'Tenho computador/tablet — mostrar QR'}
            </button>
            {showEvoQr ? (
              <div
                className={`mt-3 flex flex-col items-center gap-3 rounded-xl border p-4 ${
                  lightMode ? 'border-slate-200 bg-white' : 'border-slate-600 bg-[#0f1a2a]'
                }`}
              >
                <p className={`text-center text-xs ${lightMode ? 'text-slate-600' : 'text-slate-300'}`}>
                  Abra o admin no PC/tablet e escaneie com o WhatsApp do celular (não funciona na mesma tela).
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={evoQr}
                  alt="QR Code WhatsApp Evolution"
                  className="size-56 rounded-lg bg-white p-2 shadow-sm"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSaveConfig} className={sectionClass(lightMode)}>
        <h4
          className={`mb-4 text-sm font-bold uppercase tracking-wide ${
            lightMode ? 'text-slate-700' : 'text-slate-300'
          }`}
        >
          2. Conexão n8n
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
            <label className={labelClass(lightMode)}>Texto do lembrete automático (agenda)</label>
            <p className={`mb-2 text-xs leading-relaxed ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Quando o horário do cliente estiver perto (ex.: corte às <strong>09:00</strong> e aviso com{' '}
              <strong>10 min</strong> → envia ~<strong>08:50</strong>), o sistema monta a mensagem sozinho com
              nome, data e hora do agendamento. Nome e telefone vêm da <strong>Agenda</strong> /{' '}
              <strong>Clientes</strong> — você não digita isso aqui.
            </p>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={3}
              className={`${inputClass(lightMode)} h-auto py-3`}
              placeholder={DEFAULT_TEMPLATE}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(
                [
                  ['{cliente}', 'Nome'],
                  ['{data}', 'Data'],
                  ['{tempo}', 'Horário'],
                  ['{estabelecimento}', 'Salão'],
                ] as const
              ).map(([token, label]) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => setTemplate((t) => (t.includes(token) ? t : `${t.trim()} ${token}`.trim()))}
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${
                    lightMode
                      ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      : 'border-slate-600 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {label} {token}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTemplate(DEFAULT_TEMPLATE)}
                className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${
                  lightMode
                    ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    : 'border-emerald-800 text-emerald-300 hover:bg-emerald-950/40'
                }`}
              >
                Restaurar texto padrão
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Variáveis preenchidas no envio: {'{cliente}'}, {'{data}'}, {'{tempo}'}, {'{estabelecimento}'}
            </p>
          </div>
        </div>

        <div
          className={`mt-5 rounded-xl border p-4 ${
            lightMode ? 'border-slate-200 bg-slate-50' : 'border-slate-600 bg-[#142035]/60'
          }`}
        >
          <h4 className={`mb-3 text-sm font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
            3. Automação da agenda
          </h4>
          <label
            className={`mb-3 flex cursor-pointer items-center gap-3 text-sm font-medium ${
              lightMode ? 'text-slate-700' : 'text-slate-300'
            }`}
          >
            <input
              type="checkbox"
              className={checkboxClass(lightMode)}
              checked={remindEnabled}
              onChange={(e) => setRemindEnabled(e.target.checked)}
            />
            Enviar lembrete automático antes do horário
          </label>
          <p className={`mb-3 text-[11px] leading-relaxed ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Ex.: cliente agendou às 9:00 e você escolhe 10 min → a mensagem sai por volta das 8:50, com o nome e o
            telefone já cadastrados na Agenda/Clientes.
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
              Prévia: {formatPreview(template, 'João', '09:00', salon?.name || 'Barbearia', '10/09/2026')}
            </p>
          ) : null}
        </div>

        <div
          className={`mt-4 rounded-xl border p-3 ${
            lightMode ? 'border-slate-200 bg-white' : 'border-slate-600 bg-[#0f1a2a]'
          }`}
        >
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
          <h4
            className={`text-sm font-bold uppercase tracking-wide ${
              lightMode ? 'text-slate-700' : 'text-slate-300'
            }`}
          >
            4. Disparo (manual / massa)
          </h4>
        </div>
        <p className={`mb-3 text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Use os grupos da aba <strong>Clientes</strong>. O envio é um WhatsApp por pessoa (não cria/entra em
          grupo do WhatsApp). Use {'{cliente}'} e {'{estabelecimento}'} na mensagem em massa.
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
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${modeChipClass(
                lightMode,
                sendMode === opt.id
              )}`}
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
                lightMode
                  ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  : 'border-slate-600 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Link2 className="size-3.5" />
              Inserir link da página
            </button>
            <button
              type="button"
              onClick={() => insertLink(publicUrl, 'Fila / agendamento')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                lightMode
                  ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  : 'border-slate-600 text-slate-200 hover:bg-slate-800'
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
                <p
                  className={`rounded-xl border px-3 py-3 text-xs ${
                    lightMode
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-amber-900/40 bg-amber-950/20 text-amber-200'
                  }`}
                >
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
                    <p
                      className={`mt-1.5 flex items-center gap-1.5 text-[11px] ${
                        lightMode ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      <Users className="size-3.5" />
                      Dispara para membros com telefone válido neste grupo.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {sendMode === 'all' ? (
            <p
              className={`rounded-xl border px-3 py-3 text-xs ${
                lightMode
                  ? 'border-slate-200 bg-slate-50 text-slate-600'
                  : 'border-slate-600 bg-[#142035]/60 text-slate-300'
              }`}
            >
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
          <AdminButton type="submit" disabled={sending || (sendMode === 'group' && groups.length === 0)}>
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
