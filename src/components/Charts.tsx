import { addDays, monthOf, weekdayIndexMondayFirst } from '~/domain/calendar-date'
import { formatDate, formatMonth, formatNumber, pluralise } from '~/lib/format'

// all 3 charts are plain SVG drawn on the server: no chart library, no client JavaScript, & they
// pick up the theme colours straight from the CSS tokens

const heatmapSettings = {
  weeks: 53,
  cellSize: 13,
  cellGap: 3,
  // jumps per day mapped to ink opacity; UK jumping clusters into big weekends so I cap at 5+
  opacityByJumpCount: [0, 0.28, 0.5, 0.72, 0.86, 1],
}

/** GitHub-style year of jumping days, Monday at the top, most recent week on the right. */
export function ActivityHeatmap({ jumpsPerDay, endDate }: { jumpsPerDay: ReadonlyMap<string, number>; endDate: string }) {
  const { weeks, cellSize, cellGap, opacityByJumpCount } = heatmapSettings
  const pitch = cellSize + cellGap
  const firstMonday = addDays(endDate, -weekdayIndexMondayFirst(endDate) - (weeks - 1) * 7)
  const labelGutter = 30
  const width = labelGutter + weeks * pitch
  const height = 18 + 7 * pitch

  const cells = Array.from({ length: weeks * 7 }, (_, index) => {
    const date = addDays(firstMonday, index)
    return { date, week: Math.floor(index / 7), weekday: index % 7, count: jumpsPerDay.get(date) ?? 0 }
  }).filter((cell) => cell.date <= endDate)

  const monthStarts = cells.filter((cell) => cell.date.endsWith('-01') || (cell.week === 0 && cell.weekday === 0))
  const jumpingDays = cells.filter((cell) => cell.count > 0)
  const totalJumps = jumpingDays.reduce((total, cell) => total + cell.count, 0)

  return (
    // direction: rtl keeps the newest weeks in view on a narrow phone without any JavaScript
    <div className="overflow-x-auto pb-2 [direction:rtl]">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${pluralise(totalJumps, 'jump')} on ${pluralise(jumpingDays.length, 'day')} in the last 12 months`}
        className="mr-auto block [direction:ltr]"
      >
        {monthStarts.map((cell) => (
          <text key={cell.date} x={labelGutter + cell.week * pitch} y={11} className="fill-ink-soft text-[12px]">
            {formatMonth(monthOf(cell.date)).slice(0, 3)}
          </text>
        ))}
        {['Mon', 'Wed', 'Fri'].map((dayLabel, index) => (
          <text key={dayLabel} x={0} y={18 + index * 2 * pitch + cellSize - 2} className="fill-ink-soft text-[12px]">
            {dayLabel}
          </text>
        ))}
        {cells.map((cell) => (
          <rect
            key={cell.date}
            x={labelGutter + cell.week * pitch}
            y={18 + cell.weekday * pitch}
            width={cellSize}
            height={cellSize}
            rx={3}
            className={cell.count === 0 ? 'fill-haze' : 'fill-ink'}
            opacity={cell.count === 0 ? 1 : opacityByJumpCount[Math.min(cell.count, 5)]}
          >
            <title>{`${cell.count === 0 ? 'No jumps' : pluralise(cell.count, 'jump')} on ${formatDate(cell.date)}`}</title>
          </rect>
        ))}
      </svg>
    </div>
  )
}

/**
 * Running total of jumps by month. Labels are HTML rather than SVG text so they stay readable at
 * phone widths while the line itself stretches to fit.
 */
export function CumulativeLine({
  series,
  milestone,
}: {
  series: ReadonlyArray<{ month: string; total: number }>
  milestone?: { jumps: number; label: string }
}) {
  if (series.length < 2) return null

  const width = 600
  const height = 180
  const finalTotal = series[series.length - 1].total
  const topOfScale = Math.max(finalTotal, milestone?.jumps ?? 0) * 1.08
  const points = series.map((point, index) => {
    const x = (index / (series.length - 1)) * width
    const y = height - (point.total / topOfScale) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const milestoneY = milestone ? height - (milestone.jumps / topOfScale) * height : null

  return (
    <figure>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block h-44 w-full" aria-hidden="true">
          <line x1={0} y1={height} x2={width} y2={height} className="stroke-line" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          {milestoneY !== null ? (
            <line x1={0} y1={milestoneY} x2={width} y2={milestoneY} className="stroke-route" strokeWidth={2} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
          ) : null}
          <polyline points={points.join(' ')} fill="none" className="stroke-ink" strokeWidth={3} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {milestone && milestoneY !== null ? (
          <p className="absolute left-0 -translate-y-full pb-1 text-meta font-bold text-route" style={{ top: `${(milestoneY / height) * 100}%` }}>
            {milestone.label}
          </p>
        ) : null}
      </div>
      <figcaption className="mt-2 flex justify-between text-meta text-ink-soft">
        <span>{formatMonth(series[0].month)}</span>
        <span>
          {formatMonth(series[series.length - 1].month)}: <strong className="text-ink">{pluralise(finalTotal, 'jump')}</strong>
        </span>
      </figcaption>
    </figure>
  )
}

/** Horizontal bars for "where & what" breakdowns, longest 1st. */
export function BarList({ items }: { items: ReadonlyArray<{ label: string; value: number }> }) {
  const largest = Math.max(1, ...items.map((item) => item.value))
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="truncate">{item.label}</span>
            <span className="font-bold">{formatNumber(item.value)}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-haze">
            <div className="h-2 rounded-full bg-ink" style={{ width: `${(item.value / largest) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
