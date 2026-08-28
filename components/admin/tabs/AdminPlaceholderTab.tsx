import type { LucideIcon } from 'lucide-react'

type Props = { icon: LucideIcon; title: string; description: string; lightMode?: boolean }

export default function AdminPlaceholderTab({ icon: Icon, title, description, lightMode = false }: Props) {
  return (
    <div
      className={`flex min-h-[280px] flex-col items-center justify-center rounded-xl border px-6 py-10 text-center ${
        lightMode ? 'border-slate-300 bg-white' : 'border-slate-700 bg-[#1d2a3e]'
      }`}
    >
      <span
        className={`mb-4 grid size-14 place-items-center rounded-xl ${
          lightMode ? 'bg-indigo-50 text-indigo-500' : 'bg-[#142035] text-indigo-400'
        }`}
      >
        <Icon className="size-7" />
      </span>
      <h2 className={`text-[11px] font-bold uppercase tracking-wide ${lightMode ? 'text-slate-900' : 'text-white'}`}>
        {title}
      </h2>
      <p className={`mt-2 max-w-md text-[10px] leading-5 ${lightMode ? 'text-slate-600' : 'text-slate-400'}`}>
        {description}
      </p>
    </div>
  )
}
