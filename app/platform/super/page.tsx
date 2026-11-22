import SuperAdminDashboard from '@/components/admin/SuperAdminDashboard'
import { PlatformOverview } from '@/components/admin/platform/PlatformOverview'

export default function PlatformSuperPage() {
  return process.env.PLATFORM_MANAGEMENT_ENABLED === 'true' ? <PlatformOverview /> : <SuperAdminDashboard />
}
