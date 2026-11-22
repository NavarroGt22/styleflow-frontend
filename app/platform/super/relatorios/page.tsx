import { PlatformReports } from '@/components/admin/platform/PlatformReports'
import { notFound } from 'next/navigation'
export default function Page() { if (process.env.PLATFORM_MANAGEMENT_ENABLED !== 'true') notFound(); return <PlatformReports /> }
