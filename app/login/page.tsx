import { Suspense } from 'react'
import AdminLoginForm from '@/components/admin/AdminLoginForm'
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#0a0e1a] text-slate-300">Carregando...</div>}>
      <AdminLoginForm managementEnabled={process.env.PLATFORM_MANAGEMENT_ENABLED === 'true'} />
    </Suspense>
  )
}
