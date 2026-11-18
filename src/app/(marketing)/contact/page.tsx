import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Contact' }

export default function ContactPage() {
  return (
    <section className="pt-16 md:pt-24">
      <h1 className="text-display">Contact</h1>
      <p className="mt-4 text-title text-ink-soft">The logbook is private for now. If it opens up to other skydivers, this is where to ask for a place.</p>
      {/* the form is designed but not sent anywhere until a NotificationProvider port exists */}
      <form className="mt-10 flex flex-col gap-5">
        <label>
          <span className="mb-1.5 block text-meta text-ink-soft">Your name</span>
          <input type="text" name="name" autoComplete="name" disabled />
        </label>
        <label>
          <span className="mb-1.5 block text-meta text-ink-soft">Email</span>
          <input type="email" name="email" autoComplete="email" disabled />
        </label>
        <label>
          <span className="mb-1.5 block text-meta text-ink-soft">Message</span>
          <textarea name="message" rows={5} disabled />
        </label>
        <button type="submit" disabled className="min-h-14 self-start rounded-control bg-ink px-6 font-bold text-paper opacity-45">
          Send message
        </button>
        <p className="text-meta text-ink-soft">The contact form opens if the logbook goes public.</p>
      </form>
    </section>
  )
}
