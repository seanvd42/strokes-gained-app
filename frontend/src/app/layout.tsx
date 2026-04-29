import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Strokes Gained - Golf Performance Analytics',
  description: 'Advanced golf shot analysis and strokes gained calculations',
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
