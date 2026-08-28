'use client'

import {
  CalendarDays,
  Clock3,
  DollarSign,
  MessageCircle,
  Palette,
  Store,
  Users,
} from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import ImageFileUpload from '../ImageFileUpload'
import {
  AdminButton,
  AdminError,
  AdminLoading,
  inputClass,
  labelClass,
  sectionClass,
} from '../ui/AdminUi'
import type { AdminTabProps, SalonSettings } from '@/lib/admin/types'
import { fetchSalon, normalizeInstagram, updateSalon } from '@/lib/admin/api'

type SubTab = 'general' | 'temas' | 'expediente' | 'comissao' | 'fila'

const subTabs: { id: SubTab; label: string; icon: typeof Store }[] = [
  { id: 'general', label: 'Dados Gerais', icon: Store },
  { id: 'temas', label: 'Estilo / Temas', icon: Palette },
  { id: 'expediente', label: 'Funcionamento', icon: Clock3 },
  { id: 'comissao', label: 'Comissões', icon: DollarSign },
  { id: 'fila', label: 'Fila & Agendamento', icon: Users },
]

const DEFAULT_WHATSAPP_TEMPLATE =
  'Olá {cliente}, seu atendimento no {estabelecimento} está chegando! Você é o {posicao}º da fila com previsão para as {tempo}.'

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function checkboxClass(lightMode: boolean) {
  return `size-4 cursor-pointer rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 ${
    lightMode ? '' : 'border-slate-600 bg-slate-800'
  }`
}

export default function AdminSalonTab({ salonId, lightMode = false }: AdminTabProps) {
  const [salon, setSalon] = useState<SalonSettings | null>(null)
  const [subTab, setSubTab] = useState<SubTab>('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cep, setCep] = useState('')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    instagramUrl: '',
    address: '',
    openTime: '09:00',
    closeTime: '18:00',
    tenantName: '',
    customBrandName: '',
    slug: '',
    primaryColor: '#d5a85c',
    historyText: '',
    lpSinceYear: '',
    logoUrl: '',
    heroImageUrl: '',
    faviconUrl: '',
    productCommissionEnabled: false,
    productCommissionRate: '10',
    queueMode: false,
    queueAutoAdvance: false,
    queueAllowClientView: true,
    queueNotifyClient: false,
    queueNotifyAhead: '2',
    queueAllowSkip: false,
    whatsappTemplate: DEFAULT_WHATSAPP_TEMPLATE,
  })

  function applySalonData(data: SalonSettings) {
    setSalon(data)
    setForm({
      name: data.name || '',
      phone: data.phone || '',
      instagramUrl: data.instagramUrl || '',
      address: data.address || '',
      openTime: data.openTime || '09:00',
      closeTime: data.closeTime || '18:00',
      tenantName: data.tenant?.name || '',
      customBrandName: data.tenant?.customBrandName || '',
      slug: data.slug || '',
      primaryColor: data.tenant?.primaryColor || '#d5a85c',
      historyText: data.tenant?.historyText || '',
      lpSinceYear: data.tenant?.lpSinceYear ? String(data.tenant.lpSinceYear) : '',
      logoUrl: data.tenant?.logoUrl || '',
      heroImageUrl: data.tenant?.heroImageUrl || '',
      faviconUrl: data.tenant?.faviconUrl || '',
      productCommissionEnabled: Boolean(data.productCommissionEnabled),
      productCommissionRate: String(data.productCommissionRate ?? 10),
      queueMode: Boolean(data.queueMode),
      queueAutoAdvance: Boolean(data.queueAutoAdvance),
      queueAllowClientView: data.queueAllowClientView !== false,
      queueNotifyClient: Boolean(data.queueNotifyClient),
      queueNotifyAhead: String(data.queueNotifyAhead ?? 2),
      queueAllowSkip: Boolean(data.queueAllowSkip),
      whatsappTemplate: data.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE,
    })
  }

  async function load() {
    if (!salonId) {
      setLoading(false)
      setError('Salão não identificado. Faça login novamente.')
      return
    }
    setLoading(true)
    setError('')
    try {
      applySalonData(await fetchSalon(salonId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar salão.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [salonId])

  const whatsappLink = useMemo(() => {
    const digits = onlyDigits(form.phone)
    return digits ? `https://wa.me/55${digits}` : ''
  }, [form.phone])

  async function lookupCep() {
    const clean = onlyDigits(cep)
    if (clean.length !== 8) return
    try {
      const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await response.json()
      if (data.erro) return
      const address = [data.logradouro, data.bairro, data.localidade, data.uf].filter(Boolean).join(' - ')
      setForm((current) => ({ ...current, address: address || current.address }))
    } catch {
      /* ignore */
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!salonId) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await updateSalon(salonId, {
        name: form.name,
        phone: onlyDigits(form.phone),
        address: form.address,
        openTime: form.openTime,
        closeTime: form.closeTime,
        instagramUrl: normalizeInstagram(form.instagramUrl),
        slug: form.slug,
        queueMode: form.queueMode,
        queueAutoAdvance: form.queueAutoAdvance,
        queueAllowClientView: form.queueAllowClientView,
        queueNotifyClient: form.queueNotifyClient,
        queueNotifyAhead: Number(form.queueNotifyAhead) || 2,
        queueAllowSkip: form.queueAllowSkip,
        whatsappTemplate: form.whatsappTemplate,
        productCommissionEnabled: form.productCommissionEnabled,
        productCommissionRate: Number(form.productCommissionRate) || 10,
        primaryColor: form.primaryColor,
        customBrandName: form.customBrandName,
        historyText: form.historyText.slice(0, 800),
        tenantName: form.tenantName,
        lpSinceYear: form.lpSinceYear?.trim() || null,
        logoUrl: form.logoUrl || null,
        heroImageUrl: form.heroImageUrl || null,
        faviconUrl: form.faviconUrl || null,
      })
      applySalonData(updated)
      setSuccess('Configurações salvas com sucesso.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className={sectionClass(lightMode)}>
        <AdminLoading lightMode={lightMode} />
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className={`text-lg font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
          Configurações do Salão
        </h3>
        <p className={`mt-1 text-sm ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Atualize os dados comerciais e o horário de funcionamento geral do seu salão.
        </p>
      </div>

      {error ? <AdminError message={error} /> : null}
      {success ? <p className="text-sm font-semibold text-emerald-600">{success}</p> : null}

      <div className={`grid gap-4 ${subTab === 'expediente' ? 'lg:grid-cols-[280px_1fr]' : ''}`}>
        {subTab === 'expediente' ? (
          <aside className={sectionClass(lightMode)}>
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <Store className="size-5" />
              </span>
              <div>
                <p className={`font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>{form.name || 'Salão'}</p>
                <p className="text-xs text-slate-500">@{form.slug || 'slug'}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">WhatsApp Comercial</p>
                <p className={lightMode ? 'text-slate-700' : 'text-slate-300'}>{form.phone || 'Não cadastrado'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Endereço</p>
                <p className={lightMode ? 'text-slate-700' : 'text-slate-300'}>{form.address || 'Não cadastrado'}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Expediente do Salão</p>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  <Clock3 className="size-3.5" />
                  {form.openTime} às {form.closeTime}
                </span>
              </div>
            </div>
            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50"
              >
                <MessageCircle className="size-4" />
                Testar Link do WhatsApp
              </a>
            ) : null}
          </aside>
        ) : null}

        <form onSubmit={handleSubmit} className={sectionClass(lightMode)}>
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {subTabs.map(({ id, label, icon: Icon }) => {
              const active = subTab === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSubTab(id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : lightMode
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'bg-[#142035] text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              )
            })}
          </div>

          {subTab === 'general' ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass(lightMode)}>Nome do Salão/Barbearia</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass(lightMode)} />
              </div>
              <div>
                <label className={labelClass(lightMode)}>WhatsApp Comercial</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass(lightMode)} />
                {whatsappLink ? (
                  <a href={whatsappLink} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex text-xs font-semibold text-emerald-600 hover:underline">
                    Testar link do WhatsApp ↗
                  </a>
                ) : null}
              </div>
              <div>
                <label className={labelClass(lightMode)}>Instagram (URL ou Usuário)</label>
                <input value={form.instagramUrl} onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })} placeholder="https://instagram.com/seuusuario" className={inputClass(lightMode)} />
              </div>
              <div>
                <label className={labelClass(lightMode)}>CEP (Buscar Endereço)</label>
                <input value={cep} onChange={(e) => setCep(e.target.value)} onBlur={lookupCep} placeholder="00000-000" className={inputClass(lightMode)} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass(lightMode)}>Endereço Comercial</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua das Flores, 123 - Bairro Centro" className={inputClass(lightMode)} />
              </div>
            </div>
          ) : null}

          {subTab === 'temas' ? (
            <div className="space-y-4">
              <p className={`text-sm ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Personalize a landing page dos clientes: história, foto, cor e slug da URL pública.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass(lightMode)}>Nome da Conta / Marca</label>
                  <input value={form.tenantName} onChange={(e) => setForm({ ...form, tenantName: e.target.value })} className={inputClass(lightMode)} />
                </div>
                <div>
                  <label className={labelClass(lightMode)}>Nome Exibido (opcional)</label>
                  <input value={form.customBrandName} onChange={(e) => setForm({ ...form, customBrandName: e.target.value })} placeholder="Ex: BARBEARIA DO RAFAEL" className={inputClass(lightMode)} />
                </div>
                <div>
                  <label className={labelClass(lightMode)}>Slug da página do cliente</label>
                  <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputClass(lightMode)} />
                  <p className="mt-1 text-xs text-slate-500">URL pública: /app/{form.slug || '...'}</p>
                </div>
                <div>
                  <label className={labelClass(lightMode)}>Cor da landing page</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="h-11 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white p-1" />
                    <input value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className={inputClass(lightMode)} />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass(lightMode)}>História / texto da LP</label>
                  <textarea value={form.historyText} onChange={(e) => setForm({ ...form, historyText: e.target.value.slice(0, 800) })} rows={4} placeholder="Conte a história da barbearia. Ex: Corte preciso, barba alinhada e a experiência que você merece..." className={`${inputClass(lightMode)} h-auto py-3`} />
                  <p className="mt-1 text-right text-xs text-slate-400">{form.historyText.length}/800</p>
                </div>
                <ImageFileUpload lightMode={lightMode} label="Logotipo da Barbearia" value={form.logoUrl} onChange={(logoUrl) => setForm({ ...form, logoUrl })} hint="Aparece na página de agendamento dos seus clientes." maxMb={2} />
                <ImageFileUpload lightMode={lightMode} label="Foto da landing page (hero)" value={form.heroImageUrl} onChange={(heroImageUrl) => setForm({ ...form, heroImageUrl })} hint="Foto grande da LP do cliente. Preferencialmente vertical." maxMb={3} accept="image/png,image/jpeg,image/jpg,image/webp" allowedLabel="PNG, JPG ou WebP" />
                <ImageFileUpload lightMode={lightMode} label="Favicon (ícone da aba do navegador)" value={form.faviconUrl} onChange={(faviconUrl) => setForm({ ...form, faviconUrl })} hint="Ícone pequeno que aparece na aba do navegador dos clientes." maxMb={2} accept="image/png,image/x-icon,image/vnd.microsoft.icon,.ico" allowedLabel="ICO ou PNG" previewClassName="object-contain p-2" />
                <div>
                  <label className={labelClass(lightMode)}>Desde (ano / selo)</label>
                  <input value={form.lpSinceYear} onChange={(e) => setForm({ ...form, lpSinceYear: e.target.value })} placeholder="Ex: 2014" className={inputClass(lightMode)} />
                </div>
              </div>
              {salon?.tenant?.subdomain ? (
                <div className={`rounded-xl border px-4 py-3 text-sm ${lightMode ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-slate-600 text-slate-300'}`}>
                  <p className="font-semibold">Subdomínio da Conta</p>
                  <p className="mt-1">{salon.tenant.subdomain}</p>
                  <p className="mt-1 text-xs text-slate-500">O slug da conta (tenant) não muda aqui — só o slug da unidade na URL /app/...</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {subTab === 'expediente' ? (
            <div className={`space-y-4 rounded-2xl border p-6 ${lightMode ? 'border-indigo-100 bg-indigo-50/50' : 'border-indigo-900/40 bg-indigo-950/20'}`}>
              <h4 className={`flex items-center gap-2 font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                <Clock3 className="size-4 text-indigo-600" /> Expediente de Funcionamento do Estabelecimento
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass(lightMode)}>Horário de Abertura</label>
                  <input type="time" value={form.openTime} onChange={(e) => setForm({ ...form, openTime: e.target.value })} className={inputClass(lightMode)} />
                </div>
                <div>
                  <label className={labelClass(lightMode)}>Horário de Fechamento</label>
                  <input type="time" value={form.closeTime} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} className={inputClass(lightMode)} />
                </div>
              </div>
              <p className={`text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Este horário define o expediente geral. Clientes só poderão agendar cortes dentro deste intervalo de tempo.
              </p>
            </div>
          ) : null}

          {subTab === 'comissao' ? (
            <div className={`space-y-4 rounded-2xl border p-6 ${lightMode ? 'border-indigo-100 bg-indigo-50/50' : 'border-indigo-900/40 bg-indigo-950/20'}`}>
              <h4 className={`flex items-center gap-2 font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                <DollarSign className="size-4 text-indigo-600" /> Comissão sobre Vendas de Produtos Físicos
              </h4>
              <label className={`flex cursor-pointer items-center gap-3 text-sm font-medium ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                <input type="checkbox" className={checkboxClass(lightMode)} checked={form.productCommissionEnabled} onChange={(e) => setForm({ ...form, productCommissionEnabled: e.target.checked })} />
                Habilitar repasse de comissão de produtos para a equipe
              </label>
              {form.productCommissionEnabled ? (
                <div>
                  <label className={labelClass(lightMode)}>Taxa de Comissão Geral de Produtos (%)</label>
                  <input value={form.productCommissionRate} onChange={(e) => setForm({ ...form, productCommissionRate: e.target.value.replace(/\D/g, '') })} placeholder="Ex: 10" className={`${inputClass(lightMode)} sm:w-1/3`} />
                </div>
              ) : null}
            </div>
          ) : null}

          {subTab === 'fila' ? (
            <div className={`space-y-6 rounded-2xl border p-6 ${lightMode ? 'border-indigo-100 bg-indigo-50/50' : 'border-indigo-900/40 bg-indigo-950/20'}`}>
              <div>
                <h4 className={`flex items-center gap-2 font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>
                  <Clock3 className="size-4 text-indigo-600" /> Modo de Funcionamento Principal do Estabelecimento
                </h4>
                <p className={`mt-1 text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Selecione como os agendamentos e a ordem de atendimento dos clientes serão gerenciados no seu salão.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button type="button" onClick={() => setForm({ ...form, queueMode: false })} className={`rounded-2xl border-2 p-4 text-left transition ${!form.queueMode ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600' : lightMode ? 'border-slate-200 bg-white' : 'border-slate-600 bg-slate-800'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <CalendarDays className={`size-5 ${!form.queueMode ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className={`grid size-4 place-items-center rounded-full border-2 ${!form.queueMode ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>{!form.queueMode ? <span className="size-1.5 rounded-full bg-white" /> : null}</span>
                  </div>
                  <p className={`font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>Agenda Comercial (Hora Fixa)</p>
                  <p className={`mt-2 text-xs leading-relaxed ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>Clientes reservam horários fixos. O sistema realiza verificação estrita de choque de horários (anti-clash), bloqueando novos agendamentos no mesmo período.</p>
                </button>
                <button type="button" onClick={() => setForm({ ...form, queueMode: true })} className={`rounded-2xl border-2 p-4 text-left transition ${form.queueMode ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600' : lightMode ? 'border-slate-200 bg-white' : 'border-slate-600 bg-slate-800'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <Users className={`size-5 ${form.queueMode ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className={`grid size-4 place-items-center rounded-full border-2 ${form.queueMode ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>{form.queueMode ? <span className="size-1.5 rounded-full bg-white" /> : null}</span>
                  </div>
                  <p className={`font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>Fila Dinâmica (Ordem de Chegada)</p>
                  <p className={`mt-2 text-xs leading-relaxed ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>Clientes agendam um horário preferencial livremente (sem bloqueio de colisão). O sistema gerencia uma fila sequencial reativa no dia por profissional, com estimativas de tempo ao vivo.</p>
                </button>
              </div>

              {form.queueMode ? (
                <div className="space-y-4 border-t border-indigo-100 pt-4 dark:border-indigo-900/40">
                  <div>
                    <label className={`flex cursor-pointer items-center gap-3 text-sm font-medium ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      <input type="checkbox" className={checkboxClass(lightMode)} checked={form.queueAutoAdvance} onChange={(e) => setForm({ ...form, queueAutoAdvance: e.target.checked })} />
                      Finalizar automaticamente ao fim do tempo do serviço
                    </label>
                    <p className={`ml-7 mt-1 text-[11px] ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Quando ativo, abre o checkout ao terminar a duração do corte. Desativado = finalização manual pelo profissional.
                    </p>
                  </div>
                  <label className={`flex cursor-pointer items-center gap-3 text-sm font-medium ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                    <input type="checkbox" className={checkboxClass(lightMode)} checked={form.queueAllowClientView} onChange={(e) => setForm({ ...form, queueAllowClientView: e.target.checked })} />
                    Permitir consulta pública da fila
                  </label>
                  <label className={`flex cursor-pointer items-center gap-3 text-sm font-medium ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                    <input type="checkbox" className={checkboxClass(lightMode)} checked={form.queueNotifyClient} onChange={(e) => setForm({ ...form, queueNotifyClient: e.target.checked })} />
                    Notificar cliente por WhatsApp
                  </label>
                  {form.queueNotifyClient ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass(lightMode)}>Notificar quantas pessoas antes? (Posição)</label>
                        <input type="number" min={1} max={20} value={form.queueNotifyAhead} onChange={(e) => setForm({ ...form, queueNotifyAhead: e.target.value })} className={inputClass(lightMode)} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass(lightMode)}>Template de Mensagem do WhatsApp</label>
                        <textarea value={form.whatsappTemplate} onChange={(e) => setForm({ ...form, whatsappTemplate: e.target.value })} rows={3} placeholder={DEFAULT_WHATSAPP_TEMPLATE} className={`${inputClass(lightMode)} h-auto py-3`} />
                        <p className="mt-1 text-[11px] text-slate-400">Use {'{cliente}'}, {'{estabelecimento}'}, {'{posicao}'} e {'{tempo}'}.</p>
                      </div>
                    </div>
                  ) : null}
                  <label className={`flex cursor-pointer items-center gap-3 text-sm font-medium ${lightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                    <input type="checkbox" className={checkboxClass(lightMode)} checked={form.queueAllowSkip} onChange={(e) => setForm({ ...form, queueAllowSkip: e.target.checked })} />
                    Permitir pulo automático por ausência (No-show)
                  </label>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <AdminButton type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Configurações'}</AdminButton>
          </div>
        </form>
      </div>
    </div>
  )
}
