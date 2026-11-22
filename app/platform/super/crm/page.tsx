import { ProductionCrm } from '@/components/admin/platform/management/crm'
import { notFound } from 'next/navigation'
export default function Page() {
  if (process.env.PLATFORM_MANAGEMENT_ENABLED !== 'true') notFound()
  return <main className="platform-workspace"><ProductionCrm /></main>
}
