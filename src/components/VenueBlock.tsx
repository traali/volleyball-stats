import {
  openStreetMapEmbedUrl,
  openStreetMapViewUrl,
  parkkisVenueUrl,
  type VenuePin,
} from '../lib/parking/parkkisLink'

const linkClass =
  'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-bold text-zinc-200 hover:border-amber-500/40'

export function VenueBlock({ venue }: { venue: VenuePin | null }) {
  if (!venue) return null
  const hasPin = venue.lat !== undefined && venue.lon !== undefined
  const parkkis = hasPin ? parkkisVenueUrl(venue.name, venue.lat, venue.lon) : null
  const place = [venue.name, venue.city].filter(Boolean).join(' · ')

  return (
    <section data-testid="venue-block" className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <h2 className="text-sm font-bold text-white">Pelipaikka</h2>
      {place ? <p className="text-sm text-zinc-300">{place}</p> : null}
      {hasPin && venue.lat !== undefined && venue.lon !== undefined && (
        <>
          <iframe
            title={`Kartta: ${place || 'pelipaikka'}`}
            src={openStreetMapEmbedUrl(venue.lat, venue.lon)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[180px] w-full rounded-xl border border-zinc-800 bg-zinc-950"
          />
          <div className="flex flex-wrap gap-2">
            <a
              href={openStreetMapViewUrl(venue.lat, venue.lon)}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="venue-map-link"
              className={linkClass}
            >
              Avaa kartalla
            </a>
            {parkkis && (
              <a
                href={parkkis}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="parkkis-link"
                aria-label={`Pysäköinti: avaa Parkkis kohteessa ${venue.name || 'pelipaikka'}`}
                className={linkClass}
              >
                <span aria-hidden="true">🅿️</span>
                <span className="ml-1.5">Pysäköinti</span>
                <span className="ml-1.5 text-[10px] font-semibold text-zinc-400">Parkkis</span>
              </a>
            )}
          </div>
        </>
      )}
    </section>
  )
}
