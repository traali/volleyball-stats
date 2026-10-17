import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FavButton } from '../components/FavButton'
import type { ClubInfo, PlayerEntry, TeamEntry } from '../domain/search'
import { useFavorites } from '../hooks/useFavorites'
import { parseVolleyQuery, searchDiscovery, searchPlayers, searchTeams, type Hit, type TeamSearchProgress } from '../services/discovery'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const initial = params.get('q') || ''
  const [attempt, setAttempt] = useState(0)
  return (
    <SearchBody
      key={`${initial}#${attempt}`}
      initial={initial}
      onSearch={(v) => { if (v === initial) setAttempt((n) => n + 1); else setParams({ q: v }) }}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  )
}

type Part<T> = { state: 'idle' | 'loading' } | { state: 'ok'; data: T } | { state: 'failed' }

function SearchBody({ initial, onSearch, onRetry }: { initial: string; onSearch: (q: string) => void; onRetry: () => void }) {
  const [q, setQ] = useState(initial)
  const parsed = parseVolleyQuery(initial)
  const text = Boolean(initial) && parsed.kind === 'text'
  const [other, setOther] = useState<Part<Hit[]>>({ state: initial ? 'loading' : 'idle' })
  const [teams, setTeams] = useState<TeamSearchProgress | null>(null)
  const [teamsFailed, setTeamsFailed] = useState(false)
  const [players, setPlayers] = useState<Part<{ players: PlayerEntry[]; clubs: Map<string, ClubInfo> }>>({ state: text ? 'loading' : 'idle' })
  const [clubs, setClubs] = useState<Map<string, ClubInfo>>(new Map())
  const { has, toggle } = useFavorites()

  useEffect(() => {
    if (!initial) return
    const signal = { cancelled: false }
    searchDiscovery(initial).then(
      (rows) => { if (!signal.cancelled) setOther({ state: 'ok', data: rows }) },
      () => { if (!signal.cancelled) setOther({ state: 'failed' }) },
    )
    if (parseVolleyQuery(initial).kind === 'text') {
      searchTeams(initial, (p) => { if (!signal.cancelled) setTeams(p) }, signal).catch(() => { if (!signal.cancelled) setTeamsFailed(true) })
      searchPlayers(initial).then(
        (r) => { if (!signal.cancelled) { setPlayers({ state: 'ok', data: r }); setClubs(r.clubs) } },
        () => { if (!signal.cancelled) setPlayers({ state: 'failed' }) },
      )
    }
    return () => { signal.cancelled = true }
  }, [initial])

  const teamHits: TeamEntry[] = teams?.teams || []
  const teamsDone = teamsFailed || Boolean(teams?.done)
  const teamsPartial = teamsFailed || (teams?.failed || 0) > 0
  const playerHits = players.state === 'ok' ? players.data.players : []
  const otherHits = other.state === 'ok' ? other.data : []
  const allDone = other.state !== 'loading' && (!text || (teamsDone && players.state !== 'loading'))
  const anyFailed = other.state === 'failed' || (text && (teamsPartial || players.state === 'failed'))
  const nothing = teamHits.length === 0 && playerHits.length === 0 && otherHits.length === 0

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <h1 className="text-2xl font-black">Haku</h1>
      <form onSubmit={(e) => { e.preventDefault(); const v = q.trim(); if (v) onSearch(v) }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Joukkue, pelaaja, seura tai linkki" aria-label="Hakusana" className="flex-1 min-h-12 rounded-2xl bg-zinc-900 border border-zinc-800 px-4 text-sm" />
        <button className="min-h-12 px-4 rounded-2xl bg-amber-500 text-zinc-950 font-bold text-sm" type="submit">Hae</button>
      </form>
      {!initial && <p className="text-sm text-zinc-500">Hae joukkueen nimellä (esim. PuMa U13), pelaajan nimellä tai liitä tulospalvelu-linkki.</p>}

      {text && (
        <Section title="Joukkueet" testId="search-teams" count={teamHits.length}
          status={teamsDone ? '' : teams ? `Haetaan… ${teams.loaded + teams.failed}/${teams.total} kilpailua` : 'Haetaan joukkueita…'}>
          {teamsPartial && (
            <p className="text-xs text-rose-200">
              {teamsFailed ? 'Joukkuehaku ei onnistunut.' : `${teams?.failed} kilpailun joukkueita ei saatu ladattua.`} Kaikkia joukkueita ei ehkä näy – yritä uudelleen.
            </p>
          )}
          {teamsDone && !teamsPartial && teamHits.length === 0 && <p className="text-sm text-zinc-500">Ei joukkueita tällä nimellä tämän kauden sarjoissa.</p>}
          <ul className="space-y-2">
            {teamHits.map((t) => (
              <Row key={t.id} href={`/team/${t.id}`} title={t.name}
                subtitle={[clubs.get(t.clubId)?.name, t.categories.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}
                fav={<FavButton compact item={{ kind: 'team', id: t.id, name: t.name }} on={has('team', t.id)} onToggle={toggle} />} />
            ))}
          </ul>
        </Section>
      )}

      {text && (
        <Section title="Pelaajat" testId="search-players" count={playerHits.length}
          status={players.state === 'loading' ? 'Haetaan pelaajarekisteristä… (ensimmäinen haku kestää hetken)' : ''}>
          {players.state === 'failed' && <p className="text-xs text-rose-200">Pelaajarekisteriä ei saatu ladattua. Tämä ei tarkoita, ettei pelaajaa ole – yritä uudelleen.</p>}
          {players.state === 'ok' && playerHits.length === 0 && (
            <p className="text-sm text-zinc-500">{initial.replace(/\s+/g, '').length < 3 ? 'Kirjoita pelaajan nimestä vähintään 3 kirjainta.' : 'Ei pelaajia tällä nimellä.'}</p>
          )}
          <ul className="space-y-2">
            {playerHits.map((p) => {
              const name = `${p.first} ${p.last}`.trim()
              const club = clubs.get(p.clubId)
              return (
                <Row key={p.id} href={`/player/${p.id}`} title={name} subtitle={club?.name || club?.abbr || ''}
                  fav={<FavButton compact item={{ kind: 'player', id: p.id, name }} on={has('player', p.id)} onToggle={toggle} />} />
              )
            })}
          </ul>
        </Section>
      )}

      {initial && (
        <Section title={text ? 'Seurat ja sarjat' : 'Avaa'} testId="search-other" count={otherHits.length} status={other.state === 'loading' ? 'Haetaan…' : ''}>
          {other.state === 'failed' && <p className="text-xs text-rose-200">Seuroja ja sarjoja ei saatu ladattua – yritä uudelleen.</p>}
          <ul className="space-y-2">
            {otherHits.map((h) => <Row key={`${h.kind}-${h.id}`} href={h.href} title={h.title} subtitle={h.subtitle} />)}
          </ul>
        </Section>
      )}

      {allDone && anyFailed && (
        <button type="button" onClick={onRetry} className="min-h-11 px-4 rounded-xl bg-zinc-800 text-xs font-bold">Yritä uudelleen</button>
      )}
      {allDone && !anyFailed && nothing && <p className="text-sm text-zinc-500">Ei osumia. Kokeile joukkueen, pelaajan tai seuran nimeä.</p>}
    </main>
  )
}

function Section({ title, count, status, testId, children }: { title: string; count: number; status: string; testId: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2" data-testid={testId}>
      <h2 className="text-sm font-bold">{title}{count > 0 ? ` (${count})` : ''}</h2>
      {status && <p className="text-xs text-zinc-500" role="status">{status}</p>}
      {children}
    </section>
  )
}

function Row({ href, title, subtitle, fav }: { href: string; title: string; subtitle: string; fav?: React.ReactNode }) {
  return (
    <li className="flex items-stretch gap-2">
      <Link to={href} className="block flex-1 min-w-0 rounded-2xl border border-zinc-800 px-4 py-3 min-h-14">
        <p className="font-semibold truncate">{title}</p>
        {subtitle && <p className="text-xs text-zinc-500 truncate">{subtitle}</p>}
      </Link>
      {fav && <div className="flex items-center">{fav}</div>}
    </li>
  )
}
