import { supportProxy } from '@/lib/support/server'

export const runtime = 'nodejs'

async function proxy(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return supportProxy(request, (await params).path)
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
