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
    <div className="sticky top-0 z-40 -mx-4 mb-6 flex items-center justify-between border-b border-white/10 bg-[#0b0d0e]/95 px-4 py-3.5 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-3">
        {currentUser ? (
          <>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300"
              style={{ borderColor: `${brandColor}40` }}
            >
              <User size={16} style={{ color: brandColor }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-300">
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
            <span className="text-xs font-extrabold text-slate-400">Acesso de Visitante</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex cursor-pointer items-center justify-center rounded-full border-none bg-white/10 p-2 text-slate-400 transition-all hover:bg-white/15"
          title="Mudar tema"
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
