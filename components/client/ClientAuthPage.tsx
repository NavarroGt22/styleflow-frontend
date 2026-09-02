'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Loader2, MapPin, Scissors } from 'lucide-react'
import { apiUrl } from '@/lib/client/config'
import { getSalonCache, setSalonCache } from '@/lib/client/salon-cache'
import { isCustomDomainHost, parseApiError, useTenantBranding } from '@/lib/client/useTenant'
import type { TenantBranding } from '@/lib/client/useTenant'

type ClientAuthProps = {
  mode: 'login' | 'register'
}

export default function ClientAuthPage({ mode }: ClientAuthProps) {
  const params = useParams<{ salonSlug?: string }>()
  const salonSlug = params?.salonSlug
  const router = useRouter()
  const isCustomDomain = isCustomDomainHost()
  const cachedSalon = getSalonCache(salonSlug) as {
    tenant?: TenantBranding
    salon?: { name?: string; address?: string }
  } | null

  const [tenant, setTenant] = useState<TenantBranding | null>(cachedSalon?.tenant ?? null)
  const [salonName, setSalonName] = useState(cachedSalon?.salon?.name ?? '')
  const [salonAddress, setSalonAddress] = useState(cachedSalon?.salon?.address ?? '')
  const [billingLocked, setBillingLocked] = useState(false)
  const [billingMessage, setBillingMessage] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const { brandName, primaryColor, logoUrl } = useTenantBranding(tenant)
  const accent = primaryColor || '#d5a85c'

  const publicSalonPath = isCustomDomain ? '/' : `/app/${salonSlug}`
  const loginPath = isCustomDomain ? '/login' : `/app/${salonSlug}/login`
  const registerPath = isCustomDomain ? '/cadastro' : `/app/${salonSlug}/cadastro`
  const alternatePath = mode === 'login' ? registerPath : loginPath

  useEffect(() => {
    const token = sessionStorage.getItem('client_token')
    const storedUser = sessionStorage.getItem('client_user')
    if (token && storedUser) {
      router.push(publicSalonPath)
    }
  }, [router, publicSalonPath])

  useEffect(() => {
    const fetchSalonInfo = async () => {
      try {
        const url = salonSlug ? apiUrl(`/queue/public/${salonSlug}`) : apiUrl('/queue/public')
        const res = await fetch(url, { headers: { 'X-Custom-Host': window.location.host } })
        if (res.status === 402) {
          const body = await res.json().catch(() => ({}))
          setBillingLocked(true)
          setBillingMessage(
            body.error || 'Este salão está temporariamente indisponível. Tente novamente mais tarde.'
          )
          return
        }
        if (!res.ok) return
        const json = await res.json()
        setBillingLocked(false)
        if (json?.tenant) setTenant(json.tenant)
        if (json?.salon?.name) setSalonName(json.salon.name)
        if (json?.salon?.address) setSalonAddress(json.salon.address)
        setSalonCache(salonSlug, json)
      } catch (err) {
        console.error('Erro ao carregar dados do salão:', err)
      }
    }
    fetchSalonInfo()
  }, [salonSlug])

  function formatPhoneInput(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length === 0) return ''
    if (digits.length <= 2) return `(${digits}`
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const isLogin = mode === 'login'
    const endpoint = isLogin ? '/auth/client/login' : '/auth/client/register'
    const payload: Record<string, unknown> = {
      phone: phone.replace(/\D/g, ''),
      ...(tenant?.id ? { tenantId: tenant.id } : {}),
      ...(salonSlug ? { salonSlug } : {}),
    }
    if (!isLogin) payload.name = name.trim()

    try {
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(parseApiError(data, 'Ocorreu um erro ao processar sua solicitação.'))
      }

      sessionStorage.setItem('client_token', data.token)
      sessionStorage.setItem('client_refreshToken', data.refreshToken)
      sessionStorage.setItem('client_user', JSON.stringify(data.user))
      setSuccess(isLogin ? 'Login realizado! Redirecionando...' : 'Conta criada! Redirecionando...')
      setTimeout(() => router.push(publicSalonPath), 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  if (billingLocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0d0e] px-5 py-8 text-[#f5f5f4]">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#1d2a3e] p-8 text-center">
          <h1 className="mb-2 text-xl font-bold">Salão indisponível</h1>
          <p className="text-sm text-slate-400">
            {billingMessage || 'Este salão está temporariamente indisponível. Tente novamente mais tarde.'}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0d0e] px-5 py-8 text-[#f5f5f4] sm:px-8"
      style={{ '--brand': accent } as React.CSSProperties}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--brand)_13%,transparent),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />

      <div className="relative w-full max-w-md animate-[fade-in-up_700ms_ease-out_both]">
        <Link
          href={publicSalonPath}
          className="mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#a1a1aa] transition-colors hover:text-[var(--brand)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para vitrine
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden border border-[var(--brand)]/60 bg-[var(--brand)]/10 text-[var(--brand)]">
            {logoUrl ? (
              <img src={logoUrl} alt={`Logo ${brandName}`} className="h-full w-full object-cover" />
            ) : (
              <Scissors className="h-6 w-6 -rotate-45" strokeWidth={1.5} />
            )}
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-[0.3em] text-[var(--brand)]">AGENDA ONLINE</p>
            <p className="font-display text-xl tracking-wide text-[#f5f5f4]">{brandName}</p>
          </div>
        </div>

        <div className="border border-white/10 bg-[#15181a]/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-sm sm:p-8">
          <div className="mb-8">
            <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[#a1a1aa]">
              {isLogin ? 'Área do cliente' : 'Primeiro acesso'}
            </p>
            <h1 className="font-display text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">
              {isLogin ? (
                <>
                  Que bom ter você <span className="text-[var(--brand)] italic">de volta.</span>
                </>
              ) : (
                <>
                  Seu estilo começa <span className="text-[var(--brand)] italic">aqui.</span>
                </>
              )}
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#a1a1aa]">
              {isLogin
                ? 'Entre para consultar seus agendamentos e reservar seu próximo momento.'
                : 'Crie seu cadastro para agendar sem complicação.'}
            </p>
          </div>

          {error ? (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-3 text-center text-sm text-red-300">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-center text-sm text-emerald-300">
              {success}
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin ? (
              <div>
                <label htmlFor="register-name" className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-[#a1a1aa]">
                  Seu nome
                </label>
                <input
                  id="register-name"
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como podemos chamar você?"
                  autoComplete="name"
                  className="h-12 w-full border border-white/10 bg-[#0b0d0e]/80 px-4 text-sm text-[#f5f5f4] outline-none transition-colors placeholder:text-[#a1a1aa]/50 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                />
              </div>
            ) : null}

            <div>
              <label htmlFor="auth-phone" className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-[#a1a1aa]">
                Telefone ou WhatsApp
              </label>
              <input
                id="auth-phone"
                required
                type="tel"
                inputMode="tel"
                maxLength={15}
                value={phone}
                onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                placeholder="(11) 99999-9999"
                autoComplete="tel"
                className="h-12 w-full border border-white/10 bg-[#0b0d0e]/80 px-4 text-sm text-[#f5f5f4] outline-none transition-colors placeholder:text-[#a1a1aa]/50 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
              />
              {isLogin ? (
                <p className="mt-2 text-[11px] text-[#a1a1aa]">
                  Use o mesmo número que cadastrou na barbearia.
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex h-12 w-full items-center justify-center gap-2 bg-[var(--brand)] text-sm font-semibold text-[#111] transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  {isLogin ? 'Entrar' : 'Criar meu cadastro'}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#a1a1aa]">
            {isLogin ? 'Ainda não tem cadastro?' : 'Já tem cadastro?'}{' '}
            <Link href={alternatePath} className="font-medium text-[var(--brand)] underline-offset-4 hover:underline">
              {isLogin ? 'Criar conta' : 'Entrar agora'}
            </Link>
          </p>
        </div>

        {(salonName || salonAddress) && (
          <div className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] text-[#a1a1aa]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
            <span>
              {salonName}
              {salonName && salonAddress ? ' · ' : ''}
              {salonAddress}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}
