import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { PRODUCT_NAME } from '@/lib/brand'

/**
 * Raiz do site.
 *
 * - admin.* → login (o middleware já cuida; aqui é o fallback SSR).
 * - app.<barbearia> com domínio próprio → o middleware redireciona para /app/:slug.
 * - Qualquer outro caso (app.meucorteja.com/, localhost/, apex) não tem barbearia
 *   implícita: mostra uma tela neutra do produto. Nunca cai na vitrine de um tenant
 *   específico — cada barbearia é independente e só abre pelo próprio link.
 *
 * Login de dono/profissional fica só em admin.* (ou URL direta /login) —
 * não aparece aqui para o cliente achar que precisa entrar no painel.
 */
export default async function HomePage() {
  const h = await headers()
  const host = (h.get('x-forwarded-host') || h.get('host') || '')
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase()

  if (host.startsWith('admin.')) {
    redirect('/login')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0d0e] px-6 text-slate-100">
      <div className="w-full max-w-md text-center">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">{PRODUCT_NAME}</p>
        <h1 className="font-serif text-3xl tracking-tight">Agenda online para barbearias</h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Para agendar, use o link que a sua barbearia enviou (por exemplo{' '}
          <span className="font-mono text-slate-300">app.suabarbearia.com</span> ou{' '}
          <span className="font-mono text-slate-300">/app/nome-da-barbearia</span>).
        </p>
      </div>
    </main>
  )
}
