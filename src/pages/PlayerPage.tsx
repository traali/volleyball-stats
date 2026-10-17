import { Link, useParams } from 'react-router-dom'
import { FavButton } from '../components/FavButton'
import { LoadFailed, Loading } from '../components/LoadState'
import { useFavorites } from '../hooks/useFavorites'
import { useTaso } from '../hooks/useTaso'
import { federationUrl, fetchPlayer } from '../services/discovery'

function s(v: unknown) { return v == null ? '' : String(v).trim() }

export function PlayerPage() {
  const { playerId = '' } = useParams()
  const load = useTaso(() => fetchPlayer(playerId), [playerId])
  const { has, toggle } = useFavorites()
  if (load.state === 'loading') return <main className="max-w-3xl mx-auto px-4 py-10"><Loading /></main>
  if (load.state === 'failed') return <main className="max-w-3xl mx-auto px-4 py-10"><LoadFailed what="Pelaajaa" onRetry={load.retry} /></main>
  if (load.state === 'notfound') return <main className="max-w-3xl mx-auto px-4 py-10 text-sm text-zinc-400">TASO sanoo, ettei pelaajaa {playerId} ole.</main>
  const player = load.data
  const name = `${s(player.first_name)} ${s(player.last_name)}`.trim() || s(player.player_name)
  const teams = Array.isArray(player.teams) ? player.teams as Record<string, unknown>[] : []
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-black">{name || `Pelaaja ${playerId}`}</h1>
        {name && <FavButton item={{ kind: 'player', id: playerId, name }} on={has('player', playerId)} onToggle={toggle} />}
      </div>
      <a href={federationUrl.player(playerId)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs text-zinc-400 underline">Tulospalvelu ↗</a>
      {s(player.club_name) && <p className="text-sm text-zinc-400">{s(player.club_name)}</p>}
      {teams.length > 0 && <h2 className="text-sm font-bold">Joukkueet</h2>}
      <ul className="space-y-2">
        {teams.filter((t) => s(t.team_id)).map((t) => (
          <li key={s(t.team_id)}>
            <Link to={`/team/${s(t.team_id)}`} className="flex min-h-[44px] items-center justify-between rounded-xl border border-zinc-800 px-3 text-sm">
              <span className="text-amber-300">{s(t.team_name)}</span>
              {s(t.shirt_number) && <span className="font-mono text-xs text-zinc-500">#{s(t.shirt_number)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
