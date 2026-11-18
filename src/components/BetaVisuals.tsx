import { formatNumber, pluralise } from '~/lib/format'

// beta zone visuals, both plain SVG maths with no map or graph library. If either graduates out
// of beta it can swap to a real library behind the same props.

const globeSettings = {
  viewSize: 340,
  // zoom limits: whole-globe when drop zones are continents apart, close-in when they're all in 1 country
  minimumRadius: 150,
  maximumRadius: 1400,
  labelSpacing: 34,
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

type GlobeView = { radius: number; centreLatitude: number; centreLongitude: number }

/** Orthographic projection: returns null for points on the far side of the globe. */
function project(latitude: number, longitude: number, globe: GlobeView): { x: number; y: number } | null {
  const phi = toRadians(latitude)
  const phiCentre = toRadians(globe.centreLatitude)
  const deltaLambda = toRadians(longitude - globe.centreLongitude)
  const cosineOfAngle = Math.sin(phiCentre) * Math.sin(phi) + Math.cos(phiCentre) * Math.cos(phi) * Math.cos(deltaLambda)
  if (cosineOfAngle < 0) return null
  return {
    x: globe.radius * Math.cos(phi) * Math.sin(deltaLambda),
    y: -globe.radius * (Math.cos(phiCentre) * Math.sin(phi) - Math.sin(phiCentre) * Math.cos(phi) * Math.cos(deltaLambda)),
  }
}

// centre on the drop zones, then zoom until the furthest one sits ~40% of the way to the edge
function fitGlobe(points: ReadonlyArray<{ latitude: number; longitude: number }>): GlobeView {
  const centreLatitude = points.reduce((total, point) => total + point.latitude, 0) / points.length
  const centreLongitude = points.reduce((total, point) => total + point.longitude, 0) / points.length
  const unitGlobe = { radius: 1, centreLatitude, centreLongitude }
  const furthest = Math.max(0.0001, ...points.map((point) => {
    const projected = project(point.latitude, point.longitude, unitGlobe)
    return projected ? Math.hypot(projected.x, projected.y) : 1
  }))
  const radius = Math.min(globeSettings.maximumRadius, Math.max(globeSettings.minimumRadius, (globeSettings.viewSize * 0.4) / furthest))
  return { radius, centreLatitude, centreLongitude }
}

function graticulePaths(globe: GlobeView): string[] {
  const step = globe.radius > 600 ? 5 : 15
  const lines: Array<Array<[number, number]>> = []
  for (let longitude = -180; longitude < 180; longitude += step) {
    lines.push(Array.from({ length: 181 }, (_, index) => [-90 + index, longitude] as [number, number]))
  }
  for (let latitude = -85; latitude <= 85; latitude += step) {
    lines.push(Array.from({ length: 361 }, (_, index) => [latitude, -180 + index] as [number, number]))
  }
  // I break each line wherever it slips round the back, so hidden halves never get drawn across the front
  return lines.map((line) => {
    let path = ''
    let penDown = false
    for (const [latitude, longitude] of line) {
      const point = project(latitude, longitude, globe)
      if (point === null) {
        penDown = false
        continue
      }
      path += `${penDown ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`
      penDown = true
    }
    return path
  })
}

export function DropZoneGlobe({ dropZones }: { dropZones: ReadonlyArray<{ name: string; latitude: number; longitude: number; jumps: number }> }) {
  const globe = fitGlobe(dropZones)
  const size = globeSettings.viewSize
  const plotted = dropZones
    .map((dropZone) => ({ ...dropZone, point: project(dropZone.latitude, dropZone.longitude, globe) }))
    .filter((dropZone): dropZone is typeof dropZone & { point: { x: number; y: number } } => dropZone.point !== null)
    .sort((a, b) => b.jumps - a.jumps)
  // the busiest drop zones get labels first; a label that would crowd an earlier one is left off
  const labelled: Array<{ x: number; y: number }> = []
  const labels = plotted.filter((dropZone) => {
    const crowded = labelled.some((other) => Math.hypot(other.x - dropZone.point.x, other.y - dropZone.point.y) < globeSettings.labelSpacing)
    if (!crowded) labelled.push(dropZone.point)
    return !crowded
  })

  return (
    <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} className="mx-auto block w-full max-w-sm overflow-hidden rounded-panel" role="img" aria-label={`Globe showing ${pluralise(plotted.length, 'drop zone')}`}>
      <circle r={globe.radius} className="fill-haze" />
      {graticulePaths(globe).map((path, index) => (
        <path key={index} d={path} fill="none" className="stroke-line" strokeWidth={0.8} />
      ))}
      <circle r={globe.radius} fill="none" className="stroke-ink-soft" strokeWidth={1.5} />
      {plotted.map((dropZone) => (
        <circle key={dropZone.name} cx={dropZone.point.x} cy={dropZone.point.y} r={3 + Math.sqrt(dropZone.jumps) * 1.4} className="fill-ink stroke-paper" strokeWidth={2} opacity={0.9}>
          <title>{`${dropZone.name}: ${pluralise(dropZone.jumps, 'jump')}`}</title>
        </circle>
      ))}
      {labels.map((dropZone) => (
        <text key={`${dropZone.name}-label`} x={dropZone.point.x + 6 + Math.sqrt(dropZone.jumps) * 1.4} y={dropZone.point.y + 4} className="fill-ink text-[12px] font-bold">
          {dropZone.name.replace(/^Skydive /, '')}
        </text>
      ))}
    </svg>
  )
}

/** You in the middle; the people you jump with most orbit closest. */
export function PartnerOrbit({ partners }: { partners: ReadonlyArray<{ name: string; jumps: number }> }) {
  const width = 360
  const height = 300
  const mostJumps = Math.max(1, ...partners.map((partner) => partner.jumps))
  const placed = [...partners]
    .sort((a, b) => b.jumps - a.jumps)
    .map((partner, index) => {
      const angle = -Math.PI / 2 + (index / partners.length) * Math.PI * 2
      const orbit = 62 + (1 - partner.jumps / mostJumps) * 62
      return { ...partner, x: Math.cos(angle) * orbit, y: Math.sin(angle) * orbit, angle, nodeRadius: 6 + Math.sqrt(partner.jumps) * 2 }
    })

  return (
    <svg viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`} className="mx-auto block w-full max-w-md" role="img" aria-label="Who you jump with most">
      {[62, 124].map((orbit) => (
        <circle key={orbit} r={orbit} fill="none" className="stroke-line" strokeDasharray="2 5" />
      ))}
      {placed.map((partner) => (
        <line key={`${partner.name}-line`} x1={0} y1={0} x2={partner.x} y2={partner.y} className="stroke-line" strokeWidth={1 + partner.jumps / 4} />
      ))}
      <circle r={22} className="fill-ink" />
      <text textAnchor="middle" dy="0.35em" className="fill-paper text-[12px] font-bold">
        You
      </text>
      {placed.map((partner) => {
        const labelDistance = partner.nodeRadius + 10
        const labelX = partner.x + Math.cos(partner.angle) * labelDistance
        const labelY = partner.y + Math.sin(partner.angle) * labelDistance
        const anchor = Math.abs(Math.cos(partner.angle)) < 0.3 ? 'middle' : Math.cos(partner.angle) > 0 ? 'start' : 'end'
        const verticalNudge = Math.sin(partner.angle) > 0.7 ? 10 : Math.sin(partner.angle) < -0.7 ? -12 : 0
        return (
          <g key={partner.name}>
            <circle cx={partner.x} cy={partner.y} r={partner.nodeRadius} className="fill-paper stroke-ink" strokeWidth={2.5} />
            <text x={labelX} y={labelY + verticalNudge} textAnchor={anchor} className="fill-ink text-[12px] font-bold">
              {partner.name}
              <tspan className="fill-ink-soft font-normal">{`  ${formatNumber(partner.jumps)}`}</tspan>
            </text>
          </g>
        )
      })}
    </svg>
  )
}
