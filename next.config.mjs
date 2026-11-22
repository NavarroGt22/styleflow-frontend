/** @type {import('next').NextConfig} */
import withPWAInit, { runtimeCaching } from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  fallbacks: {
    document: '/offline',
  },
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ sameOrigin, url }) => sameOrigin && (
          url.pathname.startsWith('/api/support/') || url.pathname === '/support' ||
          url.pathname.startsWith('/api/platform/') || url.pathname.startsWith('/platform/super') ||
          url.pathname === '/login' ||
          (url.pathname.startsWith('/admin/') && url.searchParams.has('session'))
        ),
        handler: 'NetworkOnly',
      },
      ...runtimeCaching,
    ],
  },
})

const nextConfig = {
  headers() {
    return ['/platform/super/:path*', '/api/platform/:path*', '/login'].map(source => ({ source, headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
    ] }))
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default withPWA(nextConfig)
