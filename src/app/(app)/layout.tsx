import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { AppNav } from '~/components/AppNav'
import { isDemoMode } from '~/lib/services'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const theme = (await cookies()).get('theme')?.value === 'dark' ? 'dark' : 'light'

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-ink focus:px-4 focus:py-3 focus:text-paper">
        Skip to content
      </a>
      <AppNav theme={theme} />
      <main id="main" className="mx-auto max-w-[76rem] px-5 pb-36 md:px-10 md:pb-24">
        {children}
        {isDemoMode() ? <p className="mt-24 text-meta text-ink-soft">This is a sample logbook. Anything you log here disappears when the server restarts.</p> : null}
      </main>
    </>
  )
}
