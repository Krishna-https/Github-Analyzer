import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AnalysisProvider } from '@/context/AnalysisContext'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Repository X-Ray — GitHub Repository Analyzer',
  description:
    'Repository X-Ray — a frontend prototype that demonstrates understanding an unfamiliar GitHub repository.',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <AnalysisProvider>{children}</AnalysisProvider>
      </body>
    </html>
  )
}
