import Link from 'next/link'
import type { ReactNode } from 'react'
import { Wordmark } from '~/components/AppNav'

// the public pages share 1 narrow column & no app navigation
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[44rem] flex-col px-5 md:px-10">
      <header className="pt-6">
        <Wordmark />
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <footer className="border-t border-line py-6">
        <nav aria-label="Public pages" className="flex gap-6 text-meta font-bold text-ink-soft">
          <Link href="/about" className="hover:text-ink">About</Link>
          <Link href="/contact" className="hover:text-ink">Contact</Link>
          <Link href="/login" className="hover:text-ink">Sign in</Link>
        </nav>
      </footer>
    </div>
  )
}
