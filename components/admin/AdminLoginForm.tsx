'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpRight, Eye, EyeOff, Scissors } from 'lucide-react'
import { apiUrl } from '@/lib/config'
import { setSession } from '@/lib/auth'
import {
  clearLoginLockout,
  formatLockoutRemaining,
  forceLoginLockout,
  getLoginLockout,
  recordFailedLogin,
} from '@/lib/admin/login-lockout'
import AdminPageShell from './AdminPageShell'

const inputClass =
  'h-12 w-full rounded-xl border border-slate-600 bg-[#142035] px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400'

async function parseLoginResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  if (!isJson) {
    throw new Error(
      `Não foi possível conectar à API (${response.status}). Verifique se o backend está online e se NEXT_PUBLIC_API_URL está configurada.`,
    )
  }

  return response.json() as Promise<{ error?: string; token?: string; refreshToken?: string; user?: unknown }>
}

export default function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [lockoutRemainingMs, setLockoutRemainingMs] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isLocalHost, setIsLocalHost] = useState(false)

  const sessionExpired = searchParams.get('reason') === 'session_expired'
  const lockout = getLoginLockout(email)
  const isLocked = !isLocalHost && (lockout.locked || lockoutRemainingMs > 0)

  useEffect(() => {
    const host = window.location.hostname
    setIsLocalHost(host === 'localhost' || host === '127.0.0.1')
  }, [])

  useEffect(() => {
    if (sessionExpired) {
      setInfo('Por segurança, confirme sua senha novamente. A sessão do painel expira a cada 30 minutos.')
    }
  }, [sessionExpired])

  // Em localhost, limpa lockout para não travar o ambiente de teste
  useEffect(() => {
    if (!isLocalHost) return
    clearLoginLockout('admin.teste@leleco.com.br')
    if (email.trim()) clearLoginLockout(email)
    setLockoutRemainingMs(0)
    setError((prev) =>
      prev.includes('bloqueada') || prev.includes('Bloqueio') || prev.includes('Aguarde') ? '' : prev,
    )
  }, [email, isLocalHost])

  useEffect(() => {
    if (isLocalHost) {
      setLockoutRemainingMs(0)
      return
    }

    const current = getLoginLockout(email)
    if (!current.locked) {
      setLockoutRemainingMs(0)
      return
    }

    setLockoutRemainingMs(current.remainingMs)
    const timer = window.setInterval(() => {
      const next = getLoginLockout(email)
      setLockoutRemainingMs(next.remainingMs)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [email, isLocalHost])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setInfo(sessionExpired ? 'Por segurança, confirme sua senha novamente. A sessão do painel expira a cada 30 minutos.' : '')

    if (isLocalHost) {
      clearLoginLockout(email)
    }

    const currentLockout = getLoginLockout(email)
    if (!isLocalHost && currentLockout.locked) {
      setLockoutRemainingMs(currentLockout.remainingMs)
      setError(`Muitas tentativas incorretas. Aguarde ${formatLockoutRemaining(currentLockout.remainingMs)} para tentar novamente.`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await parseLoginResponse(response)

      if (!response.ok) {
        if (response.status === 429) {
          const nextLockout = forceLoginLockout(email)
          setLockoutRemainingMs(nextLockout.remainingMs)
          throw new Error(data.error || 'Muitas tentativas incorretas. Aguarde 10 minutos.')
        }

        if (response.status === 401) {
          if (isLocalHost) {
            throw new Error(data.error || 'E-mail ou senha incorretos. Em localhost use admin.teste@leleco.com.br / 12345678.')
          }
          const nextLockout = recordFailedLogin(email)
          if (nextLockout.locked) {
            setLockoutRemainingMs(nextLockout.remainingMs)
            throw new Error(`Senha incorreta. Conta bloqueada por 10 minutos após ${3} tentativas.`)
          }
          throw new Error(
            data.error ||
              `E-mail ou senha incorretos. Restam ${nextLockout.attemptsLeft} tentativa(s) antes do bloqueio.`,
          )
        }

        if (response.status === 429 && isLocalHost) {
          clearLoginLockout(email)
          throw new Error(data.error || 'Muitas tentativas. Em localhost o bloqueio foi limpo — tente de novo.')
        }

        throw new Error(data.error || 'Não foi possível entrar.')
      }

      if (!data.token || !data.refreshToken || !data.user) {
        throw new Error('Resposta de login inválida.')
      }

      const user = data.user as { role: string; professionalProfile?: { salon?: { slug?: string } }; salons?: { slug: string }[] }

      if (user.role === 'CUSTOMER') {
        throw new Error('Este portal é exclusivo para donos e profissionais.')
      }

      clearLoginLockout(email)
      setSession(data.token, data.refreshToken, user as Parameters<typeof setSession>[2])

      if (user.role === 'SUPER_ADMIN') {
        const next = searchParams.get('next')
        if (next?.startsWith('/platform/')) {
          router.replace(next)
          return
        }
        router.replace('/platform/super')
        return
      }

      const next = searchParams.get('next')
      if (next?.startsWith('/admin/')) {
        router.replace(next)
        return
      }

      const salonSlug = user.professionalProfile?.salon?.slug ?? user.salons?.[0]?.slug ?? 'leleco'
      router.replace(`/admin/${salonSlug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminPageShell variant="premium">
      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="relative w-full max-w-md animate-[fade-in-up_700ms_ease-out_both]">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-xl bg-slate-700 text-white shadow-lg shadow-black/20">
              <Scissors className="size-6 -rotate-45 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-[0.3em] text-slate-400">STYLEFLOW</p>
              <p className="font-serif text-xl tracking-wide text-white">Painel Admin</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-8">
            <div className="mb-8">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Área restrita</p>
              <h1 className="font-serif text-4xl leading-tight tracking-[-0.03em] text-white sm:text-[2.6rem]">
                Bem-vindo ao{' '}
                <span className="italic text-slate-300">
                  painel.
                </span>
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                Entre com suas credenciais de dono ou profissional para gerenciar o salão.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isLocked || loading}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    disabled={isLocked || loading}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-white"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {info ? <p className="text-sm text-amber-300/90">{info}</p> : null}
              {error ? <p className="text-sm text-rose-400">{error}</p> : null}
              {isLocked ? (
                <p className="text-sm text-rose-300">
                  Bloqueio ativo. Tente novamente em {formatLockoutRemaining(lockoutRemainingMs)}.
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading || isLocked}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-white disabled:pointer-events-none disabled:opacity-60"
              >
                {loading ? 'Entrando...' : 'Entrar no painel'}
                {!loading ? (
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                ) : null}
              </button>
            </form>
          </div>
        </div>
      </main>
    </AdminPageShell>
  )
}
