import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import BootLogger from '@/components/shared/BootLogger'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NextFlow',
  description: 'Visual AI workflow builder',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#8b5cf6',
          colorBackground: '#0a0a0a',
          colorInputBackground: '#1a1a1a',
          colorText: '#ffffff',
        },
      }}
    >
      <html lang="en">
        <body className={inter.className}>
          <BootLogger />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
