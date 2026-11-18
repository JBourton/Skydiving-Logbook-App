import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[44rem] px-5 pt-24 md:px-10 md:pt-32">
      <p className="text-meta text-ink-soft">Page not found</p>
      <h1 className="mt-2 text-display">Nothing logged here</h1>
      <p className="mt-4 text-title text-ink-soft">That jump or page doesn't exist, or it's been archived.</p>
      <Link href="/" className="mt-10 inline-flex min-h-14 items-center rounded-control bg-ink px-6 font-bold text-paper hover:bg-ink-soft">
        Go to Today
      </Link>
    </main>
  )
}
