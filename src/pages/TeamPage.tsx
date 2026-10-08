import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites'
import { resultIsTrusted, resultText } from '../domain/rally'
import { federationUrl, fetchMatches, fetchTeam } from '../services/discovery'

function s(v: unknown) { return v == null ? '' : String(v).trim() }

export function TeamPage() {
  const { teamId = '' } = useParams()
  const [team, setTeam] = useState<Record<string, unknown> | null>(null)
  const [matches, setMatches] = useState<Record<string, unknown>[]>([])
  const { items, toggle } = useFavorites()
  useEffect(() => {
    fetchTeam(teamId).then(setTeam)
    fetchMatches(teamId).then(setMatches)
  }, [teamId])
  const name = s(team?.team_name) || s(team?.name) || `Joukkue ${teamId}`
  const fav = items.some((i) => i.kind === 'team' && i.id === teamId)
  const roster = (Array.isArray(team?.players) ? (team?.players as Record<string, unknown>[]) : [])
    .filter((p) => s(p.player_id) && s(p.inactive) !== '1' && (!s(p.removed) || s(p.removed).startsWith('0000')))
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{name}</h1>
          <p className="text-xs text-zinc-500">{s(team?.club_name)} {s(team?.primary_category)}</p>
          <a href={federationUrl.team(teamId)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs text-zinc-400 underline">Tulospalvelu ↗</a>
        </div>
        <button type="button" onClick={() => toggle({ kind: 'team', id: teamId, name })} className="min-h-11 px-3 rounded-xl border border-zinc-700 text-xs font-bold">
          {fav ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
        </button>
      </div>
      {roster.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold">Pelaajat ({roster.length})</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {roster.map((p) => (
              <li key={s(p.player_id)}>
                <Link to={`/player/${s(p.player_id)}`} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-800 px-3 text-sm">
                  {s(p.shirt_number) && <span className="font-mono text-amber-300 w-7">#{s(p.shirt_number)}</span>}
                  <span className="truncate">{`${s(p.first_name)} ${s(p.last_name)}`.trim()}</span>
                  {s(p.position_fi) && <span className="ml-auto text-[11px] text-zinc-500">{s(p.position_fi)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <h2 className="text-sm font-bold">Ottelut ({matches.length})</h2>
      {matches.length === 0 && <p className="text-sm text-zinc-500">Ei otteluita tälle joukkueelle.</p>}
      <ul className="space-y-2">
        {matches.map((m) => {
          const trusted = resultIsTrusted(m)
          return (
            <li key={s(m.match_id)}>
              <Link to={`/match/${s(m.match_id)}`} className="block rounded-xl border border-zinc-800 px-3 py-2 text-sm">
                <span className="text-zinc-500">{s(m.date).slice(0, 10)} {s(m.time).slice(0, 5)} </span>
                {s(m.team_A_name)} – {s(m.team_B_name)}
                {trusted && <span className="font-mono"> {resultText(m)}</span>}
                {s(m.venue_name) && <span className="block text-xs text-zinc-500">{s(m.venue_name)}{s(m.venue_location_name) ? ` · ${s(m.venue_location_name)}` : ''}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
