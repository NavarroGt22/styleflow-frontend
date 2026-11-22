import { platformProxy } from '@/lib/platform/server'
export const runtime = 'nodejs'
type Context = { params: Promise<{ path: string[] }> }
async function proxy(request: Request, context: Context) { return platformProxy(request, (await context.params).path) }
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE }
