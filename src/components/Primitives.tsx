import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

// the handful of building blocks every page shares. Deliberately no Card component: sections sit
// straight on the page & get their structure from space, which reads better in bright light.

export function PageHeader({ title, lede, children }: { title: string; lede?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 pt-8 pb-2 md:flex-row md:items-end md:justify-between md:pt-14">
      <div className="max-w-[40rem]">
        <h1 className="text-heading md:text-display">{title}</h1>
        {lede ? <p className="mt-3 text-ink-soft">{lede}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-3">{children}</div> : null}
    </header>
  )
}

export function Section({
  title,
  description,
  action,
  children,
  id,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  id?: string
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="mt-12 md:mt-16">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={id ? `${id}-title` : undefined} className="text-title">
          {title}
        </h2>
        {action}
      </div>
      {description ? <p className="mt-1 max-w-[42rem] text-meta text-ink-soft">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  )
}

const buttonStyles = {
  primary: 'bg-ink text-paper hover:bg-ink-soft',
  quiet: 'bg-haze text-ink hover:bg-haze-strong',
}

const buttonBase =
  'inline-flex min-h-14 items-center justify-center gap-2 rounded-control px-6 text-body font-bold transition-colors duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45'

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...linkProps
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonStyles }) {
  return <Link {...linkProps} className={`${buttonBase} ${buttonStyles[variant]} ${className}`} />
}

export function Button({
  variant = 'primary',
  className = '',
  ...buttonProps
}: ComponentProps<'button'> & { variant?: keyof typeof buttonStyles }) {
  return <button {...buttonProps} className={`${buttonBase} ${buttonStyles[variant]} ${className}`} />
}

export function TextLink({ className = '', ...linkProps }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...linkProps}
      className={`font-bold underline decoration-2 underline-offset-4 decoration-line hover:decoration-ink ${className}`}
    />
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-panel bg-haze px-6 py-8 md:px-8">
      <p className="text-title font-bold">{title}</p>
      {children ? <div className="mt-2 max-w-[38rem] text-ink-soft">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function TagChips({ names }: { names: readonly string[] }) {
  if (names.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
      {names.map((name) => (
        <li key={name} className="rounded-full bg-haze px-2.5 py-0.5 text-meta text-ink-soft">
          {name}
        </li>
      ))}
    </ul>
  )
}

/** Label-over-value pairs, read like the instrument panel they're styled after. */
export function Readout({ items, columns = 2 }: { items: ReadonlyArray<{ label: string; value: ReactNode; hint?: ReactNode }>; columns?: 2 | 3 }) {
  return (
    <dl className={`grid grid-cols-2 gap-x-6 gap-y-6 ${columns === 3 ? 'sm:grid-cols-3' : ''}`}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-meta text-ink-soft">{item.label}</dt>
          <dd className="mt-1 text-title font-bold">{item.value}</dd>
          {item.hint ? <dd className="text-meta text-ink-soft">{item.hint}</dd> : null}
        </div>
      ))}
    </dl>
  )
}
