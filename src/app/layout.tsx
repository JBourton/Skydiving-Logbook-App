import type { Metadata, Viewport } from 'next'
import { B612 } from 'next/font/google'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import './globals.css'

// next/font downloads B612 at build time & serves it from our own domain, so there's no request
// to Google from the browser & no layout shift while it loads
const cockpitTypeface = B612({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-b612',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Skydive log', template: '%s – Skydive log' },
  description: 'A private digital skydiving logbook.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // reading the cookie on the server means the right theme is in the very 1st paint, no flash
  const theme = (await cookies()).get('theme')?.value === 'dark' ? 'dark' : 'light'

  return (
    <html lang="en-GB" data-theme={theme} className={cockpitTypeface.variable}>
      <body>{children}</body>
    </html>
  )
}
