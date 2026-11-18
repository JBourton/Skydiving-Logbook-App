import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <article className="pt-16 md:pt-24">
      <h1 className="text-display">A skydiving logbook for reading on the ground</h1>
      <div className="mt-8 flex flex-col gap-5 text-title leading-relaxed">
        <p>
          It's a private, digital copy of a paper logbook. Photograph a page & an AI vision model reads the handwriting, but nothing is saved until you've checked every jump against the photo.
        </p>
        <p>From there it keeps track of currency, the route to your next British Skydiving licence, your gear & your personal bests.</p>
        <p className="text-body text-ink-soft">
          It's built with Next.js, TypeScript & Postgres in a ports-and-adapters layout, so the OCR model, database, storage & sign-in provider can each be swapped without touching the rest.{' '}
          <a href="https://github.com/JBourton/Skydiving-Logbook-App" className="font-bold text-ink underline decoration-2 underline-offset-4">
            The source is on GitHub
          </a>
          .
        </p>
      </div>
    </article>
  )
}
