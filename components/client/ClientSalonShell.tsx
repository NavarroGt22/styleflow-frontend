'use client'

import { AlertCircle } from 'lucide-react'

type Props = {
  accent?: string
  message?: string
}

export function ClientSalonLoading({ accent = '#d5a85c', message = 'Carregando...' }: Props) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-[#0b1224] p-4 text-slate-300"
      style={{ '--brand': accent } as React.CSSProperties}
    >
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-white/10" />
        <div
          className="absolute inset-0 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}
        />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-400">{message}</p>
    </div>
  )
}

export function ClientSalonError({
  accent = '#d5a85c',
  error,
  onRetry,
}: {
  accent?: string
  error: string
  onRetry: () => void
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#0b1224] p-4"
      style={{ '--brand': accent } as React.CSSProperties}
    >
      <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#1d2a3e] p-8 text-center shadow-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
          <AlertCircle size={32} />
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">Painel indisponível</h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-400">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-xl py-3 text-sm font-bold text-[#111] transition hover:brightness-110"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}

export function clientBrandStyles(primaryColor: string) {
  return `
    :root { --brand-primary: ${primaryColor}; --brand: ${primaryColor}; }
    .client-accent-bg { background-color: var(--brand-primary) !important; }
    .client-accent-text { color: var(--brand-primary) !important; }
    .client-accent-border { border-color: var(--brand-primary) !important; }
    .bg-indigo-600, .from-indigo-600, .to-indigo-700 { background-color: var(--brand-primary) !important; }
    .text-indigo-600, .dark\\:text-indigo-400, .text-indigo-500 { color: var(--brand-primary) !important; }
    .border-indigo-600, .dark\\:border-indigo-500 { border-color: var(--brand-primary) !important; }
    .bg-indigo-50\\/50, .bg-indigo-50 { background-color: color-mix(in srgb, var(--brand-primary) 12%, transparent) !important; }
    .ring-indigo-500\\/20 { --tw-ring-color: color-mix(in srgb, var(--brand-primary) 25%, transparent) !important; }
    .focus\\:ring-indigo-500:focus { --tw-ring-color: var(--brand-primary) !important; }
  `
}
