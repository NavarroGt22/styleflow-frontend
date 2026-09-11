import Link from 'next/link'
import { PRODUCT_NAME } from '@/lib/brand'

export const metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b0d0e] px-6 text-center text-slate-100">
      <div className="max-w-sm space-y-4">
        <p className="text-[10px] font-semibold tracking-[0.3em] text-slate-500">{PRODUCT_NAME.toUpperCase()}</p>
        <h1 className="font-serif text-3xl tracking-tight">Você está offline</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          Sem conexão no momento. Assim que a internet voltar, toque para tentar de novo.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-100 px-5 text-sm font-semibold text-slate-900"
        >
          Tentar novamente
        </Link>
      </div>
    </main>
  )
}
