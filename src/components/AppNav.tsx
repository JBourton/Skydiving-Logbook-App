'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { JumpProfile } from '~/components/JumpProfile'
import { type Theme, ThemeToggle } from '~/components/ThemeToggle'

// text-only navigation on purpose: in glare an icon is a guess, a word isn't
const desktopDestinations = [
  { href: '/', label: 'Today' },
  { href: '/jumps', label: 'Logbook' },
  { href: '/progress', label: 'Progress' },
  { href: '/stats', label: 'Stats' },
  { href: '/gear', label: 'Gear' },
  { href: '/beta', label: 'Beta' },
  { href: '/settings', label: 'Settings' },
]

// the phone bar is Today, Logbook, then the Log jump button in the thumb's sweet spot, then Progress & More
const phoneBarDestinations = [
  { href: '/', label: 'Today' },
  { href: '/jumps', label: 'Logbook' },
]

const phoneMoreDestinations = [
  { href: '/stats', label: 'Stats' },
  { href: '/gear', label: 'Gear' },
  { href: '/jumps/import', label: 'Scan logbook pages' },
  { href: '/wrapped', label: 'Year in review' },
  { href: '/beta', label: 'Beta' },
  { href: '/settings', label: 'Settings' },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  if (href === '/jumps') return pathname === '/jumps' || /^\/jumps\/(?!new|import)/.test(pathname)
  return pathname.startsWith(href)
}

export function Wordmark() {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 text-body font-bold">
      <JumpProfile exitAltitudeFt={13000} deployAltitudeFt={3500} height={24} label="" />
      skydive log
    </Link>
  )
}

export function AppNav({ theme }: { theme: Theme }) {
  const pathname = usePathname()
  const moreMenuRef = useRef<HTMLDetailsElement>(null)

  // the More menu is a plain <details> so it works before JavaScript loads; I just close it on navigation
  useEffect(() => {
    if (moreMenuRef.current) moreMenuRef.current.open = false
  }, [pathname])

  return (
    <>
      <header className="mx-auto flex max-w-[76rem] items-center justify-between gap-6 px-5 pt-3 md:px-10 md:pt-6">
        <Wordmark />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {desktopDestinations.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              aria-current={isActive(pathname, destination.href) ? 'page' : undefined}
              className="rounded-control px-3 py-2 font-bold text-ink-soft hover:bg-haze hover:text-ink aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
            >
              {destination.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle initialTheme={theme} />
          <Link href="/jumps/new" className="inline-flex min-h-11 items-center rounded-control bg-ink px-5 font-bold text-paper hover:bg-ink-soft">
            Log jump
          </Link>
        </div>
      </header>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5 items-center px-2 pt-2">
          {phoneBarDestinations.map((destination) => (
            <PhoneBarLink key={destination.href} href={destination.href} label={destination.label} isActive={isActive(pathname, destination.href)} />
          ))}
          <li className="flex justify-center">
            <Link href="/jumps/new" className="flex min-h-12 items-center rounded-full bg-ink px-4 text-meta font-bold text-paper">
              Log jump
            </Link>
          </li>
          <PhoneBarLink href="/progress" label="Progress" isActive={isActive(pathname, '/progress')} />
          <li>
            <details ref={moreMenuRef} className="group">
              <summary className="flex min-h-12 cursor-pointer list-none flex-col items-center justify-center text-meta font-bold text-ink-soft group-open:text-ink [&::-webkit-details-marker]:hidden">
                More
              </summary>
              <ul className="absolute right-3 bottom-[calc(100%+0.5rem)] w-64 rounded-panel border border-line bg-paper p-2">
                {phoneMoreDestinations.map((destination) => (
                  <li key={destination.href}>
                    <Link
                      href={destination.href}
                      aria-current={isActive(pathname, destination.href) ? 'page' : undefined}
                      className="flex min-h-12 items-center rounded-control px-4 font-bold hover:bg-haze aria-[current=page]:bg-haze"
                    >
                      {destination.label}
                    </Link>
                  </li>
                ))}
                <li className="mt-1 border-t border-line px-2 pt-2">
                  <ThemeToggle initialTheme={theme} />
                </li>
              </ul>
            </details>
          </li>
        </ul>
      </nav>
    </>
  )
}

function PhoneBarLink({ href, label, isActive: active }: { href: string; label: string; isActive: boolean }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className="flex min-h-12 flex-col items-center justify-center text-meta font-bold text-ink-soft aria-[current=page]:text-ink"
      >
        <span aria-hidden="true" className={`mb-1 h-1 w-6 rounded-full ${active ? 'bg-ink' : 'bg-transparent'}`} />
        {label}
      </Link>
    </li>
  )
}
