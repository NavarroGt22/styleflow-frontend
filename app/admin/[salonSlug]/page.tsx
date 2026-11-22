import AdminAuthGuard from '@/components/admin/AdminAuthGuard'
import AdminDashboard from '@/components/admin/AdminDashboard'
import SupportAdminSession from '@/components/admin/SupportAdminSession'

type Props = {
  params: Promise<{ salonSlug: string }>
  searchParams: Promise<{ session?: string | string[] }>
}

export default async function AdminSalonPage({ params, searchParams }: Props) {
  const [{ salonSlug }, { session }] = await Promise.all([params, searchParams])
  if (session !== undefined) {
    const sessionId = typeof session === 'string' ? session : ''
    return <SupportAdminSession key={`${salonSlug}:${sessionId}`} sessionId={sessionId} salonSlug={salonSlug} />
  }

  return (
    <AdminAuthGuard salonSlug={salonSlug}>
      <AdminDashboard salonSlug={salonSlug} />
    </AdminAuthGuard>
  )
}
