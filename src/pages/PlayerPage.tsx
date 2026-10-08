import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { federationUrl, fetchPlayer } from '../services/discovery'
import { useFavorites } from '../hooks/useFavorites'

function s(v: unknown) { return v == null ? '' : String(v).trim() }

export function PlayerPage() {
  const { playerId = '' } = useParams()
  const [player, setPlayer] = useState<Record<string, unknown> | null>(null)
  const [missing, setMissing] = useState(false)
  const { items, toggle } = useFavorites()
  useEffect(() => {
    fetchPlayer(playerId).then((p) => { setPlayer(p); setMissing(!p) })
  }, [playerId])
  if (missing) return <main className="max-w-3xl mx-auto px-4 py-10 text-sm text-zinc-400">Pelaajaa ei löytynyt.</main>
  if (!player) return <main className="max-w-3xl mx-auto px-4 py-10 text-sm text-zinc-500">Haetaan…</main>
  const name = `${s(player.first_name)} ${s(player.last_name)}`.trim() || s(player.player_name) || playerId
  const teams = Array.isArray(player.teams) ? player.teams as Record<string, unknown>[] : []
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-black">{name}</h1>
        <button type="button" onClick={() => toggle({ kind: 'player', id: playerId, name })} className="min-h-11 px-3 rounded-xl border border-zinc-700 text-xs font-bold">
          {items.some((i) => i.kind === 'player' && i.id === playerId) ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
        </button>
      </div>
      <a href={federationUrl.player(playerId)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-xs text-zinc-400 underline">Tulospalvelu ↗</a>
      <p className="text-sm text-zinc-400">{s(player.club_name)}</p>
      <ul className="space-y-2">
        {teams.map((t) => (
          <li key={s(t.team_id)}><Link to={`/team/${s(t.team_id)}`} className="text-amber-300 text-sm">{s(t.team_name)}</Link></li>
        ))}
      </ul>
    </main>
  )
}
