import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Web3Modal } from '@/components/providers/Web3Modal'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Blockchain Portfolio',
  description: 'Your decentralized portfolio tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Web3Modal>
          {children}
        </Web3Modal>
      </body>
    </html>
  )
} 