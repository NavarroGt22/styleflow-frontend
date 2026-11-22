import SuperAdminDashboard from '@/components/admin/SuperAdminDashboard'
import { notFound } from 'next/navigation'
export default function PlatformTenantsPage() {
  if (process.env.PLATFORM_MANAGEMENT_ENABLED !== 'true') notFound()
  return <SuperAdminDashboard unified />
}
