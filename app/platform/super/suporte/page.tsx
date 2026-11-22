import { ProductionTenants } from '@/components/admin/platform/management/tenants'
import { notFound } from 'next/navigation'
export default function Page() {
  if (process.env.PLATFORM_MANAGEMENT_ENABLED !== 'true') notFound()
  return <main className="platform-workspace"><ProductionTenants /></main>
}
