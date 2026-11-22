import { ProductionFinance } from '@/components/admin/platform/management/finance'
import { PlatformPayments } from '@/components/admin/platform/PlatformPayments'
import { notFound } from 'next/navigation'
export default function Page() {
  if (process.env.PLATFORM_MANAGEMENT_ENABLED !== 'true') notFound()
  return <main className="platform-workspace"><PlatformPayments /><div className="mt-8"><ProductionFinance /></div></main>
}
