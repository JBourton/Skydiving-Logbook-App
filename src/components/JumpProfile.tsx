import { A_LICENCE_MIN_DEPLOY_ALTITUDE_FT } from '~/domain/deploy-altitude'
import { formatFeet } from '~/lib/format'

// every jump drawn the way you lived it: a solid bar for freefall from exit down to deploy, then a
// thin line for the canopy ride to the ground. A hop & pop is a sliver; a 15k jump is a tall bar.

const profileSettings = {
  scaleTopFt: 15000,
  columnWidth: 12,
}

type ProfileProps = {
  exitAltitudeFt: number | null
  deployAltitudeFt: number | null
  height?: number
  label?: string
}

function altitudeToY(altitudeFt: number, height: number): number {
  const clampedAltitude = Math.min(Math.max(altitudeFt, 0), profileSettings.scaleTopFt)
  return height - (clampedAltitude / profileSettings.scaleTopFt) * height
}

/** The compact column used in logbook rows & the recent-jumps skyline. */
export function JumpProfile({ exitAltitudeFt, deployAltitudeFt, height = 48, label }: ProfileProps) {
  const width = profileSettings.columnWidth
  const exitY = exitAltitudeFt === null ? null : altitudeToY(exitAltitudeFt, height)
  const deployY = deployAltitudeFt === null ? null : altitudeToY(deployAltitudeFt, height)
  const deployIsLow = deployAltitudeFt !== null && deployAltitudeFt < A_LICENCE_MIN_DEPLOY_ALTITUDE_FT

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={label === '' ? undefined : 'img'}
      aria-hidden={label === '' ? true : undefined}
      aria-label={label === '' ? undefined : (label ?? describeProfile(exitAltitudeFt, deployAltitudeFt))}
      className="shrink-0 overflow-visible"
    >
      <rect x={4} y={0} width={4} height={height} rx={2} className="fill-haze" />
      {deployY !== null ? <rect x={5} y={deployY} width={2} height={height - deployY} className="fill-ink-soft" /> : null}
      {exitY !== null && deployY !== null ? (
        <rect x={1} y={exitY} width={10} height={Math.max(deployY - exitY, 2)} rx={2} className="fill-ink" />
      ) : null}
      {exitY !== null && deployY === null ? <rect x={1} y={exitY} width={10} height={3} rx={1.5} className="fill-ink" /> : null}
      {deployIsLow && deployY !== null ? <rect x={-1} y={deployY - 1.5} width={14} height={3} rx={1.5} className="fill-warn" /> : null}
    </svg>
  )
}

function describeProfile(exitAltitudeFt: number | null, deployAltitudeFt: number | null): string {
  if (exitAltitudeFt === null) return 'Exit altitude not recorded'
  if (deployAltitudeFt === null) return `Exit at ${formatFeet(exitAltitudeFt)}, deploy altitude not recorded`
  return `Exit at ${formatFeet(exitAltitudeFt)}, deployed at ${formatFeet(deployAltitudeFt)}`
}

/** The labelled altimeter tape on the jump detail page. */
export function AltitudeTape({
  exitAltitudeFt,
  deployAltitudeFt,
  delayLabel,
}: {
  exitAltitudeFt: number | null
  deployAltitudeFt: number | null
  delayLabel: string | null
}) {
  const height = 320
  const exitY = exitAltitudeFt === null ? null : altitudeToY(exitAltitudeFt, height)
  const deployY = deployAltitudeFt === null ? null : altitudeToY(deployAltitudeFt, height)
  const minimumY = altitudeToY(A_LICENCE_MIN_DEPLOY_ALTITUDE_FT, height)
  const scaleMarks = [0, 5000, 10000, 15000]
  const labelPositions = spreadLabels(exitY, deployY, height)

  return (
    <div className="relative" style={{ height }}>
      <svg width={64} height={height} viewBox={`0 0 64 ${height}`} aria-hidden="true" className="overflow-visible">
        {Array.from({ length: 16 }, (_, index) => index * 1000).map((tickFt) => (
          <rect key={tickFt} x={tickFt % 5000 === 0 ? 0 : 8} y={altitudeToY(tickFt, height) - 0.5} width={tickFt % 5000 === 0 ? 18 : 10} height={1} className="fill-line" />
        ))}
        <rect x={34} y={0} width={6} height={height} rx={3} className="fill-haze" />
        <rect x={22} y={minimumY - 1} width={30} height={2} className="fill-warn" opacity={0.55} />
        {deployY !== null ? <rect x={35.5} y={deployY} width={3} height={height - deployY} className="fill-ink-soft" /> : null}
        {exitY !== null && deployY !== null ? <rect x={28} y={exitY} width={18} height={deployY - exitY} rx={4} className="fill-ink" /> : null}
      </svg>

      {scaleMarks.map((markFt) => (
        <span
          key={markFt}
          className="absolute -translate-x-full -translate-y-1/2 pr-2 text-meta text-ink-faint"
          style={{ top: altitudeToY(markFt, height), left: 0 }}
        >
          {markFt === 0 ? '0' : `${markFt / 1000}k`}
        </span>
      ))}

      <TapeLabel y={labelPositions.exitY} title="Exit" value={exitAltitudeFt === null ? 'Not recorded' : formatFeet(exitAltitudeFt)} />
      {labelPositions.freefallY !== null && delayLabel ? <TapeLabel y={labelPositions.freefallY} title="Freefall" value={delayLabel} /> : null}
      <TapeLabel
        y={labelPositions.deployY}
        title="Deploy"
        value={deployAltitudeFt === null ? 'Not recorded' : formatFeet(deployAltitudeFt)}
        isWarning={deployAltitudeFt !== null && deployAltitudeFt < A_LICENCE_MIN_DEPLOY_ALTITUDE_FT}
      />
    </div>
  )
}

// a hop & pop puts exit & deploy only a few pixels apart, so I nudge the labels until they can't collide
function spreadLabels(exitY: number | null, deployY: number | null, height: number) {
  const minimumGap = 54
  if (exitY === null || deployY === null) return { exitY, deployY, freefallY: null }
  const deployLabelY = Math.min(Math.max(deployY, exitY + minimumGap), height - 12)
  const exitLabelY = Math.min(exitY, deployLabelY - minimumGap)
  const hasRoomForFreefall = deployLabelY - exitLabelY >= minimumGap * 2
  return { exitY: exitLabelY, deployY: deployLabelY, freefallY: hasRoomForFreefall ? (exitLabelY + deployLabelY) / 2 : null }
}

function TapeLabel({ y, title, value, isWarning = false }: { y: number | null; title: string; value: string; isWarning?: boolean }) {
  if (y === null) return null
  return (
    <p className="absolute left-[4.75rem] -translate-y-1/2 whitespace-nowrap leading-tight" style={{ top: y }}>
      <span className="block text-meta text-ink-soft">{title}</span>
      <span className={`block text-title font-bold ${isWarning ? 'text-warn' : ''}`}>{value}</span>
    </p>
  )
}
