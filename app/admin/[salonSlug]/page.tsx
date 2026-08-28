'use client'

import { use } from 'react'
import AdminAuthGuard from '@/components/admin/AdminAuthGuard'
import AdminDashboard from '@/components/admin/AdminDashboard'

type Props = { params: Promise<{ salonSlug: string }> }

export default function AdminSalonPage({ params }: Props) {
  const { salonSlug } = use(params)

  return (
    <AdminAuthGuard salonSlug={salonSlug}>
      <AdminDashboard salonSlug={salonSlug} />
    </AdminAuthGuard>
  )
}
