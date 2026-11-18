'use client'

import { useState } from 'react'

export type Theme = 'light' | 'dark'

// the server reads the same cookie in the root layout, so a reload keeps whatever was picked here
export function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  function switchTheme() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = nextTheme
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000; samesite=lax`
    setTheme(nextTheme)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={theme === 'dark'}
      onClick={switchTheme}
      className="inline-flex min-h-11 items-center gap-3 rounded-control px-2 text-meta font-bold text-ink-soft hover:text-ink"
    >
      Dark mode
      <span aria-hidden="true" className={`flex h-6 w-10 items-center rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-ink' : 'bg-haze-strong'}`}>
        <span className={`h-4 w-4 rounded-full bg-paper transition-transform duration-200 ${theme === 'dark' ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  )
}
