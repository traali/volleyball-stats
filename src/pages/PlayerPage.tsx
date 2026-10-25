import { Link, useParams } from 'react-router-dom'
import { FavButton } from '../components/FavButton'
import { LoadFailed, Loading } from '../components/LoadState'
import { useFavorites } from '../hooks/useFavorites'
import { useLiberos } from '../hooks/useLiberos'
import { LIBERO_NOTE, type LiberoCheck } from '../domain/libero'
import { useTaso } from '../hooks/useTaso'
import { currentSeasonId, federationUrl, fetchMatchRaw, fetchPlayer } from '../services/discovery'
import { setParticipation, type PlayerSets } from '../domain/setParticipation'

function s(v: unknown) { return v == null ? '' : String(v).trim() }

export function PlayerPage() {
  const { playerId = '' } = useParams()
  const load = useTaso(() => fetchPlayer(playerId), [playerId])
  const { has, toggle } = useFavorites()
  const lib = useLiberos()
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
      <SeasonSets playerId={playerId} player={player} isLibero={lib.isLibero} />
      {teams.length > 0 && <h2 className="text-sm font-bold">Joukkueet</h2>}
      <ul className="space-y-2">
        {teams.filter((t) => s(t.team_id)).map((t) => (
          <li key={s(t.team_id)} className="flex items-stretch gap-2">
            <Link to={`/team/${s(t.team_id)}`} className="flex min-h-[44px] flex-1 items-center justify-between rounded-xl border border-zinc-800 px-3 text-sm">
              <span className="text-amber-300">{s(t.team_name)}</span>
              {s(t.shirt_number) && <span className="font-mono text-xs text-zinc-500">#{s(t.shirt_number)}</span>}
            </Link>
            <button type="button" role="switch" aria-checked={lib.isLibero(s(t.team_id), playerId)} data-testid="libero-toggle" onClick={() => lib.toggle(s(t.team_id), playerId)}
              title="Merkitse liberoksi tässä joukkueessa (tallentuu tähän puhelimeen)"
              className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold ${lib.isLibero(s(t.team_id), playerId) ? 'border-amber-400 bg-amber-400/15 text-amber-300' : 'border-zinc-800 text-zinc-500'}`}>
              Libero{lib.isLibero(s(t.team_id), playerId) ? ' ✓' : ''}
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}

type SeasonLine = { id: string; date: string; label: string; sets: PlayerSets | null }

/** Sets on court vs. on the bench this season, from each played match's own position data and substitutions. */
async function seasonSets(playerId: string, player: Record<string, unknown>): Promise<{ season: string; lines: SeasonLine[] }> {
  const season = await currentSeasonId()
  const rows = (Array.isArray(player.matches) ? player.matches as Record<string, unknown>[] : [])
    .filter((m) => s(m.season_id) === season && s(m.status) === 'Played')
  const lines = await Promise.all(rows.map(async (m) => {
    const raw = await fetchMatchRaw(s(m.match_id))
    const sets = raw ? setParticipation(raw).find((p) => p.playerId === playerId) || null : null
    const home = s(m.team_A_id) === s(m.team_id)
    return { id: s(m.match_id), date: s(m.date).slice(0, 10), label: `${home ? s(m.team_A_name) : s(m.team_B_name)} – ${home ? s(m.team_B_name) : s(m.team_A_name)}`, sets }
  }))
  return { season, lines: lines.sort((a, b) => b.date.localeCompare(a.date)) }
}

function SeasonSets({ playerId, player, isLibero }: { playerId: string; player: Record<string, unknown>; isLibero: LiberoCheck }) {
  const load = useTaso(() => seasonSets(playerId, player), [playerId])
  if (load.state === 'loading') return <p className="text-xs text-zinc-500">Haetaan kauden eriä…</p>
  if (load.state !== 'ok') return <p className="text-xs text-zinc-500">Kauden eriä ei saatu TASOsta.</p>
  const { season, lines } = load.data
  if (!lines.length) return <p className="text-xs text-zinc-500" data-testid="player-sets">Kausi {season}: ei pelattuja otteluita.</p>
  const libLines = lines.filter((l) => l.sets && isLibero(l.sets.teamId, playerId))
  const known = lines.filter((l) => l.sets && !isLibero(l.sets.teamId, playerId))
  const on = known.reduce((n, l) => n + l.sets!.onCourt.length, 0)
  const bench = known.reduce((n, l) => n + l.sets!.bench.length, 0)
  const unknown = known.reduce((n, l) => n + l.sets!.unknown.length, 0)
  return (
    <section className="space-y-2" data-testid="player-sets">
      <h2 className="text-sm font-bold">Kausi {season}: erät</h2>
      {libLines.length > 0 && <p className="text-sm" data-testid="player-sets-libero"><span className="font-bold text-amber-300">Libero</span> <span className="text-zinc-400">({libLines.length} ott.) · {LIBERO_NOTE}.</span></p>}
      {known.length > 0 && <p className="text-sm"><span className="text-zinc-400">Erät kentällä</span> <span className="font-mono font-bold text-amber-300" data-testid="player-sets-on">{on}{unknown ? '+?' : ''}</span> · <span className="text-zinc-400">Vaihdossa</span> <span className="font-mono font-bold" data-testid="player-sets-bench">{bench}</span></p>}
      <p className="text-[11px] text-zinc-500">Kentällä = aloituskokoonpanossa tai vaihdettu sisään erässä. Vaihdossa = ottelun kokoonpanossa, mutta ei kentällä erässä. Lasketaan TASOn eräkokoonpanoista ja vaihdoista; libero näkyy kentällä vain, jos TASO on kirjannut sen.{unknown ? ' +? = eriä otteluista, joista TASOssa ei ole eräkokoonpanoja.' : ''}{known.length + libLines.length < lines.length ? ` ${lines.length - known.length - libLines.length} ottelua ilman kokoonpanotietoa pelaajalle.` : ''}</p>
      <ul className="space-y-1 text-xs">
        {lines.map((l) => (
          <li key={l.id}>
            <Link to={`/match/${l.id}`} className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-zinc-800 px-3">
              <span className="truncate"><span className="text-zinc-500">{l.date}</span> {l.label}</span>
              <span className="shrink-0 font-mono text-zinc-400">{l.sets && isLibero(l.sets.teamId, playerId) ? 'Libero' : l.sets ? `kentällä ${l.sets.onCourt.length ? l.sets.onCourt.map((n) => `${n}.`).join(' ') : '–'}${l.sets.bench.length ? ` · vaihdossa ${l.sets.bench.map((n) => `${n}.`).join(' ')}` : ''}${l.sets.unknown.length ? ` · ? ${l.sets.unknown.length}` : ''}` : 'ei tietoa'}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
