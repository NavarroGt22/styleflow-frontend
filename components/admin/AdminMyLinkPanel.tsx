'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  QrCode,
  Send,
  Share2,
  X,
} from 'lucide-react'
import { fetchSalon, updateSalon } from '@/lib/admin/api'
import { resolveClientLink, isRealCustomDomain } from '@/lib/admin/platform-urls'
import type { SalonSettings } from '@/lib/admin/types'
import { AdminError, AdminLoading, inputClass } from './ui/AdminUi'

type Props = {
  salonId: string
  salonSlug: string
  lightMode?: boolean
  onClose: () => void
}

type View = 'share' | 'config' | 'qr'

const MAX_DAYS_OPTIONS = [7, 15, 30, 45, 60, 90, 180, 365]
const ADVANCE_OPTIONS = [0, 15, 30, 60, 120, 180, 360, 720, 1440, 2880]
const EXTRA_TEXT_LIMIT = 120
const SHARE_TEXT_LIMIT = 600
const DEFAULT_SHARE_TEMPLATE = [
  'Olá, tudo bem?',
  '',
  'Se deseja *agendar algum de nossos serviços* na {estabelecimento}, use nosso link de agendamento abaixo. É rápido e fácil.',
  '',
  '✅ {link}',
].join('\n')

function advanceLabel(minutes: number, zeroLabel: string): string {
  if (!minutes) return zeroLabel
  if (minutes < 60) return `${minutes} minutos antes`
  if (minutes % 1440 === 0) {
    const days = minutes / 1440
    return days === 1 ? '1 dia antes' : `${days} dias antes`
  }
  const hours = minutes / 60
  return hours === 1 ? '1 hora antes' : `${hours} horas antes`
}

function buildShareMessage(template: string, link: string, salonName: string): string {
  const text = (template.trim() || DEFAULT_SHARE_TEMPLATE)
    .replaceAll('{estabelecimento}', salonName)
    .replaceAll('{link}', link)
  // Se o barbeiro apagou o {link} do texto, o endereço ainda precisa ir junto
  return text.includes(link) ? text : `${text}\n\n${link}`
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-[#1877f2]">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
    </svg>
  )
}

function Toggle({
  checked,
  onChange,
  title,
  description,
  lightMode,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  title: string
  description: string
  lightMode: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#142035]'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={title}
          onClick={() => onChange(!checked)}
          className={`mt-0.5 h-6 w-11 shrink-0 rounded-full p-0.5 transition ${
            checked ? 'bg-emerald-500' : lightMode ? 'bg-slate-300' : 'bg-slate-600'
          }`}
        >
          <span
            className={`block size-5 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${lightMode ? 'text-slate-900' : 'text-white'}`}>{title}</p>
          <p className={`mt-1 text-xs leading-relaxed ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AdminMyLinkPanel({ salonId, salonSlug, lightMode = false, onClose }: Props) {
  const [view, setView] = useState<View>('share')
  const [salon, setSalon] = useState<SalonSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState<'link' | 'text' | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [toast, setToast] = useState('')

  const [form, setForm] = useState({
    slug: salonSlug,
    bookingLinkEnabled: true,
    bookingMaxDaysAhead: 45,
    bookingMinAdvanceMinutes: 0,
    bookingAllowClientCancel: true,
    bookingCancelMinMinutes: 0,
    bookingAllowClientReschedule: true,
    bookingSuccessGif: true,
    bookingExtraText: '',
    bookingShareMessage: '',
    bookingPrimaryColor: '',
  })

  const applySalon = useCallback((data: SalonSettings) => {
    setSalon(data)
    setForm({
      slug: data.slug || '',
      bookingLinkEnabled: data.bookingLinkEnabled ?? true,
      bookingMaxDaysAhead: data.bookingMaxDaysAhead ?? 45,
      bookingMinAdvanceMinutes: data.bookingMinAdvanceMinutes ?? 0,
      bookingAllowClientCancel: data.bookingAllowClientCancel ?? true,
      bookingCancelMinMinutes: data.bookingCancelMinMinutes ?? 0,
      bookingAllowClientReschedule: data.bookingAllowClientReschedule ?? true,
      bookingSuccessGif: data.bookingSuccessGif ?? true,
      bookingExtraText: data.bookingExtraText || '',
      bookingShareMessage: data.bookingShareMessage || '',
      bookingPrimaryColor: data.bookingPrimaryColor || data.tenant?.primaryColor || '#d5a85c',
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchSalon(salonId)
      .then((data) => {
        if (!cancelled) {
          applySalon(data)
          setError('')
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Não foi possível carregar as configurações do link.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [salonId, applySalon])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const publicLink = useMemo(
    () => resolveClientLink(salon?.slug || salonSlug, salon?.tenant?.clientDomain),
    [salon?.slug, salon?.tenant?.clientDomain, salonSlug]
  )
  // Domínio white-label ainda inclui /app/:slug no path
  const usesCustomDomain = useMemo(() => {
    const probe = resolveClientLink('__slug__', salon?.tenant?.clientDomain)
    return isRealCustomDomain(salon?.tenant?.clientDomain) && !probe.includes('/app/__slug__')
  }, [salon?.tenant?.clientDomain])
  const linkPrefix = useMemo(() => {
    const probe = resolveClientLink('__slug__', salon?.tenant?.clientDomain)
    if (usesCustomDomain) return `${probe.replace(/\/$/, '')}/`
    return probe.replace('__slug__/login', '').replace('__slug__', '')
  }, [salon?.tenant?.clientDomain, usesCustomDomain])

  const shareMessage = useMemo(
    () => buildShareMessage(form.bookingShareMessage, publicLink, salon?.name || 'nossa barbearia'),
    [form.bookingShareMessage, publicLink, salon?.name]
  )

  useEffect(() => {
    if (view !== 'qr' || !publicLink) return
    let cancelled = false
    QRCode.toDataURL(publicLink, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b0d0e', light: '#ffffff' },
    })
      .then((png) => {
        if (!cancelled) setQrDataUrl(png)
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível gerar o QR Code.')
      })
    return () => {
      cancelled = true
    }
  }, [view, publicLink])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }

  async function copy(value: string, kind: 'link' | 'text') {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      showToast(kind === 'link' ? 'Link copiado.' : 'Texto copiado.')
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      setError('Não foi possível copiar. Copie manualmente.')
    }
  }

  function openShareTarget(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function shareFromDevice() {
    try {
      await navigator.share({ title: salon?.name || 'Meu link', text: shareMessage, url: publicLink })
      setMoreOpen(false)
    } catch {
      /* usuário cancelou o menu do aparelho */
    }
  }

  function downloadQr() {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `meu-link-${(salon?.slug || salonSlug).replace(/\s+/g, '-')}.png`
    a.click()
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const slug = form.slug.trim().toLowerCase()
      const payload: Record<string, unknown> = {
        bookingLinkEnabled: form.bookingLinkEnabled,
        bookingMaxDaysAhead: form.bookingMaxDaysAhead,
        bookingMinAdvanceMinutes: form.bookingMinAdvanceMinutes,
        bookingAllowClientCancel: form.bookingAllowClientCancel,
        bookingCancelMinMinutes: form.bookingCancelMinMinutes,
        bookingAllowClientReschedule: form.bookingAllowClientReschedule,
        bookingSuccessGif: form.bookingSuccessGif,
        bookingExtraText: form.bookingExtraText.trim() || null,
        bookingShareMessage: form.bookingShareMessage.trim() || null,
        bookingPrimaryColor: form.bookingPrimaryColor || null,
      }
      if (slug && slug !== salon?.slug) payload.slug = slug

      const updated = await updateSalon(salonId, payload)
      applySalon(updated)
      setSuccess('Configurações do link salvas.')
      window.setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError((err as Error).message || 'Não foi possível salvar as configurações.')
    } finally {
      setSaving(false)
    }
  }

  const surface = lightMode ? 'bg-slate-50 text-slate-900' : 'bg-[#0b1224] text-slate-100'
  const mutedText = lightMode ? 'text-slate-500' : 'text-slate-400'
  const groupLabel = `mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] ${
    lightMode ? 'text-slate-500' : 'text-slate-400'
  }`
  const selectClass = `${inputClass(lightMode)} appearance-none`

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Meu link">
      <div className={`min-h-full ${surface}`}>
        <div className="mx-auto w-full max-w-lg px-4 pb-28 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              aria-label={view === 'share' ? 'Fechar' : 'Voltar'}
              onClick={() => (view === 'share' ? onClose() : setView('share'))}
              className={`grid size-9 place-items-center rounded-xl transition ${
                lightMode ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <ArrowLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className={`grid size-9 place-items-center rounded-xl transition ${
                lightMode ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <X className="size-5" />
            </button>
          </div>

          <p className={`text-xs ${mutedText}`}>
            {view === 'config' ? 'Configurar' : view === 'qr' ? 'QR Code' : 'Compartilhar'}
          </p>
          <h2 className="mb-5 text-3xl font-bold tracking-tight">Meu link</h2>

          {error ? (
            <div className="mb-4">
              <AdminError message={error} />
            </div>
          ) : null}
          {success ? (
            <p className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-500">
              {success}
            </p>
          ) : null}

          {loading ? (
            <AdminLoading lightMode={lightMode} text="Carregando link..." />
          ) : view === 'share' ? (
            <>
              <div
                className="rounded-2xl p-4 text-white shadow-lg"
                style={{ backgroundColor: 'var(--brand, #d5a85c)' }}
              >
                <h3 className="text-lg font-bold">Fale de sua agenda para seus clientes.</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/80">
                  Compartilhe seu link com seus clientes para que eles possam realizar o agendamento dos serviços.
                </p>

                <div className="mt-4 flex items-stretch gap-0 overflow-hidden rounded-xl bg-black/10">
                  <p className="flex min-w-0 flex-1 items-center truncate px-3 text-xs text-white/90">{publicLink}</p>
                  <button
                    type="button"
                    onClick={() => copy(publicLink, 'link')}
                    className="shrink-0 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow"
                  >
                    {copied === 'link' ? 'Copiado!' : 'Copiar link'}
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <span
                      className={`size-2 rounded-full ${form.bookingLinkEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    />
                    Seu link está <strong>{form.bookingLinkEnabled ? 'online' : 'desativado'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setView('config')}
                    className="shrink-0 text-xs font-bold text-slate-900 underline"
                  >
                    Configurar link
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-1">
                  {[
                    {
                      key: 'whatsapp',
                      label: 'WhatsApp',
                      icon: <MessageCircle className="size-5 text-emerald-500" />,
                      onClick: () =>
                        openShareTarget(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`),
                    },
                    {
                      key: 'qr',
                      label: 'QRCode',
                      icon: <QrCode className="size-5 text-slate-900" />,
                      onClick: () => setView('qr'),
                    },
                    {
                      key: 'facebook',
                      label: 'Facebook',
                      icon: <FacebookGlyph />,
                      onClick: () =>
                        openShareTarget(
                          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicLink)}`
                        ),
                    },
                    {
                      key: 'more',
                      label: 'Mais',
                      icon: <MoreHorizontal className="size-5 text-slate-900" />,
                      onClick: () => setMoreOpen(true),
                    },
                  ].map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={action.onClick}
                      className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition hover:bg-white/10"
                    >
                      <span className="grid size-11 place-items-center rounded-xl bg-white shadow">{action.icon}</span>
                      <span className="text-[11px] font-semibold text-white">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`mt-5 rounded-2xl border p-4 ${
                  lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#142035]'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold">Compartilhando texto</h4>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setView('config')}
                      className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold transition ${
                        lightMode ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <Pencil className="size-3.5" /> Editar
                    </button>
                    <button
                      type="button"
                      aria-label="Copiar texto de compartilhamento"
                      onClick={() => copy(shareMessage, 'text')}
                      className={`grid size-8 place-items-center rounded-lg transition ${
                        lightMode ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {copied === 'text' ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                    </button>
                  </div>
                </div>
                <p className={`whitespace-pre-wrap break-words text-xs leading-relaxed ${mutedText}`}>
                  {shareMessage}
                </p>
              </div>
            </>
          ) : view === 'qr' ? (
            <div
              className={`rounded-2xl border p-5 text-center ${
                lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#142035]'
              }`}
            >
              <div className="mx-auto w-fit rounded-xl bg-white p-3">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="QR Code do link de agendamento" className="size-56" />
                ) : (
                  <div className="grid size-56 place-items-center text-xs text-slate-400">Gerando…</div>
                )}
              </div>
              <p className={`mt-3 break-all text-xs ${mutedText}`}>{publicLink}</p>
              <button
                type="button"
                onClick={downloadQr}
                disabled={!qrDataUrl}
                className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand,#d5a85c)] px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                <Download className="size-4" /> Baixar PNG
              </button>
            </div>
          ) : (
            <>
              <p className={`mb-4 text-center text-sm ${mutedText}`}>
                Ajuste os campos abaixo para configurar parâmetros de seu link.
              </p>

              <div className="space-y-4">
                <Toggle
                  lightMode={lightMode}
                  checked={form.bookingLinkEnabled}
                  onChange={(v) => setForm((f) => ({ ...f, bookingLinkEnabled: v }))}
                  title="Receber agendamentos pelo link"
                  description="Desativando essa função você estará desligando seu link de agendamento."
                />

                <div>
                  <span className={groupLabel}>Link personalizado</span>
                  <div className="flex items-stretch">
                    <span
                      className={`flex max-w-[45%] items-center truncate rounded-l-xl border border-r-0 px-3 text-xs ${
                        lightMode
                          ? 'border-slate-200 bg-slate-100 text-slate-500'
                          : 'border-slate-600 bg-[#0f1a2c] text-slate-400'
                      }`}
                    >
                      {linkPrefix}
                    </span>
                    <input
                      value={form.slug}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        }))
                      }
                      placeholder="seu-link-de-agendamento"
                      className={`${inputClass(lightMode)} rounded-l-none`}
                    />
                  </div>
                  <p className={`mt-1.5 text-xs ${mutedText}`}>
                    {usesCustomDomain
                      ? 'Você usa domínio próprio: o link compartilhado é a raiz do seu domínio, o nome abaixo vale para os links internos.'
                      : 'Escolha um nome único para o seu link e torne sua página mais profissional.'}
                  </p>
                </div>

                <div>
                  <span className={groupLabel}>Período máximo para agendar</span>
                  <select
                    value={form.bookingMaxDaysAhead}
                    onChange={(e) => setForm((f) => ({ ...f, bookingMaxDaysAhead: Number(e.target.value) }))}
                    className={selectClass}
                  >
                    {MAX_DAYS_OPTIONS.map((days) => (
                      <option key={days} value={days}>
                        Até {days} dias corridos no futuro
                      </option>
                    ))}
                  </select>
                  <p className={`mt-1.5 text-xs ${mutedText}`}>
                    O tempo máximo futuro em que a agenda fica disponível para o cliente agendar um horário.
                  </p>
                </div>

                <div>
                  <span className={groupLabel}>Antecedência mínima para agendar</span>
                  <select
                    value={form.bookingMinAdvanceMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, bookingMinAdvanceMinutes: Number(e.target.value) }))}
                    className={selectClass}
                  >
                    {ADVANCE_OPTIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {advanceLabel(minutes, 'Não exigir antecedência')}
                      </option>
                    ))}
                  </select>
                  <p className={`mt-1.5 text-xs leading-relaxed ${mutedText}`}>
                    <strong className={lightMode ? 'text-slate-700' : 'text-slate-300'}>
                      Evite agendamento em cima da hora:
                    </strong>{' '}
                    configure um tempo mínimo para agendar, ou seja, o tempo mínimo necessário entre seu cliente
                    agendar e o início do atendimento.
                  </p>
                </div>

                <div>
                  <span className={groupLabel}>Cor da página de agendamento</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      aria-label="Cor da página de agendamento"
                      value={form.bookingPrimaryColor || '#d5a85c'}
                      onChange={(e) => setForm((f) => ({ ...f, bookingPrimaryColor: e.target.value }))}
                      className="h-14 w-full cursor-pointer rounded-2xl border-0 bg-transparent p-0"
                    />
                  </div>
                  <p className={`mt-1.5 text-xs leading-relaxed ${mutedText}`}>
                    Vale só para a página que o cliente abre pelo link. O painel e o resto do sistema continuam com a
                    cor da marca, que fica em Salão → Design.
                  </p>
                  {salon?.bookingPrimaryColor ? (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, bookingPrimaryColor: salon?.tenant?.primaryColor || '#d5a85c' }))
                      }
                      className="mt-2 text-xs font-bold text-[var(--brand,#d5a85c)] underline"
                    >
                      Usar a cor da marca
                    </button>
                  ) : null}
                </div>

                <Toggle
                  lightMode={lightMode}
                  checked={form.bookingAllowClientCancel}
                  onChange={(v) => setForm((f) => ({ ...f, bookingAllowClientCancel: v }))}
                  title="Cancelar agendamento pelo app"
                  description="Seus clientes poderão cancelar os agendamentos ainda em aberto em nome deles?"
                />

                <div>
                  <span className={groupLabel}>Antecedência para cancelamento</span>
                  <select
                    value={form.bookingCancelMinMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, bookingCancelMinMinutes: Number(e.target.value) }))}
                    disabled={!form.bookingAllowClientCancel}
                    className={`${selectClass} disabled:opacity-50`}
                  >
                    {ADVANCE_OPTIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {advanceLabel(minutes, 'Até o início do agendamento')}
                      </option>
                    ))}
                  </select>
                  <p className={`mt-1.5 text-xs leading-relaxed ${mutedText}`}>
                    <strong className={lightMode ? 'text-slate-700' : 'text-slate-300'}>
                      Evite cancelamentos em cima da hora:
                    </strong>{' '}
                    o tempo mínimo de antecedência para o cliente cancelar um agendamento.
                  </p>
                </div>

                <Toggle
                  lightMode={lightMode}
                  checked={form.bookingAllowClientReschedule}
                  onChange={(v) => setForm((f) => ({ ...f, bookingAllowClientReschedule: v }))}
                  title="Remarcar horário pelo app"
                  description="Seus clientes poderão trocar o corte por outro horário vago do mesmo dia (e recebem aviso no WhatsApp)?"
                />

                <Toggle
                  lightMode={lightMode}
                  checked={form.bookingSuccessGif}
                  onChange={(v) => setForm((f) => ({ ...f, bookingSuccessGif: v }))}
                  title="Comemoração no final do agendamento"
                  description="Seus clientes verão uma animação de comemoração após a confirmação do agendamento?"
                />

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`${groupLabel} mb-0`}>Texto adicional</span>
                    <span className={`text-[10px] font-semibold ${mutedText}`}>
                      {form.bookingExtraText.length}/{EXTRA_TEXT_LIMIT}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={EXTRA_TEXT_LIMIT}
                    value={form.bookingExtraText}
                    onChange={(e) => setForm((f) => ({ ...f, bookingExtraText: e.target.value }))}
                    placeholder="Ex.: Chegue 5 minutos antes do seu horário."
                    className={`${inputClass(lightMode)} h-auto py-3`}
                  />
                  <p className={`mt-1.5 text-xs ${mutedText}`}>
                    Mensagem exibida para o cliente na página de agendamento.
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`${groupLabel} mb-0`}>Texto do compartilhamento</span>
                    <span className={`text-[10px] font-semibold ${mutedText}`}>
                      {form.bookingShareMessage.length}/{SHARE_TEXT_LIMIT}
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    maxLength={SHARE_TEXT_LIMIT}
                    value={form.bookingShareMessage}
                    onChange={(e) => setForm((f) => ({ ...f, bookingShareMessage: e.target.value }))}
                    placeholder={DEFAULT_SHARE_TEMPLATE}
                    className={`${inputClass(lightMode)} h-auto py-3 leading-relaxed`}
                  />
                  <p className={`mt-1.5 text-xs leading-relaxed ${mutedText}`}>
                    É a mensagem enviada quando você compartilha o link no WhatsApp ou copia o texto. Use{' '}
                    <strong className={lightMode ? 'text-slate-700' : 'text-slate-300'}>{'{link}'}</strong> no lugar do
                    endereço e{' '}
                    <strong className={lightMode ? 'text-slate-700' : 'text-slate-300'}>
                      {'{estabelecimento}'}
                    </strong>{' '}
                    no lugar do nome da barbearia. Deixe em branco para voltar ao texto padrão.
                  </p>
                  {form.bookingShareMessage.trim() ? (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, bookingShareMessage: '' }))}
                      className="mt-2 text-xs font-bold text-[var(--brand,#d5a85c)] underline"
                    >
                      Restaurar texto padrão
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>

        {view === 'config' && !loading ? (
          <div
            className={`fixed inset-x-0 bottom-0 border-t p-3 ${
              lightMode ? 'border-slate-200 bg-white/95' : 'border-slate-700 bg-[#0b1224]/95'
            } backdrop-blur`}
          >
            <div className="mx-auto max-w-lg">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-12 w-full rounded-xl bg-[var(--brand,#d5a85c)] text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {moreOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className={`relative z-[91] w-full rounded-t-2xl border p-5 shadow-2xl sm:max-w-md sm:rounded-2xl ${
              lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#1d2a3e]'
            }`}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">Compartilhar em</h3>
                <p className={`mt-0.5 text-xs ${mutedText}`}>O texto vai junto com o link.</p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setMoreOpen(false)}
                className={`grid size-8 place-items-center rounded-lg ${mutedText}`}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                ...(typeof navigator !== 'undefined' && typeof navigator.share === 'function'
                  ? [
                      {
                        key: 'device',
                        label: 'Abrir menu do aparelho',
                        hint: 'Usa os apps instalados no celular',
                        icon: <Share2 className="size-4" />,
                        onClick: shareFromDevice,
                      },
                    ]
                  : []),
                {
                  key: 'telegram',
                  label: 'Telegram',
                  hint: 'Abre o Telegram Web ou o app',
                  icon: <Send className="size-4" />,
                  onClick: () => {
                    openShareTarget(
                      `https://t.me/share/url?url=${encodeURIComponent(publicLink)}&text=${encodeURIComponent(shareMessage)}`
                    )
                    setMoreOpen(false)
                  },
                },
                {
                  key: 'sms',
                  label: 'SMS',
                  hint: 'Abre o aplicativo de mensagens',
                  icon: <MessageSquare className="size-4" />,
                  onClick: () => {
                    window.location.href = `sms:?&body=${encodeURIComponent(shareMessage)}`
                    setMoreOpen(false)
                  },
                },
                {
                  key: 'email',
                  label: 'E-mail',
                  hint: 'Abre o programa de e-mail',
                  icon: <Mail className="size-4" />,
                  onClick: () => {
                    const subject = encodeURIComponent(`Agende seu horário na ${salon?.name || 'nossa barbearia'}`)
                    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(shareMessage)}`
                    setMoreOpen(false)
                  },
                },
                {
                  key: 'copy-text',
                  label: 'Copiar texto com o link',
                  hint: 'Cole onde quiser',
                  icon: <Copy className="size-4" />,
                  onClick: () => {
                    void copy(shareMessage, 'text')
                    setMoreOpen(false)
                  },
                },
                {
                  key: 'copy-link',
                  label: 'Copiar só o link',
                  hint: publicLink,
                  icon: <Copy className="size-4" />,
                  onClick: () => {
                    void copy(publicLink, 'link')
                    setMoreOpen(false)
                  },
                },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={option.onClick}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    lightMode ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                      lightMode ? 'bg-slate-100 text-slate-700' : 'bg-[#0f1a2c] text-slate-200'
                    }`}
                  >
                    {option.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className={`block truncate text-[11px] ${mutedText}`}>{option.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <p className="pointer-events-none fixed inset-x-0 bottom-24 z-[95] mx-auto w-fit rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xl">
          {toast}
        </p>
      ) : null}
    </div>
  )
}
