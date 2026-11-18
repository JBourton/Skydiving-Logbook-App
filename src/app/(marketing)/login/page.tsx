import type { Metadata } from 'next'
import { TextLink } from '~/components/Primitives'
import { isDemoMode } from '~/lib/services'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <section className="pt-20 md:pt-28">
      <h1 className="text-display">Sign in</h1>
      <p className="mt-4 text-title text-ink-soft">This logbook is private. Sign in with the Microsoft account it belongs to.</p>
      {/* wired up by the auth milestone; until then the button is honest about not working */}
      <button type="button" disabled className="mt-10 min-h-16 w-full rounded-control bg-ink px-6 text-title font-bold text-paper opacity-45 sm:w-auto sm:min-w-80">
        Sign in with Microsoft
      </button>
      <p className="mt-3 text-meta text-ink-soft">Sign-in arrives with Microsoft Entra ID.</p>
      {isDemoMode() ? (
        <p className="mt-10">
          <TextLink href="/">Look around the sample logbook</TextLink>
        </p>
      ) : null}
    </section>
  )
}
