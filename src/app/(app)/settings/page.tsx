import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { EmptyState, PageHeader, Readout, Section, TagChips, TextLink } from '~/components/Primitives'
import { ThemeToggle } from '~/components/ThemeToggle'
import type { TagCategory } from '~/lib/demo-data'
import { loadLogbook } from '~/lib/logbook-view'

export const metadata: Metadata = { title: 'Settings' }

const tagCategoryNames: Record<TagCategory, string> = {
  progression: 'Progression',
  discipline: 'Discipline',
  event_type: 'Event',
  role: 'Role',
  custom: 'Your own',
}

const quietButton = 'inline-flex min-h-14 items-center rounded-control bg-haze px-6 font-bold hover:bg-haze-strong'

export default async function SettingsPage() {
  const view = await loadLogbook()
  const theme = (await cookies()).get('theme')?.value === 'dark' ? 'dark' : 'light'
  const { profile, allTags } = view.previewOnly
  const categories = Object.keys(tagCategoryNames) as TagCategory[]

  return (
    <>
      <PageHeader title="Settings" />

      <Section title="Appearance" description="Light is tuned for reading outdoors. Dark is there for the drive home.">
        <ThemeToggle initialTheme={theme} />
      </Section>

      <Section title="Licence & grades" description="Copied from your British Skydiving licence card. Progress & currency are worked out from these.">
        {profile.licence ? (
          <Readout
            items={[
              { label: 'Licence', value: profile.licence === 'student' ? 'Student' : `${profile.licence} licence` },
              { label: 'Grades', value: profile.grades.length > 0 ? profile.grades.join(', ') : 'None yet' },
            ]}
          />
        ) : (
          <EmptyState title="Not recorded yet">Saving your licence & grades needs a small addition to the database, which is the next schema change on the list.</EmptyState>
        )}
      </Section>

      <Section title="Tags" description="Tags are yours to rename & add to. A starter set arrives on 1st sign-in.">
        {allTags.length > 0 ? (
          <dl className="flex flex-col gap-5">
            {categories.map((category) => {
              const names = allTags.filter((tagView) => tagView.category === category).map((tagView) => tagView.name)
              if (names.length === 0) return null
              return (
                <div key={category} className="grid gap-2 sm:grid-cols-[9rem_1fr]">
                  <dt className="text-meta text-ink-soft">{tagCategoryNames[category]}</dt>
                  <dd>
                    <TagChips names={names} />
                  </dd>
                </div>
              )
            })}
          </dl>
        ) : (
          <EmptyState title="No tags yet">Tags switch on once the tag store is built.</EmptyState>
        )}
      </Section>

      <Section title="Export & backup" description="Your logbook is yours. The JSON backup has every jump & the drop zones they reference.">
        <div className="flex flex-wrap gap-3">
          {/* a plain <a>, not <Link>: this is a file download from a route handler, not a page */}
          <a href="/api/export" download className={quietButton}>
            Download JSON backup
          </a>
          <button type="button" disabled className={`${quietButton} opacity-45`}>
            British Skydiving PDF (beta, coming)
          </button>
          <button type="button" disabled className={`${quietButton} opacity-45`}>
            Currency reminders calendar (beta, coming)
          </button>
        </div>
      </Section>

      <Section title="Account">
        <p className="text-ink-soft">
          {view.isDemo ? 'You are looking at a sample logbook.' : 'Signed in for local development.'} Sign-in with Microsoft Entra ID arrives with the auth milestone.{' '}
          <TextLink href="/about">About this app</TextLink>
        </p>
      </Section>
    </>
  )
}
