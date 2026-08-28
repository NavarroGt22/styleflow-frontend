'use client'

import { FormEvent, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpRight, Eye, EyeOff, Scissors } from 'lucide-react'
import { apiUrl } from '@/lib/config'
import { setSession } from '@/lib/auth'
import AdminPageShell from './AdminPageShell'

const inputClass =
  'h-12 w-full rounded-xl border border-slate-600 bg-[#142035] px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400'

export default function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'E-mail ou senha incorretos.')
      }

      if (data.user.role === 'CUSTOMER') {
        throw new Error('Este portal é exclusivo para donos e profissionais.')
      }

      setSession(data.token, data.refreshToken, data.user)

      const next = searchParams.get('next')
      if (next?.startsWith('/admin/')) {
        router.replace(next)
        return
      }

      const salonSlug =
        data.user.professionalProfile?.salon?.slug ?? data.user.salons?.[0]?.slug ?? 'leleco'
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
            <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/20">
              <Scissors className="size-6 -rotate-45 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-[0.3em] text-indigo-300">STYLEFLOW</p>
              <p className="font-serif text-xl tracking-wide text-white">Painel Admin</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-8">
            <div className="mb-8">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Área restrita</p>
              <h1 className="font-serif text-4xl leading-tight tracking-[-0.03em] text-white sm:text-[2.6rem]">
                Bem-vindo ao{' '}
                <span className="bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text italic text-transparent">
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

              {error ? <p className="text-sm text-rose-400">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:pointer-events-none disabled:opacity-60"
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
