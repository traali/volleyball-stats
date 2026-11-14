/** Arto's Parkkis app (Cloudflare Pages project "parkkis"). Same URL shape as Pelipäivä. */
export const PARKKIS_BASE_URL = 'https://parkkis.pages.dev'

/**
 * Deep link to Parkkis at a venue. Parkkis reads the venue name from
 * `/venue/<name>` and centres its map on `?lat=&lon=`. Without real
 * coordinates there is nothing to point at, so this returns null.
 */
export function buildParkingDeepLink(
  parkkisBaseUrl: string,
  venueName: string,
  lat?: number,
  lon?: number,
): string | null {
  const valid = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
  if (!valid(lat) || !valid(lon) || (lat === 0 && lon === 0)) return null
  const url = new URL(parkkisBaseUrl)
  const name = venueName.trim()
  url.pathname = name ? `/venue/${encodeURIComponent(name)}` : '/'
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  return url.toString()
}

export function parkkisVenueUrl(venueName: string, lat?: number, lon?: number): string | null {
  return buildParkingDeepLink(PARKKIS_BASE_URL, venueName, lat, lon)
}

export type VenuePin = {
  name: string
  city?: string
  lat?: number
  lon?: number
}

function toCoord(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

/** Coordinates TASO can actually point at. Missing, non-numeric or 0,0 are not a pin. */
export function parseVenueCoords(lat: unknown, lon: unknown): { lat: number; lon: number } | null {
  const a = toCoord(lat)
  const b = toCoord(lon)
  if (a === undefined || b === undefined || (a === 0 && b === 0)) return null
  return { lat: a, lon: b }
}

/** Venue block data from a Torneopal getMatch payload. Null when there is no name and no pin. */
export function venueFromMatch(raw: Record<string, unknown>): VenuePin | null {
  const name = String(raw.venue_name ?? '').trim()
  const city = String(raw.venue_city_name ?? '').trim()
  const coords = parseVenueCoords(raw.venue_lat, raw.venue_lon)
  if (!name && !coords) return null
  return {
    name,
    ...(city ? { city } : {}),
    ...(coords ?? {}),
  }
}

/** Lightweight OpenStreetMap embed (no API key). */
export function openStreetMapEmbedUrl(lat: number, lon: number, delta = 0.006): string {
  const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].join(',')
  const url = new URL('https://www.openstreetmap.org/export/embed.html')
  url.searchParams.set('bbox', bbox)
  url.searchParams.set('layer', 'mapnik')
  url.searchParams.set('marker', `${lat},${lon}`)
  return url.toString()
}

/** Open the same pin on OpenStreetMap itself. */
export function openStreetMapViewUrl(lat: number, lon: number, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(String(lat))}&mlon=${encodeURIComponent(String(lon))}#map=${zoom}/${lat}/${lon}`
}
