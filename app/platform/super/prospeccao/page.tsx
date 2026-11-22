import { PlatformProspecting } from '@/components/admin/platform/PlatformProspecting'
import { notFound } from 'next/navigation'
export default function Page() { if (process.env.PLATFORM_MANAGEMENT_ENABLED !== 'true') notFound(); return <PlatformProspecting /> }
