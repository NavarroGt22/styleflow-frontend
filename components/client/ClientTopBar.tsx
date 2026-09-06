'use client'

import Link from 'next/link'
import { Sun, Moon, User } from 'lucide-react'

type Props = {
  currentUser: { name?: string } | null
  brandColor: string
  isDark: boolean
  onToggleTheme: () => void
  onLogout?: () => void
  salonSlug?: string
  isCustomDomain: boolean
}

export function ClientTopBar({
  currentUser,
  brandColor,
  isDark,
  onToggleTheme,
  onLogout,
  salonSlug,
  isCustomDomain,
}: Props) {
  return (
    <div
      className={`sticky top-0 z-40 -mx-4 mb-6 flex items-center justify-between border-b px-4 py-3.5 backdrop-blur-md sm:-mx-6 sm:px-6 ${
        isDark
          ? 'border-white/10 bg-[#0b0d0e]/95'
          : 'border-slate-200 bg-white/90'
      }`}
    >
      <div className="flex items-center gap-3">
        {currentUser ? (
          <>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                isDark ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-600'
              }`}
              style={{ borderColor: `${brandColor}40` }}
            >
              <User size={16} style={{ color: brandColor }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span
                className={`text-xs font-extrabold uppercase tracking-wide ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Bem-vindo {currentUser.name}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ backgroundColor: brandColor }}
            />
            <span className={`text-xs font-extrabold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Acesso de Visitante
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleTheme}
          className={`flex cursor-pointer items-center justify-center rounded-full border-none p-2 transition-all ${
            isDark
              ? 'bg-white/10 text-slate-400 hover:bg-white/15'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          title="Mudar tema"
          aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        {currentUser ? (
          <button
            type="button"
            onClick={onLogout}
            className="cursor-pointer rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-red-400 transition-all hover:bg-red-500/20 border-solid"
          >
            Sair
          </button>
        ) : (
          <Link
            href={isCustomDomain ? '/login' : `/app/${salonSlug}/login`}
            className="text-xs font-black uppercase tracking-wider no-underline transition-all client-accent-text"
          >
            Entrar / Cadastrar
          </Link>
        )}
      </div>
    </div>
  )
}
