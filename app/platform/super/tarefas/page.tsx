import { Organizer } from '@/components/admin/platform/management/organizer'
import { notFound } from 'next/navigation'
export default function Page() {
  if (process.env.PLATFORM_MANAGEMENT_ENABLED !== 'true') notFound()
  return <main className="platform-workspace"><Organizer /></main>
}
