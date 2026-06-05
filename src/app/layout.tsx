import type { Metadata } from 'next'
import { Sora, Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/ui/query-provider'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'market.zone — Orayn Sales Platform',
  description: 'Invite-only CRM and sales operations platform for Orayn Digital Agency.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              style: {
                fontFamily: 'var(--font-inter)',
                fontSize: '14px',
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  )
}
