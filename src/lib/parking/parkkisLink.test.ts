import { describe, expect, it } from 'vitest'
import match816603 from '../../domain/fixtures/match-816603.json'
import {
  PARKKIS_BASE_URL,
  buildParkingDeepLink,
  openStreetMapEmbedUrl,
  openStreetMapViewUrl,
  parkkisVenueUrl,
  parseVenueCoords,
  venueFromMatch,
} from './parkkisLink'

const Kapyla = {
  name: 'Stadin ammattiopisto Käpylän toimipiste',
  lat: 60.21869755,
  lon: 24.94855855131742,
}

describe('buildParkingDeepLink (Pelipäivä format)', () => {
  it('builds /venue/<name>?lat=&lon= for a real pin', () => {
    expect(parkkisVenueUrl(Kapyla.name, Kapyla.lat, Kapyla.lon)).toBe(
      `${PARKKIS_BASE_URL}/venue/${encodeURIComponent(Kapyla.name)}?lat=${Kapyla.lat}&lon=${Kapyla.lon}`,
    )
  })

  it('hides the link when coordinates are missing', () => {
    expect(parkkisVenueUrl(Kapyla.name)).toBeNull()
    expect(buildParkingDeepLink(PARKKIS_BASE_URL, Kapyla.name, Kapyla.lat)).toBeNull()
    expect(buildParkingDeepLink(PARKKIS_BASE_URL, Kapyla.name, undefined, Kapyla.lon)).toBeNull()
  })

  it('hides the link when coordinates are 0,0 or not finite', () => {
    expect(parkkisVenueUrl(Kapyla.name, 0, 0)).toBeNull()
    expect(parkkisVenueUrl(Kapyla.name, Number.NaN, Kapyla.lon)).toBeNull()
    expect(parkkisVenueUrl(Kapyla.name, Kapyla.lat, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('uses / when the venue name is blank but the pin is real', () => {
    expect(parkkisVenueUrl('  ', Kapyla.lat, Kapyla.lon)).toBe(
      `${PARKKIS_BASE_URL}/?lat=${Kapyla.lat}&lon=${Kapyla.lon}`,
    )
  })
})

describe('venueFromMatch', () => {
  it('reads name, city and coordinates from getMatch 816603', () => {
    const venue = venueFromMatch(match816603 as Record<string, unknown>)
    expect(venue).toEqual({
      name: Kapyla.name,
      city: 'Helsinki',
      lat: Kapyla.lat,
      lon: Kapyla.lon,
    })
  })

  it('parses string coordinates the same as numbers', () => {
    expect(parseVenueCoords('60.21869755', '24.94855855131742')).toEqual({
      lat: Kapyla.lat,
      lon: Kapyla.lon,
    })
  })

  it('returns null when there is no name and no pin', () => {
    expect(venueFromMatch({})).toBeNull()
    expect(venueFromMatch({ venue_name: '  ', venue_lat: 0, venue_lon: 0 })).toBeNull()
  })

  it('keeps the name and drops the pin when coordinates are missing', () => {
    expect(venueFromMatch({ venue_name: 'Karkkilan liikuntahalli', venue_city_name: 'Karkkila' })).toEqual({
      name: 'Karkkilan liikuntahalli',
      city: 'Karkkila',
    })
  })
})

describe('OpenStreetMap urls', () => {
  it('builds an embed with bbox and marker', () => {
    const url = openStreetMapEmbedUrl(Kapyla.lat, Kapyla.lon)
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe('https://www.openstreetmap.org/export/embed.html')
    expect(parsed.searchParams.get('layer')).toBe('mapnik')
    expect(parsed.searchParams.get('marker')).toBe(`${Kapyla.lat},${Kapyla.lon}`)
    const bbox = parsed.searchParams.get('bbox')?.split(',').map(Number) ?? []
    expect(bbox).toHaveLength(4)
    expect(bbox[0]).toBeCloseTo(Kapyla.lon - 0.006)
    expect(bbox[1]).toBeCloseTo(Kapyla.lat - 0.006)
    expect(bbox[2]).toBeCloseTo(Kapyla.lon + 0.006)
    expect(bbox[3]).toBeCloseTo(Kapyla.lat + 0.006)
  })

  it('builds an open-on-map link to the same pin', () => {
    expect(openStreetMapViewUrl(Kapyla.lat, Kapyla.lon)).toBe(
      `https://www.openstreetmap.org/?mlat=${Kapyla.lat}&mlon=${Kapyla.lon}#map=16/${Kapyla.lat}/${Kapyla.lon}`,
    )
  })
})
