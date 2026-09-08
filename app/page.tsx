import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

/**
 * Fallback SSR: em hosts admin.* o middleware já redireciona.
 * Em plataforma/localhost mantém atalho para o salão demo.
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

  if (host.startsWith('app.')) {
    redirect('/app/leleco')
  }

  redirect('/app/leleco')
}
