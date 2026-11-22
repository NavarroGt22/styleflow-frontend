import { PlatformShell } from '@/components/admin/platform/PlatformShell'
import '@/components/admin/platform/management/base.css'
import '@/components/admin/platform/management/production.css'
export const dynamic = 'force-dynamic'
export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return process.env.PLATFORM_MANAGEMENT_ENABLED === 'true' ? <PlatformShell>{children}</PlatformShell> : children
}
