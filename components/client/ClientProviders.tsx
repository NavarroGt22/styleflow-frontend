'use client'

import { ToastHost } from '@/lib/client/toast'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastHost />
    </>
  )
}
