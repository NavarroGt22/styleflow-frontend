import { Analytics } from '@vercel/analytics/next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import ClientProviders from '@/components/client/ClientProviders'
import './globals.css'

const bodyFont = DM_Sans({ subsets: ['latin'], variable: '--font-body' })
const displayFont = Playfair_Display({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: {
    default: 'StyleFlow',
    template: '%s | StyleFlow',
  },
  description: 'Agendamento e gestão para barbearias e salões.',
  applicationName: 'StyleFlow',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
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
