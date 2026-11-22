import SupportAdminSession from '@/components/admin/SupportAdminSession'

export const metadata = { title: 'Acesso de suporte', referrer: 'no-referrer' }

type Props = { searchParams: Promise<{ session?: string | string[] }> }

export default async function SupportPage({ searchParams }: Props) {
  const { session } = await searchParams
  return <SupportAdminSession sessionId={typeof session === 'string' ? session : ''} />
}
