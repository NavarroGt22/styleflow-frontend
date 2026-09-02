'use client'

import type { ReactNode } from 'react'

export function sectionClass(lightMode: boolean) {
  return lightMode
    ? 'rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5'
    : 'rounded-xl border border-slate-700 bg-[#1d2a3e] p-3 sm:rounded-2xl sm:p-5'
}

export function inputClass(lightMode: boolean) {
  return lightMode
    ? 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:h-11 sm:rounded-xl sm:px-3.5 sm:text-sm'
    : 'h-10 w-full rounded-lg border border-slate-600 bg-[#142035] px-3 text-[13px] text-white outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 sm:h-11 sm:rounded-xl sm:px-3.5 sm:text-sm'
}

export function labelClass(lightMode: boolean) {
  return `mb-1 block text-xs font-semibold sm:mb-1.5 sm:text-sm ${lightMode ? 'text-slate-700' : 'text-slate-300'}`
}

export function AdminLoading({ lightMode, text = 'Carregando...' }: { lightMode?: boolean; text?: string }) {
  return (
    <div
      className={`rounded-xl border border-dashed py-14 text-center text-xs font-semibold uppercase tracking-wide ${
        lightMode ? 'border-slate-200 text-slate-500' : 'border-slate-600 text-slate-400'
      }`}
    >
      {text}
    </div>
  )
}

export function AdminEmpty({ lightMode, text }: { lightMode?: boolean; text: string }) {
  return (
    <div
      className={`rounded-xl border border-dashed py-14 text-center text-sm ${
        lightMode ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-600 text-slate-400'
      }`}
    >
      {text}
    </div>
  )
}

export function AdminError({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-500">
      {message}
    </p>
  )
}

export function AdminStat({
  label,
  value,
  lightMode,
  tone = 'default',
}: {
  label: string
  value: string
  lightMode?: boolean
  tone?: 'default' | 'danger' | 'success'
}) {
  if (tone === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500 p-4 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-50">{label}</p>
        <p className="mt-2 text-2xl font-black">{value}</p>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${lightMode ? 'border-slate-200 bg-white' : 'border-slate-600 bg-[#142035]'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
      <p
        className={`mt-2 text-2xl font-black ${
          tone === 'danger' ? 'text-rose-500' : lightMode ? 'text-slate-900' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

export function AdminButton({
  children,
  onClick,
  variant = 'brand',
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'brand' | 'ghost' | 'danger' | 'success' | 'warning' | 'soft'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  const base =
    'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50'
  const styles =
    variant === 'brand'
      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500'
      : variant === 'success'
        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-400'
        : variant === 'warning'
          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 hover:bg-orange-400'
          : variant === 'danger'
            ? 'border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
            : variant === 'soft'
              ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  )
}

export function AdminModal({
  title,
  onClose,
  children,
  lightMode,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  lightMode?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl ${
          lightMode ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#1d2a3e]'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className={`text-lg font-bold ${lightMode ? 'text-slate-900' : 'text-white'}`}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={`grid size-8 place-items-center rounded-lg ${lightMode ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800'}`}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
