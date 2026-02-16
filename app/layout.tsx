import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Anonymous Messaging Platform',
  description: 'Real-time anonymous feedback platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
