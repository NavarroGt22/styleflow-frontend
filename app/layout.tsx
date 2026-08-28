import { Analytics } from '@vercel/analytics/next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import ClientProviders from '@/components/client/ClientProviders'
import './globals.css'

const bodyFont = DM_Sans({ subsets: ['latin'], variable: '--font-body' })
const displayFont = Playfair_Display({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'Leleco Barbers — Seu estilo. Seu momento.',
  description: 'Agende seu corte e barba online na Leleco Barbers.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0d0e',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background dark">
      <body className={`${bodyFont.variable} ${displayFont.variable} antialiased`}>
        <ClientProviders>{children}</ClientProviders>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
